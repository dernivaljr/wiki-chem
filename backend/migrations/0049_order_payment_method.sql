ALTER TABLE orders
  ADD COLUMN payment_method ENUM('PIX','CREDIT_CARD','BOLETO') NULL AFTER currency,
  ADD CONSTRAINT valid_order_payment_method CHECK (
    status = 'COMPLETED_SIMULATED' OR payment_method IS NULL
  );
