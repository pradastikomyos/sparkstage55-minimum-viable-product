import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type CheckoutItemInput = {
  product_id: string;
  variant_id?: string;
  quantity: number;
};

type CheckoutRequest = {
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: CheckoutItemInput[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeUnknownError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) return { message: error.message, name: error.name, stack: error.stack };
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    return {
      message: typeof value.message === 'string' ? value.message : fallbackMessage,
      code: value.code,
      details: value.details,
      hint: value.hint,
      phase: value.phase,
    };
  }
  return { message: typeof error === 'string' ? error : fallbackMessage };
}

function logPaymentEvent(level: 'info' | 'error', event: string, fields: Record<string, unknown>) {
  console[level](JSON.stringify({ service: 'create-doku-checkout', event, ...fields }));
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

  if (error) throw { phase: 'authenticate_user', ...error };
  if (!data.user) return null;
  return data.user.id;
}

async function recordFailedCheckout(
  supabase: SupabaseClient<any, 'public', any>,
  orderId: string,
  totalAmount: number,
  dokuJson: Record<string, unknown>,
) {
  // Run all cleanup operations even if one fails, then surface every failure.
  const [attemptResult, releaseResult, orderResult] = await Promise.all([
    supabase.from('payment_attempts').insert({
      order_id: orderId,
      request_id: extractDokuResponseRequestId(dokuJson),
      status: 'failed',
      amount_idr: totalAmount,
      raw_payload: dokuJson,
    }),
    supabase.rpc('release_inventory_reservations_for_order', { target_order_id: orderId }),
    supabase.from('orders')
      .update({ status: 'cancelled', payment_status: 'failed' })
      .eq('id', orderId),
  ]);

  const failures = [
    ['record_failed_payment_attempt', attemptResult.error],
    ['release_inventory_reservations', releaseResult.error],
    ['mark_order_cancelled', orderResult.error],
  ].filter((entry) => entry[1]);

  if (failures.length) {
    throw {
      phase: 'failed_checkout_cleanup',
      message: 'One or more failed-checkout cleanup operations failed',
      details: failures.map(([phase, error]) => ({ phase, error })),
    };
  }
}

function makeInvoiceNumber() {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  return `INV${Date.now()}${suffix}`.slice(0, 30);
}

function nestedRecord(parent: Record<string, unknown>, key: string) {
  const value = parent[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function extractDokuResponseRequestId(payload: Record<string, unknown>) {
  const response = nestedRecord(payload, 'response');
  const headers = nestedRecord(response, 'headers');
  return (headers.request_id ?? headers.requestId ?? null) as string | null;
}

async function digestBody(body: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function hmacSignature(component: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(component));
  return `HMACSHA256=${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
}

async function dokuHeaders(body: string, requestTarget: string) {
  const clientId = requiredEnv('DOKU_CLIENT_ID');
  const secretKey = requiredEnv('DOKU_SECRET_KEY');
  const requestId = crypto.randomUUID();
  const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const digest = await digestBody(body);
  const component = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${requestTimestamp}`,
    `Request-Target:${requestTarget}`,
    `Digest:${digest}`,
  ].join('\n');

    return {
      'Client-Id': clientId,
      'Request-Id': requestId,
      'Request-Timestamp': requestTimestamp,
      Signature: await hmacSignature(component, secretKey),
  };
}

Deno.serve(async (req) => {
  const startedAt = performance.now();
  const correlationId = crypto.randomUUID();
  let invoiceNumber: string | null = null;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const dokuBaseUrl = Deno.env.get('DOKU_BASE_URL') ?? 'https://api-sandbox.doku.com';
    const siteUrl = Deno.env.get('SITE_URL') ?? req.headers.get('origin') ?? 'http://localhost:5173';
    const overrideNotificationUrl = Deno.env.get('DOKU_NOTIFICATION_URL');

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const userId = await getAuthenticatedUserId(req, supabaseUrl, serviceRoleKey);
    const payload = (await req.json()) as CheckoutRequest;

    if (!userId) {
      return jsonResponse({ error: 'You must be logged in before checkout' }, 401);
    }

    if (!payload.customer?.name?.trim()) {
      return jsonResponse({ error: 'Customer name is required' }, 400);
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return jsonResponse({ error: 'At least one checkout item is required' }, 400);
    }

    const normalizedItems = payload.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
    }));

    if (normalizedItems.some((item) => !item.product_id || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      return jsonResponse({ error: 'Invalid checkout item payload' }, 400);
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.product_id))];
    const variantIds = [...new Set(normalizedItems.map((item) => item.variant_id).filter(Boolean))] as string[];

    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, sku, base_price_idr, status')
      .in('id', productIds);

    if (productError) throw productError;

    const { data: variants, error: variantError } = variantIds.length
      ? await supabase
        .from('product_variants')
        .select('id, product_id, name, sku, price_idr, stock_quantity')
        .in('id', variantIds)
      : { data: [], error: null };

    if (variantError) throw variantError;

    const productMap = new Map((products ?? []).map((product) => [product.id, product]));
    const variantMap = new Map((variants ?? []).map((variant) => [variant.id, variant]));

    const lineItems = normalizedItems.map((item) => {
      const product = productMap.get(item.product_id);
      if (!product || product.status !== 'active') throw new Error('Product is not available');

      const variant = item.variant_id ? variantMap.get(item.variant_id) : undefined;
      if (item.variant_id && !variant) throw new Error('Variant is not available');
      if (variant && variant.stock_quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);

      const unitPrice = variant?.price_idr ?? product.base_price_idr;
      const sku = variant?.sku ?? product.sku;
      const name = variant ? `${product.name} - ${variant.name}` : product.name;

      return {
        product_id: product.id,
        variant_id: variant?.id ?? null,
        product_name: name,
        sku,
        quantity: item.quantity,
        unit_price_idr: unitPrice,
        line_total_idr: unitPrice * item.quantity,
      };
    });

    const totalAmount = lineItems.reduce((sum, item) => sum + item.line_total_idr, 0);
    invoiceNumber = makeInvoiceNumber();

    const { data: order, error: orderError } = await supabase
      .rpc('create_pending_doku_order', {
        requester_id: userId,
        target_invoice_number: invoiceNumber,
        customer_name: payload.customer.name.trim(),
        customer_email: payload.customer.email?.trim() || null,
        customer_phone: payload.customer.phone?.trim() || null,
        line_items: lineItems,
        total_amount_idr: totalAmount,
      })
      .single();

    if (orderError) throw { phase: 'create_pending_order', ...orderError };
    const orderId = (order as { order_id?: string } | null)?.order_id;
    if (!orderId) throw new Error('Order creation did not return an order id');

    logPaymentEvent('info', 'order_reserved', {
      correlation_id: correlationId,
      invoice_number: invoiceNumber,
      order_id: orderId,
      amount_idr: totalAmount,
    });

    const dokuRequestTarget = '/checkout/v1/payment';
    const dokuBody = JSON.stringify({
      order: {
        amount: totalAmount,
        invoice_number: invoiceNumber,
        currency: 'IDR',
        callback_url: `${siteUrl}/checkout-result?invoice=${encodeURIComponent(invoiceNumber)}`,
        callback_url_result: `${siteUrl}/checkout-result?invoice=${encodeURIComponent(invoiceNumber)}`,
        auto_redirect: true,
        line_items: lineItems.map((item) => ({
          id: item.sku,
          name: item.product_name,
          price: item.unit_price_idr,
          quantity: item.quantity,
          sku: item.sku,
          category: 'fashion',
        })),
      },
      payment: {
        payment_due_date: 60,
      },
      customer: {
        name: payload.customer.name.trim(),
        ...(payload.customer.email?.trim() ? { email: payload.customer.email.trim() } : {}),
        ...(payload.customer.phone?.trim() ? { phone: payload.customer.phone.trim() } : {}),
      },
      additional_info: {
        override_notification_url: overrideNotificationUrl,
      },
    });

    const requestHeaders = await dokuHeaders(dokuBody, dokuRequestTarget);
    const dokuRequestId = requestHeaders['Request-Id'];
    const dokuResponse = await fetch(`${dokuBaseUrl}${dokuRequestTarget}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...requestHeaders,
      },
      body: dokuBody,
    });

    const rawDokuResponse = await dokuResponse.text();
    let dokuJson: Record<string, unknown>;
    try {
      dokuJson = JSON.parse(rawDokuResponse) as Record<string, unknown>;
    } catch {
      dokuJson = { raw: rawDokuResponse };
    }

    if (!dokuResponse.ok) {
      await recordFailedCheckout(supabase, orderId, totalAmount, dokuJson);
      logPaymentEvent('error', 'provider_checkout_failed', {
        correlation_id: correlationId,
        invoice_number: invoiceNumber,
        order_id: orderId,
        request_id: dokuRequestId,
        response_request_id: extractDokuResponseRequestId(dokuJson),
        http_status: dokuResponse.status,
        duration_ms: Math.round(performance.now() - startedAt),
      });
      return jsonResponse({ error: 'DOKU checkout creation failed', detail: dokuJson }, 502);
    }

    const dokuResponseBody = nestedRecord(dokuJson, 'response');
    const paymentUrl = nestedRecord(dokuResponseBody, 'payment').url;
    const sessionId = nestedRecord(dokuResponseBody, 'order').session_id;

    if (!paymentUrl) {
      await recordFailedCheckout(supabase, orderId, totalAmount, dokuJson);
      logPaymentEvent('error', 'provider_payment_url_missing', {
        correlation_id: correlationId,
        invoice_number: invoiceNumber,
        order_id: orderId,
        request_id: dokuRequestId,
        response_request_id: extractDokuResponseRequestId(dokuJson),
        duration_ms: Math.round(performance.now() - startedAt),
      });
      return jsonResponse({ error: 'DOKU did not return payment URL', detail: dokuJson }, 502);
    }

    const { error: attemptError } = await supabase.from('payment_attempts').insert({
      order_id: orderId,
      provider_reference: sessionId ?? null,
      request_id: extractDokuResponseRequestId(dokuJson),
      status: 'pending',
      amount_idr: totalAmount,
      raw_payload: dokuJson,
    });
    if (attemptError) throw { phase: 'record_payment_attempt', ...attemptError };

    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        doku_payment_url: paymentUrl,
        doku_session_id: sessionId ?? null,
      })
      .eq('id', orderId);
    if (updateOrderError) throw { phase: 'save_doku_session', ...updateOrderError };

    logPaymentEvent('info', 'provider_checkout_created', {
      correlation_id: correlationId,
      invoice_number: invoiceNumber,
      order_id: orderId,
      request_id: dokuRequestId,
      response_request_id: extractDokuResponseRequestId(dokuJson),
      provider_reference: sessionId ?? null,
      duration_ms: Math.round(performance.now() - startedAt),
    });

    return jsonResponse({
      order_id: orderId,
      invoice_number: invoiceNumber,
      payment_url: paymentUrl,
      amount_idr: totalAmount,
    });
  } catch (error) {
    const normalizedError = normalizeUnknownError(error, 'Unexpected checkout error');
    logPaymentEvent('error', 'unhandled_error', {
      correlation_id: correlationId,
      invoice_number: invoiceNumber,
      error: normalizedError,
      duration_ms: Math.round(performance.now() - startedAt),
    });
    return jsonResponse({ error: normalizedError.message, detail: normalizedError }, 500);
  }
});
