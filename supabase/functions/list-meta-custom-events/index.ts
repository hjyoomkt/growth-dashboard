import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// 특정 광고주(브랜드)의 Meta 광고 계정에서 최근 insights에 잡힌
// "맞춤전환(custom conversion)" action_type 목록을 조회한다.
// (Meta customconversions API는 빈 값을 주는 경우가 많아, 실제 insights actions에서 추출)

interface ListCustomEventsRequest {
  advertiser_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 드롭다운에 노출할 "전환성" action_type 판정
//  - 진짜 맞춤이벤트(trackCustom 기반): offsite_conversion.custom.<id>
//  - 주요 표준 전환(잠재고객/리드 캠페인 등 미래 대비): 대표형만 (omni_/onsite_web_/fb_pixel_ 중복 제외)
//  - 제외: 참여성, 대행사 _add_ 래퍼, 구매/회원가입(전용 버튼 존재)
const STANDARD_CONVERSIONS = new Set<string>([
  'lead',
  'onsite_conversion.lead_grouped',  // Meta 리드폼(인스턴트 폼)
  'add_to_cart',
  'initiate_checkout',
  'add_payment_info',
  'subscribe',
  'start_trial',
  'contact',
  'submit_application',
  'schedule',
  'search',
  'donate',
  'find_location',
  'add_to_wishlist',
]);

// action_type을 분류하고 드롭다운 라벨을 만든다.
// kind: 'custom'(소유 맞춤전환) | 'shared'(공유 맞춤전환 offsite_*_add_*) | 'standard'(표준전환) | null(제외)
function classify(actionType: string): { include: boolean; kind: string; label: string } {
  if (!actionType) return { include: false, kind: '', label: '' };
  // 1) 소유 맞춤전환: offsite_conversion.custom.<id> (라벨은 customconversions 이름으로 후처리)
  if (actionType.startsWith('offsite_conversion.custom.')) {
    return { include: true, kind: 'custom', label: '' };
  }
  // 2) 공유 맞춤전환: offsite_<기본이벤트>_add_<이름> (표준 offsite_conversion.* 제외)
  const m = actionType.match(/^offsite_(.+)_add_(.+)$/);
  if (m && !actionType.startsWith('offsite_conversion.')) {
    return { include: true, kind: 'shared', label: `${m[2]} · ${m[1]}` };
  }
  // 3) 주요 표준 전환 (대표형만)
  if (STANDARD_CONVERSIONS.has(actionType)) {
    return { include: true, kind: 'standard', label: actionType };
  }
  return { include: false, kind: '', label: '' };
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

    const body: ListCustomEventsRequest = await req.json();
    const { advertiser_id } = body;

    if (!advertiser_id) {
      return new Response(
        JSON.stringify({ error: 'Missing advertiser_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1) 광고주의 활성 Meta 연동 조회 (가장 최근 것)
    const { data: integration, error: intError } = await supabaseServiceRole
      .from('integrations')
      .select('id, legacy_account_id')
      .eq('advertiser_id', advertiser_id)
      .eq('platform', 'Meta Ads')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Meta 연동을 찾을 수 없습니다.', events: [] }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integration.legacy_account_id) {
      return new Response(
        JSON.stringify({ error: 'Meta 광고 계정 ID가 없습니다.', events: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2) 토큰 복호화
    const { data: accessToken, error: tokenError } = await supabaseServiceRole
      .rpc('get_decrypted_token', { p_api_token_id: integration.id, p_token_type: 'access_token' });

    if (tokenError || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Meta 액세스 토큰을 가져올 수 없습니다.', events: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3) API 버전
    const { data: platformConfig } = await supabaseServiceRole
      .from('platform_configs')
      .select('api_version')
      .eq('platform', 'Meta Ads')
      .single();
    const metaApiVersion = platformConfig?.api_version || 'v24.0';

    // 4) 최근 90일 insights actions 조회 (계정 레벨)
    const params = new URLSearchParams({
      fields: 'actions',
      level: 'account',
      date_preset: 'last_90d',
      access_token: accessToken,
    });
    const url = `https://graph.facebook.com/${metaApiVersion}/act_${integration.legacy_account_id}/insights?${params.toString()}`;

    const response = await fetch(url, { method: 'GET' });
    const result = await response.json();

    if (result.error) {
      return new Response(
        JSON.stringify({ error: `Meta API error: ${result.error.message}`, events: [] }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4-1) 소유 맞춤전환 이름 매핑 (offsite_conversion.custom.<id> → 이름)
    const nameMap: Record<string, string> = {};
    try {
      const ccParams = new URLSearchParams({ fields: 'id,name', limit: '200', access_token: accessToken });
      const ccUrl = `https://graph.facebook.com/${metaApiVersion}/act_${integration.legacy_account_id}/customconversions?${ccParams.toString()}`;
      const ccRes = await fetch(ccUrl, { method: 'GET' });
      const ccJson = await ccRes.json();
      for (const cc of (ccJson.data || [])) {
        if (cc.id && cc.name) nameMap[String(cc.id)] = cc.name;
      }
    } catch (_) { /* 이름 조회 실패는 무시 (id로 표시) */ }

    // 5) 선택 가능한 전환 action_type 추출 (3종: 소유 맞춤전환 / 공유 맞춤전환 / 표준전환)
    const eventMap: Record<string, { count: number; label: string; kind: string }> = {};
    for (const row of (result.data || [])) {
      for (const action of (row.actions || [])) {
        const c = classify(action.action_type);
        if (!c.include) continue;
        const v = parseFloat(action.value) || 0;
        if (!eventMap[action.action_type]) {
          let label = c.label;
          if (c.kind === 'custom') {
            const id = action.action_type.split('.').pop() || '';
            label = nameMap[id] || `맞춤전환 ${id}`;
          }
          eventMap[action.action_type] = { count: 0, label, kind: c.kind };
        }
        eventMap[action.action_type].count += v;
      }
    }

    const events = Object.entries(eventMap)
      .map(([action_type, v]) => ({ action_type, label: v.label, kind: v.kind, count: v.count }))
      .sort((a, b) => b.count - a.count);

    return new Response(
      JSON.stringify({ events }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error', events: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
