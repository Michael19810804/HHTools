-- Create table for customer submissions
CREATE TABLE IF NOT EXISTS public.customer_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    passport_url TEXT,
    title_deed_url TEXT,
    blue_book_url TEXT,
    prev_contract_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'contacted', 'rejected'))
);

-- Enable RLS
ALTER TABLE public.customer_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public (anon) to insert data
CREATE POLICY "Allow public insert"
ON public.customer_submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users (admins) to view all submissions
CREATE POLICY "Allow authenticated view"
ON public.customer_submissions
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users (admins) to update status
CREATE POLICY "Allow authenticated update"
ON public.customer_submissions
FOR UPDATE
TO authenticated
USING (true);

-- Create a new storage bucket for customer uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer_uploads', 'customer_uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Allow public (anon) to upload files
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
    bucket_id = 'customer_uploads'
);

-- Storage Policy: Allow authenticated users (admins) to view files
CREATE POLICY "Allow authenticated view files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'customer_uploads'
);
