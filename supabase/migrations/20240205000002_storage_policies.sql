-- Create a storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files to 'documents' bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() = owner
);

-- Policy to allow authenticated users to view their own files
CREATE POLICY "Allow authenticated owners to view"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid() = owner
);

-- Policy to allow authenticated users to update their own files
CREATE POLICY "Allow authenticated owners to update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid() = owner
);

-- Policy to allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated owners to delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid() = owner
);
