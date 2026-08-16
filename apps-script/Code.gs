/**
 * ============================================================
 * MB CHONDRO — Google Apps Script Backend
 * ============================================================
 * Berfungsi sebagai API antara website React dan Google Spreadsheet.
 *
 * CARA PAKAI:
 * 1. Buka https://script.google.com (project: 1zJPjV4XTa6dZe0KHpHKEI2qfMA-WtEh1ekF8BCNb9DwE5_O8BAAh274l)
 * 2. Ganti seluruh isi Code.gs dengan file ini.
 * 3. Klik Deploy → New deployment → Web app.
 *    - Description: MB Chondro API
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Salin URL /exec → paste ke src/config.ts sebagai API_URL.
 *
 * Spreadsheet: 1GXkAFCQrbf-I7KgYjohQ5TIvJMsIt1Ga0M1BcijrPi8
 * (JANGAN menghapus data yang sudah ada — script ini hanya membuat
 *  sheet/header bila belum ada, tidak menghapus apa pun.)
 * ============================================================
 */

// ============================================================
// KONFIGURASI
// ============================================================

var SPREADSHEET_ID = "1GXkAFCQrbf-I7KgYjohQ5TIvJMsIt1Ga0M1BcijrPi8";

// Opsional: jika diisi, semua request harus menyertakan token.
// Kosongkan ("") untuk menonaktifkan proteksi token.
var API_TOKEN = "";

var SHEET_CONFIG = [
  {
    key: "ANGGOTA",
    name: "ANGGOTA",
    idPrefix: "MB",
    headers: ["ID Anggota", "Nama Lengkap", "Divisi", "Jabatan", "No. HP", "Status", "Tanggal Bergabung", "Keterangan"],
    keys: ["id", "nama", "divisi", "jabatan", "noHp", "status", "tanggalBergabung", "keterangan"],
    idCol: 0
  },
  {
    key: "ABSENSI",
    name: "ABSENSI",
    idPrefix: "ABS",
    headers: ["ID Absensi", "ID Anggota", "Nama", "Tanggal", "Kegiatan", "Status Kehadiran", "Keterangan", "Waktu"],
    keys: ["id", "idAnggota", "nama", "tanggal", "kegiatan", "status", "keterangan", "waktu"],
    idCol: 0
  },
  {
    key: "KEUANGAN_CHONDRO",
    name: "KEUANGAN_CHONDRO",
    idPrefix: "TRX",
    headers: ["ID Transaksi", "Tanggal", "Jenis", "Kategori", "Keterangan", "Nominal", "Penanggung Jawab"],
    keys: ["id", "tanggal", "jenis", "kategori", "keterangan", "nominal", "penanggungJawab"],
    idCol: 0
  },
  {
    key: "KEUANGAN_MEDIA",
    name: "KEUANGAN_MEDIA",
    idPrefix: "TRX",
    headers: ["ID Transaksi", "Tanggal", "Jenis", "Kategori", "Keterangan", "Nominal", "Penanggung Jawab"],
    keys: ["id", "tanggal", "jenis", "kategori", "keterangan", "nominal", "penanggungJawab"],
    idCol: 0
  }
];

// ============================================================
// ENTRY POINT (doGet / doPost)
// ============================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  return handleRequest(action, {});
}

function doPost(e) {
  var payload = {};
  if (e && e.postData && e.postData.contents) {
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (err) {
      // payload tetap {}
    }
  }
  var action = payload.action || (e && e.parameter && e.parameter.action) || "";
  var data = payload.data || {};
  return handleRequest(action, data);
}

function handleRequest(action, data) {
  try {
    ensureSetup();

    if (API_TOKEN && data.token !== API_TOKEN) {
      return jsonResponse({ success: false, message: "Token tidak valid." });
    }

    var result = executeAction(action, data);
    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, message: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function executeAction(action, data) {
  switch (action) {
    // Dashboard
    case "getDashboard":
      return getDashboard();

    // Anggota
    case "getAnggota":
      return getAnggota();
    case "addAnggota":
      return addAnggota(data);
    case "updateAnggota":
      return updateAnggota(data);
    case "deleteAnggota":
      return deleteAnggota(data);

    // Absensi
    case "getAbsensi":
      return getAbsensi();
    case "addAbsensi":
      return addAbsensi(data);
    case "updateAbsensi":
      return updateAbsensi(data);
    case "deleteAbsensi":
      return deleteAbsensi(data);
    case "saveAbsensiBatch":
      return saveAbsensiBatch(data.items);
    case "updateAbsensiBatch":
      return updateAbsensiBatch(data.items);
    case "deleteAbsensiBatch":
      return deleteAbsensiBatch(data.ids);

    // Keuangan MB Chondro
    case "getKeuanganChondro":
      return getKeuanganChondro();
    case "addKeuanganChondro":
      return addKeuanganChondro(data);
    case "updateKeuanganChondro":
      return updateKeuanganChondro(data);
    case "deleteKeuanganChondro":
      return deleteKeuanganChondro(data);

    // Keuangan Media
    case "getKeuanganMedia":
      return getKeuanganMedia();
    case "addKeuanganMedia":
      return addKeuanganMedia(data);
    case "updateKeuanganMedia":
      return updateKeuanganMedia(data);
    case "deleteKeuanganMedia":
      return deleteKeuanganMedia(data);

    default:
      throw new Error("Action tidak dikenal: " + action);
  }
}

// ============================================================
// SETUP SPREADSHEET (non-destruktif)
// ============================================================

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSetup() {
  var ss = getSpreadsheet();
  for (var i = 0; i < SHEET_CONFIG.length; i++) {
    var cfg = SHEET_CONFIG[i];
    var sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
    }
    ensureHeaders(sheet, cfg);
  }
}

function ensureHeaders(sheet, cfg) {
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
    sheet.getRange(1, 1, 1, cfg.headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return;
  }
  // Pastikan baris pertama berisi header; jika kosong, isi header.
  var firstRow = sheet.getRange(1, 1, 1, cfg.headers.length).getValues()[0];
  var needsHeader = firstRow.every(function (cell) { return cell === "" || cell === null; });
  if (needsHeader) {
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
    sheet.getRange(1, 1, 1, cfg.headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return;
  }
  // Tambahkan header baru di akhir baris header (non-destruktif),
  // misal kolom "Waktu" pada sheet ABSENSI yang sudah ada.
  var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (existingHeaders.length < cfg.headers.length) {
    var missing = cfg.headers.slice(existingHeaders.length);
    sheet.getRange(1, existingHeaders.length + 1, 1, missing.length).setValues([missing]);
    sheet.getRange(1, existingHeaders.length + 1, 1, missing.length).setFontWeight("bold");
  }
}

function getSheetConfig(key) {
  for (var i = 0; i < SHEET_CONFIG.length; i++) {
    if (SHEET_CONFIG[i].key === key) return SHEET_CONFIG[i];
  }
  throw new Error("Konfigurasi sheet tidak ditemukan: " + key);
}

// ============================================================
// BANTUAN UMUM
// ============================================================

function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

function formatDate(d) {
  if (d instanceof Date) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  return String(d).slice(0, 10);
}

function readRows(cfg) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(1, 1, lastRow, cfg.keys.length).getValues();
  var result = [];
  for (var i = 1; i < values.length; i++) {
    var idRaw = values[i][cfg.idCol];
    if (idRaw === "" || idRaw === null || idRaw === undefined) continue;
    var obj = {};
    for (var c = 0; c < cfg.keys.length; c++) {
      var raw = values[i][c];
      obj[cfg.keys[c]] = raw instanceof Date ? formatDate(raw) : raw;
    }
    result.push(obj);
  }
  return result;
}

function generateId(cfg) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var lastRow = sheet.getLastRow();
  var max = 0;
  if (lastRow >= 1) {
    var ids = sheet.getRange(1, cfg.idCol + 1, lastRow, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var s = String(ids[i][0]);
      var m = s.match(/(\d+)$/);
      if (m) {
        var n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
  }
  return cfg.idPrefix + String(max + 1).padStart(3, "0");
}

function findRowIndex(cfg, id) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return -1;
  var ids = sheet.getRange(1, cfg.idCol + 1, lastRow, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 1; // 1-based baris sheet
  }
  return -1;
}

function hitungSaldo(list) {
  var pemasukan = 0;
  var pengeluaran = 0;
  for (var i = 0; i < list.length; i++) {
    var nominal = Number(list[i].nominal) || 0;
    if (list[i].jenis === "Pemasukan") pemasukan += nominal;
    else pengeluaran += nominal;
  }
  return { pemasukan: pemasukan, pengeluaran: pengeluaran, saldo: pemasukan - pengeluaran };
}

function hitungStatKehadiran(list) {
  var hadir = 0, izin = 0, sakit = 0, cuti = 0, alpa = 0;
  for (var i = 0; i < list.length; i++) {
    var s = list[i].status;
    if (s === "Hadir") hadir++;
    else if (s === "Izin") izin++;
    else if (s === "Sakit") sakit++;
    else if (s === "Cuti") cuti++;
    else alpa++;
  }
  var total = list.length;
  var persentase = total === 0 ? 0 : Math.round(((hadir + izin + sakit + cuti) / total) * 100);
  return { hadir: hadir, izin: izin, sakit: sakit, cuti: cuti, alpa: alpa, total: total, persentase: persentase };
}

function getNamaAnggota(idAnggota) {
  var cfg = getSheetConfig("ANGGOTA");
  var rows = readRows(cfg);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(idAnggota)) return rows[i].nama;
  }
  return "";
}

// ============================================================
// DASHBOARD
// ============================================================

function getDashboard() {
  var anggota = getAnggota();
  var absensi = getAbsensi();
  var total = anggota.length;
  var aktif = 0, cuti = 0;
  for (var i = 0; i < anggota.length; i++) {
    if (anggota[i].status === "Aktif") aktif++;
    else if (anggota[i].status === "Cuti") cuti++;
  }
  return {
    anggota: { total: total, aktif: aktif, cuti: cuti, tidakAktif: total - aktif - cuti },
    absensi: hitungStatKehadiran(absensi),
    keuanganChondro: hitungSaldo(getKeuanganChondro()),
    keuanganMedia: hitungSaldo(getKeuanganMedia())
  };
}

// ============================================================
// ANGGOTA
// ============================================================

function getAnggota() {
  return readRows(getSheetConfig("ANGGOTA"));
}

function validateAnggota(data) {
  if (!data.nama || !String(data.nama).trim()) throw new Error("Nama wajib diisi.");
  if (!data.status) throw new Error("Status anggota wajib dipilih.");
  if (!data.tanggalBergabung) throw new Error("Tanggal bergabung wajib diisi.");
  var status = String(data.status);
  if (["Aktif", "Cuti", "Tidak Aktif"].indexOf(status) === -1) {
    throw new Error("Status anggota tidak valid.");
  }
}

function addAnggota(data) {
  validateAnggota(data);
  var cfg = getSheetConfig("ANGGOTA");
  var id = generateId(cfg);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var row = [
    id,
    String(data.nama || "").trim(),
    String(data.divisi || "").trim(),
    String(data.jabatan || "").trim(),
    String(data.noHp || "").trim(),
    String(data.status || "Aktif"),
    String(data.tanggalBergabung || ""),
    String(data.keterangan || "").trim()
  ];
  sheet.appendRow(row);
  return {
    id: id,
    nama: row[1],
    divisi: row[2],
    jabatan: row[3],
    noHp: row[4],
    status: row[5],
    tanggalBergabung: row[6],
    keterangan: row[7],
    message: "Data berhasil disimpan."
  };
}

function updateAnggota(data) {
  if (!data.id) throw new Error("ID anggota tidak ditemukan.");
  validateAnggota(data);
  var cfg = getSheetConfig("ANGGOTA");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Anggota tidak ditemukan.");
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var row = [
    data.id,
    String(data.nama || "").trim(),
    String(data.divisi || "").trim(),
    String(data.jabatan || "").trim(),
    String(data.noHp || "").trim(),
    String(data.status || "Aktif"),
    String(data.tanggalBergabung || ""),
    String(data.keterangan || "").trim()
  ];
  sheet.getRange(rowIndex, 1, 1, cfg.keys.length).setValues([row]);
  return {
    id: data.id,
    nama: row[1],
    divisi: row[2],
    jabatan: row[3],
    noHp: row[4],
    status: row[5],
    tanggalBergabung: row[6],
    keterangan: row[7],
    message: "Data berhasil disimpan."
  };
}

function deleteAnggota(data) {
  if (!data.id) throw new Error("ID anggota tidak ditemukan.");
  var cfg = getSheetConfig("ANGGOTA");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Anggota tidak ditemukan.");
  var ss = getSpreadsheet();
  ss.getSheetByName(cfg.name).deleteRow(rowIndex);
  return { message: "Data berhasil dihapus." };
}

// ============================================================
// ABSENSI
// ============================================================

function getAbsensi() {
  return readRows(getSheetConfig("ABSENSI"));
}

function validateAbsensi(data) {
  if (!data.idAnggota) throw new Error("Anggota wajib dipilih.");
  if (!data.tanggal) throw new Error("Tanggal wajib diisi.");
  if (!data.kegiatan || !String(data.kegiatan).trim()) throw new Error("Kegiatan wajib diisi.");
  if (!data.status) throw new Error("Status kehadiran wajib dipilih.");
  if (!data.waktu) throw new Error("Waktu absensi wajib dipilih.");
  var status = String(data.status);
  if (["Hadir", "Izin", "Sakit", "Cuti", "Alpa"].indexOf(status) === -1) {
    throw new Error("Status kehadiran tidak valid.");
  }
  var waktu = String(data.waktu);
  if (["Pagi", "Siang", "Malam"].indexOf(waktu) === -1) {
    throw new Error("Waktu absensi tidak valid.");
  }
}

function addAbsensi(data) {
  validateAbsensi(data);
  var cfg = getSheetConfig("ABSENSI");
  var id = generateId(cfg);
  var nama = getNamaAnggota(data.idAnggota);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var row = [
    id,
    String(data.idAnggota),
    nama,
    String(data.tanggal || ""),
    String(data.kegiatan || "").trim(),
    String(data.status || "Hadir"),
    String(data.keterangan || "").trim(),
    String(data.waktu || "")
  ];
  sheet.appendRow(row);
  return {
    id: id,
    idAnggota: row[1],
    nama: nama,
    tanggal: row[3],
    kegiatan: row[4],
    status: row[5],
    keterangan: row[6],
    waktu: row[7],
    message: "Data berhasil disimpan."
  };
}

function updateAbsensi(data) {
  if (!data.id) throw new Error("ID absensi tidak ditemukan.");
  validateAbsensi(data);
  var cfg = getSheetConfig("ABSENSI");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Absensi tidak ditemukan.");
  var nama = getNamaAnggota(data.idAnggota);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var row = [
    data.id,
    String(data.idAnggota),
    nama,
    String(data.tanggal || ""),
    String(data.kegiatan || "").trim(),
    String(data.status || "Hadir"),
    String(data.keterangan || "").trim(),
    String(data.waktu || "")
  ];
  sheet.getRange(rowIndex, 1, 1, cfg.keys.length).setValues([row]);
  return {
    id: data.id,
    idAnggota: row[1],
    nama: nama,
    tanggal: row[3],
    kegiatan: row[4],
    status: row[5],
    keterangan: row[6],
    waktu: row[7],
    message: "Data berhasil disimpan."
  };
}

function deleteAbsensi(data) {
  if (!data.id) throw new Error("ID absensi tidak ditemukan.");
  var cfg = getSheetConfig("ABSENSI");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Absensi tidak ditemukan.");
  var ss = getSpreadsheet();
  ss.getSheetByName(cfg.name).deleteRow(rowIndex);
  return { message: "Data berhasil dihapus." };
}

/**
 * Simpan banyak catatan absensi dalam SATU request (realtime).
 * Semua baris ditulis sekaligus dengan satu setValues, bukan appendRow per anggota.
 */
function saveAbsensiBatch(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Data absensi kosong.");
  var cfg = getSheetConfig("ABSENSI");
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);

  // Peta nama anggota dibaca sekali saja (bukan per baris).
  var namaByAnggota = {};
  var daftarAnggota = readRows(getSheetConfig("ANGGOTA"));
  for (var i = 0; i < daftarAnggota.length; i++) {
    namaByAnggota[String(daftarAnggota[i].id)] = daftarAnggota[i].nama;
  }

  // Nomor ID terakhir dihitung sekali, lalu dinaikkan berurutan.
  var lastRow = sheet.getLastRow();
  var maxNum = 0;
  if (lastRow >= 1) {
    var ids = sheet.getRange(1, cfg.idCol + 1, lastRow, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var s = String(ids[i][0]);
      var m = s.match(/(\d+)$/);
      if (m) {
        var n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
  }

  var rows = [];
  var hasil = [];
  for (var i = 0; i < items.length; i++) {
    var data = items[i];
    validateAbsensi(data);
    var id = cfg.idPrefix + String(++maxNum).padStart(3, "0");
    var idAnggota = String(data.idAnggota);
    var nama = namaByAnggota[idAnggota] || "";
    var tanggal = String(data.tanggal || "");
    var kegiatan = String(data.kegiatan || "").trim();
    var status = String(data.status || "Hadir");
    var keterangan = String(data.keterangan || "").trim();
    var waktu = String(data.waktu || "");
    rows.push([id, idAnggota, nama, tanggal, kegiatan, status, keterangan, waktu]);
    hasil.push({
      id: id,
      idAnggota: idAnggota,
      nama: nama,
      tanggal: tanggal,
      kegiatan: kegiatan,
      status: status,
      keterangan: keterangan,
      waktu: waktu,
      message: "Data berhasil disimpan."
    });
  }

  var startRow = Math.max(lastRow + 1, 2);
  sheet.getRange(startRow, 1, rows.length, cfg.keys.length).setValues(rows);
  return hasil;
}

/** Perbarui banyak catatan absensi dalam SATU request, dengan satu setValues. */
function updateAbsensiBatch(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Data absensi kosong.");
  var cfg = getSheetConfig("ABSENSI");
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) throw new Error("Tidak ada data absensi.");

  var namaByAnggota = {};
  var daftarAnggota = readRows(getSheetConfig("ANGGOTA"));
  for (var i = 0; i < daftarAnggota.length; i++) {
    namaByAnggota[String(daftarAnggota[i].id)] = daftarAnggota[i].nama;
  }

  // Baca seluruh sheet sekali, lalu ubah hanya baris yang cocok.
  var dataAll = sheet.getRange(1, 1, lastRow, cfg.keys.length).getValues();
  var indexById = {};
  for (var r = 0; r < dataAll.length; r++) {
    var idCell = String(dataAll[r][cfg.idCol]);
    if (idCell !== "") indexById[idCell] = r;
  }

  var hasil = [];
  for (var i = 0; i < items.length; i++) {
    var data = items[i];
    if (!data.id) throw new Error("ID absensi tidak ditemukan.");
    validateAbsensi(data);
    var key = String(data.id);
    if (indexById[key] === undefined) throw new Error("Absensi tidak ditemukan.");
    var idAnggota = String(data.idAnggota);
    var nama = namaByAnggota[idAnggota] || "";
    var tanggal = String(data.tanggal || "");
    var kegiatan = String(data.kegiatan || "").trim();
    var status = String(data.status || "Hadir");
    var keterangan = String(data.keterangan || "").trim();
    var waktu = String(data.waktu || "");
    dataAll[indexById[key]] = [key, idAnggota, nama, tanggal, kegiatan, status, keterangan, waktu];
    hasil.push({
      id: key,
      idAnggota: idAnggota,
      nama: nama,
      tanggal: tanggal,
      kegiatan: kegiatan,
      status: status,
      keterangan: keterangan,
      waktu: waktu,
      message: "Data berhasil disimpan."
    });
  }

  sheet.getRange(1, 1, lastRow, cfg.keys.length).setValues(dataAll);
  return hasil;
}

/** Hapus banyak catatan absensi dalam SATU request (per sesi). */
function deleteAbsensiBatch(ids) {
  if (!Array.isArray(ids) || ids.length === 0) throw new Error("Data absensi kosong.");
  var cfg = getSheetConfig("ABSENSI");
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var lastRow = sheet.getLastRow();

  var set = {};
  for (var i = 0; i < ids.length; i++) set[String(ids[i])] = true;

  var indices = [];
  if (lastRow >= 1) {
    var idData = sheet.getRange(1, cfg.idCol + 1, lastRow, 1).getValues();
    for (var r = 1; r < idData.length; r++) {
      if (set[String(idData[r][0])]) indices.push(r + 1);
    }
  }
  if (indices.length === 0) throw new Error("Absensi tidak ditemukan.");

  // Hapus dari bawah agar indeks tidak bergeser; gabungkan baris berurutan.
  indices.sort(function (a, b) { return b - a; });
  var i = 0;
  while (i < indices.length) {
    var start = indices[i];
    var run = 1;
    while (i + run < indices.length && indices[i + run] === start - run) run++;
    sheet.deleteRows(start - run + 1, run);
    i += run;
  }
  return { message: "Data berhasil dihapus.", jumlah: indices.length };
}

// ============================================================
// KEUANGAN (dipakai untuk Chondro & Media)
// ============================================================

function getKeuangan(sheetKey) {
  return readRows(getSheetConfig(sheetKey));
}

function validateKeuangan(data) {
  if (!data.tanggal) throw new Error("Tanggal wajib diisi.");
  if (!data.jenis) throw new Error("Jenis transaksi wajib dipilih.");
  var jenis = String(data.jenis);
  if (["Pemasukan", "Pengeluaran"].indexOf(jenis) === -1) {
    throw new Error("Jenis transaksi tidak valid.");
  }
  var nominal = Number(data.nominal);
  if (isNaN(nominal)) throw new Error("Nominal harus berupa angka.");
  if (nominal < 0) throw new Error("Nominal tidak boleh negatif.");
}

function addKeuangan(sheetKey, data) {
  validateKeuangan(data);
  var cfg = getSheetConfig(sheetKey);
  var id = generateId(cfg);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var row = [
    id,
    String(data.tanggal || ""),
    String(data.jenis || ""),
    String(data.kategori || "").trim(),
    String(data.keterangan || "").trim(),
    Number(data.nominal) || 0,
    String(data.penanggungJawab || "").trim()
  ];
  sheet.appendRow(row);
  return {
    id: id,
    tanggal: row[1],
    jenis: row[2],
    kategori: row[3],
    keterangan: row[4],
    nominal: row[5],
    penanggungJawab: row[6],
    message: "Data berhasil disimpan."
  };
}

function updateKeuangan(sheetKey, data) {
  if (!data.id) throw new Error("ID transaksi tidak ditemukan.");
  validateKeuangan(data);
  var cfg = getSheetConfig(sheetKey);
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Transaksi tidak ditemukan.");
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var row = [
    data.id,
    String(data.tanggal || ""),
    String(data.jenis || ""),
    String(data.kategori || "").trim(),
    String(data.keterangan || "").trim(),
    Number(data.nominal) || 0,
    String(data.penanggungJawab || "").trim()
  ];
  sheet.getRange(rowIndex, 1, 1, cfg.keys.length).setValues([row]);
  return {
    id: data.id,
    tanggal: row[1],
    jenis: row[2],
    kategori: row[3],
    keterangan: row[4],
    nominal: row[5],
    penanggungJawab: row[6],
    message: "Data berhasil disimpan."
  };
}

function deleteKeuangan(sheetKey, data) {
  if (!data.id) throw new Error("ID transaksi tidak ditemukan.");
  var cfg = getSheetConfig(sheetKey);
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Transaksi tidak ditemukan.");
  var ss = getSpreadsheet();
  ss.getSheetByName(cfg.name).deleteRow(rowIndex);
  return { message: "Data berhasil dihapus." };
}

// Wrapper sesuai nama action
function getKeuanganChondro() { return getKeuangan("KEUANGAN_CHONDRO"); }
function addKeuanganChondro(data) { return addKeuangan("KEUANGAN_CHONDRO", data); }
function updateKeuanganChondro(data) { return updateKeuangan("KEUANGAN_CHONDRO", data); }
function deleteKeuanganChondro(data) { return deleteKeuangan("KEUANGAN_CHONDRO", data); }

function getKeuanganMedia() { return getKeuangan("KEUANGAN_MEDIA"); }
function addKeuanganMedia(data) { return addKeuangan("KEUANGAN_MEDIA", data); }
function updateKeuanganMedia(data) { return updateKeuangan("KEUANGAN_MEDIA", data); }
function deleteKeuanganMedia(data) { return deleteKeuangan("KEUANGAN_MEDIA", data); }