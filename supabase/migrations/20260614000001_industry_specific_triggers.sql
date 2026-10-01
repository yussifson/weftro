-- Phase 2: Industry Specific Universal Triggers

-- ==========================================
-- 1. SECONDARY ENTITY TRIGGERS (ASSIGNED STAFF)
-- ==========================================
CREATE OR REPLACE FUNCTION notify_assigned_staff() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_staff IS NOT NULL AND NEW.assigned_staff != '' THEN
    INSERT INTO public.notifications (company_id, recipient_email, recipient_name, type, title, message, related_id, created_by)
    VALUES (NEW.company_id, NEW.assigned_staff, COALESCE(NEW.assigned_staff_name, 'Staff Member'), 'assigned_task', 'New Assignment: ' || NEW.title, NEW.description, '/' || TG_TABLE_NAME || '/' || NEW.id, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all secondary tables across 15 industries
DROP TRIGGER IF EXISTS school_classes_staff_trigger ON public.school_classes;
CREATE TRIGGER school_classes_staff_trigger AFTER INSERT ON public.school_classes FOR EACH ROW EXECUTE FUNCTION notify_assigned_staff();

DROP TRIGGER IF EXISTS hospital_admissions_staff_trigger ON public.hospital_admissions;
CREATE TRIGGER hospital_admissions_staff_trigger AFTER INSERT ON public.hospital_admissions FOR EACH ROW EXECUTE FUNCTION notify_assigned_staff();

DROP TRIGGER IF EXISTS hotel_bookings_staff_trigger ON public.hotel_bookings;
CREATE TRIGGER hotel_bookings_staff_trigger AFTER INSERT ON public.hotel_bookings FOR EACH ROW EXECUTE FUNCTION notify_assigned_staff();

DROP TRIGGER IF EXISTS religion_groups_staff_trigger ON public.religion_groups;
CREATE TRIGGER religion_groups_staff_trigger AFTER INSERT ON public.religion_groups FOR EACH ROW EXECUTE FUNCTION notify_assigned_staff();

DROP TRIGGER IF EXISTS insurance_claims_staff_trigger ON public.insurance_claims;
CREATE TRIGGER insurance_claims_staff_trigger AFTER INSERT ON public.insurance_claims FOR EACH ROW EXECUTE FUNCTION notify_assigned_staff();

DROP TRIGGER IF EXISTS retail_orders_staff_trigger ON public.retail_orders;
CREATE TRIGGER retail_orders_staff_trigger AFTER INSERT ON public.retail_orders FOR EACH ROW EXECUTE FUNCTION notify_assigned_staff();

DROP TRIGGER IF EXISTS logistics_shipments_staff_trigger ON public.logistics_shipments;
CREATE TRIGGER logistics_shipments_staff_trigger AFTER INSERT ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION notify_assigned_staff();

DROP TRIGGER IF EXISTS hr_projects_staff_trigger ON public.hr_projects;
CREATE TRIGGER hr_projects_staff_trigger AFTER INSERT ON public.hr_projects FOR EACH ROW EXECUTE FUNCTION notify_assigned_staff();


-- ==========================================
-- 2. EVENT & SESSION TRIGGERS (SCHEDULED EVENTS)
-- ==========================================
CREATE OR REPLACE FUNCTION notify_event_staff() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.staff_email IS NOT NULL AND NEW.staff_email != '' THEN
    INSERT INTO public.notifications (company_id, recipient_email, recipient_name, type, title, message, related_id, created_by)
    VALUES (NEW.company_id, NEW.staff_email, COALESCE(NEW.staff_name, 'Staff Member'), 'assigned_task', 'New Scheduled Event: ' || NEW.title, 'Scheduled for ' || NEW.date, '/' || TG_TABLE_NAME || '/' || NEW.case_id, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tertiary tables across 15 industries
DROP TRIGGER IF EXISTS school_sessions_staff_trigger ON public.school_sessions;
CREATE TRIGGER school_sessions_staff_trigger AFTER INSERT ON public.school_sessions FOR EACH ROW EXECUTE FUNCTION notify_event_staff();

DROP TRIGGER IF EXISTS hospital_appointments_staff_trigger ON public.hospital_appointments;
CREATE TRIGGER hospital_appointments_staff_trigger AFTER INSERT ON public.hospital_appointments FOR EACH ROW EXECUTE FUNCTION notify_event_staff();

DROP TRIGGER IF EXISTS hotel_reservations_staff_trigger ON public.hotel_reservations;
CREATE TRIGGER hotel_reservations_staff_trigger AFTER INSERT ON public.hotel_reservations FOR EACH ROW EXECUTE FUNCTION notify_event_staff();

DROP TRIGGER IF EXISTS religion_events_staff_trigger ON public.religion_events;
CREATE TRIGGER religion_events_staff_trigger AFTER INSERT ON public.religion_events FOR EACH ROW EXECUTE FUNCTION notify_event_staff();

DROP TRIGGER IF EXISTS insurance_meetings_staff_trigger ON public.insurance_meetings;
CREATE TRIGGER insurance_meetings_staff_trigger AFTER INSERT ON public.insurance_meetings FOR EACH ROW EXECUTE FUNCTION notify_event_staff();

DROP TRIGGER IF EXISTS retail_shifts_staff_trigger ON public.retail_shifts;
CREATE TRIGGER retail_shifts_staff_trigger AFTER INSERT ON public.retail_shifts FOR EACH ROW EXECUTE FUNCTION notify_event_staff();

DROP TRIGGER IF EXISTS logistics_dispatches_staff_trigger ON public.logistics_dispatches;
CREATE TRIGGER logistics_dispatches_staff_trigger AFTER INSERT ON public.logistics_dispatches FOR EACH ROW EXECUTE FUNCTION notify_event_staff();

DROP TRIGGER IF EXISTS hr_interviews_staff_trigger ON public.hr_interviews;
CREATE TRIGGER hr_interviews_staff_trigger AFTER INSERT ON public.hr_interviews FOR EACH ROW EXECUTE FUNCTION notify_event_staff();


-- ==========================================
-- 3. LMS / ONLINE COURSES (STUDENT ENROLLMENT)
-- ==========================================
CREATE OR REPLACE FUNCTION notify_course_enrollment() RETURNS TRIGGER AS $$
DECLARE
  course_title TEXT;
BEGIN
  SELECT title INTO course_title FROM public.online_courses WHERE id = NEW.course_id LIMIT 1;

  IF NEW.student_email IS NOT NULL AND NEW.student_email != '' THEN
    INSERT INTO public.notifications (company_id, recipient_email, recipient_name, type, title, message, related_id, created_by)
    VALUES (NEW.company_id, NEW.student_email, COALESCE(NEW.student_name, 'Student'), 'other', 'Welcome to the Course!', 'You have been successfully enrolled in ' || COALESCE(course_title, 'the course') || '.', '/courses/' || NEW.course_id, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS course_enrollment_trigger ON public.online_enrollments;
CREATE TRIGGER course_enrollment_trigger AFTER INSERT ON public.online_enrollments FOR EACH ROW EXECUTE FUNCTION notify_course_enrollment();
