-- Fix RLS Policies for tables without WITH CHECK clauses

DROP POLICY IF EXISTS "Allow all for company" ON univ_dashboard_configs;
CREATE POLICY "Allow all for company" ON univ_dashboard_configs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for company" ON univ_support_tickets;
CREATE POLICY "Allow all for company" ON univ_support_tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for company" ON univ_payroll;
CREATE POLICY "Allow all for company" ON univ_payroll FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for company" ON univ_roles;
CREATE POLICY "Allow all for company" ON univ_roles FOR ALL USING (true) WITH CHECK (true);

-- And univ_accesscontrols from another script possibly
DROP POLICY IF EXISTS "Allow all for company" ON univ_accesscontrols;
CREATE POLICY "Allow all for company" ON univ_accesscontrols FOR ALL USING (true) WITH CHECK (true);
