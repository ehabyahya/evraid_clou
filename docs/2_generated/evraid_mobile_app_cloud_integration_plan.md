# EVRaid Mobile App (`EvRaid-App`) — Cloud Integration & Technical Modification Plan

*Companion to [evraid_cloud_end_to_end_technical_implementation_checklist.md](./evraid_cloud_end_to_end_technical_implementation_checklist.md) and [evraid_cloud_master_technical_plan.md](./evraid_cloud_master_technical_plan.md).*  
*Target Repository: `C:\1Data\4_EvRaid\Projects\EvRaid-App\lib`*  
*Status: **✅ COMPLETED & VERIFIED** (`flutter test test/cloud_integration_test.dart` passed)*

---

## 1. Executive Summary & Current State Audit

After auditing `C:\1Data\4_EvRaid\Projects\EvRaid-App\lib`, the Flutter mobile app (`evraid3` v1.0.4+6) currently operates as a **standalone local BLE monitor** with **zero cloud persistence, no SQLite offline queue, and no GPS tagging on telemetry frames**:

| Capability Required by Checklist | Current State in `EvRaid-App` | Gap Analysis |
|---|---|---|
| **M1 / FR-1.4:** Metadata Envelope (`pack_serial`, `source_id`, `bms_fw_version`, `sequence_num`, `timestamp_utc`, `buffered`) | `BleProtocolKeys` & `BatteryMetrics` do **not** extract `cFirmwareVersion`, do not track `sequence_num`, and have no `pack_serial` mapping. | Needs `cFirmwareVersion` parsing, persistent per-pack `sequence_num` counter, and BLE Name (`EVR036014-CFDFA8`) $\leftrightarrow$ `pack_serial` resolution. |
| **M1 / FR-1.1 & M2:** Positional Cell Mapping (`cell_channel_map`) | `BleService` stores all 16 raw channels in `BatteryMetrics.cellVoltages`. Only the UI widget `_CellVoltageGridBars._getIndices()` in `dashboard_screen.dart` maps 10S (`[0..8, 15]`) and 13S (`[0..11, 15]`). | Positional cell mapping must be moved from the UI layer into the **Data/Domain layer** so canonical telemetry sent to `POST /v1/telemetry/batch` passes the backend check `connected_count == len(voltages_v)`. |
| **M2 / FR-1.5:** BLE Scan Filter on `EVR*` Prefix | `BleConfig.deviceNameFilter = 'evr'` and `scanner_screen.dart` uses `.toLowerCase().contains('evr')`. | Change filter to prefix check `.toUpperCase().startsWith('EVR')`. |
| **M2 / FR-1.5:** Phone GPS + Accuracy (`PHONE_GPS`) | `geolocator: ^10.0.0` is in `pubspec.yaml`, but **never used** anywhere in `lib/`. Also `scanner_screen.dart` passes `androidUsesFineLocation: false` and `PermissionService` skips location permission on Android 12+ (`sdkInt >= 31`). | Request location permission on **all** Android/iOS versions and create `LocationService` to attach `latitude`, `longitude`, and `accuracy_m` to queued telemetry. |
| **M2 / FR-1.5:** SQLite Offline Queue | Not implemented (no `sqflite` in `pubspec.yaml`). | Add `sqflite` table `telemetry_queue` to buffer canonical JSON frames offline with `buffered` flag and retry state. |
| **M1 & M2 / FR-1.5:** Background Batch Sync (`POST /v1/telemetry/batch`) | No HTTP client or API service exists in `lib/`. | Create `CloudSyncService` to flush batches (up to 500 records) over HTTPS, deleting/marking records **only** after per-item ACK (`ACCEPTED` / `DUPLICATE`) from backend. |
| **M4 & M5 / FR-5 & FR-6:** Technician Auth & QR Provisioning | No login or QR scanner screen. | Add Technician ID / JWT Auth and optional QR Provisioning screen (`BLE_ONLY` $\rightarrow$ `LTEM_ACTIVE` cutover). |

---

## 2. Target Architecture & Directory Structure (`EvRaid-App/lib`)

Below is the complete file map showing **existing files to modify `[MODIFY]`** and **new files to create `[NEW]`**:

```text
C:\1Data\4_EvRaid\Projects\EvRaid-App\
├── pubspec.yaml                                      [MODIFY] Add sqflite, dio/http, connectivity_plus, flutter_secure_storage
└── lib/
    ├── main.dart                                     [MODIFY] Initialize SQLite DB & start background CloudSyncService
    ├── core/
    │   ├── config/
    │   │   ├── ble_config.dart                       [MODIFY] Add cFirmwareVersion key, EVR* prefix, sampling throttle config
    │   │   ├── api_config.dart                       [NEW]    Cloud base URL, batch size (500), sync intervals, timeouts
    │   │   └── mock_data_config.dart                 [MODIFY] Add dummy bmsFirmwareVersion & packSerial for mock testing
    │   └── observers/
    │       └── bluetooth_observer.dart               (No change)
    ├── data/
    │   ├── local/
    │   │   ├── app_database.dart                     [NEW]    SQLite initialization (telemetry_queue, pack_sequences, pack_registry)
    │   │   └── sequence_manager.dart                 [NEW]    Atomic per-pack monotonically increasing sequence_num persistence
    │   ├── models/
    │   │   ├── battery_metrics.dart                  [MODIFY] Add bmsFirmwareVersion, physicalCellVoltages, weakestCellIndex, imbalanceMv
    │   │   └── canonical_telemetry.dart              [NEW]    Dart models matching backend CanonicalTelemetryRecord & BatchIngestResponse
    │   └── services/
    │       ├── ble_service.dart                      [MODIFY] Parse cFirmwareVersion, apply positional cell mapping, emit to queue
    │       ├── permission_service.dart               [MODIFY] Require Location permission on Android 12+ too (for PHONE_GPS)
    │       ├── location_service.dart                 [NEW]    Fetch & cache Phone GPS (lat, lon, accuracy_m) via Geolocator
    │       ├── telemetry_queue_service.dart          [NEW]    Throttle (e.g. 1 sample / 10-30s or immediate on fault) & insert to SQLite
    │       └── cloud_sync_service.dart               [NEW]    Background worker posting batches to POST /v1/telemetry/batch
    ├── providers/
    │   ├── ble_providers.dart                        [MODIFY] Hook TelemetryQueueService into BleService stream
    │   ├── permission_providers.dart                 (No change)
    │   └── sync_providers.dart                       [NEW]    Riverpod providers for pending queue count, last sync status, technician ID
    └── features/
        ├── home/view/main_flow.dart                  [MODIFY] Ensure technician ID / auth check before or alongside scanner
        ├── scanner/view/scanner_screen.dart          [MODIFY] Enforce EVR* prefix filter & pack serial binding
        ├── dashboard/view/dashboard_screen.dart      [MODIFY] Show Cloud Sync status badge (Pending / Synced), use normalized cells
        └── settings/view/settings_screen.dart        [MODIFY] Add Cloud Sync controls (Manual Sync, Queue Count, Technician ID, Server URL)
```

---

## 3. Step-by-Step Implementation Plan by File

### Phase A: Dependencies (`pubspec.yaml`)

**File:** `C:\1Data\4_EvRaid\Projects\EvRaid-App\pubspec.yaml` `[MODIFY]`

Add the required packages for SQLite persistence, HTTP networking, and network state detection:
```yaml
dependencies:
  # Existing packages...
  sqflite: ^2.3.3+1
  http: ^1.2.2 # or dio: ^5.7.0
  connectivity_plus: ^6.0.5
  flutter_secure_storage: ^9.2.2
```

---

### Phase B: BLE Protocol, Firmware Version & Positional Cell Mapping (Checklist M1 & M2)

#### 1. `lib/core/config/ble_config.dart` `[MODIFY]`
* **Checklist Item:** *BLE scan filter on the `EVR*` prefix* & *Parse BMS frames for `SWP10_V2.1.0` and sister firmwares*.
* **Changes:**
  1. Update `deviceNameFilter` from `'evr'` to `'EVR'` and enforce prefix matching.
  2. Add `static const String firmwareVersion = 'cFirmwareVersion';` to `BleProtocolKeys` and include it in `measSectionKeys` / `displaySectionKeys`.
  3. Add telemetry sampling interval constants so the app doesn't flood SQLite at 1–5 Hz when nothing changes:
     * `telemetryQueueInterval = Duration(seconds: 30)` (normal operation, matching `FR-1.2`).
     * Immediate enqueue when `errorFlags != 0` or any fault boolean transitions to `true`.
  4. Move the positional `cell_channel_map` helper here (or to a dedicated normalizer):
     * `10S` (`validConnectedCells == 10`): 0-based indices `[0, 1, 2, 3, 4, 5, 6, 7, 8, 15]` (1-based `[1..9, 16]`).
     * `13S` (`validConnectedCells == 13`): 0-based indices `[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15]`.
     * `16S` (`validConnectedCells == 16`): 0-based indices `[0..15]`.

#### 2. `lib/data/models/battery_metrics.dart` `[MODIFY]`
* **Checklist Item:** *Payload content (FR-1.1) & Imbalance (FR-2.5)*.
* **Changes:**
  1. Add `final String bmsFirmwareVersion;` (default `'SWP10_V2.1.0'` if omitted by older frames).
  2. Add `final String deviceName;` (e.g., `'EVR036014-CFDFA8'`) and `final String? packSerial;`.
  3. Add computed getters for canonical telemetry fields:
     * `List<double> get mappedPhysicalCellVoltages`: extracts the `validConnectedCells` physical cells by position using the channel map (**never** filtering by voltage value `< 0.5V`, preserving `SENSE_FAULT` detection as required by Checklist M2 line 80).
     * `double get mappedMinCellVoltage`, `double get mappedMaxCellVoltage`, `double get mappedAvgCellVoltage`.
     * `double get imbalanceMv => (mappedMaxCellVoltage - mappedMinCellVoltage) * 1000.0;`
     * `int get weakestCellIndex`: 1-based index of `mappedMinCellVoltage` inside `mappedPhysicalCellVoltages`.
     * `String get canonicalBmsState`: maps `bmsState` (`0 -> "STANDBY"`, `1 -> "CHARGING"`, `2 -> "DISCHARGING"`, `3 -> "FAULT"`).

#### 3. `lib/data/services/ble_service.dart` `[MODIFY]`
* **Checklist Item:** *Parse BMS frames for `SWP10_V2.1.0` and sister firmwares into the raw JSON envelope*.
* **Changes:**
  1. In `_processData()` (lines 233–297), extract `cFirmwareVersion` from `measData[BleProtocolKeys.firmwareVersion] ?? jsonData[BleProtocolKeys.firmwareVersion] ?? displayData[BleProtocolKeys.firmwareVersion] ?? 'SWP10_V2.1.0'`.
  2. Attach `_connectedDevice?.platformName` and `_connectedDevice?.remoteId.str` to each emitted `BatteryMetrics` instance so downstream queue services know which physical pack emitted the frame.

---

### Phase C: Canonical Telemetry Contract (`lib/data/models/canonical_telemetry.dart` `[NEW]`)

* **Checklist Item:** *Finalize the canonical telemetry schema (`backend/app/schemas/telemetry.py`)*.
* **Exact JSON Schema Match Required by Backend (`POST /v1/telemetry/batch`):**
  * **CRITICAL BACKEND RULE (`backend/app/services/ingestion.py` line 58):**
    `if record.cells.connected_count != len(record.cells.voltages_v): return REJECTED`
    Therefore, `cells.voltages_v` **must** contain the positionally-mapped physical cells (length = `connected_count`, e.g., 10 floats for 10S), while the raw 16-channel frame can be kept in local diagnostics.

Create `lib/data/models/canonical_telemetry.dart` with:
* `CanonicalTelemetryRecord`:
  * `pack_serial`: `String` (resolved `EVR-...` serial, or fallback to BLE advertisement name `EVR036014-CFDFA8` if not yet linked).
  * `metadata`:
    * `source_type`: `"BLE_APP"`
    * `source_id`: Technician ID (e.g., `"tech_cairo_01"` or device UUID)
    * `bms_fw_version`: `metrics.bmsFirmwareVersion` (e.g., `"SWP10_V2.1.0"`)
    * `sequence_num`: `int` (from `SequenceManager`)
    * `timestamp_utc`: `metrics.lastUpdate.toUtc().toIso8601String()`
    * `buffered`: `bool` (`false` when created live, updated to `true` if replayed from offline SQLite queue after a failed/offline attempt)
  * `location`: (`null` if GPS unavailable, otherwise):
    * `latitude`: `double`
    * `longitude`: `double`
    * `source`: `"PHONE_GPS"`
    * `accuracy_m`: `double?`
  * `electrical`:
    * `pack_voltage_v`: `metrics.stackVoltage` (or `packVoltage` if `stackVoltage == 0`)
    * `pack_current_a`: `metrics.packCurrent` (**negative = discharge, positive = charge**)
    * `soc_pct`: `metrics.socPct.clamp(0.0, 100.0)`
    * `soh_pct`: `null` (computed by cloud physics engine)
    * `state`: `metrics.canonicalBmsState`
    * `lifetime_energy_kwh`: `metrics.lifetimeEnergyWh / 1000.0`
    * `rated_capacity_ah`: `metrics.totalCapacityAh > 0 ? metrics.totalCapacityAh : null`
  * `cells`:
    * `connected_count`: `metrics.validConnectedCells`
    * `voltages_v`: `metrics.mappedPhysicalCellVoltages`
    * `min_voltage_v`: `metrics.mappedMinCellVoltage`
    * `max_voltage_v`: `metrics.mappedMaxCellVoltage`
    * `avg_voltage_v`: `metrics.mappedAvgCellVoltage`
    * `imbalance_mv`: `metrics.imbalanceMv`
    * `weakest_cell_index`: `metrics.weakestCellIndex`
  * `thermal`:
    * `cell_temperatures_c`: `metrics.cellTemps`
    * `max_cell_temp_c`: `metrics.cellTempMax`
    * `mosfet_temp_c`: `metrics.mosfetTemp`
    * `internal_chip_temp_c`: `null`
  * `status_and_faults`:
    * `bms_state_code`: `metrics.bmsState`
    * `balancing_active`: `metrics.balancingStatus != 0`
    * `charge_fet_enabled`: `metrics.chgFetStatus`
    * `discharge_fet_enabled`: `metrics.dsgFetStatus`
    * `raw_fault_flags`: `metrics.errorFlags`
    * `active_alarms`: `metrics.activeErrors`
  * `module`: `null` (always `null` for `BLE_APP`)

---

### Phase D: Location & Permissions Upgrade (Checklist M1 & M2)

#### 1. `lib/data/services/permission_service.dart` `[MODIFY]`
* **Why:** Currently, lines 22–38 only request `bluetoothScan` and `bluetoothConnect` on Android 12+ (`sdkInt >= 31`), skipping location permission completely. Without location permission, the app cannot capture `PHONE_GPS` coordinates (`FR-1.4`, `FR-1.5`).
* **Changes:**
  * On Android 12+ (`sdkInt >= 31`), continue requesting `bluetoothScan` + `bluetoothConnect` as mandatory for BLE, and **also** request `Permission.locationWhenInUse` for GPS telemetry tagging.

#### 2. `lib/data/services/location_service.dart` `[NEW]`
* Uses `geolocator` (already in `pubspec.yaml`) to:
  * Maintain a cached `Position? _lastKnownPosition` updated every 15–30 seconds while connected to a BMS.
  * Expose `Future<TelemetryLocation?> getCurrentTelemetryLocation()` returning `{latitude, longitude, source: "PHONE_GPS", accuracy_m}`.

---

### Phase E: SQLite Offline Queue & Per-Pack Sequence Number (Checklist M2 — FR-1.5)

#### 1. `lib/data/local/app_database.dart` `[NEW]`
Create a local SQLite database (`evraid_telemetry.db`) with 3 tables:

```sql
-- 1. Monotonically increasing sequence number per pack (survives app restarts)
CREATE TABLE pack_sequences (
    pack_serial TEXT PRIMARY KEY,
    last_sequence_num INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
);

-- 2. Offline telemetry queue (persisted until server ACK)
CREATE TABLE telemetry_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pack_serial TEXT NOT NULL,
    sequence_num INTEGER NOT NULL,
    timestamp_utc TEXT NOT NULL,
    payload_json TEXT NOT NULL,      -- Serialized CanonicalTelemetryRecord
    raw_frame TEXT,                  -- Untouched raw BMS JSON string for debugging
    sync_attempts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, IN_FLIGHT, REJECTED
    last_error TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(pack_serial, sequence_num)
);

-- 3. Local cache mapping BLE Advertisement Name (EVR036014-CFDFA8) -> Pack Serial (EVR-C036014-...)
CREATE TABLE pack_registry_cache (
    ble_adv_name TEXT PRIMARY KEY,
    pack_serial TEXT NOT NULL,
    model_code TEXT,
    updated_at TEXT NOT NULL
);
```

#### 2. `lib/data/local/sequence_manager.dart` `[NEW]`
* **Checklist Item:** *a per-pack persisted `sequence_num`*.
* Provides `Future<int> nextSequenceNumber(String packSerial)` using an atomic SQLite transaction (`INSERT OR IGNORE` + `UPDATE pack_sequences SET last_sequence_num = last_sequence_num + 1`) so sequence numbers never collide or reset across app restarts.

#### 3. `lib/data/services/telemetry_queue_service.dart` `[NEW]`
* Listens to `BleService.metricsStream`.
* Applies smart sampling so SQLite isn't spammed at 2 Hz:
  * Enqueues a record **immediately** on first connection, **immediately** if `errorFlags` or `activeErrors` change, or every **30 seconds** during normal operation.
* Fetches the next `sequence_num` from `SequenceManager`, attaches `LocationService` GPS coordinates, builds `CanonicalTelemetryRecord`, and inserts into `telemetry_queue`.

---

### Phase F: Background Batch Sync Service (Checklist M1 & M2 — FR-1.5)

#### 1. `lib/core/config/api_config.dart` `[NEW]`
* Configurable `baseUrl` (defaulting to staging/production `evraid_cloud` endpoint, overridable in Settings for local dev testing e.g. `http://10.0.2.2:8000` or LAN IP).
* Endpoint: `POST /v1/telemetry/batch`.
* Batch size limit: `maxBatchSize = 200` (backend supports up to `500` per `TelemetryBatchIngestRequest`).

#### 2. `lib/data/services/cloud_sync_service.dart` `[NEW]`
* **Checklist Item:** *Background batch sync over HTTPS. Keep local records until the server ACKs (HTTP 200/201 with per-item results).*
* **Workflow:**
  1. Triggered periodically (every 30s), when connectivity changes to online (`connectivity_plus`), or manually from the UI.
  2. Queries up to 200 `PENDING` rows from `telemetry_queue` ordered by `timestamp_utc ASC, sequence_num ASC`.
  3. For any row where `sync_attempts > 0` (or age > 60 seconds), sets `metadata.buffered = true` inside the JSON payload before sending (satisfying Checklist M1 `buffered` requirement).
  4. Sends `POST /v1/telemetry/batch` with `{"records": [...]}` and `Authorization: Bearer <token>`.
  5. Parses `TelemetryBatchIngestResponse`:
     * Loops over `response.results` (`pack_serial`, `sequence_num`, `status`, `message`):
     * If `status == "ACCEPTED"` or `status == "DUPLICATE"`: **DELETE** the row from `telemetry_queue`.
     * If `status == "REJECTED"`: mark row `status = 'REJECTED'` with `last_error = result.message` so it doesn't block the queue forever, while keeping it inspectable for support.
  6. On network timeout / HTTP 5xx: increment `sync_attempts` and keep `status = 'PENDING'` for exponential backoff retry.

---

### Phase G: UI & Screen Modifications (`lib/features/`)

#### 1. `lib/features/scanner/view/scanner_screen.dart` `[MODIFY]`
* **Line 52:** Replace:
  ```dart
  if (result.device.platformName.toLowerCase().contains(BleConfig.deviceNameFilter) ...
  ```
  with prefix filter per Checklist M2:
  ```dart
  if (result.device.platformName.toUpperCase().startsWith(BleConfig.deviceNamePrefix) ...
  ```
* Add an option/dialog to bind or scan the pack's QR code (`EVR-C036014-...`) when connecting to a new `EVR*` BLE device if its `pack_serial` is not yet cached in `pack_registry_cache`.

#### 2. `lib/features/dashboard/view/dashboard_screen.dart` `[MODIFY]`
* **AppBar Status Bar (lines 65–91):** Add a compact **Cloud Sync Badge** next to the Bluetooth status showing:
  * Green cloud icon: `Synced (0 pending)`
  * Amber cloud icon: `Buffered (N pending)` when offline
  * Syncing spinner when uploading a batch
* **Cell Voltage Grid (`_CellVoltageGridBars`, lines 528–577):** Refactor `_getIndices()` to use the centralized positional `cell_channel_map` from `BleConfig` / `BatteryMetrics.mappedPhysicalCellVoltages`, and highlight the `weakestCellIndex` (in orange/red border) to match the Cloud Dashboard Pack Detail view (Checklist M3/M4).

#### 3. `lib/features/settings/view/settings_screen.dart` `[MODIFY]`
* Add a **Cloud & Technician Sync** section:
  * **Technician ID (`source_id`)**: Text field / profile display (e.g., `tech_cairo_04`).
  * **Offline Queue Status**: Shows `Pending Records: X`, `Last Sync: HH:MM:SS`, and a **"Sync Now"** button.
  * **Cloud API Endpoint**: Allows switching between Production, Staging, and Local Dev (`http://<ip>:8000`) during bench/field validation.

---

## 4. Verification & Acceptance Criteria (Checklist Alignment)

| Test Case | Expected Behavior | Checklist Reference |
|---|---|---|
| **1. `EVR*` Prefix Scan** | Only BLE devices whose advertisement name starts with `EVR` appear in `ScannerScreen`. | M2 — FR-1.5 |
| **2. 10S Positional Mapping** | A 10S BMS sending 16 channels (`[3.99, ..., 0.0, 4.005]`) produces `connected_count: 10` and 10 mapped voltages (`[ch1..ch9, ch16]`). Backend returns `ACCEPTED`. | M1 / M2 Dynamic Parser |
| **3. Sense Fault Preservation** | If mapped channel 3 reads `0.1 V`, it is **not** filtered out; all 10 cells are sent to `/v1/telemetry/batch` and backend raises `CRITICAL: SENSE_FAULT`. | M2 Line 80 |
| **4. Offline Queue & Replay** | Turn on Airplane Mode (with Bluetooth ON), collect 10 BMS samples. SQLite stores 10 rows with sequential `sequence_num`. Re-enable Wi-Fi/4G $\rightarrow$ batch uploads with `buffered: true` $\rightarrow$ SQLite queue clears to `0` after HTTP 200 ACK. | M2 — FR-1.5 & M5 Validation |
| **5. Idempotent Deduplication** | Resending the same `(pack_serial, sequence_num)` returns `DUPLICATE` from backend and the app safely removes it from SQLite. | M2 Line 60 & 70 |

