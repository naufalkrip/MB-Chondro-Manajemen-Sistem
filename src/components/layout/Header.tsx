import { Menu } from "lucide-react";
import { formatTanggalPanjang } from "../../utils/format";
import { useHeaderAction } from "../../contexts/HeaderActionContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const { action } = useHeaderAction();
  const today = formatTanggalPanjang(new Date().toISOString());
  return (
    <header className="header">
      <button className="btn-icon hamburger" onClick={onMenuClick} aria-label="Buka menu">
        <Menu size={22} />
      </button>
      <div className="header-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="header-right">
        {action && <div className="header-action">{action}</div>}
        <div className="header-date">
          <span className="header-date-label">Hari ini</span>
          <span className="header-date-value">{today}</span>
        </div>
      </div>
    </header>
  );
}