-- Phase 2 Features: Team Management, Market Intelligence, CRM Lead Management

CREATE TABLE IF NOT EXISTS public.univ_re_companies (id UUID PRIMARY KEY);

-- ===== TEAM MANAGEMENT TABLES =====

CREATE TABLE IF NOT EXISTS univ_re_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'agent', -- admin, agent, support, viewer
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, suspended
  avatar_url TEXT,
  bio TEXT,
  license_number TEXT,
  license_expiry DATE,
  commission_rate DECIMAL(5, 2) DEFAULT 0,
  join_date DATE DEFAULT CURRENT_DATE,
  last_active TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES univ_re_companies(id)
);

CREATE TABLE IF NOT EXISTS univ_re_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  role_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES univ_re_companies(id),
  UNIQUE(company_id, role_name)
);

CREATE TABLE IF NOT EXISTS univ_re_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES univ_re_companies(id)
);

-- ===== MARKET INTELLIGENCE TABLES =====

CREATE TABLE IF NOT EXISTS univ_re_mls_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  mls_id TEXT NOT NULL,
  property_address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  price DECIMAL(12, 2),
  list_date DATE,
  sold_date DATE,
  days_on_market INT,
  bedrooms INT,
  bathrooms DECIMAL(3, 1),
  square_feet INT,
  lot_size TEXT,
  property_type TEXT,
  status TEXT, -- active, sold, expired, pending
  agent_name TEXT,
  brokerage TEXT,
  description TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  source TEXT DEFAULT 'mls',
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES univ_re_companies(id),
  UNIQUE(company_id, mls_id)
);

CREATE TABLE IF NOT EXISTS univ_re_comparable_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  property_id UUID,
  analysis_date DATE DEFAULT CURRENT_DATE,
  subject_address TEXT,
  subject_price DECIMAL(12, 2),
  comparable_1_address TEXT,
  comparable_1_price DECIMAL(12, 2),
  comparable_1_adjustment DECIMAL(12, 2),
  comparable_2_address TEXT,
  comparable_2_price DECIMAL(12, 2),
  comparable_2_adjustment DECIMAL(12, 2),
  comparable_3_address TEXT,
  comparable_3_price DECIMAL(12, 2),
  comparable_3_adjustment DECIMAL(12, 2),
  estimated_value DECIMAL(12, 2),
  confidence_level INT DEFAULT 80,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES univ_re_companies(id)
);

CREATE TABLE IF NOT EXISTS univ_re_market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  metric_date DATE NOT NULL,
  avg_price DECIMAL(12, 2),
  median_price DECIMAL(12, 2),
  list_count INT,
  sold_count INT,
  avg_days_on_market INT,
  price_change_percent DECIMAL(5, 2),
  inventory_level TEXT, -- low, moderate, high
  market_condition TEXT, -- buyer, seller, balanced
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES univ_re_companies(id),
  UNIQUE(company_id, city, state, metric_date)
);

-- ===== CRM LEAD MANAGEMENT TABLES =====

CREATE TABLE IF NOT EXISTS univ_re_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'website', -- website, referral, ad, walkIn, phone, other
  property_interest TEXT,
  budget_min DECIMAL(12, 2),
  budget_max DECIMAL(12, 2),
  lead_type TEXT NOT NULL DEFAULT 'buyer', -- buyer, seller, investor, renter
  status TEXT NOT NULL DEFAULT 'new', -- new, contacted, qualified, negotiating, closed, lost
  stage TEXT DEFAULT 'awareness', -- awareness, consideration, decision, closed
  assigned_agent_id UUID,
  lead_score INT DEFAULT 0, -- 0-100 AI calculated
  notes TEXT,
  last_contact TIMESTAMP,
  next_followup DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES univ_re_companies(id),
  CONSTRAINT fk_agent FOREIGN KEY (assigned_agent_id) REFERENCES univ_re_team_members(id)
);

CREATE TABLE IF NOT EXISTS univ_re_lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  engagement_score INT DEFAULT 0, -- Email opens, clicks, website visits
  responsiveness_score INT DEFAULT 0, -- Reply time, message responses
  budget_score INT DEFAULT 0, -- Budget commitment level
  timeline_score INT DEFAULT 0, -- How soon they want to buy/sell
  behavior_score INT DEFAULT 0, -- Visit frequency, property interest
  overall_score INT DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES univ_re_companies(id),
  CONSTRAINT fk_lead FOREIGN KEY (lead_id) REFERENCES univ_re_leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS univ_re_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- email, call, text, meeting, property_view, message
  subject TEXT,
  description TEXT,
  duration_minutes INT,
  outcome TEXT,
  next_action TEXT,
  agent_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES univ_re_companies(id),
  CONSTRAINT fk_lead FOREIGN KEY (lead_id) REFERENCES univ_re_leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent FOREIGN KEY (agent_id) REFERENCES univ_re_team_members(id)
);

CREATE TABLE IF NOT EXISTS univ_re_lead_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL, -- email, sms, direct_mail, social
  lead_source TEXT,
  status TEXT DEFAULT 'draft', -- draft, scheduled, active, completed, paused
  target_audience JSONB,
  sent_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  conversion_count INT DEFAULT 0,
  roi DECIMAL(5, 2),
  start_date DATE,
  end_date DATE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES univ_re_companies(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_company ON univ_re_team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_mls_listings_company ON univ_re_mls_listings(company_id);
CREATE INDEX IF NOT EXISTS idx_market_trends_company ON univ_re_market_trends(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_company ON univ_re_leads(company_id);
ALTER TABLE univ_re_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE univ_re_leads ADD COLUMN IF NOT EXISTS assigned_agent_id UUID;
CREATE INDEX IF NOT EXISTS idx_leads_status ON univ_re_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_agent ON univ_re_leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON univ_re_activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON univ_re_activity_logs(user_id);

-- Insert default roles
-- INSERT INTO univ_re_roles (company_id, role_name, description, permissions) VALUES
--   (gen_random_uuid(), 'admin', 'Full system access', '["*"]'::jsonb),
--   (gen_random_uuid(), 'agent', 'Can manage own leads and properties', '["view_properties", "edit_own_properties", "view_leads", "edit_own_leads", "create_transactions"]'::jsonb),
--   (gen_random_uuid(), 'support', 'Can view data and create reports', '["view_properties", "view_leads", "view_reports"]'::jsonb),
--   (gen_random_uuid(), 'viewer', 'Read-only access', '["view_properties", "view_leads"]'::jsonb)
-- ON CONFLICT DO NOTHING;
