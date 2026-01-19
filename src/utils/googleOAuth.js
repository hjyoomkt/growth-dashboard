// Google OAuth2 인증 URL 생성 유틸리티
// LEGACY: 이 함수는 더 이상 사용되지 않습니다.
// 현재는 oauth-initiate Edge Function을 통해 OAuth URL을 생성합니다.
// 참고: src/views/superadmin/api-management/components/APITokenTable.js의 handleGoogleOAuthConnect()

export const generateGoogleOAuthUrl = (clientId, clientSecret, redirectUri) => {
  // state 파라미터에 client_id와 client_secret 포함 (콜백에서 사용)
  const state = encodeURIComponent(
    JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret
    })
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    access_type: 'offline', // Refresh Token 받기 위해 필수
    prompt: 'consent',       // 항상 동의 화면 표시 (Refresh Token 재발급용)
    state: state
  });

  return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
};
