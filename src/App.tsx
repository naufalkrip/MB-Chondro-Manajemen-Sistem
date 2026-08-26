import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Anggota } from "./pages/Anggota";
import { Absensi } from "./pages/Absensi";
import { KeuanganChondro } from "./pages/KeuanganChondro";
import { KeuanganMedia } from "./pages/KeuanganMedia";
import { Transaksi } from "./pages/Transaksi";
import { TransaksiDetailPage } from "./pages/TransaksiDetail";
import { Rekrutmen } from "./pages/Rekrutmen";
import { RekrutmenDaftar } from "./pages/RekrutmenDaftar";
import { PublicForm } from "./components/rekrutmen/PublicForm";
import { NotFound } from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      {/* Standalone Public Recruitment Form (No Admin Sidebar/Header) */}
      <Route path="/rekrutmen/form" element={<PublicForm />} />
      <Route path="/rekrutmen/form/:id" element={<PublicForm />} />

      {/* Internal Admin Management Routes */}
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/anggota" element={<Anggota />} />
              <Route path="/absensi" element={<Absensi />} />
              <Route path="/keuangan" element={<KeuanganChondro />} />
              <Route path="/keuangan-media" element={<KeuanganMedia />} />
              <Route path="/transaksi" element={<Transaksi />} />
              <Route path="/transaksi/:id" element={<TransaksiDetailPage />} />
              <Route path="/rekrutmen" element={<Rekrutmen />} />
              <Route path="/rekrutmen/daftar" element={<RekrutmenDaftar />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}