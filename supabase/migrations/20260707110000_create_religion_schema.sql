CREATE TABLE IF NOT EXISTS univ_religion_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT,
  member_id TEXT,
  name TEXT,
  phone TEXT,
  type TEXT,
  group_name TEXT,
  status TEXT
);

ALTER TABLE univ_religion_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON univ_religion_members;
CREATE POLICY "Enable ALL for authenticated users" ON univ_religion_members AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'univ_religion_members') THEN ALTER PUBLICATION powersync ADD TABLE univ_religion_members; END IF; END $$;

CREATE TABLE IF NOT EXISTS univ_religion_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT,
  member_name TEXT,
  amount REAL,
  type TEXT,
  status TEXT
);

ALTER TABLE univ_religion_donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON univ_religion_donations;
CREATE POLICY "Enable ALL for authenticated users" ON univ_religion_donations AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'univ_religion_donations') THEN ALTER PUBLICATION powersync ADD TABLE univ_religion_donations; END IF; END $$;

CREATE TABLE IF NOT EXISTS univ_religion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT,
  title TEXT,
  date TEXT,
  location TEXT,
  attendees INTEGER,
  status TEXT
);

ALTER TABLE univ_religion_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON univ_religion_events;
CREATE POLICY "Enable ALL for authenticated users" ON univ_religion_events AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'univ_religion_events') THEN ALTER PUBLICATION powersync ADD TABLE univ_religion_events; END IF; END $$;

CREATE TABLE IF NOT EXISTS univ_religion_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT,
  name TEXT,
  leader TEXT,
  members INTEGER,
  schedule TEXT,
  color TEXT,
  icon_type INTEGER,
  status TEXT
);

ALTER TABLE univ_religion_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON univ_religion_groups;
CREATE POLICY "Enable ALL for authenticated users" ON univ_religion_groups AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'univ_religion_groups') THEN ALTER PUBLICATION powersync ADD TABLE univ_religion_groups; END IF; END $$;

CREATE TABLE IF NOT EXISTS univ_religion_small_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT,
  name TEXT,
  leader TEXT,
  location TEXT,
  members INTEGER,
  time TEXT,
  status TEXT
);

ALTER TABLE univ_religion_small_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON univ_religion_small_groups;
CREATE POLICY "Enable ALL for authenticated users" ON univ_religion_small_groups AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'univ_religion_small_groups') THEN ALTER PUBLICATION powersync ADD TABLE univ_religion_small_groups; END IF; END $$;

CREATE TABLE IF NOT EXISTS univ_religion_prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT,
  requestor TEXT,
  prayer TEXT,
  prayersCount INTEGER,
  sentiment TEXT,
  aiAnalysis TEXT,
  status TEXT
);

ALTER TABLE univ_religion_prayers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON univ_religion_prayers;
CREATE POLICY "Enable ALL for authenticated users" ON univ_religion_prayers AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'univ_religion_prayers') THEN ALTER PUBLICATION powersync ADD TABLE univ_religion_prayers; END IF; END $$;

CREATE TABLE IF NOT EXISTS univ_religion_sermons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT,
  title TEXT,
  speaker TEXT,
  scripture TEXT,
  duration TEXT,
  sermon_kit TEXT,
  date TEXT,
  series TEXT,
  status TEXT
);

ALTER TABLE univ_religion_sermons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON univ_religion_sermons;
CREATE POLICY "Enable ALL for authenticated users" ON univ_religion_sermons AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'univ_religion_sermons') THEN ALTER PUBLICATION powersync ADD TABLE univ_religion_sermons; END IF; END $$;

CREATE TABLE IF NOT EXISTS univ_religion_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT,
  name TEXT,
  role TEXT,
  group_name TEXT,
  availability TEXT,
  next_service TEXT,
  event TEXT,
  status TEXT
);

ALTER TABLE univ_religion_volunteers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON univ_religion_volunteers;
CREATE POLICY "Enable ALL for authenticated users" ON univ_religion_volunteers AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'univ_religion_volunteers') THEN ALTER PUBLICATION powersync ADD TABLE univ_religion_volunteers; END IF; END $$;

CREATE TABLE IF NOT EXISTS univ_religion_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT,
  member_id TEXT,
  milestone_type TEXT,
  date TEXT,
  notes TEXT
);

ALTER TABLE univ_religion_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON univ_religion_milestones;
CREATE POLICY "Enable ALL for authenticated users" ON univ_religion_milestones AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'univ_religion_milestones') THEN ALTER PUBLICATION powersync ADD TABLE univ_religion_milestones; END IF; END $$;

