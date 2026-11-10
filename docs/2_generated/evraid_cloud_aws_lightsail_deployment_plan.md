# EVRaid Cloud — AWS Lightsail Production Deployment Plan & Runbook

**Document ID:** `EVRAID-OPS-LIGHTSAIL-01`  
**Target Environment:** AWS Lightsail (Virtual Private Server)  
**System Architecture:** Docker Compose (TimescaleDB + Redis + FastAPI Backend + Next.js 14 Frontend + Nginx Reverse Proxy & Certbot SSL)  
**Author:** EVRaid Engineering Team  
**Status:** Approved for Implementation  

---

## 1. Architecture Overview & Lightsail Sizing

### 1.1 Service Topology on the Server

```mermaid
flowchart TD
    subgraph PublicInternet["Public Internet (Clients)"]
        MobileApp["EVRaid Mobile App / IoT Module"]
        Browser["Fleet Web Dashboard (User Browser)"]
    end

    subgraph AWS_Lightsail["AWS Lightsail Instance (Static IPv4 / Domain)"]
        subgraph Ports["Host Ports Exposing Traffic"]
            Port80["Port 80 (HTTP -> 301 Redirect to HTTPS)"]
            Port443["Port 443 (HTTPS / TLS via Certbot)"]
            Port22["Port 22 (SSH - Key Auth Only)"]
        end

        subgraph ReverseProxy["Nginx Reverse Proxy Container"]
            NginxRouter["Nginx Engine"]
        end

        subgraph DockerNetwork["Internal Docker Bridge Network (evraid_net)"]
            Frontend["evraid_frontend\nNext.js 14 (Node 20)\nPort: 3000"]
            Backend["evraid_backend\nFastAPI Ingestion & API (Python 3.12)\nPort: 8000"]
            Redis["evraid_redis\nRedis 7 (Hot State Cache)\nPort: 6379 (Internal)"]
            Timescale["evraid_timescaledb\nPostgreSQL 16 + TimescaleDB\nPort: 5432 (Internal)"]
        end

        subgraph PersistentStorage["Lightsail Block Storage / Volumes"]
            VolPG["timescaledb_data (/var/lib/postgresql/data)"]
            VolRedis["redis_data (/data)"]
            VolSSL["certbot_conf (/etc/letsencrypt)"]
        end
    end

    Browser -->|HTTPS :443| Port443
    MobileApp -->|HTTPS :443 /v1/...| Port443
    Port443 --> NginxRouter
    Port80 --> NginxRouter

    NginxRouter -->|/v1/*, /docs, /openapi.json| Backend
    NginxRouter -->|/* (All web pages & static assets)| Frontend

    Backend -->|Async SQLAlchemy (asyncpg)| Timescale
    Backend -->|Live State & PubSub (redis-py)| Redis
    Frontend -.->|Client Browser fetches /v1/* via Nginx| NginxRouter

    Timescale --- VolPG
    Redis --- VolRedis
```

### 1.2 Lightsail Instance Specification Matrix

| Component | Minimum Budget Tier | **Recommended Production Tier (Target)** | High Traffic Scale Tier |
| :--- | :--- | :--- | :--- |
| **Lightsail Plan** | **$10 - $12 / month** | **$20 - $24 / month** | **$40 / month** |
| **RAM** | 2 GB (+ 2 GB Linux Swap) | **4 GB** (Smooth Next.js builds & TimescaleDB buffers) | 8 GB |
| **vCPU** | 1 Core | **2 Cores** | 2 Cores |
| **SSD Storage** | 60 GB NVMe | **80 GB NVMe** | 160 GB NVMe |
| **Data Transfer** | 3 TB / month | **4 TB / month** | 5 TB / month |
| **Operating System** | **Ubuntu 22.04 LTS** or **24.04 LTS** (64-bit x86) | **Ubuntu 22.04 LTS** (Longest stability record with Docker) | Ubuntu 22.04 LTS |

> [!IMPORTANT]
> Next.js production builds (`npm run build`) and TimescaleDB buffer memory require at least 1.8 GB RAM during initial container builds. If you choose the 2 GB tier, **creating a 2 GB to 4 GB Linux Swap file is mandatory** to prevent the Linux OOM (Out Of Memory) killer from terminating processes.

---

## 2. Step-by-Step Deployment Runbook

### Phase 1: AWS Lightsail Instance Provisioning

1. **Log in to AWS Console** and navigate to [AWS Lightsail](https://lightsail.aws.amazon.com/).
2. Click **Create instance**:
   - **Location**: Select the region closest to your primary operations (e.g., `eu-central-1` Frankfurt or `me-central-1` UAE).
   - **Platform**: `Linux/Unix`.
   - **Blueprint**: Choose **OS Only** -> **Ubuntu 22.04 LTS** (Do *not* choose Bitnami or pre-installed lamp stacks).
   - **Instance Plan**: Select **4 GB RAM / 2 vCPUs ($20 or $24/mo)** (or 2 GB with swap).
   - **Instance Name**: e.g. `evraid-cloud-prod-01`.
   - Click **Create instance**.
3. **Attach a Static IP**:
   - Go to the **Networking** tab in Lightsail.
   - Click **Create static IP**.
   - Name it (e.g. `evraid-prod-ip`), select your instance `evraid-cloud-prod-01`, and click **Create and attach**.
   - Note down the **Static Public IPv4** (e.g., `3.120.x.x`).
4. **Configure Lightsail Firewall**:
   - Open your instance details -> **IPv4 Firewall**.
   - Ensure the following ports are configured:
     - `SSH` (TCP 22) — Best practice: Restrict to your management IP address, or allow all if using Lightsail Browser SSH.
     - `HTTP` (TCP 80) — Allow from anywhere (`0.0.0.0/0`).
     - `HTTPS` (TCP 443) — Allow from anywhere (`0.0.0.0/0`).
     - *Keep Database (5432) and Redis (6379) closed* from the public internet. They communicate securely over the internal Docker network.

---

### Phase 2: Host Operating System Setup & Hardening

Connect to the instance via SSH (using Lightsail browser terminal or `ssh -i <your-key>.pem ubuntu@<STATIC_IP>`).

#### Step 2.1: Update Packages & Enable Swap Space
```bash
# Update and upgrade system packages
sudo apt update && sudo apt upgrade -y

# Configure 4GB Swap file (critical for memory stability during builds)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Persist swap across server reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### Step 2.2: Install Docker Engine & Docker Compose Plugin
```bash
# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release ufw git

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow 'ubuntu' user to run docker commands without sudo
sudo usermod -aG docker ubuntu

# Enable Docker daemon on boot
sudo systemctl enable docker
sudo systemctl start docker

# Log out and back in, or run:
newgrp docker
```

#### Step 2.3: Configure Host Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

---

### Phase 3: Project Repository & Production Configuration

#### Step 3.1: Clone the Codebase
```bash
cd /home/ubuntu
git clone https://github.com/<your-org-or-user>/evraid_cloud.git
cd evraid_cloud
```

#### Step 3.2: Production Environment File (`.env`)
Create a secure `.env` file in the project root:
```bash
nano .env
```
Populate with strong production secrets:
```ini
# --- EVRaid Cloud Production Environment ---

# Application
ENVIRONMENT=production
PROJECT_NAME=EVRaid Cloud Fleet Platform
API_V1_STR=/v1

# TimescaleDB / PostgreSQL Credentials (Generate strong random passwords)
POSTGRES_USER=evraid_admin
POSTGRES_PASSWORD=ReplaceWithStrongPassword_982!ev
POSTGRES_DB=evraid_cloud
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# Internal Webhook Security Token (For sync between services)
INTERNAL_SYNC_TOKEN=GenerateStrongRandomToken_abc123xyz789!

# Public Domain / API Base (Use relative path '/v1' so client browsers automatically talk to Nginx reverse proxy)
NEXT_PUBLIC_API_URL=/v1
```

---

### Phase 4: Production Nginx Reverse Proxy Configuration

To allow both the Next.js Web Dashboard and the FastAPI backend to run on standard port 80/443 without CORS problems, we route traffic through Nginx:
- `/v1/*` -> Forwarded to `http://backend:8000/v1/*`
- `/docs`, `/openapi.json` -> Forwarded to `http://backend:8000`
- `/*` -> Forwarded to `http://frontend:3000/*`

#### Step 4.1: Create Nginx Configuration Directory
```bash
mkdir -p docker/nginx
```

Create `docker/nginx/default.conf`:
```nginx
# Upstream definitions
upstream backend_upstream {
    server backend:8000;
}

upstream frontend_upstream {
    server frontend:3000;
}

server {
    listen 80;
    server_name _; # Or replace with your domain (e.g., fleet.evraid.com)

    # Let's Encrypt ACME challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Max body size for firmware binaries and raw log uploads
    client_max_body_size 50M;

    # 1. API Route: Backend FastAPI
    location /v1/ {
        proxy_pass http://backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Documentation routes
    location /docs {
        proxy_pass http://backend_upstream/docs;
        proxy_set_header Host $host;
    }
    location /openapi.json {
        proxy_pass http://backend_upstream/openapi.json;
        proxy_set_header Host $host;
    }

    # 2. Frontend Route: Next.js Dashboard
    location / {
        proxy_pass http://frontend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Step 4.2: Production Docker Compose (`docker-compose.prod.yml`)
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  # 1. TimescaleDB
  timescaledb:
    image: timescale/timescaledb:latest-pg16
    container_name: evraid_timescaledb
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - timescaledb_data:/var/lib/postgresql/data
      - ./docker/postgres-init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - evraid_net

  # 2. Redis
  redis:
    image: redis:7-alpine
    container_name: evraid_redis
    restart: always
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - evraid_net

  # 3. FastAPI Ingestion API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: evraid_backend
    restart: always
    depends_on:
      timescaledb:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - PROJECT_NAME=${PROJECT_NAME}
      - ENVIRONMENT=production
      - API_V1_STR=/v1
      - DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@timescaledb:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379/0
      - INTERNAL_SYNC_TOKEN=${INTERNAL_SYNC_TOKEN}
    networks:
      - evraid_net

  # 4. Next.js Web Dashboard
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: evraid_frontend
    restart: always
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=/v1
      - NODE_ENV=production
    networks:
      - evraid_net

  # 5. Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: evraid_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - certbot_conf:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    depends_on:
      - backend
      - frontend
    networks:
      - evraid_net

networks:
  evraid_net:
    driver: bridge

volumes:
  timescaledb_data:
  redis_data:
  certbot_conf:
  certbot_www:
```

---

### Phase 5: Domain & SSL Setup (HTTPS)

#### Step 5.1: Point Your Domain DNS
In your DNS registrar (GoDaddy, Namecheap, Route53, or Cloudflare):
- Create an **A Record**:
  - Name: `fleet` (or `@` for root domain)
  - Value: `<YOUR_LIGHTSAIL_STATIC_IP>`
  - TTL: 300 seconds

#### Step 5.2: Issue SSL Certificate via Certbot
Once your DNS has propagated (verify via `ping fleet.evraid.com`):
```bash
# Start containers with HTTP first
docker compose -f docker-compose.prod.yml up -d

# Run Certbot to acquire free Let's Encrypt certificate
sudo docker run -it --rm --name certbot \
  -v "$(pwd)/certbot_conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot_www:/var/www/certbot" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d fleet.evraid.com \
  --email admin@evraid.com \
  --agree-tos --no-eff-email
```

#### Step 5.3: Update Nginx for HTTPS
Update `docker/nginx/default.conf` to redirect HTTP to HTTPS and bind the certificate:
```nginx
server {
    listen 80;
    server_name fleet.evraid.com;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name fleet.evraid.com;

    ssl_certificate /etc/letsencrypt/live/fleet.evraid.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fleet.evraid.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    # API Proxy
    location /v1/ {
        proxy_pass http://backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /docs {
        proxy_pass http://backend_upstream/docs;
        proxy_set_header Host $host;
    }

    # Frontend Next.js Proxy
    location / {
        proxy_pass http://frontend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```
Reload Nginx:
```bash
docker compose -f docker-compose.prod.yml restart nginx
```

---

### Phase 6: Verification & Sanity Checks

| Step | Action / Command | Expected Output |
| :--- | :--- | :--- |
| **Containers Status** | `docker compose -f docker-compose.prod.yml ps` | All 5 containers in `Up (healthy)` state |
| **Backend Health** | `curl -f http://localhost/v1/packs/EVR-B16S-0042/live` | `200 OK` with telemetry JSON |
| **Web Dashboard** | Open `https://fleet.evraid.com` in browser | Overview dashboard with KPI strip & cards |
| **Database Schema** | `docker exec -it evraid_timescaledb psql -U evraid_admin -d evraid_cloud -c "\dt"` | Tables `packs`, `telemetry_records`, `abuse_events`, etc. |
| **Redis Hot State** | `docker exec -it evraid_redis redis-cli ping` | `PONG` |

---

### Phase 7: Automated Updates, Backups & Maintenance

#### 1. Daily Database Backup Cron
Add a daily database dump script:
```bash
sudo mkdir -p /opt/backups
sudo tee /opt/backups/backup_db.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/postgres"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker exec evraid_timescaledb pg_dump -U evraid_admin evraid_cloud | gzip > "$BACKUP_DIR/evraid_db_$TIMESTAMP.sql.gz"
# Keep only last 14 days
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +14 -delete
EOF
sudo chmod +x /opt/backups/backup_db.sh

# Add to crontab (runs at 03:00 AM daily)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backups/backup_db.sh") | crontab -
```

#### 2. Lightsail Automatic Snapshots
In the AWS Lightsail console:
- Navigate to your instance -> **Snapshots**.
- Enable **Automatic snapshots** and pick your off-peak time (e.g. 04:00 UTC). AWS will retain 7 days of full VPS images automatically.

#### 3. Continuous Deployment (Pull & Restart One-Liner)
Whenever you push updates to Git:
```bash
cd /home/ubuntu/evraid_cloud
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

---

## 3. Checklist for Go-Live

- [ ] Lightsail Static IP provisioned and bound.
- [ ] Firewall allows only Ports 22, 80, 443 (DB and Redis internal only).
- [ ] Linux Swap (4GB) configured and active.
- [ ] Strong database password set in `.env`.
- [ ] Production Nginx configured with reverse proxy routing.
- [ ] Domain DNS mapped and Let's Encrypt SSL active.
- [ ] Seed data populated and initial packs responsive.
- [ ] Automatic daily database backup and Lightsail snapshots enabled.

