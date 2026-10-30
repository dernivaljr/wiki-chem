CREATE TABLE version_technologies (
  version_id BIGINT UNSIGNED NOT NULL,
  technology_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (version_id, technology_id),
  KEY technologies_versions (technology_id, version_id),
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (technology_id) REFERENCES technologies(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
