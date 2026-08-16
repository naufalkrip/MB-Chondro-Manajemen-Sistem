import { useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Ringkasan data organisasi" },
  "/anggota": { title: "Data Anggota", subtitle: "Kelola anggota MB Chondro" },
  "/absensi": { title: "Absensi", subtitle: "Kelola kehadiran anggota MB Chondro" },
  "/keuangan": { title: "Keuangan MB Chondro", subtitle: "Kelola kas MB Chondro" },
  "/keuangan-media": { title: "Keuangan Media MB Chondro", subtitle: "Kelola kas Media MB Chondro" },
};

export function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const meta = TITLES[location.pathname] ?? { title: "MB CHONDRO", subtitle: "Sistem Manajemen Organisasi" };

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <Header title={meta.title} subtitle={meta.subtitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}