import type { ProductReview, ProductReviewSummary } from '../../types/commerce';
import { ReviewCard } from './ReviewCard';
import { StarRating } from './StarRating';

type ReviewListProps = {
  reviews: ProductReview[];
  summary: ProductReviewSummary;
  isLoading: boolean;
};

export function ReviewList({ reviews, summary, isLoading }: ReviewListProps) {
  if (isLoading) {
    return (
      <div style={{ padding: '24px 0' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div className="skeleton" style={{ width: 80, height: 14, marginBottom: 8, background: '#eee', borderRadius: 4 }} />
            <div className="skeleton" style={{ width: 120, height: 12, marginBottom: 4, background: '#eee', borderRadius: 4 }} />
            <div className="skeleton" style={{ width: '60%', height: 12, background: '#eee', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {summary.review_count > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 28, fontWeight: 300 }}>{summary.avg_rating.toFixed(1)}</span>
          <StarRating mode="display" rating={Math.round(summary.avg_rating)} size={16} />
          <span style={{ fontSize: 13, color: '#757575' }}>
            ({summary.review_count} ulasan)
          </span>
        </div>
      )}

      {reviews.length === 0 ? (
        <p style={{ fontSize: 13, color: '#757575' }}>
          Belum ada ulasan. Jadilah yang pertama memberikan ulasan!
        </p>
      ) : (
        reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))
      )}
    </div>
  );
}
