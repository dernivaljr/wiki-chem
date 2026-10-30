CREATE TRIGGER entitlement_completed_order BEFORE INSERT ON entitlements FOR EACH ROW
BEGIN
  IF NEW.status <> 'ACTIVE' OR NOT EXISTS (
    SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id AND o.user_id = oi.user_id
    WHERE oi.id = NEW.order_item_id AND oi.user_id = NEW.user_id AND oi.methodology_id = NEW.methodology_id
      AND o.status = 'COMPLETED_SIMULATED' AND o.mode = 'SIMULATED'
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COMPLETED_ORDER_REQUIRED'; END IF;
END;
