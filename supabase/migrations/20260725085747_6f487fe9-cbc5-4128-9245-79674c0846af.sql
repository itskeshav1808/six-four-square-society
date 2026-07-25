
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO public.site_content (key, title, body)
VALUES ('registration_form_config', 'Registration Form Config',
'{"fields":[]}')
ON CONFLICT (key) DO NOTHING;
