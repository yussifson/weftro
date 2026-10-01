-- Ensure all tables exist before altering them

CREATE TABLE IF NOT EXISTS "public"."industry_records" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."industry_records" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."industry_records" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."industry_records" ADD COLUMN IF NOT EXISTS "industry" text;
ALTER TABLE "public"."industry_records" ADD COLUMN IF NOT EXISTS "record_type" text;
ALTER TABLE "public"."industry_records" ADD COLUMN IF NOT EXISTS "data" text;
ALTER TABLE "public"."industry_records" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."industry_records" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."industry_records" ADD COLUMN IF NOT EXISTS "search_text" text;

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "user_email" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "user_name" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "action" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "entity_id" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "entity_label" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "details" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "ip_address" text;
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "severity" text;

CREATE TABLE IF NOT EXISTS "public"."case_emails" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "sender_email" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "recipient_email" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "received_date" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "body_preview" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "logged_by" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "direction" text;
ALTER TABLE "public"."case_emails" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."case_messages" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "sender_email" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "sender_name" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "tagged_emails" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "document_links" text;
ALTER TABLE "public"."case_messages" ADD COLUMN IF NOT EXISTS "read_by" text;

CREATE TABLE IF NOT EXISTS "public"."case_outcomes" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "assigned_lawyer" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "assigned_lawyer_name" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "outcome" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "outcome_date" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "outcome_summary" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "settlement_amount" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "duration_days" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "court_name" text;
ALTER TABLE "public"."case_outcomes" ADD COLUMN IF NOT EXISTS "judge_name" text;

CREATE TABLE IF NOT EXISTS "public"."case_pipelines" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."case_pipelines" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."case_pipelines" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."case_pipelines" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."case_pipelines" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."case_pipelines" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."case_pipelines" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."case_pipelines" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."case_pipelines" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."case_pipelines" ADD COLUMN IF NOT EXISTS "stages" text;
ALTER TABLE "public"."case_pipelines" ADD COLUMN IF NOT EXISTS "is_default" text;

CREATE TABLE IF NOT EXISTS "public"."case_pipeline_states" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "pipeline_id" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "pipeline_name" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "current_stage_id" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "current_stage_name" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "stage_entered_at" text;
ALTER TABLE "public"."case_pipeline_states" ADD COLUMN IF NOT EXISTS "stage_history" text;

CREATE TABLE IF NOT EXISTS "public"."clients" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "id_number" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "total_cases" text;
ALTER TABLE "public"."clients" ADD COLUMN IF NOT EXISTS "total_billed" text;

CREATE TABLE IF NOT EXISTS "public"."client_checklists" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "client_email" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "assigned_by" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "assigned_by_name" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "completed_at" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."client_checklists" ADD COLUMN IF NOT EXISTS "document_id" text;

CREATE TABLE IF NOT EXISTS "public"."client_messages" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "sender_email" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "sender_name" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "sender_type" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "read_by_lawyer" text;
ALTER TABLE "public"."client_messages" ADD COLUMN IF NOT EXISTS "read_by_client" text;

CREATE TABLE IF NOT EXISTS "public"."companies" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "subdomain" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "logo_light_url" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "favicon_url" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "tagline" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "primary_color" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "subscription_plan" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "subscription_status" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "max_users" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "max_cases" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "max_storage_gb" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "admin_email" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "custom_email_domain" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "custom_email_verified" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "industry_type" text;

CREATE TABLE IF NOT EXISTS "public"."documents" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "file_url" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "file_type" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "file_size" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "filing_date" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "uploaded_by" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "version" text;
ALTER TABLE "public"."documents" ADD COLUMN IF NOT EXISTS "shared_with_client" text;

CREATE TABLE IF NOT EXISTS "public"."expenses" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "amount" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "expense_date" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "receipt_url" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "logged_by" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "logged_by_name" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "billable" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "billed" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "invoice_id" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."firm_settings" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."firm_settings" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."firm_settings" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."firm_settings" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."firm_settings" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."firm_settings" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."firm_settings" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."firm_settings" ADD COLUMN IF NOT EXISTS "custom_case_types" text;
ALTER TABLE "public"."firm_settings" ADD COLUMN IF NOT EXISTS "custom_case_statuses" text;
ALTER TABLE "public"."firm_settings" ADD COLUMN IF NOT EXISTS "custom_task_types" text;
ALTER TABLE "public"."firm_settings" ADD COLUMN IF NOT EXISTS "custom_document_categories" text;
ALTER TABLE "public"."firm_settings" ADD COLUMN IF NOT EXISTS "custom_roles" text;

CREATE TABLE IF NOT EXISTS "public"."hearings" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "case_number" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "time" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "court_name" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "judge_name" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "lawyer_email" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "lawyer_name" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."hearings" ADD COLUMN IF NOT EXISTS "outcome" text;

CREATE TABLE IF NOT EXISTS "public"."h_r_complaints" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "against_email" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "against_name" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "resolution_notes" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "resolved_by" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "resolved_at" text;
ALTER TABLE "public"."h_r_complaints" ADD COLUMN IF NOT EXISTS "is_anonymous" text;

CREATE TABLE IF NOT EXISTS "public"."invoices" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "invoice_number" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "items" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "subtotal" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "tax_rate" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "tax_amount" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "total_amount" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "paid_date" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "payment_method" text;
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."leads" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "full_name" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "organization" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "case_description" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "urgency" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "assigned_to" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."leads" ADD COLUMN IF NOT EXISTS "preferred_contact" text;

CREATE TABLE IF NOT EXISTS "public"."leave_requests" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "staff_id" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "leave_type" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "days_requested" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "reviewed_by" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "reviewed_at" text;
ALTER TABLE "public"."leave_requests" ADD COLUMN IF NOT EXISTS "review_notes" text;

CREATE TABLE IF NOT EXISTS "public"."legal_cases" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "case_number" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "assigned_lawyer" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "assigned_lawyer_name" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "court_name" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "judge_name" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "opposing_party" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "opposing_counsel" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "filing_date" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "next_hearing_date" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."legal_cases" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."linked_emails" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "from_email" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "from_name" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "to_email" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "body" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "email_date" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "logged_by" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "direction" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "tags" text;
ALTER TABLE "public"."linked_emails" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "recipient_email" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "recipient_name" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "related_id" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "is_read" text;
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "email_sent" text;

CREATE TABLE IF NOT EXISTS "public"."payroll_slips" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "staff_role" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "department" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "pay_period" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "basic_salary" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "allowances" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "deductions" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "gross_salary" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "total_deductions" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "net_salary" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "leave_days_taken" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "approved_at" text;
ALTER TABLE "public"."payroll_slips" ADD COLUMN IF NOT EXISTS "paid_at" text;

CREATE TABLE IF NOT EXISTS "public"."promotions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "from_role" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "to_role" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "from_salary" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "to_salary" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "effective_date" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."promotions" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."retainers" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "initial_deposit" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "current_balance" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "total_deducted" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "alert_threshold" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "alert_triggered" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."retainers" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."signature_requests" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "document_id" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "document_name" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "client_email" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "sent_by" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "sent_by_name" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "sent_at" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "opened_at" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "signed_at" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "signature_data" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "signature_ip" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "signature_token" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE "public"."signature_requests" ADD COLUMN IF NOT EXISTS "expires_at" text;

CREATE TABLE IF NOT EXISTS "public"."staff_permissions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "staff_id" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_view_cases" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_create_cases" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_edit_cases" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_delete_cases" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_view_clients" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_create_clients" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_edit_clients" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_delete_clients" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_view_invoices" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_create_invoices" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_view_documents" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_upload_documents" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_delete_documents" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_view_tasks" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_create_tasks" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_view_team" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_view_reports" text;
ALTER TABLE "public"."staff_permissions" ADD COLUMN IF NOT EXISTS "can_manage_leave" text;

CREATE TABLE IF NOT EXISTS "public"."staff_records" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "user_email" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "full_name" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "role" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "department" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "hire_date" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "salary" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "leave_balance" text;
ALTER TABLE "public"."staff_records" ADD COLUMN IF NOT EXISTS "bar_number" text;

CREATE TABLE IF NOT EXISTS "public"."module_definitions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "icon" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "config" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "industry_type" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."module_definitions" ADD COLUMN IF NOT EXISTS "is_active" text;

CREATE TABLE IF NOT EXISTS "public"."field_definitions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."field_definitions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."field_definitions" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."field_definitions" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."field_definitions" ADD COLUMN IF NOT EXISTS "module_id" text;
ALTER TABLE "public"."field_definitions" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."field_definitions" ADD COLUMN IF NOT EXISTS "field_type" text;
ALTER TABLE "public"."field_definitions" ADD COLUMN IF NOT EXISTS "options" text;
ALTER TABLE "public"."field_definitions" ADD COLUMN IF NOT EXISTS "is_required" text;
ALTER TABLE "public"."field_definitions" ADD COLUMN IF NOT EXISTS "order_index" text;

CREATE TABLE IF NOT EXISTS "public"."dynamic_records" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."dynamic_records" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."dynamic_records" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."dynamic_records" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."dynamic_records" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."dynamic_records" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."dynamic_records" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."dynamic_records" ADD COLUMN IF NOT EXISTS "module_id" text;
ALTER TABLE "public"."dynamic_records" ADD COLUMN IF NOT EXISTS "data" text;
ALTER TABLE "public"."dynamic_records" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."subscription_invoices" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "admin_email" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "plan" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "plan_name" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "amount_usd" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "billing_period" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "paid_date" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "payment_method" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "reminder_count" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "last_reminder_at" text;
ALTER TABLE "public"."subscription_invoices" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."tasks" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "assigned_to" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "assigned_to_name" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "assigned_by" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "completed_date" text;
ALTER TABLE "public"."tasks" ADD COLUMN IF NOT EXISTS "category" text;

CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "case_number" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "lawyer_email" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "lawyer_name" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "start_time" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "end_time" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "duration_minutes" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "hourly_rate" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "billable_amount" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "is_billable" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "billed" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "invoice_id" text;
ALTER TABLE "public"."time_entries" ADD COLUMN IF NOT EXISTS "category" text;

CREATE TABLE IF NOT EXISTS "public"."sync_errors" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."sync_errors" ADD COLUMN IF NOT EXISTS "table_name" text;
ALTER TABLE "public"."sync_errors" ADD COLUMN IF NOT EXISTS "operation" text;
ALTER TABLE "public"."sync_errors" ADD COLUMN IF NOT EXISTS "record_id" text;
ALTER TABLE "public"."sync_errors" ADD COLUMN IF NOT EXISTS "error_code" text;
ALTER TABLE "public"."sync_errors" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "public"."sync_errors" ADD COLUMN IF NOT EXISTS "failed_at" text;
ALTER TABLE "public"."sync_errors" ADD COLUMN IF NOT EXISTS "raw_payload" text;
ALTER TABLE "public"."sync_errors" ADD COLUMN IF NOT EXISTS "acknowledged" text;

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "role" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "full_name" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "avatar_url" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "department" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "bar_number" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "industry_type" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "onboarding_completed" text;

CREATE TABLE IF NOT EXISTS "public"."school_students" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "id_number" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "total_cases" text;
ALTER TABLE "public"."school_students" ADD COLUMN IF NOT EXISTS "total_billed" text;

CREATE TABLE IF NOT EXISTS "public"."school_classes" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "case_number" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "assigned_staff" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "assigned_staff_name" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."school_classes" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."school_sessions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "time" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "venue_name" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."school_sessions" ADD COLUMN IF NOT EXISTS "outcome" text;

CREATE TABLE IF NOT EXISTS "public"."hospital_patients" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "id_number" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "total_cases" text;
ALTER TABLE "public"."hospital_patients" ADD COLUMN IF NOT EXISTS "total_billed" text;

CREATE TABLE IF NOT EXISTS "public"."hospital_admissions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "case_number" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "assigned_staff" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "assigned_staff_name" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."hospital_admissions" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."hospital_appointments" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "time" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "venue_name" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."hospital_appointments" ADD COLUMN IF NOT EXISTS "outcome" text;

CREATE TABLE IF NOT EXISTS "public"."hotel_guests" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "id_number" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "total_cases" text;
ALTER TABLE "public"."hotel_guests" ADD COLUMN IF NOT EXISTS "total_billed" text;

CREATE TABLE IF NOT EXISTS "public"."hotel_bookings" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "case_number" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "assigned_staff" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "assigned_staff_name" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."hotel_bookings" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."hotel_reservations" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "time" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "venue_name" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."hotel_reservations" ADD COLUMN IF NOT EXISTS "outcome" text;

CREATE TABLE IF NOT EXISTS "public"."religion_members" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "id_number" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "total_cases" text;
ALTER TABLE "public"."religion_members" ADD COLUMN IF NOT EXISTS "total_billed" text;

CREATE TABLE IF NOT EXISTS "public"."religion_groups" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "case_number" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "assigned_staff" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "assigned_staff_name" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."religion_groups" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."religion_events" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "time" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "venue_name" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."religion_events" ADD COLUMN IF NOT EXISTS "outcome" text;

CREATE TABLE IF NOT EXISTS "public"."insurance_policyholders" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "id_number" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "total_cases" text;
ALTER TABLE "public"."insurance_policyholders" ADD COLUMN IF NOT EXISTS "total_billed" text;

CREATE TABLE IF NOT EXISTS "public"."insurance_claims" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "case_number" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "assigned_staff" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "assigned_staff_name" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."insurance_claims" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."insurance_meetings" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "time" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "venue_name" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."insurance_meetings" ADD COLUMN IF NOT EXISTS "outcome" text;

CREATE TABLE IF NOT EXISTS "public"."retail_customers" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "id_number" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "total_cases" text;
ALTER TABLE "public"."retail_customers" ADD COLUMN IF NOT EXISTS "total_billed" text;

CREATE TABLE IF NOT EXISTS "public"."retail_orders" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "case_number" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "assigned_staff" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "assigned_staff_name" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."retail_orders" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."retail_shifts" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "time" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "venue_name" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."retail_shifts" ADD COLUMN IF NOT EXISTS "outcome" text;

CREATE TABLE IF NOT EXISTS "public"."logistics_shippers" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "id_number" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "total_cases" text;
ALTER TABLE "public"."logistics_shippers" ADD COLUMN IF NOT EXISTS "total_billed" text;

CREATE TABLE IF NOT EXISTS "public"."logistics_shipments" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "case_number" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "assigned_staff" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "assigned_staff_name" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."logistics_shipments" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."logistics_dispatches" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "time" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "venue_name" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."logistics_dispatches" ADD COLUMN IF NOT EXISTS "outcome" text;

CREATE TABLE IF NOT EXISTS "public"."hr_employees" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "id_number" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "total_cases" text;
ALTER TABLE "public"."hr_employees" ADD COLUMN IF NOT EXISTS "total_billed" text;

CREATE TABLE IF NOT EXISTS "public"."hr_projects" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "case_number" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "case_type" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "assigned_staff" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "assigned_staff_name" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."hr_projects" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."hr_interviews" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "case_id" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "case_title" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "time" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "venue_name" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "staff_email" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "staff_name" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."hr_interviews" ADD COLUMN IF NOT EXISTS "outcome" text;

CREATE TABLE IF NOT EXISTS "public"."online_courses" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "instructor_id" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "instructor_name" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "price" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "level" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "duration_hours" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "rating" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "total_reviews" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "total_students" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "featured" text;
ALTER TABLE "public"."online_courses" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."online_lessons" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "course_id" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "video_url" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "order_index" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "is_preview" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "duration_minutes" text;
ALTER TABLE "public"."online_lessons" ADD COLUMN IF NOT EXISTS "resources" text;

CREATE TABLE IF NOT EXISTS "public"."online_enrollments" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "course_id" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "student_id" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "student_name" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "student_email" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "enrollment_date" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "progress_percent" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "last_accessed" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "certificate_issued" text;
ALTER TABLE "public"."online_enrollments" ADD COLUMN IF NOT EXISTS "certificate_url" text;

CREATE TABLE IF NOT EXISTS "public"."online_assessments" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "course_id" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "lesson_id" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "questions" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "passing_score" text;
ALTER TABLE "public"."online_assessments" ADD COLUMN IF NOT EXISTS "time_limit_minutes" text;

CREATE TABLE IF NOT EXISTS "public"."online_certificates" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "enrollment_id" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "student_id" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "student_name" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "course_id" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "course_title" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "issue_date" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "credential_id" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "pdf_url" text;
ALTER TABLE "public"."online_certificates" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."connected_apps" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."connected_apps" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."connected_apps" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "public"."connected_apps" ADD COLUMN IF NOT EXISTS "access_token" text;
ALTER TABLE "public"."connected_apps" ADD COLUMN IF NOT EXISTS "refresh_token" text;
ALTER TABLE "public"."connected_apps" ADD COLUMN IF NOT EXISTS "expires_at" text;
ALTER TABLE "public"."connected_apps" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."connected_apps" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."connected_apps" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."connected_apps" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."connected_apps" ADD COLUMN IF NOT EXISTS "updated_date" text;

CREATE TABLE IF NOT EXISTS "public"."chat_rooms" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."chat_rooms" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."chat_rooms" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."chat_rooms" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."chat_rooms" ADD COLUMN IF NOT EXISTS "updated_date" text;
ALTER TABLE "public"."chat_rooms" ADD COLUMN IF NOT EXISTS "room_type" text;
ALTER TABLE "public"."chat_rooms" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."chat_rooms" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."chat_rooms" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "public"."chat_rooms" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."chat_participants" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."chat_participants" ADD COLUMN IF NOT EXISTS "room_id" text;
ALTER TABLE "public"."chat_participants" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "public"."chat_participants" ADD COLUMN IF NOT EXISTS "role" text;
ALTER TABLE "public"."chat_participants" ADD COLUMN IF NOT EXISTS "joined_at" text;
ALTER TABLE "public"."chat_participants" ADD COLUMN IF NOT EXISTS "last_read_at" text;

CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."chat_messages" ADD COLUMN IF NOT EXISTS "room_id" text;
ALTER TABLE "public"."chat_messages" ADD COLUMN IF NOT EXISTS "sender_id" text;
ALTER TABLE "public"."chat_messages" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "public"."chat_messages" ADD COLUMN IF NOT EXISTS "is_edited" text;
ALTER TABLE "public"."chat_messages" ADD COLUMN IF NOT EXISTS "is_deleted" text;
ALTER TABLE "public"."chat_messages" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."chat_messages" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."chat_messages" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."chat_messages" ADD COLUMN IF NOT EXISTS "updated_date" text;

CREATE TABLE IF NOT EXISTS "public"."video_rooms" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."video_rooms" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."video_rooms" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."video_rooms" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."video_rooms" ADD COLUMN IF NOT EXISTS "daily_room_url" text;
ALTER TABLE "public"."video_rooms" ADD COLUMN IF NOT EXISTS "daily_room_name" text;
ALTER TABLE "public"."video_rooms" ADD COLUMN IF NOT EXISTS "host_id" text;
ALTER TABLE "public"."video_rooms" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."video_rooms" ADD COLUMN IF NOT EXISTS "started_at" text;
ALTER TABLE "public"."video_rooms" ADD COLUMN IF NOT EXISTS "ended_at" text;
ALTER TABLE "public"."video_rooms" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."video_rooms" ADD COLUMN IF NOT EXISTS "created_date" text;

CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "paystack_plan_code" text;
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "price_monthly" text;
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "price_yearly" text;
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "features" text;
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "limits" text;
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "is_active" text;
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "updated_date" text;

CREATE TABLE IF NOT EXISTS "public"."company_subscriptions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."company_subscriptions" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."company_subscriptions" ADD COLUMN IF NOT EXISTS "plan_id" text;
ALTER TABLE "public"."company_subscriptions" ADD COLUMN IF NOT EXISTS "paystack_customer_code" text;
ALTER TABLE "public"."company_subscriptions" ADD COLUMN IF NOT EXISTS "paystack_subscription_code" text;
ALTER TABLE "public"."company_subscriptions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."company_subscriptions" ADD COLUMN IF NOT EXISTS "current_period_end" text;
ALTER TABLE "public"."company_subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at_period_end" text;
ALTER TABLE "public"."company_subscriptions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."company_subscriptions" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."company_subscriptions" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."company_subscriptions" ADD COLUMN IF NOT EXISTS "updated_date" text;

CREATE TABLE IF NOT EXISTS "public"."usage_metrics" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."usage_metrics" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."usage_metrics" ADD COLUMN IF NOT EXISTS "metric_name" text;
ALTER TABLE "public"."usage_metrics" ADD COLUMN IF NOT EXISTS "used_amount" text;
ALTER TABLE "public"."usage_metrics" ADD COLUMN IF NOT EXISTS "period_start" text;
ALTER TABLE "public"."usage_metrics" ADD COLUMN IF NOT EXISTS "period_end" text;
ALTER TABLE "public"."usage_metrics" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."usage_metrics" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."usage_metrics" ADD COLUMN IF NOT EXISTS "updated_at" text;
ALTER TABLE "public"."usage_metrics" ADD COLUMN IF NOT EXISTS "updated_date" text;

CREATE TABLE IF NOT EXISTS "public"."billing_transactions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."billing_transactions" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."billing_transactions" ADD COLUMN IF NOT EXISTS "paystack_reference" text;
ALTER TABLE "public"."billing_transactions" ADD COLUMN IF NOT EXISTS "amount" text;
ALTER TABLE "public"."billing_transactions" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."billing_transactions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."billing_transactions" ADD COLUMN IF NOT EXISTS "transaction_type" text;
ALTER TABLE "public"."billing_transactions" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."billing_transactions" ADD COLUMN IF NOT EXISTS "paid_at" text;
ALTER TABLE "public"."billing_transactions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."billing_transactions" ADD COLUMN IF NOT EXISTS "created_date" text;

CREATE TABLE IF NOT EXISTS "public"."univ_accesscontrols" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_accesscontrols" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_accesscontrols" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_accesscontrols" ADD COLUMN IF NOT EXISTS "user_name" text;
ALTER TABLE "public"."univ_accesscontrols" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."univ_accesscontrols" ADD COLUMN IF NOT EXISTS "role" text;
ALTER TABLE "public"."univ_accesscontrols" ADD COLUMN IF NOT EXISTS "resource" text;
ALTER TABLE "public"."univ_accesscontrols" ADD COLUMN IF NOT EXISTS "permission_level" text;
ALTER TABLE "public"."univ_accesscontrols" ADD COLUMN IF NOT EXISTS "granted_by" text;
ALTER TABLE "public"."univ_accesscontrols" ADD COLUMN IF NOT EXISTS "expiry_date" text;
ALTER TABLE "public"."univ_accesscontrols" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_adspend" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_adspend" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_adspend" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_advocacy" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_advocacy" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_advocacy" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_affiliateprogram" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_affiliateprogram" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_affiliateprogram" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_agentcommissions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_agentcommissions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_agentcommissions" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_agentcommissions" ADD COLUMN IF NOT EXISTS "agent_name" text;
ALTER TABLE "public"."univ_agentcommissions" ADD COLUMN IF NOT EXISTS "sale_amount" text;
ALTER TABLE "public"."univ_agentcommissions" ADD COLUMN IF NOT EXISTS "commission_rate" text;
ALTER TABLE "public"."univ_agentcommissions" ADD COLUMN IF NOT EXISTS "commission_amount" text;
ALTER TABLE "public"."univ_agentcommissions" ADD COLUMN IF NOT EXISTS "sale_date" text;
ALTER TABLE "public"."univ_agentcommissions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_agentcommissions" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."univ_allergylist" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_allergylist" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_allergylist" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_alumnis" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_alumnis" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_alumnis" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_apiintegrations" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_apiintegrations" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_apiintegrations" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_apiintegrations" ADD COLUMN IF NOT EXISTS "integration_name" text;
ALTER TABLE "public"."univ_apiintegrations" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "public"."univ_apiintegrations" ADD COLUMN IF NOT EXISTS "api_endpoint" text;
ALTER TABLE "public"."univ_apiintegrations" ADD COLUMN IF NOT EXISTS "auth_type" text;
ALTER TABLE "public"."univ_apiintegrations" ADD COLUMN IF NOT EXISTS "environment" text;
ALTER TABLE "public"."univ_apiintegrations" ADD COLUMN IF NOT EXISTS "last_tested" text;
ALTER TABLE "public"."univ_apiintegrations" ADD COLUMN IF NOT EXISTS "rate_limit" text;
ALTER TABLE "public"."univ_apiintegrations" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_apiintegrations" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_appointments" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "client_email" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "client_phone" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "time" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "duration_minutes" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_arbitration" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_arbitration" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_arbitration" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_arbitration" ADD COLUMN IF NOT EXISTS "case_name" text;
ALTER TABLE "public"."univ_arbitration" ADD COLUMN IF NOT EXISTS "arbitrator" text;
ALTER TABLE "public"."univ_arbitration" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."univ_arbitration" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_assemblylines" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_assemblylines" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_assemblylines" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_assets" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_assets" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_assets" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_assets" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."univ_assets" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."univ_assets" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_assets" ADD COLUMN IF NOT EXISTS "purchase_date" text;
ALTER TABLE "public"."univ_assets" ADD COLUMN IF NOT EXISTS "purchase_value" text;

CREATE TABLE IF NOT EXISTS "public"."univ_attendance" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_attendance" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_attendance" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_attendance" ADD COLUMN IF NOT EXISTS "employee_name" text;
ALTER TABLE "public"."univ_attendance" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."univ_attendance" ADD COLUMN IF NOT EXISTS "check_in" text;
ALTER TABLE "public"."univ_attendance" ADD COLUMN IF NOT EXISTS "check_out" text;
ALTER TABLE "public"."univ_attendance" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_attendance" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."univ_audittrails" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_audittrails" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_audittrails" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_audittrails" ADD COLUMN IF NOT EXISTS "action" text;
ALTER TABLE "public"."univ_audittrails" ADD COLUMN IF NOT EXISTS "user_name" text;
ALTER TABLE "public"."univ_audittrails" ADD COLUMN IF NOT EXISTS "module" text;
ALTER TABLE "public"."univ_audittrails" ADD COLUMN IF NOT EXISTS "record_affected" text;
ALTER TABLE "public"."univ_audittrails" ADD COLUMN IF NOT EXISTS "ip_address" text;
ALTER TABLE "public"."univ_audittrails" ADD COLUMN IF NOT EXISTS "timestamp" text;
ALTER TABLE "public"."univ_audittrails" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_audittrails" ADD COLUMN IF NOT EXISTS "severity" text;

CREATE TABLE IF NOT EXISTS "public"."univ_bankreconciliations" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_bankreconciliations" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_bankreconciliations" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_beneficiarylist" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_beneficiarylist" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_beneficiarylist" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_benefitelection" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_benefitelection" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_benefitelection" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_billofladings" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_billofladings" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_billofladings" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_blueprints" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_blueprints" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_blueprints" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_boms" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_boms" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_boms" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_boms" ADD COLUMN IF NOT EXISTS "product_name" text;
ALTER TABLE "public"."univ_boms" ADD COLUMN IF NOT EXISTS "material_name" text;
ALTER TABLE "public"."univ_boms" ADD COLUMN IF NOT EXISTS "quantity_required" text;
ALTER TABLE "public"."univ_boms" ADD COLUMN IF NOT EXISTS "unit" text;
ALTER TABLE "public"."univ_boms" ADD COLUMN IF NOT EXISTS "cost_per_unit" text;
ALTER TABLE "public"."univ_boms" ADD COLUMN IF NOT EXISTS "total_cost" text;
ALTER TABLE "public"."univ_boms" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_bookings" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "booking_reference" text;
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "guest_name" text;
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "guest_email" text;
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "guest_phone" text;
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "check_in" text;
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "check_out" text;
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "room_type" text;
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "number_of_guests" text;
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_bookings" ADD COLUMN IF NOT EXISTS "total_amount" text;

CREATE TABLE IF NOT EXISTS "public"."univ_boqs" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_boqs" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_boqs" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_boqs" ADD COLUMN IF NOT EXISTS "project_name" text;
ALTER TABLE "public"."univ_boqs" ADD COLUMN IF NOT EXISTS "item_description" text;
ALTER TABLE "public"."univ_boqs" ADD COLUMN IF NOT EXISTS "unit" text;
ALTER TABLE "public"."univ_boqs" ADD COLUMN IF NOT EXISTS "quantity" text;
ALTER TABLE "public"."univ_boqs" ADD COLUMN IF NOT EXISTS "unit_rate" text;
ALTER TABLE "public"."univ_boqs" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_brandasset" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_brandasset" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_brandasset" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_briefs" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_briefs" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_briefs" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_briefs" ADD COLUMN IF NOT EXISTS "case_name" text;
ALTER TABLE "public"."univ_briefs" ADD COLUMN IF NOT EXISTS "brief_type" text;
ALTER TABLE "public"."univ_briefs" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."univ_briefs" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_budgetforecasts" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_budgetforecasts" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_budgetforecasts" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_budgetforecasts" ADD COLUMN IF NOT EXISTS "department" text;
ALTER TABLE "public"."univ_budgetforecasts" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."univ_budgetforecasts" ADD COLUMN IF NOT EXISTS "period" text;
ALTER TABLE "public"."univ_budgetforecasts" ADD COLUMN IF NOT EXISTS "budgeted_amount" text;
ALTER TABLE "public"."univ_budgetforecasts" ADD COLUMN IF NOT EXISTS "actual_amount" text;
ALTER TABLE "public"."univ_budgetforecasts" ADD COLUMN IF NOT EXISTS "variance" text;
ALTER TABLE "public"."univ_budgetforecasts" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_budgetforecasts" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_budgetplans" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_budgetplans" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_budgetplans" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_calllogs" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_calllogs" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_calllogs" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_calllogs" ADD COLUMN IF NOT EXISTS "caller_name" text;
ALTER TABLE "public"."univ_calllogs" ADD COLUMN IF NOT EXISTS "phone_number" text;
ALTER TABLE "public"."univ_calllogs" ADD COLUMN IF NOT EXISTS "agent_name" text;
ALTER TABLE "public"."univ_calllogs" ADD COLUMN IF NOT EXISTS "call_type" text;
ALTER TABLE "public"."univ_calllogs" ADD COLUMN IF NOT EXISTS "call_date" text;
ALTER TABLE "public"."univ_calllogs" ADD COLUMN IF NOT EXISTS "duration_seconds" text;
ALTER TABLE "public"."univ_calllogs" ADD COLUMN IF NOT EXISTS "summary" text;
ALTER TABLE "public"."univ_calllogs" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_campaignmetric" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_campaignmetric" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_campaignmetric" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_campaignschedule" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_campaignschedule" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_campaignschedule" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_carrental" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_carrental" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_carrental" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_carriercontracts" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_carriercontracts" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_carriercontracts" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_cases" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_cases" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_cases" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_cases" ADD COLUMN IF NOT EXISTS "case_number" text;

CREATE TABLE IF NOT EXISTS "public"."univ_cashflows" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_cashflows" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_cashflows" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_changerequests" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_changerequests" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_changerequests" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_changerequests" ADD COLUMN IF NOT EXISTS "request_title" text;
ALTER TABLE "public"."univ_changerequests" ADD COLUMN IF NOT EXISTS "requested_by" text;
ALTER TABLE "public"."univ_changerequests" ADD COLUMN IF NOT EXISTS "change_type" text;
ALTER TABLE "public"."univ_changerequests" ADD COLUMN IF NOT EXISTS "impact_level" text;
ALTER TABLE "public"."univ_changerequests" ADD COLUMN IF NOT EXISTS "request_date" text;
ALTER TABLE "public"."univ_changerequests" ADD COLUMN IF NOT EXISTS "implementation_date" text;
ALTER TABLE "public"."univ_changerequests" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_changerequests" ADD COLUMN IF NOT EXISTS "rollback_plan" text;
ALTER TABLE "public"."univ_changerequests" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_chattranscripts" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_chattranscripts" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_chattranscripts" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_chattranscripts" ADD COLUMN IF NOT EXISTS "session_id" text;
ALTER TABLE "public"."univ_chattranscripts" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "public"."univ_chattranscripts" ADD COLUMN IF NOT EXISTS "agent_name" text;
ALTER TABLE "public"."univ_chattranscripts" ADD COLUMN IF NOT EXISTS "channel" text;
ALTER TABLE "public"."univ_chattranscripts" ADD COLUMN IF NOT EXISTS "start_time" text;
ALTER TABLE "public"."univ_chattranscripts" ADD COLUMN IF NOT EXISTS "duration_minutes" text;
ALTER TABLE "public"."univ_chattranscripts" ADD COLUMN IF NOT EXISTS "summary" text;
ALTER TABLE "public"."univ_chattranscripts" ADD COLUMN IF NOT EXISTS "satisfaction_score" text;
ALTER TABLE "public"."univ_chattranscripts" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_churnrisks" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_churnrisks" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_churnrisks" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_churnrisks" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "public"."univ_churnrisks" ADD COLUMN IF NOT EXISTS "customer_email" text;
ALTER TABLE "public"."univ_churnrisks" ADD COLUMN IF NOT EXISTS "risk_score" text;
ALTER TABLE "public"."univ_churnrisks" ADD COLUMN IF NOT EXISTS "risk_level" text;
ALTER TABLE "public"."univ_churnrisks" ADD COLUMN IF NOT EXISTS "last_activity_date" text;
ALTER TABLE "public"."univ_churnrisks" ADD COLUMN IF NOT EXISTS "revenue_at_risk" text;
ALTER TABLE "public"."univ_churnrisks" ADD COLUMN IF NOT EXISTS "churn_indicators" text;
ALTER TABLE "public"."univ_churnrisks" ADD COLUMN IF NOT EXISTS "action_taken" text;
ALTER TABLE "public"."univ_churnrisks" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_class_attendance" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_class_attendance" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_class_attendance" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_class_attendance" ADD COLUMN IF NOT EXISTS "student_id" text;
ALTER TABLE "public"."univ_class_attendance" ADD COLUMN IF NOT EXISTS "course_id" text;
ALTER TABLE "public"."univ_class_attendance" ADD COLUMN IF NOT EXISTS "student_name" text;
ALTER TABLE "public"."univ_class_attendance" ADD COLUMN IF NOT EXISTS "course_name" text;
ALTER TABLE "public"."univ_class_attendance" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."univ_class_attendance" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_clientledger" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_clientledger" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_clientledger" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_clientledger" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."univ_clientledger" ADD COLUMN IF NOT EXISTS "account_balance" text;
ALTER TABLE "public"."univ_clientledger" ADD COLUMN IF NOT EXISTS "last_activity" text;
ALTER TABLE "public"."univ_clientledger" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_client_portal" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_client_portal" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_client_portal" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_coldchains" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_coldchains" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_coldchains" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_commissionstructure" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_commissionstructure" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_commissionstructure" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_competitorprices" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_competitorprices" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_competitorprices" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_competitorprices" ADD COLUMN IF NOT EXISTS "competitor_name" text;
ALTER TABLE "public"."univ_competitorprices" ADD COLUMN IF NOT EXISTS "product_service" text;
ALTER TABLE "public"."univ_competitorprices" ADD COLUMN IF NOT EXISTS "their_price" text;
ALTER TABLE "public"."univ_competitorprices" ADD COLUMN IF NOT EXISTS "our_price" text;
ALTER TABLE "public"."univ_competitorprices" ADD COLUMN IF NOT EXISTS "price_date" text;
ALTER TABLE "public"."univ_competitorprices" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "public"."univ_competitorprices" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_competitorprices" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_concretetests" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_concretetests" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_concretetests" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_conflictcheck" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_conflictcheck" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_conflictcheck" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_conflictcheck" ADD COLUMN IF NOT EXISTS "entity_name" text;
ALTER TABLE "public"."univ_conflictcheck" ADD COLUMN IF NOT EXISTS "checked_by" text;
ALTER TABLE "public"."univ_conflictcheck" ADD COLUMN IF NOT EXISTS "date_checked" text;
ALTER TABLE "public"."univ_conflictcheck" ADD COLUMN IF NOT EXISTS "result" text;

CREATE TABLE IF NOT EXISTS "public"."univ_consultation" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_consultation" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_consultation" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_consultation" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."univ_consultation" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."univ_consultation" ADD COLUMN IF NOT EXISTS "topic" text;
ALTER TABLE "public"."univ_consultation" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_contacts" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_contacts" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_contacts" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_contacts" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."univ_contacts" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."univ_contacts" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."univ_contacts" ADD COLUMN IF NOT EXISTS "company" text;
ALTER TABLE "public"."univ_contacts" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."univ_contacts" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."univ_contacts" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."univ_contractmanagements" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_contractmanagements" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_contractmanagements" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_contractmanagements" ADD COLUMN IF NOT EXISTS "contract_title" text;
ALTER TABLE "public"."univ_contractmanagements" ADD COLUMN IF NOT EXISTS "counterparty" text;
ALTER TABLE "public"."univ_contractmanagements" ADD COLUMN IF NOT EXISTS "contract_type" text;
ALTER TABLE "public"."univ_contractmanagements" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."univ_contractmanagements" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."univ_contractmanagements" ADD COLUMN IF NOT EXISTS "contract_value" text;
ALTER TABLE "public"."univ_contractmanagements" ADD COLUMN IF NOT EXISTS "renewal_reminder" text;
ALTER TABLE "public"."univ_contractmanagements" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_contractmanagements" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_contractors" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_contractors" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_contractors" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_contractors" ADD COLUMN IF NOT EXISTS "contractor_name" text;
ALTER TABLE "public"."univ_contractors" ADD COLUMN IF NOT EXISTS "trade_specialty" text;
ALTER TABLE "public"."univ_contractors" ADD COLUMN IF NOT EXISTS "contact_email" text;
ALTER TABLE "public"."univ_contractors" ADD COLUMN IF NOT EXISTS "contact_phone" text;
ALTER TABLE "public"."univ_contractors" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_contractors" ADD COLUMN IF NOT EXISTS "rating" text;

CREATE TABLE IF NOT EXISTS "public"."univ_courses" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_courses" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_courses" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_courses" ADD COLUMN IF NOT EXISTS "course_code" text;

CREATE TABLE IF NOT EXISTS "public"."univ_court_calendar" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_court_calendar" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_court_calendar" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_court_calendar" ADD COLUMN IF NOT EXISTS "event_title" text;
ALTER TABLE "public"."univ_court_calendar" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "public"."univ_court_calendar" ADD COLUMN IF NOT EXISTS "event_date" text;
ALTER TABLE "public"."univ_court_calendar" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "public"."univ_court_calendar" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_crm_leads" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_crm_leads" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_crm_leads" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_crm_leads" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "public"."univ_crm_leads" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "public"."univ_crm_leads" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."univ_crm_leads" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."univ_crm_leads" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "public"."univ_crm_leads" ADD COLUMN IF NOT EXISTS "value" text;
ALTER TABLE "public"."univ_crm_leads" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_crm_leads" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."univ_crossdockings" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_crossdockings" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_crossdockings" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_customerjourneys" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_customerjourneys" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_customerjourneys" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_customerjourneys" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "public"."univ_customerjourneys" ADD COLUMN IF NOT EXISTS "journey_stage" text;
ALTER TABLE "public"."univ_customerjourneys" ADD COLUMN IF NOT EXISTS "touchpoint" text;
ALTER TABLE "public"."univ_customerjourneys" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."univ_customerjourneys" ADD COLUMN IF NOT EXISTS "sentiment" text;
ALTER TABLE "public"."univ_customerjourneys" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_customerjourneys" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_customerreviews" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_customerreviews" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_customerreviews" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_customerreviews" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "public"."univ_customerreviews" ADD COLUMN IF NOT EXISTS "product_service" text;
ALTER TABLE "public"."univ_customerreviews" ADD COLUMN IF NOT EXISTS "rating" text;
ALTER TABLE "public"."univ_customerreviews" ADD COLUMN IF NOT EXISTS "review_text" text;
ALTER TABLE "public"."univ_customerreviews" ADD COLUMN IF NOT EXISTS "review_date" text;
ALTER TABLE "public"."univ_customerreviews" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_customersegments" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_customersegments" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_customersegments" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_customersegments" ADD COLUMN IF NOT EXISTS "segment_name" text;
ALTER TABLE "public"."univ_customersegments" ADD COLUMN IF NOT EXISTS "criteria" text;
ALTER TABLE "public"."univ_customersegments" ADD COLUMN IF NOT EXISTS "customer_count" text;
ALTER TABLE "public"."univ_customersegments" ADD COLUMN IF NOT EXISTS "avg_order_value" text;
ALTER TABLE "public"."univ_customersegments" ADD COLUMN IF NOT EXISTS "channel" text;
ALTER TABLE "public"."univ_customersegments" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."univ_customersegments" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_customersegments" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_customsdocs" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_customsdocs" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_customsdocs" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_damagedgoodss" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_damagedgoodss" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_damagedgoodss" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_databackups" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_databackups" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_databackups" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_databackups" ADD COLUMN IF NOT EXISTS "backup_name" text;
ALTER TABLE "public"."univ_databackups" ADD COLUMN IF NOT EXISTS "system_name" text;
ALTER TABLE "public"."univ_databackups" ADD COLUMN IF NOT EXISTS "backup_type" text;
ALTER TABLE "public"."univ_databackups" ADD COLUMN IF NOT EXISTS "backup_date" text;
ALTER TABLE "public"."univ_databackups" ADD COLUMN IF NOT EXISTS "size_gb" text;
ALTER TABLE "public"."univ_databackups" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "public"."univ_databackups" ADD COLUMN IF NOT EXISTS "retention_days" text;
ALTER TABLE "public"."univ_databackups" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_databackups" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_deliveries" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_deliveries" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_deliveries" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_deliveries" ADD COLUMN IF NOT EXISTS "tracking_number" text;

CREATE TABLE IF NOT EXISTS "public"."univ_digitalassets" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_digitalassets" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_digitalassets" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_digitalassets" ADD COLUMN IF NOT EXISTS "asset_name" text;
ALTER TABLE "public"."univ_digitalassets" ADD COLUMN IF NOT EXISTS "asset_type" text;
ALTER TABLE "public"."univ_digitalassets" ADD COLUMN IF NOT EXISTS "file_url" text;
ALTER TABLE "public"."univ_digitalassets" ADD COLUMN IF NOT EXISTS "file_size_mb" text;
ALTER TABLE "public"."univ_digitalassets" ADD COLUMN IF NOT EXISTS "uploaded_by" text;
ALTER TABLE "public"."univ_digitalassets" ADD COLUMN IF NOT EXISTS "upload_date" text;
ALTER TABLE "public"."univ_digitalassets" ADD COLUMN IF NOT EXISTS "tags" text;
ALTER TABLE "public"."univ_digitalassets" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_digitalassets" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_dining_orders" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_dining_orders" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_dining_orders" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_dining_orders" ADD COLUMN IF NOT EXISTS "order_number" text;

CREATE TABLE IF NOT EXISTS "public"."univ_dischargesummary" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_dischargesummary" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_dischargesummary" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_disciplinary" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_disciplinary" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_disciplinary" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_discounts" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_discounts" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_discounts" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_discounts" ADD COLUMN IF NOT EXISTS "discount_name" text;
ALTER TABLE "public"."univ_discounts" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "public"."univ_discounts" ADD COLUMN IF NOT EXISTS "discount_type" text;
ALTER TABLE "public"."univ_discounts" ADD COLUMN IF NOT EXISTS "value" text;
ALTER TABLE "public"."univ_discounts" ADD COLUMN IF NOT EXISTS "min_purchase" text;
ALTER TABLE "public"."univ_discounts" ADD COLUMN IF NOT EXISTS "expiry_date" text;
ALTER TABLE "public"."univ_discounts" ADD COLUMN IF NOT EXISTS "usage_limit" text;
ALTER TABLE "public"."univ_discounts" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_dispatch" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_dispatch" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_dispatch" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_dispatch" ADD COLUMN IF NOT EXISTS "driver_name" text;
ALTER TABLE "public"."univ_dispatch" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_dispatch" ADD COLUMN IF NOT EXISTS "current_location" text;

CREATE TABLE IF NOT EXISTS "public"."univ_doctorschedules" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_doctorschedules" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_doctorschedules" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_documents" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_documents" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_documents" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_documents" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."univ_documents" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."univ_documents" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_documents" ADD COLUMN IF NOT EXISTS "file_url" text;
ALTER TABLE "public"."univ_documents" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_documents" ADD COLUMN IF NOT EXISTS "tags" text;

CREATE TABLE IF NOT EXISTS "public"."univ_donationlog" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_donationlog" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_donationlog" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_donorprofile" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_donorprofile" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_donorprofile" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_employeeperformances" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_employeeperformances" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_employeeperformances" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_employeeperformances" ADD COLUMN IF NOT EXISTS "employee_name" text;
ALTER TABLE "public"."univ_employeeperformances" ADD COLUMN IF NOT EXISTS "reviewer_name" text;
ALTER TABLE "public"."univ_employeeperformances" ADD COLUMN IF NOT EXISTS "review_period" text;
ALTER TABLE "public"."univ_employeeperformances" ADD COLUMN IF NOT EXISTS "overall_rating" text;
ALTER TABLE "public"."univ_employeeperformances" ADD COLUMN IF NOT EXISTS "strengths" text;
ALTER TABLE "public"."univ_employeeperformances" ADD COLUMN IF NOT EXISTS "areas_for_improvement" text;
ALTER TABLE "public"."univ_employeeperformances" ADD COLUMN IF NOT EXISTS "goals" text;
ALTER TABLE "public"."univ_employeeperformances" ADD COLUMN IF NOT EXISTS "review_date" text;
ALTER TABLE "public"."univ_employeeperformances" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_emr" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_emr" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_emr" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_emr" ADD COLUMN IF NOT EXISTS "patient_id" text;
ALTER TABLE "public"."univ_emr" ADD COLUMN IF NOT EXISTS "doctor_id" text;
ALTER TABLE "public"."univ_emr" ADD COLUMN IF NOT EXISTS "visit_date" text;
ALTER TABLE "public"."univ_emr" ADD COLUMN IF NOT EXISTS "diagnosis" text;
ALTER TABLE "public"."univ_emr" ADD COLUMN IF NOT EXISTS "symptoms" text;
ALTER TABLE "public"."univ_emr" ADD COLUMN IF NOT EXISTS "treatment_plan" text;
ALTER TABLE "public"."univ_emr" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."univ_enrollments" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_enrollments" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_enrollments" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_equipmentrentals" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_equipmentrentals" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_equipmentrentals" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_escrow" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_escrow" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_escrow" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_escrow" ADD COLUMN IF NOT EXISTS "account_name" text;
ALTER TABLE "public"."univ_escrow" ADD COLUMN IF NOT EXISTS "balance" text;
ALTER TABLE "public"."univ_escrow" ADD COLUMN IF NOT EXISTS "last_transaction" text;
ALTER TABLE "public"."univ_escrow" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_eventplanner" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_eventplanner" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_eventplanner" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_examschedules" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_examschedules" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_examschedules" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_exitinterview" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_exitinterview" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_exitinterview" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_expenseclaim" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_expenseclaim" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_expenseclaim" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_expensereports" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_expensereports" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_expensereports" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_expensereports" ADD COLUMN IF NOT EXISTS "employee_name" text;
ALTER TABLE "public"."univ_expensereports" ADD COLUMN IF NOT EXISTS "expense_category" text;
ALTER TABLE "public"."univ_expensereports" ADD COLUMN IF NOT EXISTS "amount" text;
ALTER TABLE "public"."univ_expensereports" ADD COLUMN IF NOT EXISTS "expense_date" text;
ALTER TABLE "public"."univ_expensereports" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_expensereports" ADD COLUMN IF NOT EXISTS "receipt_number" text;
ALTER TABLE "public"."univ_expensereports" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_expertwitness" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_expertwitness" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_expertwitness" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_expertwitness" ADD COLUMN IF NOT EXISTS "witness_name" text;
ALTER TABLE "public"."univ_expertwitness" ADD COLUMN IF NOT EXISTS "specialty" text;
ALTER TABLE "public"."univ_expertwitness" ADD COLUMN IF NOT EXISTS "hourly_rate" text;
ALTER TABLE "public"."univ_expertwitness" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_extracurriculars" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_extracurriculars" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_extracurriculars" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_faculty" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_faculty" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_faculty" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_faculty" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "public"."univ_faculty" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "public"."univ_faculty" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."univ_faculty" ADD COLUMN IF NOT EXISTS "department" text;
ALTER TABLE "public"."univ_faculty" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_faculty" ADD COLUMN IF NOT EXISTS "hire_date" text;

CREATE TABLE IF NOT EXISTS "public"."univ_featurerequests" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_featurerequests" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_featurerequests" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_featurerequests" ADD COLUMN IF NOT EXISTS "feature_title" text;
ALTER TABLE "public"."univ_featurerequests" ADD COLUMN IF NOT EXISTS "requested_by" text;
ALTER TABLE "public"."univ_featurerequests" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."univ_featurerequests" ADD COLUMN IF NOT EXISTS "votes" text;
ALTER TABLE "public"."univ_featurerequests" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_featurerequests" ADD COLUMN IF NOT EXISTS "requested_date" text;
ALTER TABLE "public"."univ_featurerequests" ADD COLUMN IF NOT EXISTS "expected_release" text;
ALTER TABLE "public"."univ_featurerequests" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_feedbacksurvey" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_feedbacksurvey" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_feedbacksurvey" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_fixedassets" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_fixedassets" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_fixedassets" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_fleet" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_fleet" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_fleet" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_fleet" ADD COLUMN IF NOT EXISTS "vehicle_name" text;

CREATE TABLE IF NOT EXISTS "public"."univ_forkliftmaintenances" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_forkliftmaintenances" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_forkliftmaintenances" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_gdprrequests" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_gdprrequests" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_gdprrequests" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_gdprrequests" ADD COLUMN IF NOT EXISTS "request_id" text;
ALTER TABLE "public"."univ_gdprrequests" ADD COLUMN IF NOT EXISTS "subject_name" text;
ALTER TABLE "public"."univ_gdprrequests" ADD COLUMN IF NOT EXISTS "subject_email" text;
ALTER TABLE "public"."univ_gdprrequests" ADD COLUMN IF NOT EXISTS "request_type" text;
ALTER TABLE "public"."univ_gdprrequests" ADD COLUMN IF NOT EXISTS "received_date" text;
ALTER TABLE "public"."univ_gdprrequests" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."univ_gdprrequests" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_gdprrequests" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_generalledgers" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_generalledgers" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_generalledgers" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_generalledgers" ADD COLUMN IF NOT EXISTS "account_name" text;
ALTER TABLE "public"."univ_generalledgers" ADD COLUMN IF NOT EXISTS "account_code" text;
ALTER TABLE "public"."univ_generalledgers" ADD COLUMN IF NOT EXISTS "account_type" text;
ALTER TABLE "public"."univ_generalledgers" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_generalledgers" ADD COLUMN IF NOT EXISTS "debit" text;
ALTER TABLE "public"."univ_generalledgers" ADD COLUMN IF NOT EXISTS "credit" text;
ALTER TABLE "public"."univ_generalledgers" ADD COLUMN IF NOT EXISTS "transaction_date" text;
ALTER TABLE "public"."univ_generalledgers" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_giftcards" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_giftcards" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_giftcards" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_giftcards" ADD COLUMN IF NOT EXISTS "card_number" text;
ALTER TABLE "public"."univ_giftcards" ADD COLUMN IF NOT EXISTS "recipient_name" text;
ALTER TABLE "public"."univ_giftcards" ADD COLUMN IF NOT EXISTS "initial_balance" text;
ALTER TABLE "public"."univ_giftcards" ADD COLUMN IF NOT EXISTS "current_balance" text;
ALTER TABLE "public"."univ_giftcards" ADD COLUMN IF NOT EXISTS "issued_date" text;
ALTER TABLE "public"."univ_giftcards" ADD COLUMN IF NOT EXISTS "expiry_date" text;
ALTER TABLE "public"."univ_giftcards" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_gradebook" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_gradebook" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_gradebook" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_gradebook" ADD COLUMN IF NOT EXISTS "student_id" text;
ALTER TABLE "public"."univ_gradebook" ADD COLUMN IF NOT EXISTS "course_id" text;
ALTER TABLE "public"."univ_gradebook" ADD COLUMN IF NOT EXISTS "assessment_name" text;
ALTER TABLE "public"."univ_gradebook" ADD COLUMN IF NOT EXISTS "score" text;
ALTER TABLE "public"."univ_gradebook" ADD COLUMN IF NOT EXISTS "max_score" text;
ALTER TABLE "public"."univ_gradebook" ADD COLUMN IF NOT EXISTS "grade" text;
ALTER TABLE "public"."univ_gradebook" ADD COLUMN IF NOT EXISTS "date_recorded" text;
ALTER TABLE "public"."univ_gradebook" ADD COLUMN IF NOT EXISTS "remarks" text;

CREATE TABLE IF NOT EXISTS "public"."univ_healthsafetys" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_healthsafetys" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_healthsafetys" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_healthsafetys" ADD COLUMN IF NOT EXISTS "inspection_title" text;
ALTER TABLE "public"."univ_healthsafetys" ADD COLUMN IF NOT EXISTS "inspector_name" text;
ALTER TABLE "public"."univ_healthsafetys" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "public"."univ_healthsafetys" ADD COLUMN IF NOT EXISTS "inspection_date" text;
ALTER TABLE "public"."univ_healthsafetys" ADD COLUMN IF NOT EXISTS "hazards_found" text;
ALTER TABLE "public"."univ_healthsafetys" ADD COLUMN IF NOT EXISTS "corrective_actions" text;
ALTER TABLE "public"."univ_healthsafetys" ADD COLUMN IF NOT EXISTS "next_inspection" text;
ALTER TABLE "public"."univ_healthsafetys" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_hoas" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_hoas" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_hoas" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_hoas" ADD COLUMN IF NOT EXISTS "community_name" text;
ALTER TABLE "public"."univ_hoas" ADD COLUMN IF NOT EXISTS "unit_number" text;
ALTER TABLE "public"."univ_hoas" ADD COLUMN IF NOT EXISTS "owner_name" text;
ALTER TABLE "public"."univ_hoas" ADD COLUMN IF NOT EXISTS "dues_amount" text;
ALTER TABLE "public"."univ_hoas" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."univ_hoas" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_hoas" ADD COLUMN IF NOT EXISTS "violation_notes" text;

CREATE TABLE IF NOT EXISTS "public"."univ_hotelreview" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_hotelreview" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_hotelreview" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_housekeeping" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_housekeeping" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_housekeeping" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_housekeeping" ADD COLUMN IF NOT EXISTS "room_id" text;
ALTER TABLE "public"."univ_housekeeping" ADD COLUMN IF NOT EXISTS "task_type" text;
ALTER TABLE "public"."univ_housekeeping" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_housekeeping" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."univ_housekeeping" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."univ_hr_employees" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "role_title" text;
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "department" text;
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "salary" text;
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "employment_type" text;
ALTER TABLE "public"."univ_hr_employees" ADD COLUMN IF NOT EXISTS "hire_date" text;

CREATE TABLE IF NOT EXISTS "public"."univ_immunization" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_immunization" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_immunization" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_incidentreports" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_incidentreports" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_incidentreports" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_incidentreports" ADD COLUMN IF NOT EXISTS "incident_title" text;
ALTER TABLE "public"."univ_incidentreports" ADD COLUMN IF NOT EXISTS "reported_by" text;
ALTER TABLE "public"."univ_incidentreports" ADD COLUMN IF NOT EXISTS "severity" text;
ALTER TABLE "public"."univ_incidentreports" ADD COLUMN IF NOT EXISTS "incident_date" text;
ALTER TABLE "public"."univ_incidentreports" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "public"."univ_incidentreports" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_incidentreports" ADD COLUMN IF NOT EXISTS "root_cause" text;
ALTER TABLE "public"."univ_incidentreports" ADD COLUMN IF NOT EXISTS "resolution" text;
ALTER TABLE "public"."univ_incidentreports" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_inkinddonation" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_inkinddonation" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_inkinddonation" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_insurancepolicy" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_insurancepolicy" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_insurancepolicy" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_inventory" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_inventory" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_inventory" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_inventory" ADD COLUMN IF NOT EXISTS "item_name" text;
ALTER TABLE "public"."univ_inventory" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "public"."univ_inventory" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."univ_inventory" ADD COLUMN IF NOT EXISTS "quantity" text;
ALTER TABLE "public"."univ_inventory" ADD COLUMN IF NOT EXISTS "unit_price" text;
ALTER TABLE "public"."univ_inventory" ADD COLUMN IF NOT EXISTS "reorder_level" text;
ALTER TABLE "public"."univ_inventory" ADD COLUMN IF NOT EXISTS "supplier" text;
ALTER TABLE "public"."univ_inventory" ADD COLUMN IF NOT EXISTS "location" text;

CREATE TABLE IF NOT EXISTS "public"."univ_invoices" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_invoices" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_invoices" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_invoices" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."univ_invoices" ADD COLUMN IF NOT EXISTS "client_email" text;
ALTER TABLE "public"."univ_invoices" ADD COLUMN IF NOT EXISTS "invoice_number" text;
ALTER TABLE "public"."univ_invoices" ADD COLUMN IF NOT EXISTS "amount" text;
ALTER TABLE "public"."univ_invoices" ADD COLUMN IF NOT EXISTS "currency" text;
ALTER TABLE "public"."univ_invoices" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_invoices" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."univ_invoices" ADD COLUMN IF NOT EXISTS "issue_date" text;
ALTER TABLE "public"."univ_invoices" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."univ_ipaddresses" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_ipaddresses" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_ipaddresses" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_ipaddresses" ADD COLUMN IF NOT EXISTS "ip_address" text;
ALTER TABLE "public"."univ_ipaddresses" ADD COLUMN IF NOT EXISTS "hostname" text;
ALTER TABLE "public"."univ_ipaddresses" ADD COLUMN IF NOT EXISTS "assigned_to" text;
ALTER TABLE "public"."univ_ipaddresses" ADD COLUMN IF NOT EXISTS "mac_address" text;
ALTER TABLE "public"."univ_ipaddresses" ADD COLUMN IF NOT EXISTS "subnet" text;
ALTER TABLE "public"."univ_ipaddresses" ADD COLUMN IF NOT EXISTS "vlan" text;
ALTER TABLE "public"."univ_ipaddresses" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "public"."univ_ipaddresses" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_ipaddresses" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_kanban_tasks" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_kanban_tasks" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_kanban_tasks" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_kanban_tasks" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."univ_kanban_tasks" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_kanban_tasks" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_kanban_tasks" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."univ_kanban_tasks" ADD COLUMN IF NOT EXISTS "assignee" text;
ALTER TABLE "public"."univ_kanban_tasks" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."univ_kanban_tasks" ADD COLUMN IF NOT EXISTS "labels" text;

CREATE TABLE IF NOT EXISTS "public"."univ_kbarticles" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_kbarticles" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_kbarticles" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_kbarticles" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."univ_kbarticles" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."univ_kbarticles" ADD COLUMN IF NOT EXISTS "author" text;
ALTER TABLE "public"."univ_kbarticles" ADD COLUMN IF NOT EXISTS "tags" text;
ALTER TABLE "public"."univ_kbarticles" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "public"."univ_kbarticles" ADD COLUMN IF NOT EXISTS "published_date" text;
ALTER TABLE "public"."univ_kbarticles" ADD COLUMN IF NOT EXISTS "views" text;
ALTER TABLE "public"."univ_kbarticles" ADD COLUMN IF NOT EXISTS "helpful_votes" text;
ALTER TABLE "public"."univ_kbarticles" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_kpitrackers" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_kpitrackers" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_kpitrackers" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_kpitrackers" ADD COLUMN IF NOT EXISTS "kpi_name" text;
ALTER TABLE "public"."univ_kpitrackers" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."univ_kpitrackers" ADD COLUMN IF NOT EXISTS "target_value" text;
ALTER TABLE "public"."univ_kpitrackers" ADD COLUMN IF NOT EXISTS "actual_value" text;
ALTER TABLE "public"."univ_kpitrackers" ADD COLUMN IF NOT EXISTS "unit" text;
ALTER TABLE "public"."univ_kpitrackers" ADD COLUMN IF NOT EXISTS "period" text;
ALTER TABLE "public"."univ_kpitrackers" ADD COLUMN IF NOT EXISTS "owner" text;
ALTER TABLE "public"."univ_kpitrackers" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_kpitrackers" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_labs" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_labs" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_labs" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_labs" ADD COLUMN IF NOT EXISTS "patient_id" text;
ALTER TABLE "public"."univ_labs" ADD COLUMN IF NOT EXISTS "test_name" text;
ALTER TABLE "public"."univ_labs" ADD COLUMN IF NOT EXISTS "test_date" text;
ALTER TABLE "public"."univ_labs" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_labs" ADD COLUMN IF NOT EXISTS "result_value" text;

CREATE TABLE IF NOT EXISTS "public"."univ_leadmagnets" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_leadmagnets" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_leadmagnets" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_leadmagnets" ADD COLUMN IF NOT EXISTS "magnet_name" text;
ALTER TABLE "public"."univ_leadmagnets" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."univ_leadmagnets" ADD COLUMN IF NOT EXISTS "target_audience" text;
ALTER TABLE "public"."univ_leadmagnets" ADD COLUMN IF NOT EXISTS "downloads" text;
ALTER TABLE "public"."univ_leadmagnets" ADD COLUMN IF NOT EXISTS "leads_generated" text;
ALTER TABLE "public"."univ_leadmagnets" ADD COLUMN IF NOT EXISTS "launch_date" text;
ALTER TABLE "public"."univ_leadmagnets" ADD COLUMN IF NOT EXISTS "landing_page_url" text;
ALTER TABLE "public"."univ_leadmagnets" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_lease" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_lease" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_lease" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_lease" ADD COLUMN IF NOT EXISTS "lease_number" text;
ALTER TABLE "public"."univ_lease" ADD COLUMN IF NOT EXISTS "tenant_name" text;
ALTER TABLE "public"."univ_lease" ADD COLUMN IF NOT EXISTS "monthly_rent" text;
ALTER TABLE "public"."univ_lease" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_leave_management" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_leave_management" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_leave_management" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_leave_management" ADD COLUMN IF NOT EXISTS "employee_name" text;
ALTER TABLE "public"."univ_leave_management" ADD COLUMN IF NOT EXISTS "leave_type" text;
ALTER TABLE "public"."univ_leave_management" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."univ_leave_management" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."univ_leave_management" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_leave_management" ADD COLUMN IF NOT EXISTS "reason" text;

CREATE TABLE IF NOT EXISTS "public"."univ_legal_documents" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_legal_documents" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_legal_documents" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_legal_documents" ADD COLUMN IF NOT EXISTS "document_title" text;
ALTER TABLE "public"."univ_legal_documents" ADD COLUMN IF NOT EXISTS "document_type" text;
ALTER TABLE "public"."univ_legal_documents" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_librarybooks" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_librarybooks" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_librarybooks" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_listing" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_listing" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_listing" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_listing" ADD COLUMN IF NOT EXISTS "listing_title" text;
ALTER TABLE "public"."univ_listing" ADD COLUMN IF NOT EXISTS "price" text;
ALTER TABLE "public"."univ_listing" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."univ_listing" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_lms_lessons" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_lms_lessons" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_lms_lessons" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_lms_lessons" ADD COLUMN IF NOT EXISTS "course_id" text;
ALTER TABLE "public"."univ_lms_lessons" ADD COLUMN IF NOT EXISTS "title" text;

CREATE TABLE IF NOT EXISTS "public"."univ_loyaltypoints" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_loyaltypoints" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_loyaltypoints" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_loyaltypoints" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "public"."univ_loyaltypoints" ADD COLUMN IF NOT EXISTS "customer_email" text;
ALTER TABLE "public"."univ_loyaltypoints" ADD COLUMN IF NOT EXISTS "points_earned" text;
ALTER TABLE "public"."univ_loyaltypoints" ADD COLUMN IF NOT EXISTS "points_redeemed" text;
ALTER TABLE "public"."univ_loyaltypoints" ADD COLUMN IF NOT EXISTS "points_balance" text;
ALTER TABLE "public"."univ_loyaltypoints" ADD COLUMN IF NOT EXISTS "tier" text;
ALTER TABLE "public"."univ_loyaltypoints" ADD COLUMN IF NOT EXISTS "last_activity" text;
ALTER TABLE "public"."univ_loyaltypoints" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_luggageclaim" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_luggageclaim" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_luggageclaim" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_machines" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_machines" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_machines" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_machines" ADD COLUMN IF NOT EXISTS "machine_name" text;
ALTER TABLE "public"."univ_machines" ADD COLUMN IF NOT EXISTS "serial_number" text;
ALTER TABLE "public"."univ_machines" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "public"."univ_machines" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_machines" ADD COLUMN IF NOT EXISTS "last_maintenance" text;
ALTER TABLE "public"."univ_machines" ADD COLUMN IF NOT EXISTS "next_maintenance" text;

CREATE TABLE IF NOT EXISTS "public"."univ_maintenancerequest" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_maintenancerequest" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_maintenancerequest" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_maintenancerequest" ADD COLUMN IF NOT EXISTS "request_title" text;
ALTER TABLE "public"."univ_maintenancerequest" ADD COLUMN IF NOT EXISTS "property" text;
ALTER TABLE "public"."univ_maintenancerequest" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."univ_maintenancerequest" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_medicalbillings" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_medicalbillings" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_medicalbillings" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_meetingminutess" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_meetingminutess" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_meetingminutess" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_meetingminutess" ADD COLUMN IF NOT EXISTS "meeting_title" text;
ALTER TABLE "public"."univ_meetingminutess" ADD COLUMN IF NOT EXISTS "meeting_date" text;
ALTER TABLE "public"."univ_meetingminutess" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "public"."univ_meetingminutess" ADD COLUMN IF NOT EXISTS "attendees" text;
ALTER TABLE "public"."univ_meetingminutess" ADD COLUMN IF NOT EXISTS "agenda" text;
ALTER TABLE "public"."univ_meetingminutess" ADD COLUMN IF NOT EXISTS "decisions" text;
ALTER TABLE "public"."univ_meetingminutess" ADD COLUMN IF NOT EXISTS "action_items" text;
ALTER TABLE "public"."univ_meetingminutess" ADD COLUMN IF NOT EXISTS "next_meeting" text;
ALTER TABLE "public"."univ_meetingminutess" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_menus" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_menus" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_menus" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_menus" ADD COLUMN IF NOT EXISTS "item_name" text;
ALTER TABLE "public"."univ_menus" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."univ_menus" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_menus" ADD COLUMN IF NOT EXISTS "price" text;
ALTER TABLE "public"."univ_menus" ADD COLUMN IF NOT EXISTS "is_available" text;
ALTER TABLE "public"."univ_menus" ADD COLUMN IF NOT EXISTS "dietary_info" text;

CREATE TABLE IF NOT EXISTS "public"."univ_newsletter" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_newsletter" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_newsletter" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_notifications" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_notifications" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_notifications" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_onboardingtask" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_onboardingtask" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_onboardingtask" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_operationtheater" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_operationtheater" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_operationtheater" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_orderregistrys" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_orderregistrys" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_orderregistrys" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_orderregistrys" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "public"."univ_orderregistrys" ADD COLUMN IF NOT EXISTS "order_number" text;
ALTER TABLE "public"."univ_orderregistrys" ADD COLUMN IF NOT EXISTS "total_amount" text;
ALTER TABLE "public"."univ_orderregistrys" ADD COLUMN IF NOT EXISTS "order_date" text;
ALTER TABLE "public"."univ_orderregistrys" ADD COLUMN IF NOT EXISTS "delivery_date" text;
ALTER TABLE "public"."univ_orderregistrys" ADD COLUMN IF NOT EXISTS "items_summary" text;
ALTER TABLE "public"."univ_orderregistrys" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_orgchart" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_orgchart" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_orgchart" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_pallettracker" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_pallettracker" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_pallettracker" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_parent_portal_access" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_parent_portal_access" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_parent_portal_access" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_parent_portal_access" ADD COLUMN IF NOT EXISTS "student_id" text;
ALTER TABLE "public"."univ_parent_portal_access" ADD COLUMN IF NOT EXISTS "parent_name" text;
ALTER TABLE "public"."univ_parent_portal_access" ADD COLUMN IF NOT EXISTS "parent_email" text;
ALTER TABLE "public"."univ_parent_portal_access" ADD COLUMN IF NOT EXISTS "access_code" text;

CREATE TABLE IF NOT EXISTS "public"."univ_patients" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "patient_number" text;

CREATE TABLE IF NOT EXISTS "public"."univ_payments" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_payments" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_payments" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_payments" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "public"."univ_payments" ADD COLUMN IF NOT EXISTS "amount" text;
ALTER TABLE "public"."univ_payments" ADD COLUMN IF NOT EXISTS "method" text;
ALTER TABLE "public"."univ_payments" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_payments" ADD COLUMN IF NOT EXISTS "reference_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_payroll" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_payroll" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_payroll" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_payroll" ADD COLUMN IF NOT EXISTS "employee_name" text;
ALTER TABLE "public"."univ_payroll" ADD COLUMN IF NOT EXISTS "period_start" text;
ALTER TABLE "public"."univ_payroll" ADD COLUMN IF NOT EXISTS "period_end" text;
ALTER TABLE "public"."univ_payroll" ADD COLUMN IF NOT EXISTS "basic_salary" text;
ALTER TABLE "public"."univ_payroll" ADD COLUMN IF NOT EXISTS "allowances" text;
ALTER TABLE "public"."univ_payroll" ADD COLUMN IF NOT EXISTS "deductions" text;
ALTER TABLE "public"."univ_payroll" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_payroll" ADD COLUMN IF NOT EXISTS "payment_date" text;

CREATE TABLE IF NOT EXISTS "public"."univ_permittrackers" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_permittrackers" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_permittrackers" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_pledge" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_pledge" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_pledge" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_pos" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_pos" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_pos" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_pos" ADD COLUMN IF NOT EXISTS "receipt_number" text;

CREATE TABLE IF NOT EXISTS "public"."univ_prescriptions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "patient_id" text;
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "doctor_id" text;
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "medication" text;
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "dosage" text;
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "frequency" text;
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "duration" text;
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "new_patient_first" text;
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "new_patient_last" text;

CREATE TABLE IF NOT EXISTS "public"."univ_pressrelease" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_pressrelease" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_pressrelease" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_procurement" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_procurement" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_procurement" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_procurement" ADD COLUMN IF NOT EXISTS "po_number" text;
ALTER TABLE "public"."univ_procurement" ADD COLUMN IF NOT EXISTS "supplier" text;
ALTER TABLE "public"."univ_procurement" ADD COLUMN IF NOT EXISTS "total_amount" text;
ALTER TABLE "public"."univ_procurement" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_procurement" ADD COLUMN IF NOT EXISTS "order_date" text;
ALTER TABLE "public"."univ_procurement" ADD COLUMN IF NOT EXISTS "expected_date" text;

CREATE TABLE IF NOT EXISTS "public"."univ_productcatalogs" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_productcatalogs" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_productcatalogs" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_productcatalogs" ADD COLUMN IF NOT EXISTS "product_name" text;
ALTER TABLE "public"."univ_productcatalogs" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "public"."univ_productcatalogs" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."univ_productcatalogs" ADD COLUMN IF NOT EXISTS "price" text;
ALTER TABLE "public"."univ_productcatalogs" ADD COLUMN IF NOT EXISTS "cost" text;
ALTER TABLE "public"."univ_productcatalogs" ADD COLUMN IF NOT EXISTS "stock_qty" text;
ALTER TABLE "public"."univ_productcatalogs" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_productcatalogs" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_production" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_production" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_production" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_production" ADD COLUMN IF NOT EXISTS "batch_number" text;
ALTER TABLE "public"."univ_production" ADD COLUMN IF NOT EXISTS "product_name" text;
ALTER TABLE "public"."univ_production" ADD COLUMN IF NOT EXISTS "quantity" text;
ALTER TABLE "public"."univ_production" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_production" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."univ_production" ADD COLUMN IF NOT EXISTS "end_date" text;

CREATE TABLE IF NOT EXISTS "public"."univ_productionschedules" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_productionschedules" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_productionschedules" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_productionschedules" ADD COLUMN IF NOT EXISTS "job_name" text;
ALTER TABLE "public"."univ_productionschedules" ADD COLUMN IF NOT EXISTS "product_name" text;
ALTER TABLE "public"."univ_productionschedules" ADD COLUMN IF NOT EXISTS "machine_line" text;
ALTER TABLE "public"."univ_productionschedules" ADD COLUMN IF NOT EXISTS "planned_start" text;
ALTER TABLE "public"."univ_productionschedules" ADD COLUMN IF NOT EXISTS "planned_end" text;
ALTER TABLE "public"."univ_productionschedules" ADD COLUMN IF NOT EXISTS "quantity_ordered" text;
ALTER TABLE "public"."univ_productionschedules" ADD COLUMN IF NOT EXISTS "quantity_produced" text;
ALTER TABLE "public"."univ_productionschedules" ADD COLUMN IF NOT EXISTS "operator" text;
ALTER TABLE "public"."univ_productionschedules" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_projects" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "budget" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "assigned_to" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "project_name" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."univ_projects" ADD COLUMN IF NOT EXISTS "completion_percentage" text;

CREATE TABLE IF NOT EXISTS "public"."univ_projectmilestones" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_projectmilestones" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_projectmilestones" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_projectmilestones" ADD COLUMN IF NOT EXISTS "milestone_name" text;
ALTER TABLE "public"."univ_projectmilestones" ADD COLUMN IF NOT EXISTS "project_name" text;
ALTER TABLE "public"."univ_projectmilestones" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."univ_projectmilestones" ADD COLUMN IF NOT EXISTS "completion_date" text;
ALTER TABLE "public"."univ_projectmilestones" ADD COLUMN IF NOT EXISTS "progress_percent" text;
ALTER TABLE "public"."univ_projectmilestones" ADD COLUMN IF NOT EXISTS "owner" text;
ALTER TABLE "public"."univ_projectmilestones" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_projectmilestones" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_property" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_property" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_property" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_property" ADD COLUMN IF NOT EXISTS "property_name" text;
ALTER TABLE "public"."univ_property" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."univ_property" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."univ_property" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_propertyinspection" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_propertyinspection" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_propertyinspection" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_propertyinspection" ADD COLUMN IF NOT EXISTS "property_name" text;
ALTER TABLE "public"."univ_propertyinspection" ADD COLUMN IF NOT EXISTS "inspector" text;
ALTER TABLE "public"."univ_propertyinspection" ADD COLUMN IF NOT EXISTS "date" text;
ALTER TABLE "public"."univ_propertyinspection" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_purchaseorders" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_purchaseorders" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_purchaseorders" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_quality_control" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_quality_control" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_quality_control" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_quality_control" ADD COLUMN IF NOT EXISTS "batch_number" text;
ALTER TABLE "public"."univ_quality_control" ADD COLUMN IF NOT EXISTS "inspector_name" text;
ALTER TABLE "public"."univ_quality_control" ADD COLUMN IF NOT EXISTS "inspection_date" text;
ALTER TABLE "public"."univ_quality_control" ADD COLUMN IF NOT EXISTS "result" text;
ALTER TABLE "public"."univ_quality_control" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."univ_rawmaterials" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_rawmaterials" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_rawmaterials" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_recruitment" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_recruitment" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_recruitment" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_recruitment" ADD COLUMN IF NOT EXISTS "candidate_name" text;
ALTER TABLE "public"."univ_recruitment" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."univ_recruitment" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."univ_recruitment" ADD COLUMN IF NOT EXISTS "position" text;
ALTER TABLE "public"."univ_recruitment" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_recruitment" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "public"."univ_recruitment" ADD COLUMN IF NOT EXISTS "experience_years" text;
ALTER TABLE "public"."univ_recruitment" ADD COLUMN IF NOT EXISTS "rating" text;
ALTER TABLE "public"."univ_recruitment" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."univ_referrals" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_referrals" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_referrals" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_retainer" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_retainer" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_retainer" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_retainer" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."univ_retainer" ADD COLUMN IF NOT EXISTS "amount" text;
ALTER TABLE "public"."univ_retainer" ADD COLUMN IF NOT EXISTS "date_paid" text;
ALTER TABLE "public"."univ_retainer" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_returnrefunds" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_returnrefunds" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_returnrefunds" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_returnrefunds" ADD COLUMN IF NOT EXISTS "order_number" text;
ALTER TABLE "public"."univ_returnrefunds" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "public"."univ_returnrefunds" ADD COLUMN IF NOT EXISTS "return_reason" text;
ALTER TABLE "public"."univ_returnrefunds" ADD COLUMN IF NOT EXISTS "refund_amount" text;
ALTER TABLE "public"."univ_returnrefunds" ADD COLUMN IF NOT EXISTS "request_date" text;
ALTER TABLE "public"."univ_returnrefunds" ADD COLUMN IF NOT EXISTS "resolution_date" text;
ALTER TABLE "public"."univ_returnrefunds" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_riskregisters" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_riskregisters" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_riskregisters" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_riskregisters" ADD COLUMN IF NOT EXISTS "risk_title" text;
ALTER TABLE "public"."univ_riskregisters" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."univ_riskregisters" ADD COLUMN IF NOT EXISTS "likelihood" text;
ALTER TABLE "public"."univ_riskregisters" ADD COLUMN IF NOT EXISTS "impact" text;
ALTER TABLE "public"."univ_riskregisters" ADD COLUMN IF NOT EXISTS "risk_score" text;
ALTER TABLE "public"."univ_riskregisters" ADD COLUMN IF NOT EXISTS "owner" text;
ALTER TABLE "public"."univ_riskregisters" ADD COLUMN IF NOT EXISTS "mitigation_plan" text;
ALTER TABLE "public"."univ_riskregisters" ADD COLUMN IF NOT EXISTS "review_date" text;
ALTER TABLE "public"."univ_riskregisters" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_rooms" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_rooms" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_rooms" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_rooms" ADD COLUMN IF NOT EXISTS "room_number" text;
ALTER TABLE "public"."univ_rooms" ADD COLUMN IF NOT EXISTS "room_type" text;
ALTER TABLE "public"."univ_rooms" ADD COLUMN IF NOT EXISTS "floor" text;
ALTER TABLE "public"."univ_rooms" ADD COLUMN IF NOT EXISTS "price_per_night" text;
ALTER TABLE "public"."univ_rooms" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_rooms" ADD COLUMN IF NOT EXISTS "amenities" text;

CREATE TABLE IF NOT EXISTS "public"."univ_routes" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_routes" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_routes" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_routes" ADD COLUMN IF NOT EXISTS "route_name" text;

CREATE TABLE IF NOT EXISTS "public"."univ_safety" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_safety" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_safety" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_safety" ADD COLUMN IF NOT EXISTS "incident_type" text;
ALTER TABLE "public"."univ_safety" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_safety" ADD COLUMN IF NOT EXISTS "reported_by" text;
ALTER TABLE "public"."univ_safety" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_safety" ADD COLUMN IF NOT EXISTS "severity" text;

CREATE TABLE IF NOT EXISTS "public"."univ_salestargets" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_salestargets" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_salestargets" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_salestargets" ADD COLUMN IF NOT EXISTS "sales_rep" text;
ALTER TABLE "public"."univ_salestargets" ADD COLUMN IF NOT EXISTS "team" text;
ALTER TABLE "public"."univ_salestargets" ADD COLUMN IF NOT EXISTS "period" text;
ALTER TABLE "public"."univ_salestargets" ADD COLUMN IF NOT EXISTS "target_amount" text;
ALTER TABLE "public"."univ_salestargets" ADD COLUMN IF NOT EXISTS "achieved_amount" text;
ALTER TABLE "public"."univ_salestargets" ADD COLUMN IF NOT EXISTS "deals_closed" text;
ALTER TABLE "public"."univ_salestargets" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_salestargets" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_scholarships" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_scholarships" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_scholarships" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_scraprates" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_scraprates" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_scraprates" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_seokeyword" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_seokeyword" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_seokeyword" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_servermetrics" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_servermetrics" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_servermetrics" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_servermetrics" ADD COLUMN IF NOT EXISTS "server_name" text;
ALTER TABLE "public"."univ_servermetrics" ADD COLUMN IF NOT EXISTS "ip_address" text;
ALTER TABLE "public"."univ_servermetrics" ADD COLUMN IF NOT EXISTS "cpu_usage" text;
ALTER TABLE "public"."univ_servermetrics" ADD COLUMN IF NOT EXISTS "memory_usage" text;
ALTER TABLE "public"."univ_servermetrics" ADD COLUMN IF NOT EXISTS "disk_usage" text;
ALTER TABLE "public"."univ_servermetrics" ADD COLUMN IF NOT EXISTS "uptime_hours" text;
ALTER TABLE "public"."univ_servermetrics" ADD COLUMN IF NOT EXISTS "recorded_at" text;
ALTER TABLE "public"."univ_servermetrics" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_servermetrics" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_site_inspections" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_site_inspections" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_site_inspections" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_site_inspections" ADD COLUMN IF NOT EXISTS "project_id" text;
ALTER TABLE "public"."univ_site_inspections" ADD COLUMN IF NOT EXISTS "inspector_name" text;
ALTER TABLE "public"."univ_site_inspections" ADD COLUMN IF NOT EXISTS "inspection_date" text;
ALTER TABLE "public"."univ_site_inspections" ADD COLUMN IF NOT EXISTS "findings" text;
ALTER TABLE "public"."univ_site_inspections" ADD COLUMN IF NOT EXISTS "snag_list" text;
ALTER TABLE "public"."univ_site_inspections" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_slaagreements" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_slaagreements" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_slaagreements" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_slaagreements" ADD COLUMN IF NOT EXISTS "agreement_name" text;
ALTER TABLE "public"."univ_slaagreements" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."univ_slaagreements" ADD COLUMN IF NOT EXISTS "response_time_hours" text;
ALTER TABLE "public"."univ_slaagreements" ADD COLUMN IF NOT EXISTS "resolution_time_hours" text;
ALTER TABLE "public"."univ_slaagreements" ADD COLUMN IF NOT EXISTS "uptime_guarantee" text;
ALTER TABLE "public"."univ_slaagreements" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."univ_slaagreements" ADD COLUMN IF NOT EXISTS "end_date" text;
ALTER TABLE "public"."univ_slaagreements" ADD COLUMN IF NOT EXISTS "penalty_clause" text;
ALTER TABLE "public"."univ_slaagreements" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_snaglists" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_snaglists" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_snaglists" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_softwarelicenses" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_softwarelicenses" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_softwarelicenses" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_softwarelicenses" ADD COLUMN IF NOT EXISTS "software_name" text;
ALTER TABLE "public"."univ_softwarelicenses" ADD COLUMN IF NOT EXISTS "vendor" text;
ALTER TABLE "public"."univ_softwarelicenses" ADD COLUMN IF NOT EXISTS "license_key" text;
ALTER TABLE "public"."univ_softwarelicenses" ADD COLUMN IF NOT EXISTS "seats" text;
ALTER TABLE "public"."univ_softwarelicenses" ADD COLUMN IF NOT EXISTS "purchase_date" text;
ALTER TABLE "public"."univ_softwarelicenses" ADD COLUMN IF NOT EXISTS "expiry_date" text;
ALTER TABLE "public"."univ_softwarelicenses" ADD COLUMN IF NOT EXISTS "cost_per_year" text;
ALTER TABLE "public"."univ_softwarelicenses" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_softwarelicenses" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_sponsorship" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_sponsorship" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_sponsorship" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_sslcertificates" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_sslcertificates" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_sslcertificates" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_sslcertificates" ADD COLUMN IF NOT EXISTS "domain" text;
ALTER TABLE "public"."univ_sslcertificates" ADD COLUMN IF NOT EXISTS "issuer" text;
ALTER TABLE "public"."univ_sslcertificates" ADD COLUMN IF NOT EXISTS "cert_type" text;
ALTER TABLE "public"."univ_sslcertificates" ADD COLUMN IF NOT EXISTS "issue_date" text;
ALTER TABLE "public"."univ_sslcertificates" ADD COLUMN IF NOT EXISTS "expiry_date" text;
ALTER TABLE "public"."univ_sslcertificates" ADD COLUMN IF NOT EXISTS "auto_renew" text;
ALTER TABLE "public"."univ_sslcertificates" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_sslcertificates" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_stockoptions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_stockoptions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_stockoptions" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_students" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_students" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_students" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_students" ADD COLUMN IF NOT EXISTS "student_id_number" text;

CREATE TABLE IF NOT EXISTS "public"."univ_subscriptions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_subscriptions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_subscriptions" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_subscriptions" ADD COLUMN IF NOT EXISTS "plan_name" text;
ALTER TABLE "public"."univ_subscriptions" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "public"."univ_subscriptions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_subscriptions" ADD COLUMN IF NOT EXISTS "billing_cycle" text;
ALTER TABLE "public"."univ_subscriptions" ADD COLUMN IF NOT EXISTS "amount" text;
ALTER TABLE "public"."univ_subscriptions" ADD COLUMN IF NOT EXISTS "next_billing_date" text;

CREATE TABLE IF NOT EXISTS "public"."univ_supplierdirectorys" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_supplierdirectorys" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_supplierdirectorys" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_supplierdirectorys" ADD COLUMN IF NOT EXISTS "supplier_name" text;
ALTER TABLE "public"."univ_supplierdirectorys" ADD COLUMN IF NOT EXISTS "contact_person" text;
ALTER TABLE "public"."univ_supplierdirectorys" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."univ_supplierdirectorys" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."univ_supplierdirectorys" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."univ_supplierdirectorys" ADD COLUMN IF NOT EXISTS "lead_time_days" text;
ALTER TABLE "public"."univ_supplierdirectorys" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_supplierdirectorys" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_supporttickets" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "ticket_number" text;
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "customer_email" text;
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "assigned_to" text;
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "created_date" text;
ALTER TABLE "public"."univ_supporttickets" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_tablereservation" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_tablereservation" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_tablereservation" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_taxfilings" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_taxfilings" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_taxfilings" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_taxfilings" ADD COLUMN IF NOT EXISTS "filing_name" text;
ALTER TABLE "public"."univ_taxfilings" ADD COLUMN IF NOT EXISTS "tax_type" text;
ALTER TABLE "public"."univ_taxfilings" ADD COLUMN IF NOT EXISTS "period" text;
ALTER TABLE "public"."univ_taxfilings" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."univ_taxfilings" ADD COLUMN IF NOT EXISTS "filed_date" text;
ALTER TABLE "public"."univ_taxfilings" ADD COLUMN IF NOT EXISTS "tax_amount" text;
ALTER TABLE "public"."univ_taxfilings" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_taxfilings" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_telemedicine" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_telemedicine" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_telemedicine" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_telemedicine" ADD COLUMN IF NOT EXISTS "patient_id" text;
ALTER TABLE "public"."univ_telemedicine" ADD COLUMN IF NOT EXISTS "doctor_id" text;
ALTER TABLE "public"."univ_telemedicine" ADD COLUMN IF NOT EXISTS "scheduled_time" text;
ALTER TABLE "public"."univ_telemedicine" ADD COLUMN IF NOT EXISTS "meeting_link" text;
ALTER TABLE "public"."univ_telemedicine" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_telemedicine" ADD COLUMN IF NOT EXISTS "notes" text;

CREATE TABLE IF NOT EXISTS "public"."univ_tenant" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_tenant" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_tenant" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_tenant" ADD COLUMN IF NOT EXISTS "tenant_name" text;
ALTER TABLE "public"."univ_tenant" ADD COLUMN IF NOT EXISTS "property_id" text;
ALTER TABLE "public"."univ_tenant" ADD COLUMN IF NOT EXISTS "lease_end" text;
ALTER TABLE "public"."univ_tenant" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_ticketsales" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_ticketsales" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_ticketsales" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_ticketsales" ADD COLUMN IF NOT EXISTS "event_name" text;
ALTER TABLE "public"."univ_ticketsales" ADD COLUMN IF NOT EXISTS "ticket_type" text;
ALTER TABLE "public"."univ_ticketsales" ADD COLUMN IF NOT EXISTS "price" text;
ALTER TABLE "public"."univ_ticketsales" ADD COLUMN IF NOT EXISTS "quantity_available" text;
ALTER TABLE "public"."univ_ticketsales" ADD COLUMN IF NOT EXISTS "quantity_sold" text;
ALTER TABLE "public"."univ_ticketsales" ADD COLUMN IF NOT EXISTS "sale_start_date" text;
ALTER TABLE "public"."univ_ticketsales" ADD COLUMN IF NOT EXISTS "sale_end_date" text;

CREATE TABLE IF NOT EXISTS "public"."univ_timebilling" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_timebilling" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_timebilling" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_timebilling" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "public"."univ_timebilling" ADD COLUMN IF NOT EXISTS "hours" text;
ALTER TABLE "public"."univ_timebilling" ADD COLUMN IF NOT EXISTS "rate" text;
ALTER TABLE "public"."univ_timebilling" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_timesheet" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_timesheet" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_timesheet" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_tourpackage" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_tourpackage" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_tourpackage" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_trademark" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_trademark" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_trademark" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_trademark" ADD COLUMN IF NOT EXISTS "trademark_name" text;
ALTER TABLE "public"."univ_trademark" ADD COLUMN IF NOT EXISTS "registration_number" text;
ALTER TABLE "public"."univ_trademark" ADD COLUMN IF NOT EXISTS "owner" text;
ALTER TABLE "public"."univ_trademark" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_trainingrecords" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_trainingrecords" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_trainingrecords" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_trainingrecords" ADD COLUMN IF NOT EXISTS "employee_name" text;
ALTER TABLE "public"."univ_trainingrecords" ADD COLUMN IF NOT EXISTS "training_name" text;
ALTER TABLE "public"."univ_trainingrecords" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "public"."univ_trainingrecords" ADD COLUMN IF NOT EXISTS "training_type" text;
ALTER TABLE "public"."univ_trainingrecords" ADD COLUMN IF NOT EXISTS "start_date" text;
ALTER TABLE "public"."univ_trainingrecords" ADD COLUMN IF NOT EXISTS "completion_date" text;
ALTER TABLE "public"."univ_trainingrecords" ADD COLUMN IF NOT EXISTS "score" text;
ALTER TABLE "public"."univ_trainingrecords" ADD COLUMN IF NOT EXISTS "certificate_url" text;
ALTER TABLE "public"."univ_trainingrecords" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_triage" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_triage" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_triage" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_tuitions" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_tuitions" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_tuitions" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_utilitybills" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_utilitybills" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_utilitybills" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_utilitybills" ADD COLUMN IF NOT EXISTS "unit_address" text;
ALTER TABLE "public"."univ_utilitybills" ADD COLUMN IF NOT EXISTS "tenant_name" text;
ALTER TABLE "public"."univ_utilitybills" ADD COLUMN IF NOT EXISTS "utility_type" text;
ALTER TABLE "public"."univ_utilitybills" ADD COLUMN IF NOT EXISTS "amount" text;
ALTER TABLE "public"."univ_utilitybills" ADD COLUMN IF NOT EXISTS "bill_date" text;
ALTER TABLE "public"."univ_utilitybills" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "public"."univ_utilitybills" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_utilitybills" ADD COLUMN IF NOT EXISTS "meter_reading" text;

CREATE TABLE IF NOT EXISTS "public"."univ_vitalsigns" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_vitalsigns" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_vitalsigns" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_volunteerroster" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_volunteerroster" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_volunteerroster" ADD COLUMN IF NOT EXISTS "company_id" text;

CREATE TABLE IF NOT EXISTS "public"."univ_vulnerabilities" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_vulnerabilities" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_vulnerabilities" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_vulnerabilities" ADD COLUMN IF NOT EXISTS "vulnerability_name" text;
ALTER TABLE "public"."univ_vulnerabilities" ADD COLUMN IF NOT EXISTS "cve_id" text;
ALTER TABLE "public"."univ_vulnerabilities" ADD COLUMN IF NOT EXISTS "severity" text;
ALTER TABLE "public"."univ_vulnerabilities" ADD COLUMN IF NOT EXISTS "affected_system" text;
ALTER TABLE "public"."univ_vulnerabilities" ADD COLUMN IF NOT EXISTS "discovered_date" text;
ALTER TABLE "public"."univ_vulnerabilities" ADD COLUMN IF NOT EXISTS "remediation_steps" text;
ALTER TABLE "public"."univ_vulnerabilities" ADD COLUMN IF NOT EXISTS "assigned_to" text;
ALTER TABLE "public"."univ_vulnerabilities" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_wards" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_wards" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_wards" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_wards" ADD COLUMN IF NOT EXISTS "ward_name" text;
ALTER TABLE "public"."univ_wards" ADD COLUMN IF NOT EXISTS "bed_number" text;
ALTER TABLE "public"."univ_wards" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "public"."univ_wards" ADD COLUMN IF NOT EXISTS "patient_id" text;
ALTER TABLE "public"."univ_wards" ADD COLUMN IF NOT EXISTS "admission_date" text;
ALTER TABLE "public"."univ_wards" ADD COLUMN IF NOT EXISTS "expected_discharge" text;

CREATE TABLE IF NOT EXISTS "public"."univ_warehouses" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_warehouses" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_warehouses" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_warehouses" ADD COLUMN IF NOT EXISTS "zone_name" text;
ALTER TABLE "public"."univ_warehouses" ADD COLUMN IF NOT EXISTS "bay_number" text;
ALTER TABLE "public"."univ_warehouses" ADD COLUMN IF NOT EXISTS "capacity" text;
ALTER TABLE "public"."univ_warehouses" ADD COLUMN IF NOT EXISTS "current_occupancy" text;
ALTER TABLE "public"."univ_warehouses" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_wishlists" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_wishlists" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_wishlists" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "public"."univ_wishlists" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "public"."univ_wishlists" ADD COLUMN IF NOT EXISTS "item_name" text;
ALTER TABLE "public"."univ_wishlists" ADD COLUMN IF NOT EXISTS "product_sku" text;
ALTER TABLE "public"."univ_wishlists" ADD COLUMN IF NOT EXISTS "price" text;
ALTER TABLE "public"."univ_wishlists" ADD COLUMN IF NOT EXISTS "added_date" text;
ALTER TABLE "public"."univ_wishlists" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "public"."univ_wishlists" ADD COLUMN IF NOT EXISTS "status" text;

CREATE TABLE IF NOT EXISTS "public"."univ_workorders" (
    id uuid default gen_random_uuid() primary key
);
ALTER TABLE "public"."univ_workorders" ADD COLUMN IF NOT EXISTS "created_at" text;
ALTER TABLE "public"."univ_workorders" ADD COLUMN IF NOT EXISTS "company_id" text;

