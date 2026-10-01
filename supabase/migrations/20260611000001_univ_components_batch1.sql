-- UnivAppointments
CREATE TABLE IF NOT EXISTS public.univ_appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client_name TEXT,
  appointment_date DATE,
  appointment_time TIME,
  duration INT DEFAULT 60,
  status TEXT DEFAULT 'upcoming',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company appointments" ON public.univ_appointments;
CREATE POLICY "Users can manage their company appointments" 
ON public.univ_appointments FOR ALL USING (
  auth.uid() IS NOT NULL
);

-- UnivContactManagement
CREATE TABLE IF NOT EXISTS public.univ_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  type TEXT DEFAULT 'client',
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company contacts" ON public.univ_contacts;
DROP POLICY IF EXISTS "Users can manage their company's contacts" ON public.univ_contacts;
DROP POLICY IF EXISTS "Users can manage their company contacts" ON public.univ_contacts;
CREATE POLICY "Users can manage their company contacts" 
ON public.univ_contacts FOR ALL USING (
  auth.uid() IS NOT NULL
);

-- UnivDocument
CREATE TABLE IF NOT EXISTS public.univ_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'file',
  parent_id UUID REFERENCES public.univ_documents(id) ON DELETE CASCADE,
  size INT DEFAULT 0,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company documents" ON public.univ_documents;
CREATE POLICY "Users can manage their company documents" 
ON public.univ_documents FOR ALL USING (
  auth.uid() IS NOT NULL
);

-- UnivProject
CREATE TABLE IF NOT EXISTS public.univ_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning',
  progress INT DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company projects" ON public.univ_projects;
CREATE POLICY "Users can manage their company projects" 
ON public.univ_projects FOR ALL USING (
  auth.uid() IS NOT NULL
);

-- UnivKanban
CREATE TABLE IF NOT EXISTS public.univ_kanban_boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_kanban_boards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company boards" ON public.univ_kanban_boards;
CREATE POLICY "Users can manage their company boards" 
ON public.univ_kanban_boards FOR ALL USING (
  auth.uid() IS NOT NULL
);

CREATE TABLE IF NOT EXISTS public.univ_kanban_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES public.univ_kanban_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_kanban_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage tasks for their boards" ON public.univ_kanban_tasks;
CREATE POLICY "Users can manage tasks for their boards" 
ON public.univ_kanban_tasks FOR ALL USING (
  auth.uid() IS NOT NULL
);
