-- ==========================================
-- Phase 5: Education Suite Data Layer
-- Execute this script in your Supabase SQL Editor
-- ==========================================

-- 16. Students (univ_students)
CREATE TABLE IF NOT EXISTS public.univ_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    student_id_number TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    date_of_birth DATE,
    grade_level TEXT,
    status TEXT DEFAULT 'Enrolled', -- Enrolled, Graduated, Suspended, Transferred
    enrollment_date DATE,
    guardian_name TEXT,
    guardian_contact TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's students" ON public.univ_students;
CREATE POLICY "Users can manage their company's students" ON public.univ_students FOR ALL USING (auth.uid() IS NOT NULL);

-- 17. Faculty (univ_faculty)
CREATE TABLE IF NOT EXISTS public.univ_faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department TEXT,
    title TEXT DEFAULT 'Teacher',
    status TEXT DEFAULT 'Active', -- Active, On Leave, Former
    hire_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_faculty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's faculty" ON public.univ_faculty;
CREATE POLICY "Users can manage their company's faculty" ON public.univ_faculty FOR ALL USING (auth.uid() IS NOT NULL);

-- 18. Courses (univ_courses)
CREATE TABLE IF NOT EXISTS public.univ_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    course_code TEXT NOT NULL,
    course_name TEXT NOT NULL,
    description TEXT,
    department TEXT,
    credits NUMERIC DEFAULT 0,
    instructor_id UUID,
    instructor_name TEXT,
    status TEXT DEFAULT 'Active', -- Active, Upcoming, Archived
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's courses" ON public.univ_courses;
CREATE POLICY "Users can manage their company's courses" ON public.univ_courses FOR ALL USING (auth.uid() IS NOT NULL);

-- 19. Gradebook (univ_gradebook)
CREATE TABLE IF NOT EXISTS public.univ_gradebook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    student_id UUID,
    student_name TEXT,
    course_id UUID,
    course_name TEXT,
    assessment_name TEXT NOT NULL,
    score NUMERIC,
    max_score NUMERIC DEFAULT 100,
    grade TEXT,
    date_recorded DATE,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_gradebook ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's gradebook" ON public.univ_gradebook;
CREATE POLICY "Users can manage their company's gradebook" ON public.univ_gradebook FOR ALL USING (auth.uid() IS NOT NULL);

-- 20. Class Attendance (univ_class_attendance)
CREATE TABLE IF NOT EXISTS public.univ_class_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    student_id UUID,
    student_name TEXT,
    course_id UUID,
    course_name TEXT,
    date DATE NOT NULL,
    status TEXT DEFAULT 'Present', -- Present, Absent, Late, Excused
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_class_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's class attendance" ON public.univ_class_attendance;
DROP POLICY IF EXISTS "Users can manage their company's class attendance" ON public.univ_class_attendance;
CREATE POLICY "Users can manage their company's class attendance" ON public.univ_class_attendance FOR ALL USING (auth.uid() IS NOT NULL);

-- 21. LMS / Lessons (univ_lms_lessons)
CREATE TABLE IF NOT EXISTS public.univ_lms_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    course_id UUID,
    course_name TEXT,
    title TEXT NOT NULL,
    content_type TEXT DEFAULT 'Lesson', -- Lesson, Assignment, Quiz
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'Published', -- Draft, Published, Archived
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_lms_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's lms lessons" ON public.univ_lms_lessons;
CREATE POLICY "Users can manage their company's lms lessons" ON public.univ_lms_lessons FOR ALL USING (auth.uid() IS NOT NULL);

-- 22. Parent Portal Data View (univ_parent_portal - represented as linking table or direct queries, keeping simple)
CREATE TABLE IF NOT EXISTS public.univ_parent_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    student_id UUID NOT NULL,
    parent_name TEXT NOT NULL,
    parent_email TEXT,
    access_code TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_parent_portal_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's parent portal" ON public.univ_parent_portal_access;
DROP POLICY IF EXISTS "Users can manage their company's parent portal" ON public.univ_parent_portal_access;
CREATE POLICY "Users can manage their company's parent portal" ON public.univ_parent_portal_access FOR ALL USING (auth.uid() IS NOT NULL);

-- Add triggers to auto-update updated_at for all Phase 5 tables
DROP TRIGGER IF EXISTS update_univ_students_modtime ON public.univ_students;
CREATE TRIGGER update_univ_students_modtime BEFORE UPDATE ON public.univ_students FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_faculty_modtime ON public.univ_faculty;
CREATE TRIGGER update_univ_faculty_modtime BEFORE UPDATE ON public.univ_faculty FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_courses_modtime ON public.univ_courses;
CREATE TRIGGER update_univ_courses_modtime BEFORE UPDATE ON public.univ_courses FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_gradebook_modtime ON public.univ_gradebook;
CREATE TRIGGER update_univ_gradebook_modtime BEFORE UPDATE ON public.univ_gradebook FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_class_attendance_modtime ON public.univ_class_attendance;
CREATE TRIGGER update_univ_class_attendance_modtime BEFORE UPDATE ON public.univ_class_attendance FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_lms_lessons_modtime ON public.univ_lms_lessons;
CREATE TRIGGER update_univ_lms_lessons_modtime BEFORE UPDATE ON public.univ_lms_lessons FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_parent_portal_access_modtime ON public.univ_parent_portal_access;
DROP TRIGGER IF EXISTS update_univ_parent_portal_access_modtime ON public.univ_parent_portal_access;
CREATE TRIGGER update_univ_parent_portal_access_modtime BEFORE UPDATE ON public.univ_parent_portal_access FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
