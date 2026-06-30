import type { ProductReview } from '../../types/commerce';
import { StarRating } from './StarRating';

const formatter = new Intl.DateTimeFormat('id-ID', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

type ReviewCardProps = {
  review: ProductReview;
};

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div style={{
      padding: '16px 0',
      borderBottom: '1px solid #f0f0f0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <StarRating mode="display" rating={review.rating} size={14} />
        <span style={{
          fontSize: 12,
          color: '#757575',
        }}>
          {formatter.format(new Date(review.created_at))}
        </span>
      </div>
      <p style={{
        fontSize: 13,
        fontWeight: 600,
        margin: '0 0 2px 0',
        color: '#333',
      }}>
        {review.reviewer_name || 'Anonim'}
      </p>
      {review.body && (
        <p style={{
          fontSize: 13,
          margin: '4px 0 0 0',
          color: '#555',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}>
          {review.body}
        </p>
      )}
    </div>
  );
}
