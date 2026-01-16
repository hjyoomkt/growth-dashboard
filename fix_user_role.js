const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA5NTMsImV4cCI6MjA4MjY4Njk1M30.ZmC738mDWCJo0U_JZt7-L5KqaRiDAwd8_ihgk4p5pQM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUserRole() {
  try {
    // 1. 리온마케팅 조직 ID 가져오기
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', '리온마케팅')
      .eq('type', 'agency')
      .single();

    if (orgError) {
      console.error('❌ 조직 조회 실패:', orgError);
      return;
    }

    console.log('✅ 리온마케팅 조직 ID:', org.id);

    // 2. 사용자 권한 업데이트
    const { data, error } = await supabase
      .from('users')
      .update({
        role: 'agency_admin',
        organization_id: org.id,
        organization_type: 'agency',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'agency.owner.test01@gmail.com')
      .select();

    if (error) {
      console.error('❌ 업데이트 실패:', error);
      return;
    }

    console.log('✅ 업데이트 성공:', data);

    // 3. 결과 확인
    const { data: checkData, error: checkError } = await supabase
      .from('users')
      .select('email, role, organization_id, organization_type')
      .eq('email', 'agency.owner.test01@gmail.com')
      .single();

    if (checkError) {
      console.error('❌ 확인 실패:', checkError);
      return;
    }

    console.log('✅ 최종 결과:', checkData);

  } catch (err) {
    console.error('❌ 에러:', err);
  }
}

fixUserRole();
