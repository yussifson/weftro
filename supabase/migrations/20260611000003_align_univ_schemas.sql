-- 1. Align univ_appointments table
ALTER TABLE public.univ_appointments ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.univ_appointments ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.univ_appointments ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.univ_appointments ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE public.univ_appointments ADD COLUMN IF NOT EXISTS time TEXT;
ALTER TABLE public.univ_appointments ADD COLUMN IF NOT EXISTS duration_minutes INT;
ALTER TABLE public.univ_appointments ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.univ_appointments ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Align univ_contacts table
ALTER TABLE public.univ_contacts ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.univ_contacts ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.univ_contacts ADD COLUMN IF NOT EXISTS organization TEXT;
ALTER TABLE public.univ_contacts ADD COLUMN IF NOT EXISTS company_name TEXT;

-- 3. Align univ_recruitment table
ALTER TABLE public.univ_recruitment ADD COLUMN IF NOT EXISTS candidate_name TEXT;
ALTER TABLE public.univ_recruitment ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.univ_recruitment ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Applied';
ALTER TABLE public.univ_recruitment ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.univ_recruitment ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE public.univ_recruitment ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Align univ_projects table
ALTER TABLE public.univ_projects ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.univ_projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.univ_projects ADD COLUMN IF NOT EXISTS completion_percentage NUMERIC DEFAULT 0;
ALTER TABLE public.univ_projects ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.univ_projects ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE public.univ_projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.univ_projects ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.univ_projects ADD COLUMN IF NOT EXISTS budget NUMERIC;
ALTER TABLE public.univ_projects ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- 5. Drop constraints for site inspections & telemedicine
ALTER TABLE public.univ_site_inspections ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.univ_telemedicine ALTER COLUMN patient_id DROP NOT NULL;

-- 6. Align univ_hr_employees table
ALTER TABLE public.univ_hr_employees ADD COLUMN IF NOT EXISTS employment_type TEXT;

-- 7. Align univ_invoices table
ALTER TABLE public.univ_invoices ADD COLUMN IF NOT EXISTS issue_date DATE;

-- 8. Align univ_kanban_tasks table
ALTER TABLE public.univ_kanban_tasks ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.univ_kanban_tasks ADD COLUMN IF NOT EXISTS assignee TEXT;
ALTER TABLE public.univ_kanban_tasks ADD COLUMN IF NOT EXISTS labels TEXT;

-- 9. Align univ_labs table
ALTER TABLE public.univ_labs ADD COLUMN IF NOT EXISTS patient_name TEXT;

-- 10. Align univ_emr table
ALTER TABLE public.univ_emr ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.univ_emr ADD COLUMN IF NOT EXISTS doctor_name TEXT;

-- 11. Create public.univ_notifications table if not exists
CREATE TABLE IF NOT EXISTS public.univ_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's notifications" ON public.univ_notifications;
CREATE POLICY "Users can manage their company's notifications" ON public.univ_notifications FOR ALL USING (auth.uid() IS NOT NULL);

-- 12. Align univ_payroll table
ALTER TABLE public.univ_payroll ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.univ_payroll ADD COLUMN IF NOT EXISTS basic_salary NUMERIC;
ALTER TABLE public.univ_payroll ADD COLUMN IF NOT EXISTS allowances NUMERIC;
ALTER TABLE public.univ_payroll ALTER COLUMN employee_id DROP NOT NULL;
