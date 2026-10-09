-- Add RLS policies for hr_training_courses

-- Enable RLS
ALTER TABLE hr_training_courses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform all actions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'hr_training_courses' 
        AND policyname = 'Allow all actions for authenticated users'
    ) THEN
        DROP POLICY IF EXISTS "Allow all actions for authenticated users" 
        ON hr_training_courses;
CREATE POLICY "Allow all actions for authenticated users" 
        ON hr_training_courses 
        FOR ALL 
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
END
$$;
