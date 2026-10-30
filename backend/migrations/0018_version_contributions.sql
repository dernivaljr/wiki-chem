CREATE TABLE version_contributions (
  version_id BIGINT UNSIGNED NOT NULL,
  contributor_id BIGINT UNSIGNED NOT NULL,
  contribution_role ENUM('AUTHOR', 'CURATOR') NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  PRIMARY KEY (version_id, contributor_id, contribution_role),
  KEY contributor_versions (contributor_id, version_id),
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (contributor_id) REFERENCES contributors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
