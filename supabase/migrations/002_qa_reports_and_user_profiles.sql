-- QA Reports: one generated PDF per branch + date
CREATE TABLE IF NOT EXISTS qa_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_code TEXT NOT NULL,
  date TEXT NOT NULL,
  url TEXT NOT NULL,
  public_id TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_code, date)
);
ALTER TABLE qa_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users all operations on qa_reports"
  ON qa_reports FOR ALL
  USING (auth.role() = 'authenticated');

-- User profiles for display names
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);