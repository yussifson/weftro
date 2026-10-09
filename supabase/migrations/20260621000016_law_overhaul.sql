-- ── TIME TRACKING ─────────────────────────────────────────────────────────────
-- time_entries already exists, so we alter it
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS hours numeric(8,2) DEFAULT 0;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS rate_per_hour numeric(10,2) DEFAULT 0;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS is_billable boolean DEFAULT true;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS is_billed boolean DEFAULT false;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS entry_date date DEFAULT CURRENT_DATE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS timer_started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_time_entries_company ON time_entries(company_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_case      ON time_entries(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_unbilled  ON time_entries(company_id, is_billed) WHERE is_billed = false;

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- ── TRUST ACCOUNTING / CLIENT LEDGER ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trust_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  case_id         uuid REFERENCES univ_cases(id) ON DELETE SET NULL,
  account_name    text NOT NULL,
  balance         numeric(15,2) NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'USD',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trust_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  trust_account_id uuid NOT NULL REFERENCES trust_accounts(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit','withdrawal','transfer','disbursement')),
  amount          numeric(15,2) NOT NULL CHECK (amount > 0),
  description     text NOT NULL,
  reference       text,
  balance_after   numeric(15,2) NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_accounts_company ON trust_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_trust_accounts_client    ON trust_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_trust_transactions_account ON trust_transactions(trust_account_id, transaction_date DESC);

ALTER TABLE trust_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trust_accounts_company" ON trust_accounts;
CREATE POLICY "trust_accounts_company" ON trust_accounts FOR ALL USING (
  company_id IN (SELECT company_id::uuid FROM profiles WHERE id::uuid = auth.uid())
);
DROP POLICY IF EXISTS "trust_transactions_company" ON trust_transactions;
CREATE POLICY "trust_transactions_company" ON trust_transactions FOR ALL USING (
  company_id IN (SELECT company_id::uuid FROM profiles WHERE id::uuid = auth.uid())
);

-- ── CLIENT PORTAL ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_portal_access (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email           text NOT NULL,
  access_token    text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  is_active       boolean NOT NULL DEFAULT true,
  last_accessed_at timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, client_id, email)
);

CREATE TABLE IF NOT EXISTS client_portal_uploads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  case_id         uuid REFERENCES univ_cases(id),
  client_id       uuid NOT NULL REFERENCES clients(id),
  file_name       text NOT NULL,
  file_path       text NOT NULL,
  file_size       integer,
  mime_type       text,
  uploaded_by_client boolean NOT NULL DEFAULT true,
  reviewed        boolean NOT NULL DEFAULT false,
  reviewed_by     uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_access_company" ON client_portal_access;
CREATE POLICY "portal_access_company" ON client_portal_access FOR ALL USING (
  company_id IN (SELECT company_id::uuid FROM profiles WHERE id::uuid = auth.uid())
);
DROP POLICY IF EXISTS "portal_uploads_company" ON client_portal_uploads;
CREATE POLICY "portal_uploads_company" ON client_portal_uploads FOR ALL USING (
  company_id IN (SELECT company_id::uuid FROM profiles WHERE id::uuid = auth.uid())
);

-- ── DOCUMENT TEMPLATES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  category        text NOT NULL CHECK (category IN ('engagement_letter','retainer','court_filing','demand_letter','settlement','invoice','custom')),
  content         text NOT NULL,
  variables       text[] NOT NULL DEFAULT '{}',
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id     uuid REFERENCES document_templates(id),
  case_id         uuid REFERENCES univ_cases(id),
  client_id       uuid REFERENCES clients(id),
  name            text NOT NULL,
  content         text NOT NULL,
  file_path       text,
  generated_by    uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doc_templates_company" ON document_templates;
CREATE POLICY "doc_templates_company" ON document_templates FOR ALL USING (
  company_id IN (SELECT company_id::uuid FROM profiles WHERE id::uuid = auth.uid())
);
DROP POLICY IF EXISTS "generated_docs_company" ON generated_documents;
CREATE POLICY "generated_docs_company" ON generated_documents FOR ALL USING (
  company_id IN (SELECT company_id::uuid FROM profiles WHERE id::uuid = auth.uid())
);

-- ── INTAKE FORMS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS intake_forms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  case_type       text,
  fields          jsonb NOT NULL DEFAULT '[]',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intake_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  form_id         uuid NOT NULL REFERENCES intake_forms(id),
  submitted_by_name text NOT NULL,
  submitted_by_email text NOT NULL,
  responses       jsonb NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','converted','rejected')),
  converted_to_case_id uuid REFERENCES univ_cases(id),
  converted_to_client_id uuid REFERENCES clients(id),
  reviewed_by     uuid REFERENCES auth.users(id),
  reviewed_at     timestamptz,
  submitted_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intake_forms_company" ON intake_forms;
CREATE POLICY "intake_forms_company" ON intake_forms FOR ALL USING (
  company_id IN (SELECT company_id::uuid FROM profiles WHERE id::uuid = auth.uid())
);
DROP POLICY IF EXISTS "intake_submissions_company" ON intake_submissions;
CREATE POLICY "intake_submissions_company" ON intake_submissions FOR ALL USING (
  company_id IN (SELECT company_id::uuid FROM profiles WHERE id::uuid = auth.uid())
);

-- ── CASE BUDGET ───────────────────────────────────────────────────────────────
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS budget_amount numeric(15,2);
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS budget_notes text;
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS matter_number text;
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS court_name text;
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS judge_name text;
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS jurisdiction text;
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS opposing_counsel text;
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS statute_of_limitations date;
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS risk_score numeric(5,2);
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS risk_factors text[];
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS predicted_outcome text;
ALTER TABLE univ_cases ADD COLUMN IF NOT EXISTS outcome_confidence numeric(5,2);

-- ── ENHANCED CONFLICT CHECK ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conflict_check_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  checked_name    text NOT NULL,
  check_type      text NOT NULL CHECK (check_type IN ('new_client','new_case','manual')),
  matches_found   jsonb NOT NULL DEFAULT '[]',
  conflict_detected boolean NOT NULL DEFAULT false,
  checked_by      uuid REFERENCES auth.users(id),
  checked_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conflict_check_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conflict_check_company" ON conflict_check_results;
CREATE POLICY "conflict_check_company" ON conflict_check_results FOR ALL USING (
  company_id IN (SELECT company_id::uuid FROM profiles WHERE id::uuid = auth.uid())
);

-- ── COURT HEARINGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS court_hearings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  case_id         uuid NOT NULL REFERENCES univ_cases(id) ON DELETE CASCADE,
  hearing_type    text NOT NULL,
  hearing_date    timestamptz NOT NULL,
  court_name      text,
  courtroom       text,
  judge_name      text,
  notes           text,
  outcome         text,
  status          text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','adjourned','cancelled')),
  reminder_sent   boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_court_hearings_case      ON court_hearings(case_id);
CREATE INDEX IF NOT EXISTS idx_court_hearings_company ON court_hearings(company_id, hearing_date);

ALTER TABLE court_hearings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "court_hearings_company" ON court_hearings;
CREATE POLICY "court_hearings_company" ON court_hearings FOR ALL USING (
  company_id IN (SELECT company_id::uuid FROM profiles WHERE id::uuid = auth.uid())
);

-- ── INTELLIGENCE FIELDS ON CLIENTS ───────────────────────────────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS churn_risk_score numeric(5,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS churn_risk_level text CHECK (churn_risk_level IN ('low','medium','high'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lifetime_value numeric(15,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_reliability text CHECK (payment_reliability IN ('reliable','slow','unreliable','unknown')) DEFAULT 'unknown';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avg_payment_days numeric(8,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_conversion_score numeric(5,2);
