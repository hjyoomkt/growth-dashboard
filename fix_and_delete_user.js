const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function fixAndDelete() {
  console.log('=== Fixing board_posts and deleting test@example.com ===\n');

  // 1. Get test@example.com user ID
  const { data: testUser, error: testError } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'test@example.com')
    .single();

  if (testError) {
    console.log('Error getting test user:', testError.message);
    return;
  }

  // 2. Get master.test01@gmail.com user ID
  const { data: masterUser, error: masterError } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'master.test01@gmail.com')
    .single();

  if (masterError) {
    console.log('Error getting master user:', masterError.message);
    return;
  }

  console.log(`Test user ID: ${testUser.id}`);
  console.log(`Master user ID: ${masterUser.id}\n`);

  // 3. Update board_posts created_by
  console.log('Updating board_posts...');
  const { error: updateError } = await supabase
    .from('board_posts')
    .update({ created_by: masterUser.id })
    .eq('created_by', testUser.id);

  if (updateError) {
    console.log('Error updating board_posts:', updateError.message);
    return;
  }
  console.log('✓ Board posts updated\n');

  // 4. Delete auth user
  console.log('Deleting test@example.com from auth...');
  const { error: authError } = await supabase.auth.admin.deleteUser(testUser.id);

  if (authError) {
    console.log('Error deleting auth user:', authError.message);
  } else {
    console.log('✓ Auth user deleted');
  }

  // 5. Delete from users table
  console.log('Deleting from users table...');
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('email', 'test@example.com');

  if (deleteError) {
    console.log('Error deleting user record:', deleteError.message);
  } else {
    console.log('✓ User record deleted');
  }

  console.log('\n=== Complete ===\n');

  // 6. Verify final state
  const { data: users, error } = await supabase
    .from('users')
    .select('email, role')
    .is('deleted_at', null)
    .order('email');

  if (!error) {
    console.log(`Total users: ${users.length}\n`);
    users.forEach(u => console.log(`- ${u.email} (${u.role})`));
  }
}

fixAndDelete().then(() => process.exit(0));
