import { formatAngka } from "../../utils/format";

interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
}

export function CurrencyInput({ value, onChange, label, placeholder = "0" }: CurrencyInputProps) {
  const display = value === "" || value === null || value === undefined
    ? ""
    : formatAngka(String(value));

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    if (digits === "") {
      onChange(0);
      return;
    }
    onChange(parseInt(digits, 10));
  };

  return (
    <div className="currency-input">
      {label && <label className="filter-label">{label}</label>}
      <div className="currency-input-wrap">
        <span className="currency-prefix">Rp</span>
        <input
          inputMode="numeric"
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label ?? "Nominal (Rupiah)"}
        />
      </div>
    </div>
  );
}