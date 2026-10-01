-- Seed Paystack Plans with generated Plan Codes
INSERT INTO "public"."subscription_plans" 
("name", "market_tier", "price_monthly", "paystack_plan_code", "is_active", "limits") 
VALUES 
('Professional', 'global', '740', 'PLN_wcsydyvxjixk5a1', true, '{"users": 50, "ai_credits_monthly": 10000}'::jsonb),
('Professional', 'emerging', '285', 'PLN_4ghjvyuvqo55h6i', true, '{"users": 50, "ai_credits_monthly": 10000}'::jsonb),
('Professional', 'community', '135', 'PLN_r7vvlqwmhgjvoqs', true, '{"users": 50, "ai_credits_monthly": 10000}'::jsonb),
('Professional', 'education', '435', 'PLN_hyfy25tsdmgtdmp', true, '{"users": 50, "ai_credits_monthly": 10000}'::jsonb),

('Business', 'global', '1490', 'PLN_7v7q2aqur41lwhu', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb),
('Business', 'emerging', '585', 'PLN_5zjokpy4n2sdkpd', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb),
('Business', 'community', '285', 'PLN_57qeh3a4slfq9a2', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb),
('Business', 'education', '1040', 'PLN_je20z5m2y87tjud', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb),

('Enterprise', 'global', '3740', 'PLN_zfz4irbtredtcys', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb),
('Enterprise', 'emerging', '1490', 'PLN_j97lm3tkjiemubt', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb),
('Enterprise', 'community', '740', 'PLN_w2tmztv899gel6t', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb),
('Enterprise', 'education', '1040', 'PLN_w4gcdkifrxmpyhn', true, '{"users": 999999, "ai_credits_monthly": 999999}'::jsonb)
ON CONFLICT (paystack_plan_code) DO NOTHING;
