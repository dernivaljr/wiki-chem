CREATE TRIGGER order_item_snapshot_insert BEFORE INSERT ON order_items FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM orders o JOIN product_prices pp ON pp.product_id = NEW.product_id AND pp.id = NEW.price_id
    WHERE o.id = NEW.order_id AND o.user_id = NEW.user_id AND o.status = 'PENDING_CONFIRMATION'
      AND pp.amount_centavos = NEW.unit_amount_centavos AND pp.currency = o.currency AND NEW.quantity = 1
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VALID_PENDING_SNAPSHOT_REQUIRED'; END IF;
END;
