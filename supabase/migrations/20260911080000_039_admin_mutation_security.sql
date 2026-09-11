-- Phases 39: close remaining high-impact browser-write paths for catalogue/inventory.
-- Sensitive mutations execute server-side with RBAC and audit attribution.

CREATE OR REPLACE FUNCTION public.create_product_admin(
  p_name text,
  p_slug text,
  p_category_id uuid DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_short_description text DEFAULT NULL,
  p_sku text DEFAULT NULL,
  p_price numeric DEFAULT 0,
  p_unit text DEFAULT 'sqm',
  p_image_url text DEFAULT NULL,
  p_featured boolean DEFAULT false,
  p_in_stock boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('catalog','insert');
  IF nullif(trim(p_name),'') IS NULL OR nullif(trim(p_slug),'') IS NULL THEN RAISE EXCEPTION 'Product name and slug are required'; END IF;
  IF p_price < 0 THEN RAISE EXCEPTION 'Price cannot be negative'; END IF;
  INSERT INTO public.products(name,slug,category_id,brand_id,description,short_description,sku,price,unit,image_url,featured,in_stock,stock_quantity,is_active,status)
  VALUES(trim(p_name),trim(p_slug),p_category_id,p_brand_id,p_description,p_short_description,nullif(trim(p_sku),''),p_price,coalesce(nullif(trim(p_unit),''),'sqm'),nullif(trim(p_image_url),''),p_featured,p_in_stock,0,true,'active')
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_product_admin(
  p_product_id uuid,
  p_name text,
  p_slug text,
  p_category_id uuid DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_short_description text DEFAULT NULL,
  p_sku text DEFAULT NULL,
  p_price numeric DEFAULT 0,
  p_unit text DEFAULT 'sqm',
  p_image_url text DEFAULT NULL,
  p_featured boolean DEFAULT false,
  p_in_stock boolean DEFAULT true
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid;
BEGIN
  v_user := private.require_staff_permission('catalog','update');
  IF nullif(trim(p_name),'') IS NULL OR nullif(trim(p_slug),'') IS NULL THEN RAISE EXCEPTION 'Product name and slug are required'; END IF;
  IF p_price < 0 THEN RAISE EXCEPTION 'Price cannot be negative'; END IF;
  UPDATE public.products SET
    name=trim(p_name), slug=trim(p_slug), category_id=p_category_id, brand_id=p_brand_id,
    description=p_description, short_description=p_short_description, sku=nullif(trim(p_sku),''),
    price=p_price, unit=coalesce(nullif(trim(p_unit),''),'sqm'), image_url=nullif(trim(p_image_url),''),
    featured=p_featured, in_stock=p_in_stock, updated_at=now()
  WHERE id=p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_product_admin(p_product_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid;
BEGIN
  v_user := private.require_staff_permission('catalog','delete');
  UPDATE public.products SET is_active=false,status='archived',updated_at=now() WHERE id=p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.resolve_inventory_alert(p_alert_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  UPDATE public.inventory_alerts SET is_resolved=true,resolved_at=now() WHERE id=p_alert_id AND is_resolved=false;
  RETURN FOUND;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_product_admin(text,text,uuid,uuid,text,text,text,numeric,text,text,boolean,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_product_admin(uuid,text,text,uuid,uuid,text,text,text,numeric,text,text,boolean,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_product_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_inventory_alert(uuid) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.products FROM authenticated;
REVOKE UPDATE ON public.inventory_alerts FROM authenticated;

CREATE OR REPLACE FUNCTION public.set_primary_product_image(p_product_id uuid,p_image_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_url text;
BEGIN
  v_user := private.require_staff_permission('catalog','update');
  SELECT image_url INTO v_url FROM public.product_images WHERE id=p_image_id AND product_id=p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product image not found'; END IF;
  UPDATE public.product_images SET is_primary=false WHERE product_id=p_product_id AND is_primary=true;
  UPDATE public.product_images SET is_primary=true WHERE id=p_image_id;
  UPDATE public.products SET image_url=v_url,updated_at=now() WHERE id=p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.set_primary_product_image(uuid,uuid) TO authenticated;
