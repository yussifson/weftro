-- Seed Component Registry

DO $$
BEGIN
  -- Ensure component_registry has RLS and allows reads
  ALTER TABLE IF EXISTS component_registry ENABLE ROW LEVEL SECURITY;
  
  BEGIN
    DROP POLICY IF EXISTS "Allow public read access" ON component_registry;
CREATE POLICY "Allow public read access" ON component_registry 
    FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    DROP POLICY IF EXISTS "Allow service role full access" ON component_registry;
CREATE POLICY "Allow service role full access" ON component_registry 
    FOR ALL TO service_role USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

END $$;

INSERT INTO component_registry (id, module_key, display_name, description, category, applicable_industries, config_schema, required_tables, is_active, created_at)
VALUES 
(gen_random_uuid(), 'dashboard_analytics', 'Analytics Dashboard', 'Custom charts, KPI widgets, and data export', 'reporting', '["*"]', '{"fields": {"default_period": {"type": "string", "default": "last_30_days"}}}', '[]', true, now()),
(gen_random_uuid(), 'task_manager', 'Task Manager', 'Assign, track, and complete tasks with deadlines and priorities', 'operations', '["*"]', '{"fields": {"enable_kanban": {"type": "boolean", "default": true}}}', '[]', true, now()),
(gen_random_uuid(), 'team_messaging', 'Team Messaging', 'Internal chat with channels, direct messages, and file sharing', 'communication', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'appointment_scheduler', 'Appointment Scheduler', 'Book, manage, and track appointments between staff and clients or customers', 'scheduling', '["*"]', '{"fields": {"appointment_duration_minutes": {"type": "number", "default": 30}, "allow_online_booking": {"type": "boolean", "default": true}}}', '[]', true, now()),
(gen_random_uuid(), 'room_booking', 'Room & Space Booking', 'Reserve rooms, halls, or spaces for events and meetings', 'scheduling', '["*"]', '{"fields": {"require_approval": {"type": "boolean", "default": false}}}', '[]', true, now()),
(gen_random_uuid(), 'shift_scheduler', 'Staff Shift Scheduler', 'Plan, assign, and track employee shifts and rosters', 'scheduling', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'client_crm', 'Client CRM', 'Track client profiles, contact history, and relationship status', 'crm', '["*"]', '{"fields": {"track_lifetime_value": {"type": "boolean", "default": true}}}', '[]', true, now()),
(gen_random_uuid(), 'patient_records', 'Patient Records', 'Medical history, diagnoses, prescriptions, and visit notes', 'records', '["*"]', '{"fields": {"enable_telemedicine": {"type": "boolean", "default": false}}}', '[]', true, now()),
(gen_random_uuid(), 'student_profiles', 'Student Profiles', 'Academic records, attendance, grades, and parent contact', 'records', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'guest_profiles', 'Guest Profiles', 'Hotel guest history, preferences, and stay records', 'records', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'congregation_members', 'Congregation Members', 'Member directory, attendance, giving, and pastoral notes', 'records', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'inventory_manager', 'Inventory Manager', 'Track stock levels, reorder points, and product catalog', 'inventory', '["*"]', '{"fields": {"enable_barcode": {"type": "boolean", "default": false}, "low_stock_threshold": {"type": "number", "default": 10}}}', '[]', true, now()),
(gen_random_uuid(), 'pharmacy_inventory', 'Pharmacy Inventory', 'Drug stock management with expiry tracking and reorder alerts', 'inventory', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'invoicing', 'Invoicing & Billing', 'Create, send, and track invoices and payment status', 'finance', '["*"]', '{"fields": {"currency": {"type": "string", "default": "USD"}, "tax_rate": {"type": "number", "default": 0}}}', '[]', true, now()),
(gen_random_uuid(), 'payroll', 'Payroll Management', 'Calculate and process employee salaries, deductions, and benefits', 'finance', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'donation_tracking', 'Donation & Giving Tracker', 'Record tithes, offerings, pledges, and mission giving', 'finance', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'fee_management', 'Fee & Tuition Management', 'Manage student fee schedules, payments, and outstanding balances', 'finance', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'employee_directory', 'Employee Directory', 'Staff profiles, departments, roles, and contact information', 'hr', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'leave_management', 'Leave & Time-off Management', 'Leave requests, approvals, balances, and calendar visibility', 'hr', '["*"]', '{"fields": {"auto_approve_under_days": {"type": "number", "default": 0}}}', '[]', true, now()),
(gen_random_uuid(), 'performance_reviews', 'Performance Reviews', 'Schedule, conduct, and track employee performance evaluations', 'hr', '["*"]', '{"fields": {"review_cycle_months": {"type": "number", "default": 12}}}', '[]', true, now()),
(gen_random_uuid(), 'recruitment', 'Recruitment Pipeline', 'Job postings, candidate tracking, interviews, and offers', 'hr', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'fleet_management', 'Fleet Management', 'Vehicle tracking, maintenance schedules, and driver assignments', 'operations', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'case_pipeline', 'Case Pipeline', 'Legal case intake, progression tracking, and outcome recording', 'operations', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'claims_management', 'Claims Management', 'Insurance claim intake, processing, review, and settlement', 'operations', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'audit_log_viewer', 'Audit Log', 'Immutable record of all system actions for compliance', 'reporting', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'email_inbox', 'Email Inbox', 'Send and receive emails directly within the workspace', 'communication', '["*"]', '{}', '[]', true, now()),
(gen_random_uuid(), 'announcement_board', 'Announcement Board', 'Post notices, circulars, and updates for the team or congregation', 'communication', '["*"]', '{}', '[]', true, now())
ON CONFLICT (module_key) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    config_schema = EXCLUDED.config_schema,
    is_active = true;
