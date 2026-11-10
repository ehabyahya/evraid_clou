# EVRaid Cloud — Master Technical Plan
**Architecture, Dynamic Telemetry Ingestion, Hardware Catalog, and Warranty Integration**  
*Document Version: 2.1 | Status: Architecture Baseline (reviewed against PRD) | Platform: evraid_cloud*

> [!NOTE]
> **Source of truth:** *EVRaid Battery Fleet Management Platform — PRD (MVP)*, Oct 26, 2026, the Arabic business requirements doc, and the five dashboard mockups in `docs/1_reference_from_top_management`. If this plan and the PRD disagree, the PRD wins. Requirement IDs (`FR-x.y`) point to the PRD.
>
> The product catalog (§2), serial anatomy and warranty webhook (§4), and BLE field log (§3.1) come from internal engineering sources, **not** from the management reference. Someone in engineering must check them (see the ⚠️ notes).

---

## 1. Executive Summary & Architectural Vision

**EVRaid Cloud (`evraid_cloud`)** is an enterprise battery intelligence and IoT fleet management platform designed specifically for light-mobility operators (e-scooters, e-mopeds, electric motorcycles, and golf carts). The platform enables continuous tracking of State of Charge (SOC), State of Health (SOH), cumulative throughput, physical cell health, real-time geolocation, safety alerts, and warranty compliance across multi-tenant fleets.

### Core Strategic Paradigm: Mobile-First, 4G-Ready
EVRaid currently has more than 700 connected battery packs operating in the field via proprietary Smart BMS units communicating locally over Bluetooth Low Energy (BLE). To capture immediate telemetry without hardware delays while ensuring a seamless path toward direct cellular connectivity, `evraid_cloud` adopts a **Decoupled Unified Ingestion Architecture**:

1. **Stage 1 (Immediate Operational Baseline):** BMS $\rightarrow$ Mobile App (Flutter) $\rightarrow$ HTTPS Ingestion API $\rightarrow$ Unified Ingestion Queue.
2. **Stage 2 (Integrated Cellular Cutover):** BMS $\rightarrow$ 4G/LTE-M + GNSS Module $\rightarrow$ MQTT over TLS $\rightarrow$ Unified Ingestion Queue.

By standardizing on a single **Unified Ingestion Queue** as the architectural point of truth, all downstream processing components—the **Dynamic Ingestion Parser**, **Physics-Based Diagnostics Engine**, **Warranty Evidence Engine**, **Alert Engine**, and **Multi-Tenant Dashboard**—remain strictly agnostic to the edge transmission medium.

```
                    ┌──────────────────────────────┐
                    │   700+ Existing Field Packs  │
                    │   EVRaid Smart BMS (BLE)     │
                    └──────────────┬───────────────┘
                                   │ (Bluetooth Low Energy)
                                   ▼
                    ┌──────────────────────────────┐
                    │  EVRaid Technician App       │
                    │  (Flutter + SQLite Buffer)   │
                    └──────────────┬───────────────┘
                                   │ HTTPS / REST (Batch Upload)
                                   ▼
┌───────────────────────────┐    ┌──────────────────────────┐
│  Next-Gen Production Packs│    │  Cloud API Gateway       │
│  LTE-M / 2G + GNSS Module │    │  (FastAPI / Go / ALB)    │
└─────────────┬─────────────┘    └─────────────┬────────────┘
              │ MQTT over TLS                  │
              ▼                                │
┌───────────────────────────┐                  │
│  MQTT Broker (EMQX / AWS) │                  │
│  Mutual TLS (X.509)       │                  │
└─────────────┬─────────────┘                  │
              │                                │
              └───────────────┬────────────────┘
                              │
                              ▼
        ═════════════════════════════════════════════
          UNIFIED INGESTION QUEUE (Kafka / Kinesis)
        ═════════════════════════════════════════════
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │  Dynamic Ingestion Parser & Normalizer    │
        │  (Config-driven via Admin Schema Engine)  │
        └─────────────────────┬─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Diagnostics  │      │ Alert Engine │      │ Warranty &   │
│ Engine (SOC/ │      │ (Thresholds, │      │ Abuse Engine │
│ SOH/Cycles)  │      │ dT/dt, SMS)  │      │ (Over-Curr)  │
└───────┬──────┘      └───────┬──────┘      └───────┬──────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ Hybrid Telemetry Store: PostgreSQL +      │
        │ TimescaleDB (Hypertables + 24 Mo Raw Data)│
        └─────────────────────┬─────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │  Multi-Tenant Fleet Portal (Next.js/React)│
        │  Bilingual English/Arabic (RTL) Dashboard │
        └───────────────────────────────────────────┘
```

---

## 2. Master Product Catalog & Multi-Chemistry Specifications

The platform natively supports the entire product line of **EVRAID & LADRIX** battery packs, accommodating distinct cell chemistries, series-parallel configurations, and BMS hardware families.

### 2.1 Master Battery Models Specification
All analytical algorithms, voltage cutoff limits, and nominal Ah references are dynamically linked to the registered battery model:

| # | Model Code | Commercial Name | Chemistry | Nominal Voltage | Rated Capacity | Series Count | Cell Format & Model | Max Discharge Power | Designed Cycles | Target Application |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `EVR036007` | LADRIX Kick Scooter 36V 7.5Ah | NMC | 36.0 V | 7.5 Ah | 10S | Cylindrical 18650 | 350 W | 500 cycles | Light Kick Scooter |
| 2 | `EVR036014` | LADRIX Kick Scooter 36V 14Ah | NMC | 36.0 V | 14.0 Ah | 10S | Tenpower INR18650-28HE (3C) | 499 W | 500 cycles | Shared Scooter (Loop) |
| 3 | `EVR036015` | LADRIX Kick Scooter 36V 15Ah | NMC | 36.0 V | 15.0 Ah | 10S | Lishen LR1865SS (2C) | 500 W | 500 cycles | Shared Scooter (Loop) |
| 4 | `EVR0480011` | LADRIX Kick Scooter 48V 11Ah | NMC | 48.0 V | 11.0 Ah | 13S | Cylindrical 18650 | 600 W | 600 cycles | High-Power Scooter |
| 5 | `EVR0480015` | LADRIX E-Mopeds 48V 15Ah | NMC | 48.0 V | 15.0 Ah | 13S | Cylindrical 18650 / 21700 | 800 W | 700 cycles | Light E-Moped |
| 6 | `EVR0600020` | LADRIX E-Mopeds 60V 20Ah | NMC | 60.0 V | 20.0 Ah | 16S | Cylindrical 21700 | 1,500 W | 800 cycles | Commercial Delivery Moped |
| 7 | `EVR0720020` | LADRIX Motorcycle 72V 20Ah | NMC | 72.0 V | 20.0 Ah | 20S / 24S | Cylindrical / Prismatic | 2,500 W | 800 cycles | Urban Motorcycle |
| 8 | `EVRP0720030`| LADRIX Motorcycle 72V 30Ah | NMC | 72.0 V | 30.0 Ah | 20S / 24S | Prismatic / High-rate | 3,500 W | 1,000 cycles | Cargo Motorcycle |
| 9 | `EVR0720040` | LADRIX Motorcycle 72V 40Ah | NMC | 72.0 V | 40.0 Ah | 20S / 24S | Prismatic Cell | 5,000 W | 1,000 cycles | Heavy Cargo E-Moto |
| 10| `EVR0510105` | LADRIX Golf Carts 51.2V 105Ah| LFP | 51.2 V | 105.0 Ah | 16S | Prismatic LiFePO4 | 5,000 W | 3,000 cycles | Commercial Golf Cart |
| 11| `EVR051150`  | LADRIX Golf Carts 51.2V 150Ah| LFP | 51.2 V | 150.0 Ah | 16S | Prismatic LiFePO4 | 7,500 W | 3,000 cycles | Heavy Utility Vehicle |
| 12| `EVR051210`  | LADRIX Golf Carts 51.2V 210Ah| LFP | 51.2 V | 210.0 Ah | 16S | Prismatic LiFePO4 | 10,000 W | 3,500 cycles | Resort / Industrial Shuttle|

> [!WARNING]
> **⚠️ Verify the catalog before seeding the database.**
> * **Model codes don't follow one pattern.** `EVR036014` and `EVR051150` use 3 digits for voltage plus 3 for Ah. `EVR0480011`, `EVR0600020`, `EVR0720020`, `EVR0720040` and `EVR0510105` have 7 digits, and `EVRP0720030` adds a `P`. The warranty system also sends long codes such as `EVR036014-0BU0-A02`. Agree on one canonical `model_code` plus a list of aliases.
> * **72 V NMC "20S / 24S":** 20S × 3.6 V = 72 V fits NMC, but 24S NMC is about 88 V. Each model record needs exactly one `series_count`, because cell-array mapping and voltage limits depend on it.
> * **Parallel count (`P`) and cell capacity are missing.** The platform needs them to turn cell C-ratings into pack current limits (see §4.3).
> * The mockups show a **48 V 105 Ah LFP 16S** pack on a "Smart BMS 48 V 105 A", which isn't in this table (the closest is `EVR0510105`, 51.2 V). Pick one naming convention: 48 V commercial or 51.2 V nominal.

### 2.2 EVRAID BMS Hardware Profiles

The BMS hardware family controls the physical edge interface, balance mechanisms, and channel telemetry:

| # | BMS Model Code | Commercial Description | Configuration | Interface | Maximum Continuous Current |
|---|---|---|---|---|---|
| 1 | `EVRBMS-ST10S015A0C` | EVRAID Standard BMS 10S | 10S Series | Hardware fixed / Analog | 15 A |
| 2 | `EVRBMS-ST13S025A0C` | EVRAID Standard BMS 13S | 13S Series | Hardware fixed / Analog | 25 A |
| 3 | `EVRBMS-SM10S030A0C-BUO` | EVRAID Smart BMS 10S (CAN/UART) | 10S Series | BLE + CAN + UART | 30 A |
| 4 | `EVRBMS-SM10S030A0S-BUO` | EVRAID Smart BMS 10S (Single-wire) | 10S Series | BLE + UART | 30 A |
| 5 | `EVRBMS-SM16S060A0C-BUO` | EVRAID Smart BMS 16S (Heavy Duty) | 16S Series | BLE + Isolated CAN + UART | 60 A |
| 6 | `EVRBMS-SM24S060A0S-BUO` | EVRAID Smart BMS 24S (High-Volt) | 24S Series | BLE + Isolated CAN + UART | 60 A |
| 7 | `EVRBMS-CT16S24S-CONT` | EVRAID Contactor BMS 16S/24S | 16S / 24S Series | Dual CAN + High-side Driver | 200 A+ (External Contactor) |

---

## 3. Dynamic Telemetry Ingestion & Admin Schema Mapping

### 3.1 The Edge Mapping Challenge
Production field logs from the mobile application demonstrate that the BMS pushes native JSON frames with firmware-specific variable names:
```
[BLE-DEBUG] rStackVoltage_V: 39.85, rPackCurrent_A: -0.01, rSOC_pct: 97.2, 
rCellVoltages_V: [3.997, 3.998, 3.993, ..., 0.0, 0.0, 4.005], nr_validConnectedCells: 10,
s_cellUnderVoltErr_b: false, cFirmwareVersion: SWP10_V2.1.0
```

Because future BMS firmware updates (`cFirmwareVersion`) may alter field names, expand arrays, or reformat fault bitmasks, the backend must avoid hardcoded entity bindings.

### 3.2 Dynamic Ingestion Parser Architecture
`evraid_cloud` deploys a dynamic parser driven by database mapping tables editable through the **Admin Portal**:

```
Raw Ingestion Payload (JSON)
           │
           ▼
[Dynamic Ingestion Worker]
           │
           ├─► 1. Identify cFirmwareVersion & Pack Serial
           ├─► 2. Query Cache for Active Mapping Profile
           ├─► 3. Execute Transformation Pipeline:
           │        ├── Apply Key Aliases (e.g., rStackVoltage_V ──► pack_voltage_v)
           │        ├── Execute Math Formulas (e.g., mV ──► V, Scaling Factors)
           │        ├── Map Cell Arrays (Positional lookup via cell_channel_map; flag < 0.5V as SENSE_FAULT)
           │        └── Unpack Fault Booleans / Bitmasks into Normalized Flags
           │
           ├─► 4. Persist raw JSON into `raw_telemetry.raw_payload` (JSONB)
           └─► 5. Emit Normalized Telemetry Object to Internal Stream
```

### 3.3 Dynamic Schema Mapping Configuration (Database Structure)

```sql
CREATE TABLE bms_firmware_profiles (
    id SERIAL PRIMARY KEY,
    firmware_version VARCHAR(50) NOT NULL UNIQUE,
    bms_model_id INT REFERENCES bms_profiles(id),
    cell_channel_map INT[] NOT NULL, -- 1-based raw channel indices for physical cells 1..S, e.g. '{1,2,3,4,5,6,7,8,9,16}'
    current_sign_convention VARCHAR(20) NOT NULL DEFAULT 'NEG_DISCHARGE', -- NEG_DISCHARGE or POS_DISCHARGE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

CREATE TABLE telemetry_field_mappings (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES bms_firmware_profiles(id) ON DELETE CASCADE,
    raw_field_name VARCHAR(100) NOT NULL,
    standard_metric_name VARCHAR(100) NOT NULL,
    data_type VARCHAR(20) NOT NULL, -- FLOAT, INT, BOOLEAN, ARRAY_FLOAT
    scale_expression TEXT DEFAULT '$val', -- Expression, e.g. '$val / 1000.0'
    is_required BOOLEAN DEFAULT FALSE,
    is_fault_indicator BOOLEAN DEFAULT FALSE,
    fault_severity VARCHAR(20) DEFAULT NULL -- CRITICAL, WARNING, ABUSE
);
```

### 3.4 Array Normalization — Positional Channel Mapping (not value filtering)
On multi-tap BMS hardware (e.g., a 16-channel analog front-end configured for a 10S pack), unused channels report `0.0 V`. The field log above has `0.0` values followed by a non-zero last channel (`4.005 V`).

> [!WARNING]
> **⚠️ Correction to v2.0:** v2.0 filtered cells by value (`v > 0.5`, then took the first S entries). Don't do that.
> 1. **It hides real faults.** A broken sense wire or dead cell reading ~0 V would be dropped silently instead of raising a critical alarm (FR-3.2).
> 2. **It shifts cell indices,** so the "weakest cell: 9" shown in the dashboard could point at the wrong cell.
> 3. **The last channel is probably a real cell, not an artifact.** Many AFEs (e.g., TI BQ769x0 family) require the top cell on the highest channel and unused middle inputs shorted. So `4.005 V` on channel 16 is likely physical cell 10. **The BMS firmware team must confirm this.**

**Normalization Logic:**
1. Look up the pack's `series_count` ($S$) and the `cell_channel_map` of its BMS profile / firmware profile. The map is an ordered list of raw channel indices for physical cells 1…S, e.g. 10S on 16-channel = `[1,2,3,4,5,6,7,8,9,16]`.
2. Check `nr_validConnectedCells == S`. If they differ, raise a `CONFIG_MISMATCH` data-quality flag (not a battery alarm).
3. Pick cells by position:
   $$\mathbf{V}_{\text{cells}}[k] = \mathbf{V}_{\text{raw}}[\text{map}[k]], \quad k = 1 \dots S$$
4. Any mapped cell reading below a plausibility floor (e.g., < 0.5 V) raises **`SENSE_FAULT` (Critical)**. The reading is never discarded.
5. Compute cell imbalance from the mapped physical cells only:
   $$\Delta V_{\text{cell}} = (\max(\mathbf{V}_{\text{cells}}) - \min(\mathbf{V}_{\text{cells}})) \times 1000 \quad [\text{mV}]$$
   Cell indices shown to users are **1-based physical positions**.
   *This avoids false under-voltage alarms from unused channels and still catches real open or dead cells.*

As shown in §3.3, `bms_firmware_profiles` stores both `cell_channel_map INT[]` and `current_sign_convention` (the field log and the mockups both use **negative = discharge**).

---

## 4. Warranty System Integration & Automated Lifecycle Provisioning

The platform directly interfaces with the **EVRaid Warranty Management System**, establishing a bidirectional data loop that provisions battery packs, sets warranty boundaries, and continuously evaluates abuse events.

### 4.1 Serial Number & Bluetooth Advertisement Anatomy
Battery serials and Bluetooth advertisement identities follow a structured manufacturing convention:
```
Serial Number:       EVR-C036014-131026-L1-164637
                      │  │ │      │      │  └─► Unique Production Sequence
                      │  │ │      │      └────► Production Line (Line 1)
                      │  │ │      └───────────► Manufacturing Date (DDMMYY: 13-10-2026)
                      │  │ └──────────────────► Voltage & Ah Rating (36V, 14Ah)
                      │  └────────────────────► Cell Geometry (C = Cylindrical 18650)
                      └───────────────────────► Company Identifier (EVRaid)

Bluetooth Name:      EVR036014-CFDFA8
                      │         └─► BMS Bluetooth Controller MAC Suffix (Hex)
                      └───────────► Base Product Model Code
```

### 4.2 Automated Webhook Synchronization
Upon pack assembly and QA clearance in the manufacturing plant, the Warranty System executes an automated synchronization webhook:

```http
POST /api/v1/integrations/warranty/sync-pack
Content-Type: application/json
Authorization: Bearer <INTERNAL_SYNC_TOKEN>

{
  "serial_number": "EVR-C036014-131026-L1-164637",
  "model_code": "EVR036014-0BU0-A02",
  "bluetooth_name": "EVR036014-CFDFA8",
  "supplied_to": "LOOP",
  "status": "Activated",
  "created_date": "2026-10-13T08:00:00Z",
  "warranty_end_date": "2027-10-13T00:00:00Z",
  "warranty_period_months": 12,
  "lifetime_cycles_limit": 500,
  "cell_brand": "Tenpower",
  "cell_model": "INR18650-28HE",
  "max_motor_watt": 499
}
```

**Cloud Ingestion Action:**
1. Checks that the operator exists (`Customer: LOOP`). If it does, the pack joins that customer's default fleet. If it doesn't, the pack goes to an EVRaid-owned "Unassigned" fleet for support to triage. It is never dropped.
2. Creates a `packs` record with `connectivity_mode = 'BLE_ONLY'`. The call is **idempotent**: upsert on `serial_number`.
3. Seeds nominal limits from the model and BMS catalog: $Q_{\text{nom}} = 14.0\text{ Ah}$, rated motor power $= 499\text{ W}$, and a **reference** discharge current of $499 / 36 \approx 13.9\text{ A}$.
4. Initializes the **Warranty Evidence Audit Ledger**.

> [!NOTE]
> **v2.0 fix:** `warranty_end_date` was `2028-03-06`, which doesn't match `created_date` + `warranty_period_months = 12`. The example now uses `2027-10-13`. Agree with the warranty system on whether warranty starts at **manufacture, sale, or first activation**, and store `warranty_start_date` explicitly.
>
> **Auth:** use a scoped service credential that can be rotated (or mTLS / HMAC-signed webhook) instead of one static bearer token. Log every sync call.

### 4.3 Warranty Evidence & Abuse Detection Engine
Field telemetry is checked against the limits of the pack's model. Abuse events are written once to an append-only store and **kept permanently** as warranty evidence (PRD FR-3 notes). Each event also raises a **Warning** alert (FR-3.4).

```
                                      Incoming Normalized Telemetry
                                                   │
      ┌─────────────────────┬──────────────────────┼──────────────────────┬─────────────────────┐
      ▼                     ▼                      ▼                      ▼                     ▼
 Over-Current         Deep Discharge          Thermal Abuse        Non-Approved Charger    Cycle Count
 |I_dsg| > I_lim      V_cell < V_min(chem)    T_chg > T_chg_max    V/I charge profile      EFC vs model
 for > 10 s           (model default)         T_dsg > T_dsg_max    outside approved set    lifetime limit
      │                     │                      │                      │                     │
      └─────────────────────┴──────────────────────┼──────────────────────┴─────────────────────┘
                                                   ▼
                                Append to `warranty_abuse_events` (immutable)
                     (Timestamp, Duration, Peak Value, GPS, raw sample reference)
                                                   │
                                                   ▼
                              Update Warranty Indicator (advisory only):
                              - EFC ≥ model `lifetime_cycles_limit` ──► "Cycle limit reached"
                              - Abuse events present              ──► "Review recommended"
                              Final Valid / Void decision = EVRaid support (human)
```

1. **Over-current abuse:** catches modified motor controllers. It uses the **magnitude** of discharge current (negative sign = discharge). The trigger is $|I| > I_{\text{lim}}$ held for more than a 10-second transient window. Set $I_{\text{lim}}$ per model from the **BMS continuous rating and the cell C-rating × parallel count**, not only from motor watts divided by nominal voltage. At low SOC, a legitimate 499 W load on a 36 V pack already draws more than 15 A, so a 13.9 A limit would flag normal riding.
2. **Deep discharge abuse:** catches abandoned or neglected packs whose cell voltage falls below the chemistry floor. Defaults come from the model (e.g., NMC 2.7 V, LFP 2.5 V) and are **configurable per fleet**.
3. **Thermal abuse:** flags charging above the model's charge temperature limit (default 45 °C) or discharging above its limit (default 60 °C).
4. **Non-approved charger profile (FR-3.4):** flags charge voltage or current outside the approved charger profile(s) for the model, e.g. CV setpoint above the maximum pack voltage, or charge current above the rated maximum.
5. **Cycle limit:** tracks Equivalent Full Cycles (EFC) against the model's `lifetime_cycles_limit` (500 for the 18650 NMC packs, 3,000+ for LFP). The warranty indicator changes when the cycle limit **or** the calendar term is reached, whichever comes first.

> [!IMPORTANT]
> The platform **does not void warranties automatically.** The mockups show a "Warranty status: valid" badge and a "Warranty claim review → Waiting on EVRaid → Evidence attached" work order: the system collects evidence and EVRaid support decides. Every limit above is a per-model default that can be overridden per fleet (PRD FR-3: "Thresholds are set per fleet with EVRaid defaults").

---

## 5. End-to-End System Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EDGE & TRANSPORT LAYER                             │
│                                                                             │
│   STAGE 1: BLE FIELD FLEET                     STAGE 2: CELLULAR FLEET      │
│   ┌────────────────────────┐                   ┌────────────────────────┐   │
│   │ EVRaid Smart BMS       │                   │ EVRaid Smart BMS       │   │
│   │ 10S/16S/24S Architect. │                   │ 10S/16S/24S Architect. │   │
│   └───────────┬────────────┘                   └───────────┬────────────┘   │
│               │ BLE 5.0                                    │ CAN / UART     │
│   ┌───────────▼────────────┐                   ┌───────────▼────────────┐   │
│   │ Flutter Mobile App     │                   │ LTE-M / 2G + GNSS      │   │
│   │ SQLite Offline Queue   │                   │ 7-Day Flash Buffer     │   │
│   └───────────┬────────────┘                   └───────────┬────────────┘   │
│               │ HTTPS / TLS 1.3                            │ MQTT / TLS 1.2+│
└───────────────┼────────────────────────────────────────────┼────────────────┘
                │                                            │
┌───────────────┼────────────────────────────────────────────┼────────────────┐
│               ▼                                            ▼                │
│    CLOUD INGESTION GATEWAY                      ENTERPRISE MQTT BROKER      │
│    (FastAPI / Go REST API)                      (EMQX Enterprise Cluster)   │
│    • JWT Technician Auth                        • Mutual TLS (X.509 Certs)  │
│    • Batch Envelope Parsing                     • Hardware Device Registry  │
│               │                                            │                │
│               └──────────────────────┬─────────────────────┘                │
│                                      │                                      │
│                                      ▼                                      │
│                        UNIFIED INGESTION QUEUE LAYER                        │
│                   (Apache Kafka / AWS Kinesis Streams)                      │
│                   Topic: `telemetry.raw.ingress`                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│ PROCESSING & ANALYTICS LAYER         ▼                                      │
│    ┌───────────────────────────────────────────────────────────────────┐    │
│    │ Dynamic Ingestion Parser & Schema Normalization Workers           │    │
│    │ Reads: `bms_firmware_profiles` & `telemetry_field_mappings`       │    │
│    └──────────────────┬────────────────────────────────────────────────┘    │
│                       │ Emits Normalized Data Object                        │
│       ┌───────────────┴────────────────┬─────────────────────┐              │
│       ▼                                ▼                     ▼              │
│ ┌───────────────┐              ┌───────────────┐     ┌───────────────┐      │
│ │ Diagnostics   │              │ Alert Engine  │     │ Warranty &    │      │
│ │ Engine        │              │ Real-time     │     │ Abuse Engine  │      │
│ │ • Coulomb SOC │              │ Threshold     │     │ • Current     │      │
│ │ • Ah Capacity │              │ Evaluator     │     │ • Voltage     │      │
│ │ • EFC Cycles  │              │ • dT/dt Alarms│     │ • Temperature │      │
│ │ • Imbalance   │              │ • Drop Events │     │ • Cycle Cap   │      │
│ └───────┬───────┘              └───────┬───────┘     └───────┬───────┘      │
│         │                              │                     │              │
│         └──────────────────────┬───────┴─────────────────────┘              │
│                                │                                            │
│                                ▼                                            │
│    STATE CACHE: Redis Cluster (Hot State, Latest Pack Metric, Rates)        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────────────┐
│ PERSISTENCE & STORAGE LAYER    ▼                                            │
│    ┌───────────────────────────────────────────────────────────────────┐    │
│    │ PostgreSQL 16 + TimescaleDB Extension                             │    │
│    │ • Relational Tables: Customers, Fleets, Packs, Models, WorkOrders │    │
│    │ • Hypertables: `raw_telemetry` (Partitioned by timestamp,         │    │
│    │   compressed after 14 days, retained for 24 months)               │    │
│    │ • Continuous Aggregates: Daily Ah, Daily kWh, Cycle Rollups       │    │
│    └───────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────────────┐
│ PRESENTATION & CONSUMPTION     ▼                                            │
│    ┌───────────────────────────────────────────────────────────────────┐    │
│    │ Multi-Tenant Fleet Dashboard (Next.js 14 / React / Tailwind CSS)  │    │
│    │ • Interactive Fleet Map (Mapbox GL) with Live Pack Clustering     │    │
│    │ • 16S/24S Cell Voltage Distribution Bar Charts with Min/Max Alert │    │
│    │ • Degradation & SOH Fade Linear Tracking vs 80% EOL Threshold     │    │
│    │ • Bilingual Architecture (English & Arabic RTL Native Support)    │    │
│    │ • Work Order Generation, Kanban Tracking, and Alert Ack Workflows │    │
│    │ • Automated Monthly Fleet Health PDF/CSV Report Generator         │    │
│    └───────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Tech Stack Justification Matrix

| Tier | Technology Choice | Architectural Justification |
|---|---|---|
| **Edge Hardware** | Cat-M1 (LTE-M) / 2G + GNSS Module | Low bill-of-materials (BOM), minimal standby power drain ($<1\%$ SOC drop/week), superior penetration in urban environments compared to standard LTE. **Power stage note:** PRD §6 states "$36\text{--}60\text{ V}$ supply" (nominal pack rating); the DC-DC buck input must be rated for **$24\text{--}90\text{ V DC}$ continuous** ($100\text{ V}$ transient) to cover 10S deep discharge up to 16S ($67.2\text{ V}$) and 20S ($84\text{ V}$) full charge, unless fed from a regulated BMS auxiliary rail. |
| **Edge Mobile** | Flutter (Dart) + SQLite | Cross-platform single codebase for technician app, robust local reactive database for guaranteed offline batch buffering. |
| **MQTT Broker** | EMQX Enterprise / AWS IoT Core | Capable of handling $100,000+$ concurrent persistent connections with sub-millisecond latency and hardware certificate revocation lists (CRL). |
| **Ingestion API** | FastAPI (Python) or Go (Golang) | High-throughput asynchronous REST request handling, auto-generating OpenAPI documentation for partner integrations. |
| **Message Queue** | Apache Kafka / AWS Kinesis | Guarantees decoupling between high-velocity device intake and database writes; eliminates data loss during cloud maintenance windows. |
| **Core Database** | PostgreSQL 16 + TimescaleDB | Unifies enterprise relational entities (Tenants, Fleets, Warranties) with high-performance time-series hypertables in a single, ACID-compliant database. |
| **Fast Cache** | Redis Cluster | Sub-millisecond lookup of current battery state for live dashboards; enables temporal window operations (e.g., calculating $dT/dt$ over rolling 60 seconds). |
| **Fleet Portal** | Next.js 14 (React) + Tailwind + shadcn/ui | Server-side rendering (SSR) for lightning-fast loads, native internationalization (i18n) for Arabic RTL and English LTR layouts, robust charting (Recharts). |

> [!TIP]
> **Size the MVP for the real load.** The PRD targets 10,000 packs in year one and 100,000 later. 10,000 packs at a 30 s interval is about **333 msg/s**, and 100,000 is about 3,300 msg/s. A managed MQTT service plus one managed queue (Kinesis / Pub/Sub / MSK Serverless / Redpanda) and a single Postgres + TimescaleDB primary can handle that. Run a managed service, not a self-hosted Kafka cluster and an EMQX Enterprise cluster from day one. Keep the interfaces unchanged so you can scale later.
>
> **Hosting constraints to check:**
> * **AWS RDS / Aurora doesn't offer the TimescaleDB extension.** Use Timescale Cloud, self-managed Postgres on EC2/Kubernetes, or a provider that supports it.
> * The cloud provider and region (Egypt / EU / both) are still an **open question in the PRD (§10)**. Don't lock them in until management decides.
> * Cloud cost per pack per month is a **pricing input** (PRD §9). Estimate it during architecture sign-off.

---

## 6. Canonical Telemetry Contract & Ingestion Protocol

### 6.1 The Standard Normalized Telemetry Schema
All incoming data, regardless of origin, is converted by the Ingestion Parser into the following standard contract prior to analytical computation:

```json
{
  "pack_serial": "EVR-C036014-131026-L1-164637",
  "metadata": {
    "source_type": "BLE_APP",
    "source_id": "tech_cairo_04",
    "bms_fw_version": "SWP10_V2.1.0",
    "sequence_num": 10482,
    "timestamp_utc": "2026-11-01T15:07:00Z"
  },
  "location": {
    "latitude": 30.0131,
    "longitude": 31.2089,
    "source": "PHONE_GPS",
    "accuracy_m": 4.5
  },
  "electrical": {
    "pack_voltage_v": 39.85,
    "pack_current_a": -0.01,
    "soc_pct": 97.2,
    "soh_pct": 100.0,
    "state": "STANDBY",
    "lifetime_energy_kwh": 4.245,
    "rated_capacity_ah": 14.0
  },
  "cells": {
    "connected_count": 10,
    "voltages_v": [3.997, 3.998, 3.993, 3.996, 4.003, 4.005, 3.996, 3.998, 4.000, 4.005],
    "min_voltage_v": 3.993,
    "max_voltage_v": 4.005,
    "avg_voltage_v": 3.999,
    "imbalance_mv": 12.0,
    "weakest_cell_index": 3
  },
  "thermal": {
    "cell_temperatures_c": [23.0, 23.0],
    "max_cell_temp_c": 23.0,
    "mosfet_temp_c": 24.0,
    "internal_chip_temp_c": 25.0
  },
  "status_and_faults": {
    "bms_state_code": 2,
    "balancing_active": false,
    "charge_fet_enabled": true,
    "discharge_fet_enabled": false,
    "raw_fault_flags": 0,
    "active_alarms": []
  },
  "module": null
}
```

**Contract rules:**
* `cells.weakest_cell_index` and all cell indices are **1-based physical positions** (see §3.4). In the example, cell 3 = 3.993 V.
* `thermal.cell_temperatures_c` entries are **1-based sensor positions** (`T1`, `T2`, `T3`, …). Thermal alerts record which sensor triggered the alarm (e.g., `sensor T3` in the pack-detail and alerts mockups).
* `pack_current_a`: **negative = discharge, positive = charge**. Every source must be normalized to this convention.
* `metadata.source_type` ∈ {`BLE_APP`, `LTEM_MODULE`}. `location.source` ∈ {`PHONE_GPS`, `MODULE_GNSS`}.
* For 4G packets, `module` is filled in (it is `null` for BLE). The Devices screen in the mockups needs these fields:
  ```json
  "module": { "imei": "35xxxxxxxxx4471", "iccid": "8920xxxxxxxx", "module_fw": "1.0.3",
              "network": "LTE-M", "rssi_dbm": -87, "buffered": false }
  ```
* `metadata.buffered` / `module.buffered = true` marks replayed offline samples. Dashboards and the latency KPI must leave them out of "live" calculations.
* For the BLE path, the app assigns `sequence_num` per pack, persists it across app restarts, and the server dedupes on (`pack_serial`, `source_id`, `sequence_num`). Several phones can read the same pack.

### 6.2 Key Operational Differences: BLE vs. 4G

| Operational Parameter | Stage 1: BLE Mobile Gateway | Stage 2: Direct 4G/LTE-M Module |
|---|---|---|
| **Transmission Trigger** | Opportunistic (Only when a technician or rider connects via the app). | Deterministic & Autonomous (30s in-motion, 15m idle, instantaneous on fault). |
| **Geolocation Precision** | Mobile handset GPS coordinates captured at sync point. | Real-time GNSS fix directly from onboard battery hardware module. |
| **Offline Buffering** | Mobile app local SQLite store; syncs on next mobile cellular uplink. | Dedicated on-module SPI Flash memory storing $\ge 7$ days of circular time-series logs. |
| **Missing Pack Watchdog (`FR-3.6`)** | **Suppressed:** Flagged as `BLE_ONLY` in registry to avoid false offline alerts. | **Active:** Triggers `Warning` alert if silent longer than the fleet setting (default $6\text{ hours}$). |
| **Downstream Commands** | Local Bluetooth write requests authenticated via technician session. | **Phase 2 only:** signed MQTT commands (remote lock / BMS OTA). The MVP has **no** remote commands. |

---

## 7. Physics-Based Diagnostics & Alerting Algorithms

### 7.1 SOC, SOH and Cycle Estimation (FR-2.1 – FR-2.6)
Until the Phase 3 AI models have enough field data, diagnostics use physics-based formulas:

1. **SOC (FR-2.1, P0):** use the BMS coulomb-counted SOC, corrected against the chemistry-specific **OCV–SOC curve** when the pack is at rest (|I| < C/50 for ≥ 30 min NMC / ≥ 2 h LFP). LFP's flat OCV curve means rest correction only works reliably near the curve's ends (< 20 % or > 90 % SOC).
2. **SOH — capacity (FR-2.2, P0):** measured on full or partial charge segments that **start and end at rest**:
   $$\text{SOH}_{\text{cap}} = \frac{\left|\int_{t_0}^{t_1} I(t)\, dt\right|}{\left(\text{SOC}_{\text{OCV}}(t_1) - \text{SOC}_{\text{OCV}}(t_0)\right) \times Q_{\text{nom}}} \times 100$$
   * Take ΔSOC from **OCV lookups at the rest points**, not from the BMS SOC. The BMS SOC is itself coulomb-counted against an assumed capacity, so using it would make the result circular.
   * Only accept segments with ΔSOC ≥ 40 %. Combine several segments (median / Kalman filter) and **show a confidence level** beside each SOH value (PRD risk mitigation for partial cycles).
3. **SOH — resistance (FR-2.3, P1):** $R = \Delta V / \Delta I$ at current steps (|ΔI| ≥ 0.5 C, within 1–2 s), temperature-compensated, as a trend relative to the pack's commissioning value. Current steps are short, so this needs high-rate sampling. Either compute it **on the module/BMS** and report the value, or capture a short burst at 1 Hz when a step is detected.
4. **Equivalent Full Cycles and throughput (FR-2.4, P0):**
   $$\text{EFC} = \frac{\sum |\text{Ah}_{\text{chg}}| + \sum |\text{Ah}_{\text{dsg}}|}{2 \times Q_{\text{nom}}}$$
   Report cumulative Ah and **discharge kWh** (the mockup shows 412 EFC ≈ 2.2 MWh on a 51.2 V × 105 Ah pack).
5. **Cell imbalance (FR-2.5, P0):** ΔV from §3.4, trended over time, with the weakest cell identified. Compare at **rest or near top of charge**, because imbalance measured under load or in LFP's flat region is misleading.
6. **Remaining life (FR-2.6, P1):** fit a linear fade on SOH against EFC (or time) and extrapolate to the 80 % end-of-first-life threshold. Show the result as an estimate, e.g. "Reaches 80 % in ~8 months (est.)" as in the pack-detail mockup.

### 7.2 Usage Profile (FR-2.7, P0)
Computed from daily continuous aggregates. These feed the pack-detail "Usage profile" panel and later the AI layer:
* Depth-of-discharge distribution per cycle (0–20 / 20–40 / 40–60 / 60–80 / 80–100 %), last 90 days.
* Time above 95 % SOC (calendar-ageing stress).
* Average and peak charge rate (C-rate).
* Temperature exposure: time above 45 °C, and a histogram.

### 7.3 Health Grading Framework ($A/B/C/D$) (FR-2.8)
The PRD defines the grade as coming **"from SOH and fault history"**, and the mockups show *"Grade from SOH and fault history"*. Imbalance is **not** a grading input; it has its own alert (FR-3.3). The pack-detail mockup has a Grade B pack carrying a 120 mV imbalance alert, which confirms this.

| Grade | SOH band (from mockups) | Fault-history downgrade rule (proposal — confirm with team) |
|---|---|---|
| **A** | $\text{SOH} \ge 90\%$ | Drop one grade if there was ≥ 1 critical alert or ≥ 3 abuse events in the last 90 days |
| **B** | $80\% \le \text{SOH} < 90\%$ | Same rule |
| **C** | $70\% \le \text{SOH} < 80\%$ | Same rule |
| **D** | $\text{SOH} < 70\%$ | Also D while a critical cell or sense fault is open |

* The grade is recomputed with the **daily diagnostic snapshot**, plus right away when a critical alert opens or closes. It is not recomputed on every packet.
* The grade is **advisory**. In the MVP the platform cannot take a pack out of service (remote lock is Phase 2). It only recommends action.

### 7.4 Real-Time Safety Alerts & Thresholds (FR-3)
All thresholds are **EVRaid defaults per chemistry/model, overridable per fleet**. The values below are starting proposals for the BMS engineering team to confirm on bench packs.

> [!WARNING]
> **⚠️ Correction to v2.0:** v2.0 set the thermal-runaway threshold to **≥ 2.1 °C/min**. That number is just the **example value in the mockup alert** ("Temperature rising 2.1 °C/min"), not an engineering limit. Early-warning rates are usually lower and are combined with an absolute temperature. The default is now set accordingly.

| ID | Severity | Alert Condition | Default Threshold (proposal) | Platform Action |
|---|---|---|---|---|
| FR-3.1 | **Critical** | Over-temperature | $T_{\max} \ge 60\,^\circ\text{C}$ discharging / $\ge 50\,^\circ\text{C}$ charging (per model; identifies triggering sensor `T1..Tn`) | SMS / push to ops desk, red on map, show recommended action |
| FR-3.1 | **Critical** | Abnormal temperature rise (thermal runaway early warning) | Per sensor (`T1..Tn`): $dT_k/dt \ge 1.0\,^\circ\text{C/min}$ sustained over a 3–5 min window **and** $T_k > 45\,^\circ\text{C}$, or any $dT_k/dt \ge 3\,^\circ\text{C/min}$ | Same as above; record sensor label (e.g., `sensor T3`); recommended action: stop vehicle, move to an open area |
| FR-3.2 | **Critical** | Cell under-voltage | NMC $< 2.80\text{ V}$ / LFP $< 2.50\text{ V}$ | Dispatch technician; also logs a deep-discharge abuse event if the pack was idle or abandoned |
| FR-3.2 | **Critical** | Cell over-voltage | NMC $> 4.25\text{ V}$ / LFP $> 3.65\text{ V}$ | Stop charging, inspect charger (may also trigger FR-3.4) |
| FR-3.2 | **Critical** | Sudden cell voltage drop | $\Delta V_{\text{cell}} > 300\text{ mV}$ between consecutive samples not explained by a current step | Inspect right away (possible internal short) |
| — | **Critical** | Cell sense fault | Mapped cell channel < 0.5 V (§3.4) | Inspect wiring / BMS |
| FR-3.3 | Warning | Cell imbalance above threshold | $\Delta V_{\text{cell}} > 100\text{ mV}$ at rest, sustained | Balance charge in depot |
| FR-3.4 | Warning | Abuse: deep discharge, over-current, non-approved charger profile | §4.3 | Log permanent warranty evidence |
| FR-3.5 | Info | SOH below fleet threshold | SOH $< 80\%$ (fleet-configurable) | Plan replacement |
| FR-3.6 | Warning | Pack not reporting | Longer than the fleet setting (default 6 h), `LTEM_ACTIVE` packs only | Notify fleet logistics |
| FR-3.7 (P1) | Warning | Pack outside operating area | Outside fleet geofence polygon by $> 500\text{ m}$ | Theft / loss follow-up |

* **Sampling limits:** at the default reporting interval (30 s in use / 15 min idle), the cloud **cannot** see events shorter than a few seconds. Sudden drops, short over-currents and fast temperature rises must be **detected on the BMS/module**, which sets a fault flag and sends right away (FR-1.2 "immediate on fault"). The cloud rules act as a second line.
* **Alert lifecycle (FR-3):** `New → Acknowledged → Assigned → Closed`, with raised / acknowledged / closed timestamps and assignee. These timestamps feed the KPI "> 90 % of critical alerts acknowledged within 1 h".
* **Delivery:** dashboard for all alerts, email for all alerts, SMS / push for **Critical**.

---

## 8. Device Management, Accounts, Security & Non-functional Requirements

### 8.1 Device Management (FR-5)
* Register a pack by serial number or **QR code** and assign it to a customer and fleet. Bulk import by CSV (the Devices mockup has "Import modules (CSV)").
* Link **module IMEI, SIM ICCID and BMS serial** to one pack record, and keep the history of module swaps.
* Show module firmware version, network (LTE-M / 2G fallback), signal strength, and last seen.
* **Data model ready for OTA (no OTA in MVP):** `firmware_images`, `ota_campaigns` (staged rollout: pilot → 10 % → 50 % → full, auto-pause on failure %), `device_commands` (with `requested_by`, `approved_by`, signature, status). Create the tables now and leave them unused until Phase 2.

### 8.2 Accounts & Access (FR-6)
* **Multi-tenant:** every tenant-scoped table has `customer_id`. Isolation is enforced **in both the database (PostgreSQL Row-Level Security) and the API layer** (PRD §8).
* **Roles:** EVRaid super-admin, EVRaid support, customer admin, operations, technician, viewer. EVRaid roles can see across tenants; every cross-tenant access is logged.
* **Login:** email + password, with **two-factor authentication required for admin roles**.
* **Audit log** of user actions on packs and settings: threshold changes, pack registration and reassignment, alert actions, exports.

### 8.3 Non-functional Requirements (PRD §8)
| Area | Requirement |
|---|---|
| Availability | 99.5 % monthly uptime for the dashboard and ingestion |
| Scale | 10,000 packs in year one, 100,000 without redesign |
| Data loss | None under cloud outage: 7-day device buffer + queue + idempotent consumers (dedupe on serial + sequence number) |
| Backups | Daily, 30-day retention, **restore tested** (e.g., quarterly) |
| Retention | Raw telemetry ≥ 24 months (FR-1.6). Abuse evidence kept permanently. **Location-history retention configurable per customer** (Egypt PDPL No. 151/2020, GDPR for EU) |
| Data ownership | Customer contracts allow EVRaid to use **anonymised** telemetry for model training. Export pipeline strips customer identity and GPS for R&D datasets |
| Device security | Unique X.509 certificate per module, revocable from the admin console; MQTT over TLS 1.2+ with mutual auth; secure boot; align with ISO/SAE 21434 |
| Legal | Legal review of privacy and data-ownership terms **before the first customer contract** |

### 8.4 Future-Phase Readiness (so the MVP doesn't block Phases 2–4)
* **Phase 2 (Operate):** command path tables (§8.1), signed commands, **two-person approval** for fleet-wide lock / OTA, public REST API + webhooks (design API resource names now, behind the same RBAC).
* **Phase 3 (Predict):** raw samples kept (not just summaries). Predictions are written to a `predictions` table **beside** the physics diagnostics, with model version and confidence. Gate: > 12 months of data across ≥ 1,000 packs.
* **Phase 4 (Ecosystem):** a per-pack lifetime record (manufacture → second life) that can back the EU battery passport later.

> [!IMPORTANT]
> **Funding separation (PRD §4):** the Phase 3 AI work overlaps the **ASRT phase-two grant** scope (SOC/SOH estimation, fault prediction). Keep platform AI outputs, code repositories and cost lines clearly separate from grant deliverables.

---

## 9. Phased Execution Roadmap (26-Week MVP, Parallel Tracks)

> [!WARNING]
> **⚠️ Correction to v2.0:** v2.0 ran four **sequential** phases and didn't start 4G hardware until **week 14**, with 50–100 cellular packs in the field by week 22. That can't work. Module selection, PCB spins, certification, SIM contracts and building 50–100 modules don't fit in 8 weeks. The PRD (§10) starts **module selection in weeks 0–4** and has a **module prototype on one Smart BMS by weeks 4–10**. This roadmap follows the PRD with **three parallel tracks**.

| PRD milestone | Weeks | Track 1 — Cloud & Data | Track 2 — Edge Hardware & Firmware | Track 3 — Product, Ops & Business |
|---|---|---|---|---|
| **M1** Spec & sign-off | 0–4 | Architecture sign-off; canonical telemetry contract; DB + ingestion skeleton; **start storing BLE-app data in the new store right away**; warranty sync | **Module selection** (LTE-M/2G/GNSS); telemetry protocol spec over CAN/UART; list BMS firmware changes needed | Choose pilot operator; start IoT SIM and LTE-M coverage talks; hosting-region decision |
| **M2** Prototype & pipeline live | 4–10 | Ingestion pipeline + telemetry store **live** (BLE path in production); dynamic parser; MQTT broker + PKI in staging | **Module prototype running on one Smart BMS**; buffer + reporting intervals; first power measurements | **LTE-M coverage test** in pilot operating areas; check Egyptian **NTRA type-approval** / import needs for the module |
| **M3** Diagnostics & alerts | 10–16 | Diagnostics engine (SOC, SOH, EFC, imbalance, usage profile, grade); alert engine + notifications; abuse/warranty ledger | Bench packs on the reference cycler; **validate SOC/SOH ±5 %**; module PCB rev B; standby drain validation | Retrofit plan and cost for the 700+ deployed packs; module BOM → subscription floor price |
| **M4** Dashboard & security | 16–22 | Fleet dashboard (overview, map, pack list, pack detail, alerts, reports); device management; multi-tenant accounts, RBAC, 2FA, audit log; **security review** | Build 50–100 pilot modules; provision certificates; factory test jig; pilot installation procedure | Customer contract with data-ownership / privacy terms (**legal review**); pilot training |
| **M5** Pilot | 22–26 | Pilot on **50–100 packs** with one operator; cut packs over from `BLE_ONLY` to `LTEM_ACTIVE`; KPI dashboards; fix and harden | Field firmware fixes; 72-h outage replay test in the field | Weekly reviews with the operator; MVP sign-off; Phase 2 kickoff (OTA, remote lock, work-order dispatch, API) |

**Critical-path dependencies (PRD §10):** BMS firmware exposing all signals over CAN/UART, LTE-M coverage and IoT SIM agreements in Egypt, a pilot operator willing to install modules, and the bench test setup for SOC/SOH reference measurements.

> [!NOTE]
> **Work orders & "Run diagnostic" scope:**
> * **Work orders:** the PRD puts *work orders* in **Phase 2 (Operate)**, and the Arabic doc lists "أوامر صيانة توزع على الفنيين تلقائياً" as phase two. The MVP must deliver **alert acknowledge / assign / close** (FR-3). The mockup "Alerts & work orders" screen (with Kanban and "Waiting on EVRaid") can ship as a **simple manual work order from an alert (P1)**. Automatic dispatch to technicians stays in Phase 2. Management should confirm this.
> * **"Run diagnostic" button (pack-detail mockup):** because downstream commands to the module are Phase 2 (§6.2), in the MVP this button triggers an **on-demand cloud recalculation** of the pack's diagnostic snapshot and health grade from the latest stored telemetry (and in Phase 2 can additionally request an immediate poll from the module).

---

## 10. Architectural Verification & Success Metrics

| Milestone Metric | MVP Acceptance Target | Verification Methodology |
|---|---|---|
| **Daily Reporting Rate** | $> 95\%$ of active connected fleet | Measured over rolling 7 days across pilot customer deployments. |
| **Telemetry Ingestion Latency** | $< 60\text{ seconds}$ (p95) | Timestamp delta from physical edge sampling to dashboard render. |
| **SOC Estimation Accuracy** | Within $\pm 5\%$ error margin | Benchmark validation against calibrated lab test bench. |
| **SOH Estimation Accuracy** | Within $\pm 5\%$ error margin | Controlled capacity discharge test on a random sample of 20 packs. |
| **Critical Alert SLA** | $> 90\%$ acknowledged in $< 1\text{ hour}$ | Measured monthly from alert `raised_at` → `acknowledged_at` timestamps. |
| **Data Ingestion Reliability** | $100\%$ delivery (Zero loss) | 72-hour simulated cellular outage test validating Flash replay buffer. |
| **System Uptime** | $99.5\%$ monthly availability | Synthetic ping and health check monitoring on API and ingestion pipeline. |
| **Paying Pilot Customers** | 1 by end of MVP, 3 within 6 months | Signed contracts. |

> *Per the PRD, these targets are proposals for the team to confirm.*

---

## 11. Open Decisions (from PRD §10 and this review)
- [ ] Module integrated in the BMS, or a separate board? Retrofit plan for the 700+ deployed packs?
- [ ] Which operator runs the pilot, and on how many packs?
- [ ] Cloud provider and hosting region (Egypt, EU, or both)?
- [ ] Build in-house under the software team, or partly outsource?
- [ ] Platform product name.
- [ ] Canonical model-code scheme and verified catalog (§2); BMS cell-channel maps per firmware (§3.4).
- [ ] Engineering sign-off on default alert, abuse and grading thresholds (§4.3, §7.3, §7.4).
- [ ] Warranty start-date rule (manufacture / sale / activation) and who decides warranty void.
- [ ] Work orders in MVP: manual from alerts (P1) or fully deferred to Phase 2?