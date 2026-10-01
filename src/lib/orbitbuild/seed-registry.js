import { powerSync } from '@/api/PowerSyncConnector';

const MODULES = [
  { module_key: 'dashboard_analytics', display_name: 'Analytics Dashboard', description: 'Custom charts, KPI widgets, and data export', category: 'reporting', config_schema: JSON.stringify({ fields: { default_period: { type: 'string', default: 'last_30_days' } } }) },
  { module_key: 'task_manager', display_name: 'Task Manager', description: 'Assign, track, and complete tasks with deadlines and priorities', category: 'operations', config_schema: JSON.stringify({ fields: { enable_kanban: { type: 'boolean', default: true } } }) },
  { module_key: 'team_messaging', display_name: 'Team Messaging', description: 'Internal chat with channels, direct messages, and file sharing', category: 'communication', config_schema: JSON.stringify({}) },
  { module_key: 'appointment_scheduler', display_name: 'Appointment Scheduler', description: 'Book, manage, and track appointments between staff and clients or customers', category: 'scheduling', config_schema: JSON.stringify({ fields: { appointment_duration_minutes: { type: 'number', default: 30 }, allow_online_booking: { type: 'boolean', default: true } } }) },
  { module_key: 'room_booking', display_name: 'Room & Space Booking', description: 'Reserve rooms, halls, or spaces for events and meetings', category: 'scheduling', config_schema: JSON.stringify({ fields: { require_approval: { type: 'boolean', default: false } } }) },
  { module_key: 'shift_scheduler', display_name: 'Staff Shift Scheduler', description: 'Plan, assign, and track employee shifts and rosters', category: 'scheduling', config_schema: JSON.stringify({}) },
  { module_key: 'client_crm', display_name: 'Client CRM', description: 'Track client profiles, contact history, and relationship status', category: 'crm', config_schema: JSON.stringify({ fields: { track_lifetime_value: { type: 'boolean', default: true } } }) },
  { module_key: 'patient_records', display_name: 'Patient Records', description: 'Medical history, diagnoses, prescriptions, and visit notes', category: 'records', config_schema: JSON.stringify({ fields: { enable_telemedicine: { type: 'boolean', default: false } } }) },
  { module_key: 'student_profiles', display_name: 'Student Profiles', description: 'Academic records, attendance, grades, and parent contact', category: 'records', config_schema: JSON.stringify({}) },
  { module_key: 'guest_profiles', display_name: 'Guest Profiles', description: 'Hotel guest history, preferences, and stay records', category: 'records', config_schema: JSON.stringify({}) },
  { module_key: 'congregation_members', display_name: 'Congregation Members', description: 'Member directory, attendance, giving, and pastoral notes', category: 'records', config_schema: JSON.stringify({}) },
  { module_key: 'inventory_manager', display_name: 'Inventory Manager', description: 'Track stock levels, reorder points, and product catalog', category: 'inventory', config_schema: JSON.stringify({ fields: { enable_barcode: { type: 'boolean', default: false }, low_stock_threshold: { type: 'number', default: 10 } } }) },
  { module_key: 'pharmacy_inventory', display_name: 'Pharmacy Inventory', description: 'Drug stock management with expiry tracking and reorder alerts', category: 'inventory', config_schema: JSON.stringify({}) },
  { module_key: 'invoicing', display_name: 'Invoicing & Billing', description: 'Create, send, and track invoices and payment status', category: 'finance', config_schema: JSON.stringify({ fields: { currency: { type: 'string', default: 'USD' }, tax_rate: { type: 'number', default: 0 } } }) },
  { module_key: 'payroll', display_name: 'Payroll Management', description: 'Calculate and process employee salaries, deductions, and benefits', category: 'finance', config_schema: JSON.stringify({}) },
  { module_key: 'donation_tracking', display_name: 'Donation & Giving Tracker', description: 'Record tithes, offerings, pledges, and mission giving', category: 'finance', config_schema: JSON.stringify({}) },
  { module_key: 'fee_management', display_name: 'Fee & Tuition Management', description: 'Manage student fee schedules, payments, and outstanding balances', category: 'finance', config_schema: JSON.stringify({}) },
  { module_key: 'employee_directory', display_name: 'Employee Directory', description: 'Staff profiles, departments, roles, and contact information', category: 'hr', config_schema: JSON.stringify({}) },
  { module_key: 'leave_management', display_name: 'Leave & Time-off Management', description: 'Leave requests, approvals, balances, and calendar visibility', category: 'hr', config_schema: JSON.stringify({ fields: { auto_approve_under_days: { type: 'number', default: 0 } } }) },
  { module_key: 'performance_reviews', display_name: 'Performance Reviews', description: 'Schedule, conduct, and track employee performance evaluations', category: 'hr', config_schema: JSON.stringify({ fields: { review_cycle_months: { type: 'number', default: 12 } } }) },
  { module_key: 'recruitment', display_name: 'Recruitment Pipeline', description: 'Job postings, candidate tracking, interviews, and offers', category: 'hr', config_schema: JSON.stringify({}) },
  { module_key: 'fleet_management', display_name: 'Fleet Management', description: 'Vehicle tracking, maintenance schedules, and driver assignments', category: 'operations', config_schema: JSON.stringify({}) },
  { module_key: 'case_pipeline', display_name: 'Case Pipeline', description: 'Legal case intake, progression tracking, and outcome recording', category: 'operations', config_schema: JSON.stringify({}) },
  { module_key: 'claims_management', display_name: 'Claims Management', description: 'Insurance claim intake, processing, review, and settlement', category: 'operations', config_schema: JSON.stringify({}) },
  { module_key: 'audit_log_viewer', display_name: 'Audit Log', description: 'Immutable record of all system actions for compliance', category: 'reporting', config_schema: JSON.stringify({}) },
  { module_key: 'email_inbox', display_name: 'Email Inbox', description: 'Send and receive emails directly within the workspace', category: 'communication', config_schema: JSON.stringify({}) },
  { module_key: 'announcement_board', display_name: 'Announcement Board', description: 'Post notices, circulars, and updates for the team or congregation', category: 'communication', config_schema: JSON.stringify({}) },
];

export async function seedRegistry() {
  for (const mod of MODULES) {
    const existing = await powerSync.execute(`SELECT id FROM component_registry WHERE module_key = ?`, [mod.module_key]);
    if (existing.rows._array.length === 0) {
      await powerSync.execute(
        `INSERT INTO component_registry (id, module_key, display_name, description, category, applicable_industries, config_schema, required_tables, is_active, created_at)
         VALUES (uuid(), ?, ?, ?, ?, '["*"]', ?, '[]', 1, datetime('now'))`,
        [mod.module_key, mod.display_name, mod.description, mod.category, mod.config_schema]
      );
    }
  }
}
