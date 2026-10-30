CREATE TABLE entitlements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  methodology_id BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NOT NULL,
  status ENUM('ACTIVE','REVOKED') NOT NULL DEFAULT 'ACTIVE',
  granted_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6) NULL,
  reason VARCHAR(1000) NULL,
  UNIQUE KEY entitlement_user_methodology (user_id, methodology_id),
  UNIQUE KEY entitlement_origin (order_item_id),
  FOREIGN KEY (order_item_id, user_id, methodology_id) REFERENCES order_items(id, user_id, methodology_id) ON DELETE RESTRICT,
  CONSTRAINT valid_entitlement_state CHECK ((status = 'ACTIVE' AND revoked_at IS NULL AND reason IS NULL) OR (status = 'REVOKED' AND revoked_at IS NOT NULL AND reason IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
