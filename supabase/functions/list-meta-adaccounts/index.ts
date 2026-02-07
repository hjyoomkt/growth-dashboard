import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface ListAdAccountsRequest {
  organization_id: string;
  access_token?: string;  // 조직 토큰 또는 사용자 입력 토큰
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

    const body: ListAdAccountsRequest = await req.json();
    const { organization_id, access_token } = body;

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing organization_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service Role로 조직 메타 토큰 조회
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let metaAccessToken = access_token;

    // access_token이 없으면 조직 설정에서 가져오기
    if (!metaAccessToken) {
      const { data: metaCredentials, error: metaError } = await supabaseServiceRole
        .rpc('get_organization_meta_credentials', { org_id: organization_id });

      if (metaError || !metaCredentials || metaCredentials.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Meta credentials not found for organization' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const credentials = Array.isArray(metaCredentials) ? metaCredentials[0] : metaCredentials;
      metaAccessToken = credentials.access_token;
    }

    if (!metaAccessToken) {
      return new Response(
        JSON.stringify({ error: 'Meta Access Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Meta API 버전 조회
    const { data: platformConfig } = await supabaseServiceRole
      .from('platform_configs')
      .select('api_version')
      .eq('platform', 'Meta Ads')
      .single();
    const metaApiVersion = platformConfig?.api_version || 'v24.0';

    // Meta Graph API 호출
    const url = `https://graph.facebook.com/${metaApiVersion}/me/adaccounts?fields=name,account_id,account_status&access_token=${metaAccessToken}`;

    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Meta API error:', errorText);
      throw new Error(`Meta API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(`Meta API error: ${result.error.message}`);
    }

    const adAccounts = result.data || [];

    // 상태 코드 매핑
    const statusMap: Record<number, string> = {
      1: '활성',
      2: '비활성',
      3: '심사중',
      7: '지불기한 경과',
      9: '삭제됨'
    };

    // 응답 형식 변환
    const accounts = adAccounts.map((acc: any) => ({
      id: `act_${acc.account_id}`,
      account_id: acc.account_id,
      name: acc.name,
      status: statusMap[acc.account_status] || '기타',
      displayName: `${acc.name} (act_${acc.account_id})`
    }));

    return new Response(
      JSON.stringify({ accounts }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
