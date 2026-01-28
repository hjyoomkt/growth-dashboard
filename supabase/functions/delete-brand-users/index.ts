import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface DeleteBrandUsersRequest {
  brand_id: string;
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

    // Service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Regular client for user verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !currentUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { brand_id }: DeleteBrandUsersRequest = await req.json();

    if (!brand_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: brand_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-brand-users] Starting deletion for brand: ${brand_id}`);

    // 1. 현재 사용자 권한 확인
    const { data: currentUserData, error: currentUserError } = await supabaseAdmin
      .from('users')
      .select('role, advertiser_id, organization_id')
      .eq('id', currentUser.id)
      .single();

    if (currentUserError || !currentUserData) {
      return new Response(
        JSON.stringify({ error: 'Current user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. 브랜드 정보 조회
    const { data: brandData, error: brandError } = await supabaseAdmin
      .from('advertisers')
      .select('id, name, organization_id')
      .eq('id', brand_id)
      .single();

    if (brandError || !brandData) {
      return new Response(
        JSON.stringify({ error: 'Brand not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. 권한 체크
    let hasPermission = false;

    if (currentUserData.role === 'master') {
      // Master는 모든 브랜드 삭제 가능
      hasPermission = true;
    } else if (currentUserData.role === 'agency_admin') {
      // agency_admin은 자신의 조직 브랜드만
      hasPermission = currentUserData.organization_id === brandData.organization_id;
    } else if (currentUserData.role === 'advertiser_admin') {
      // advertiser_admin은 자신의 브랜드만
      hasPermission = currentUserData.advertiser_id === brand_id;
    }

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to delete this brand\'s users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-brand-users] Permission granted for brand: ${brandData.name}`);

    // 4. 브랜드 전용 사용자만 조회 (에이전시 직원 제외)
    const { data: usersToDelete, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role')
      .eq('advertiser_id', brand_id)
      .not('role', 'in', '(master,agency_staff,agency_admin,agency_manager)');

    if (usersError) {
      console.error('[delete-brand-users] Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch brand users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-brand-users] Found ${usersToDelete?.length || 0} users to delete`);

    const deletedUsers: string[] = [];
    const failedUsers: string[] = [];

    // 5. 각 사용자 삭제
    if (usersToDelete && usersToDelete.length > 0) {
      for (const user of usersToDelete) {
        try {
          console.log(`[delete-brand-users] Processing user: ${user.email}`);

          // 5-1. 이메일 익명화
          const anonymizedEmail = `deleted-${user.id}@deleted.local`;

          // users 테이블 이메일 익명화
          const { error: usersUpdateError } = await supabaseAdmin
            .from('users')
            .update({ email: anonymizedEmail })
            .eq('id', user.id);

          if (usersUpdateError) {
            throw new Error(`users 이메일 익명화 실패: ${usersUpdateError.message}`);
          }

          // auth.users 이메일 익명화
          const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { email: anonymizedEmail }
          );

          if (authUpdateError) {
            throw new Error(`auth.users 이메일 익명화 실패: ${authUpdateError.message}`);
          }

          // 5-2. auth.users 삭제
          const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

          if (authDeleteError) {
            throw new Error(`auth.users 삭제 실패: ${authDeleteError.message}`);
          }

          // 5-3. users 테이블 삭제
          const { error: userDeleteError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', user.id);

          if (userDeleteError) {
            throw new Error(`users 테이블 삭제 실패: ${userDeleteError.message}`);
          }

          deletedUsers.push(user.email);
          console.log(`[delete-brand-users] ✅ User deleted: ${user.email}`);

        } catch (error) {
          console.error(`[delete-brand-users] ❌ Failed to delete user ${user.email}:`, error);
          failedUsers.push(`${user.email}: ${error.message}`);
        }
      }
    }

    console.log(`[delete-brand-users] Complete. Deleted: ${deletedUsers.length}, Failed: ${failedUsers.length}`);

    return new Response(
      JSON.stringify({
        success: failedUsers.length === 0,
        brand_id: brand_id,
        brand_name: brandData.name,
        deleted_users: deletedUsers,
        failed_users: failedUsers,
        message: failedUsers.length === 0
          ? `Successfully deleted ${deletedUsers.length} users from brand ${brandData.name}`
          : `Deleted ${deletedUsers.length} users, but ${failedUsers.length} failed`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[delete-brand-users] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
