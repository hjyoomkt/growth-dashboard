const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qdzdyoqtzkfpcogecyar.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0'
);

async function addColumns() {
  console.log('advertisers 테이블에 컬럼 추가 중...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE advertisers 
      ADD COLUMN IF NOT EXISTS business_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS website_url TEXT,
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
    `
  });

  if (error) {
    console.error('❌ 오류:', error.message);
  } else {
    console.log('✅ 컬럼 추가 완료');
  }
}

addColumns().then(() => process.exit(0));
