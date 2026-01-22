import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface ResetEmailRequest {
  email: string;
  redirectTo: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve({
  // JWT 검증 비활성화 (비로그인 사용자도 접근 가능)
  onListen: () => console.log('Password reset email function started'),
}, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, redirectTo }: ResetEmailRequest = await req.json();

    if (!email || !redirectTo) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service Role Key를 사용하여 Admin Client 생성
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. 사용자 존재 여부 확인
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Failed to list users:', listError);
      // 보안상 성공으로 응답
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      // 보안상 성공으로 응답 (이메일 존재 여부 노출 방지)
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. 비밀번호 재설정 링크 생성
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (linkError) {
      console.error('Failed to generate reset link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate reset link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Resend API를 통한 이메일 발송
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // URL 파싱: action_link에서 토큰 추출 후 redirectTo와 결합
    const actionLink = linkData.properties.action_link;
    const url = new URL(actionLink);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');

    // redirectTo URL에 토큰과 타입을 hash로 추가
    const resetUrl = `${redirectTo}#access_token=${token}&type=${type}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a;">비밀번호 재설정</h1>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.5; color: #4a4a4a;">
                비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정하세요.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px;">
                <tr>
                  <td style="border-radius: 6px; background-color: #4F46E5;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      비밀번호 재설정
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:
              </p>
              <p style="margin: 0; padding: 12px; background-color: #f9fafb; border-radius: 4px; font-size: 13px; color: #4b5563; word-break: break-all;">
                ${resetUrl}
              </p>
              <div style="margin: 30px 0 0; padding: 15px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 500;">
                  ⚠️ 이 링크는 1시간 후에 만료됩니다.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.<br>
                계정 보안에 문제가 있다고 생각되시면 즉시 관리자에게 문의하세요.
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
        to: email,
        subject: '비밀번호 재설정 요청',
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('Resend API error:', errorData);
      throw new Error(`Resend API failed: ${JSON.stringify(errorData)}`);
    }

    const resendData = await resendResponse.json();
    console.log('Password reset email sent successfully via Resend:', resendData);

    return new Response(
      JSON.stringify({ success: true, data: resendData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
