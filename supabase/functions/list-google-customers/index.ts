import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { integration_id } = await req.json();

    if (!integration_id) {
      return new Response(
        JSON.stringify({ error: 'integration_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. 사용자 인증 확인
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Integration 조회 (RLS 적용으로 권한 검증)
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('id, platform, advertiser_id, legacy_client_id, legacy_manager_account_id, advertisers(organization_id)')
      .eq('id', integration_id)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (integration.platform !== 'Google Ads') {
      return new Response(
        JSON.stringify({ error: 'Only Google Ads integrations are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Refresh Token 복호화 (Service Role 사용)
    const { data: refreshToken, error: tokenError } = await supabaseServiceRole.rpc(
      'get_decrypted_token',
      {
        p_api_token_id: integration_id,
        p_token_type: 'oauth_refresh_token',
      }
    );

    if (tokenError || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve refresh token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // 5. Integration에서 Client ID 및 Client Secret 복호화
    const clientId = integration.legacy_client_id;

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Client ID not found in integration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client Secret 복호화
    const { data: clientSecret, error: clientSecretError } = await supabaseServiceRole.rpc(
      'get_decrypted_token',
      {
        p_api_token_id: integration_id,
        p_token_type: 'client_secret'
      }
    );

    if (clientSecretError || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve client secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Developer Token 조회 (organization에서)
    const organizationId = integration.advertisers?.organization_id;
    let developerToken = null;

    if (organizationId) {
      const { data: gcpCredentials } = await supabaseServiceRole.rpc(
        'get_organization_gcp_credentials',
        { org_id: organizationId }
      );

      if (gcpCredentials && gcpCredentials.length > 0) {
        developerToken = gcpCredentials[0].developer_token;
      }
    }

    if (!developerToken) {
      return new Response(
        JSON.stringify({ error: 'Developer token not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Refresh Token으로 Access Token 발급
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to refresh access token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to refresh access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token } = await tokenResponse.json();

    // MCC ID 추출
    const managerAccountId = integration.legacy_manager_account_id;

    // 8. Google Ads API: 접근 가능한 Customer 목록 조회
    const listHeaders: any = {
      'Authorization': `Bearer ${access_token}`,
      'developer-token': developerToken,
    };

    if (managerAccountId) {
      listHeaders['login-customer-id'] = managerAccountId;
    }

    const listResponse = await fetch(
      'https://googleads.googleapis.com/v22/customers:listAccessibleCustomers',
      {
        headers: listHeaders,
      }
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('Failed to list accessible customers:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to list Google Ads customers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resourceNames } = await listResponse.json();

    if (!resourceNames || resourceNames.length === 0) {
      return new Response(
        JSON.stringify({ customers: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. 각 Customer의 상세 정보 조회
    const customers = await Promise.all(
      resourceNames.map(async (resourceName: string) => {
        const customerId = resourceName.split('/')[1];

        const query = `
          SELECT
            customer.id,
            customer.descriptive_name,
            customer.manager
          FROM customer
          WHERE customer.id = ${customerId}
        `;

        const detailHeaders: any = {
          'Authorization': `Bearer ${access_token}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        };

        if (managerAccountId) {
          detailHeaders['login-customer-id'] = managerAccountId;
        }

        const detailResponse = await fetch(
          `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:searchStream`,
          {
            method: 'POST',
            headers: detailHeaders,
            body: JSON.stringify({ query }),
          }
        );

        if (!detailResponse.ok) {
          console.warn(`Failed to fetch details for customer ${customerId}`);
          return {
            id: customerId,
            name: customerId,
            isManager: false,
          };
        }

        const responseText = await detailResponse.text();
        const allResults = parseGoogleAdsResponse(responseText);
        const result = allResults[0]?.customer;

        return {
          id: customerId,
          name: result?.descriptiveName || customerId,
          isManager: result?.manager || false,
        };
      })
    );

    return new Response(
      JSON.stringify({ customers }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in list-google-customers:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Parse Google Ads searchStream response
 * Handles both standard JSON arrays and newline-delimited JSON
 * @param responseText - Raw response text from searchStream API
 * @returns Array of result objects
 */
function parseGoogleAdsResponse(responseText: string): any[] {
  let allResults: any[] = [];

  try {
    // 완전한 JSON 배열로 파싱 시도
    const jsonArray = JSON.parse(responseText);
    if (Array.isArray(jsonArray)) {
      // 배열 형식: [{"results": [...]}, {"results": [...]}]
      for (const item of jsonArray) {
        if (item.results && Array.isArray(item.results)) {
          allResults = allResults.concat(item.results);
        }
      }
    } else if (jsonArray.results && Array.isArray(jsonArray.results)) {
      // 단일 객체 형식: {"results": [...]}
      allResults = jsonArray.results;
    }
  } catch {
    // Fallback: newline-delimited JSON 파싱
    const lines = responseText.trim().split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.results && Array.isArray(json.results)) {
          allResults = allResults.concat(json.results);
        }
      } catch {
        // 개별 라인 파싱 실패 무시
      }
    }
  }

  return allResults;
}
