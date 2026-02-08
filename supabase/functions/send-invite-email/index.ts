import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface InviteEmailRequest {
  inviteCode: string;
  invitedEmail: string;
  inviteType: 'new_organization' | 'new_brand' | 'existing_member';
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

    console.log('Authenticated user:', user.email);

    const { inviteCode, invitedEmail, inviteType }: InviteEmailRequest = await req.json();

    if (!inviteCode || !invitedEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 회원가입 링크 생성
    const appUrl = Deno.env.get('APP_URL') || 'https://zestdot.com';
    const signupUrl = `${appUrl}/auth/sign-up?code=${inviteCode}`;

    // Resend API를 통한 이메일 발송
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
          이메일 주소 인증 메일
        </h2>

        <p style="margin: 0 0 10px; font-size: 15px; color: #4a5568; text-align: center; line-height: 1.6;">
          안녕하세요. ${invitedEmail}님
        </p>
        <p style="margin: 0 0 30px; font-size: 15px; color: #4a5568; text-align: center; line-height: 1.6;">
          제스트닷 서비스 이용을 위해 이메일 주소 인증을 요청하셨습니다.<br>
          아래 버튼을 클릭하여 회원가입을 완료하세요.
        </p>
        <!-- 인증 버튼 -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 40px;">
          <tr>
            <td align="center">
              <a href="${signupUrl}" target="_blank" style="display: inline-block; padding: 18px 60px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #2d3748; text-decoration: none; border-radius: 50px; text-align: center; transition: background-color 0.2s;">
                이메일 주소를 인증합니다
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 5px; font-size: 13px; color: #718096; text-align: center;">
          <span style="display: inline-block; width: 16px; height: 16px; line-height: 16px; text-align: center; border: 1.5px solid #cbd5e0; border-radius: 50%; font-size: 11px; color: #718096; margin-right: 4px;">i</span>
          인증메일은 1시간 이내 완료해주세요.
        </p>
      </td>
    </tr>

    <!-- 하단 링크 영역 -->
    <tr>
      <td style="padding: 40px; background-color: #fafafa; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 15px; font-size: 13px; color: #718096; text-align: center; line-height: 1.5;">
          버튼이 정상적으로 클릭되지 않는다면, 아래 링크를 복사하여 접속해 주세요.
        </p>
        <div style="padding: 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px;">
          <p style="margin: 0; font-size: 12px; color: #4a5568; word-break: break-all; line-height: 1.6;">
            ${signupUrl}
          </p>
        </div>
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
        from: 'ZestDot <invite@zestdot.com>',
        to: invitedEmail,
        subject: '제스트닷 대시보드 초대장',
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('Resend API error:', errorData);
      throw new Error(`Resend API failed: ${JSON.stringify(errorData)}`);
    }

    const resendData = await resendResponse.json();
    console.log('Invite email sent successfully via Resend:', resendData);

    return new Response(
      JSON.stringify({ success: true, data: resendData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending invite email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
