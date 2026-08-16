import { NavLink } from "react-router-dom";
import {
  ClipboardCheck,
  LayoutDashboard,
  Users,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import logo from "../../aset/logo.png";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/anggota", label: "Anggota", icon: Users },
  { to: "/absensi", label: "Absensi", icon: ClipboardCheck },
  { to: "/keuangan", label: "Keuangan", icon: Wallet },
  { to: "/keuangan-media", label: "Keuangan Media", icon: WalletCards },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`} aria-label="Menu samping">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <img src={logo} alt="Logo MB Chondro" />
          </div>
          <div className="brand-text">
            <strong>MB CHONDRO</strong>
            <span>Manajemen Organisasi</span>
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Tutup menu">
            <X size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "nav-active" : ""}`}
              onClick={onClose}
            >
              <item.icon size={19} strokeWidth={2} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>© {new Date().getFullYear()} MB Chondro</span>
        </div>
      </aside>
    </>
  );
}