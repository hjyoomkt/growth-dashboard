const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function fixConstraint() {
  console.log('=== Fixing board_posts Foreign Key Constraint ===\n');

  // First, let's check the current constraint
  console.log('Step 1: Checking current constraints...');
  const checkQuery = `
    SELECT
      conname AS constraint_name,
      contype AS constraint_type,
      pg_get_constraintdef(oid) AS constraint_definition
    FROM pg_constraint
    WHERE conrelid = 'board_posts'::regclass
    AND contype = 'f';
  `;

  console.log('Constraint check query prepared.\n');

  // Drop the old constraint and create new one with ON DELETE SET NULL
  console.log('Step 2: Modifying constraint to ON DELETE SET NULL...');

  const modifyQuery = `
    DO $$
    DECLARE
      constraint_name TEXT;
    BEGIN
      -- Find the constraint name
      SELECT conname INTO constraint_name
      FROM pg_constraint
      WHERE conrelid = 'board_posts'::regclass
      AND contype = 'f'
      AND confrelid = 'users'::regclass;

      -- Drop the old constraint if exists
      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE board_posts DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
      END IF;

      -- Add new constraint with ON DELETE SET NULL
      ALTER TABLE board_posts
      ADD CONSTRAINT board_posts_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES users(id)
      ON DELETE SET NULL;

      RAISE NOTICE 'Added new constraint with ON DELETE SET NULL';
    END $$;
  `;

  // Execute via a simple query since we can't use RPC
  const { error } = await supabase.rpc('exec', { sql: modifyQuery });

  if (error) {
    console.log('Cannot execute via RPC. Creating SQL file for manual execution...\n');

    // Create SQL file for manual execution
    const fs = require('fs');
    const sqlContent = `-- Fix board_posts foreign key constraint
-- This allows users to be deleted without deleting their posts
-- Posts will show created_by as NULL (can display as "Deleted User")

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the constraint name
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'board_posts'::regclass
  AND contype = 'f'
  AND confrelid = 'users'::regclass;

  -- Drop the old constraint if exists
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE board_posts DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  END IF;

  -- Add new constraint with ON DELETE SET NULL
  ALTER TABLE board_posts
  ADD CONSTRAINT board_posts_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

  RAISE NOTICE 'Added new constraint with ON DELETE SET NULL';
END $$;
`;

    fs.writeFileSync('/Users/reon/Desktop/개발/growth-dashboard/database/fix_board_posts_fkey.sql', sqlContent);
    console.log('✓ SQL file created: database/fix_board_posts_fkey.sql');
    console.log('\nPlease execute this SQL in Supabase Dashboard:');
    console.log('1. Go to SQL Editor');
    console.log('2. Copy and paste the SQL from fix_board_posts_fkey.sql');
    console.log('3. Run the query\n');
  } else {
    console.log('✓ Constraint successfully modified!');
  }
}

fixConstraint().then(() => process.exit(0));
