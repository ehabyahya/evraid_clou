-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(50) DEFAULT 'Egypt',
    subscription_tier VARCHAR(20) DEFAULT 'Basic',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Fleets Table
CREATE TABLE IF NOT EXISTS fleets (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    reporting_interval_in_use_s INT DEFAULT 30,
    reporting_interval_idle_s INT DEFAULT 900,
    alert_imbalance_threshold_mv DOUBLE PRECISION DEFAULT 100.0,
    soh_warning_threshold_pct DOUBLE PRECISION DEFAULT 80.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Battery Models Table
CREATE TABLE IF NOT EXISTS battery_models (
    id SERIAL PRIMARY KEY,
    model_code VARCHAR(50) UNIQUE NOT NULL,
    commercial_name VARCHAR(100) NOT NULL,
    chemistry VARCHAR(20) NOT NULL,
    nominal_voltage DOUBLE PRECISION NOT NULL,
    rated_capacity_ah DOUBLE PRECISION NOT NULL,
    series_count INT NOT NULL,
    parallel_count INT DEFAULT 1,
    cell_model VARCHAR(100),
    max_continuous_discharge_a DOUBLE PRECISION,
    lifetime_cycles_limit INT DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BMS Profiles Table
CREATE TABLE IF NOT EXISTS bms_profiles (
    id SERIAL PRIMARY KEY,
    bms_model_code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(100),
    channel_count INT NOT NULL,
    max_continuous_current_a DOUBLE PRECISION DEFAULT 30.0,
    interfaces VARCHAR(50) DEFAULT 'BLE+CAN+UART',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BMS Firmware Profiles Table
CREATE TABLE IF NOT EXISTS bms_firmware_profiles (
    id SERIAL PRIMARY KEY,
    firmware_version VARCHAR(50) UNIQUE NOT NULL,
    bms_profile_id INT REFERENCES bms_profiles(id),
    cell_channel_map INT[] NOT NULL,
    current_sign_convention VARCHAR(20) DEFAULT 'NEG_DISCHARGE',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Battery Packs Table
CREATE TABLE IF NOT EXISTS packs (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    ble_adv_name VARCHAR(100),
    model_id INT REFERENCES battery_models(id),
    fleet_id INT REFERENCES fleets(id),
    connectivity_mode VARCHAR(20) DEFAULT 'BLE_ONLY',
    warranty_start_date TIMESTAMPTZ,
    warranty_end_date TIMESTAMPTZ,
    lifetime_cycles_limit INT DEFAULT 500,
    commissioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packs_serial ON packs(serial_number);
CREATE INDEX IF NOT EXISTS idx_packs_ble_name ON packs(ble_adv_name);

-- 7. Raw Telemetry Table
CREATE TABLE IF NOT EXISTS raw_telemetry (
    id BIGSERIAL,
    pack_serial VARCHAR(100) NOT NULL,
    timestamp_utc TIMESTAMPTZ NOT NULL,
    sequence_num INT NOT NULL,
    source_type VARCHAR(20) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    bms_fw_version VARCHAR(50) NOT NULL,
    buffered BOOLEAN DEFAULT FALSE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_source VARCHAR(20),
    pack_voltage_v DOUBLE PRECISION NOT NULL,
    pack_current_a DOUBLE PRECISION NOT NULL,
    soc_pct DOUBLE PRECISION NOT NULL,
    soh_pct DOUBLE PRECISION,
    state VARCHAR(20) DEFAULT 'STANDBY',
    connected_cell_count INT NOT NULL,
    cell_voltages DOUBLE PRECISION[] NOT NULL,
    cell_min_v DOUBLE PRECISION NOT NULL,
    cell_max_v DOUBLE PRECISION NOT NULL,
    cell_avg_v DOUBLE PRECISION NOT NULL,
    cell_imbalance_mv DOUBLE PRECISION NOT NULL,
    weakest_cell_index INT NOT NULL,
    cell_temperatures_c DOUBLE PRECISION[] NOT NULL,
    max_cell_temp_c DOUBLE PRECISION NOT NULL,
    mosfet_temp_c DOUBLE PRECISION,
    raw_fault_flags INT DEFAULT 0,
    raw_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (timestamp_utc, pack_serial, sequence_num),
    CONSTRAINT uq_raw_telemetry_source_seq UNIQUE (timestamp_utc, pack_serial, source_id, sequence_num)
);

-- Convert raw_telemetry into a TimescaleDB Hypertable partitioned by timestamp_utc
SELECT create_hypertable('raw_telemetry', 'timestamp_utc', if_not_exists => TRUE);

-- TimescaleDB Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_telemetry_pack_time ON raw_telemetry (pack_serial, timestamp_utc DESC);

-- 8. Permanent Warranty Abuse Ledger Table
CREATE TABLE IF NOT EXISTS warranty_abuse_events (
    id BIGSERIAL PRIMARY KEY,
    pack_serial VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    peak_value DOUBLE PRECISION NOT NULL,
    threshold_value DOUBLE PRECISION NOT NULL,
    duration_seconds DOUBLE PRECISION DEFAULT 0.0,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    timestamp_utc TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abuse_pack ON warranty_abuse_events(pack_serial, timestamp_utc DESC);

-- 9. Seed Default Master Data
INSERT INTO customers (id, name, country, subscription_tier)
VALUES 
    (1, 'EVRaid Internal', 'Egypt', 'Enterprise'),
    (2, 'LOOP Mobility', 'Egypt', 'Pro'),
    (3, 'Rabbit Mobility', 'Egypt', 'Pro')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fleets (id, customer_id, name)
VALUES 
    (1, 1, 'UNASSIGNED_FLEET'),
    (2, 2, 'LOOP_DEFAULT_FLEET'),
    (3, 3, 'RABBIT_DEFAULT_FLEET')
ON CONFLICT (id) DO NOTHING;

INSERT INTO battery_models (model_code, commercial_name, chemistry, nominal_voltage, rated_capacity_ah, series_count, parallel_count, cell_model, max_continuous_discharge_a, lifetime_cycles_limit)
VALUES
    ('EVR036007', 'LADRIX Kick Scooter 36V 7.5Ah', 'NMC', 36.0, 7.5, 10, 3, 'Cylindrical 18650', 15.0, 500),
    ('EVR036014', 'LADRIX Kick Scooter 36V 14Ah', 'NMC', 36.0, 14.0, 10, 5, 'Tenpower INR18650-28HE (3C)', 25.0, 500),
    ('EVR0480015', 'LADRIX E-Mopeds 48V 15Ah', 'NMC', 48.0, 15.0, 13, 5, 'Cylindrical 21700', 30.0, 700),
    ('EVR0510105', 'LADRIX Golf Carts 51.2V 105Ah (48V Commercial)', 'LFP', 51.2, 105.0, 16, 1, 'Prismatic LiFePO4', 105.0, 3000)
ON CONFLICT (model_code) DO NOTHING;

INSERT INTO bms_profiles (bms_model_code, description, channel_count, max_continuous_current_a, interfaces)
VALUES
    ('EVRBMS-SM10S030A0C-BUO', 'EVRAID Smart BMS 10S (CAN/UART/BLE)', 16, 30.0, 'BLE+CAN+UART'),
    ('EVRBMS-SM16S060A0C-BUO', 'EVRAID Smart BMS 16S Heavy Duty (Golf Cart / Delivery)', 16, 60.0, 'BLE+Isolated CAN+UART')
ON CONFLICT (bms_model_code) DO NOTHING;

INSERT INTO bms_firmware_profiles (firmware_version, bms_profile_id, cell_channel_map, current_sign_convention, description)
VALUES
    ('SWP10_V2.1.0', 1, '{1,2,3,4,5,6,7,8,9,16}', 'NEG_DISCHARGE', 'Default production firmware for 10S NMC packs'),
    ('SWP16_V1.0.0', 2, '{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16}', 'NEG_DISCHARGE', 'Default production firmware for 16S LFP Golf Cart packs')
ON CONFLICT (firmware_version) DO NOTHING;

