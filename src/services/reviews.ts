import { requireSupabaseClient } from '../lib/supabase';
import type { ProductReview, ProductReviewSummary, ReviewFormInput, ReviewStatus } from '../types/commerce';

export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('product_reviews')
    .select(`
      id,
      product_id,
      order_item_id,
      user_id,
      rating,
      body,
      status,
      created_at,
      updated_at,
      reviewer_name:profiles!user_id(full_name)
    `)
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const reviewerNameRaw = (row as { reviewer_name?: { full_name?: string } | null }).reviewer_name;
    return {
      id: row.id as string,
      product_id: row.product_id as string,
      order_item_id: row.order_item_id as string,
      user_id: row.user_id as string,
      rating: row.rating as number,
      body: (row.body as string) ?? null,
      status: row.status as ReviewStatus,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string | undefined,
      reviewer_name: reviewerNameRaw?.full_name ?? null,
    };
  });
}

export async function getProductReviewSummary(productId: string): Promise<ProductReviewSummary> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('product_review_summary')
    .select('avg_rating, review_count')
    .eq('product_id', productId)
    .maybeSingle();

  if (error) throw error;
  return data ?? { avg_rating: 0, review_count: 0 };
}

export async function submitReview(input: {
  order_item_id: string;
  product_id: string;
  rating: number;
  body?: string;
}): Promise<void> {
  const client = requireSupabaseClient();

  if (input.rating < 1 || input.rating > 5) {
    throw new Error('Rating harus antara 1 dan 5');
  }

  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('LOGIN_REQUIRED');

  const { error } = await client.from('product_reviews').insert({
    product_id: input.product_id,
    order_item_id: input.order_item_id,
    user_id: user.id,
    rating: input.rating,
    body: input.body?.trim() || null,
  });

  if (error) throw error;
}

export async function getMyReviewForOrderItem(orderItemId: string): Promise<ProductReview | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('product_reviews')
    .select(`
      id,
      product_id,
      order_item_id,
      user_id,
      rating,
      body,
      status,
      created_at,
      updated_at,
      reviewer_name:profiles!user_id(full_name)
    `)
    .eq('order_item_id', orderItemId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const reviewerNameRaw = (row as { reviewer_name?: { full_name?: string } | null }).reviewer_name;
  return {
    id: row.id as string,
    product_id: row.product_id as string,
    order_item_id: row.order_item_id as string,
    user_id: row.user_id as string,
    rating: row.rating as number,
    body: (row.body as string) ?? null,
    status: row.status as ReviewStatus,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string | undefined,
    reviewer_name: reviewerNameRaw?.full_name ?? null,
  };
}

export async function getMyReviewsForOrderItems(orderItemIds: string[]): Promise<Record<string, ProductReview>> {
  if (orderItemIds.length === 0) return {};

  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('product_reviews')
    .select(`
      id,
      product_id,
      order_item_id,
      user_id,
      rating,
      body,
      status,
      created_at,
      updated_at,
      reviewer_name:profiles!user_id(full_name)
    `)
    .in('order_item_id', orderItemIds);

  if (error) throw error;

  const results: Record<string, ProductReview> = {};
  for (const row of (data ?? [])) {
    const r = row as Record<string, unknown>;
    const reviewerNameRaw = (r as { reviewer_name?: { full_name?: string } | null }).reviewer_name;
    results[r.order_item_id as string] = {
      id: r.id as string,
      product_id: r.product_id as string,
      order_item_id: r.order_item_id as string,
      user_id: r.user_id as string,
      rating: r.rating as number,
      body: (r.body as string) ?? null,
      status: r.status as ReviewStatus,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string | undefined,
      reviewer_name: reviewerNameRaw?.full_name ?? null,
    };
  }

  return results;
}

export async function updateMyReview(reviewId: string, input: ReviewFormInput): Promise<void> {
  const client = requireSupabaseClient();

  if (input.rating < 1 || input.rating > 5) {
    throw new Error('Rating harus antara 1 dan 5');
  }

  const { error } = await client
    .from('product_reviews')
    .update({
      rating: input.rating,
      body: input.body?.trim() || null,
    })
    .eq('id', reviewId);

  if (error) throw error;
}

export async function listPendingReviews(): Promise<ProductReview[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('product_reviews')
    .select(`
      id,
      product_id,
      order_item_id,
      user_id,
      rating,
      body,
      status,
      created_at,
      updated_at,
      reviewer_name:profiles!user_id(full_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const reviewerNameRaw = (row as { reviewer_name?: { full_name?: string } | null }).reviewer_name;
    return {
      id: row.id as string,
      product_id: row.product_id as string,
      order_item_id: row.order_item_id as string,
      user_id: row.user_id as string,
      rating: row.rating as number,
      body: (row.body as string) ?? null,
      status: row.status as ReviewStatus,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string | undefined,
      reviewer_name: reviewerNameRaw?.full_name ?? null,
    };
  });
}

export async function updateReviewStatus(reviewId: string, status: ReviewStatus): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('product_reviews')
    .update({ status })
    .eq('id', reviewId);

  if (error) throw error;
}
