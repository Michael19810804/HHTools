-- 1. 为 signatures 表添加 field_id 字段
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS field_id VARCHAR(50);

-- 2. 允许匿名用户(签字人)更新 signers 表的状态
CREATE POLICY "Public update access to signers" ON signers
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
