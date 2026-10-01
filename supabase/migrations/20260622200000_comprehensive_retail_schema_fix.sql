-- Comprehensive migration for all missing retail tables and columns

CREATE TABLE IF NOT EXISTS public.univ_retail_customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    cust_id text,
    name text,
    email text,
    phone text,
    total_spent numeric,
    orders integer,
    segment text,
    status text
);

ALTER TABLE public.univ_retail_customers ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_customers ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_customers ADD COLUMN IF NOT EXISTS cust_id text;
ALTER TABLE public.univ_retail_customers ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.univ_retail_customers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.univ_retail_customers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.univ_retail_customers ADD COLUMN IF NOT EXISTS total_spent numeric;
ALTER TABLE public.univ_retail_customers ADD COLUMN IF NOT EXISTS orders integer;
ALTER TABLE public.univ_retail_customers ADD COLUMN IF NOT EXISTS segment text;
ALTER TABLE public.univ_retail_customers ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.univ_retail_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_customers" ON public.univ_retail_customers;
CREATE POLICY "Allow company access on univ_retail_customers" ON public.univ_retail_customers FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    sku text,
    name text,
    category text,
    supplier text,
    price numeric,
    cost_price numeric,
    quantity integer,
    status text
);

ALTER TABLE public.univ_retail_inventory ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_inventory ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_inventory ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.univ_retail_inventory ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.univ_retail_inventory ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.univ_retail_inventory ADD COLUMN IF NOT EXISTS supplier text;
ALTER TABLE public.univ_retail_inventory ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.univ_retail_inventory ADD COLUMN IF NOT EXISTS cost_price numeric;
ALTER TABLE public.univ_retail_inventory ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE public.univ_retail_inventory ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.univ_retail_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_inventory" ON public.univ_retail_inventory;
CREATE POLICY "Allow company access on univ_retail_inventory" ON public.univ_retail_inventory FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_loyalty (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    customer_name text,
    tier text,
    points integer,
    joined text,
    status text
);

ALTER TABLE public.univ_retail_loyalty ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_loyalty ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_loyalty ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.univ_retail_loyalty ADD COLUMN IF NOT EXISTS tier text;
ALTER TABLE public.univ_retail_loyalty ADD COLUMN IF NOT EXISTS points integer;
ALTER TABLE public.univ_retail_loyalty ADD COLUMN IF NOT EXISTS joined text;
ALTER TABLE public.univ_retail_loyalty ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.univ_retail_loyalty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_loyalty" ON public.univ_retail_loyalty;
CREATE POLICY "Allow company access on univ_retail_loyalty" ON public.univ_retail_loyalty FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    order_id text,
    customer text,
    date text,
    total numeric,
    status text,
    payment_status text,
    fulfillment text
);

ALTER TABLE public.univ_retail_orders ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_orders ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_orders ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE public.univ_retail_orders ADD COLUMN IF NOT EXISTS customer text;
ALTER TABLE public.univ_retail_orders ADD COLUMN IF NOT EXISTS date text;
ALTER TABLE public.univ_retail_orders ADD COLUMN IF NOT EXISTS total numeric;
ALTER TABLE public.univ_retail_orders ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.univ_retail_orders ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.univ_retail_orders ADD COLUMN IF NOT EXISTS fulfillment text;

ALTER TABLE public.univ_retail_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_orders" ON public.univ_retail_orders;
CREATE POLICY "Allow company access on univ_retail_orders" ON public.univ_retail_orders FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_pos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    register_id text,
    cashier text,
    session_start text,
    session_end text,
    status text
);

ALTER TABLE public.univ_retail_pos ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_pos ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_pos ADD COLUMN IF NOT EXISTS register_id text;
ALTER TABLE public.univ_retail_pos ADD COLUMN IF NOT EXISTS cashier text;
ALTER TABLE public.univ_retail_pos ADD COLUMN IF NOT EXISTS session_start text;
ALTER TABLE public.univ_retail_pos ADD COLUMN IF NOT EXISTS session_end text;
ALTER TABLE public.univ_retail_pos ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.univ_retail_pos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_pos" ON public.univ_retail_pos;
CREATE POLICY "Allow company access on univ_retail_pos" ON public.univ_retail_pos FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    name text,
    sku text,
    category text,
    price numeric,
    stock integer,
    supplier text,
    status text
);

ALTER TABLE public.univ_retail_products ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_products ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_products ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.univ_retail_products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.univ_retail_products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.univ_retail_products ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.univ_retail_products ADD COLUMN IF NOT EXISTS stock integer;
ALTER TABLE public.univ_retail_products ADD COLUMN IF NOT EXISTS supplier text;
ALTER TABLE public.univ_retail_products ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.univ_retail_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_products" ON public.univ_retail_products;
CREATE POLICY "Allow company access on univ_retail_products" ON public.univ_retail_products FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    promo_code text,
    discount text,
    start_date text,
    end_date text,
    status text,
    usage_count integer
);

ALTER TABLE public.univ_retail_promotions ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_promotions ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_promotions ADD COLUMN IF NOT EXISTS promo_code text;
ALTER TABLE public.univ_retail_promotions ADD COLUMN IF NOT EXISTS discount text;
ALTER TABLE public.univ_retail_promotions ADD COLUMN IF NOT EXISTS start_date text;
ALTER TABLE public.univ_retail_promotions ADD COLUMN IF NOT EXISTS end_date text;
ALTER TABLE public.univ_retail_promotions ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.univ_retail_promotions ADD COLUMN IF NOT EXISTS usage_count integer;

ALTER TABLE public.univ_retail_promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_promotions" ON public.univ_retail_promotions;
CREATE POLICY "Allow company access on univ_retail_promotions" ON public.univ_retail_promotions FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    po_number text,
    supplier text,
    date text,
    amount numeric,
    status text
);

ALTER TABLE public.univ_retail_purchase_orders ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_purchase_orders ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_purchase_orders ADD COLUMN IF NOT EXISTS po_number text;
ALTER TABLE public.univ_retail_purchase_orders ADD COLUMN IF NOT EXISTS supplier text;
ALTER TABLE public.univ_retail_purchase_orders ADD COLUMN IF NOT EXISTS date text;
ALTER TABLE public.univ_retail_purchase_orders ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.univ_retail_purchase_orders ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.univ_retail_purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_purchase_orders" ON public.univ_retail_purchase_orders;
CREATE POLICY "Allow company access on univ_retail_purchase_orders" ON public.univ_retail_purchase_orders FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    sale_id text,
    date text,
    cashier text,
    method text,
    items integer,
    total numeric,
    status text
);

ALTER TABLE public.univ_retail_sales ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_sales ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_sales ADD COLUMN IF NOT EXISTS sale_id text;
ALTER TABLE public.univ_retail_sales ADD COLUMN IF NOT EXISTS date text;
ALTER TABLE public.univ_retail_sales ADD COLUMN IF NOT EXISTS cashier text;
ALTER TABLE public.univ_retail_sales ADD COLUMN IF NOT EXISTS method text;
ALTER TABLE public.univ_retail_sales ADD COLUMN IF NOT EXISTS items integer;
ALTER TABLE public.univ_retail_sales ADD COLUMN IF NOT EXISTS total numeric;
ALTER TABLE public.univ_retail_sales ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.univ_retail_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_sales" ON public.univ_retail_sales;
CREATE POLICY "Allow company access on univ_retail_sales" ON public.univ_retail_sales FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_shifts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    employee_name text,
    role text,
    date text,
    start_time text,
    end_time text,
    status text
);

ALTER TABLE public.univ_retail_shifts ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_shifts ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_shifts ADD COLUMN IF NOT EXISTS employee_name text;
ALTER TABLE public.univ_retail_shifts ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.univ_retail_shifts ADD COLUMN IF NOT EXISTS date text;
ALTER TABLE public.univ_retail_shifts ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE public.univ_retail_shifts ADD COLUMN IF NOT EXISTS end_time text;
ALTER TABLE public.univ_retail_shifts ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.univ_retail_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_shifts" ON public.univ_retail_shifts;
CREATE POLICY "Allow company access on univ_retail_shifts" ON public.univ_retail_shifts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    name text,
    category text,
    contact text,
    phone text,
    email text,
    rating integer,
    status text
);

ALTER TABLE public.univ_retail_suppliers ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_suppliers ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_suppliers ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.univ_retail_suppliers ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.univ_retail_suppliers ADD COLUMN IF NOT EXISTS contact text;
ALTER TABLE public.univ_retail_suppliers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.univ_retail_suppliers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.univ_retail_suppliers ADD COLUMN IF NOT EXISTS rating integer;
ALTER TABLE public.univ_retail_suppliers ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.univ_retail_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_suppliers" ON public.univ_retail_suppliers;
CREATE POLICY "Allow company access on univ_retail_suppliers" ON public.univ_retail_suppliers FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    return_id text,
    customer text,
    date text,
    amount numeric,
    reason text,
    status text
);

ALTER TABLE public.univ_retail_returns ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_returns ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_returns ADD COLUMN IF NOT EXISTS return_id text;
ALTER TABLE public.univ_retail_returns ADD COLUMN IF NOT EXISTS customer text;
ALTER TABLE public.univ_retail_returns ADD COLUMN IF NOT EXISTS date text;
ALTER TABLE public.univ_retail_returns ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.univ_retail_returns ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.univ_retail_returns ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.univ_retail_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_returns" ON public.univ_retail_returns;
CREATE POLICY "Allow company access on univ_retail_returns" ON public.univ_retail_returns FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_inventory_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    from_store_id text,
    to_store_id text,
    product_id text,
    quantity integer,
    status text,
    tracking_number text
);

ALTER TABLE public.univ_retail_inventory_transfers ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_inventory_transfers ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_inventory_transfers ADD COLUMN IF NOT EXISTS from_store_id text;
ALTER TABLE public.univ_retail_inventory_transfers ADD COLUMN IF NOT EXISTS to_store_id text;
ALTER TABLE public.univ_retail_inventory_transfers ADD COLUMN IF NOT EXISTS product_id text;
ALTER TABLE public.univ_retail_inventory_transfers ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE public.univ_retail_inventory_transfers ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.univ_retail_inventory_transfers ADD COLUMN IF NOT EXISTS tracking_number text;

ALTER TABLE public.univ_retail_inventory_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_inventory_transfers" ON public.univ_retail_inventory_transfers;
CREATE POLICY "Allow company access on univ_retail_inventory_transfers" ON public.univ_retail_inventory_transfers FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_rmas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    rma_number text,
    product_id text,
    supplier_id text,
    quantity integer,
    reason text,
    status text,
    tracking_number text
);

ALTER TABLE public.univ_retail_rmas ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_rmas ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_rmas ADD COLUMN IF NOT EXISTS rma_number text;
ALTER TABLE public.univ_retail_rmas ADD COLUMN IF NOT EXISTS product_id text;
ALTER TABLE public.univ_retail_rmas ADD COLUMN IF NOT EXISTS supplier_id text;
ALTER TABLE public.univ_retail_rmas ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE public.univ_retail_rmas ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.univ_retail_rmas ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.univ_retail_rmas ADD COLUMN IF NOT EXISTS tracking_number text;

ALTER TABLE public.univ_retail_rmas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_rmas" ON public.univ_retail_rmas;
CREATE POLICY "Allow company access on univ_retail_rmas" ON public.univ_retail_rmas FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    name text,
    location text,
    manager_id text,
    status text,
    contact_phone text,
    contact_email text
);

ALTER TABLE public.univ_retail_branches ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_branches ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_branches ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.univ_retail_branches ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.univ_retail_branches ADD COLUMN IF NOT EXISTS manager_id text;
ALTER TABLE public.univ_retail_branches ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.univ_retail_branches ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.univ_retail_branches ADD COLUMN IF NOT EXISTS contact_email text;

ALTER TABLE public.univ_retail_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_branches" ON public.univ_retail_branches;
CREATE POLICY "Allow company access on univ_retail_branches" ON public.univ_retail_branches FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_storefronts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    theme_config text,
    domain_name text,
    is_active integer
);

ALTER TABLE public.univ_retail_storefronts ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_storefronts ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_storefronts ADD COLUMN IF NOT EXISTS theme_config text;
ALTER TABLE public.univ_retail_storefronts ADD COLUMN IF NOT EXISTS domain_name text;
ALTER TABLE public.univ_retail_storefronts ADD COLUMN IF NOT EXISTS is_active integer;

ALTER TABLE public.univ_retail_storefronts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_storefronts" ON public.univ_retail_storefronts;
CREATE POLICY "Allow company access on univ_retail_storefronts" ON public.univ_retail_storefronts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_web_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    customer_id text,
    total_amount numeric,
    status text,
    payment_status text,
    shipping_address text
);

ALTER TABLE public.univ_retail_web_orders ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_web_orders ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_web_orders ADD COLUMN IF NOT EXISTS customer_id text;
ALTER TABLE public.univ_retail_web_orders ADD COLUMN IF NOT EXISTS total_amount numeric;
ALTER TABLE public.univ_retail_web_orders ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.univ_retail_web_orders ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.univ_retail_web_orders ADD COLUMN IF NOT EXISTS shipping_address text;

ALTER TABLE public.univ_retail_web_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_web_orders" ON public.univ_retail_web_orders;
CREATE POLICY "Allow company access on univ_retail_web_orders" ON public.univ_retail_web_orders FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_warehouse_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    name text,
    address text
);

ALTER TABLE public.univ_retail_warehouse_locations ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_warehouse_locations ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_warehouse_locations ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.univ_retail_warehouse_locations ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.univ_retail_warehouse_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_warehouse_locations" ON public.univ_retail_warehouse_locations;
CREATE POLICY "Allow company access on univ_retail_warehouse_locations" ON public.univ_retail_warehouse_locations FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_warehouse_bins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    warehouse_id text,
    bin_label text,
    zone text
);

ALTER TABLE public.univ_retail_warehouse_bins ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_warehouse_bins ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_warehouse_bins ADD COLUMN IF NOT EXISTS warehouse_id text;
ALTER TABLE public.univ_retail_warehouse_bins ADD COLUMN IF NOT EXISTS bin_label text;
ALTER TABLE public.univ_retail_warehouse_bins ADD COLUMN IF NOT EXISTS zone text;

ALTER TABLE public.univ_retail_warehouse_bins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_warehouse_bins" ON public.univ_retail_warehouse_bins;
CREATE POLICY "Allow company access on univ_retail_warehouse_bins" ON public.univ_retail_warehouse_bins FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_picking_waves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    warehouse_id text,
    status text,
    assigned_to text
);

ALTER TABLE public.univ_retail_picking_waves ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_picking_waves ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_picking_waves ADD COLUMN IF NOT EXISTS warehouse_id text;
ALTER TABLE public.univ_retail_picking_waves ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.univ_retail_picking_waves ADD COLUMN IF NOT EXISTS assigned_to text;

ALTER TABLE public.univ_retail_picking_waves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_picking_waves" ON public.univ_retail_picking_waves;
CREATE POLICY "Allow company access on univ_retail_picking_waves" ON public.univ_retail_picking_waves FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_b2b_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    client_name text,
    tier text,
    credit_limit numeric,
    outstanding_balance numeric
);

ALTER TABLE public.univ_retail_b2b_accounts ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_b2b_accounts ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_b2b_accounts ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.univ_retail_b2b_accounts ADD COLUMN IF NOT EXISTS tier text;
ALTER TABLE public.univ_retail_b2b_accounts ADD COLUMN IF NOT EXISTS credit_limit numeric;
ALTER TABLE public.univ_retail_b2b_accounts ADD COLUMN IF NOT EXISTS outstanding_balance numeric;

ALTER TABLE public.univ_retail_b2b_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_b2b_accounts" ON public.univ_retail_b2b_accounts;
CREATE POLICY "Allow company access on univ_retail_b2b_accounts" ON public.univ_retail_b2b_accounts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retail_franchises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at text,
    company_id text,
    franchisee_name text,
    royalty_percentage numeric,
    status text
);

ALTER TABLE public.univ_retail_franchises ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.univ_retail_franchises ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.univ_retail_franchises ADD COLUMN IF NOT EXISTS franchisee_name text;
ALTER TABLE public.univ_retail_franchises ADD COLUMN IF NOT EXISTS royalty_percentage numeric;
ALTER TABLE public.univ_retail_franchises ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.univ_retail_franchises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retail_franchises" ON public.univ_retail_franchises;
CREATE POLICY "Allow company access on univ_retail_franchises" ON public.univ_retail_franchises FOR ALL USING (auth.uid() IS NOT NULL);

