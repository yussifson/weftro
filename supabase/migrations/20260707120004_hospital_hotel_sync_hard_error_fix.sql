-- Hospital/hotel PowerSync hard-error cleanup
-- Fixes legacy universal appointment constraints that reject hospital appointment rows.

ALTER TABLE public.univ_appointments
  ADD COLUMN IF NOT EXISTS attendee_name text;

UPDATE public.univ_appointments
SET attendee_name = COALESCE(NULLIF(attendee_name, ''), NULLIF(client_name, ''), NULLIF(title, ''), 'Appointment attendee')
WHERE attendee_name IS NULL OR attendee_name = '';

ALTER TABLE public.univ_appointments
  ALTER COLUMN attendee_name SET DEFAULT 'Appointment attendee';

ALTER TABLE public.univ_appointments
  ALTER COLUMN title SET DEFAULT 'Appointment';

UPDATE public.univ_appointments
SET title = COALESCE(NULLIF(title, ''), NULLIF(attendee_name, ''), 'Appointment')
WHERE title IS NULL OR title = '';
