-- Add test plan for all market tiers with 2 GHS
INSERT INTO "public"."subscription_plans" 
("name", "market_tier", "price_monthly", "paystack_plan_code", "is_active", "limits") 
VALUES 
('test plan', 'global', '2', 'PLN_3o7pbbfvw6qf9dz', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb),
('test plan', 'emerging', '2', 'PLN_3o7pbbfvw6qf9dz', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb),
('test plan', 'community', '2', 'PLN_3o7pbbfvw6qf9dz', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb),
('test plan', 'education', '2', 'PLN_3o7pbbfvw6qf9dz', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb)
ON CONFLICT (paystack_plan_code) DO NOTHING;
