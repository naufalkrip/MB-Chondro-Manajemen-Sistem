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
// TEMPLATE PDF MB CHONDRO — versi compact & resmi
// ============================================================
//  - Kertas F4 (210 × 330 mm), portrait / landscape
//  - Font Arial-equivalent (helvetica), isi tabel 9–10 pt
//  - Kop ringkas: logo proporsional + nama organisasi + judul
//  - Garis burgundy tipis di bawah kop
//  - Tabel header burgundy, baris berselang-seling tipis
//  - Footer: garis tipis + nama organisasi + nomor halaman
// ============================================================

const BURGUNDY: [number, number, number] = [127, 29, 29];
const NAVY: [number, number, number] = [15, 23, 42];
const BODY: [number, number, number] = [31, 41, 55];
const SLATE: [number, number, number] = [71, 85, 105];
const MUTED: [number, number, number] = [100, 116, 139];
const WHITE: [number, number, number] = [255, 255, 255];
const LINE: [number, number, number] = [226, 232, 240];
const ROW_ALT: [number, number, number] = [248, 250, 252];

const FONT = "helvetica"; // Arial-equivalent (metrik identik dengan Arial)

const F4: [number, number] = [210, 330];

const MARGIN = 16;
const MARGIN_BOTTOM = 16;

const FONT_TITLE = 15;
const FONT_TABLE = 9.5;
const FONT_FOOTER = 8.5;

// ---------- Logo ----------
let logoDataUrl: string | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat logo"));
    img.src = src;
  });
}

/**
 * Muat logo dan jadikan data URL dengan proporsi asli (tanpa potong/stretch).
 * Halaman PDF berwarna putih sehingga latar canvas putih tidak terlihat.
 */
async function getLogoDataUrl(): Promise<string | null> {
  if (logoDataUrl !== null) return logoDataUrl;
  try {
    const img = await loadImage(logoUrl);
    const maxDim = 800;
    const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 2);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      logoDataUrl = null;
      return null;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    logoDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    return logoDataUrl;
  } catch {
    logoDataUrl = null;
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

/** Header halaman pertama: logo + identitas organisasi + judul laporan */
async function drawFullHeader(doc: jsPDF, judul: string, subtitle: string, periode: string): Promise<number> {
  const w = doc.internal.pageSize.getWidth();
  addTopBand(doc);

  const logo = await getLogoDataUrl();
  if (logo) {
    // Logo proporsional (banner 1009×394), cukup jelas tapi tetap ringkas
    const logoW = 22;
    const logoH = (logoW * 394) / 1009;
    try {
      doc.addImage(logo, "JPEG", MARGIN, 8, logoW, logoH);
    } catch {
      // abaikan jika logo gagal dirender
    }
  }

  doc.setFont(FONT, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BURGUNDY);
  doc.text("MB CHONDRO", MARGIN + 27, 13);

  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text("SISTEM MANAJEMEN ORGANISASI", MARGIN + 27, 18.5);

  const titleY = 27;
  doc.setFont(FONT, "bold");
  doc.setFontSize(FONT_TITLE);
  doc.setTextColor(...NAVY);
  doc.text(`LAPORAN ${judul.toUpperCase()}`, MARGIN, titleY);

  doc.setFont(FONT, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  doc.text(subtitle, MARGIN, titleY + 6);

  doc.setFontSize(FONT_TABLE);
  doc.setTextColor(...SLATE);
  doc.text(`Periode: ${periode}`, w - MARGIN, titleY, { align: "right" });
  doc.text(`Dicetak: ${formatTanggalPanjang(new Date().toISOString())}`, w - MARGIN, titleY + 6, { align: "right" });

  drawDoubleLine(doc, titleY + 10.5);

  let startY = titleY + 14.5;
  return startY;
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

// ---------- Ringkasan (rekapan di atas tabel) ----------
export interface SummaryItem {
  label: string;
  value: string;
}

/**
 * Gambar kotak rekap sebagai grid berkolom sama (seperti flex/grid).
 * Semua item dimulai dari posisi X kolom yang sama sehingga benar-benar sejajar,
 * label 9pt + nilai 10pt tebal dalam satu baris ("Label: Nilai").
 */
function drawSummary(doc: jsPDF, items: SummaryItem[], startY: number): number {
  const w = doc.internal.pageSize.getWidth();
  const usable = w - MARGIN * 2;

  // Grid kolom sama besar: 6 item → 3×2, 4 item → 4×1, 3 item → 3×1
  const perRow = items.length >= 6 ? 3 : items.length >= 4 ? 4 : items.length;
  const rows = Math.ceil(items.length / perRow);
  const lineH = 5;

  const labelSize = 9;
  const valueSize = 10;

  // Kotak compact (padding ~3.5mm, radius 2mm)
  const padTop = 3.5;
  const padBottom = 3.5;
  const padContent = 4;
  const accentW = 1.5;
  const boxX = MARGIN;
  const boxW = usable;
  const boxH = padTop + rows * lineH + padBottom;
  const boxY = startY + 1; // sedikit jarak dari garis pemisah
  const rx = 2;

  // Latar sangat terang + border abu tipis
  doc.setFillColor(...ROW_ALT);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW, boxH, rx, rx, "FD");

  // Aksen burgundy tipis di kiri, mengikuti tinggi kotak
  doc.setFillColor(...BURGUNDY);
  doc.roundedRect(boxX, boxY + 2, accentW, boxH - 4, 1, 1, "F");

  // Area teks dengan padding horizontal simetris (menyeimbangkan aksen kiri)
  const contentLeft = boxX + accentW + padContent;
  const contentRight = boxX + boxW - padContent;
  const cellW = (contentRight - contentLeft) / perRow;

  items.forEach((item, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = contentLeft + col * cellW;
    const y = boxY + padTop + row * lineH;

    const labelText = `${item.label}: `;
    doc.setFont(FONT, "normal");
    doc.setFontSize(labelSize);
    doc.setTextColor(...MUTED);
    const labelW = doc.getTextWidth(labelText);

    // Pilih ukuran nilai terbesar yang tetap muat di dalam kolom
    // (menghindari teks bertumpuk/meluap ke kolom sebelah).
    let valSize = valueSize;
    doc.setFont(FONT, "bold");
    doc.setFontSize(valSize);
    while (valSize > 8 && labelW + doc.getTextWidth(item.value) > cellW - 1) {
      valSize -= 0.5;
      doc.setFontSize(valSize);
    }
    const valueW = doc.getTextWidth(item.value);

    if (labelW + valueW <= cellW - 1) {
      // Satu baris: "Label: Nilai"
      doc.setFont(FONT, "normal");
      doc.setFontSize(labelSize);
      doc.setTextColor(...MUTED);
      doc.text(labelText, x, y);
      doc.setFont(FONT, "bold");
      doc.setFontSize(valSize);
      doc.setTextColor(...NAVY);
      doc.text(item.value, x + labelW, y);
    } else {
      // Fallback: nilai ditaruh di baris kedua, tetap di dalam kolomnya
      doc.setFont(FONT, "normal");
      doc.setFontSize(labelSize);
      doc.setTextColor(...MUTED);
      doc.text(labelText, x, y);
      doc.setFont(FONT, "bold");
      doc.setFontSize(8);
      doc.setTextColor(...NAVY);
      doc.text(item.value, x, y + 4.3);
    }
  });

  return boxY + boxH + 3.5;
}

// ============================================================
// GENERATOR UTAMA (reusable template)
// ============================================================

type Align = "left" | "center" | "right";

interface TableOptions {
  columns: string[];
  rows: (string | number)[][];
  columnAligns?: Align[];
  columnWidths?: number[];
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
    doc.setFontSize(9.5);
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
        cellPadding: { top: 2.2, right: 2.5, bottom: 2.2, left: 2.5 },
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
        cellPadding: { top: 2.4, right: 2.5, bottom: 2.4, left: 2.5 },
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
      drawCompactHeader(doc);
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

/** Laporan data anggota (terima data yang sudah difilter di halaman) */
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
    columnWidths: [10, 36, 24, 24, 26, 16, 24, 20],
    columnAligns: ["center", "left", "left", "left", "center", "center", "center", "left"],
  });
}

/** Laporan riwayat absensi per catatan (terima data yang sudah difilter di halaman) */
export async function laporanAbsensi(absensi: Absensi[], periode: string) {
  const stat = hitungStatKehadiran(absensi);
  const tidakHadir = stat.izin + stat.sakit + stat.cuti + stat.alpa;

  const rows = [...absensi]
    .sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""))
    .map((a, i) => [
      i + 1,
      a.id,
      a.nama,
      formatTanggal(a.tanggal),
      a.kegiatan,
      a.waktu,
      a.status,
      a.keterangan || "-",
    ]);

  await createPdf("ABSENSI", "Rekap riwayat absensi MB Chondro", periode, {
    columns: ["No", "ID Absensi", "Nama", "Tanggal", "Kegiatan", "Waktu", "Status", "Keterangan"],
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
    columnWidths: [9, 20, 40, 20, 40, 14, 14, 23],
    columnAligns: ["center", "center", "left", "center", "left", "center", "center", "left"],
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
    ...kolomKunci.map((k) => statusByMember.get(ag.id)?.get(k) ?? "*"),
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
  const portraitFits = 180 - fixedW >= countDate * 9.5;
  const usable = (portraitFits ? 210 : 330) - MARGIN * 2;
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
    legend: "Legenda: H = Hadir, I = Izin, S = Sakit, C = Cuti, A = Alpa, * = Tidak ada absensi",
    tableFontSize,
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
  });}

/** Laporan keuangan dengan saldo berjalan (terima data yang sudah difilter) */
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

  await createPdf(judulKas.toUpperCase(), `Laporan keuangan ${judulKas}`, periode, {
    columns: ["No", "Tanggal", "Keterangan", "Kategori", "Pemasukan", "Pengeluaran", "Saldo"],
    rows,
    summary: [
      { label: "Total Pemasukan", value: formatRupiah(saldo.pemasukan) },
      { label: "Total Pengeluaran", value: formatRupiah(saldo.pengeluaran) },
      { label: "Saldo", value: formatRupiah(saldo.saldo) },
    ],
    columnWidths: [9, 22, 52, 26, 24, 24, 23],
    columnAligns: ["center", "center", "left", "left", "right", "right", "right"],
  });
}