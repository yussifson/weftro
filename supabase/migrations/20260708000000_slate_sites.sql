-- ============================================================
--  SLATE SITES — Database Migration
--  Run this in Supabase SQL Editor
-- ============================================================

-- 1. slate_sites — core site config per company
CREATE TABLE IF NOT EXISTS public.slate_sites (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         TEXT NOT NULL,
  created_by         TEXT,
  created_date       TIMESTAMPTZ DEFAULT now(),
  updated_date       TIMESTAMPTZ DEFAULT now(),

  -- Identity
  site_name          TEXT,
  site_tagline       TEXT,
  site_description   TEXT,
  custom_domain      TEXT,
  subdomain          TEXT,
  favicon_url        TEXT,
  logo_url           TEXT,
  logo_dark_url      TEXT,

  -- Publishing
  is_published       BOOLEAN DEFAULT false,
  published_at       TIMESTAMPTZ,
  password_protected BOOLEAN DEFAULT false,
  site_password      TEXT,

  -- Theme
  theme              JSONB DEFAULT '{
    "primaryColor": "#6366f1",
    "secondaryColor": "#8b5cf6",
    "backgroundColor": "#ffffff",
    "textColor": "#111827",
    "fontFamily": "Inter",
    "headingFont": "Inter",
    "borderRadius": "12px",
    "darkMode": false,
    "buttonStyle": "rounded"
  }'::jsonb,

  -- Navigation
  nav_links          JSONB DEFAULT '[]'::jsonb,
  footer_links       JSONB DEFAULT '[]'::jsonb,
  social_links       JSONB DEFAULT '{}'::jsonb,

  -- SEO
  seo_title          TEXT,
  seo_description    TEXT,
  seo_keywords       TEXT,
  og_image_url       TEXT,
  google_analytics   TEXT,

  -- Analytics (aggregate counters)
  visitor_count      INTEGER DEFAULT 0,
  conversion_count   INTEGER DEFAULT 0,

  -- AI metadata
  ai_industry        TEXT,
  ai_prompt          TEXT,
  ai_generated       BOOLEAN DEFAULT false,

  -- Contact info shown on site
  contact_email      TEXT,
  contact_phone      TEXT,
  contact_address    TEXT,
  contact_map_url    TEXT,

  -- Domain verification
  domain_verified    BOOLEAN DEFAULT false,
  domain_verified_at TIMESTAMPTZ,
  vercel_domain_id   TEXT
);

ALTER TABLE public.slate_sites ENABLE ROW LEVEL SECURITY;

-- Company members can fully manage their own site
DROP POLICY IF EXISTS "company members manage site" ON public.slate_sites;
CREATE POLICY "company members manage site" ON public.slate_sites
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Public can read published sites (no auth needed)
DROP POLICY IF EXISTS "public read published sites" ON public.slate_sites;
CREATE POLICY "public read published sites" ON public.slate_sites
  FOR SELECT
  USING (is_published = true);

-- ============================================================
-- 2. slate_site_pages — individual pages within a site
-- ============================================================
CREATE TABLE IF NOT EXISTS public.slate_site_pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID REFERENCES public.slate_sites(id) ON DELETE CASCADE,
  company_id       TEXT NOT NULL,
  created_by       TEXT,
  created_date     TIMESTAMPTZ DEFAULT now(),
  updated_date     TIMESTAMPTZ DEFAULT now(),

  -- Page identity
  title            TEXT NOT NULL DEFAULT 'Untitled Page',
  slug             TEXT NOT NULL DEFAULT '/',
  meta_description TEXT,
  og_image_url     TEXT,

  -- Page flags
  is_home          BOOLEAN DEFAULT false,
  is_published     BOOLEAN DEFAULT true,
  page_order       INTEGER DEFAULT 0,

  -- Page type drives dynamic section availability
  page_type        TEXT DEFAULT 'custom'
    CHECK (page_type IN ('custom','home','about','contact','booking','products','menu','blog','jobs','admissions','gallery','pricing','faq','landing')),

  -- Section content (array of section block objects)
  -- Each block: { id, type, data, style }
  content          JSONB DEFAULT '[]'::jsonb,

  -- SEO override per page
  seo_title        TEXT,
  seo_description  TEXT
);

CREATE INDEX IF NOT EXISTS idx_slate_site_pages_site_id ON public.slate_site_pages(site_id);
CREATE INDEX IF NOT EXISTS idx_slate_site_pages_slug ON public.slate_site_pages(slug);

ALTER TABLE public.slate_site_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company members manage pages" ON public.slate_site_pages;
CREATE POLICY "company members manage pages" ON public.slate_site_pages
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "public read published pages" ON public.slate_site_pages;
CREATE POLICY "public read published pages" ON public.slate_site_pages
  FOR SELECT
  USING (is_published = true);

-- ============================================================
-- 3. slate_site_analytics — anonymous visitor tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.slate_site_analytics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID REFERENCES public.slate_sites(id) ON DELETE CASCADE,
  company_id   TEXT NOT NULL,
  visited_at   TIMESTAMPTZ DEFAULT now(),
  page_slug    TEXT,
  referrer     TEXT,
  user_agent   TEXT,
  country      TEXT,
  city         TEXT,
  session_id   TEXT,
  duration_sec INTEGER,  -- seconds on page
  is_bounce    BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_slate_analytics_site_id ON public.slate_site_analytics(site_id);
CREATE INDEX IF NOT EXISTS idx_slate_analytics_visited ON public.slate_site_analytics(visited_at DESC);

ALTER TABLE public.slate_site_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics (anonymous visitors)
DROP POLICY IF EXISTS "anyone can track visits" ON public.slate_site_analytics;
CREATE POLICY "anyone can track visits" ON public.slate_site_analytics
  FOR INSERT
  WITH CHECK (true);

-- Company can read their own analytics
DROP POLICY IF EXISTS "company reads analytics" ON public.slate_site_analytics;
CREATE POLICY "company reads analytics" ON public.slate_site_analytics
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- 4. slate_site_form_submissions — form captures from public site
-- ============================================================
CREATE TABLE IF NOT EXISTS public.slate_site_form_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID REFERENCES public.slate_sites(id) ON DELETE CASCADE,
  company_id   TEXT NOT NULL,
  page_id      UUID,
  form_id      TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),

  -- Form data (field values as JSON)
  data         JSONB DEFAULT '{}'::jsonb,

  -- Processing status
  status       TEXT DEFAULT 'new'
    CHECK (status IN ('new','read','converted','spam','archived')),

  -- If auto-converted to CRM lead
  lead_id      TEXT,

  -- Spam detection
  is_spam      BOOLEAN DEFAULT false,
  spam_score   NUMERIC DEFAULT 0,

  -- Contact info extracted from form (for quick display)
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  message       TEXT
);

CREATE INDEX IF NOT EXISTS idx_slate_submissions_site ON public.slate_site_form_submissions(site_id);
CREATE INDEX IF NOT EXISTS idx_slate_submissions_status ON public.slate_site_form_submissions(status);

ALTER TABLE public.slate_site_form_submissions ENABLE ROW LEVEL SECURITY;

-- Public (unauthenticated) can submit forms
DROP POLICY IF EXISTS "anyone can submit forms" ON public.slate_site_form_submissions;
CREATE POLICY "anyone can submit forms" ON public.slate_site_form_submissions
  FOR INSERT
  WITH CHECK (true);

-- Company can read and manage their submissions
DROP POLICY IF EXISTS "company manages submissions" ON public.slate_site_form_submissions;
CREATE POLICY "company manages submissions" ON public.slate_site_form_submissions
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );
