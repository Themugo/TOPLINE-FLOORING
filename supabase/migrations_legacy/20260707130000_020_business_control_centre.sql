-- Business Control Centre Schema Migration
-- This migration adds tables for lead management, CRM, services, projects, and inventory

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  preferred_contact_method TEXT DEFAULT 'phone', -- phone, email, whatsapp
  source TEXT, -- google, facebook, referral, walk-in, website, other
  interested_products TEXT[], -- array of product IDs
  interested_services TEXT[], -- array of service IDs
  budget_range TEXT, -- e.g., '10000-50000'
  project_location TEXT,
  project_address TEXT,
  lead_stage TEXT DEFAULT 'new', -- new, contacted, qualified, proposal, negotiation, won, lost, on_hold
  assigned_to UUID REFERENCES auth.users(id),
  follow_up_date DATE,
  follow_up_notes TEXT,
  outcome TEXT, -- won, lost, on_hold
  outcome_reason TEXT,
  communication_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  pricing_model TEXT, -- fixed, hourly, per_sqm, custom
  base_price DECIMAL(12,2),
  duration_hours DECIMAL(5,2),
  required_materials TEXT[], -- array of material IDs
  required_skills TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number TEXT UNIQUE,
  customer_id UUID REFERENCES customers(id),
  quotation_id UUID REFERENCES quotations(id),
  order_id UUID REFERENCES orders(id),
  project_manager UUID REFERENCES auth.users(id),
  project_name TEXT NOT NULL,
  project_address TEXT,
  project_type TEXT, -- installation, repair, maintenance, consultation
  status TEXT DEFAULT 'pending', -- pending, scheduled, in_progress, completed, cancelled
  start_date DATE,
  end_date DATE,
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),
  allocated_materials JSONB DEFAULT '[]'::jsonb,
  assigned_team JSONB DEFAULT '[]'::jsonb, -- array of {user_id, role}
  progress_percentage INTEGER DEFAULT 0,
  progress_notes TEXT,
  issues JSONB DEFAULT '[]'::jsonb,
  customer_approval BOOLEAN DEFAULT false,
  completion_date DATE,
  completion_notes TEXT,
  completion_photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Visits Table
CREATE TABLE IF NOT EXISTS site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  quotation_id UUID REFERENCES quotations(id),
  customer_id UUID REFERENCES customers(id),
  scheduled_date DATE,
  scheduled_time TIME,
  assigned_to UUID REFERENCES auth.users(id),
  visit_type TEXT, -- survey, measurement, inspection, follow-up
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, rescheduled
  visit_notes TEXT,
  measurements JSONB DEFAULT '{}'::jsonb,
  photos TEXT[],
  customer_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers Table (created before materials for FK reference)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code TEXT UNIQUE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Kenya',
  is_preferred BOOLEAN DEFAULT false,
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materials Inventory Table
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- raw_material, finished_good, consumable, adhesive, grout, waterproofing, trim, accessory, tool
  supplier_id UUID REFERENCES suppliers(id),
  purchase_cost DECIMAL(12,2),
  selling_price DECIMAL(12,2),
  unit TEXT, -- sqm, piece, liter, kg, bag
  current_stock DECIMAL(10,2) DEFAULT 0,
  reserved_stock DECIMAL(10,2) DEFAULT 0,
  minimum_stock_level DECIMAL(10,2),
  warehouse_location TEXT,
  batch_number TEXT,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES materials(id),
  movement_type TEXT NOT NULL, -- in, out, transfer, adjustment, audit
  quantity DECIMAL(10,2) NOT NULL,
  reference_type TEXT, -- purchase_order, sale, transfer, adjustment, audit
  reference_id UUID,
  from_location TEXT,
  to_location TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE,
  supplier_id UUID REFERENCES suppliers(id),
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT DEFAULT 'pending', -- pending, ordered, received, cancelled
  total_amount DECIMAL(12,2),
  paid_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  received_quantity DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Installations Table
CREATE TABLE IF NOT EXISTS installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_number TEXT UNIQUE,
  order_id UUID REFERENCES orders(id),
  project_id UUID REFERENCES projects(id),
  scheduled_date DATE,
  scheduled_time TIME,
  assigned_team JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled, rescheduled
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  notes TEXT,
  progress_photos TEXT[],
  customer_confirmation BOOLEAN DEFAULT false,
  customer_signature TEXT,
  completion_certificate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Portal Access Table
CREATE TABLE IF NOT EXISTS customer_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) UNIQUE,
  auth_user_id UUID REFERENCES auth.users(id) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard Metrics Cache Table (for performance)
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT UNIQUE NOT NULL,
  metric_value JSONB NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(lead_stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_manager ON projects(project_manager);
CREATE INDEX IF NOT EXISTS idx_site_visits_scheduled_date ON site_visits(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_current_stock ON materials(current_stock);
CREATE INDEX IF NOT EXISTS idx_stock_movements_material_id ON stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_installations_scheduled_date ON installations(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_installations_status ON installations(status);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Leads
CREATE POLICY "Leads: Service role can view all" ON leads FOR SELECT TO authenticated;
CREATE POLICY "Leads: Service role can insert" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Leads: Service role can update" ON leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Leads: Service role can delete" ON leads FOR DELETE TO authenticated;

-- RLS Policies for Services
CREATE POLICY "Services: Service role can view all" ON services FOR SELECT TO authenticated;
CREATE POLICY "Services: Service role can insert" ON services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Services: Service role can update" ON services FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Services: Service role can delete" ON services FOR DELETE TO authenticated;

-- RLS Policies for Projects
CREATE POLICY "Projects: Service role can view all" ON projects FOR SELECT TO authenticated;
CREATE POLICY "Projects: Service role can insert" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Projects: Service role can update" ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Projects: Service role can delete" ON projects FOR DELETE TO authenticated;

-- RLS Policies for Site Visits
CREATE POLICY "Site Visits: Service role can view all" ON site_visits FOR SELECT TO authenticated;
CREATE POLICY "Site Visits: Service role can insert" ON site_visits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Site Visits: Service role can update" ON site_visits FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Site Visits: Service role can delete" ON site_visits FOR DELETE TO authenticated;

-- RLS Policies for Materials
CREATE POLICY "Materials: Service role can view all" ON materials FOR SELECT TO authenticated;
CREATE POLICY "Materials: Service role can insert" ON materials FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Materials: Service role can update" ON materials FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Materials: Service role can delete" ON materials FOR DELETE TO authenticated;

-- RLS Policies for Stock Movements
CREATE POLICY "Stock Movements: Service role can view all" ON stock_movements FOR SELECT TO authenticated;
CREATE POLICY "Stock Movements: Service role can insert" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Stock Movements: Service role can update" ON stock_movements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Stock Movements: Service role can delete" ON stock_movements FOR DELETE TO authenticated;

-- RLS Policies for Suppliers
CREATE POLICY "Suppliers: Service role can view all" ON suppliers FOR SELECT TO authenticated;
CREATE POLICY "Suppliers: Service role can insert" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Suppliers: Service role can update" ON suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Suppliers: Service role can delete" ON suppliers FOR DELETE TO authenticated;

-- RLS Policies for Purchase Orders
CREATE POLICY "Purchase Orders: Service role can view all" ON purchase_orders FOR SELECT TO authenticated;
CREATE POLICY "Purchase Orders: Service role can insert" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Purchase Orders: Service role can update" ON purchase_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Purchase Orders: Service role can delete" ON purchase_orders FOR DELETE TO authenticated;

-- RLS Policies for Purchase Order Items
CREATE POLICY "Purchase Order Items: Service role can view all" ON purchase_order_items FOR SELECT TO authenticated;
CREATE POLICY "Purchase Order Items: Service role can insert" ON purchase_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Purchase Order Items: Service role can update" ON purchase_order_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Purchase Order Items: Service role can delete" ON purchase_order_items FOR DELETE TO authenticated;

-- RLS Policies for Installations
CREATE POLICY "Installations: Service role can view all" ON installations FOR SELECT TO authenticated;
CREATE POLICY "Installations: Service role can insert" ON installations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Installations: Service role can update" ON installations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Installations: Service role can delete" ON installations FOR DELETE TO authenticated;

-- RLS Policies for Customer Portal Access
CREATE POLICY "Customer Portal Access: Service role can view all" ON customer_portal_access FOR SELECT TO authenticated;
CREATE POLICY "Customer Portal Access: Service role can insert" ON customer_portal_access FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Customer Portal Access: Service role can update" ON customer_portal_access FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Customer Portal Access: Service role can delete" ON customer_portal_access FOR DELETE TO authenticated;

-- RLS Policies for Dashboard Metrics
CREATE POLICY "Dashboard Metrics: Service role can view all" ON dashboard_metrics FOR SELECT TO authenticated;
CREATE POLICY "Dashboard Metrics: Service role can insert" ON dashboard_metrics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Dashboard Metrics: Service role can update" ON dashboard_metrics FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Dashboard Metrics: Service role can delete" ON dashboard_metrics FOR DELETE TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_site_visits_updated_at BEFORE UPDATE ON site_visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_installations_updated_at BEFORE UPDATE ON installations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate lead numbers
CREATE OR REPLACE FUNCTION generate_lead_number()
RETURNS TEXT AS $$
DECLARE
  lead_num TEXT;
  date_part TEXT;
  seq_num INTEGER;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(lead_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM leads
  WHERE lead_number LIKE 'LD-' || date_part || '%';
  
  lead_num := 'LD-' || date_part || LPAD(seq_num::TEXT, 4, '0');
  RETURN lead_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate lead numbers
CREATE TRIGGER generate_lead_number_trigger
BEFORE INSERT ON leads
FOR EACH ROW
WHEN (NEW.lead_number IS NULL)
EXECUTE FUNCTION generate_lead_number();

-- Function to generate project numbers
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TEXT AS $$
DECLARE
  proj_num TEXT;
  date_part TEXT;
  seq_num INTEGER;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(project_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM projects
  WHERE project_number LIKE 'PR-' || date_part || '%';
  
  proj_num := 'PR-' || date_part || LPAD(seq_num::TEXT, 4, '0');
  RETURN proj_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate project numbers
CREATE TRIGGER generate_project_number_trigger
BEFORE INSERT ON projects
FOR EACH ROW
WHEN (NEW.project_number IS NULL)
EXECUTE FUNCTION generate_project_number();

-- Function to generate installation numbers
CREATE OR REPLACE FUNCTION generate_installation_number()
RETURNS TEXT AS $$
DECLARE
  inst_num TEXT;
  date_part TEXT;
  seq_num INTEGER;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(installation_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM installations
  WHERE installation_number LIKE 'IN-' || date_part || '%';
  
  inst_num := 'IN-' || date_part || LPAD(seq_num::TEXT, 4, '0');
  RETURN inst_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate installation numbers
CREATE TRIGGER generate_installation_number_trigger
BEFORE INSERT ON installations
FOR EACH ROW
WHEN (NEW.installation_number IS NULL)
EXECUTE FUNCTION generate_installation_number();

-- Function to generate purchase order numbers
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
  po_num TEXT;
  date_part TEXT;
  seq_num INTEGER;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM purchase_orders
  WHERE po_number LIKE 'PO-' || date_part || '%';
  
  po_num := 'PO-' || date_part || LPAD(seq_num::TEXT, 4, '0');
  RETURN po_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate purchase order numbers
CREATE TRIGGER generate_po_number_trigger
BEFORE INSERT ON purchase_orders
FOR EACH ROW
WHEN (NEW.po_number IS NULL)
EXECUTE FUNCTION generate_po_number();
