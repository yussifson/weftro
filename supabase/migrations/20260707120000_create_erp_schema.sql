-- ERP & Enterprise HR Schema Expansion

-- 1. Applicant Tracking System (ATS)
CREATE TABLE IF NOT EXISTS public.univ_erp_candidates (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    company_id TEXT NOT NULL,
    job_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    resume_url TEXT,
    stage TEXT DEFAULT 'Applied',
    ai_score INTEGER,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS public.univ_erp_interviews (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    company_id TEXT NOT NULL,
    candidate_id TEXT,
    interviewer_id TEXT,
    interview_date TEXT,
    type TEXT,
    feedback TEXT,
    score INTEGER,
    status TEXT DEFAULT 'Scheduled'
);

-- 2. Onboarding & Provisioning
CREATE TABLE IF NOT EXISTS public.univ_erp_onboarding (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    company_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    department TEXT,
    assigned_to TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'Pending'
);

-- 3. Performance & OKRs
CREATE TABLE IF NOT EXISTS public.univ_erp_okrs (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    company_id TEXT NOT NULL,
    owner_id TEXT,
    objective TEXT NOT NULL,
    key_results TEXT,
    progress INTEGER DEFAULT 0,
    quarter TEXT,
    status TEXT DEFAULT 'On Track'
);

CREATE TABLE IF NOT EXISTS public.univ_erp_reviews (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    company_id TEXT NOT NULL,
    reviewee_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    review_cycle TEXT,
    feedback TEXT,
    rating INTEGER,
    status TEXT DEFAULT 'Draft'
);

-- 4. Learning & Development (LMS)
CREATE TABLE IF NOT EXISTS public.univ_erp_courses (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    company_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    duration TEXT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'Published'
);

-- 5. Finance & Expenses
CREATE TABLE IF NOT EXISTS public.univ_erp_expenses (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    company_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    amount NUMERIC,
    currency TEXT DEFAULT 'USD',
    category TEXT,
    receipt_url TEXT,
    description TEXT,
    status TEXT DEFAULT 'Pending Approval'
);

-- 6. Benefits & Total Rewards
CREATE TABLE IF NOT EXISTS public.univ_erp_benefits (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    provider TEXT,
    type TEXT,
    employer_contribution NUMERIC,
    employee_deduction NUMERIC,
    status TEXT DEFAULT 'Active'
);

-- 7. Intranet & Culture
CREATE TABLE IF NOT EXISTS public.univ_erp_announcements (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    company_id TEXT NOT NULL,
    author_id TEXT,
    title TEXT NOT NULL,
    content TEXT,
    priority TEXT DEFAULT 'Normal',
    status TEXT DEFAULT 'Published'
);

CREATE TABLE IF NOT EXISTS public.univ_erp_surveys (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    company_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'eNPS',
    questions TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'Active'
);

-- Enable RLS
ALTER TABLE public.univ_erp_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_erp_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_erp_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_erp_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_erp_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_erp_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_erp_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_erp_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_erp_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_erp_surveys ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON TABLE public.univ_erp_candidates TO authenticated;
GRANT ALL ON TABLE public.univ_erp_interviews TO authenticated;
GRANT ALL ON TABLE public.univ_erp_onboarding TO authenticated;
GRANT ALL ON TABLE public.univ_erp_okrs TO authenticated;
GRANT ALL ON TABLE public.univ_erp_reviews TO authenticated;
GRANT ALL ON TABLE public.univ_erp_courses TO authenticated;
GRANT ALL ON TABLE public.univ_erp_expenses TO authenticated;
GRANT ALL ON TABLE public.univ_erp_benefits TO authenticated;
GRANT ALL ON TABLE public.univ_erp_announcements TO authenticated;
GRANT ALL ON TABLE public.univ_erp_surveys TO authenticated;

-- Add to PowerSync Publication
ALTER PUBLICATION powersync ADD TABLE public.univ_erp_candidates;
ALTER PUBLICATION powersync ADD TABLE public.univ_erp_interviews;
ALTER PUBLICATION powersync ADD TABLE public.univ_erp_onboarding;
ALTER PUBLICATION powersync ADD TABLE public.univ_erp_okrs;
ALTER PUBLICATION powersync ADD TABLE public.univ_erp_reviews;
ALTER PUBLICATION powersync ADD TABLE public.univ_erp_courses;
ALTER PUBLICATION powersync ADD TABLE public.univ_erp_expenses;
ALTER PUBLICATION powersync ADD TABLE public.univ_erp_benefits;
ALTER PUBLICATION powersync ADD TABLE public.univ_erp_announcements;
ALTER PUBLICATION powersync ADD TABLE public.univ_erp_surveys;
