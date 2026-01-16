const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ywtlywymybuouojcmyif.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dGx5d3lteWJ1b3VvamNteWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMzM1NzMsImV4cCI6MjA0OTkwOTU3M30.lJV3S0wBcaWKBG2vCo-cT4OgNQ3VZNzJPewCB2t8k0s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBoardPosts() {
  console.log('===== 게시판 데이터 확인 =====\n');

  try {
    // 1. 모든 게시글 조회
    console.log('1. 모든 게시글 조회 (board_posts):');
    const { data: allPosts, error: allError } = await supabase
      .from('board_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('에러:', allError);
    } else {
      console.log(`총 ${allPosts.length}개의 게시글이 있습니다.`);
      allPosts.forEach((post, idx) => {
        console.log(`\n게시글 ${idx + 1}:`);
        console.log(`  - ID: ${post.id}`);
        console.log(`  - 제목: ${post.title}`);
        console.log(`  - 타입: ${post.board_type}`);
        console.log(`  - 작성자 ID: ${post.created_by}`);
        console.log(`  - 대상: ${post.target_roles}`);
        console.log(`  - 삭제됨: ${post.deleted_at ? 'Yes' : 'No'}`);
        console.log(`  - 작성일: ${post.created_at}`);
      });
    }

    // 2. 삭제되지 않은 게시글만 조회
    console.log('\n\n2. 삭제되지 않은 게시글 (deleted_at IS NULL):');
    const { data: activePosts, error: activeError } = await supabase
      .from('board_posts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (activeError) {
      console.error('에러:', activeError);
    } else {
      console.log(`총 ${activePosts.length}개의 활성 게시글이 있습니다.`);
    }

    // 3. admin 게시판 게시글
    console.log('\n\n3. admin 게시판 게시글:');
    const { data: adminPosts, error: adminError } = await supabase
      .from('board_posts')
      .select('*')
      .eq('board_type', 'admin')
      .is('deleted_at', null);

    if (adminError) {
      console.error('에러:', adminError);
    } else {
      console.log(`총 ${adminPosts.length}개의 admin 게시글이 있습니다.`);
    }

    // 4. brand 게시판 게시글
    console.log('\n\n4. brand 게시판 게시글:');
    const { data: brandPosts, error: brandError } = await supabase
      .from('board_posts')
      .select('*')
      .eq('board_type', 'brand')
      .is('deleted_at', null);

    if (brandError) {
      console.error('에러:', brandError);
    } else {
      console.log(`총 ${brandPosts.length}개의 brand 게시글이 있습니다.`);
    }

    // 5. 읽음 상태 확인
    console.log('\n\n5. 읽음 상태 (board_read_status):');
    const { data: readStatus, error: readError } = await supabase
      .from('board_read_status')
      .select('*');

    if (readError) {
      console.error('에러:', readError);
    } else {
      console.log(`총 ${readStatus.length}개의 읽음 상태가 있습니다.`);
    }

  } catch (err) {
    console.error('예외 발생:', err);
  }
}

checkBoardPosts();
