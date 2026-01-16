const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function deleteAccounts() {
  console.log('=== Deleting Test Accounts ===\n');

  const accountsToDelete = ['adidas@example.com', 'test@example.com'];

  for (const email of accountsToDelete) {
    console.log(`Deleting ${email}...`);

    // 1. Get user ID from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError) {
      console.log(`  Error getting user: ${userError.message}`);
      continue;
    }

    const userId = userData.id;

    // 2. Delete from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.log(`  Error deleting auth user: ${authError.message}`);
    } else {
      console.log(`  ✓ Auth user deleted`);
    }

    // 3. Delete from users table
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('email', email);

    if (deleteError) {
      console.log(`  Error deleting user record: ${deleteError.message}`);
    } else {
      console.log(`  ✓ User record deleted`);
    }

    console.log('');
  }

  console.log('=== Deletion Complete ===\n');
}

async function verifyFinalState() {
  console.log('=== Final User List ===\n');

  const { data: users, error } = await supabase
    .from('users')
    .select('email, role, organizations(name), advertisers(name)')
    .is('deleted_at', null)
    .order('email');

  if (error) {
    console.log('Error:', error);
  } else {
    console.log(`Total users: ${users.length}\n`);
    users.forEach(user => {
      const org = user.organizations?.name || 'N/A';
      const adv = user.advertisers?.name || 'N/A';
      console.log(`${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Organization: ${org} | Advertiser: ${adv}`);
      console.log('');
    });
  }
}

async function main() {
  try {
    await deleteAccounts();
    await verifyFinalState();
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

main().then(() => process.exit(0));
