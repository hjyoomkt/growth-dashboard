import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface DeleteUserRequest {
  user_id: string;
  new_owner_id?: string | null;
}

// 역할 계층 구조
const roleHierarchy: Record<string, number> = {
  master: 10,
  agency_admin: 7,
  agency_manager: 6,
  agency_staff: 5,
  advertiser_admin: 4,
  advertiser_staff: 3,
  viewer: 2,
  editor: 1,
};

async function canDeleteUser(
  supabaseAdmin: any,
  adminUserId: string,
  targetUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // 본인 삭제는 항상 허용
  if (adminUserId === targetUserId) {
    return { allowed: true };
  }

  // 관리자 정보 조회
  const { data: admin, error: adminError } = await supabaseAdmin
    .from('users')
    .select('role, organization_id, advertiser_id')
    .eq('id', adminUserId)
    .single();

  if (adminError || !admin) {
    return { allowed: false, reason: 'Admin user not found' };
  }

  // 대상 사용자 정보 조회
  const { data: target, error: targetError } = await supabaseAdmin
    .from('users')
    .select('role, organization_id, advertiser_id')
    .eq('id', targetUserId)
    .single();

  if (targetError || !target) {
    return { allowed: false, reason: 'Target user not found' };
  }

  // Master는 다른 Master를 제외한 모든 사용자 삭제 가능
  if (admin.role === 'master') {
    if (target.role === 'master') {
      return { allowed: false, reason: 'Cannot delete another master account' };
    }
    return { allowed: true };
  }

  // agency_admin은 자신보다 낮은 권한의 사용자만 삭제 가능
  if (admin.role === 'agency_admin') {
    const adminLevel = roleHierarchy[admin.role] || 0;
    const targetLevel = roleHierarchy[target.role] || 0;

    if (targetLevel >= adminLevel) {
      return { allowed: false, reason: 'Cannot delete user with equal or higher role' };
    }
    return { allowed: true };
  }

  // 그 외 역할은 다른 사용자 삭제 불가
  return { allowed: false, reason: 'Insufficient permissions' };
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

    // 본인 삭제 또는 권한 있는 관리자만 가능
    const authCheck = await canDeleteUser(supabaseAdmin, currentUser.id, user_id);

    if (!authCheck.allowed) {
      return new Response(
        JSON.stringify({ error: authCheck.reason || 'Unauthorized to delete this user' }),
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
        deleted_by_user_id: currentUser.id,
        advertiser_id: userData.advertiser_id,
        organization_id: userData.organization_id,
        new_advertiser_admin_id: new_owner_id || null,
        deletion_reason: currentUser.id === user_id
          ? 'Self-deletion'
          : 'Admin-initiated deletion',
        data_snapshot: userData
      });

    if (logError) {
      console.warn('Failed to create deletion log:', logError);
      // 계속 진행 (치명적이지 않음)
    }

    // 5. 이메일 익명화 (재가입 가능하도록 원본 이메일 해제)
    const anonymizedEmail = `deleted-${user_id}@deleted.local`;
    console.log(`Anonymizing emails: ${userData.email} -> ${anonymizedEmail}`);

    // 5-1. users 테이블 이메일 익명화
    const { error: usersUpdateError } = await supabaseAdmin
      .from('users')
      .update({ email: anonymizedEmail })
      .eq('id', user_id);

    if (usersUpdateError) {
      console.error('Failed to anonymize users table email:', usersUpdateError);
      // 계속 진행
    } else {
      console.log('✅ Users table email anonymized');
    }

    // 5-2. auth.users 이메일 익명화
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { email: anonymizedEmail }
    );

    if (authUpdateError) {
      console.error('Failed to anonymize auth email:', authUpdateError);
      // 계속 진행
    } else {
      console.log('✅ Auth email anonymized');
    }

    // 6. auth.users에서 삭제
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete authentication record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Auth user deleted successfully');

    // 7. users 테이블에서 삭제 (CASCADE로 관련 데이터 자동 삭제)
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
