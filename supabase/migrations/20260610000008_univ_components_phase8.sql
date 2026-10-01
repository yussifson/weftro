-- ==========================================
-- Phase 8: Logistics & Construction Suites
-- Execute this script in your Supabase SQL Editor
-- ==========================================

-- 34. Fleet (univ_fleet)
CREATE TABLE IF NOT EXISTS public.univ_fleet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    vehicle_name TEXT NOT NULL,
    license_plate TEXT,
    vehicle_type TEXT,
    status TEXT DEFAULT 'Active', -- Active, Maintenance, Out of Service
    mileage NUMERIC DEFAULT 0,
    last_service_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_fleet ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's fleet" ON public.univ_fleet;
CREATE POLICY "Users can manage their company's fleet" ON public.univ_fleet FOR ALL USING (auth.uid() IS NOT NULL);

-- 35. Dispatch (univ_dispatch)
CREATE TABLE IF NOT EXISTS public.univ_dispatch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    driver_name TEXT NOT NULL,
    vehicle_id UUID,
    route_id UUID,
    status TEXT DEFAULT 'Available', -- Available, On Route, Resting, Off Duty
    current_location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_dispatch ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's dispatch" ON public.univ_dispatch;
CREATE POLICY "Users can manage their company's dispatch" ON public.univ_dispatch FOR ALL USING (auth.uid() IS NOT NULL);

-- 36. Routes (univ_routes)
CREATE TABLE IF NOT EXISTS public.univ_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    route_name TEXT NOT NULL,
    start_location TEXT,
    end_location TEXT,
    estimated_distance NUMERIC,
    estimated_duration TEXT,
    status TEXT DEFAULT 'Planned', -- Planned, Active, Completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's routes" ON public.univ_routes;
CREATE POLICY "Users can manage their company's routes" ON public.univ_routes FOR ALL USING (auth.uid() IS NOT NULL);

-- 37. Deliveries (univ_deliveries)
CREATE TABLE IF NOT EXISTS public.univ_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    tracking_number TEXT NOT NULL,
    recipient_name TEXT,
    delivery_address TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Dispatched, In Transit, Delivered, Failed
    proof_of_delivery TEXT, -- Link to image or signature
    route_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's deliveries" ON public.univ_deliveries;
CREATE POLICY "Users can manage their company's deliveries" ON public.univ_deliveries FOR ALL USING (auth.uid() IS NOT NULL);

-- 38. Warehouse (univ_warehouses)
CREATE TABLE IF NOT EXISTS public.univ_warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    zone_name TEXT NOT NULL,
    bay_number TEXT,
    capacity NUMERIC,
    current_occupancy NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_warehouses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's warehouses" ON public.univ_warehouses;
CREATE POLICY "Users can manage their company's warehouses" ON public.univ_warehouses FOR ALL USING (auth.uid() IS NOT NULL);

-- 39. Projects (univ_projects)
CREATE TABLE IF NOT EXISTS public.univ_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    project_name TEXT NOT NULL,
    client_name TEXT,
    start_date DATE,
    end_date DATE,
    budget NUMERIC,
    status TEXT DEFAULT 'Planning', -- Planning, Active, Paused, Completed
    completion_percentage NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's projects" ON public.univ_projects;
CREATE POLICY "Users can manage their company's projects" ON public.univ_projects FOR ALL USING (auth.uid() IS NOT NULL);

-- 40. BOQ (univ_boqs)
CREATE TABLE IF NOT EXISTS public.univ_boqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    project_id UUID NOT NULL,
    item_description TEXT NOT NULL,
    unit TEXT,
    quantity NUMERIC,
    unit_rate NUMERIC,
    total_amount NUMERIC,
    status TEXT DEFAULT 'Draft', -- Draft, Approved, Procuring
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_boqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's boqs" ON public.univ_boqs;
CREATE POLICY "Users can manage their company's boqs" ON public.univ_boqs FOR ALL USING (auth.uid() IS NOT NULL);

-- 41. Site Inspections (univ_site_inspections)
CREATE TABLE IF NOT EXISTS public.univ_site_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    project_id UUID NOT NULL,
    inspector_name TEXT,
    inspection_date DATE,
    findings TEXT,
    snag_list TEXT,
    status TEXT DEFAULT 'Pending Review', -- Pending Review, Addressed, Closed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_site_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's site inspections" ON public.univ_site_inspections;
DROP POLICY IF EXISTS "Users can manage their company's site inspections" ON public.univ_site_inspections;
CREATE POLICY "Users can manage their company's site inspections" ON public.univ_site_inspections FOR ALL USING (auth.uid() IS NOT NULL);

-- 42. Safety (univ_safety)
CREATE TABLE IF NOT EXISTS public.univ_safety (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    project_id UUID,
    incident_type TEXT NOT NULL, -- Near Miss, Injury, Hazard
    description TEXT,
    reported_by TEXT,
    report_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Open', -- Open, Investigating, Resolved
    severity TEXT DEFAULT 'Low', -- Low, Medium, High, Critical
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_safety ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's safety" ON public.univ_safety;
CREATE POLICY "Users can manage their company's safety" ON public.univ_safety FOR ALL USING (auth.uid() IS NOT NULL);

-- 43. Contractors (univ_contractors)
CREATE TABLE IF NOT EXISTS public.univ_contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    contractor_name TEXT NOT NULL,
    trade_specialty TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    status TEXT DEFAULT 'Active', -- Active, Suspended, Former
    rating NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_contractors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's contractors" ON public.univ_contractors;
CREATE POLICY "Users can manage their company's contractors" ON public.univ_contractors FOR ALL USING (auth.uid() IS NOT NULL);

-- Add triggers to auto-update updated_at for all Phase 8 tables
DROP TRIGGER IF EXISTS update_univ_fleet_modtime ON public.univ_fleet;
CREATE TRIGGER update_univ_fleet_modtime BEFORE UPDATE ON public.univ_fleet FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_dispatch_modtime ON public.univ_dispatch;
CREATE TRIGGER update_univ_dispatch_modtime BEFORE UPDATE ON public.univ_dispatch FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_routes_modtime ON public.univ_routes;
CREATE TRIGGER update_univ_routes_modtime BEFORE UPDATE ON public.univ_routes FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_deliveries_modtime ON public.univ_deliveries;
CREATE TRIGGER update_univ_deliveries_modtime BEFORE UPDATE ON public.univ_deliveries FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_warehouses_modtime ON public.univ_warehouses;
CREATE TRIGGER update_univ_warehouses_modtime BEFORE UPDATE ON public.univ_warehouses FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_projects_modtime ON public.univ_projects;
CREATE TRIGGER update_univ_projects_modtime BEFORE UPDATE ON public.univ_projects FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_boqs_modtime ON public.univ_boqs;
CREATE TRIGGER update_univ_boqs_modtime BEFORE UPDATE ON public.univ_boqs FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_site_inspections_modtime ON public.univ_site_inspections;
CREATE TRIGGER update_univ_site_inspections_modtime BEFORE UPDATE ON public.univ_site_inspections FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_safety_modtime ON public.univ_safety;
CREATE TRIGGER update_univ_safety_modtime BEFORE UPDATE ON public.univ_safety FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_contractors_modtime ON public.univ_contractors;
CREATE TRIGGER update_univ_contractors_modtime BEFORE UPDATE ON public.univ_contractors FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
