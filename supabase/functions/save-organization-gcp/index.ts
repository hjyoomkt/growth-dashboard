import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface SaveGcpRequest {
  organization_id: string;
  client_id?: string;
  client_secret?: string;
  developer_token?: string;
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

    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['master', 'agency_admin'].includes(userData.role)) {
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SaveGcpRequest = await req.json();
    const { organization_id, client_id, client_secret, developer_token } = body;

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing organization_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (userData.role === 'agency_admin' && userData.organization_id !== organization_id) {
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 평문 컬럼에 저장 (RLS로 보호됨)
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (client_id && client_id.trim()) {
      updateData.google_client_id_encrypted = client_id.trim();
    }
    if (client_secret && client_secret.trim()) {
      updateData.google_client_secret_encrypted = client_secret.trim();
    }
    if (developer_token && developer_token.trim()) {
      updateData.google_developer_token_encrypted = developer_token.trim();
    }

    const { error: updateError } = await supabaseServiceRole
      .from('organizations')
      .update(updateData)
      .eq('id', organization_id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to save GCP credentials: ' + updateError.message);
    }

    return new Response(
      JSON.stringify({ success: true }),
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
