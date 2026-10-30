CREATE TABLE products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  methodology_id BIGINT UNSIGNED NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  current_price_id BIGINT UNSIGNED NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY product_methodology (methodology_id),
  UNIQUE KEY product_owner (methodology_id, id),
  FOREIGN KEY (methodology_id) REFERENCES methodologies(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
