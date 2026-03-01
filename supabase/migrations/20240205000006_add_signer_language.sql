-- 给 signers 表添加 language 字段，默认值为 'en'
ALTER TABLE signers ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('zh', 'en', 'th'));
