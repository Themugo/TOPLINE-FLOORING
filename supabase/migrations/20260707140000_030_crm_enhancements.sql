-- CRM Enhancements Migration
-- This migration adds tables for comprehensive customer relationship management

-- Customer Contact Persons Table
CREATE TABLE IF NOT EXISTS customer_contact_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Addresses Table
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  address_type TEXT DEFAULT 'delivery', -- billing, delivery, both
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Kenya',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication History Table
CREATE TABLE IF NOT EXISTS communication_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  communication_type TEXT NOT NULL, -- call, email, whatsapp, meeting, note
  direction TEXT NOT NULL, -- inbound, outbound
  subject TEXT,
  content TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Documents Table
CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- contract, invoice, quotation, warranty, other
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Preferences Table
CREATE TABLE IF NOT EXISTS customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  preferred_contact_method TEXT DEFAULT 'email',
  preferred_language TEXT DEFAULT 'en',
  marketing_consent BOOLEAN DEFAULT false,
  payment_terms TEXT,
  credit_limit DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Notes Table
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general', -- general, complaint, compliment, important
  created_by UUID REFERENCES auth.users(id),
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_contact_persons_customer_id ON customer_contact_persons(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_communication_history_customer_id ON communication_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_communication_history_created_at ON communication_history(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);

-- Enable Row Level Security
ALTER TABLE customer_contact_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Customer Contact Persons
CREATE POLICY "Customer Contact Persons: Service role can view all" ON customer_contact_persons FOR SELECT TO authenticated;
CREATE POLICY "Customer Contact Persons: Service role can insert" ON customer_contact_persons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Customer Contact Persons: Service role can update" ON customer_contact_persons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Customer Contact Persons: Service role can delete" ON customer_contact_persons FOR DELETE TO authenticated;

-- RLS Policies for Customer Addresses
CREATE POLICY "Customer Addresses: Service role can view all" ON customer_addresses FOR SELECT TO authenticated;
CREATE POLICY "Customer Addresses: Service role can insert" ON customer_addresses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Customer Addresses: Service role can update" ON customer_addresses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Customer Addresses: Service role can delete" ON customer_addresses FOR DELETE TO authenticated;

-- RLS Policies for Communication History
CREATE POLICY "Communication History: Service role can view all" ON communication_history FOR SELECT TO authenticated;
CREATE POLICY "Communication History: Service role can insert" ON communication_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Communication History: Service role can update" ON communication_history FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Communication History: Service role can delete" ON communication_history FOR DELETE TO authenticated;

-- RLS Policies for Customer Documents
CREATE POLICY "Customer Documents: Service role can view all" ON customer_documents FOR SELECT TO authenticated;
CREATE POLICY "Customer Documents: Service role can insert" ON customer_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Customer Documents: Service role can update" ON customer_documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Customer Documents: Service role can delete" ON customer_documents FOR DELETE TO authenticated;

-- RLS Policies for Customer Preferences
CREATE POLICY "Customer Preferences: Service role can view all" ON customer_preferences FOR SELECT TO authenticated;
CREATE POLICY "Customer Preferences: Service role can insert" ON customer_preferences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Customer Preferences: Service role can update" ON customer_preferences FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Customer Preferences: Service role can delete" ON customer_preferences FOR DELETE TO authenticated;

-- RLS Policies for Customer Notes
CREATE POLICY "Customer Notes: Service role can view all" ON customer_notes FOR SELECT TO authenticated;
CREATE POLICY "Customer Notes: Service role can insert" ON customer_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Customer Notes: Service role can update" ON customer_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Customer Notes: Service role can delete" ON customer_notes FOR DELETE TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_customer_contact_persons_updated_at BEFORE UPDATE ON customer_contact_persons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON customer_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_preferences_updated_at BEFORE UPDATE ON customer_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one primary contact person per customer
CREATE OR REPLACE FUNCTION ensure_single_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE customer_contact_persons
    SET is_primary = false
    WHERE customer_id = NEW.customer_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single primary contact
CREATE TRIGGER ensure_single_primary_contact_trigger
BEFORE INSERT OR UPDATE ON customer_contact_persons
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION ensure_single_primary_contact();

-- Function to ensure only one default address per customer per type
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE customer_addresses
    SET is_default = false
    WHERE customer_id = NEW.customer_id AND address_type = NEW.address_type AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single default address
CREATE TRIGGER ensure_single_default_address_trigger
BEFORE INSERT OR UPDATE ON customer_addresses
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION ensure_single_default_address();
