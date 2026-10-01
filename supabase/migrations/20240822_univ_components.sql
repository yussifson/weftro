-- Batch 1 to 3 Tables
CREATE TABLE IF NOT EXISTS public.univ_crm_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    first_name text,
    last_name text,
    email text,
    phone text,
    source text,
    value numeric,
    status text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    name text,
    description text,
    client_name text,
    status text,
    priority text,
    start_date text,
    due_date text,
    budget numeric,
    assigned_to text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    name text,
    email text,
    phone text,
    company text,
    type text,
    address text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_kanban_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    title text,
    description text,
    status text,
    priority text,
    assignee text,
    due_date text,
    labels text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    name text,
    type text,
    description text,
    file_url text,
    status text,
    tags text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_inventory (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    item_name text,
    sku text,
    category text,
    quantity numeric,
    unit_price numeric,
    reorder_level numeric,
    supplier text,
    location text,
    status text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_hr_employees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    first_name text,
    last_name text,
    email text,
    phone text,
    role_title text,
    department text,
    status text,
    salary numeric,
    employment_type text,
    hire_date text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    client_name text,
    client_email text,
    invoice_number text,
    amount numeric,
    currency text,
    status text,
    due_date text,
    issue_date text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_payroll (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    employee_name text,
    period_start text,
    period_end text,
    basic_salary numeric,
    allowances numeric,
    deductions numeric,
    net_pay numeric,
    status text,
    payment_date text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_recruitment (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    candidate_name text,
    email text,
    phone text,
    position text,
    status text,
    source text,
    experience_years numeric,
    rating numeric,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_appointments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    title text,
    client_name text,
    client_email text,
    client_phone text,
    date text,
    time text,
    duration_minutes integer,
    location text,
    notes text,
    status text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_attendance (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    employee_name text,
    date text,
    check_in text,
    check_out text,
    status text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_leave_management (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    employee_id text,
    leave_type text,
    start_date text,
    end_date text,
    status text,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.univ_bookings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    booking_reference text,
    guest_name text,
    guest_email text,
    check_in text,
    check_out text,
    room_type text,
    status text,
    total_amount numeric,
    created_at timestamp with time zone DEFAULT now()
);
