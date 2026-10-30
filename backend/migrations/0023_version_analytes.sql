CREATE TABLE version_analytes (
  version_id BIGINT UNSIGNED NOT NULL,
  analyte_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (version_id, analyte_id),
  KEY analytes_versions (analyte_id, version_id),
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (analyte_id) REFERENCES analytes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
