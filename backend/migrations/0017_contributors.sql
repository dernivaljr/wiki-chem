CREATE TABLE contributors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  contributor_type ENUM('PERSON', 'ORGANIZATION') NOT NULL,
  reference VARCHAR(1000) NOT NULL DEFAULT '',
  linked_user_id BIGINT UNSIGNED NULL,
  UNIQUE KEY contributor_identity (fingerprint),
  FOREIGN KEY (linked_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
