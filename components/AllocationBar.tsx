type AllocationBarProps = {
  label: string;
  valueEur: number;
  totalEur: number;
  detail?: string;
};

function formatEur(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AllocationBar({
  label,
  valueEur,
  totalEur,
  detail,
}: AllocationBarProps) {
  const percentage =
    totalEur > 0
      ? (valueEur / totalEur) * 100
      : 0;

  const safePercentage = Math.min(
    Math.max(percentage, 0),
    100,
  );

  return (
    <div className="allocation-item">
      <div className="allocation-heading">
        <div>
          <strong>{label}</strong>

          {detail && (
            <small className="cell-subtitle">
              {detail}
            </small>
          )}
        </div>

        <div className="allocation-values">
          <strong>
            {percentage.toFixed(1)}%
          </strong>

          <small>
            {formatEur(valueEur)}
          </small>
        </div>
      </div>

      <div
        className="allocation-track"
        aria-label={`${label}: ${percentage.toFixed(
          1,
        )}%`}
      >
        <div
          className="allocation-fill"
          style={{
            width: `${safePercentage}%`,
          }}
        />
      </div>
    </div>
  );
}