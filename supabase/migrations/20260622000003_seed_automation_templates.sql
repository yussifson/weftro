-- 1. Fix RLS for automations to allow reading templates
DROP POLICY IF EXISTS "automations_company" ON public.automations;
CREATE POLICY "automations_company" ON public.automations FOR ALL USING (
  company_id = (((SELECT company_id FROM public.profiles WHERE id = auth.uid()))::uuid)::uuid OR is_template = true
);

-- 2. Seed 14+ pre-built, ready-to-use Automation Templates
INSERT INTO public.automations
  (name, description, trigger_key, is_template, template_vertical, steps, is_active)
VALUES
-- Core
('Overdue Invoice Alert', 'Alert admin when an invoice is overdue.', 'invoice.overdue', true, 'universal', '[{"action_key": "task.create", "config": {"title": "Chase Overdue Invoice", "priority": "high"}}]'::jsonb, true),
('New Task Notification', 'Notify assignee when a new task is created.', 'task.created', true, 'universal', '[{"action_key": "email.send", "config": {"template": "new_task"}}]'::jsonb, true),

-- Hospital
('Patient Admission Alert', 'Notify the assigned doctor when a patient is admitted.', 'patient.admitted', true, 'hospital', '[{"action_key": "email.send", "config": {"template": "patient_admitted"}}]'::jsonb, true),
('Patient Discharge Task', 'Create a follow-up task upon discharge.', 'patient.discharged', true, 'hospital', '[{"action_key": "task.create", "config": {"title": "Follow up with patient"}}]'::jsonb, true),

-- School
('Student Absent Alert', 'Notify parents if a student exceeds absence threshold.', 'student.absence_threshold', true, 'school', '[{"action_key": "email.send", "config": {"template": "absent_alert"}}]'::jsonb, true),

-- Hotel
('Booking Confirmation', 'Send booking confirmation to guests.', 'booking.created', true, 'hotel', '[{"action_key": "email.send", "config": {"template": "booking_confirmed"}}]'::jsonb, true),
('Check In Reminder', 'Send SMS reminder to guest on check-in day.', 'booking.check_in_today', true, 'hotel', '[{"action_key": "webhook.post", "config": {"url": "https://api.twilio.com/sms"}}]'::jsonb, true),

-- HR
('New Employee Onboarding', 'Create onboarding tasks for new hires.', 'employee.hired', true, 'hr', '[{"action_key": "task.create", "config": {"title": "Setup IT Equipment"}}]'::jsonb, true),
('Leave Request Approval', 'Notify manager of new leave request.', 'leave_request.submitted', true, 'hr', '[{"action_key": "email.send", "config": {"template": "leave_request"}}]'::jsonb, true),

-- Retail
('Low Inventory Alert', 'Create a restock task when product inventory is low.', 'product.low_stock', true, 'retail', '[{"action_key": "task.create", "config": {"title": "Restock Item", "priority": "high"}}]'::jsonb, true),

-- Logistics
('Shipment Created', 'Send tracking email to customer when shipment is created.', 'shipment.created', true, 'logistics', '[{"action_key": "email.send", "config": {"template": "shipment_tracking"}}]'::jsonb, true),

-- Religion
('Donation Thank You', 'Send a thank you email for donations received.', 'giving.received', true, 'religion', '[{"action_key": "email.send", "config": {"template": "donation_thanks"}}]'::jsonb, true);
