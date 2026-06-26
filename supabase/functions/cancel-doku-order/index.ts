import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get('Authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function getAuthenticatedUserId(req: Request, supabaseUrl: string, serviceRoleKey: string) {
  const token = getBearerToken(req);
  if (!token || token === Deno.env.get('SUPABASE_ANON_KEY')) return null;

  const authClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) return null;
  return data.user.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const userId = await getAuthenticatedUserId(req, supabaseUrl, serviceRoleKey);
    const payload = await req.json().catch(() => ({}));
    const invoiceNumber = String(payload.invoice_number ?? '').trim();

    if (!userId) {
      return jsonResponse({ error: 'You must be logged in' }, 401);
    }

    if (!invoiceNumber) {
      return jsonResponse({ error: 'Invoice number is required' }, 400);
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, payment_status')
      .eq('invoice_number', invoiceNumber)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    if (order.user_id !== userId) {
      return jsonResponse({ error: 'Unauthorized' }, 403);
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'cancelled',
      })
      .eq('id', order.id)
      .eq('status', 'pending_payment')
      .neq('payment_status', 'paid')
      .select('id')
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updatedOrder) {
      return jsonResponse({
        ok: false,
        error: 'Order sudah berubah status (kemungkinan sudah dibayar atau dibatalkan). Silakan cek status pembayaran.',
      }, 409);
    }

    const { error: releaseError } = await supabase.rpc(
      'release_inventory_reservations_for_order',
      { target_order_id: order.id },
    );
    if (releaseError) throw releaseError;

    const { error: attemptError } = await supabase
      .from('payment_attempts')
      .update({ status: 'cancelled' })
      .eq('order_id', order.id)
      .eq('status', 'pending');
    if (attemptError) throw attemptError;

    return jsonResponse({
      ok: true,
      message: 'Order cancelled and inventory released',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected cancel error';
    return jsonResponse({ error: message }, 500);
  }
});
