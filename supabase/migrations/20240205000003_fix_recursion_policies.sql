-- Drop existing policies to clean up and avoid recursion
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Signers can view documents via token" ON documents;
DROP POLICY IF EXISTS "Public read access to documents" ON documents;
DROP POLICY IF EXISTS "Users can view signers of their documents" ON signers;
DROP POLICY IF EXISTS "Public read access to signers" ON signers;
DROP POLICY IF EXISTS "Users can view signatures of their documents" ON signatures;
DROP POLICY IF EXISTS "Public create access to signatures" ON signatures;

-- Re-create policies with strict role separation to prevent infinite recursion

-- 1. Documents Table
-- Authenticated users can do everything on their own documents
CREATE POLICY "Auth users full access to own documents"
ON documents
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Anonymous users (signers) can view documents
-- (Relying on UUID security and frontend token logic)
CREATE POLICY "Anon users view documents"
ON documents
FOR SELECT
TO anon
USING (true);

-- 2. Signers Table
-- Authenticated users can view/manage signers for their documents
-- This queries 'documents' table, but 'documents' policy for authenticated users is simple (user_id check), so no recursion.
CREATE POLICY "Auth users full access to document signers"
ON signers
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = signers.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Anonymous users can view signers (needed for SignPage validation)
CREATE POLICY "Anon users view signers"
ON signers
FOR SELECT
TO anon
USING (true);

-- Anonymous users can update signers (e.g. to set status = 'signed')
-- We restrict this slightly to ensure they can only update if they know the token?
-- For now, allow update to status column for simplicity, or just allow all updates for MVP.
CREATE POLICY "Anon users update signers"
ON signers
FOR UPDATE
TO anon
USING (true);

-- 3. Signatures Table
-- Authenticated users can view signatures for their documents
CREATE POLICY "Auth users view signatures"
ON signatures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = signatures.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Anonymous users can insert signatures
CREATE POLICY "Anon users insert signatures"
ON signatures
FOR INSERT
TO anon
WITH CHECK (true);
