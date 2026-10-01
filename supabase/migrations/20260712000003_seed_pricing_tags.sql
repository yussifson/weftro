-- Seed default pricing tags for CliPad

INSERT INTO public.clipad_pricing_tags (name, description, price, currency)
VALUES
('Pro', 'Ideal for growing firms', 99.00, 'USD'),
('Enterprise', 'Full enterprise capabilities', 299.00, 'USD')
ON CONFLICT DO NOTHING;

-- Also update the schema cache just in case
NOTIFY pgrst, 'reload schema';
