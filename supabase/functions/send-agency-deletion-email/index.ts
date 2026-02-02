import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface SendAgencyDeletionEmailRequest {
  organization_id: string;
  organization_name: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 6자리 랜덤 코드 생성 (VERIFY-XXXXXX)
// 혼동하기 쉬운 문자 제외: 0(숫자), O(문자), I(문자), 1(숫자), L(문자)
function generateVerificationCode(): string {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let code = 'VERIFY-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organization_id, organization_name }: SendAgencyDeletionEmailRequest = await req.json();

    if (!organization_id || !organization_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organization_id, organization_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-agency-deletion-email] Request:', { organization_id, organization_name, user_id: user.id });

    // 1. 사용자 정보 및 권한 확인
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('[send-agency-deletion-email] User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // agency_admin이 아니면 거부
    if (userData.role !== 'agency_admin') {
      console.error('[send-agency-deletion-email] Forbidden: User is not agency_admin');
      return new Response(
        JSON.stringify({ error: 'Only agency_admin can delete agency' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 본인 조직이 아니면 거부
    if (userData.organization_id !== organization_id) {
      console.error('[send-agency-deletion-email] Forbidden: Not user\'s organization');
      return new Response(
        JSON.stringify({ error: 'Can only delete own organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-agency-deletion-email] ✓ Authorization passed');

    // 2. 확인 코드 생성
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10분 후 만료

    console.log('[send-agency-deletion-email] Generated code:', code, 'expires at:', expiresAt.toISOString());

    const { error: insertError } = await supabaseAdmin
      .from('agency_deletion_codes')
      .insert({
        organization_id: organization_id,
        user_id: user.id,
        code: code,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      console.error('[send-agency-deletion-email] Failed to create verification code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create verification code', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-agency-deletion-email] ✓ Verification code saved');

    // 3. 이메일 발송 (Resend API)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #dc2626;">⚠️ 에이전시 삭제 확인 코드</h1>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #4a4a4a;">
                <strong>${organization_name}</strong> 에이전시 삭제 요청이 접수되었습니다.
              </p>
              <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">
                  경고: 이 작업은 되돌릴 수 없습니다
                </p>
                <p style="margin: 8px 0 0; font-size: 14px; color: #991b1b;">
                  소속된 모든 브랜드, 사용자, 데이터가 영구 삭제됩니다.
                </p>
              </div>
              <p style="margin: 0 0 10px; font-size: 16px; color: #1f2937; font-weight: 600;">
                확인 코드:
              </p>
              <div style="background-color: #f9fafb; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #4F46E5; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                  ${code}
                </p>
              </div>
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                이 코드는 <strong>10분간</strong> 유효합니다.
              </p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                삭제를 진행하려면 위 코드를 입력하세요.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                이 이메일을 요청하지 않으셨다면 즉시 관리자에게 문의하세요.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ZestDot <noreply@zestdot.com>',
        to: userData.email,
        subject: `⚠️ ${organization_name} 에이전시 삭제 확인 코드`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('[send-agency-deletion-email] Resend API error:', errorData);
      throw new Error(`Resend API failed: ${JSON.stringify(errorData)}`);
    }

    const resendData = await resendResponse.json();
    console.log('[send-agency-deletion-email] ✓ Email sent:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent to email',
        expires_at: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-agency-deletion-email] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
