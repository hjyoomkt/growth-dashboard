import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { refresh_token, integration_id } = await req.json();

    if (!refresh_token || !integration_id) {
      throw new Error('refresh_token and integration_id are required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Integration에서 advertiser_id 조회
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('advertiser_id')
      .eq('id', integration_id)
      .single();

    if (integrationError) {
      throw new Error(`Integration not found: ${integrationError.message}`);
    }

    // 2. 조직 GCP 설정 조회
    const { data: gcpSettings, error: gcpError } = await supabase.rpc('get_organization_gcp_settings', {
      p_advertiser_id: integration.advertiser_id,
    });

    if (gcpError || !gcpSettings) {
      throw new Error(`GCP settings not found: ${gcpError?.message || 'No settings'}`);
    }

    const { client_id, client_secret, developer_token } = gcpSettings;

    if (!client_id || !client_secret || !developer_token) {
      throw new Error('GCP settings incomplete');
    }

    // 3. Refresh Token으로 Access Token 갱신
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: client_id,
        client_secret: client_secret,
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json();
      throw new Error(`Token refresh failed: ${tokenError.error_description || tokenError.error}`);
    }

    const { access_token } = await tokenResponse.json();

    // 4. Google Ads API 호출 - Accessible Customers
    const adsResponse = await fetch(
      `https://googleads.googleapis.com/v17/customers:listAccessibleCustomers`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'developer-token': developer_token,
        },
      }
    );

    if (!adsResponse.ok) {
      const adsError = await adsResponse.json();
      throw new Error(`Google Ads API error: ${adsError.error?.message || 'Unknown error'}`);
    }

    const { resourceNames } = await adsResponse.json();

    if (!resourceNames || resourceNames.length === 0) {
      return new Response(
        JSON.stringify({ customer_accounts: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerIds = resourceNames.map((name: string) => name.split('/')[1]);

    // 5. 각 고객 계정 상세 정보 조회
    const customerAccounts = [];

    for (const customerId of customerIds) {
      try {
        const detailResponse = await fetch(
          `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'developer-token': developer_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `SELECT customer.id, customer.descriptive_name FROM customer WHERE customer.id = ${customerId}`,
            }),
          }
        );

        if (detailResponse.ok) {
          const { results } = await detailResponse.json();
          if (results && results.length > 0) {
            customerAccounts.push({
              id: results[0].customer.id,
              descriptive_name: results[0].customer.descriptiveName || `Customer ${customerId}`,
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching customer ${customerId}:`, error);
        // 개별 고객 조회 실패 시 계속 진행
      }
    }

    return new Response(
      JSON.stringify({ customer_accounts: customerAccounts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
