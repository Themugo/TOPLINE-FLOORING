-- Phases 24-26: customer journey events, staff notifications and communication outbox.

CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','danger')),
  audience text NOT NULL DEFAULT 'staff' CHECK (audience IN ('staff','customer','both')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_events_customer_idx ON public.notification_events(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_events_staff_idx ON public.notification_events(created_at DESC) WHERE audience IN ('staff','both');

CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id uuid NOT NULL REFERENCES public.notification_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(notification_id, user_id)
);
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_events FROM anon;
REVOKE ALL ON public.notification_reads FROM anon;
GRANT SELECT ON public.notification_events TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.notification_reads TO authenticated;

DROP POLICY IF EXISTS notification_events_staff_read ON public.notification_events;
CREATE POLICY notification_events_staff_read ON public.notification_events FOR SELECT TO authenticated
USING (audience IN ('staff','both') AND private.current_user_has_permission('reports','read'));
DROP POLICY IF EXISTS notification_events_customer_read ON public.notification_events;
CREATE POLICY notification_events_customer_read ON public.notification_events FOR SELECT TO authenticated
USING (audience IN ('customer','both') AND customer_id = public.get_current_customer_id());
DROP POLICY IF EXISTS notification_reads_self ON public.notification_reads;
CREATE POLICY notification_reads_self ON public.notification_reads FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.notification_events n WHERE n.id=p_notification_id AND n.audience IN ('staff','both')) THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;
  PERFORM private.require_staff_permission('reports','read');
  INSERT INTO public.notification_reads(notification_id,user_id) VALUES(p_notification_id,auth.uid()) ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE n integer;
BEGIN
  PERFORM private.require_staff_permission('reports','read');
  INSERT INTO public.notification_reads(notification_id,user_id)
  SELECT id,auth.uid() FROM public.notification_events
  WHERE audience IN ('staff','both') AND NOT EXISTS (SELECT 1 FROM public.notification_reads r WHERE r.notification_id=id AND r.user_id=auth.uid());
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

CREATE TABLE IF NOT EXISTS public.communication_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK(channel IN ('email','whatsapp','sms')),
  recipient text NOT NULL,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed','cancelled')),
  provider text,
  provider_reference text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_message text
);
CREATE INDEX IF NOT EXISTS communication_outbox_status_idx ON public.communication_outbox(status,created_at);
ALTER TABLE public.communication_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_outbox FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.communication_outbox TO authenticated;
DROP POLICY IF EXISTS communication_outbox_staff ON public.communication_outbox;
CREATE POLICY communication_outbox_staff ON public.communication_outbox FOR ALL TO authenticated
USING(private.current_user_has_permission('customers','update'))
WITH CHECK(private.current_user_has_permission('customers','update'));

CREATE OR REPLACE FUNCTION public.queue_customer_message(p_customer_id uuid,p_channel text,p_recipient text,p_message text,p_subject text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE uid uuid; cid uuid; oid uuid;
BEGIN
  uid:=private.require_staff_permission('customers','update');
  IF p_channel NOT IN ('email','whatsapp','sms') OR nullif(trim(p_recipient),'') IS NULL OR nullif(trim(p_message),'') IS NULL THEN RAISE EXCEPTION 'Invalid outbound message'; END IF;
  SELECT id INTO cid FROM public.customers WHERE id=p_customer_id;
  IF cid IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
  INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,created_by) VALUES(cid,p_channel,trim(p_recipient),nullif(trim(p_subject),''),trim(p_message),uid) RETURNING id INTO oid;
  PERFORM public.log_customer_communication(cid,p_channel,trim(p_message),nullif(trim(p_subject),''),'outbound',NULL,NULL,NULL,'queued',oid::text);
  RETURN oid;
END; $$;
GRANT EXECUTE ON FUNCTION public.queue_customer_message(uuid,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.emit_customer_journey_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; old_status text; new_status text; et text; ttl text; msg text; entity text; eid uuid;
BEGIN
  entity:=TG_TABLE_NAME; eid:=NEW.id;
  IF TG_TABLE_NAME='orders' THEN cid:=NEW.customer_id; new_status:=NEW.status; et:='order.status';
  ELSIF TG_TABLE_NAME='quotations' THEN SELECT c.id INTO cid FROM public.customers c WHERE lower(c.email)=lower(NEW.email) ORDER BY c.created_at LIMIT 1; new_status:=NEW.status; et:='quotation.status';
  ELSIF TG_TABLE_NAME='projects' THEN cid:=NEW.customer_id; new_status:=NEW.status; et:='project.status';
  ELSIF TG_TABLE_NAME='invoices' THEN cid:=NEW.customer_id; new_status:=NEW.status; et:='invoice.status';
  END IF;
  IF TG_OP='UPDATE' THEN old_status:=OLD.status; END IF;
  IF TG_OP='UPDATE' AND old_status IS NOT DISTINCT FROM new_status THEN RETURN NEW; END IF;
  ttl:=initcap(replace(entity,'_',' '))||' update';
  msg:=CASE WHEN old_status IS NULL THEN ttl||' created.' ELSE ttl||' changed from '||coalesce(old_status,'new')||' to '||coalesce(new_status,'updated')||'.' END;
  INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
  VALUES(et,entity,eid,cid,ttl,msg,CASE WHEN new_status IN ('cancelled','lost') THEN 'warning' WHEN new_status IN ('completed','paid','won') THEN 'success' ELSE 'info' END,'both',jsonb_build_object('old_status',old_status,'new_status',new_status));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_customer_journey_event ON public.orders;
CREATE TRIGGER orders_customer_journey_event AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.emit_customer_journey_event();
DROP TRIGGER IF EXISTS quotations_customer_journey_event ON public.quotations;
CREATE TRIGGER quotations_customer_journey_event AFTER INSERT OR UPDATE OF status ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.emit_customer_journey_event();
DROP TRIGGER IF EXISTS projects_customer_journey_event ON public.projects;
CREATE TRIGGER projects_customer_journey_event AFTER INSERT OR UPDATE OF status ON public.projects FOR EACH ROW EXECUTE FUNCTION public.emit_customer_journey_event();
DROP TRIGGER IF EXISTS invoices_customer_journey_event ON public.invoices;
CREATE TRIGGER invoices_customer_journey_event AFTER INSERT OR UPDATE OF status ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.emit_customer_journey_event();

CREATE OR REPLACE FUNCTION public.get_customer_journey()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid;
BEGIN
  cid:=public.get_current_customer_id();
  IF cid IS NULL THEN RAISE EXCEPTION 'Customer portal access is not available for this account'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n.id,'event_type',n.event_type,'entity_type',n.entity_type,'entity_id',n.entity_id,'title',n.title,'message',n.message,'severity',n.severity,'created_at',n.created_at,'metadata',n.metadata) ORDER BY n.created_at DESC) FROM public.notification_events n WHERE n.customer_id=cid AND n.audience IN ('customer','both') LIMIT 100),'[]'::jsonb);
END; $$;
GRANT EXECUTE ON FUNCTION public.get_customer_journey() TO authenticated;
