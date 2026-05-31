-- Migration: Add stock reservation system to prevent race conditions and overselling

-- Create stock reservations table
CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(order_id, product_id, size)
);

-- Index for fast expiry lookups
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires_active
  ON stock_reservations(expires_at)
  WHERE status = 'active';

-- Index for product lookups
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product
  ON stock_reservations(product_id, size);

-- Function: Atomically reserve stock for an order
CREATE OR REPLACE FUNCTION reserve_stock(
  p_order_id TEXT,
  p_product_id TEXT,
  p_size TEXT,
  p_quantity INTEGER,
  p_expires_at TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_available INTEGER;
  v_reserved INTEGER;
BEGIN
  -- Lock the product row
  SELECT COALESCE((stock->>p_size)::int, 0)
  INTO v_available
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  -- Calculate already reserved stock
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_reserved
  FROM stock_reservations
  WHERE product_id = p_product_id
    AND size = p_size
    AND status = 'active';

  IF v_available - v_reserved < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'available', v_available - v_reserved,
      'message', 'Insufficient stock after reservations'
    );
  END IF;

  INSERT INTO stock_reservations (order_id, product_id, size, quantity, expires_at)
  VALUES (p_order_id, p_product_id, p_size, p_quantity, p_expires_at)
  ON CONFLICT (order_id, product_id, size)
  DO UPDATE SET
    quantity = p_quantity,
    expires_at = p_expires_at,
    status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'reserved', p_quantity,
    'available_after', v_available - v_reserved - p_quantity
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Convert reservation to actual stock reduction
CREATE OR REPLACE FUNCTION convert_reservation(
  p_order_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_reservation RECORD;
  v_current_stock INTEGER;
BEGIN
  FOR v_reservation IN
    SELECT * FROM stock_reservations
    WHERE order_id = p_order_id AND status = 'active'
    FOR UPDATE
  LOOP
    -- Get current product stock
    SELECT COALESCE((stock->>v_reservation.size)::int, 0)
    INTO v_current_stock
    FROM products
    WHERE id = v_reservation.product_id
    FOR UPDATE;

    IF v_current_stock < v_reservation.quantity THEN
      -- Not enough stock — mark as expired and return failure
      UPDATE stock_reservations
      SET status = 'expired'
      WHERE id = v_reservation.id;

      RETURN jsonb_build_object(
        'success', false,
        'message', 'Reservation expired or stock unavailable',
        'product_id', v_reservation.product_id,
        'size', v_reservation.size,
        'requested', v_reservation.quantity,
        'available', v_current_stock
      );
    END IF;

    -- Reduce product stock
    UPDATE products
    SET stock = jsonb_set(
      stock,
      array[v_reservation.size],
      to_jsonb(v_current_stock - v_reservation.quantity)
    )
    WHERE id = v_reservation.product_id;

    -- Mark reservation as converted
    UPDATE stock_reservations
    SET status = 'converted'
    WHERE id = v_reservation.id;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'message', 'All reservations converted');
END;
$$ LANGUAGE plpgsql;

-- Function: Release (cancel) reservations for an order
CREATE OR REPLACE FUNCTION release_reservation(
  p_order_id TEXT
) RETURNS JSONB AS $$
BEGIN
  UPDATE stock_reservations
  SET status = 'released'
  WHERE order_id = p_order_id AND status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'released', (SELECT COUNT(*) FROM stock_reservations WHERE order_id = p_order_id AND status = 'released')
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Release expired reservations
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE stock_reservations
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get available stock accounting for reservations
CREATE OR REPLACE FUNCTION available_stock(
  p_product_id TEXT,
  p_size TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
  v_reserved INTEGER;
BEGIN
  SELECT COALESCE((stock->>p_size)::int, 0)
  INTO v_total
  FROM products
  WHERE id = p_product_id;

  SELECT COALESCE(SUM(quantity), 0)
  INTO v_reserved
  FROM stock_reservations
  WHERE product_id = p_product_id
    AND size = p_size
    AND status = 'active';

  RETURN GREATEST(v_total - v_reserved, 0);
END;
$$ LANGUAGE plpgsql;
