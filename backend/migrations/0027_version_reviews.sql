CREATE TABLE version_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  version_id BIGINT UNSIGNED NOT NULL,
  reviewed_revision INT UNSIGNED NOT NULL,
  reviewed_by BIGINT UNSIGNED NOT NULL,
  reviewed_at DATETIME(6) NOT NULL,
  review_note TEXT NOT NULL,
  UNIQUE KEY version_review_once (version_id),
  FOREIGN KEY (version_id) REFERENCES methodology_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
