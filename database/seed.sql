-- Catch2Export seed: demo users (password Password123!) + master data.
-- Full traceability demo chain (RAW-SHR-001 -> ORD-001) is built by backend/src/seed-demo.js.
USE catch2export;

INSERT INTO users (name, email, password_hash, role) VALUES
 ('Admin','admin@example.com','$2a$10$GemDpsrzFiSxJWKV0c1lReFcULYw7frMylvahTNenV80mydVRucGW','ADMIN'),
 ('Source Operator','source@example.com','$2a$10$GemDpsrzFiSxJWKV0c1lReFcULYw7frMylvahTNenV80mydVRucGW','SOURCE_OPERATOR'),
 ('Processor','processor@example.com','$2a$10$GemDpsrzFiSxJWKV0c1lReFcULYw7frMylvahTNenV80mydVRucGW','PROCESSOR'),
 ('Inspector','inspector@example.com','$2a$10$GemDpsrzFiSxJWKV0c1lReFcULYw7frMylvahTNenV80mydVRucGW','QUALITY_INSPECTOR'),
 ('Exporter','exporter@example.com','$2a$10$GemDpsrzFiSxJWKV0c1lReFcULYw7frMylvahTNenV80mydVRucGW','EXPORTER'),
 ('Importer','importer@example.com','$2a$10$GemDpsrzFiSxJWKV0c1lReFcULYw7frMylvahTNenV80mydVRucGW','IMPORTER')
ON DUPLICATE KEY UPDATE role = VALUES(role);

INSERT IGNORE INTO vessels (vessel_name, registration_number, owner_name)
VALUES ('Ocean Star','KL-07-1024','Kerala Fisheries');
INSERT IGNORE INTO harbours (harbour_name, location, district)
VALUES ('Kochi Harbour','Kochi','Ernakulam');
INSERT IGNORE INTO storage_locations (facility_name, freezer_code, temperature, capacity) VALUES
 ('Kerala Seafood Processing Centre','F-01',-18,2000),
 ('Kerala Seafood Processing Centre','F-02',-18,2000),
 ('Kerala Seafood Processing Centre','F-03',-18,2000);
INSERT IGNORE INTO shipping_rules (species, shipping_method, destination_country, allowed, handling_requirement) VALUES
 ('Shrimp','SEA','Germany',1,'Keep frozen at -18C'),
 ('Shrimp','AIR','Germany',1,'Cold chain required');
