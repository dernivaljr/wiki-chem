CREATE TABLE cart_items (
  cart_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  methodology_id BIGINT UNSIGNED NOT NULL,
  observed_price_id BIGINT UNSIGNED NOT NULL,
  observed_version_id BIGINT UNSIGNED NOT NULL,
  observed_offer_revision INT UNSIGNED NOT NULL,
  title_snapshot VARCHAR(200) NOT NULL,
  version_label_snapshot VARCHAR(40) NOT NULL,
  added_at DATETIME(6) NOT NULL,
  PRIMARY KEY (cart_id, product_id),
  KEY cart_product (product_id, cart_id),
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE RESTRICT,
  FOREIGN KEY (methodology_id, product_id) REFERENCES products(methodology_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (methodology_id, observed_version_id) REFERENCES methodology_versions(methodology_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id, observed_price_id) REFERENCES product_prices(product_id, id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
