const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

// IDs from database
const LEON_MARKETING_ID = '53bbd84f-25c4-4808-bc5e-58da08ba5277';
const NIKE_ID = 'd4c9fb55-f23b-48c0-ba25-3f862ad86042';
const ADIDAS_ID = 'c6257f20-907a-4f65-8736-cdd9361397c4';

async function updateExistingUsers() {
  console.log('=== Updating Existing Users ===\n');

  // 1. nike.owner.test01@gmail.com - advertiser_admin for Nike
  console.log('1. Updating nike.owner.test01@gmail.com...');
  const { error: e1 } = await supabase
    .from('users')
    .update({
      role: 'advertiser_admin',
      advertiser_id: NIKE_ID,
      organization_id: null
    })
    .eq('email', 'nike.owner.test01@gmail.com');

  if (e1) console.log('Error:', e1);
  else console.log('✓ Updated: advertiser_admin, Nike advertiser');

  // 2. nike.admin.test01@gmail.com - advertiser_staff for Nike (already correct)
  console.log('\n2. Updating nike.admin.test01@gmail.com...');
  const { error: e2 } = await supabase
    .from('users')
    .update({
      role: 'advertiser_staff',
      advertiser_id: NIKE_ID,
      organization_id: null
    })
    .eq('email', 'nike.admin.test01@gmail.com');

  if (e2) console.log('Error:', e2);
  else console.log('✓ Updated: advertiser_staff, Nike advertiser');

  // 3. agency.owner.test01@gmail.com - agency_admin for Leon Marketing (already correct)
  console.log('\n3. Updating agency.owner.test01@gmail.com...');
  const { error: e3 } = await supabase
    .from('users')
    .update({
      role: 'agency_admin',
      organization_id: LEON_MARKETING_ID,
      advertiser_id: null
    })
    .eq('email', 'agency.owner.test01@gmail.com');

  if (e3) console.log('Error:', e3);
  else console.log('✓ Updated: agency_admin, Leon Marketing');

  // 4. agency.admin.test01@gmail.com - agency_manager for Leon Marketing
  console.log('\n4. Updating agency.admin.test01@gmail.com...');
  const { error: e4 } = await supabase
    .from('users')
    .update({
      role: 'agency_manager',
      organization_id: LEON_MARKETING_ID,
      advertiser_id: null
    })
    .eq('email', 'agency.admin.test01@gmail.com');

  if (e4) console.log('Error:', e4);
  else console.log('✓ Updated: agency_manager, Leon Marketing');

  // 5. nike.viewer.test01@gmail.com - viewer for Nike (already correct)
  console.log('\n5. Updating nike.viewer.test01@gmail.com...');
  const { error: e5 } = await supabase
    .from('users')
    .update({
      role: 'viewer',
      advertiser_id: NIKE_ID,
      organization_id: null
    })
    .eq('email', 'nike.viewer.test01@gmail.com');

  if (e5) console.log('Error:', e5);
  else console.log('✓ Updated: viewer, Nike advertiser');

  console.log('\n=== Existing Users Update Complete ===\n');
}

async function createNewUsers() {
  console.log('=== Creating New Users ===\n');

  const password = 'qwas123';

  const newUsers = [
    {
      email: 'adidas.owner.test01@gmail.com',
      role: 'advertiser_admin',
      advertiser_id: ADIDAS_ID,
      organization_id: null,
      name: 'Adidas Owner'
    },
    {
      email: 'adidas.staff.test01@gmail.com',
      role: 'advertiser_staff',
      advertiser_id: ADIDAS_ID,
      organization_id: null,
      name: 'Adidas Staff'
    },
    {
      email: 'adidas.viewer.test01@gmail.com',
      role: 'viewer',
      advertiser_id: ADIDAS_ID,
      organization_id: null,
      name: 'Adidas Viewer'
    },
    {
      email: 'agency.staff.test01@gmail.com',
      role: 'agency_staff',
      advertiser_id: null,
      organization_id: LEON_MARKETING_ID,
      name: 'Agency Staff'
    }
  ];

  for (const user of newUsers) {
    console.log(`Creating ${user.email}...`);

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: password,
      email_confirm: true  // Auto-confirm email
    });

    if (authError) {
      console.log(`Error creating auth user: ${authError.message}`);
      continue;
    }

    console.log(`✓ Auth user created (ID: ${authData.user.id})`);

    // 2. Create users table entry
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: user.email,
        role: user.role,
        advertiser_id: user.advertiser_id,
        organization_id: user.organization_id,
        name: user.name
      });

    if (userError) {
      console.log(`Error creating user record: ${userError.message}`);
    } else {
      console.log(`✓ User record created: ${user.role}, ${user.organization_id ? 'Leon Marketing' : 'Adidas advertiser'}`);
    }

    console.log('');
  }

  console.log('=== New Users Creation Complete ===\n');
}

async function verifyChanges() {
  console.log('=== Verification: All Users ===\n');

  const { data: users, error } = await supabase
    .from('users')
    .select('email, role, organization_id, advertiser_id, organizations(name), advertisers(name)')
    .is('deleted_at', null)
    .order('email');

  if (error) {
    console.log('Error:', error);
  } else {
    users.forEach(user => {
      const org = user.organizations?.name || 'N/A';
      const adv = user.advertisers?.name || 'N/A';
      console.log(`${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Organization: ${org}`);
      console.log(`  Advertiser: ${adv}`);
      console.log('');
    });
  }
}

async function main() {
  try {
    await updateExistingUsers();
    await createNewUsers();
    await verifyChanges();
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

main().then(() => process.exit(0));
