CREATE TABLE version_techniques (
  version_id BIGINT UNSIGNED NOT NULL,
  technique_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (version_id, technique_id),
  KEY techniques_versions (technique_id, version_id),
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (technique_id) REFERENCES techniques(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
