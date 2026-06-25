type ReportFiltersProps = {
  period: 'today' | '7d' | '30d' | 'this_month' | 'custom';
  onChangePeriod: (p: ReportFiltersProps['period']) => void;
  customStart: string;
  customEnd: string;
  onChangeCustomStart: (v: string) => void;
  onChangeCustomEnd: (v: string) => void;
};

const PERIODS: { value: ReportFiltersProps['period']; label: string }[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: '7d', label: '7 Hari' },
  { value: '30d', label: '30 Hari' },
  { value: 'this_month', label: 'Bulan Ini' },
  { value: 'custom', label: 'Custom' },
];

export function ReportFilters({
  period,
  onChangePeriod,
  customStart,
  customEnd,
  onChangeCustomStart,
  onChangeCustomEnd,
}: ReportFiltersProps) {
  return (
    <div className="admin-reports-section">
      <div className="admin-filters">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`admin-btn admin-btn--ghost${period === p.value ? ' is-active' : ''}`}
            onClick={() => onChangePeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="admin-filters-custom">
          <label className="admin-filters-date-label">
            Dari
            <input
              type="date"
              className="admin-input admin-input--sm"
              value={customStart}
              onChange={(e) => onChangeCustomStart(e.target.value)}
            />
          </label>
          <label className="admin-filters-date-label">
            Sampai
            <input
              type="date"
              className="admin-input admin-input--sm"
              value={customEnd}
              onChange={(e) => onChangeCustomEnd(e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
