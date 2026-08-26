import { Calendar, ChevronDown, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { formatTanggalPanjang } from "../../utils/format";

export interface DateRangeValue {
  dari?: string;
  sampai?: string;
  preset?: string;
}

type PresetOption = 
  | "hariIni" 
  | "7hari" 
  | "bulanIni" 
  | "bulanLalu" 
  | "3bulan" 
  | "custom";

const PRESET_OPTIONS: { value: PresetOption; label: string }[] = [
  { value: "hariIni", label: "Hari Ini" },
  { value: "7hari", label: "7 Hari Terakhir" },
  { value: "bulanIni", label: "Bulan Ini" },
  { value: "bulanLalu", label: "Bulan Lalu" },
  { value: "3bulan", label: "3 Bulan Terakhir" },
  { value: "custom", label: "Rentang Custom" },
];

function computePresetRange(preset: PresetOption): { dari: string; sampai: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  switch (preset) {
    case "hariIni":
      return { dari: today, sampai: today };
    case "7hari": {
      const d = new Date(now);
      d.setDate(now.getDate() - 6);
      return { dari: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, sampai: today };
    }
    case "bulanIni":
      return { dari: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, sampai: today };
    case "bulanLalu": {
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        dari: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-01`,
        sampai: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
      };
    }
    case "3bulan": {
      const d = new Date(now);
      d.setMonth(now.getMonth() - 2);
      return { dari: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, sampai: today };
    }
    default:
      return { dari: "", sampai: "" };
  }
}

function formatDisplay(dari?: string, sampai?: string): string {
  if (!dari && !sampai) return "Pilih rentang waktu";
  if (dari && sampai) {
    const d1 = new Date(dari);
    const d2 = new Date(sampai);
    if (d1.getTime() === d2.getTime()) return formatTanggalPanjang(dari);
    return `${d1.getDate()} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][d1.getMonth()]} – ${d2.getDate()} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][d2.getMonth()]} ${d2.getFullYear()}`;
  }
  if (dari) return `Dari ${formatTanggalPanjang(dari)}`;
  if (sampai) return `Sampai ${formatTanggalPanjang(sampai)}`;
  return "Pilih rentang waktu";
}

interface DateRangePickerProps {
  value: { dari?: string; sampai?: string; preset?: string };
  onChange: (value: { dari?: string; sampai?: string; preset?: string }) => void;
  disabled?: boolean;
}

export function DateRangePicker({ value, onChange, disabled = false }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customDari, setCustomDari] = useState(value.dari ?? "");
  const [customSampai, setCustomSampai] = useState(value.sampai ?? "");
  const [activePreset, setActivePreset] = useState<PresetOption | null>((value.preset as PresetOption) ?? null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePresetClick = (preset: "hariIni" | "7hari" | "bulanIni" | "bulanLalu" | "3bulan" | "custom") => {
    if (preset === "custom") {
      setActivePreset("custom");
      return;
    }
    const range = computePresetRange(preset);
    setActivePreset(preset);
    onChange({ ...range, preset });
    setOpen(false);
  };

  const handleCustomChange = () => {
    if (!customDari || !customSampai) return;
    if (customDari > customSampai) return;
    setActivePreset("custom");
    onChange({ dari: customDari, sampai: customSampai, preset: "custom" });
    setOpen(false);
  };

  const handleClear = () => {
    onChange({ dari: undefined, sampai: undefined, preset: undefined });
    setActivePreset(null);
    setCustomDari("");
    setCustomSampai("");
    setOpen(false);
  };

  const displayText = formatDisplay(value.dari, value.sampai);

  return (
    <div className="date-range-picker" ref={ref}>
      <button
        type="button"
        className={`date-range-trigger ${open ? "open" : ""}`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Calendar size={14} />
        <span>{displayText}</span>
        <ChevronDown size={14} />
        {(value.dari || value.sampai) && !disabled && (
          <button
            type="button"
            className="date-range-clear"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            aria-label="Hapus rentang"
          >
            <X size={12} />
          </button>
        )}
      </button>

      {open && !disabled && (
        <div className="date-range-dropdown" role="menu">
          <div className="date-range-presets">
            {PRESET_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`date-range-preset ${activePreset === p.value ? "active" : ""}`}
                onClick={() => handlePresetClick(p.value)}
                role="menuitem"
                disabled={disabled}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="date-range-custom">
            <div className="custom-inputs">
              <div className="custom-input">
                <label>Dari</label>
                <input
                  type="date"
                  value={customDari}
                  onChange={(e) => setCustomDari(e.target.value)}
                  max={customSampai || undefined}
                  disabled={disabled}
                />
              </div>
              <div className="custom-input">
                <label>Sampai</label>
                <input
                  type="date"
                  value={customSampai}
                  onChange={(e) => setCustomSampai(e.target.value)}
                  min={customDari || undefined}
                  disabled={disabled}
                />
              </div>
            </div>
            {customDari && customSampai && customDari > customSampai && (
              <p className="custom-error">Tanggal akhir harus setelah tanggal mulai</p>
            )}
            <div className="custom-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setOpen(false)}
                disabled={disabled}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCustomChange}
                disabled={disabled || !customDari || !customSampai || customDari > customSampai}
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




