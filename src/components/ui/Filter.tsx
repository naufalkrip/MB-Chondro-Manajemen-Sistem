interface SelectOption {
  value: string;
  label: string;
}

interface FilterProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  allLabel?: string;
}

export function Filter({ label, value, onChange, options, allLabel = "Semua" }: FilterProps) {
  return (
    <div className="filter">
      {label && <label className="filter-label">{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label ?? "Filter"}>
        <option value="">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}