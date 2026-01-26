import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface DeleteUserRequest {
  user_id: string;
  new_owner_id?: string | null;
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

    const { user_id, new_owner_id }: DeleteUserRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 본인만 탈퇴 가능 (보안 체크)
    if (currentUser.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Can only delete your own account' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting account deletion for user: ${user_id}`);

    // 1. 사용자 정보 조회
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        advertisers!users_advertiser_id_fkey (
          id,
          name
        ),
        organizations (
          id,
          name
        )
      `)
      .eq('id', user_id)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User data retrieved: ${userData.email}, role: ${userData.role}`);

    // Master 계정 삭제 차단
    if (userData.role === 'master') {
      return new Response(
        JSON.stringify({ error: 'Master account cannot be deleted' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. advertiser_admin인 경우 소유권 이전 처리
    const isAdvertiserAdmin = userData.role === 'advertiser_admin';

    if (isAdvertiserAdmin) {
      if (!new_owner_id) {
        return new Response(
          JSON.stringify({ error: 'Brand owner must transfer ownership before deletion (new_owner_id required)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 새 소유자가 같은 브랜드에 속하는지 확인
      const { data: newOwnerCheck, error: checkError } = await supabaseAdmin
        .from('user_advertisers')
        .select('advertiser_id')
        .eq('user_id', new_owner_id)
        .eq('advertiser_id', userData.advertiser_id);

      if (checkError || !newOwnerCheck || newOwnerCheck.length === 0) {
        return new Response(
          JSON.stringify({ error: 'New owner must belong to the same brand' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Transferring ownership to user: ${new_owner_id}`);

      // 소유권 이전: 새 관리자 역할 변경
      const { error: roleUpdateError } = await supabaseAdmin
        .from('users')
        .update({ role: 'advertiser_admin', updated_at: new Date().toISOString() })
        .eq('id', new_owner_id);

      if (roleUpdateError) {
        console.error('Error transferring ownership:', roleUpdateError);
        return new Response(
          JSON.stringify({ error: 'Failed to transfer ownership' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Ownership transferred successfully');
    }

    // 3. api_tokens에 advertiser 이름 저장 (토큰 보존)
    if (userData.advertiser_id && userData.advertisers?.name) {
      const { error: tokenUpdateError } = await supabaseAdmin
        .from('api_tokens')
        .update({ deleted_advertiser_name: userData.advertisers.name })
        .eq('advertiser_id', userData.advertiser_id);

      if (tokenUpdateError) {
        console.warn('Failed to update api_tokens with advertiser name:', tokenUpdateError);
        // 계속 진행 (치명적이지 않음)
      } else {
        console.log('API tokens updated with deleted advertiser name');
      }
    }

    // 4. 감사 로그 저장
    const { error: logError } = await supabaseAdmin
      .from('user_deletion_log')
      .insert({
        deleted_user_id: user_id,
        deleted_user_email: userData.email,
        deleted_user_name: userData.name,
        advertiser_id: userData.advertiser_id,
        organization_id: userData.organization_id,
        new_advertiser_admin_id: new_owner_id || null,
        deletion_reason: isAdvertiserAdmin ? 'Brand owner with transfer' : 'Regular user deletion',
        data_snapshot: userData
      });

    if (logError) {
      console.warn('Failed to create deletion log:', logError);
      // 계속 진행 (치명적이지 않음)
    }

    // 5. auth.users에서 삭제
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete authentication record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth user deleted successfully');

    // 6. users 테이블에서 삭제 (CASCADE로 관련 데이터 자동 삭제)
    const { error: userDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user_id);

    if (userDeleteError) {
      console.error('Error deleting user record:', userDeleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${userData.email} deleted successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
        user_email: userData.email,
        ownership_transferred: isAdvertiserAdmin
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in delete-user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
