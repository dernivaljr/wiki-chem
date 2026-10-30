CREATE TRIGGER entitlement_identity BEFORE UPDATE ON entitlements FOR EACH ROW
BEGIN
  IF NOT (NEW.id <=> OLD.id AND NEW.user_id <=> OLD.user_id AND NEW.methodology_id <=> OLD.methodology_id AND
    NEW.order_item_id <=> OLD.order_item_id AND NEW.granted_at <=> OLD.granted_at)
  THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'IMMUTABLE_ENTITLEMENT_ORIGIN'; END IF;
END;
