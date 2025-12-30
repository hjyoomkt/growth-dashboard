/**
 * 데이터 수집 상태 체크 유틸리티
 *
 * 오전 10시를 기준으로 전일(D-1) 데이터의 수집 상태를 판별합니다.
 *
 * TODO: Supabase Edge Function으로 마이그레이션 필요
 * - Supabase의 pg_cron을 사용하여 매일 오전 10시에 자동 실행
 * - 또는 Supabase Edge Function + Cron Job 서비스(예: GitHub Actions, Vercel Cron)
 * - 실제 데이터베이스에서 전일자 데이터 존재 여부 확인
 * - api_tokens 테이블의 dataCollectionStatus 필드 업데이트
 */

/**
 * 현재 시각이 오전 10시 이후인지 확인
 * @returns {boolean} 오전 10시 이후면 true
 */
export const isAfter10AM = () => {
  const now = new Date();
  return now.getHours() >= 10;
};

/**
 * 전일 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns {string} 전일 날짜 (예: "2024-12-29")
 */
export const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

/**
 * 전일자 데이터 수집 상태 체크
 *
 * @param {string} advertiserId - 광고주 ID
 * @param {string} platform - 플랫폼 이름 (예: "Google Ads", "Meta Ads")
 * @returns {Promise<string>} 'success' | 'error' | 'pending'
 *
 * TODO: Supabase 연동 시 구현 내용
 * 1. Supabase에서 해당 광고주의 전일자 데이터 조회
 *    - SELECT * FROM ad_performance
 *      WHERE advertiser_id = ?
 *      AND platform = ?
 *      AND date = ?
 *
 * 2. 데이터 존재 여부에 따라 상태 반환
 *    - 데이터 있음: 'success'
 *    - 데이터 없음 & 오전 10시 이후: 'error'
 *    - 데이터 없음 & 오전 10시 이전: 'pending'
 *
 * 3. api_tokens 테이블 업데이트
 *    - UPDATE api_tokens
 *      SET data_collection_status = ?, last_check_time = NOW()
 *      WHERE advertiser_id = ? AND platform = ?
 */
export const checkYesterdayData = async (advertiserId, platform) => {
  const yesterday = getYesterdayDate();
  const isAfter10 = isAfter10AM();

  // TODO: Supabase 연동
  // const { data, error } = await supabase
  //   .from('ad_performance')
  //   .select('*')
  //   .eq('advertiser_id', advertiserId)
  //   .eq('platform', platform)
  //   .eq('date', yesterday)
  //   .limit(1);

  // if (error) {
  //   console.error('Data check error:', error);
  //   return 'error';
  // }

  // if (data && data.length > 0) {
  //   return 'success';
  // }

  // 오전 10시 이전이면 pending, 이후면 error
  // return isAfter10 ? 'error' : 'pending';

  // Mock 구현: 현재는 랜덤으로 상태 반환
  console.log(`[Mock] Checking data for ${advertiserId} - ${platform} on ${yesterday}`);
  console.log(`[Mock] Current time check: ${isAfter10 ? 'After 10 AM' : 'Before 10 AM'}`);

  // 실제 구현에서는 위의 주석 처리된 Supabase 코드를 사용
  return isAfter10 ? 'error' : 'pending';
};

/**
 * 여러 API 토큰의 데이터 수집 상태를 일괄 체크
 *
 * @param {Array} tokens - API 토큰 배열
 * @returns {Promise<Array>} 상태가 업데이트된 토큰 배열
 *
 * TODO: Supabase Edge Function으로 구현
 * - 매일 오전 10시에 pg_cron 또는 외부 cron job으로 실행
 * - 모든 활성 API 토큰에 대해 전일자 데이터 체크
 * - 결과를 api_tokens 테이블에 일괄 업데이트
 */
export const checkAllTokensData = async (tokens) => {
  const updatedTokens = await Promise.all(
    tokens.map(async (token) => {
      if (token.status !== 'active') {
        return token;
      }

      const dataCollectionStatus = await checkYesterdayData(
        token.advertiserId,
        token.platform
      );

      return {
        ...token,
        dataCollectionStatus,
        lastChecked: new Date().toISOString(),
      };
    })
  );

  return updatedTokens;
};

/**
 * Supabase Edge Function 구현 예시 (참고용)
 *
 * 파일 위치: supabase/functions/check-yesterday-data/index.ts
 *
 * import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
 * import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 *
 * serve(async (req) => {
 *   const supabase = createClient(
 *     Deno.env.get('SUPABASE_URL') ?? '',
 *     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
 *   )
 *
 *   const now = new Date()
 *   const isAfter10AM = now.getHours() >= 10
 *
 *   if (!isAfter10AM) {
 *     return new Response(JSON.stringify({ message: 'Not yet 10 AM' }), {
 *       headers: { 'Content-Type': 'application/json' },
 *     })
 *   }
 *
 *   // 전일 날짜 계산
 *   const yesterday = new Date(now)
 *   yesterday.setDate(yesterday.getDate() - 1)
 *   const yesterdayStr = yesterday.toISOString().split('T')[0]
 *
 *   // 모든 활성 API 토큰 조회
 *   const { data: tokens } = await supabase
 *     .from('api_tokens')
 *     .select('*')
 *     .eq('status', 'active')
 *
 *   // 각 토큰별로 전일자 데이터 체크
 *   for (const token of tokens) {
 *     const { data: adData } = await supabase
 *       .from('ad_performance')
 *       .select('id')
 *       .eq('advertiser_id', token.advertiser_id)
 *       .eq('platform', token.platform)
 *       .eq('date', yesterdayStr)
 *       .limit(1)
 *
 *     const status = adData && adData.length > 0 ? 'success' : 'error'
 *
 *     // 상태 업데이트
 *     await supabase
 *       .from('api_tokens')
 *       .update({
 *         data_collection_status: status,
 *         last_check_time: now.toISOString()
 *       })
 *       .eq('id', token.id)
 *   }
 *
 *   return new Response(JSON.stringify({ success: true }), {
 *     headers: { 'Content-Type': 'application/json' },
 *   })
 * })
 *
 * Cron 설정:
 * - GitHub Actions: .github/workflows/daily-data-check.yml
 * - Vercel Cron: vercel.json의 crons 설정
 * - 매일 오전 10시(KST)에 Edge Function 호출
 */
