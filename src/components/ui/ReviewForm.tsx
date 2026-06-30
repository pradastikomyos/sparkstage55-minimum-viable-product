import { useState } from 'react';
import { StarRating } from './StarRating';

type ReviewFormProps = {
  productName: string;
  initialRating?: number;
  initialBody?: string;
  isSubmitting: boolean;
  error?: string | null;
  onSubmit: (data: { rating: number; body: string }) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function ReviewForm({
  productName,
  initialRating = 0,
  initialBody = '',
  isSubmitting,
  error: externalError,
  onSubmit,
  onCancel,
  submitLabel = 'Kirim Ulasan',
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (rating < 1) {
      setError('Pilih minimal 1 bintang');
      return;
    }
    setError(null);
    onSubmit({ rating, body: body.trim() });
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px 0' }}>
        Ulasan untuk: {productName}
      </p>

      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: '#757575', margin: '0 0 4px 0' }}>
          Rating
        </p>
        <StarRating mode="interactive" rating={rating} onChange={setRating} size={22} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: '#757575', margin: '0 0 4px 0' }}>
          Ulasan (opsional)
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Bagikan pengalaman Anda dengan produk ini..."
          rows={4}
          maxLength={2000}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: 13,
            border: '1px solid #d0d0d0',
            borderRadius: 0,
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {(error || externalError) && (
        <p style={{ fontSize: 12, color: '#a00', margin: '0 0 8px 0' }}>
          {error || externalError}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          style={{
            padding: '10px 24px',
            background: '#000',
            color: '#fff',
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'Mengirim...' : submitLabel}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              padding: '10px 24px',
              background: 'transparent',
              color: '#000',
              border: '1px solid #d0d0d0',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
        )}
      </div>
    </div>
  );
}
