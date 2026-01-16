const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0';

const fetch = require('node-fetch');

async function executeSQL() {
  console.log('=== Executing SQL to Fix Foreign Key ===\n');

  const sql = `
    DO $$
    DECLARE
      constraint_name TEXT;
    BEGIN
      SELECT conname INTO constraint_name
      FROM pg_constraint
      WHERE conrelid = 'board_posts'::regclass
      AND contype = 'f'
      AND confrelid = 'users'::regclass;

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE board_posts DROP CONSTRAINT %I', constraint_name);
      END IF;

      ALTER TABLE board_posts
      ADD CONSTRAINT board_posts_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES users(id)
      ON DELETE SET NULL;
    END $$;
  `;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);

    if (response.ok) {
      console.log('\n✓ Constraint successfully modified!');
    } else {
      console.log('\n✗ Failed to execute. Manual execution required.');
    }
  } catch (err) {
    console.log('Error:', err.message);
    console.log('\nSQL has been saved to: database/fix_board_posts_fkey.sql');
    console.log('Please run it manually in Supabase Dashboard SQL Editor.');
  }
}

executeSQL().then(() => process.exit(0));
