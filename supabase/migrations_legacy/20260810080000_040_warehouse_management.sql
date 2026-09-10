-- ============================================================
-- Warehouse Management
-- Adds multi-location stock tracking on top of the existing single
-- stock_quantity/inventory_movements system:
--   - warehouses: physical/logical storage locations
--   - warehouse_stock: per-warehouse quantity breakdown for a product
--   - stock_transfers: move stock between warehouses, logged as a
--     pair of inventory_movements (out of source, in to destination)
-- products.stock_quantity remains the single source of truth for
-- total stock (used across the storefront, cart, low-stock alerts).
-- warehouse_stock is an additive breakdown of where that stock lives.
-- ============================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  address text,
  phone text,
  manager_name text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warehouse_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (warehouse_id, product_id)
);

CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text UNIQUE,
  from_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  to_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_warehouses CHECK (from_warehouse_id IS DISTINCT FROM to_warehouse_id)
);

-- Movements can now optionally be tied to the warehouse they affected.
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product ON warehouse_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from ON stock_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to ON stock_transfers(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_product ON stock_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse ON inventory_movements(warehouse_id);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_access_warehouses" ON warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_access_warehouse_stock" ON warehouse_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_access_stock_transfers" ON stock_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-number transfers the same way purchase orders are numbered.
CREATE SEQUENCE IF NOT EXISTS transfer_number_seq;
CREATE OR REPLACE FUNCTION set_transfer_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.transfer_number IS NULL THEN
    NEW.transfer_number := 'TR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('transfer_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_transfer_number ON stock_transfers;
CREATE TRIGGER trg_set_transfer_number BEFORE INSERT ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION set_transfer_number();

-- Applying a transfer: move quantity from source warehouse_stock into
-- destination warehouse_stock and log a matching pair of
-- inventory_movements ('out' at source, 'in' at destination). Total
-- products.stock_quantity is unaffected - stock is only relocated.
CREATE OR REPLACE FUNCTION apply_stock_transfer()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_from_qty integer;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.from_warehouse_id IS NOT NULL THEN
    SELECT quantity INTO v_from_qty FROM warehouse_stock
      WHERE warehouse_id = NEW.from_warehouse_id AND product_id = NEW.product_id
      FOR UPDATE;

    IF COALESCE(v_from_qty, 0) < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock in source warehouse: have %, need %', COALESCE(v_from_qty, 0), NEW.quantity;
    END IF;

    UPDATE warehouse_stock SET quantity = quantity - NEW.quantity, updated_at = now()
      WHERE warehouse_id = NEW.from_warehouse_id AND product_id = NEW.product_id;

    INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes)
    VALUES (NEW.product_id, NEW.from_warehouse_id, 'out', NEW.quantity, v_from_qty, COALESCE(v_from_qty, 0) - NEW.quantity, 'stock_transfer', NEW.id::text, COALESCE(NEW.notes, 'Transfer ' || NEW.transfer_number));
  END IF;

  IF NEW.to_warehouse_id IS NOT NULL THEN
    INSERT INTO warehouse_stock (warehouse_id, product_id, quantity)
    VALUES (NEW.to_warehouse_id, NEW.product_id, NEW.quantity)
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at = now();

    INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes)
    SELECT NEW.product_id, NEW.to_warehouse_id, 'in', NEW.quantity, ws.quantity - NEW.quantity, ws.quantity, 'stock_transfer', NEW.id::text, COALESCE(NEW.notes, 'Transfer ' || NEW.transfer_number)
    FROM warehouse_stock ws WHERE ws.warehouse_id = NEW.to_warehouse_id AND ws.product_id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_apply_stock_transfer ON stock_transfers;
CREATE TRIGGER trg_apply_stock_transfer
  AFTER INSERT ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION apply_stock_transfer();

-- Seed a default warehouse and allocate all existing stock to it, so
-- the feature is immediately useful without a manual setup step.
INSERT INTO warehouses (name, code, is_default, is_active)
SELECT 'Main Warehouse', 'MAIN', true, true
WHERE NOT EXISTS (SELECT 1 FROM warehouses);

INSERT INTO warehouse_stock (warehouse_id, product_id, quantity)
SELECT w.id, p.id, COALESCE(p.stock_quantity, 0)
FROM products p
CROSS JOIN (SELECT id FROM warehouses WHERE is_default = true LIMIT 1) w
WHERE NOT EXISTS (
  SELECT 1 FROM warehouse_stock ws WHERE ws.warehouse_id = w.id AND ws.product_id = p.id
);
