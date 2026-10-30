CREATE TABLE version_equipment (
  version_id BIGINT UNSIGNED NOT NULL,
  equipment_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (version_id, equipment_id),
  KEY equipment_versions (equipment_id, version_id),
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
