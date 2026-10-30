CREATE TRIGGER immutable_order_update BEFORE UPDATE ON orders FOR EACH ROW
BEGIN
  IF OLD.status <> 'PENDING_CONFIRMATION' OR NOT (
    NEW.id <=> OLD.id AND NEW.user_id <=> OLD.user_id AND NEW.mode <=> OLD.mode AND NEW.currency <=> OLD.currency AND
    NEW.total_centavos <=> OLD.total_centavos AND NEW.cart_revision_snapshot <=> OLD.cart_revision_snapshot AND
    NEW.created_at <=> OLD.created_at AND NEW.expires_at <=> OLD.expires_at
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'IMMUTABLE_ORDER'; END IF;
END;
