import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authorization 헤더 확인 (인증된 사용자인지 확인)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Authorization header present');

    // 2. 요청 본문 파싱
    const { parentAdvertiserId, newAdvertiserId } = await req.json();
    console.log('📦 Request body:', { parentAdvertiserId, newAdvertiserId });

    // 3. Service Role Key로 데이터베이스 작업
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('🔑 Supabase admin client created');

    // 4. 부모 브랜드의 advertiser_group_id 조회
    console.log('🔍 Querying parent brand...');
    const { data: parentBrand, error: parentError } = await supabaseAdmin
      .from('advertisers')
      .select('advertiser_group_id')
      .eq('id', parentAdvertiserId)
      .single();

    if (parentError) {
      console.error('❌ Parent brand query error:', parentError);
      throw parentError;
    }
    console.log('✅ Parent brand found:', parentBrand);

    let groupId = parentBrand.advertiser_group_id;

    // 5. 부모에 group_id가 없으면 새로 생성
    if (!groupId) {
      groupId = crypto.randomUUID();
      console.log('🆕 Generated new group ID:', groupId);

      // 부모 브랜드에 group_id 설정
      const { error: updateParentError } = await supabaseAdmin
        .from('advertisers')
        .update({ advertiser_group_id: groupId })
        .eq('id', parentAdvertiserId);

      if (updateParentError) {
        console.error('❌ Update parent error:', updateParentError);
        throw updateParentError;
      }
      console.log('✅ Parent brand updated with group ID');
    } else {
      console.log('✅ Parent already has group ID:', groupId);
    }

    // 6. 신규 브랜드에 같은 group_id 설정
    console.log('🔄 Updating new brand with group ID...');
    const { error: updateNewError } = await supabaseAdmin
      .from('advertisers')
      .update({ advertiser_group_id: groupId })
      .eq('id', newAdvertiserId);

    if (updateNewError) {
      console.error('❌ Update new brand error:', updateNewError);
      throw updateNewError;
    }
    console.log('✅ New brand updated with group ID');

    console.log('🎉 Success! Returning response...');
    return new Response(
      JSON.stringify({
        success: true,
        groupId: groupId,
        message: '브랜드 그룹 설정 완료'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
