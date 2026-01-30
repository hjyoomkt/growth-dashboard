// ============================================================================
// Zest Analytics - 이벤트 수집 Edge Function
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// 이벤트 페이로드 타입
interface ZAEventPayload {
  tracking_id: string;
  event_type: 'purchase' | 'signup' | 'lead' | 'add_to_cart' | 'custom' | 'pageview';
  event_name?: string;
  value?: number;
  currency?: string;
  order_id?: string;

  // 어트리뷰션 정보
  clicked_at?: string;
  days_since_click?: number;
  attribution_window?: number;
  is_attributed?: boolean;

  // UTM 파라미터
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;

  // 페이지 정보
  page_url?: string;
  page_referrer?: string;

  // 디바이스 정보
  device_type?: string;
  browser?: string;
  os?: string;

  // 커스텀 데이터
  custom_data?: Record<string, any>;
}

serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // POST만 허용
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Supabase 클라이언트 (서비스 롤 - RLS 우회)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 페이로드 파싱
    const payload: ZAEventPayload = await req.json();

    console.log('[ZA] Received event:', {
      tracking_id: payload.tracking_id,
      event_type: payload.event_type,
      value: payload.value,
    });

    // 1. tracking_id 검증
    if (!payload.tracking_id || !payload.tracking_id.match(/^ZA-\d{8}$/)) {
      console.error('[ZA] Invalid tracking_id format:', payload.tracking_id);
      return new Response(
        JSON.stringify({ error: 'Invalid tracking_id format. Expected: ZA-XXXXXXXX' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. event_type 검증
    const validEventTypes = ['purchase', 'signup', 'lead', 'add_to_cart', 'custom', 'pageview'];
    if (!validEventTypes.includes(payload.event_type)) {
      console.error('[ZA] Invalid event_type:', payload.event_type);
      return new Response(
        JSON.stringify({
          error: 'Invalid event_type',
          valid_types: validEventTypes,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. custom 이벤트 검증
    if (payload.event_type === 'custom' && !payload.event_name) {
      return new Response(
        JSON.stringify({ error: 'event_name required for custom events' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. tracking_id로 advertiser_id 조회
    const { data: trackingCode, error: trackingError } = await supabaseAdmin
      .from('za_tracking_codes')
      .select('advertiser_id, status')
      .eq('tracking_id', payload.tracking_id)
      .is('deleted_at', null)
      .single();

    if (trackingError || !trackingCode) {
      console.error('[ZA] Tracking code not found:', payload.tracking_id, trackingError);
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive tracking_id' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. 비활성 상태 체크
    if (trackingCode.status !== 'active') {
      console.warn('[ZA] Inactive tracking code:', payload.tracking_id);
      return new Response(
        JSON.stringify({ error: 'Tracking code is inactive' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. IP 주소 추출 (선택적)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('x-real-ip') ||
               null;

    // 7. 이벤트 저장
    const eventData = {
      tracking_id: payload.tracking_id,
      advertiser_id: trackingCode.advertiser_id,
      event_type: payload.event_type,
      event_name: payload.event_name || null,
      value: payload.value || null,
      currency: payload.currency || 'KRW',
      order_id: payload.order_id || null,

      // 어트리뷰션 정보 (전환 이벤트만)
      clicked_at: payload.event_type !== 'pageview' ? payload.clicked_at : null,
      days_since_click: payload.event_type !== 'pageview' ? payload.days_since_click : null,
      attribution_window: payload.event_type !== 'pageview' ? payload.attribution_window : null,
      is_attributed: payload.event_type !== 'pageview' ? (payload.is_attributed ?? true) : null,

      // UTM 파라미터 (전환 이벤트만)
      utm_source: payload.event_type !== 'pageview' ? payload.utm_source : null,
      utm_medium: payload.event_type !== 'pageview' ? payload.utm_medium : null,
      utm_campaign: payload.event_type !== 'pageview' ? payload.utm_campaign : null,
      utm_term: payload.event_type !== 'pageview' ? payload.utm_term : null,
      utm_content: payload.event_type !== 'pageview' ? payload.utm_content : null,

      // 페이지 정보
      page_url: payload.page_url || null,
      page_referrer: payload.page_referrer || null,

      // 디바이스 정보 (전환 이벤트만)
      device_type: payload.event_type !== 'pageview' ? payload.device_type : null,
      browser: payload.event_type !== 'pageview' ? payload.browser : null,
      os: payload.event_type !== 'pageview' ? payload.os : null,

      // IP
      ip_address: ip,

      // 커스텀 데이터
      custom_data: payload.custom_data || {},
    };

    const { error: insertError } = await supabaseAdmin
      .from('za_events')
      .insert(eventData);

    if (insertError) {
      console.error('[ZA] Failed to insert event:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save event', details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[ZA] Event saved successfully:', {
      tracking_id: payload.tracking_id,
      event_type: payload.event_type,
      advertiser_id: trackingCode.advertiser_id,
      is_attributed: eventData.is_attributed,
      attribution_window: eventData.attribution_window,
    });

    // 성공 응답
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ZA] Error in za-collect-event:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
