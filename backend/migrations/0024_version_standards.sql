CREATE TABLE version_standards (
  version_id BIGINT UNSIGNED NOT NULL,
  standard_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (version_id, standard_id),
  KEY standards_versions (standard_id, version_id),
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
