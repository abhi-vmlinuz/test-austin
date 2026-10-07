-- Catch2Export schema. Field names follow PROMPT sections 35-39.
CREATE DATABASE IF NOT EXISTS catch2export CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE catch2export;

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN','SOURCE_OPERATOR','PROCESSOR','QUALITY_INSPECTOR','EXPORTER','IMPORTER') NOT NULL,
  phone VARCHAR(40) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vessels (
  vessel_id INT AUTO_INCREMENT PRIMARY KEY,
  vessel_name VARCHAR(150) NOT NULL,
  registration_number VARCHAR(100) NULL UNIQUE,
  owner_name VARCHAR(150) NULL,
  contact_number VARCHAR(40) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS harbours (
  harbour_id INT AUTO_INCREMENT PRIMARY KEY,
  harbour_name VARCHAR(150) NOT NULL,
  location VARCHAR(190) NULL,
  district VARCHAR(120) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS landings (
  landing_id INT AUTO_INCREMENT PRIMARY KEY,
  vessel_id INT NULL,
  harbour_id INT NULL,
  landing_date DATE NULL,
  landing_time TIME NULL,
  total_quantity DECIMAL(10,2) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'RECORDED',
  recorded_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vessel_id) REFERENCES vessels(vessel_id),
  FOREIGN KEY (harbour_id) REFERENCES harbours(harbour_id),
  FOREIGN KEY (recorded_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS landing_items (
  landing_item_id INT AUTO_INCREMENT PRIMARY KEY,
  landing_id INT NOT NULL,
  species VARCHAR(120) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  FOREIGN KEY (landing_id) REFERENCES landings(landing_id) ON DELETE CASCADE,
  INDEX idx_landing_items_species (species)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS raw_batches (
  raw_batch_id INT AUTO_INCREMENT PRIMARY KEY,
  landing_item_id INT NULL,
  batch_code VARCHAR(60) NOT NULL UNIQUE,
  species VARCHAR(120) NOT NULL,
  original_quantity DECIMAL(10,2) NOT NULL,
  remaining_quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  status ENUM('CREATED','AVAILABLE','PROCESSING','PROCESSED','EXHAUSTED','REJECTED') NOT NULL DEFAULT 'AVAILABLE',
  vessel_id INT NULL,
  harbour_id INT NULL,
  landing_date DATE NULL,
  notes TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (landing_item_id) REFERENCES landing_items(landing_item_id),
  FOREIGN KEY (vessel_id) REFERENCES vessels(vessel_id),
  FOREIGN KEY (harbour_id) REFERENCES harbours(harbour_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id),
  INDEX idx_raw_species (species),
  INDEX idx_raw_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS processing_records (
  processing_id INT AUTO_INCREMENT PRIMARY KEY,
  raw_batch_id INT NOT NULL,
  processor_id INT NULL,
  processing_type VARCHAR(190) NOT NULL,
  input_quantity DECIMAL(10,2) NOT NULL,
  output_quantity DECIMAL(10,2) NOT NULL,
  waste_quantity DECIMAL(10,2) NOT NULL,
  start_time DATETIME NULL,
  end_time DATETIME NULL,
  status ENUM('IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
  remarks TEXT NULL,
  FOREIGN KEY (raw_batch_id) REFERENCES raw_batches(raw_batch_id),
  FOREIGN KEY (processor_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS processing_groups (
  processing_group_id INT AUTO_INCREMENT PRIMARY KEY,
  processing_id INT NOT NULL,
  processing_group_code VARCHAR(60) NOT NULL UNIQUE,
  species VARCHAR(120) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  status ENUM('WAITING_FOR_QUALITY','INSPECTED','SPLIT') NOT NULL DEFAULT 'WAITING_FOR_QUALITY',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (processing_id) REFERENCES processing_records(processing_id),
  INDEX idx_pg_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quality_inspections (
  inspection_id INT AUTO_INCREMENT PRIMARY KEY,
  processing_group_id INT NOT NULL,
  inspector_id INT NULL,
  inspection_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  temperature DECIMAL(5,2) NULL,
  appearance_score DECIMAL(3,1) NULL,
  odour_score DECIMAL(3,1) NULL,
  texture_score DECIMAL(3,1) NULL,
  size_score DECIMAL(3,1) NULL,
  processing_score DECIMAL(3,1) NULL,
  packaging_score DECIMAL(3,1) NULL,
  quality_score DECIMAL(3,1) NULL,
  remarks TEXT NULL,
  FOREIGN KEY (processing_group_id) REFERENCES processing_groups(processing_group_id),
  FOREIGN KEY (inspector_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quality_results (
  quality_result_id INT AUTO_INCREMENT PRIMARY KEY,
  inspection_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  quality_score DECIMAL(3,1) NOT NULL,
  result ENUM('USABLE','NON_USABLE') NOT NULL,
  remarks TEXT NULL,
  FOREIGN KEY (inspection_id) REFERENCES quality_inspections(inspection_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_groups (
  inventory_group_id INT AUTO_INCREMENT PRIMARY KEY,
  processing_group_id INT NOT NULL,
  quality_result_id INT NULL,
  inventory_group_code VARCHAR(60) NOT NULL UNIQUE,
  species VARCHAR(120) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  quality_score DECIMAL(3,1) NOT NULL,
  reserved_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  consumed_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  available_quantity DECIMAL(10,2) NOT NULL,
  status ENUM('AVAILABLE','PARTIALLY_RESERVED','RESERVED','NON_USABLE','EXHAUSTED') NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (processing_group_id) REFERENCES processing_groups(processing_group_id),
  FOREIGN KEY (quality_result_id) REFERENCES quality_results(quality_result_id),
  INDEX idx_ig_species (species),
  INDEX idx_ig_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS storage_locations (
  storage_id INT AUTO_INCREMENT PRIMARY KEY,
  facility_name VARCHAR(190) NOT NULL,
  freezer_code VARCHAR(60) NOT NULL UNIQUE,
  temperature DECIMAL(5,2) NULL,
  capacity DECIMAL(10,2) NULL,
  current_occupancy DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS storage_history (
  storage_history_id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_group_id INT NOT NULL,
  storage_id INT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  entry_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMP NULL,
  temperature DECIMAL(5,2) NULL,
  remarks TEXT NULL,
  FOREIGN KEY (inventory_group_id) REFERENCES inventory_groups(inventory_group_id),
  FOREIGN KEY (storage_id) REFERENCES storage_locations(storage_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(60) NOT NULL UNIQUE,
  importer_id INT NULL,
  destination_country VARCHAR(120) NOT NULL,
  destination_address TEXT NULL,
  shipping_method ENUM('AIR','SEA') NOT NULL,
  required_date DATE NULL,
  status ENUM('PLACED','ACCEPTED','REJECTED','ALLOCATED','PACKED','SHIPPED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PLACED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (importer_id) REFERENCES users(user_id),
  INDEX idx_orders_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  species VARCHAR(120) NOT NULL,
  required_quantity DECIMAL(10,2) NOT NULL,
  minimum_quality_score DECIMAL(3,1) NOT NULL DEFAULT 6,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_allocations (
  allocation_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  order_item_id INT NOT NULL,
  inventory_group_id INT NOT NULL,
  allocated_quantity DECIMAL(10,2) NOT NULL,
  allocated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_group_id) REFERENCES inventory_groups(inventory_group_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS export_groups (
  export_group_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NULL,
  export_group_code VARCHAR(60) NOT NULL UNIQUE,
  species VARCHAR(120) NULL,
  total_quantity DECIMAL(10,2) NOT NULL,
  status ENUM('CREATED','PACKED','READY','SHIPPED','DELIVERED') NOT NULL DEFAULT 'CREATED',
  qr_code TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  INDEX idx_eg_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS export_group_items (
  export_group_item_id INT AUTO_INCREMENT PRIMARY KEY,
  export_group_id INT NOT NULL,
  inventory_group_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (export_group_id) REFERENCES export_groups(export_group_id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_group_id) REFERENCES inventory_groups(inventory_group_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS packages (
  package_id INT AUTO_INCREMENT PRIMARY KEY,
  export_group_id INT NOT NULL,
  package_number VARCHAR(60) NOT NULL UNIQUE,
  weight DECIMAL(10,2) NOT NULL,
  qr_code TEXT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'PACKED',
  FOREIGN KEY (export_group_id) REFERENCES export_groups(export_group_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shipments (
  shipment_id INT AUTO_INCREMENT PRIMARY KEY,
  export_group_id INT NOT NULL,
  shipping_method ENUM('AIR','SEA') NOT NULL,
  carrier VARCHAR(150) NULL,
  tracking_number VARCHAR(100) NULL UNIQUE,
  container_number VARCHAR(100) NULL,
  origin VARCHAR(150) NULL,
  destination VARCHAR(150) NULL,
  departure_date DATE NULL,
  estimated_arrival DATE NULL,
  actual_arrival DATE NULL,
  status ENUM('READY','DISPATCHED','IN_TRANSIT','ARRIVED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'READY',
  FOREIGN KEY (export_group_id) REFERENCES export_groups(export_group_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shipping_rules (
  shipping_rule_id INT AUTO_INCREMENT PRIMARY KEY,
  species VARCHAR(120) NULL,
  shipping_method ENUM('AIR','SEA') NOT NULL,
  destination_country VARCHAR(120) NULL,
  allowed TINYINT(1) NOT NULL DEFAULT 1,
  minimum_temperature DECIMAL(5,2) NULL,
  maximum_temperature DECIMAL(5,2) NULL,
  handling_requirement TEXT NULL,
  remarks TEXT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS export_documents (
  document_id INT AUTO_INCREMENT PRIMARY KEY,
  export_group_id INT NULL,
  document_type ENUM('Invoice','Packing List','Quality Report','Traceability Report','Shipping Document','Required Certificate','Other') NOT NULL DEFAULT 'Other',
  document_number VARCHAR(100) NULL,
  document_path VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'UPLOADED',
  uploaded_by INT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (export_group_id) REFERENCES export_groups(export_group_id),
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS decomposition_records (
  decomposition_id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_group_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255) NOT NULL DEFAULT 'Quality score below usable threshold',
  action VARCHAR(255) NOT NULL DEFAULT 'DECOMPOSITION',
  processed_by INT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remarks TEXT NULL,
  FOREIGN KEY (inventory_group_id) REFERENCES inventory_groups(inventory_group_id),
  FOREIGN KEY (processed_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NULL,
  entity_id VARCHAR(60) NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(60) NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB;
