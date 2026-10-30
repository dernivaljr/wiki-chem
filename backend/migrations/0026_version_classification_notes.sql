CREATE TABLE version_classification_notes (
  version_id BIGINT UNSIGNED NOT NULL,
  facet ENUM('techniques', 'technologies', 'equipment', 'matrices', 'analytes', 'standards', 'segments') NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  PRIMARY KEY (version_id, facet),
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
