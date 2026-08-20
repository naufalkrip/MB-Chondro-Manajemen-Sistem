import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Absensi, Anggota, Transaksi } from "../types";
import {
  formatRupiah,
  formatTanggal,
  formatTanggalPanjang,
  hitungSaldo,
  hitungStatKehadiran,
  statusKeHuruf,
} from "../utils/format";
import logoUrl from "../aset/logo.png";

// ============================================================
// DESIGN SYSTEM PDF MB CHONDRO — "OFFICIAL ORGANIZATION REPORT"
// ============================================================
// Satu template global untuk SEMUA jenis laporan:
//   - Kertas F4 / Folio 215.9 × 330.2 mm (portrait / landscape otomatis)
//   - Font: Helvetica (Arial-equivalent), satu keluarga font untuk seluruh dokumen
//   - Kop resmi: logo + MB CHONDRO + SISTEM MANAJEMEN ORGANISASI
//   - Judul laporan, periode, tanggal cetak, summary, tabel, dan footer konsisten
//   - Header tabel diulang otomatis pada setiap halaman lanjutan
// ============================================================

const BURGUNDY: [number, number, number] = [127, 29, 29]; // maroon — identitas MB CHONDRO
const NAVY: [number, number, number] = [15, 23, 42]; // dark navy — teks utama
const BODY: [number, number, number] = [31, 41, 55]; // charcoal — isi tabel
const SLATE: [number, number, number] = [71, 85, 105]; // slate — teks sekunder
const MUTED: [number, number, number] = [100, 116, 139]; // muted — label / footer
const WHITE: [number, number, number] = [255, 255, 255];
const LINE: [number, number, number] = [226, 232, 240]; // light gray — border
const ROW_ALT: [number, number, number] = [248, 250, 252]; // baris berselang

const FONT = "helvetica"; // Arial-equivalent (metrik identik dengan Arial)

// F4 / Folio
const F4: [number, number] = [215.9, 330.2];

const MARGIN = 16;
const MARGIN_BOTTOM = 16;

const FONT_ORG = 20; // nama organisasi pada kop
const FONT_ORG_SUB = 10; // tagline organisasi
const FONT_TITLE = 19; // judul laporan
const FONT_SUBTITLE = 10.5; // deskripsi laporan
const FONT_META = 9.5; // periode & tanggal cetak
const FONT_TABLE = 9.5; // isi & header tabel
const FONT_FOOTER = 8.5;

// ---------- Simbol status kehadiran pada matriks rekap ----------
// Hadir ditampilkan sebagai titik agar tabel tidak ramai saat jumlah sesi banyak.
const SIMBOL_KEHADIRAN: Record<string, string> = {
  H: "•",
  I: "I",
  S: "S",
  C: "C",
  A: "A",
};

function simbolKehadiran(huruf: string): string {
  return SIMBOL_KEHADIRAN[huruf] ?? huruf;
}

// ---------- Logo (dipotong area transparan, proporsional, tanpa kotak putih) ----------

let logoCache: { dataUrl: string; w: number; h: number } | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat logo"));
    img.src = src;
  });
}

/**
 * Muat logo, buang area transparan di sekelilingnya, lalu jadikan JPEG.
 * Hasilnya logo tetap proporsional dan tidak muncul kotak putih di belakangnya.
 */
async function getLogo(): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (logoCache) return logoCache;
  try {
    const img = await loadImage(logoUrl);
    const maxDim = 900;
    const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 2);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    // Cari bounding box pixel non-transparan (buang margin transparan)
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) {
      logoCache = { dataUrl: canvas.toDataURL("image/jpeg", 0.92), w, h };
      return logoCache;
    }

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const crop = document.createElement("canvas");
    crop.width = cw;
    crop.height = ch;
    const cctx = crop.getContext("2d");
    if (!cctx) return null;
    cctx.fillStyle = "#ffffff";
    cctx.fillRect(0, 0, cw, ch);
    cctx.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
    logoCache = { dataUrl: crop.toDataURL("image/jpeg", 0.92), w: cw, h: ch };
    return logoCache;
  } catch {
    logoCache = null;
    return null;
  }
}

// ---------- Elemen kop ----------

function addTopBand(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BURGUNDY);
  doc.rect(0, 0, w, 3, "F");
}

function drawDoubleLine(doc: jsPDF, y: number) {
  const w = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...BURGUNDY);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, w - MARGIN, y);
  doc.setDrawColor(...SLATE);
  doc.setLineWidth(0.15);
  doc.line(MARGIN, y + 1.2, w - MARGIN, y + 1.2);
}

/** Header halaman pertama: logo + identitas organisasi + judul + periode + tanggal cetak */
async function drawFullHeader(doc: jsPDF, judul: string, subtitle: string, periode: string): Promise<number> {
  const w = doc.internal.pageSize.getWidth();
  const usable = w - MARGIN * 2;
  addTopBand(doc);

  // Logo proporsional — tinggi tetap, lebar mengikuti rasio asli (hasil crop)
  let textX = MARGIN;
  const logo = await getLogo();
  if (logo) {
    const logoH = 12;
    const logoW = (logoH * logo.w) / logo.h;
    try {
      doc.addImage(logo.dataUrl, "JPEG", MARGIN, 8, logoW, logoH);
      textX = MARGIN + logoW + 6;
    } catch {
      // abaikan jika logo gagal dirender
    }
  }

  doc.setFont(FONT, "bold");
  doc.setFontSize(FONT_ORG);
  doc.setTextColor(...BURGUNDY);
  doc.text("MB CHONDRO", textX, 16.5);

  doc.setFont(FONT, "bold");
  doc.setFontSize(FONT_ORG_SUB);
  doc.setTextColor(...NAVY);
  doc.text("SISTEM MANAJEMEN ORGANISASI", textX, 22.5);

  // Judul laporan — ukuran menyesuaikan agar tidak bertabrakan dengan periode
  const title = `LAPORAN ${judul.toUpperCase()}`;
  let titleSize = FONT_TITLE;
  doc.setFont(FONT, "bold");
  doc.setFontSize(titleSize);
  while (titleSize > 14 && doc.getTextWidth(title) > usable * 0.58) {
    titleSize -= 0.5;
    doc.setFontSize(titleSize);
  }
  doc.setTextColor(...NAVY);
  doc.text(title, MARGIN, 31.5);

  doc.setFont(FONT, "normal");
  doc.setFontSize(FONT_SUBTITLE);
  doc.setTextColor(...MUTED);
  doc.text(subtitle, MARGIN, 37.5);

  doc.setFontSize(FONT_META);
  doc.setTextColor(...SLATE);
  doc.text(`Periode: ${periode}`, w - MARGIN, 31.5, { align: "right" });
  doc.text(`Dicetak: ${formatTanggalPanjang(new Date().toISOString())}`, w - MARGIN, 37.5, { align: "right" });

  drawDoubleLine(doc, 42.5);

  return 46.5;
}

/** Header halaman lanjutan: ringkas, identitas singkat + garis pemisah */
function drawCompactHeader(doc: jsPDF) {
  addTopBand(doc);
  doc.setFont(FONT, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BURGUNDY);
  doc.text("MB CHONDRO — SISTEM MANAJEMEN ORGANISASI", MARGIN, 11.5);
  drawDoubleLine(doc, 14.5);
}

/** Footer: garis tipis + nama organisasi (kiri) + nomor halaman (kanan) */
function drawPageFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, h - MARGIN_BOTTOM, w - MARGIN, h - MARGIN_BOTTOM);
  doc.setFont(FONT, "normal");
  doc.setFontSize(FONT_FOOTER);
  doc.setTextColor(...MUTED);
  doc.text("MB CHONDRO — Sistem Manajemen Organisasi", MARGIN, h - MARGIN_BOTTOM + 5.5);
  doc.text(`Halaman ${pageNumber} dari ${totalPages}`, w - MARGIN, h - MARGIN_BOTTOM + 5.5, { align: "right" });
}

// ---------- Ringkasan (rekap di atas tabel) ----------

export interface SummaryItem {
  label: string;
  value: string;
}

/**
 * Ringkasan berupa grid rapi tanpa kotak/card: label kecil di atas, nilai tebal di bawah.
 * Semua kolom sama lebar sehingga benar-benar sejajar.
 */
function drawSummary(doc: jsPDF, items: SummaryItem[], startY: number): number {
  const w = doc.internal.pageSize.getWidth();
  const usable = w - MARGIN * 2;
  const minColW = 38;
  const perRow = Math.max(1, Math.min(items.length, Math.floor(usable / minColW)));
  const cellW = usable / perRow;
  const rows = Math.ceil(items.length / perRow);
  const rowH = 6.6;
  const labelSize = 8.5;
  const valueSize = 11;

  items.forEach((item, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = MARGIN + col * cellW;
    const y = startY + row * rowH;

    doc.setFont(FONT, "normal");
    doc.setFontSize(labelSize);
    doc.setTextColor(...MUTED);
    doc.text(item.label, x, y);

    doc.setFont(FONT, "bold");
    doc.setFontSize(valueSize);
    doc.setTextColor(...NAVY);
    doc.text(item.value, x, y + 4.6);
  });

  return startY + rows * rowH + 4;
}

// ============================================================
// GENERATOR UTAMA (template global)
// ============================================================

type Align = "left" | "center" | "right";

interface TableOptions {
  columns: string[];
  rows: (string | number)[][];
  columnAligns?: Align[];
  columnWidths?: number[];
  cellPadding?: number | { top: number; right: number; bottom: number; left: number };
}

interface FooterTableOptions extends TableOptions {
  title: string;
  tableFontSize?: number;
  startNewPage?: boolean;
}

interface CreatePdfOptions extends TableOptions {
  orientation?: "portrait" | "landscape";
  summary?: SummaryItem[];
  legend?: string;
  tableFontSize?: number;
  fileName?: string;
  footerTable?: FooterTableOptions;
}

function buildColumnStyles(
  columnAligns: Align[] | undefined,
  columnWidths: number[] | undefined,
  scale: number
): Record<number, { halign?: Align; cellWidth?: number }> {
  const styles: Record<number, { halign?: Align; cellWidth?: number }> = {};
  columnAligns?.forEach((align, i) => {
    if (align) styles[i] = { ...(styles[i] ?? {}), halign: align };
  });
  columnWidths?.forEach((width, i) => {
    if (width) styles[i] = { ...(styles[i] ?? {}), cellWidth: width * scale };
  });
  return styles;
}

async function createPdf(judul: string, subtitle: string, periode: string, opts: CreatePdfOptions) {
  const orientation = opts.orientation ?? "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: F4 });
  const fontSize = opts.tableFontSize ?? FONT_TABLE;

  // Lebar kolom disesuaikan agar tabel mengisi lebar kertas secara proporsional
  const usableWidth = doc.internal.pageSize.getWidth() - MARGIN * 2;
  const widthSum = opts.columnWidths?.reduce((a, b) => a + b, 0) ?? 0;
  const widthScale = widthSum > 0 ? usableWidth / widthSum : 1;

  let startY = await drawFullHeader(doc, judul, subtitle, periode);

  const drawMetaLine = (text: string) => {
    doc.setFont(FONT, "normal");
    doc.setFontSize(FONT_META);
    doc.setTextColor(...SLATE);
    doc.text(text, MARGIN, startY, { maxWidth: usableWidth });
    startY += 4.5;
  };

  if (opts.summary && opts.summary.length > 0) {
    startY = drawSummary(doc, opts.summary, startY);
  }
  if (opts.legend) drawMetaLine(opts.legend);

  startY += 1.5;

  const runTable = (
    table: TableOptions,
    tableStartY: number,
    scale: number,
    tableFontSizeOverride?: number
  ) => {
    const tableFont = tableFontSizeOverride ?? fontSize;
    const tableWidthSum = table.columnWidths?.reduce((a, b) => a + b, 0) ?? 0;
    const tableScale = tableWidthSum > 0 ? usableWidth / tableWidthSum : scale;
    autoTable(doc, {
      startY: tableStartY,
      head: [table.columns],
      body: table.rows,
      margin: { left: MARGIN, right: MARGIN, top: 20, bottom: MARGIN_BOTTOM },
      styles: {
        font: FONT,
        fontSize: tableFont,
        cellPadding: table.cellPadding ?? { top: 2.2, right: 2.5, bottom: 2.2, left: 2.5 },
        textColor: BODY,
        lineColor: LINE,
        lineWidth: 0.15,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: BURGUNDY,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: tableFont,
        halign: "center",
        cellPadding: table.cellPadding
          ? typeof table.cellPadding === "object"
            ? { top: (table.cellPadding.top ?? 2.2) + 0.3, right: table.cellPadding.right ?? 2.5, bottom: (table.cellPadding.bottom ?? 2.2) + 0.3, left: table.cellPadding.left ?? 2.5 }
            : (table.cellPadding as number) + 0.3
          : { top: 2.4, right: 2.5, bottom: 2.4, left: 2.5 },
      },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: buildColumnStyles(table.columnAligns, table.columnWidths, tableScale),
      didDrawPage: (data) => {
        if (data.pageNumber > 1) drawCompactHeader(doc);
      },
    });
  };

  runTable(opts, startY, widthScale);

  if (opts.footerTable) {
    const ft = opts.footerTable;
    const endY =
      typeof (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY === "number"
        ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
        : startY;

    let y = endY + 10;
    const pageH = doc.internal.pageSize.getHeight();
    if (ft.startNewPage || y + 18 > pageH - MARGIN_BOTTOM) {
      doc.addPage();
      y = 23;
    }
    doc.setFont(FONT, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text(ft.title, MARGIN, y);
    doc.setDrawColor(...BURGUNDY);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y + 1.6, doc.internal.pageSize.getWidth() - MARGIN, y + 1.6);
    y += 6;

    runTable(ft, y, widthScale, ft.tableFontSize);
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(doc, i, totalPages);
  }

  const slug = judul.toLowerCase().replace(/\s+/g, "-");
  doc.save(opts.fileName ?? `Laporan-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============================================================
// LAPORAN PER JENIS
// ============================================================

/** Laporan data anggota (portrait — tabel sederhana) */
export async function laporanAnggota(anggota: Anggota[], periode: string) {
  const aktif = anggota.filter((a) => a.status === "Aktif").length;
  const cuti = anggota.filter((a) => a.status === "Cuti").length;
  const tidakAktif = anggota.filter((a) => a.status === "Tidak Aktif").length;

  const rows = anggota.map((a, i) => [
    i + 1,
    a.nama,
    a.divisi,
    a.jabatan,
    a.noHp,
    a.status,
    formatTanggal(a.tanggalBergabung),
    a.keterangan || "-",
  ]);

  await createPdf("DATA ANGGOTA", "Data anggota MB Chondro", periode, {
    columns: ["No", "Nama Lengkap", "Divisi", "Jabatan", "No. HP", "Status", "Tgl Bergabung", "Keterangan"],
    rows,
    summary: [
      { label: "Total Anggota", value: `${anggota.length}` },
      { label: "Aktif", value: `${aktif}` },
      { label: "Cuti", value: `${cuti}` },
      { label: "Tidak Aktif", value: `${tidakAktif}` },
    ],
    columnWidths: [9, 38, 24, 24, 26, 16, 24, 22],
    columnAligns: ["center", "left", "left", "left", "center", "center", "center", "left"],
  });
}

/** Laporan riwayat absensi per catatan (landscape — banyak kolom) */
export async function laporanAbsensi(absensi: Absensi[], periode: string) {
  const stat = hitungStatKehadiran(absensi);
  const tidakHadir = stat.izin + stat.sakit + stat.cuti + stat.alpa;

  const rows = [...absensi]
    .sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""))
    .map((a, i) => [
      i + 1,
      a.nama,
      formatTanggal(a.tanggal),
      a.kegiatan,
      a.waktu,
      a.status,
      a.keterangan || "-",
    ]);

  await createPdf("RIWAYAT ABSENSI", "Rekap riwayat absensi MB Chondro", periode, {
    orientation: "landscape",
    columns: ["No", "Nama Lengkap", "Tanggal", "Kegiatan", "Waktu", "Status", "Keterangan"],
    rows,
    summary: [
      { label: "Total Hadir", value: `${stat.hadir}` },
      { label: "Total Izin", value: `${stat.izin}` },
      { label: "Total Sakit", value: `${stat.sakit}` },
      { label: "Total Cuti", value: `${stat.cuti}` },
      { label: "Total Alpa", value: `${stat.alpa}` },
      { label: "Tidak Hadir", value: `${tidakHadir}` },
      { label: "Persentase Kehadiran", value: `${stat.persentase}%` },
    ],
    columnWidths: [9, 55, 22, 75, 16, 16, 60],
    columnAligns: ["center", "left", "center", "left", "center", "center", "left"],
  });
}

/** Laporan rekap kehadiran berbentuk matriks (anggota × sesi kegiatan + tanggal) */
export async function laporanAbsensiRekap(anggota: Anggota[], absensi: Absensi[], periode: string) {
  const sesiMap = new Map<string, Absensi[]>();
  for (const a of absensi) {
    const k = `${a.tanggal}|${(a.kegiatan || "").trim().toLowerCase()}`;
    const arr = sesiMap.get(k);
    if (arr) arr.push(a);
    else sesiMap.set(k, [a]);
  }

  const kolomKunci = Array.from(sesiMap.keys()).sort((x, y) => {
    const [xd, xk] = x.split("|");
    const [yd, yk] = y.split("|");
    const c = xd.localeCompare(yd);
    if (c !== 0) return c;
    return (xk || "").localeCompare(yk || "");
  });

  // Header kolom: tanggal + nama kegiatan/tempat (bukan waktu)
  const kolomHeader = kolomKunci.map((k) => {
    const [tanggal, kegiatan] = k.split("|");
    return `${formatTanggal(tanggal).slice(0, 5)}\n${kegiatan || "Kegiatan"}`;
  });

  const statusByMember = new Map<string, Map<string, string>>();
  const urutanPrioritas = ["Hadir", "Izin", "Sakit", "Cuti", "Alpa"];
  const ambilTerbaik = (a: string, b: string) =>
    urutanPrioritas.indexOf(a) < urutanPrioritas.indexOf(b) ? a : b;
  for (const a of absensi) {
    let m = statusByMember.get(a.idAnggota);
    if (!m) {
      m = new Map();
      statusByMember.set(a.idAnggota, m);
    }
    const kunci = `${a.tanggal}|${(a.kegiatan || "").trim().toLowerCase()}`;
    const huruf = statusKeHuruf(a.status);
    m.set(kunci, m.has(kunci) ? ambilTerbaik(huruf, m.get(kunci) as string) : huruf);
  }

  const rows = anggota.map((ag, i) => [
    i + 1,
    ag.nama,
    ag.divisi || "-",
    ...kolomKunci.map((k) => simbolKehadiran(statusByMember.get(ag.id)?.get(k) ?? "*")),
  ]);

  // Rekapan per anggota (ringkas dalam satu kolom teks) untuk ditaruh di ujung laporan
  const rekapRows = anggota.map((ag, i) => {
    const m = statusByMember.get(ag.id);
    let hadir = 0, izin = 0, sakit = 0, cuti = 0, alpa = 0;
    for (const k of kolomKunci) {
      const letter = m?.get(k) ?? "*";
      if (letter === "H") hadir++;
      else if (letter === "I") izin++;
      else if (letter === "S") sakit++;
      else if (letter === "C") cuti++;
      else if (letter === "A") alpa++;
    }
    return [i + 1, ag.nama, hadir, izin, sakit, cuti, alpa, hadir + izin + sakit + cuti + alpa];
  });

  const stat = hitungStatKehadiran(absensi);
  const countDate = Math.max(kolomKunci.length, 1);

  // Matriks berisi kolom tanggal → otomatis pakai Landscape F4 bila perlu
  const fixedW = 10 + 46 + 24;
  const portraitUsable = 215.9 - MARGIN * 2;
  const portraitFits = portraitUsable - fixedW >= countDate * 9.5;
  const usable = (portraitFits ? 215.9 : 330.2) - MARGIN * 2;
  const dateColW = (usable - fixedW) / countDate;
  const tableFontSize = Math.min(FONT_TABLE, Math.max(6.5, dateColW * 0.95));

  await createPdf("RIWAYAT ABSENSI", "Rekap kehadiran anggota per kegiatan + tanggal", periode, {
    orientation: portraitFits ? "portrait" : "landscape",
    columns: ["No", "Nama Anggota", "Divisi", ...kolomHeader],
    rows,
    summary: [
      { label: "Total Anggota", value: `${anggota.length}` },
      { label: "Total Hadir", value: `${stat.hadir}` },
      { label: "Total Izin", value: `${stat.izin}` },
      { label: "Total Sakit", value: `${stat.sakit}` },
      { label: "Total Cuti", value: `${stat.cuti}` },
      { label: "Total Alpa", value: `${stat.alpa}` },
      { label: "Persentase Kehadiran", value: `${stat.persentase}%` },
    ],
    legend: "Legenda: • = Hadir, I = Izin, S = Sakit, C = Cuti, A = Alpa, * = Tidak ada absensi",
    tableFontSize,
    cellPadding: { top: 2.6, right: 2, bottom: 2.6, left: 2 },
    fileName: `Laporan-rekap-absensi-${new Date().toISOString().slice(0, 10)}.pdf`,
    columnWidths: [10, 46, 24, ...kolomKunci.map(() => dateColW)],
    columnAligns: ["center", "left", "left", ...kolomKunci.map<Align>(() => "center")],
    footerTable: {
      title: "REKAP PER ANGGOTA",
      columns: ["No", "Nama Anggota", "Hadir", "Izin", "Sakit", "Cuti", "Alpa", "Total"],
      rows: rekapRows,
      tableFontSize: FONT_TABLE,
      startNewPage: true,
      columnWidths: [10, 66, 17, 17, 17, 17, 17, 17],
      columnAligns: ["center", "left", "center", "center", "center", "center", "center", "center"],
    },
  });
}

/** Laporan keuangan dengan saldo berjalan (landscape — banyak kolom) */
export async function laporanKeuangan(transaksi: Transaksi[], periode: string, judulKas: string) {
  const saldo = hitungSaldo(transaksi);

  const sorted = [...transaksi].sort((a, b) => (a.tanggal || "").localeCompare(b.tanggal || ""));
  let running = 0;
  const rows = sorted.map((t, i) => {
    const nominal = Number(t.nominal) || 0;
    const pemasukan = t.jenis === "Pemasukan" ? nominal : 0;
    const pengeluaran = t.jenis === "Pengeluaran" ? nominal : 0;
    running += pemasukan - pengeluaran;
    return [
      i + 1,
      formatTanggal(t.tanggal),
      t.keterangan || "-",
      t.kategori || "-",
      pemasukan ? formatRupiah(pemasukan) : "-",
      pengeluaran ? formatRupiah(pengeluaran) : "-",
      formatRupiah(running),
    ];
  });

  await createPdf(judulKas.toUpperCase(), `Pemasukan dan pengeluaran ${judulKas}`, periode, {
    orientation: "landscape",
    columns: ["No", "Tanggal", "Keterangan", "Kategori", "Pemasukan", "Pengeluaran", "Saldo"],
    rows,
    summary: [
      { label: "Total Pemasukan", value: formatRupiah(saldo.pemasukan) },
      { label: "Total Pengeluaran", value: formatRupiah(saldo.pengeluaran) },
      { label: "Saldo", value: formatRupiah(saldo.saldo) },
    ],
    columnWidths: [9, 24, 80, 34, 38, 38, 40],
    columnAligns: ["center", "center", "left", "left", "right", "right", "right"],
  });
}