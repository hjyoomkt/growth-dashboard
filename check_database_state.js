const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function checkAll() {
  console.log('=== 1. Checking Organizations ===\n');
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .is('deleted_at', null);

  if (orgError) {
    console.log('Error:', orgError);
  } else {
    console.log(JSON.stringify(orgs, null, 2));
  }

  console.log('\n=== 2. Checking Advertisers ===\n');
  const { data: advertisers, error: advError } = await supabase
    .from('advertisers')
    .select('*, organizations(name)')
    .is('deleted_at', null);

  if (advError) {
    console.log('Error:', advError);
  } else {
    console.log(JSON.stringify(advertisers, null, 2));
  }

  console.log('\n=== 3. Checking Users ===\n');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('email, role, organization_id, advertiser_id')
    .is('deleted_at', null)
    .order('email');

  if (userError) {
    console.log('Error:', userError);
  } else {
    console.log(JSON.stringify(users, null, 2));
  }

  console.log('\n=== 4. Checking Auth Users (Supabase Auth) ===\n');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log('Error:', authError);
  } else {
    console.log('Total auth users:', authUsers.users.length);
    authUsers.users.forEach(u => {
      const confirmed = u.email_confirmed_at ? 'YES' : 'NO';
      console.log(`- ${u.email}: confirmed=${confirmed}`);
    });
  }
}

checkAll().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
