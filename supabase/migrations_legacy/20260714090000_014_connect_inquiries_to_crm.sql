/*
# Connect Public Inquiries to the CRM Pipeline

Problem: quotation requests submitted from the public Contact and
Quotation pages went straight into the `quotations` table but never
created a corresponding row in `leads` - meaning the CRM pipeline
(Admin -> CRM/Leads) only ever showed leads an admin added by hand,
completely disconnected from real inbound website inquiries. The whole
point of a lead pipeline is to capture and track incoming interest, so
this was a significant gap between two features that should have been
working together from the start.

This adds a SECURITY DEFINER RPC that creates the quotation and a
linked lead atomically, so anonymous visitors can keep submitting the
public forms exactly as before (no RLS changes needed - anon still
can't read/write leads directly), but every submission now also lands
in the CRM pipeline as a 'new' lead with source='website', with
quotations.lead_id set so admin can navigate between the two records.
*/

CREATE OR REPLACE FUNCTION submit_quotation_request(
  p_name text,
  p_email text,
  p_phone text,
  p_company text DEFAULT NULL,
  p_project_type text DEFAULT NULL,
  p_area_size text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_quotation_id uuid;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;
  IF p_email IS NULL OR p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'a valid email is required';
  END IF;

  INSERT INTO leads (name, email, phone, company, source, status, notes)
  VALUES (p_name, p_email, p_phone, p_company, 'website', 'new', p_message)
  RETURNING id INTO v_lead_id;

  INSERT INTO quotations (name, email, phone, company, project_type, area_size, location, message, status, lead_id)
  VALUES (p_name, p_email, p_phone, p_company, p_project_type, p_area_size, p_location, p_message, 'new', v_lead_id)
  RETURNING id INTO v_quotation_id;

  UPDATE leads SET converted_quotation_id = v_quotation_id WHERE id = v_lead_id;

  RETURN v_quotation_id;
END;
$$;

REVOKE ALL ON FUNCTION submit_quotation_request(text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_quotation_request(text, text, text, text, text, text, text, text) TO anon, authenticated;
