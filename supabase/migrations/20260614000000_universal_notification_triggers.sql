-- Universal Notification Triggers for Slate Ecosystem

-- 1. TASK NOTIFICATIONS
CREATE OR REPLACE FUNCTION notify_task_assignment() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != '' THEN
    INSERT INTO public.notifications (company_id, recipient_email, recipient_name, type, title, message, related_id, created_by)
    VALUES (NEW.company_id, NEW.assigned_to, NEW.assigned_to_name, 'assigned_task', 'New Task Assigned: ' || NEW.title, NEW.description, '/tasks/' || NEW.id, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_assignment_trigger ON public.tasks;
CREATE TRIGGER task_assignment_trigger
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION notify_task_assignment();

DROP TRIGGER IF EXISTS task_assignment_update_trigger ON public.tasks;
CREATE TRIGGER task_assignment_update_trigger
AFTER UPDATE OF assigned_to ON public.tasks
FOR EACH ROW WHEN (NEW.assigned_to IS NOT NULL AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
EXECUTE FUNCTION notify_task_assignment();


-- 2. MESSAGING AND CHAT MENTIONS
CREATE OR REPLACE FUNCTION notify_case_messages() RETURNS TRIGGER AS $$
DECLARE
  tagged_email TEXT;
BEGIN
  IF NEW.tagged_emails IS NOT NULL AND NEW.tagged_emails != '' THEN
    -- Split comma separated emails and insert a notification for each
    FOR tagged_email IN SELECT unnest(string_to_array(NEW.tagged_emails, ',')) LOOP
      tagged_email := trim(tagged_email);
      IF tagged_email != '' THEN
        INSERT INTO public.notifications (company_id, recipient_email, recipient_name, type, title, message, related_id, created_by)
        VALUES (NEW.company_id, tagged_email, 'Team Member', 'internal_message', 'You were mentioned by ' || COALESCE(NEW.sender_name, NEW.sender_email), NEW.content, '/chat/' || NEW.case_id, 'system');
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS case_message_mention_trigger ON public.case_messages;
CREATE TRIGGER case_message_mention_trigger
AFTER INSERT ON public.case_messages
FOR EACH ROW EXECUTE FUNCTION notify_case_messages();


-- 3. HR LEAVE REQUESTS
CREATE OR REPLACE FUNCTION notify_leave_request() RETURNS TRIGGER AS $$
BEGIN
  -- Notify an HR admin or generic company admin (For now, we will notify the 'reviewed_by' if set, else it sends a generic hr alert if we have a specific manager.
  -- Since we don't have a single manager email in the row always, we will just send it if reviewed_by is explicitly set during insert.
  IF NEW.reviewed_by IS NOT NULL AND NEW.reviewed_by != '' THEN
    INSERT INTO public.notifications (company_id, recipient_email, recipient_name, type, title, message, related_id, created_by)
    VALUES (NEW.company_id, NEW.reviewed_by, 'Manager', 'other', 'New Leave Request from ' || NEW.staff_name, NEW.reason, '/leave', 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leave_request_trigger ON public.leave_requests;
CREATE TRIGGER leave_request_trigger
AFTER INSERT ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION notify_leave_request();


-- 4. BILLING & INVOICES
CREATE OR REPLACE FUNCTION notify_invoice_created() RETURNS TRIGGER AS $$
DECLARE
  client_email TEXT;
BEGIN
  -- We need to fetch the client's email from the clients table
  SELECT email INTO client_email FROM public.clients WHERE id = NEW.client_id LIMIT 1;
  
  IF client_email IS NOT NULL AND client_email != '' THEN
    INSERT INTO public.notifications (company_id, recipient_email, recipient_name, type, title, message, related_id, created_by)
    VALUES (NEW.company_id, client_email, NEW.client_name, 'billing_notification', 'New Invoice Issued: ' || NEW.invoice_number, 'An invoice for ' || NEW.currency || NEW.total_amount || ' has been issued.', '/invoices/' || NEW.id, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_created_trigger ON public.invoices;
CREATE TRIGGER invoice_created_trigger
AFTER INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION notify_invoice_created();


-- 5. DOCUMENTS & SIGNATURES
CREATE OR REPLACE FUNCTION notify_signature_request() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_email IS NOT NULL AND NEW.client_email != '' THEN
    INSERT INTO public.notifications (company_id, recipient_email, recipient_name, type, title, message, related_id, created_by)
    VALUES (NEW.company_id, NEW.client_email, NEW.client_name, 'document_signature', 'Signature Required: ' || NEW.document_name, COALESCE(NEW.message, 'Please sign the requested document.'), '/documents', 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS signature_request_trigger ON public.signature_requests;
CREATE TRIGGER signature_request_trigger
AFTER INSERT ON public.signature_requests
FOR EACH ROW EXECUTE FUNCTION notify_signature_request();
