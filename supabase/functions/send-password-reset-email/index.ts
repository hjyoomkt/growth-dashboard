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
      options: {
        redirectTo: redirectTo,  // redirectTo를 options에 포함
      },
    });

    if (linkError) {
      console.error('Failed to generate reset link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate reset link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 디버그: 생성된 링크 데이터 확인
    console.log(`[DEBUG] action_link: ${linkData.properties.action_link}`);
    console.log(`[DEBUG] hashed_token: ${linkData.properties.hashed_token}`);

    // 3. Resend API를 통한 이메일 발송
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // action_link를 그대로 사용 (Supabase가 토큰 검증 및 세션 생성 후 redirect)
    const actionLink = linkData.properties.action_link;
    const resetUrl = actionLink;  // action_link를 그대로 사용!

    console.log(`[DEBUG] Using action_link directly: ${resetUrl}`);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
    <!-- 로고 영역 -->
    <tr>
      <td style="padding: 50px 40px 40px; background-color: #2d3748;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">
          ZestDot<span style="color: #4F46E5;">.</span>
        </h1>
      </td>
    </tr>

    <!-- 메인 컨텐츠 -->
    <tr>
      <td style="padding: 60px 40px;">
        <h2 style="margin: 0 0 30px; font-size: 26px; font-weight: 600; color: #1a202c; text-align: center; line-height: 1.4;">
          비밀번호 재설정
        </h2>
        <p style="margin: 0 0 30px; font-size: 15px; color: #4a5568; text-align: center; line-height: 1.6;">
          비밀번호 재설정 요청을 받았습니다.<br>
          아래 버튼을 클릭하여 새 비밀번호를 설정하세요.
        </p>

        <!-- 재설정 버튼 -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px;">
          <tr>
            <td align="center">
              <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 18px 60px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #2d3748; text-decoration: none; border-radius: 50px; text-align: center; transition: background-color 0.2s;">
                비밀번호 재설정
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 10px; font-size: 13px; color: #718096; text-align: center;">
          버튼이 작동하지 않으면 <a href="${resetUrl}" style="color: #4F46E5; text-decoration: none;">여기</a>를 클릭하세요
        </p>

        <p style="margin: 0 0 5px; font-size: 13px; color: #718096; text-align: center;">
          <span style="display: inline-block; width: 16px; height: 16px; line-height: 16px; text-align: center; border: 1.5px solid #cbd5e0; border-radius: 50%; font-size: 11px; color: #718096; margin-right: 4px;">i</span>
          재설정 링크는 1시간 이내 완료해주세요.
        </p>
      </td>
    </tr>

    <!-- 하단 링크 영역 -->
    <tr>
      <td style="padding: 40px; background-color: #fafafa; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 13px; color: #718096; text-align: center; line-height: 1.5;">
          비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.<br>
          계정 보안에 문제가 있다고 생각되시면 즉시 관리자에게 문의하세요.
        </p>
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
        subject: '제스트닷 비밀번호 재설정 요청',
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
