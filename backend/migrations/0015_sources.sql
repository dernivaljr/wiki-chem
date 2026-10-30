CREATE TABLE sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reference_text TEXT NOT NULL,
  source_type ENUM('ORIGINAL', 'REFERENCE') NOT NULL,
  canonical_url VARCHAR(2000) NOT NULL DEFAULT '',
  owner_credit VARCHAR(300) NOT NULL,
  edition_label VARCHAR(120) NOT NULL DEFAULT '',
  UNIQUE KEY sources_identity (fingerprint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
