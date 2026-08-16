interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  max?: string;
}

export function DatePicker({ value, onChange, label, max }: DatePickerProps) {
  return (
    <div className="date-picker">
      {label && <label className="filter-label">{label}</label>}
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label ?? "Tanggal"}
      />
    </div>
  );
}