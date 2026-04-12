-- Create the documents storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow service_role full access (used by edge functions)
CREATE POLICY "Service role full access on documents"
ON storage.objects FOR ALL
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

SELECT 'Documents storage bucket created!' as result;
