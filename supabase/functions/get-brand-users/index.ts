import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface GetBrandUsersRequest {
  advertiser_id: string;
  exclude_user_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { advertiser_id, exclude_user_id }: GetBrandUsersRequest = await req.json();

    console.log('[get-brand-users] Request params:', {
      advertiser_id,
      exclude_user_id,
      authenticated_user: user.id
    });

    if (!advertiser_id || !exclude_user_id) {
      console.error('[get-brand-users] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: advertiser_id, exclude_user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 동일한 브랜드의 다른 사용자 조회 (현재 사용자 제외)
    const { data: brandUsers, error: usersError } = await supabaseClient
      .from('user_advertisers')
      .select(`
        user_id,
        users (
          id,
          name,
          email,
          role
        )
      `)
      .eq('advertiser_id', advertiser_id)
      .neq('user_id', exclude_user_id);

    if (usersError) {
      console.error('[get-brand-users] Error fetching brand users:', usersError);
      return new Response(
        JSON.stringify({ error: usersError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-brand-users] Raw query result:', {
      count: brandUsers?.length || 0,
      users: brandUsers
    });

    // advertiser_admin이 아닌 사용자만 필터링 (중복 방지)
    const eligibleUsers = brandUsers
      ?.map((ua: any) => ua.users)
      .filter((u: any) => u && u.role !== 'advertiser_admin') || [];

    console.log('[get-brand-users] Eligible users after filtering:', {
      count: eligibleUsers.length,
      users: eligibleUsers
    });

    return new Response(
      JSON.stringify({
        success: true,
        users: eligibleUsers,
        count: eligibleUsers.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-brand-users:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
