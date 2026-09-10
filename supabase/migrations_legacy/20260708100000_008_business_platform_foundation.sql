/*
# Business Platform Foundation - Priority 1

Adds, without touching any existing table's meaning or removing any
existing column:
  1. CRM: leads, lead_notes, lead_reminders
  2. Quotation lifecycle upgrade: draft -> sent -> negotiating ->
     accepted/rejected -> converted, itemized quotation_items,
     numbering, PDF/email tracking columns
  3. Invoicing: invoices, invoice_items, payments
  4. Inventory upgrade: suppliers, purchase_orders,
     purchase_order_items, automatic stock deduction on order,
     automatic low-stock alerts, goods-received workflow
  5. Generic audit logging trigger, reusing the existing
     `activity_logs` table (no new logging table needed)

All new tables are back-office only: RLS restricts them to
`authenticated` (i.e. logged-in admin/staff), same security model as
migration 006. No public/anon access to any table in this migration.
*/

-- ============================================================
-- 1. CRM: Leads
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  source text DEFAULT 'manual', -- manual, website, referral, phone, walk-in
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiating', 'won', 'lost')),
  estimated_value decimal(12,2),
  lost_reason text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  converted_quotation_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  note text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_reminders_lead ON lead_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_reminders_due ON lead_reminders(due_at) WHERE completed = false;

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_access_leads" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_access_lead_notes" ON lead_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_access_lead_reminders" ON lead_reminders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Quotation lifecycle upgrade
-- ============================================================
-- Widen the status CHECK to include the new lifecycle stages while
-- keeping every existing value valid (no data migration needed).
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
ALTER TABLE quotations ADD CONSTRAINT quotations_status_check
  CHECK (status IN (
    'new', 'contacted', 'quoted', 'won', 'lost', -- legacy values, kept working
    'draft', 'sent', 'negotiating', 'accepted', 'rejected', 'converted'
  ));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'quotation_number') THEN
    ALTER TABLE quotations ADD COLUMN quotation_number text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'valid_until') THEN
    ALTER TABLE quotations ADD COLUMN valid_until date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'subtotal') THEN
    ALTER TABLE quotations ADD COLUMN subtotal decimal(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'tax_rate') THEN
    ALTER TABLE quotations ADD COLUMN tax_rate decimal(5,2) DEFAULT 16; -- Kenya VAT default
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'tax_amount') THEN
    ALTER TABLE quotations ADD COLUMN tax_amount decimal(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'total_amount') THEN
    ALTER TABLE quotations ADD COLUMN total_amount decimal(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'pdf_url') THEN
    ALTER TABLE quotations ADD COLUMN pdf_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'sent_at') THEN
    ALTER TABLE quotations ADD COLUMN sent_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'responded_at') THEN
    ALTER TABLE quotations ADD COLUMN responded_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'converted_order_id') THEN
    ALTER TABLE quotations ADD COLUMN converted_order_id uuid REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'lead_id') THEN
    ALTER TABLE quotations ADD COLUMN lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity decimal(12,2) NOT NULL DEFAULT 1,
  unit text DEFAULT 'sqm',
  unit_price decimal(12,2) NOT NULL DEFAULT 0,
  line_total decimal(12,2) NOT NULL DEFAULT 0,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_access_quotation_items" ON quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-generate a human-readable quotation number (Q-2026-0001)
CREATE SEQUENCE IF NOT EXISTS quotation_number_seq;
CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quotation_number IS NULL THEN
    NEW.quotation_number := 'Q-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quotation_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_quotation_number ON quotations;
CREATE TRIGGER trg_set_quotation_number BEFORE INSERT ON quotations
  FOR EACH ROW EXECUTE FUNCTION set_quotation_number();

-- ============================================================
-- 3. Invoicing
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  billing_address text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
  subtotal decimal(12,2) NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) DEFAULT 16,
  tax_amount decimal(12,2) NOT NULL DEFAULT 0,
  total_amount decimal(12,2) NOT NULL DEFAULT 0,
  amount_paid decimal(12,2) NOT NULL DEFAULT 0,
  due_date date,
  notes text,
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity decimal(12,2) NOT NULL DEFAULT 1,
  unit_price decimal(12,2) NOT NULL DEFAULT 0,
  line_total decimal(12,2) NOT NULL DEFAULT 0,
  display_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL,
  method text DEFAULT 'cash' CHECK (method IN ('cash', 'mpesa', 'bank_transfer', 'card', 'cheque', 'other')),
  reference text,
  paid_at timestamptz DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_access_invoices" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_access_invoice_items" ON invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_access_payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_invoice_number ON invoices;
CREATE TRIGGER trg_set_invoice_number BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

-- Keep invoices.amount_paid and status in sync whenever a payment is recorded
CREATE OR REPLACE FUNCTION recalc_invoice_payment_state()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_invoice_id uuid;
  v_total decimal(12,2);
  v_paid decimal(12,2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT total_amount INTO v_total FROM invoices WHERE id = v_invoice_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM payments WHERE invoice_id = v_invoice_id;

  UPDATE invoices
  SET amount_paid = v_paid,
      status = CASE
        WHEN status = 'cancelled' THEN 'cancelled'
        WHEN v_paid >= v_total AND v_total > 0 THEN 'paid'
        WHEN v_paid > 0 AND v_paid < v_total THEN 'partial'
        WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE AND v_paid < v_total THEN 'overdue'
        ELSE status
      END,
      updated_at = now()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_recalc_invoice_on_payment ON payments;
CREATE TRIGGER trg_recalc_invoice_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION recalc_invoice_payment_state();

-- ============================================================
-- 4. Inventory upgrade: suppliers, purchase orders, stock automation
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled')),
  expected_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity_ordered decimal(12,2) NOT NULL DEFAULT 0,
  quantity_received decimal(12,2) NOT NULL DEFAULT 0,
  unit_cost decimal(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_access_suppliers" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_access_purchase_orders" ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_access_po_items" ON purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS po_number_seq;
CREATE OR REPLACE FUNCTION set_po_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.po_number IS NULL THEN
    NEW.po_number := 'PO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('po_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_po_number ON purchase_orders;
CREATE TRIGGER trg_set_po_number BEFORE INSERT ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_po_number();

-- Goods-received workflow: whenever quantity_received increases on a PO
-- line, add that quantity into stock via inventory_movements (single
-- source of truth for stock changes), and mark the PO received/partial.
CREATE OR REPLACE FUNCTION apply_goods_received()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_delta decimal(12,2);
  v_total_ordered decimal(12,2);
  v_total_received decimal(12,2);
  v_po_id uuid;
  v_prev_stock integer;
  v_new_stock integer;
BEGIN
  v_delta := NEW.quantity_received - COALESCE(OLD.quantity_received, 0);

  IF v_delta > 0 AND NEW.product_id IS NOT NULL THEN
    SELECT stock_quantity INTO v_prev_stock FROM products WHERE id = NEW.product_id;
    v_new_stock := COALESCE(v_prev_stock, 0) + v_delta::integer;

    UPDATE products SET stock_quantity = v_new_stock WHERE id = NEW.product_id;

    INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes)
    VALUES (NEW.product_id, 'in', v_delta::integer, v_prev_stock, v_new_stock, 'purchase_order', NEW.purchase_order_id::text, 'Goods received');
  END IF;

  v_po_id := NEW.purchase_order_id;
  SELECT COALESCE(SUM(quantity_ordered), 0), COALESCE(SUM(quantity_received), 0)
    INTO v_total_ordered, v_total_received
    FROM purchase_order_items WHERE purchase_order_id = v_po_id;

  UPDATE purchase_orders
  SET status = CASE
        WHEN v_total_received <= 0 THEN status
        WHEN v_total_received >= v_total_ordered THEN 'received'
        ELSE 'partial'
      END,
      updated_at = now()
  WHERE id = v_po_id AND status NOT IN ('cancelled');

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_apply_goods_received ON purchase_order_items;
CREATE TRIGGER trg_apply_goods_received
  AFTER UPDATE OF quantity_received ON purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION apply_goods_received();

-- Stock deduction workflow: whenever an order_item is inserted, deduct
-- stock and log the movement + raise a low-stock alert if needed.
CREATE OR REPLACE FUNCTION deduct_stock_on_order()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_prev_stock integer;
  v_new_stock integer;
  v_threshold integer;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT stock_quantity, low_stock_threshold INTO v_prev_stock, v_threshold
  FROM products WHERE id = NEW.product_id;

  v_new_stock := GREATEST(COALESCE(v_prev_stock, 0) - NEW.quantity, 0);

  UPDATE products SET stock_quantity = v_new_stock WHERE id = NEW.product_id;

  INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes)
  VALUES (NEW.product_id, 'out', NEW.quantity, v_prev_stock, v_new_stock, 'order', NEW.order_id::text, 'Order fulfilment');

  IF v_threshold IS NOT NULL AND v_new_stock <= v_threshold THEN
    IF NOT EXISTS (
      SELECT 1 FROM inventory_alerts
      WHERE product_id = NEW.product_id AND alert_type = 'low_stock' AND is_resolved = false
    ) THEN
      INSERT INTO inventory_alerts (product_id, alert_type, threshold, current_stock, is_resolved)
      VALUES (NEW.product_id, 'low_stock', v_threshold, v_new_stock, false);
    ELSE
      UPDATE inventory_alerts SET current_stock = v_new_stock
      WHERE product_id = NEW.product_id AND alert_type = 'low_stock' AND is_resolved = false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_deduct_stock_on_order ON order_items;
CREATE TRIGGER trg_deduct_stock_on_order
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION deduct_stock_on_order();

-- ============================================================
-- 5. Generic audit logging (reuses existing activity_logs table)
-- ============================================================
CREATE OR REPLACE FUNCTION audit_log_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_action text;
  v_entity_id text;
  v_details jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_entity_id := NEW.id::text;
    v_details := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_entity_id := NEW.id::text;
    v_details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_action := 'delete';
    v_entity_id := OLD.id::text;
    v_details := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  INSERT INTO activity_logs (action, entity_type, entity_id, details)
  VALUES (v_action, TG_TABLE_NAME, v_entity_id, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['leads', 'quotations', 'invoices', 'purchase_orders', 'orders']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON %I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_log_change();',
      t, t
    );
  END LOOP;
END $$;

-- activity_logs itself: staff-only read (nothing should ever write to it
-- directly other than the trigger, which runs as SECURITY DEFINER)
DROP POLICY IF EXISTS "admin_access_logs" ON activity_logs;
CREATE POLICY "staff_read_logs" ON activity_logs FOR SELECT TO authenticated USING (true);
