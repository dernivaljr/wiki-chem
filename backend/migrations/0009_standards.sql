CREATE TABLE standards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(60) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  label VARCHAR(160) NOT NULL,
  normalized_label VARCHAR(160) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  issuer VARCHAR(120) NOT NULL,
  identifier VARCHAR(120) NOT NULL,
  edition_label VARCHAR(80) NOT NULL,
  verified_status ENUM('PENDING', 'VERIFIED') NOT NULL DEFAULT 'PENDING',
  UNIQUE KEY standard_edition (issuer, identifier, edition_label),
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY standards_code (code),
  KEY standards_label (active, normalized_label, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
