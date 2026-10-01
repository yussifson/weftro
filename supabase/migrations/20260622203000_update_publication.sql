-- Re-run publication update for new tables (like univ_retail_*)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION powersync ADD TABLE public.%I;', t);
        EXCEPTION
            WHEN undefined_object THEN
                -- Publication powersync doesn't exist? Create it and try again
                BEGIN
                    EXECUTE 'CREATE PUBLICATION powersync;';
                    EXECUTE format('ALTER PUBLICATION powersync ADD TABLE public.%I;', t);
                EXCEPTION WHEN OTHERS THEN
                    -- ignore
                END;
            WHEN duplicate_object THEN
                -- Table already in publication, ignore
            WHEN OTHERS THEN
                -- ignore any other errors
        END;
    END LOOP;
END;
$$;
