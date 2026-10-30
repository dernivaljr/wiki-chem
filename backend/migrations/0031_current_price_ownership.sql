ALTER TABLE products ADD CONSTRAINT product_current_price_fk FOREIGN KEY (id, current_price_id) REFERENCES product_prices(product_id, id) ON DELETE RESTRICT;
