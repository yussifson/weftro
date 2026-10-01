-- ── TRIGGER REGISTRY ─────────────────────────────────────────────────────────
-- Every possible trigger is a verified record here.
-- OrbitFlow can ONLY use triggers from this table. No exceptions.

CREATE TABLE IF NOT EXISTS automation_triggers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_key       text NOT NULL UNIQUE,
  display_name      text NOT NULL,
  description       text NOT NULL,
  vertical          text NOT NULL,         -- 'universal', 'legal', 'hospital', etc.
  event_name        text NOT NULL,         -- the Inngest event name this maps to
  data_schema       jsonb NOT NULL,        -- what data this trigger provides to actions
  example_data      jsonb NOT NULL,        -- example payload for UI preview
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── ACTION REGISTRY ──────────────────────────────────────────────────────────
-- Every possible action is a verified record here.
-- OrbitFlow can ONLY use actions from this table.

CREATE TABLE IF NOT EXISTS automation_actions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key        text NOT NULL UNIQUE,
  display_name      text NOT NULL,
  description       text NOT NULL,
  category          text NOT NULL,         -- 'notification', 'record', 'task', 'document', 'integration'
  input_schema      jsonb NOT NULL,        -- what inputs this action requires
  output_schema     jsonb NOT NULL,        -- what this action produces (for chaining)
  handler_function  text NOT NULL,         -- the Inngest function name that executes this
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── AUTOMATIONS ───────────────────────────────────────────────────────────────
-- The automation definitions created by users or OrbitFlow

CREATE TABLE IF NOT EXISTS automations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid, -- NULL means global template
  name              text NOT NULL,
  description       text,
  trigger_key       text NOT NULL REFERENCES automation_triggers(trigger_key),
  trigger_filters   jsonb NOT NULL DEFAULT '[]',  -- array of filter conditions
  steps             jsonb NOT NULL DEFAULT '[]',  -- ordered array of action steps
  is_active         boolean NOT NULL DEFAULT false,
  is_template       boolean NOT NULL DEFAULT false,
  template_vertical text,
  created_by        uuid REFERENCES auth.users(id),
  created_by_orbit  boolean NOT NULL DEFAULT false,  -- true = OrbitFlow created it
  run_count         integer NOT NULL DEFAULT 0,
  success_count     integer NOT NULL DEFAULT 0,
  failure_count     integer NOT NULL DEFAULT 0,
  last_run_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── AUTOMATION RUNS ──────────────────────────────────────────────────────────
-- Every execution is persisted here

CREATE TABLE IF NOT EXISTS automation_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id     uuid NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  company_id        uuid NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','completed','failed','retrying','cancelled')),
  trigger_data      jsonb,                -- the actual data that fired this run
  steps_completed   integer NOT NULL DEFAULT 0,
  steps_total       integer NOT NULL DEFAULT 0,
  step_logs         jsonb NOT NULL DEFAULT '[]',  -- per-step execution log
  error_message     text,
  error_step        integer,
  inngest_run_id    text,                 -- Inngest's run ID for debugging
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_automations_company   ON automations(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automations_trigger     ON automations(trigger_key, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_runs_auto    ON automation_runs(automation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_company ON automation_runs(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_v   ON automation_triggers(vertical, is_active);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automations_company" ON automations FOR ALL USING (
  company_id = (((SELECT company_id FROM public.profiles WHERE id = auth.uid()))::uuid)::uuid OR is_template = true
);

ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_company" ON automation_runs FOR ALL USING (
  company_id = (((SELECT company_id FROM public.profiles WHERE id = auth.uid()))::uuid)::uuid
);

-- Registries are read-only for all authenticated users
ALTER TABLE automation_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "triggers_read" ON automation_triggers FOR SELECT TO authenticated USING (true);

ALTER TABLE automation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actions_read" ON automation_actions FOR SELECT TO authenticated USING (true);


INSERT INTO automation_triggers
  (trigger_key, display_name, description, vertical, event_name, data_schema, example_data)
VALUES

-- ── UNIVERSAL TRIGGERS ────────────────────────────────────────────────────────
('invoice.created',
 'Invoice created',
 'Fires when a new invoice is created in the system',
 'universal', 'slate/invoice.created',
 '{"invoice_id":"uuid","amount":"number","client_name":"string","due_date":"date","status":"string"}',
 '{"invoice_id":"abc-123","amount":5000,"client_name":"Acme Corp","due_date":"2024-12-01","status":"unpaid"}'),

('invoice.overdue',
 'Invoice becomes overdue',
 'Fires when an invoice passes its due date without payment',
 'universal', 'slate/invoice.overdue',
 '{"invoice_id":"uuid","amount":"number","client_name":"string","days_overdue":"number","due_date":"date"}',
 '{"invoice_id":"abc-123","amount":5000,"client_name":"Acme Corp","days_overdue":3,"due_date":"2024-11-28"}'),

('invoice.paid',
 'Invoice paid',
 'Fires when an invoice is marked as paid',
 'universal', 'slate/invoice.paid',
 '{"invoice_id":"uuid","amount":"number","client_name":"string","paid_at":"datetime"}',
 '{"invoice_id":"abc-123","amount":5000,"client_name":"Acme Corp","paid_at":"2024-12-01T10:00:00Z"}'),

('task.created',
 'Task created',
 'Fires when a new task is created',
 'universal', 'slate/task.created',
 '{"task_id":"uuid","title":"string","assignee_id":"uuid","assignee_name":"string","due_date":"date","priority":"string"}',
 '{"task_id":"abc-123","title":"Review contract","assignee_id":"user-1","assignee_name":"John","due_date":"2024-12-01","priority":"high"}'),

('task.overdue',
 'Task becomes overdue',
 'Fires when a task passes its due date without completion',
 'universal', 'slate/task.overdue',
 '{"task_id":"uuid","title":"string","assignee_name":"string","days_overdue":"number"}',
 '{"task_id":"abc-123","title":"Review contract","assignee_name":"John","days_overdue":1}'),

('task.completed',
 'Task completed',
 'Fires when a task is marked as complete',
 'universal', 'slate/task.completed',
 '{"task_id":"uuid","title":"string","completed_by":"string","completed_at":"datetime"}',
 '{"task_id":"abc-123","title":"Review contract","completed_by":"John","completed_at":"2024-12-01T10:00:00Z"}'),

('team_member.joined',
 'Team member joined',
 'Fires when a new member accepts a workspace invitation',
 'universal', 'slate/team_member.joined',
 '{"user_id":"uuid","name":"string","email":"string","role":"string","joined_at":"datetime"}',
 '{"user_id":"user-1","name":"Jane Smith","email":"jane@example.com","role":"staff","joined_at":"2024-12-01T09:00:00Z"}'),

('leave_request.submitted',
 'Leave request submitted',
 'Fires when an employee submits a leave request',
 'universal', 'slate/leave_request.submitted',
 '{"request_id":"uuid","employee_name":"string","leave_type":"string","start_date":"date","end_date":"date","days":"number"}',
 '{"request_id":"abc-123","employee_name":"John","leave_type":"annual","start_date":"2024-12-10","end_date":"2024-12-14","days":5}'),

('leave_request.approved',
 'Leave request approved',
 'Fires when a leave request is approved',
 'universal', 'slate/leave_request.approved',
 '{"request_id":"uuid","employee_name":"string","leave_type":"string","start_date":"date","end_date":"date"}',
 '{"request_id":"abc-123","employee_name":"John","leave_type":"annual","start_date":"2024-12-10","end_date":"2024-12-14"}'),

('intelligence.risk_detected',
 'Intelligence flags a risk',
 'Fires when the intelligence layer detects a risk insight for any entity',
 'universal', 'slate/intelligence.risk_detected',
 '{"insight_id":"uuid","insight_key":"string","title":"string","severity":"string","entity_type":"string","entity_id":"uuid"}',
 '{"insight_id":"abc-123","insight_key":"client_high_churn","title":"Client at high churn risk","severity":"critical","entity_type":"client","entity_id":"client-1"}'),

-- ── LEGAL TRIGGERS ────────────────────────────────────────────────────────────
('case.created',
 'Case created',
 'Fires when a new case is opened',
 'legal', 'slate/case.created',
 '{"case_id":"uuid","title":"string","client_name":"string","assigned_to":"string","case_type":"string","created_at":"datetime"}',
 '{"case_id":"case-1","title":"Smith v Jones","client_name":"John Smith","assigned_to":"Jane Attorney","case_type":"civil","created_at":"2024-12-01T09:00:00Z"}'),

('case.deadline_approaching',
 'Case deadline approaching',
 'Fires when a case has a deadline within the configured number of days',
 'legal', 'slate/case.deadline_approaching',
 '{"case_id":"uuid","title":"string","client_name":"string","assigned_to":"string","deadline":"date","days_remaining":"number"}',
 '{"case_id":"case-1","title":"Smith v Jones","client_name":"John Smith","assigned_to":"Jane Attorney","deadline":"2024-12-07","days_remaining":3}'),

('case.status_changed',
 'Case status changed',
 'Fires when a case moves to a different status or stage',
 'legal', 'slate/case.status_changed',
 '{"case_id":"uuid","title":"string","old_status":"string","new_status":"string","changed_by":"string"}',
 '{"case_id":"case-1","title":"Smith v Jones","old_status":"discovery","new_status":"trial_prep","changed_by":"Jane Attorney"}'),

('case.closed',
 'Case closed',
 'Fires when a case is marked as closed',
 'legal', 'slate/case.closed',
 '{"case_id":"uuid","title":"string","client_name":"string","outcome":"string","closed_at":"datetime"}',
 '{"case_id":"case-1","title":"Smith v Jones","client_name":"John Smith","outcome":"won","closed_at":"2024-12-01T15:00:00Z"}'),

-- ── HEALTHCARE TRIGGERS ───────────────────────────────────────────────────────
('appointment.scheduled',
 'Appointment scheduled',
 'Fires when a new appointment is booked',
 'hospital', 'slate/appointment.scheduled',
 '{"appointment_id":"uuid","patient_name":"string","doctor_name":"string","appointment_date":"datetime","appointment_type":"string"}',
 '{"appointment_id":"appt-1","patient_name":"Mary Jones","doctor_name":"Dr Smith","appointment_date":"2024-12-05T10:00:00Z","appointment_type":"consultation"}'),

('appointment.reminder_due',
 'Appointment reminder due',
 'Fires 24 hours before a scheduled appointment',
 'hospital', 'slate/appointment.reminder_due',
 '{"appointment_id":"uuid","patient_name":"string","patient_email":"string","patient_phone":"string","doctor_name":"string","appointment_date":"datetime"}',
 '{"appointment_id":"appt-1","patient_name":"Mary Jones","patient_email":"mary@example.com","patient_phone":"+1234567890","doctor_name":"Dr Smith","appointment_date":"2024-12-05T10:00:00Z"}'),

('appointment.missed',
 'Appointment missed (no-show)',
 'Fires when a patient does not attend their scheduled appointment',
 'hospital', 'slate/appointment.missed',
 '{"appointment_id":"uuid","patient_name":"string","patient_id":"uuid","doctor_name":"string","appointment_date":"datetime"}',
 '{"appointment_id":"appt-1","patient_name":"Mary Jones","patient_id":"patient-1","doctor_name":"Dr Smith","appointment_date":"2024-12-05T10:00:00Z"}'),

('patient.admitted',
 'Patient admitted',
 'Fires when a patient is admitted to the hospital',
 'hospital', 'slate/patient.admitted',
 '{"admission_id":"uuid","patient_name":"string","ward":"string","doctor_name":"string","admitted_at":"datetime"}',
 '{"admission_id":"adm-1","patient_name":"Mary Jones","ward":"Ward A","doctor_name":"Dr Smith","admitted_at":"2024-12-01T08:00:00Z"}'),

('patient.discharged',
 'Patient discharged',
 'Fires when a patient is discharged',
 'hospital', 'slate/patient.discharged',
 '{"admission_id":"uuid","patient_name":"string","patient_email":"string","discharge_date":"date","follow_up_required":"boolean"}',
 '{"admission_id":"adm-1","patient_name":"Mary Jones","patient_email":"mary@example.com","discharge_date":"2024-12-05","follow_up_required":true}'),

('pharmacy.low_stock',
 'Medication low stock',
 'Fires when a medication drops below reorder level',
 'hospital', 'slate/pharmacy.low_stock',
 '{"item_id":"uuid","drug_name":"string","current_stock":"number","reorder_level":"number","unit":"string"}',
 '{"item_id":"drug-1","drug_name":"Amoxicillin 500mg","current_stock":50,"reorder_level":100,"unit":"tablets"}'),

-- ── EDUCATION TRIGGERS ────────────────────────────────────────────────────────
('student.absence_threshold',
 'Student absence threshold reached',
 'Fires when a student reaches a configured number of absences',
 'school', 'slate/student.absence_threshold',
 '{"student_id":"uuid","student_name":"string","parent_email":"string","absence_count":"number","threshold":"number","class_name":"string"}',
 '{"student_id":"stu-1","student_name":"Tom Brown","parent_email":"parent@example.com","absence_count":3,"threshold":3,"class_name":"Grade 7A"}'),

('student.grade_below_threshold',
 'Student grade below threshold',
 'Fires when a student scores below a configured percentage on any assessment',
 'school', 'slate/student.grade_below_threshold',
 '{"student_id":"uuid","student_name":"string","parent_email":"string","subject":"string","score":"number","threshold":"number"}',
 '{"student_id":"stu-1","student_name":"Tom Brown","parent_email":"parent@example.com","subject":"Mathematics","score":42,"threshold":50}'),

('fee.payment_due',
 'Student fee payment due',
 'Fires when a fee payment date is approaching',
 'school', 'slate/fee.payment_due',
 '{"fee_id":"uuid","student_name":"string","parent_email":"string","amount":"number","due_date":"date","days_until_due":"number"}',
 '{"fee_id":"fee-1","student_name":"Tom Brown","parent_email":"parent@example.com","amount":500,"due_date":"2024-12-15","days_until_due":7}'),

('exam.created',
 'Exam scheduled',
 'Fires when a new exam is added to the schedule',
 'school', 'slate/exam.created',
 '{"exam_id":"uuid","title":"string","subject":"string","class_name":"string","exam_date":"date"}',
 '{"exam_id":"exam-1","title":"End of Term Maths","subject":"Mathematics","class_name":"Grade 7","exam_date":"2024-12-20"}'),

-- ── HOTEL TRIGGERS ────────────────────────────────────────────────────────────
('booking.created',
 'Booking created',
 'Fires when a new booking is made',
 'hotel', 'slate/booking.created',
 '{"booking_id":"uuid","guest_name":"string","guest_email":"string","check_in":"date","check_out":"date","room_number":"string","nights":"number"}',
 '{"booking_id":"bk-1","guest_name":"Alice White","guest_email":"alice@example.com","check_in":"2024-12-10","check_out":"2024-12-13","room_number":"204","nights":3}'),

('booking.check_in_today',
 'Guest checking in today',
 'Fires on the morning of a guest check-in day',
 'hotel', 'slate/booking.check_in_today',
 '{"booking_id":"uuid","guest_name":"string","guest_email":"string","room_number":"string","check_in_time":"string","special_requests":"string"}',
 '{"booking_id":"bk-1","guest_name":"Alice White","guest_email":"alice@example.com","room_number":"204","check_in_time":"14:00","special_requests":"Late arrival"}'),

('booking.checkout_today',
 'Guest checking out today',
 'Fires on the morning of a guest check-out day',
 'hotel', 'slate/booking.checkout_today',
 '{"booking_id":"uuid","guest_name":"string","guest_email":"string","room_number":"string","nights_stayed":"number"}',
 '{"booking_id":"bk-1","guest_name":"Alice White","guest_email":"alice@example.com","room_number":"204","nights_stayed":3}'),

-- ── HR TRIGGERS ───────────────────────────────────────────────────────────────
('employee.hired',
 'New employee hired',
 'Fires when a new employee record is created',
 'hr', 'slate/employee.hired',
 '{"employee_id":"uuid","name":"string","email":"string","role":"string","department":"string","start_date":"date","manager_name":"string"}',
 '{"employee_id":"emp-1","name":"Sarah Lee","email":"sarah@company.com","role":"Software Engineer","department":"Engineering","start_date":"2024-12-02","manager_name":"Mike Chen"}'),

('employee.probation_ending',
 'Probation period ending',
 'Fires when an employee probation period is within the configured days',
 'hr', 'slate/employee.probation_ending',
 '{"employee_id":"uuid","name":"string","role":"string","manager_name":"string","manager_email":"string","probation_end_date":"date","days_remaining":"number"}',
 '{"employee_id":"emp-1","name":"Sarah Lee","role":"Software Engineer","manager_name":"Mike Chen","manager_email":"mike@company.com","probation_end_date":"2024-12-15","days_remaining":14}'),

('employee.birthday',
 'Employee birthday',
 'Fires on an employee birthday',
 'hr', 'slate/employee.birthday',
 '{"employee_id":"uuid","name":"string","email":"string","department":"string","years_at_company":"number"}',
 '{"employee_id":"emp-1","name":"Sarah Lee","email":"sarah@company.com","department":"Engineering","years_at_company":2}'),

-- ── RETAIL TRIGGERS ───────────────────────────────────────────────────────────
('product.low_stock',
 'Product low stock',
 'Fires when a product stock drops below the reorder point',
 'retail', 'slate/product.low_stock',
 '{"product_id":"uuid","name":"string","sku":"string","current_stock":"number","reorder_point":"number","daily_velocity":"number","days_until_stockout":"number"}',
 '{"product_id":"prod-1","name":"Blue T-Shirt L","sku":"TSH-BL-L","current_stock":5,"reorder_point":20,"daily_velocity":2,"days_until_stockout":2}'),

('order.created',
 'New order placed',
 'Fires when a customer places a new order',
 'retail', 'slate/order.created',
 '{"order_id":"uuid","customer_name":"string","customer_email":"string","total":"number","items_count":"number","created_at":"datetime"}',
 '{"order_id":"ord-1","customer_name":"Bob Jones","customer_email":"bob@example.com","total":150,"items_count":3,"created_at":"2024-12-01T14:00:00Z"}'),

('order.fulfilled',
 'Order fulfilled',
 'Fires when an order is marked as fulfilled and ready for collection or delivery',
 'retail', 'slate/order.fulfilled',
 '{"order_id":"uuid","customer_name":"string","customer_email":"string","fulfillment_method":"string"}',
 '{"order_id":"ord-1","customer_name":"Bob Jones","customer_email":"bob@example.com","fulfillment_method":"delivery"}'),

-- ── LOGISTICS TRIGGERS ────────────────────────────────────────────────────────
('shipment.created',
 'Shipment created',
 'Fires when a new shipment is created',
 'logistics', 'slate/shipment.created',
 '{"shipment_id":"uuid","tracking_number":"string","customer_name":"string","destination":"string","estimated_delivery":"date"}',
 '{"shipment_id":"ship-1","tracking_number":"TRK123456","customer_name":"XYZ Corp","destination":"Lagos, Nigeria","estimated_delivery":"2024-12-05"}'),

('shipment.delayed',
 'Shipment delayed',
 'Fires when a shipment status is updated to delayed',
 'logistics', 'slate/shipment.delayed',
 '{"shipment_id":"uuid","tracking_number":"string","customer_name":"string","original_eta":"date","new_eta":"date","delay_reason":"string"}',
 '{"shipment_id":"ship-1","tracking_number":"TRK123456","customer_name":"XYZ Corp","original_eta":"2024-12-05","new_eta":"2024-12-07","delay_reason":"Customs clearance"}'),

('vehicle.service_due',
 'Vehicle service due',
 'Fires when a vehicle is due for scheduled maintenance',
 'logistics', 'slate/vehicle.service_due',
 '{"vehicle_id":"uuid","plate_number":"string","make":"string","model":"string","days_overdue":"number"}',
 '{"vehicle_id":"veh-1","plate_number":"GH-1234-A","make":"Toyota","model":"Hilux","days_overdue":5}'),

-- ── INSURANCE TRIGGERS ────────────────────────────────────────────────────────
('policy.expiring',
 'Policy expiring soon',
 'Fires when a policy is within the configured days of expiry',
 'insurance', 'slate/policy.expiring',
 '{"policy_id":"uuid","policy_number":"string","client_name":"string","client_email":"string","expiry_date":"date","premium":"number","days_remaining":"number"}',
 '{"policy_id":"pol-1","policy_number":"POL-2024-001","client_name":"Jane Doe","client_email":"jane@example.com","expiry_date":"2024-12-30","premium":2400,"days_remaining":30}'),

('claim.submitted',
 'Insurance claim submitted',
 'Fires when a new claim is submitted',
 'insurance', 'slate/claim.submitted',
 '{"claim_id":"uuid","claim_number":"string","client_name":"string","claim_type":"string","amount":"number","submitted_at":"datetime"}',
 '{"claim_id":"clm-1","claim_number":"CLM-2024-001","client_name":"Jane Doe","claim_type":"medical","amount":15000,"submitted_at":"2024-12-01T11:00:00Z"}'),

-- ── RELIGION TRIGGERS ─────────────────────────────────────────────────────────
('member.joined',
 'New member joined congregation',
 'Fires when a new member is added to the congregation',
 'religion', 'slate/member.joined',
 '{"member_id":"uuid","name":"string","email":"string","phone":"string","joined_date":"date"}',
 '{"member_id":"mem-1","name":"Grace Mensah","email":"grace@example.com","phone":"+233123456789","joined_date":"2024-12-01"}'),

('member.disengaged',
 'Member disengaged',
 'Fires when intelligence flags a member as disengaged (no attendance or giving in 90 days)',
 'religion', 'slate/member.disengaged',
 '{"member_id":"uuid","name":"string","email":"string","last_attendance":"date","days_absent":"number"}',
 '{"member_id":"mem-1","name":"Grace Mensah","email":"grace@example.com","last_attendance":"2024-09-01","days_absent":91}'),

('giving.received',
 'Giving/donation received',
 'Fires when a donation or tithe is recorded',
 'religion', 'slate/giving.received',
 '{"giving_id":"uuid","member_name":"string","member_email":"string","amount":"number","giving_type":"string","date":"date"}',
 '{"giving_id":"giv-1","member_name":"Grace Mensah","member_email":"grace@example.com","amount":200,"giving_type":"tithe","date":"2024-12-01"}')
ON CONFLICT (trigger_key) DO NOTHING;

INSERT INTO automation_actions
  (action_key, display_name, description, category, input_schema, output_schema, handler_function)
VALUES

('send_email',
 'Send email',
 'Send an email to one or more recipients',
 'notification',
 '{"to":{"type":"string","required":true,"description":"Email address or {{field}} reference"},"subject":{"type":"string","required":true},"body":{"type":"string","required":true},"cc":{"type":"string","required":false}}',
 '{"sent":{"type":"boolean"},"message_id":{"type":"string"}}',
 'automation.send_email'),

('send_in_app_notification',
 'Send in-app notification',
 'Send a notification inside Slate to a team member',
 'notification',
 '{"user_id":{"type":"string","required":true,"description":"User ID or {{field}} reference"},"title":{"type":"string","required":true},"message":{"type":"string","required":true},"link":{"type":"string","required":false}}',
 '{"sent":{"type":"boolean"}}',
 'automation.send_in_app_notification'),

('send_sms',
 'Send SMS',
 'Send an SMS message via the configured SMS provider',
 'notification',
 '{"to":{"type":"string","required":true,"description":"Phone number or {{field}} reference"},"message":{"type":"string","required":true,"max_length":160}}',
 '{"sent":{"type":"boolean"},"message_id":{"type":"string"}}',
 'automation.send_sms'),

('create_task',
 'Create task',
 'Create a new task and assign it to a team member',
 'task',
 '{"title":{"type":"string","required":true},"description":{"type":"string","required":false},"assignee_id":{"type":"string","required":false},"due_date":{"type":"string","required":false,"description":"ISO date or +Xdays"},"priority":{"type":"enum","values":["low","medium","high","urgent"],"default":"medium"}}',
 '{"task_id":{"type":"string"}}',
 'automation.create_task'),

('update_record_field',
 'Update a record field',
 'Update a specific field on the record that triggered this automation',
 'record',
 '{"field":{"type":"string","required":true,"description":"The field name to update"},"value":{"type":"string","required":true,"description":"The new value or {{expression}}"}}',
 '{"updated":{"type":"boolean"}}',
 'automation.update_record_field'),

('create_record',
 'Create a new record',
 'Create a new record in a specified table',
 'record',
 '{"table":{"type":"string","required":true},"data":{"type":"object","required":true}}',
 '{"record_id":{"type":"string"}}',
 'automation.create_record'),

('wait',
 'Wait / Delay',
 'Pause the automation for a specified duration before continuing',
 'control',
 '{"duration":{"type":"string","required":true,"description":"e.g. 24h, 3d, 1w"}}',
 '{}',
 'automation.wait'),

('condition_check',
 'Check a condition',
 'Continue only if a condition is true, otherwise stop or go to a different step',
 'control',
 '{"field":{"type":"string","required":true},"operator":{"type":"enum","values":["equals","not_equals","greater_than","less_than","contains","is_empty","is_not_empty"]},"value":{"type":"string","required":false},"on_false":{"type":"enum","values":["stop","continue"],"default":"stop"}}',
 '{"passed":{"type":"boolean"}}',
 'automation.condition_check'),

('generate_document',
 'Generate document from template',
 'Create a PDF document using a document template and the trigger data',
 'document',
 '{"template_id":{"type":"string","required":true},"output_name":{"type":"string","required":true},"attach_to_record":{"type":"boolean","default":true}}',
 '{"document_id":{"type":"string"},"document_url":{"type":"string"}}',
 'automation.generate_document'),

('add_tag',
 'Add a tag to a record',
 'Add one or more tags to the entity that triggered this automation',
 'record',
 '{"tags":{"type":"array","items":"string","required":true}}',
 '{"updated":{"type":"boolean"}}',
 'automation.add_tag'),

('assign_to_user',
 'Assign record to a team member',
 'Assign the triggering record to a specific team member',
 'record',
 '{"user_id":{"type":"string","required":true},"notify":{"type":"boolean","default":true}}',
 '{"updated":{"type":"boolean"}}',
 'automation.assign_to_user'),

('create_invoice',
 'Generate an invoice',
 'Create an invoice for a client or customer',
 'record',
 '{"client_id":{"type":"string","required":true},"line_items":{"type":"array","required":true},"due_days":{"type":"number","default":30},"notes":{"type":"string","required":false}}',
 '{"invoice_id":{"type":"string"}}',
 'automation.create_invoice'),

('webhook_call',
 'Call external webhook',
 'Send data to an external URL via HTTP POST',
 'integration',
 '{"url":{"type":"string","required":true},"payload":{"type":"object","required":true},"headers":{"type":"object","required":false}}',
 '{"status_code":{"type":"number"},"response":{"type":"object"}}',
 'automation.webhook_call')
ON CONFLICT (action_key) DO NOTHING;

INSERT INTO automations
  (company_id, name, description, trigger_key, trigger_filters, steps, is_active, is_template, template_vertical, created_by)
SELECT
  -- Null company_id = global template visible to all companies in the matching vertical
  NULL,
  name, description, trigger_key, trigger_filters::jsonb, steps::jsonb,
  false, true, template_vertical, NULL
FROM (VALUES

-- LEGAL TEMPLATES
('Case deadline reminder — 7 days',
 'Send an email to the assigned attorney 7 days before any case deadline',
 'case.deadline_approaching',
 '[{"field":"days_remaining","operator":"equals","value":"7"}]',
 '[{"action_key":"send_email","config":{"to":"{{assigned_to_email}}","subject":"Case deadline in 7 days: {{title}}","body":"This is a reminder that the case \"{{title}}\" for client {{client_name}} has a deadline on {{deadline}}. You have 7 days remaining."}}]',
 'legal'),

('Case deadline reminder — 1 day',
 'Send an urgent email and in-app notification 1 day before any case deadline',
 'case.deadline_approaching',
 '[{"field":"days_remaining","operator":"equals","value":"1"}]',
 '[{"action_key":"send_email","config":{"to":"{{assigned_to_email}}","subject":"URGENT: Case deadline TOMORROW: {{title}}","body":"The case \"{{title}}\" for client {{client_name}} has a deadline TOMORROW on {{deadline}}."}},{"action_key":"send_in_app_notification","config":{"user_id":"{{assigned_to_id}}","title":"URGENT: Deadline tomorrow","message":"Case {{title}} deadline is tomorrow"}}]',
 'legal'),

('New case onboarding task',
 'Create an onboarding checklist task when a new case is opened',
 'case.created',
 '[]',
 '[{"action_key":"create_task","config":{"title":"Complete intake for: {{title}}","description":"Gather all documents and complete client intake for {{client_name}}","assignee_id":"{{assigned_to_id}}","due_date":"+3days","priority":"high"}}]',
 'legal'),

('Invoice on case close',
 'Automatically generate an invoice when a case is closed',
 'case.closed',
 '[]',
 '[{"action_key":"create_invoice","config":{"client_id":"{{client_id}}","line_items":[{"description":"Legal services: {{title}}","quantity":1,"unit_price":0}],"due_days":30,"notes":"Thank you for choosing our firm."}}]',
 'legal'),

-- HOSPITAL TEMPLATES
('Appointment reminder 24h before',
 'Send an appointment reminder to the patient 24 hours before their appointment',
 'appointment.reminder_due',
 '[]',
 '[{"action_key":"send_email","config":{"to":"{{patient_email}}","subject":"Appointment reminder: {{appointment_type}} with {{doctor_name}}","body":"Dear {{patient_name}}, this is a reminder of your {{appointment_type}} appointment with {{doctor_name}} tomorrow. Please arrive 15 minutes early."}},{"action_key":"send_sms","config":{"to":"{{patient_phone}}","message":"Reminder: You have an appointment with {{doctor_name}} tomorrow. Reply CONFIRM to confirm."}}]',
 'hospital'),

('No-show follow-up task',
 'Create a follow-up task when a patient misses their appointment',
 'appointment.missed',
 '[]',
 '[{"action_key":"create_task","config":{"title":"Follow up with {{patient_name}} — missed appointment","description":"Patient {{patient_name}} missed their appointment on {{appointment_date}} with {{doctor_name}}. Call to reschedule.","due_date":"+1days","priority":"medium"}},{"action_key":"update_record_field","config":{"field":"no_show_count","value":"{{no_show_count + 1}}"}}]',
 'hospital'),

('Post-discharge follow-up',
 'Create a follow-up task and send discharge instructions when a patient is discharged',
 'patient.discharged',
 '[]',
 '[{"action_key":"send_email","config":{"to":"{{patient_email}}","subject":"Your discharge instructions from our hospital","body":"Dear {{patient_name}}, thank you for choosing us. Please find your discharge instructions attached. If you have any concerns, please contact us immediately."}},{"action_key":"create_task","config":{"title":"30-day follow-up call: {{patient_name}}","description":"Call patient {{patient_name}} for a 30-day post-discharge check-in","due_date":"+30days","priority":"low"}}]',
 'hospital'),

-- EDUCATION TEMPLATES
('Parent notification on student absence',
 'Notify parents when a student reaches the absence threshold',
 'student.absence_threshold',
 '[]',
 '[{"action_key":"send_email","config":{"to":"{{parent_email}}","subject":"Attendance notice: {{student_name}}","body":"Dear Parent/Guardian, this is to inform you that {{student_name}} has been absent {{absence_count}} times this term. Please contact the school to discuss attendance."}},{"action_key":"create_task","config":{"title":"Contact parents of {{student_name}} re: attendance","due_date":"+2days","priority":"high"}}]',
 'school'),

('Fee payment reminder',
 'Send a fee payment reminder to parents 7 days before due date',
 'fee.payment_due',
 '[{"field":"days_until_due","operator":"equals","value":"7"}]',
 '[{"action_key":"send_email","config":{"to":"{{parent_email}}","subject":"Fee payment reminder: {{student_name}}","body":"Dear Parent/Guardian, a payment of ${{amount}} is due in 7 days ({{due_date}}) for {{student_name}}. Please ensure payment is made on time."}}]',
 'school'),

-- HOTEL TEMPLATES
('Pre-arrival welcome email',
 'Send a personalised welcome email to guests the day before check-in',
 'booking.check_in_today',
 '[]',
 '[{"action_key":"send_email","config":{"to":"{{guest_email}}","subject":"Welcome, {{guest_name}}! Your stay at our hotel starts today","body":"Dear {{guest_name}}, we are delighted to welcome you today. Your room {{room_number}} will be ready from {{check_in_time}}. Special requests noted: {{special_requests}}. Safe travels!"}},{"action_key":"create_task","config":{"title":"Prepare room {{room_number}} for {{guest_name}}","description":"Guest arriving today. Check special requests: {{special_requests}}","due_date":"+0days","priority":"high"}}]',
 'hotel'),

('Post-checkout review request',
 'Request a review from guests after they check out',
 'booking.checkout_today',
 '[]',
 '[{"action_key":"wait","config":{"duration":"4h"}},{"action_key":"send_email","config":{"to":"{{guest_email}}","subject":"How was your stay, {{guest_name}}?","body":"Dear {{guest_name}}, thank you for staying with us for {{nights_stayed}} night(s). We hope you had a wonderful experience. We would love to hear your feedback."}}]',
 'hotel'),

-- HR TEMPLATES
('New employee onboarding tasks',
 'Create onboarding tasks when a new employee joins',
 'employee.hired',
 '[]',
 '[{"action_key":"send_email","config":{"to":"{{email}}","subject":"Welcome to the team, {{name}}!","body":"Dear {{name}}, welcome aboard! Your role is {{role}} in the {{department}} department. Your manager {{manager_name}} will be in touch shortly with your first week plan."}},{"action_key":"create_task","config":{"title":"Set up workstation for {{name}}","due_date":"{{start_date}}","priority":"high"}},{"action_key":"create_task","config":{"title":"Complete onboarding for {{name}} — {{role}}","description":"Complete all onboarding steps for {{name}} joining {{department}} on {{start_date}}","assignee_id":"{{manager_id}}","due_date":"+7days","priority":"medium"}}]',
 'hr'),

('Probation review reminder',
 'Remind managers to conduct probation reviews 2 weeks before probation ends',
 'employee.probation_ending',
 '[{"field":"days_remaining","operator":"equals","value":"14"}]',
 '[{"action_key":"send_email","config":{"to":"{{manager_email}}","subject":"Probation review due: {{name}}","body":"{{name}}s probation period ends on {{probation_end_date}} — in {{days_remaining}} days. Please schedule a probation review meeting and complete the evaluation form in Slate."}},{"action_key":"create_task","config":{"title":"Probation review: {{name}}","assignee_id":"{{manager_id}}","due_date":"+7days","priority":"high"}}]',
 'hr'),

-- RETAIL TEMPLATES
('Low stock reorder alert',
 'Alert the manager and create a reorder task when stock drops below reorder point',
 'product.low_stock',
 '[]',
 '[{"action_key":"send_in_app_notification","config":{"user_id":"owner","title":"Low stock: {{name}}","message":"{{name}} (SKU: {{sku}}) has only {{current_stock}} units left. At current sell rate, stock runs out in {{days_until_stockout}} days."}},{"action_key":"create_task","config":{"title":"Reorder: {{name}}","description":"Stock is low ({{current_stock}} units remaining, reorder at {{reorder_point}}). Create a purchase order.","priority":"high","due_date":"+1days"}}]',
 'retail'),

('Order confirmation email',
 'Send an order confirmation to customers immediately after purchase',
 'order.created',
 '[]',
 '[{"action_key":"send_email","config":{"to":"{{customer_email}}","subject":"Order confirmed — #{{order_id}}","body":"Dear {{customer_name}}, thank you for your order! Your order #{{order_id}} for {{items_count}} item(s) totalling ${{total}} has been received and is being processed."}}]',
 'retail'),

-- LOGISTICS TEMPLATES
('Shipment delay customer notification',
 'Notify customers immediately when their shipment is delayed',
 'shipment.delayed',
 '[]',
 '[{"action_key":"send_email","config":{"to":"{{customer_email}}","subject":"Update on your shipment {{tracking_number}}","body":"Dear {{customer_name}}, we want to inform you that your shipment {{tracking_number}} has been delayed. Original ETA: {{original_eta}}. New ETA: {{new_eta}}. Reason: {{delay_reason}}. We apologise for the inconvenience."}},{"action_key":"create_task","config":{"title":"Follow up on delayed shipment {{tracking_number}}","priority":"high","due_date":"+1days"}}]',
 'logistics'),

-- INSURANCE TEMPLATES
('Policy renewal outreach',
 'Start renewal outreach 30 days before a policy expires',
 'policy.expiring',
 '[{"field":"days_remaining","operator":"equals","value":"30"}]',
 '[{"action_key":"send_email","config":{"to":"{{client_email}}","subject":"Your policy {{policy_number}} expires in 30 days","body":"Dear {{client_name}}, your policy {{policy_number}} expires on {{expiry_date}}. Your annual premium is ${{premium}}. Please contact us to renew and ensure you remain covered."}},{"action_key":"create_task","config":{"title":"Follow up renewal: {{client_name}} — {{policy_number}}","priority":"high","due_date":"+7days"}}]',
 'insurance'),

-- RELIGION TEMPLATES
('New member welcome',
 'Send a welcome message and assign a pastoral care task for every new member',
 'member.joined',
 '[]',
 '[{"action_key":"send_email","config":{"to":"{{email}}","subject":"Welcome to our family, {{name}}!","body":"Dear {{name}}, on behalf of our entire congregation, we warmly welcome you. We are so glad you have joined us. Someone from our pastoral team will be in touch soon."}},{"action_key":"create_task","config":{"title":"Welcome visit: {{name}}","description":"New member {{name}} joined on {{joined_date}}. Schedule a welcome visit or call.","priority":"medium","due_date":"+7days"}}]',
 'religion'),

('Disengaged member pastoral outreach',
 'Create a pastoral care task when a member has been absent for 90 days',
 'member.disengaged',
 '[]',
 '[{"action_key":"create_task","config":{"title":"Pastoral care follow-up: {{name}}","description":"{{name}} has not attended or given in {{days_absent}} days (last attendance: {{last_attendance}}). Please reach out to check in.","priority":"medium","due_date":"+3days"}}]',
 'religion')

) AS t(name, description, trigger_key, trigger_filters, steps, template_vertical);
