-- Grant full access to the service_role on all app tables
GRANT ALL ON TABLE public.settings TO service_role;
GRANT ALL ON TABLE public.sections TO service_role;
GRANT ALL ON TABLE public.exams TO service_role;
GRANT ALL ON TABLE public.section_exam TO service_role;
GRANT ALL ON TABLE public.questions TO service_role;
GRANT ALL ON TABLE public.app_users TO service_role;
GRANT ALL ON TABLE public.examiner_sections TO service_role;
GRANT ALL ON TABLE public.results TO service_role;

-- Also grant usage on sequences (for uuid generation)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
