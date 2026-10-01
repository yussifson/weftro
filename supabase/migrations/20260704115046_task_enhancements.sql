CREATE TABLE IF NOT EXISTS public.univ_task_comments (
    id uuid default gen_random_uuid() primary key,
    task_id text,
    company_id text,
    created_by text,
    comment_text text,
    created_at text,
    created_date text
);

CREATE TABLE IF NOT EXISTS public.univ_task_checklists (
    id uuid default gen_random_uuid() primary key,
    task_id text,
    company_id text,
    title text,
    is_completed boolean default false,
    created_by text,
    created_at text,
    created_date text
);

CREATE TABLE IF NOT EXISTS public.univ_task_attachments (
    id uuid default gen_random_uuid() primary key,
    task_id text,
    company_id text,
    file_url text,
    file_name text,
    file_size text,
    created_by text,
    created_at text,
    created_date text
);

ALTER PUBLICATION powersync ADD TABLE public.univ_task_comments;
ALTER PUBLICATION powersync ADD TABLE public.univ_task_checklists;
ALTER PUBLICATION powersync ADD TABLE public.univ_task_attachments;
