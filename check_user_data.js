const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA5NTMsImV4cCI6MjA4MjY4Njk1M30.ZmC738mDWCJo0U_JZt7-L5KqaRiDAwd8_ihgk4p5pQM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserData() {
  try {
    // 1. users 테이블에서 직접 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'agency.owner.test01@gmail.com')
      .single();

    if (userError) {
      console.error('❌ users 테이블 조회 실패:', userError);
      return;
    }

    console.log('✅ users 테이블 데이터:', userData);
    console.log('');

    // 2. organizations 조인해서 조회 (getUserMetadata와 동일)
    const { data: joinData, error: joinError } = await supabase
      .from('users')
      .select(`
        *,
        organizations(id, name, type),
        advertisers(id, name)
      `)
      .eq('email', 'agency.owner.test01@gmail.com')
      .single();

    if (joinError) {
      console.error('❌ 조인 조회 실패:', joinError);
      return;
    }

    console.log('✅ 조인 조회 결과:', joinData);
    console.log('');
    console.log('✅ role:', joinData.role);
    console.log('✅ organization_type (users 테이블):', joinData.organization_type);
    console.log('✅ organizations.type (조인):', joinData.organizations?.type);

  } catch (err) {
    console.error('❌ 에러:', err);
  }
}

checkUserData();
