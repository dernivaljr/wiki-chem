CREATE TABLE version_matrices (
  version_id BIGINT UNSIGNED NOT NULL,
  matrix_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (version_id, matrix_id),
  KEY matrices_versions (matrix_id, version_id),
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (matrix_id) REFERENCES matrices(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
