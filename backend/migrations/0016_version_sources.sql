CREATE TABLE version_sources (
  version_id BIGINT UNSIGNED NOT NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  locator VARCHAR(1000) NOT NULL,
  usage_conditions_snapshot TEXT NOT NULL,
  permission_status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  permission_evidence_ref VARCHAR(2000) NOT NULL DEFAULT '',
  checked_by BIGINT UNSIGNED NULL,
  checked_at DATETIME(6) NULL,
  PRIMARY KEY (version_id, source_id),
  KEY source_versions (source_id, version_id),
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE RESTRICT,
  FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (permission_status <> 'APPROVED' OR (checked_by IS NOT NULL AND checked_at IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
