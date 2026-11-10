# EVRaid Cloud — End-to-End Technical Execution Checklist (A to Z)

*Version 2.1 — reviewed against the PRD (MVP), Oct 26, 2026. Companion to [evraid_cloud_master_technical_plan.md](./evraid_cloud_master_technical_plan.md).*

This checklist covers the technical implementation of **`evraid_cloud`**: moving from the current **BMS → BLE App → Cloud** path to direct **BMS → LTE-M → Cloud** telemetry, plus multi-tenant fleet operations, dynamic schema mapping and warranty-system sync.

> **Naming:** the PRD uses *Phase 1–4* for product phases (1 = MVP, 2 = Operate, 3 = Predict, 4 = Ecosystem). This checklist covers **PRD Phase 1 (MVP)** only. It is organized by the **PRD milestones M1–M5** and **three parallel tracks** (Cloud, Edge Hardware, Product/Ops). `FR-x.y` refers to PRD requirement IDs. `(P1)` = ship if time allows.

---

## M1 — Specification & Sign-off (Weeks 0–4)

### Cloud track — Architecture & Data Contracts
- [x] Finalize the canonical telemetry schema (JSON; Protobuf/CBOR optional for LTE-M payload size), shared by BLE and 4G. *(Implemented in `backend/app/schemas/telemetry.py`)*
- [x] Metadata envelope (FR-1.4): `pack_serial`, `source_type` (`BLE_APP` / `LTEM_MODULE`), `source_id`, `bms_fw_version`, `timestamp_utc`, `sequence_num`, `buffered`, location (`PHONE_GPS` / `MODULE_GNSS`).
- [x] Payload content (FR-1.1): pack voltage, current (**negative = discharge**), all cell voltages, cell/pack temperatures, SOC, BMS fault flags, charge/discharge state, GPS.
- [ ] Tenant isolation: PostgreSQL **Row-Level Security** plus API-layer checks (PRD §8 says both layers).
- [ ] Architecture sign-off, including a cloud-cost-per-pack estimate (pricing input, PRD §9).
- [ ] **Decision pending (PRD open question):** cloud provider and hosting region (Egypt / EU / both), checked against Egypt PDPL (Law 151/2020) and GDPR.
- [x] **Start storing BLE-app data in the new data store right away** (PRD M1). Don't wait for the full pipeline. *(Implemented via `POST /v1/telemetry/batch`)*

### Cloud track — Hardware Catalog & Dynamic Field Mapping
- [x] `battery_models`: chemistry (LFP/NMC), **one** `series_count`, parallel count, rated capacity $Q_{\text{nom}}$, voltage/current/temperature limits, designed cycle life, approved charger profile(s). *(Implemented in `backend/app/models/catalog.py` & `seed_data.py`)*
- [ ] **Verify the catalog with engineering**: inconsistent model codes, the 72 V "20S/24S" ambiguity, and a missing 48 V 105 Ah LFP entry (master plan §2).
- [x] `bms_profiles`: BMS model, interfaces (BLE/CAN/UART), channel count, continuous current rating. *(Implemented in `backend/app/models/catalog.py`)*
- [x] `bms_firmware_profiles` + `telemetry_field_mappings`: key aliases, scale expressions, fault-bitmask definitions, **`cell_channel_map`** (positional), `current_sign_convention`. *(Implemented in `backend/app/models/catalog.py` & `normalizer.py`)*
- [ ] BMS firmware team confirms the cell-channel wiring for each BMS (e.g., is channel 16 = physical cell 10 on 10S boards?).

### Edge track — Module & Protocol
- [ ] **Module selection**: LTE-M (Cat-M1), NB-IoT optional, 2G fallback, GNSS (GPS + ≥ 1 other constellation), IP67 when integrated.
- [ ] **Power supply stage**: PRD specifies 36–60 V nominal pack supply; design the module DC-DC buck input for **24–90 V DC continuous (100 V transient)** to safely cover 10S deep discharge (27 V) up to 16S (67.2 V) and 20S (84 V) full charge, unless powered from a regulated BMS auxiliary rail.
- [ ] Telemetry protocol spec over CAN (preferred) / UART between BMS and module.
- [ ] List the **BMS firmware changes** needed to expose every FR-1.1 signal over CAN/UART (PRD dependency).
- [ ] Decide security architecture: secure boot, unique device certificate, TLS 1.2+.

### Product / Ops track
- [ ] Choose the pilot operator and pack count (PRD open question).
- [ ] Start IoT SIM / eSIM agreements and confirm which Egyptian operators support LTE-M.
- [ ] Decide: integrated module in the BMS or a separate board (PRD open question).

---

## M2 — Module Prototype & Ingestion Pipeline Live (Weeks 4–10)

### Cloud track — Core Entities (PostgreSQL)
- [x] `customers` (ID, name, country, subscription tier Basic/Pro/Enterprise). *(Defined in `backend/app/models/catalog.py`)*
- [x] `fleets` (ID, customer_id, reporting-interval config (FR-1.2), alert thresholds, operating geofence (P1), location-retention setting). *(Defined in `backend/app/models/catalog.py`)*
- [ ] `users` + RBAC (FR-6): EVRaid super-admin, EVRaid support, customer admin, operations, technician, viewer.
- [ ] **2FA required for admin roles**.
- [x] `packs`: `serial_number` (unique), `ble_adv_name`, `model_id`, `fleet_id`, `connectivity_mode` (`BLE_ONLY` / `LTEM_ACTIVE`), warranty start/end, vehicle ID, commissioned / decommissioned dates. *(Defined in `backend/app/models/catalog.py`)*
- [ ] `modules`: IMEI, SIM ICCID, module firmware version, linked pack, link history (FR-5).
- [ ] `alerts`: type, severity, status (`New → Acknowledged → Assigned → Closed`), assignee, raised / acknowledged / closed timestamps.
- [ ] `audit_log`: every user action on packs and settings (FR-6).
- [ ] Phase-2-ready, empty for now: `firmware_images`, `ota_campaigns`, `device_commands` (FR-5 "prepare data model for OTA").

### Cloud track — Time-Series Store (TimescaleDB)
- [x] `raw_telemetry` hypertable partitioned on `timestamp_utc`; indexed on `pack_serial`, `customer_id`, `timestamp_utc`. *(Configured in `docker/postgres-init/01_init.sql` & `telemetry.py`)*
- [x] Normalized columns: `pack_voltage_v`, `current_a`, `soc_pct`, `max_temp_c`, `cell_min_v`, `cell_max_v`, `cell_imbalance_mv`, plus `cell_voltages REAL[]`, `temps REAL[]`, `fault_flags`, lat/lon.
- [x] `raw_payload JSONB` holding the untouched edge payload.
- [x] Unique key on (`pack_serial`, `source_id`, `sequence_num`) for idempotent ingest and dedupe.
- [ ] Compression for chunks older than 14 days (segment by `pack_serial`).
- [ ] Retention **≥ 24 months** for raw data (FR-1.6). Location history follows the per-customer retention setting.
- [ ] Continuous aggregates (daily): Ah and kWh throughput, EFC, min/max temperature, DoD histogram, time above 95 % SOC, average charge C-rate (FR-2.4, FR-2.7).
- [x] Hosting check: **AWS RDS / Aurora doesn't support TimescaleDB**. Choose Timescale Cloud, self-managed, or another provider. *(Configured via `timescale/timescaledb:latest-pg16` in `docker-compose.yml`)*

### Cloud track — BLE Path: Flutter App Upgrades (FR-1.5)
- [x] BLE scan filter on the `EVR*` prefix. *(Implemented in `EvRaid-App/lib/core/config/ble_config.dart` & `scanner_screen.dart`)*
- [x] Parse BMS frames for `SWP10_V2.1.0` and sister firmwares into the raw JSON envelope. *(Implemented in `EvRaid-App/lib/data/services/ble_service.dart` & `canonical_telemetry.dart`)*
- [x] SQLite offline queue: store readings with phone GPS + accuracy, technician ID, BMS UTC timestamp, and a **per-pack persisted `sequence_num`**. *(Implemented in `EvRaid-App/lib/data/local/app_database.dart`, `sequence_manager.dart`, `location_service.dart` & `telemetry_queue_service.dart`)*
- [x] Background batch sync over HTTPS. Keep local records until the server ACKs (HTTP 200/201 with per-item results). *(Implemented in `EvRaid-App/lib/data/services/cloud_sync_service.dart` & verified in `test/cloud_integration_test.dart`)*

### Cloud track — Ingestion API & Queue
- [x] `POST /v1/telemetry/batch` (FastAPI or Go) behind a load balancer; JWT auth; tenant check per pack. *(Implemented in `backend/app/api/v1/endpoints/telemetry.py`)*
- [ ] Ingestion queue (managed: Kinesis / Pub/Sub / MSK Serverless / Redpanda) → topic `telemetry.raw.ingress`.
- [ ] Size it for 10,000 packs in year one (~333 msg/s at 30 s) and 100,000 without redesign.

### Cloud track — Dynamic Parser Workers
- [ ] Consume `telemetry.raw.ingress`; resolve pack → model → BMS/firmware profile → mappings (cached).
- [ ] Apply aliases, scaling and fault-bitmask unpacking.
- [x] **Select cells by position through `cell_channel_map`, not by value filtering.** A mapped cell reading < 0.5 V raises `SENSE_FAULT` (Critical). Never discard it. *(Implemented in `backend/app/services/normalizer.py` & `EvRaid-App/lib/data/models/battery_metrics.dart`)*
- [ ] If `nr_validConnectedCells` ≠ model `series_count`, raise a `CONFIG_MISMATCH` data-quality flag.
- [x] Persist raw + normalized rows; update Redis hot state; emit to `telemetry.normalized`. *(Hot State cached & queryable via `/v1/packs/{serial}/live`)*
- [ ] Unknown firmware version → park in a dead-letter topic and alert EVRaid support. Never drop.

### Cloud track — Warranty System Sync
- [x] `POST /api/v1/integrations/warranty/sync-pack`: idempotent upsert on serial; scoped, rotatable service credential (or signed webhook). *(Implemented in `backend/app/api/v1/endpoints/warranty.py`)*
- [x] Fields: serial, model code (+ alias resolution), BLE name, supplied-to operator, warranty start/end, warranty months, lifetime cycle limit, cell brand/model, max motor watt.
- [x] Auto-assign the pack to the operator's default fleet from `supplied_to`. Unknown operator → EVRaid "Unassigned" fleet.
- [x] Agree on the warranty start rule (manufacture / sale / activation) and check that end date = start + months.

### Edge track — Module Prototype
- [ ] **Module prototype running on one Smart BMS** (PRD M2).
- [ ] Reporting intervals configurable per fleet (FR-1.2): 30 s in use, 15 min idle, **immediate on fault**.
- [ ] Ordered flash ring buffer ≥ 7 days; ordered replay on reconnect (FR-1.3).
- [ ] On-device detection of fast events (sudden cell drop, short over-current, fast temperature rise) that sets fault flags and sends immediately.
- [ ] First standby-current measurements against the < 1 % SOC/week target.

### Cloud track — MQTT (staging)
- [ ] MQTT broker (managed AWS IoT Core / EMQX Cloud, or EMQX self-hosted) in staging.
- [ ] PKI: unique X.509 per module, mutual TLS 1.2+, revocation from the admin console.
- [ ] Topics `packs/{serial}/telemetry` bridged to `telemetry.raw.ingress`; ACL so each device can only publish to its own topic.

### Product / Ops track
- [ ] **LTE-M coverage test** in the pilot operating areas (PRD risk mitigation).
- [ ] Check **NTRA type-approval** / import requirements for the cellular module in Egypt.

---

## M3 — Diagnostics & Alerts (Weeks 10–16)

### Cloud track — Physics-Based Diagnostics (FR-2)
- [ ] **SOC (FR-2.1):** BMS coulomb counting, with OCV correction at rest (chemistry-specific curves; LFP correction only near the ends of the curve).
- [ ] **SOH capacity (FR-2.2):** on segments bounded by rest periods, $\text{SOH} = |\int I\,dt| / (\Delta\text{SOC}_{\text{OCV}} \times Q_{\text{nom}})$, ΔSOC ≥ 40 %, combined over several segments. **Show a confidence level.**
- [ ] **SOH resistance (FR-2.3, P1):** ΔV/ΔI at current steps, temperature-compensated (computed on-device or from a high-rate burst).
- [ ] **EFC + throughput (FR-2.4):** $\text{EFC} = (\sum|\text{Ah}_{chg}| + \sum|\text{Ah}_{dsg}|) / (2 Q_{\text{nom}})$; cumulative Ah and discharge kWh.
- [x] **Imbalance (FR-2.5):** max − min of mapped cells, at rest / near top of charge; trended; weakest cell identified (1-based index). *(Implemented in `backend/app/services/normalizer.py` & `diagnostics.py`)*
- [ ] **Remaining life (FR-2.6, P1):** linear fade fit to the 80 % threshold, shown as an estimate.
- [ ] **Usage profile (FR-2.7):** DoD distribution, temperature exposure, charge rate, time at high SOC.
- [x] **Health grade (FR-2.8) from SOH + fault history** (not imbalance): A ≥ 90 %, B 80–90 %, C 70–80 %, D < 70 %, downgraded for recent critical alerts / abuse events (rule to be confirmed). Advisory only; the MVP can't take a pack out of service. *(Implemented in `backend/app/services/diagnostics.py`)*
- [ ] Daily `diagnostic_snapshots` per pack (date, SOC, SOH cap/res, EFC, Ah throughput, imbalance, grade).

### Cloud track — Alert Engine (FR-3)
Thresholds are **EVRaid defaults per chemistry/model, overridable per fleet**. The values below are proposals for engineering sign-off.
- [x] **FR-3.1 Critical:** over-temperature (absolute) and abnormal rise rate per temperature sensor `T1..Tn` (e.g., ≥ 1 °C/min sustained with T > 45 °C, or ≥ 3 °C/min), recording the triggering sensor label (e.g., `sensor T3`). *v2.0's 2.1 °C/min was the mockup's example value, not a limit.* *(Implemented in `backend/app/services/diagnostics.py`)*
- [x] **FR-3.2 Critical:** cell under-voltage (NMC < 2.8 V / LFP < 2.5 V), **cell over-voltage** (NMC > 4.25 V / LFP > 3.65 V), sudden cell voltage drop. *(Implemented in `backend/app/services/diagnostics.py`)*
- [x] **Critical:** cell sense fault (from the parser). *(Implemented in `backend/app/services/normalizer.py` & `diagnostics.py`)*
- [x] **FR-3.3 Warning:** cell imbalance > 100 mV at rest, sustained. *(Implemented in `backend/app/services/diagnostics.py`)*
- [x] **FR-3.4 Warning:** abuse (deep discharge, over-current, non-approved charger profile). *(Implemented in `backend/app/services/abuse.py`)*
- [x] **FR-3.5 Info:** SOH below the fleet threshold (default 80 %). *(Implemented in `backend/app/services/diagnostics.py`)*
- [ ] **FR-3.6 Warning:** pack not reporting longer than the fleet setting (default 6 h), `LTEM_ACTIVE` packs only.
- [ ] **FR-3.7 Warning (P1):** pack outside the operating geofence.
- [ ] Alert workflow: acknowledge, assign, close, with timestamps; de-duplicate repeated alerts for the same open condition.
- [ ] Notification dispatcher: dashboard (all), email (all), **SMS / push for Critical**.

### Cloud track — Abuse & Warranty Evidence Engine
- [x] Rules on `telemetry.normalized`, all limits taken from the model: *(Implemented in `backend/app/services/abuse.py`)*
  - [x] Over-current: $|I_{dsg}| > I_{\lim}$ for > 10 s, with $I_{\lim}$ from the BMS continuous rating / cell C-rate × P (not only motor W ÷ nominal V).
  - [x] Deep discharge below the chemistry floor.
  - [x] Charging above the charge-temperature limit (default 45 °C); discharging above 60 °C.
  - [ ] Non-approved charger profile (CV setpoint / charge current outside the approved profile).
  - [x] EFC vs the model `lifetime_cycles_limit`.
- [x] Append-only `warranty_abuse_events` (timestamp, duration, peak value, GPS, raw sample reference), **kept permanently**. *(Implemented in `backend/app/services/abuse.py`)*
- [x] Warranty indicator is **advisory** ("Review recommended" / "Cycle limit reached"). EVRaid support makes the final valid/void decision. *(Implemented in `backend/app/services/abuse.py`)*

### Edge track — Bench Validation
- [ ] Bench packs on the reference cycler: **SOC ±5 %** and **SOH ±5 %** (sample of 20 packs for SOH).
- [ ] Module PCB revision with fixes from the prototype; standby drain validated.

### Product / Ops track
- [ ] Retrofit plan and cost for the 700+ deployed packs.
- [ ] Module BOM target → subscription floor price; SIM data cost per pack per month.

---

## M4 — Dashboard, Device Management, Accounts & Security Review (Weeks 16–22)

### Cloud track — Web Dashboard (FR-4) — Next.js / React
- [ ] **Fleet overview:** packs online / total and % reported today, average SOH (+ 90-day change), open alerts (critical / warning), packs needing charge (SOC < 20 %), average EFC; health grade distribution; 12-month average SOH trend; open critical alerts; packs needing attention.
- [ ] **Fleet map:** last known position (phone GPS or module GNSS, with source and age shown); filters by status, health grade and alert.
- [ ] **Pack list:** search (serial / IMEI) and sort by SOH, SOC, cycles, last seen.
- [ ] **Pack detail:** live values (SOC, SOH, EFC, voltage, current, max temperature + sensor label); cell-voltage bar chart with the weakest cell highlighted; SOH history + remaining-life estimate; usage profile; abuse events / warranty evidence; pack & device info; alert history; tabs for location history and raw telemetry; **"Run diagnostic"** action (re-evaluates cloud diagnostic snapshot on latest telemetry in MVP; live device poll in Phase 2).
- [ ] **Alerts:** filter by severity / status / assigned-to-me; detail panel with recommended action and notification channels; acknowledge / assign.
- [ ] **Work orders (P1, manual from alert):** Kanban To do / In progress / Waiting on EVRaid / Done. *Per the PRD, work orders and automatic dispatch are Phase 2. Management to confirm MVP scope.*
- [ ] **Reports:** monthly fleet health report, PDF and CSV export.
- [ ] **Localization:** English (P0); Arabic with RTL (P1).
- [ ] Phase-gated nav items ("AI insights P3", "Devices & OTA P2") shown as previews or hidden, per the mockups.

### Cloud track — Device Management (FR-5)
- [ ] Register a pack by serial or **QR code**; assign it to a customer and fleet; bulk CSV import.
- [ ] Link module IMEI + SIM ICCID + BMS serial to one pack; record module swaps.
- [ ] Show module firmware version, network (LTE-M / 2G), signal and last seen.

### Cloud track — Accounts & Admin (FR-6)
- [ ] Email + password login; 2FA required for admin roles.
- [ ] EVRaid admin console: cross-tenant view (audited), raw telemetry viewer, certificate revocation, firmware-profile / mapping editor.
- [ ] Anonymised data export for EVRaid R&D (customer identity and GPS removed).

### Security & NFR
- [ ] **Security review** (PRD M4): app pen test, MQTT broker fuzzing, tenant-isolation tests (cross-tenant access attempts).
- [ ] Audit logging verified for every pack and settings action.
- [ ] Daily backups, 30-day retention, **restore tested**.
- [ ] Uptime monitoring against the 99.5 % monthly target (dashboard + ingestion).

### Edge track — Pilot Build
- [ ] Build 50–100 pilot modules; provision certificates at the factory; test jig.
- [ ] Installation procedure (integrated or retrofit) and technician training.

### Product / Ops track
- [ ] **Legal review** of privacy and data-ownership terms before the first customer contract.
- [ ] Pilot operator contract and training.

---

## M5 — Pilot & Hardening (Weeks 22–26)

### Provisioning & Cutover
- [ ] Provision 50–100 packs: scan QR → link BMS serial, IMEI, ICCID → set `LTEM_ACTIVE`.
- [ ] Confirm the switch from opportunistic BLE GPS to continuous GNSS, and that the not-reporting watchdog is active.
- [x] Keep BLE in the app as a secondary on-site diagnostic channel. *(Preserved in `EvRaid-App` alongside background cloud batch sync)*

### Validation
- [ ] Offline replay: disconnect the antenna for 72 h; all messages upload in order with no loss and no duplicates.
- [ ] Latency pack → dashboard < 60 s at p95 (live samples only, not buffered replays).
- [ ] > 95 % of connected packs report daily (rolling 7 days).
- [ ] > 90 % of critical alerts acknowledged within 1 h (monthly).

### Operations
- [ ] Weekly reviews with the operator's ops team and technicians; tune thresholds and UI.
- [ ] MVP sign-off: 1 paying pilot customer live (target 3 within 6 months).
- [ ] Phase 2 kickoff: OTA, remote lock (signed commands, **two-person approval** for fleet-wide actions), work-order dispatch, public API + webhooks.

---

## Cross-cutting Reminders
- [ ] **ASRT grant separation:** keep Phase 3 AI work, outputs and cost lines separate from the ASRT phase-two grant scope (PRD §4).
- [ ] The success-metric targets are proposals. Confirm them with the team (PRD §2).
- [ ] Keep raw samples (not just summaries) so Phase 3 AI can train on them.
