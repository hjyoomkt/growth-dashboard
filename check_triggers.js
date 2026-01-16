const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function checkTriggers() {
  console.log('=== Checking Database Triggers ===\n');

  // Using raw SQL query to check triggers
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        t.tgname AS trigger_name,
        c.relname AS table_name,
        p.proname AS function_name,
        pg_get_triggerdef(t.oid) AS trigger_definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE NOT t.tgisinternal
      AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY c.relname, t.tgname;
    `
  });

  if (error) {
    console.log('RPC method not available. Error:', error.message);
    console.log('\nPlease check triggers manually in Supabase Dashboard:');
    console.log('1. Go to Database > Triggers');
    console.log('2. Look for any triggers on users, organizations, or advertisers tables\n');
  } else {
    if (data && data.length > 0) {
      console.log('Found triggers:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('No triggers found in public schema.');
    }
  }
}

checkTriggers().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
