-- ==========================================
-- Phase 7: Hospitality Suite Data Layer
-- Execute this script in your Supabase SQL Editor
-- ==========================================

-- 29. Bookings (univ_bookings)
CREATE TABLE IF NOT EXISTS public.univ_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    booking_reference TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone TEXT,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    room_type TEXT,
    number_of_guests INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Confirmed', -- Confirmed, Pending, Cancelled, Checked In, Checked Out
    total_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's bookings" ON public.univ_bookings;
CREATE POLICY "Users can manage their company's bookings" ON public.univ_bookings FOR ALL USING (auth.uid() IS NOT NULL);

-- 30. Rooms (univ_rooms)
CREATE TABLE IF NOT EXISTS public.univ_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    room_number TEXT NOT NULL,
    room_type TEXT NOT NULL,
    floor TEXT,
    price_per_night NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Available', -- Available, Occupied, Maintenance, Cleaning
    amenities TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's rooms" ON public.univ_rooms;
CREATE POLICY "Users can manage their company's rooms" ON public.univ_rooms FOR ALL USING (auth.uid() IS NOT NULL);

-- 31. Housekeeping (univ_housekeeping)
CREATE TABLE IF NOT EXISTS public.univ_housekeeping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    room_id UUID NOT NULL,
    assigned_to UUID,
    task_type TEXT DEFAULT 'Routine Cleaning', -- Routine Cleaning, Deep Cleaning, Maintenance Issue
    status TEXT DEFAULT 'Pending', -- Pending, In Progress, Completed
    priority TEXT DEFAULT 'Medium', -- Low, Medium, High
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_housekeeping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's housekeeping" ON public.univ_housekeeping;
CREATE POLICY "Users can manage their company's housekeeping" ON public.univ_housekeeping FOR ALL USING (auth.uid() IS NOT NULL);

-- 32. Menu (univ_menus)
CREATE TABLE IF NOT EXISTS public.univ_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL, -- Appetizer, Main Course, Dessert, Beverage
    description TEXT,
    price NUMERIC DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    dietary_info TEXT, -- Vegan, Gluten-Free, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's menus" ON public.univ_menus;
CREATE POLICY "Users can manage their company's menus" ON public.univ_menus FOR ALL USING (auth.uid() IS NOT NULL);

-- 33. Dining Orders (univ_dining_orders)
CREATE TABLE IF NOT EXISTS public.univ_dining_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    order_number TEXT NOT NULL,
    table_number TEXT,
    room_number TEXT, -- If room service
    status TEXT DEFAULT 'Received', -- Received, Preparing, Served, Paid, Cancelled
    total_amount NUMERIC DEFAULT 0,
    items JSONB, -- Array of items and quantities
    order_type TEXT DEFAULT 'Dine-In', -- Dine-In, Takeaway, Room Service
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_dining_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's dining orders" ON public.univ_dining_orders;
DROP POLICY IF EXISTS "Users can manage their company's dining orders" ON public.univ_dining_orders;
CREATE POLICY "Users can manage their company's dining orders" ON public.univ_dining_orders FOR ALL USING (auth.uid() IS NOT NULL);

-- Add triggers to auto-update updated_at for all Phase 7 tables
DROP TRIGGER IF EXISTS update_univ_bookings_modtime ON public.univ_bookings;
CREATE TRIGGER update_univ_bookings_modtime BEFORE UPDATE ON public.univ_bookings FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_rooms_modtime ON public.univ_rooms;
CREATE TRIGGER update_univ_rooms_modtime BEFORE UPDATE ON public.univ_rooms FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_housekeeping_modtime ON public.univ_housekeeping;
CREATE TRIGGER update_univ_housekeeping_modtime BEFORE UPDATE ON public.univ_housekeeping FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_menus_modtime ON public.univ_menus;
CREATE TRIGGER update_univ_menus_modtime BEFORE UPDATE ON public.univ_menus FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_dining_orders_modtime ON public.univ_dining_orders;
CREATE TRIGGER update_univ_dining_orders_modtime BEFORE UPDATE ON public.univ_dining_orders FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
