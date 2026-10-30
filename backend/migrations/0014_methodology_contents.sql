CREATE TABLE methodology_contents (
  version_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  full_description MEDIUMTEXT NOT NULL,
  full_procedure MEDIUMTEXT NOT NULL,
  content_format ENUM('PLAIN_TEXT') NOT NULL DEFAULT 'PLAIN_TEXT',
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
