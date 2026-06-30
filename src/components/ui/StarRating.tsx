type StarRatingProps =
  | {
      mode: 'display';
      rating: number;
      size?: number;
    }
  | {
      mode: 'interactive';
      rating: number;
      onChange: (rating: number) => void;
      size?: number;
    };

export function StarRating(props: StarRatingProps) {
  const { mode, rating, size = 18 } = props;

  if (mode === 'interactive') {
    const { onChange } = props;
    return (
      <div
        role="radiogroup"
        aria-label="Rating bintang"
        style={{ display: 'flex', gap: 4, cursor: 'pointer' }}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= rating;
          return (
            <span
              key={star}
              role="radio"
              aria-checked={filled}
              aria-label={`${star} bintang`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onChange(star);
                }
              }}
              onClick={() => onChange(star)}
              style={{ display: 'inline-flex', lineHeight: 0 }}
            >
              <StarIcon filled={filled} size={size} />
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      aria-label={`Rating ${rating} dari 5 bintang`}
      style={{ display: 'flex', gap: 2 }}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rating;
        return (
          <span key={star} style={{ display: 'inline-flex', lineHeight: 0 }}>
            <StarIcon filled={filled} size={size} />
          </span>
        );
      })}
    </div>
  );
}

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#000' : 'none'}
      stroke="#000"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
