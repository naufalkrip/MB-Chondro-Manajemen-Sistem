import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Anggota } from "./pages/Anggota";
import { Absensi } from "./pages/Absensi";
import { KeuanganChondro } from "./pages/KeuanganChondro";
import { KeuanganMedia } from "./pages/KeuanganMedia";
import { NotFound } from "./pages/NotFound";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/anggota" element={<Anggota />} />
        <Route path="/absensi" element={<Absensi />} />
        <Route path="/keuangan" element={<KeuanganChondro />} />
        <Route path="/keuangan-media" element={<KeuanganMedia />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}