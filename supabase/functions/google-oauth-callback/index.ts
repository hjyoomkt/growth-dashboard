// google-oauth-callback Edge Function
// Google OAuth2 Callback 처리 및 Refresh Token 저장

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // client_id와 client_secret를 state로 전달받음

    if (!code) {
      return new Response(
        htmlResponse('인증 실패', 'Authorization code가 없습니다.'),
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // state에서 client_id와 client_secret 파싱
    let clientId, clientSecret;
    try {
      const stateData = JSON.parse(decodeURIComponent(state || '{}'));
      clientId = stateData.client_id;
      clientSecret = stateData.client_secret;
    } catch (e) {
      return new Response(
        htmlResponse('인증 실패', 'State 파라미터가 올바르지 않습니다.'),
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    if (!clientId || !clientSecret) {
      return new Response(
        htmlResponse('인증 실패', 'Client ID 또는 Client Secret이 없습니다.'),
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Redirect URI 생성
    const redirectUri = `${url.origin}/functions/v1/google-oauth-callback`;

    // Token Exchange
    const tokenPayload = new URLSearchParams({
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenPayload.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange error:', errorText);
      return new Response(
        htmlResponse('토큰 발급 실패', `Google에서 토큰을 발급받지 못했습니다: ${errorText}`),
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;
    const accessToken = tokenData.access_token;

    if (!refreshToken) {
      return new Response(
        htmlResponse('Refresh Token 없음', 'Google에서 Refresh Token을 발급하지 않았습니다. 다시 시도해주세요.'),
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // 성공 HTML with postMessage
    return new Response(
      htmlSuccessWithPostMessage(refreshToken, accessToken),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      htmlResponse('오류 발생', error instanceof Error ? error.message : '알 수 없는 오류'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
});

function htmlResponse(title: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
        .container { max-width: 500px; margin: 0 auto; }
        h1 { color: #333; }
        p { color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <p>${message}</p>
        <button onclick="window.close()">창 닫기</button>
      </div>
    </body>
    </html>
  `;
}

function htmlSuccessWithPostMessage(refreshToken: string, accessToken: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>인증 성공</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
        .container { max-width: 500px; margin: 0 auto; }
        h1 { color: #4CAF50; }
        p { color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✓ 인증 성공!</h1>
        <p>Refresh Token이 발급되었습니다. 창이 자동으로 닫힙니다...</p>
      </div>
      <script>
        // 부모 창에 Refresh Token 전달
        if (window.opener) {
          window.opener.postMessage({
            refreshToken: '${refreshToken}',
            accessToken: '${accessToken}'
          }, '*');
        }
        // 3초 후 창 닫기
        setTimeout(() => {
          window.close();
        }, 3000);
      </script>
    </body>
    </html>
  `;
}
