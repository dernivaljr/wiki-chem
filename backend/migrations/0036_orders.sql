CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING_CONFIRMATION','COMPLETED_SIMULATED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  mode ENUM('SIMULATED') NOT NULL,
  currency CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  total_centavos BIGINT UNSIGNED NOT NULL,
  cart_revision_snapshot INT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  completed_at DATETIME(6) NULL,
  cancelled_at DATETIME(6) NULL,
  UNIQUE KEY order_owner (id, user_id),
  KEY orders_user_time (user_id, created_at, id),
  CONSTRAINT valid_order_total CHECK (total_centavos BETWEEN 1 AND 9223372036854775807 AND currency = 'BRL'),
  CONSTRAINT valid_order_expiry CHECK (expires_at > created_at),
  CONSTRAINT valid_order_state CHECK (
    (status IN ('PENDING_CONFIRMATION','EXPIRED') AND completed_at IS NULL AND cancelled_at IS NULL) OR
    (status = 'COMPLETED_SIMULATED' AND completed_at IS NOT NULL AND cancelled_at IS NULL) OR
    (status = 'CANCELLED' AND completed_at IS NULL AND cancelled_at IS NOT NULL)
  ),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
