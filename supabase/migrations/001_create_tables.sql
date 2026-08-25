-- Branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, code)
);

-- Audits table
CREATE TABLE IF NOT EXISTS audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Policies (allow authenticated users full access)
CREATE POLICY "Allow authenticated users all operations on branches"
  ON branches FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users all operations on departments"
  ON departments FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users all operations on audits"
  ON audits FOR ALL
  USING (auth.role() = 'authenticated');
