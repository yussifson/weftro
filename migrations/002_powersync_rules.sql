-- PowerSync Sync Rules for Advanced Logistics
-- Add these rules to your PowerSync configuration

-- Route Optimization Tables
INSERT INTO powersync.tables (table_name, doc_id) VALUES
('routes', 'company_id'),
('gps_tracking', 'company_id'),
('pod_records', 'company_id'),
('delivery_windows', 'company_id'),
('sla_tracking', 'company_id'),
('inventory_movements', 'company_id'),
('incident_reports', 'company_id'),
('return_orders', 'company_id'),
('return_shipments', 'company_id'),
('driver_metrics', 'company_id'),
('fleet_metrics', 'company_id');

-- RLS Policies for each table (Supabase)
-- Routes
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY routes_company_policy ON routes FOR ALL
  USING (company_id = auth.uid() OR EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND id = auth.uid()
  ));

-- GPS Tracking
ALTER TABLE gps_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY gps_tracking_company_policy ON gps_tracking FOR ALL
  USING (company_id = auth.uid() OR EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND id = auth.uid()
  ));

-- POD Records
ALTER TABLE pod_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY pod_records_company_policy ON pod_records FOR ALL
  USING (company_id = auth.uid() OR EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND id = auth.uid()
  ));

-- Delivery Windows
ALTER TABLE delivery_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_windows_company_policy ON delivery_windows FOR ALL
  USING (company_id = auth.uid() OR EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND id = auth.uid()
  ));

-- SLA Tracking
ALTER TABLE sla_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY sla_tracking_company_policy ON sla_tracking FOR ALL
  USING (company_id = auth.uid() OR EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND id = auth.uid()
  ));

-- Inventory Movements
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_movements_company_policy ON inventory_movements FOR ALL
  USING (company_id = auth.uid() OR EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND id = auth.uid()
  ));

-- Incident Reports
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY incident_reports_company_policy ON incident_reports FOR ALL
  USING (company_id = auth.uid() OR EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND id = auth.uid()
  ));

-- Return Orders
ALTER TABLE return_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY return_orders_company_policy ON return_orders FOR ALL
  USING (company_id = auth.uid() OR EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND id = auth.uid()
  ));

-- Return Shipments
ALTER TABLE return_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY return_shipments_company_policy ON return_shipments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM return_orders WHERE id = return_order_id AND company_id = auth.uid()
  ));

-- Driver Metrics
ALTER TABLE driver_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY driver_metrics_company_policy ON driver_metrics FOR ALL
  USING (company_id = auth.uid() OR EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND id = auth.uid()
  ));

-- Fleet Metrics
ALTER TABLE fleet_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY fleet_metrics_company_policy ON fleet_metrics FOR ALL
  USING (company_id = auth.uid() OR EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND id = auth.uid()
  ));
