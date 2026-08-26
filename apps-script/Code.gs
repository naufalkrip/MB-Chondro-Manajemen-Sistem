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
  },
  {
    key: "TRANSAKSI_GROUP",
    name: "TRANSAKSI_GROUP",
    idPrefix: "TG",
    headers: ["id", "judul", "tanggal", "keterangan", "createdAt", "updatedAt"],
    keys: ["id", "judul", "tanggal", "keterangan", "createdAt", "updatedAt"],
    idCol: 0
  },
  {
    key: "TRANSAKSI_DETAIL",
    name: "TRANSAKSI_DETAIL",
    idPrefix: "TD",
    headers: ["id", "transaksiGroupId", "tanggal", "jenis", "kategori", "nominal", "keterangan", "createdAt", "updatedAt"],
    keys: ["id", "transaksiGroupId", "tanggal", "jenis", "kategori", "nominal", "keterangan", "createdAt", "updatedAt"],
    idCol: 0
  },
  {
    key: "REKRUITMEN_FORM",
    name: "REKRUITMEN_FORM",
    idPrefix: "RF",
    headers: ["id", "title", "description", "status", "createdAt", "updatedAt"],
    keys: ["id", "title", "description", "status", "createdAt", "updatedAt"],
    idCol: 0
  },
  {
    key: "REKRUITMEN_FIELDS",
    name: "REKRUITMEN_FIELDS",
    idPrefix: "RFLD",
    headers: ["id", "formId", "label", "description", "fieldType", "required", "options", "sortOrder", "placeholder", "exampleImageUrl", "exampleImageTitle", "maxFileSize", "allowedFileTypes", "createdAt", "updatedAt"],
    keys: ["id", "formId", "label", "description", "fieldType", "required", "options", "sortOrder", "placeholder", "exampleImageUrl", "exampleImageTitle", "maxFileSize", "allowedFileTypes", "createdAt", "updatedAt"],
    idCol: 0
  },
  {
    key: "REKRUITMEN_SUBMISSIONS",
    name: "REKRUITMEN_SUBMISSIONS",
    idPrefix: "RSUB",
    headers: ["id", "formId", "status", "adminNote", "submittedAt", "reviewedAt", "reviewedBy"],
    keys: ["id", "formId", "status", "adminNote", "submittedAt", "reviewedAt", "reviewedBy"],
    idCol: 0
  },
  {
    key: "REKRUITMEN_ANSWERS",
    name: "REKRUITMEN_ANSWERS",
    idPrefix: "RANS",
    headers: ["id", "submissionId", "fieldId", "value", "fileUrl", "fileName", "fileType", "fileSize", "createdAt"],
    keys: ["id", "submissionId", "fieldId", "value", "fileUrl", "fileName", "fileType", "fileSize", "createdAt"],
    idCol: 0
  },
  {
    key: "USERS",
    name: "USERS",
    idPrefix: "USR",
    headers: ["id", "username", "password", "nama", "role", "status", "createdAt", "updatedAt"],
    keys: ["id", "username", "password", "nama", "role", "status", "createdAt", "updatedAt"],
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
    if (action === "setup") {
      ensureSetup();
      return jsonResponse({ success: true, message: "Setup selesai." });
    }

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

    // Transaksi Group
    case "getTransaksiGroup":
      return getTransaksiGroup();
    case "addTransaksiGroup":
      return addTransaksiGroup(data);
    case "updateTransaksiGroup":
      return updateTransaksiGroup(data);
    case "deleteTransaksiGroup":
      return deleteTransaksiGroup(data);

    // Transaksi Detail
    case "getTransaksiDetail":
      return getTransaksiDetail(data.transaksiGroupId);
    case "addTransaksiDetail":
      return addTransaksiDetail(data);
    case "updateTransaksiDetail":
      return updateTransaksiDetail(data);
    case "deleteTransaksiDetail":
      return deleteTransaksiDetail(data);

    // Rekrutmen Form
    case "getRekrutmenForm":
      return getRekrutmenForm();
    case "addRekrutmenForm":
      return addRekrutmenForm(data);
    case "updateRekrutmenForm":
      return updateRekrutmenForm(data);
    case "deleteRekrutmenForm":
      return deleteRekrutmenForm(data);

    // Rekrutmen Fields
    case "getRekrutmenFields":
      return getRekrutmenFields(data.formId);
    case "addRekrutmenField":
      return addRekrutmenField(data);
    case "updateRekrutmenField":
      return updateRekrutmenField(data);
    case "deleteRekrutmenField":
      return deleteRekrutmenField(data);
    case "reorderRekrutmenFields":
      return reorderRekrutmenFields(data.formId, data.fieldOrders);

    // Rekrutmen Submissions
    case "getRekrutmenSubmissions":
      return getRekrutmenSubmissions(data.formId);
    case "addRekrutmenSubmission":
      return addRekrutmenSubmission(data);
    case "updateRekrutmenSubmission":
      return updateRekrutmenSubmission(data.id, data);
    case "deleteRekrutmenSubmission":
      return deleteRekrutmenSubmission(data);
    case "getRekrutmenSubmissionDetail":
      return getRekrutmenSubmissionDetail(data.submissionId);
    case "getRekrutmenAnswers":
      return getRekrutmenAnswers(data.submissionId);
    case "getRekrutmenStats":
      return getRekrutmenStats(data.formId);

    // Users & Autentikasi
    case "login":
      return loginUser(data.username, data.password);
    case "getUsers":
      return getUsers();
    case "addUser":
      return addUser(data);
    case "updateUser":
      return updateUser(data);
    case "deleteUser":
      return deleteUser(data);

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

function getOrCreateSheet(cfg) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  if (!sheet) {
    sheet = ss.insertSheet(cfg.name);
  }
  ensureHeaders(sheet, cfg);
  return sheet;
}

function ensureSetup() {
  for (var i = 0; i < SHEET_CONFIG.length; i++) {
    getOrCreateSheet(SHEET_CONFIG[i]);
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
  var sheet = getOrCreateSheet(cfg);
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
  var sheet = getOrCreateSheet(cfg);
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
  var sheet = getOrCreateSheet(cfg);
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

// ============================================================
// TRANSAKSI GROUP & DETAIL
// ============================================================

function getTransaksiGroup() {
  var groups = readRows(getSheetConfig("TRANSAKSI_GROUP"));
  var details = readRows(getSheetConfig("TRANSAKSI_DETAIL"));

  var statsByGroupId = {};
  for (var i = 0; i < details.length; i++) {
    var d = details[i];
    var gid = String(d.transaksiGroupId);
    if (!statsByGroupId[gid]) {
      statsByGroupId[gid] = { count: 0, pemasukan: 0, pengeluaran: 0 };
    }
    var nom = Number(d.nominal) || 0;
    statsByGroupId[gid].count++;
    if (d.jenis === "Pemasukan") {
      statsByGroupId[gid].pemasukan += nom;
    } else {
      statsByGroupId[gid].pengeluaran += nom;
    }
  }

  for (var j = 0; j < groups.length; j++) {
    var g = groups[j];
    var st = statsByGroupId[String(g.id)] || { count: 0, pemasukan: 0, pengeluaran: 0 };
    g.totalTransaksi = st.count;
    g.totalPemasukan = st.pemasukan;
    g.totalPengeluaran = st.pengeluaran;
    g.saldo = st.pemasukan - st.pengeluaran;
  }
  return groups;
}

function addTransaksiGroup(data) {
  if (!data.judul || !String(data.judul).trim()) throw new Error("Judul transaksi wajib diisi.");
  var cfg = getSheetConfig("TRANSAKSI_GROUP");
  var id = generateId(cfg);
  var now = new Date().toISOString();
  var sheet = getOrCreateSheet(cfg);
  var row = [
    id,
    String(data.judul || "").trim(),
    String(data.tanggal || formatDate(new Date())),
    String(data.keterangan || "").trim(),
    now,
    now
  ];
  sheet.appendRow(row);
  return {
    id: id,
    judul: row[1],
    tanggal: row[2],
    keterangan: row[3],
    createdAt: row[4],
    updatedAt: row[5],
    totalTransaksi: 0,
    totalPemasukan: 0,
    totalPengeluaran: 0,
    saldo: 0,
    message: "Data berhasil disimpan."
  };
}

function updateTransaksiGroup(data) {
  if (!data.id) throw new Error("ID transaksi group tidak ditemukan.");
  if (!data.judul || !String(data.judul).trim()) throw new Error("Judul transaksi wajib diisi.");
  var cfg = getSheetConfig("TRANSAKSI_GROUP");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Transaksi group tidak ditemukan.");
  var sheet = getOrCreateSheet(cfg);
  var existingRow = sheet.getRange(rowIndex, 1, 1, cfg.keys.length).getValues()[0];
  var createdAt = existingRow[4] || new Date().toISOString();
  var now = new Date().toISOString();
  var row = [
    data.id,
    String(data.judul || "").trim(),
    String(data.tanggal || existingRow[2] || ""),
    String(data.keterangan || "").trim(),
    createdAt,
    now
  ];
  sheet.getRange(rowIndex, 1, 1, cfg.keys.length).setValues([row]);
  return {
    id: data.id,
    judul: row[1],
    tanggal: row[2],
    keterangan: row[3],
    createdAt: row[4],
    updatedAt: row[5],
    message: "Data berhasil disimpan."
  };
}

function deleteTransaksiGroup(data) {
  if (!data.id) throw new Error("ID transaksi group tidak ditemukan.");
  var cfg = getSheetConfig("TRANSAKSI_GROUP");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Transaksi group tidak ditemukan.");
  var sheet = getOrCreateSheet(cfg);
  sheet.deleteRow(rowIndex);

  // Hapus semua detail yang terkait
  var detailCfg = getSheetConfig("TRANSAKSI_DETAIL");
  var detailSheet = getOrCreateSheet(detailCfg);
  var lastRow = detailSheet.getLastRow();
  if (lastRow > 1) {
    var detailRows = detailSheet.getRange(2, 1, lastRow - 1, detailCfg.keys.length).getValues();
    for (var r = detailRows.length - 1; r >= 0; r--) {
      if (String(detailRows[r][1]) === String(data.id)) {
        detailSheet.deleteRow(r + 2);
      }
    }
  }
  return { message: "Data berhasil dihapus." };
}

// ---------------- TRANSAKSI DETAIL ----------------

function getTransaksiDetail(transaksiGroupId) {
  var rows = readRows(getSheetConfig("TRANSAKSI_DETAIL"));
  if (!transaksiGroupId) return rows;
  return rows.filter(function (r) {
    return String(r.transaksiGroupId) === String(transaksiGroupId);
  });
}

function validateTransaksiDetail(data) {
  if (!data.transaksiGroupId) throw new Error("ID group transaksi wajib diisi.");
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

function addTransaksiDetail(data) {
  validateTransaksiDetail(data);
  var cfg = getSheetConfig("TRANSAKSI_DETAIL");
  var id = generateId(cfg);
  var now = new Date().toISOString();
  var sheet = getOrCreateSheet(cfg);
  var row = [
    id,
    String(data.transaksiGroupId),
    String(data.tanggal || ""),
    String(data.jenis || ""),
    String(data.kategori || "").trim(),
    Number(data.nominal) || 0,
    String(data.keterangan || "").trim(),
    now,
    now
  ];
  sheet.appendRow(row);
  return {
    id: id,
    transaksiGroupId: row[1],
    tanggal: row[2],
    jenis: row[3],
    kategori: row[4],
    nominal: row[5],
    keterangan: row[6],
    createdAt: row[7],
    updatedAt: row[8],
    message: "Data berhasil disimpan."
  };
}

function updateTransaksiDetail(data) {
  if (!data.id) throw new Error("ID detail transaksi tidak ditemukan.");
  validateTransaksiDetail(data);
  var cfg = getSheetConfig("TRANSAKSI_DETAIL");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Detail transaksi tidak ditemukan.");
  var sheet = getOrCreateSheet(cfg);
  var existingRow = sheet.getRange(rowIndex, 1, 1, cfg.keys.length).getValues()[0];
  var createdAt = existingRow[7] || new Date().toISOString();
  var now = new Date().toISOString();
  var row = [
    data.id,
    String(data.transaksiGroupId || existingRow[1]),
    String(data.tanggal || ""),
    String(data.jenis || ""),
    String(data.kategori || "").trim(),
    Number(data.nominal) || 0,
    String(data.keterangan || "").trim(),
    createdAt,
    now
  ];
  sheet.getRange(rowIndex, 1, 1, cfg.keys.length).setValues([row]);
  return {
    id: data.id,
    transaksiGroupId: row[1],
    tanggal: row[2],
    jenis: row[3],
    kategori: row[4],
    nominal: row[5],
    keterangan: row[6],
    createdAt: row[7],
    updatedAt: row[8],
    message: "Data berhasil disimpan."
  };
}

function deleteTransaksiDetail(data) {
  if (!data.id) throw new Error("ID detail transaksi tidak ditemukan.");
  var cfg = getSheetConfig("TRANSAKSI_DETAIL");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Detail transaksi tidak ditemukan.");
  var sheet = getOrCreateSheet(cfg);
  sheet.deleteRow(rowIndex);
  return { message: "Data berhasil dihapus." };
}

// ============================================================
// REKRUITMEN (FORM, FIELDS, SUBMISSIONS, ANSWERS)
// ============================================================

function getRekrutmenForm() {
  var rows = readRows(getSheetConfig("REKRUITMEN_FORM"));
  if (rows.length === 0) {
    return null;
  }
  return rows[rows.length - 1];
}

function addRekrutmenForm(data) {
  if (!data.title || !String(data.title).trim()) throw new Error("Judul formulir wajib diisi.");
  var cfg = getSheetConfig("REKRUITMEN_FORM");
  var id = generateId(cfg);
  var now = new Date().toISOString();
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var row = [
    id,
    String(data.title || "").trim(),
    String(data.description || "").trim(),
    String(data.status || "dibuka"),
    now,
    now
  ];
  sheet.appendRow(row);
  return {
    id: id,
    title: row[1],
    description: row[2],
    status: row[3],
    createdAt: row[4],
    updatedAt: row[5],
    message: "Formulir berhasil dibuat."
  };
}

function updateRekrutmenForm(data) {
  if (!data.id) throw new Error("ID formulir tidak ditemukan.");
  if (!data.title || !String(data.title).trim()) throw new Error("Judul formulir wajib diisi.");
  var cfg = getSheetConfig("REKRUITMEN_FORM");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Formulir tidak ditemukan.");
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var existingRow = sheet.getRange(rowIndex, 1, 1, cfg.keys.length).getValues()[0];
  var createdAt = existingRow[4] || new Date().toISOString();
  var now = new Date().toISOString();
  var row = [
    data.id,
    String(data.title || "").trim(),
    String(data.description || "").trim(),
    String(data.status || existingRow[3] || "dibuka"),
    createdAt,
    now
  ];
  sheet.getRange(rowIndex, 1, 1, cfg.keys.length).setValues([row]);
  return {
    id: data.id,
    title: row[1],
    description: row[2],
    status: row[3],
    createdAt: row[4],
    updatedAt: row[5],
    message: "Formulir berhasil diperbarui."
  };
}

function deleteRekrutmenForm(data) {
  if (!data.id) throw new Error("ID formulir tidak ditemukan.");
  var cfg = getSheetConfig("REKRUITMEN_FORM");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Formulir tidak ditemukan.");
  var ss = getSpreadsheet();
  ss.getSheetByName(cfg.name).deleteRow(rowIndex);

  // Hapus semua fields terkait
  var fldCfg = getSheetConfig("REKRUITMEN_FIELDS");
  var fldSheet = ss.getSheetByName(fldCfg.name);
  var fldLast = fldSheet.getLastRow();
  if (fldLast > 1) {
    var fldRows = fldSheet.getRange(2, 1, fldLast - 1, fldCfg.keys.length).getValues();
    for (var r = fldRows.length - 1; r >= 0; r--) {
      if (String(fldRows[r][1]) === String(data.id)) {
        fldSheet.deleteRow(r + 2);
      }
    }
  }

  // Hapus submissions dan answers terkait
  var subCfg = getSheetConfig("REKRUITMEN_SUBMISSIONS");
  var subSheet = ss.getSheetByName(subCfg.name);
  var subLast = subSheet.getLastRow();
  var deletedSubIds = {};
  if (subLast > 1) {
    var subRows = subSheet.getRange(2, 1, subLast - 1, subCfg.keys.length).getValues();
    for (var s = subRows.length - 1; s >= 0; s--) {
      if (String(subRows[s][1]) === String(data.id)) {
        deletedSubIds[String(subRows[s][0])] = true;
        subSheet.deleteRow(s + 2);
      }
    }
  }

  var ansCfg = getSheetConfig("REKRUITMEN_ANSWERS");
  var ansSheet = ss.getSheetByName(ansCfg.name);
  var ansLast = ansSheet.getLastRow();
  if (ansLast > 1) {
    var ansRows = ansSheet.getRange(2, 1, ansLast - 1, ansCfg.keys.length).getValues();
    for (var a = ansRows.length - 1; a >= 0; a--) {
      if (deletedSubIds[String(ansRows[a][1])]) {
        ansSheet.deleteRow(a + 2);
      }
    }
  }

  return { message: "Formulir berhasil dihapus." };
}

// ---------------- REKRUITMEN FIELDS ----------------

function getRekrutmenFields(formId) {
  var rows = readRows(getSheetConfig("REKRUITMEN_FIELDS"));
  var filtered = rows;
  if (formId) {
    filtered = rows.filter(function (f) {
      return String(f.formId) === String(formId);
    });
  }
  filtered.sort(function (a, b) {
    return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
  });
  return filtered;
}

function addRekrutmenField(data) {
  if (!data.formId) throw new Error("ID formulir wajib diisi.");
  if (!data.label || !String(data.label).trim()) throw new Error("Label pertanyaan wajib diisi.");
  var cfg = getSheetConfig("REKRUITMEN_FIELDS");
  var id = generateId(cfg);
  var now = new Date().toISOString();
  var sheet = getOrCreateSheet(cfg);

  var sortOrder = data.sortOrder;
  if (sortOrder === undefined || sortOrder === null) {
    var currentFields = getRekrutmenFields(data.formId);
    sortOrder = currentFields.length;
  }

  var isUpload = data.fieldType === "image" || data.fieldType === "file";
  var exampleImageUrl = isUpload ? String(data.exampleImageUrl || "").trim() : "";
  var exampleImageTitle = isUpload ? String(data.exampleImageTitle || "").trim() : "";
  var maxFileSize = isUpload ? (Number(data.maxFileSize) || (data.fieldType === "image" ? 2 : 5)) : 0;

  var row = [
    id,
    String(data.formId),
    String(data.label || "").trim(),
    String(data.description || "").trim(),
    String(data.fieldType || "text"),
    Boolean(data.required),
    typeof data.options === "string" ? data.options : JSON.stringify(data.options || []),
    Number(sortOrder) || 0,
    String(data.placeholder || "").trim(),
    exampleImageUrl,
    exampleImageTitle,
    maxFileSize,
    typeof data.allowedFileTypes === "string" ? data.allowedFileTypes : JSON.stringify(data.allowedFileTypes || []),
    now,
    now
  ];
  sheet.appendRow(row);
  return {
    id: id,
    formId: row[1],
    label: row[2],
    description: row[3],
    fieldType: row[4],
    required: row[5],
    options: row[6],
    sortOrder: row[7],
    placeholder: row[8],
    exampleImageUrl: row[9],
    exampleImageTitle: row[10],
    maxFileSize: row[11],
    allowedFileTypes: row[12],
    createdAt: row[13],
    updatedAt: row[14],
    message: "Pertanyaan berhasil ditambahkan."
  };
}

function updateRekrutmenField(data) {
  if (!data.id) throw new Error("ID pertanyaan tidak ditemukan.");
  var cfg = getSheetConfig("REKRUITMEN_FIELDS");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Pertanyaan tidak ditemukan.");
  var sheet = getOrCreateSheet(cfg);
  var existingRow = sheet.getRange(rowIndex, 1, 1, cfg.keys.length).getValues()[0];
  var createdAt = existingRow[13] || existingRow[8] || new Date().toISOString();
  var now = new Date().toISOString();

  var fType = data.fieldType || existingRow[4] || "text";
  var isUpload = fType === "image" || fType === "file";
  var exampleImageUrl = isUpload ? (data.exampleImageUrl !== undefined ? String(data.exampleImageUrl).trim() : String(existingRow[9] || "")) : "";
  var exampleImageTitle = isUpload ? (data.exampleImageTitle !== undefined ? String(data.exampleImageTitle).trim() : String(existingRow[10] || "")) : "";
  var maxFileSize = isUpload ? (data.maxFileSize !== undefined ? Number(data.maxFileSize) : (Number(existingRow[11]) || 2)) : 0;

  var row = [
    data.id,
    String(data.formId || existingRow[1]),
    String(data.label !== undefined ? data.label : existingRow[2]).trim(),
    String(data.description !== undefined ? data.description : existingRow[3]).trim(),
    String(fType),
    data.required !== undefined ? Boolean(data.required) : Boolean(existingRow[5]),
    data.options !== undefined ? (typeof data.options === "string" ? data.options : JSON.stringify(data.options)) : existingRow[6],
    data.sortOrder !== undefined ? Number(data.sortOrder) : Number(existingRow[7]),
    data.placeholder !== undefined ? String(data.placeholder).trim() : String(existingRow[8] || ""),
    exampleImageUrl,
    exampleImageTitle,
    maxFileSize,
    data.allowedFileTypes !== undefined ? (typeof data.allowedFileTypes === "string" ? data.allowedFileTypes : JSON.stringify(data.allowedFileTypes)) : existingRow[12],
    createdAt,
    now
  ];
  sheet.getRange(rowIndex, 1, 1, cfg.keys.length).setValues([row]);
  return {
    id: data.id,
    formId: row[1],
    label: row[2],
    description: row[3],
    fieldType: row[4],
    required: row[5],
    options: row[6],
    sortOrder: row[7],
    placeholder: row[8],
    exampleImageUrl: row[9],
    exampleImageTitle: row[10],
    maxFileSize: row[11],
    allowedFileTypes: row[12],
    createdAt: row[13],
    updatedAt: row[14],
    message: "Pertanyaan berhasil diperbarui."
  };
}

function deleteRekrutmenField(data) {
  if (!data.id) throw new Error("ID pertanyaan tidak ditemukan.");
  var cfg = getSheetConfig("REKRUITMEN_FIELDS");
  var rowIndex = findRowIndex(cfg, data.id);
  if (rowIndex === -1) throw new Error("Pertanyaan tidak ditemukan.");
  var ss = getSpreadsheet();
  ss.getSheetByName(cfg.name).deleteRow(rowIndex);
  return { message: "Pertanyaan berhasil dihapus." };
}

function reorderRekrutmenFields(formId, fieldOrders) {
  if (!Array.isArray(fieldOrders) || fieldOrders.length === 0) {
    return { message: "Tidak ada data urutan." };
  }
  var cfg = getSheetConfig("REKRUITMEN_FIELDS");
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { message: "Sheet kosong." };

  var rows = sheet.getRange(2, 1, lastRow - 1, cfg.keys.length).getValues();
  var orderMap = {};
  for (var i = 0; i < fieldOrders.length; i++) {
    orderMap[String(fieldOrders[i].id)] = Number(fieldOrders[i].sortOrder);
  }

  for (var r = 0; r < rows.length; r++) {
    var id = String(rows[r][0]);
    if (orderMap[id] !== undefined) {
      rows[r][7] = orderMap[id];
      rows[r][9] = new Date().toISOString();
    }
  }

  sheet.getRange(2, 1, lastRow - 1, cfg.keys.length).setValues(rows);
  return { message: "Urutan berhasil diperbarui." };
}

// ---------------- REKRUITMEN SUBMISSIONS & ANSWERS ----------------

function getRekrutmenSubmissions(formId) {
  var subCfg = getSheetConfig("REKRUITMEN_SUBMISSIONS");
  var allSubs = readRows(subCfg);
  var subs = allSubs;
  if (formId) {
    subs = allSubs.filter(function (s) {
      return String(s.formId) === String(formId);
    });
  }

  var ansCfg = getSheetConfig("REKRUITMEN_ANSWERS");
  var allAnswers = readRows(ansCfg);
  var fldCfg = getSheetConfig("REKRUITMEN_FIELDS");
  var allFields = readRows(fldCfg);
  var fieldMap = {};
  for (var f = 0; f < allFields.length; f++) {
    fieldMap[String(allFields[f].id)] = allFields[f];
  }

  var answersBySubId = {};
  for (var a = 0; a < allAnswers.length; a++) {
    var ans = allAnswers[a];
    var sid = String(ans.submissionId);
    if (!answersBySubId[sid]) answersBySubId[sid] = [];
    var fieldObj = fieldMap[String(ans.fieldId)] || { id: ans.fieldId, label: "", fieldType: "text" };
    ans.field = fieldObj;
    answersBySubId[sid].push(ans);
  }

  for (var s = 0; s < subs.length; s++) {
    subs[s].answers = answersBySubId[String(subs[s].id)] || [];
  }
  return subs;
}

function getRekrutmenSubmissionDetail(submissionId) {
  if (!submissionId) throw new Error("ID pendaftaran tidak ditemukan.");
  var subCfg = getSheetConfig("REKRUITMEN_SUBMISSIONS");
  var subs = readRows(subCfg);
  var sub = null;
  for (var i = 0; i < subs.length; i++) {
    if (String(subs[i].id) === String(submissionId)) {
      sub = subs[i];
      break;
    }
  }
  if (!sub) throw new Error("Data pendaftaran tidak ditemukan.");

  var ansCfg = getSheetConfig("REKRUITMEN_ANSWERS");
  var answers = readRows(ansCfg).filter(function (a) {
    return String(a.submissionId) === String(submissionId);
  });

  var fldCfg = getSheetConfig("REKRUITMEN_FIELDS");
  var fields = readRows(fldCfg);
  var fieldMap = {};
  for (var f = 0; f < fields.length; f++) {
    fieldMap[String(fields[f].id)] = fields[f];
  }

  for (var j = 0; j < answers.length; j++) {
    answers[j].field = fieldMap[String(answers[j].fieldId)] || { id: answers[j].fieldId, label: "", fieldType: "text" };
  }
  sub.answers = answers;
  return sub;
}

function getRekrutmenAnswers(submissionId) {
  if (!submissionId) return [];
  var ansCfg = getSheetConfig("REKRUITMEN_ANSWERS");
  var allAnswers = readRows(ansCfg);
  var fldCfg = getSheetConfig("REKRUITMEN_FIELDS");
  var allFields = readRows(fldCfg);
  var fieldMap = {};
  for (var f = 0; f < allFields.length; f++) {
    fieldMap[String(allFields[f].id)] = allFields[f];
  }

  var filtered = allAnswers.filter(function (a) {
    return String(a.submissionId) === String(submissionId);
  });
  for (var i = 0; i < filtered.length; i++) {
    filtered[i].field = fieldMap[String(filtered[i].fieldId)] || { id: filtered[i].fieldId, label: "", fieldType: "text" };
  }
  return filtered;
}

function addRekrutmenSubmission(data) {
  if (!data.formId) throw new Error("ID formulir wajib diisi.");

  // Validasi status formulir aktif / tidak aktif
  var formCfg = getSheetConfig("REKRUITMEN_FORM");
  var forms = readRows(formCfg);
  var targetForm = null;
  for (var f = 0; f < forms.length; f++) {
    if (String(forms[f].id) === String(data.formId)) {
      targetForm = forms[f];
      break;
    }
  }
  if (!targetForm && forms.length > 0) {
    targetForm = forms[forms.length - 1];
  }
  if (targetForm && String(targetForm.status).toLowerCase() !== "dibuka") {
    throw new Error("Formulir pendaftaran saat ini sedang tidak aktif atau ditutup. Pendaftaran baru tidak dapat diproses.");
  }

  var subCfg = getSheetConfig("REKRUITMEN_SUBMISSIONS");
  var subId = generateId(subCfg);
  var now = new Date().toISOString();
  var ss = getSpreadsheet();
  var subSheet = ss.getSheetByName(subCfg.name);

  var subRow = [
    subId,
    String(data.formId),
    String(data.status || "menunggu"),
    String(data.adminNote || "").trim(),
    now,
    "",
    ""
  ];
  subSheet.appendRow(subRow);

  // Simpan answers jika disertakan
  var answers = data.answers;
  if (Array.isArray(answers) && answers.length > 0) {
    var ansCfg = getSheetConfig("REKRUITMEN_ANSWERS");
    var ansSheet = ss.getSheetByName(ansCfg.name);
    for (var i = 0; i < answers.length; i++) {
      var item = answers[i];
      var ansId = generateId(ansCfg);
      var ansRow = [
        ansId,
        subId,
        String(item.fieldId || ""),
        String(item.value || ""),
        String(item.fileUrl || ""),
        String(item.fileName || ""),
        String(item.fileType || ""),
        Number(item.fileSize) || 0,
        now
      ];
      ansSheet.appendRow(ansRow);
    }
  }

  return {
    id: subId,
    formId: subRow[1],
    status: subRow[2],
    adminNote: subRow[3],
    submittedAt: subRow[4],
    reviewedAt: null,
    reviewedBy: null,
    message: "Pendaftaran berhasil dikirim."
  };
}

function updateRekrutmenSubmission(id, data) {
  if (!id) throw new Error("ID pendaftaran tidak ditemukan.");
  var cfg = getSheetConfig("REKRUITMEN_SUBMISSIONS");
  var rowIndex = findRowIndex(cfg, id);
  if (rowIndex === -1) throw new Error("Data pendaftaran tidak ditemukan.");
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  var existingRow = sheet.getRange(rowIndex, 1, 1, cfg.keys.length).getValues()[0];

  var newStatus = data.status !== undefined ? String(data.status) : existingRow[2];
  var adminNote = data.adminNote !== undefined ? String(data.adminNote).trim() : existingRow[3];
  var reviewedAt = (newStatus !== "menunggu" && !existingRow[5]) ? new Date().toISOString() : existingRow[5];
  var reviewedBy = data.reviewedBy !== undefined ? String(data.reviewedBy) : existingRow[6];

  var row = [
    id,
    existingRow[1],
    newStatus,
    adminNote,
    existingRow[4],
    reviewedAt,
    reviewedBy
  ];
  sheet.getRange(rowIndex, 1, 1, cfg.keys.length).setValues([row]);
  return {
    id: id,
    formId: row[1],
    status: row[2],
    adminNote: row[3],
    submittedAt: row[4],
    reviewedAt: row[5] || null,
    reviewedBy: row[6] || null,
    message: "Status pendaftaran berhasil diperbarui."
  };
}

function deleteRekrutmenSubmission(data) {
  if (!data.id) throw new Error("ID pendaftaran tidak ditemukan.");
  var subCfg = getSheetConfig("REKRUITMEN_SUBMISSIONS");
  var rowIndex = findRowIndex(subCfg, data.id);
  if (rowIndex === -1) throw new Error("Data pendaftaran tidak ditemukan.");
  var ss = getSpreadsheet();
  ss.getSheetByName(subCfg.name).deleteRow(rowIndex);

  // Hapus semua answers terkait
  var ansCfg = getSheetConfig("REKRUITMEN_ANSWERS");
  var ansSheet = ss.getSheetByName(ansCfg.name);
  var ansLast = ansSheet.getLastRow();
  if (ansLast > 1) {
    var ansRows = ansSheet.getRange(2, 1, ansLast - 1, ansCfg.keys.length).getValues();
    for (var a = ansRows.length - 1; a >= 0; a--) {
      if (String(ansRows[a][1]) === String(data.id)) {
        ansSheet.deleteRow(a + 2);
      }
    }
  }
  return { message: "Data pendaftaran berhasil dihapus." };
}

function getRekrutmenStats(formId) {
  var subCfg = getSheetConfig("REKRUITMEN_SUBMISSIONS");
  var allSubs = readRows(subCfg);
  var subs = allSubs;
  if (formId) {
    subs = allSubs.filter(function (s) {
      return String(s.formId) === String(formId);
    });
  }

  var total = subs.length;
  var menunggu = 0, lolos = 0, tidakLolos = 0;
  for (var i = 0; i < subs.length; i++) {
    var st = subs[i].status;
    if (st === "lolos") lolos++;
    else if (st === "tidak_lolos") tidakLolos++;
    else menunggu++;
  }
  return {
    total: total,
    menunggu: menunggu,
    lolos: lolos,
    tidakLolos: tidakLolos
  };
}

// ============================================================
// MODUL USERS & AUTENTIKASI
// ============================================================

function loginUser(username, password) {
  if (!username || !password) {
    throw new Error("Username dan password wajib diisi.");
  }

  var cfg = getSheetConfig("USERS");
  var sheet = getOrCreateSheet(cfg);

  // Pastikan akun admin default dibuat jika sheet masih kosong
  if (sheet.getLastRow() <= 1) {
    var now = new Date().toISOString();
    sheet.appendRow(["USR-001", "admin", "admin", "Administrator MB Chondro", "admin", "Aktif", now, now]);
  }

  var users = readRows(cfg);
  var found = null;

  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (
      String(u.username || "").trim().toLowerCase() === String(username).trim().toLowerCase() &&
      String(u.password || "").trim() === String(password).trim()
    ) {
      found = u;
      break;
    }
  }

  if (!found) {
    throw new Error("Username atau password salah.");
  }

  if (String(found.status || "").toLowerCase() !== "aktif") {
    throw new Error("Akun ini berstatus tidak aktif. Hubungi administrator.");
  }

  var tokenPayload = found.id + ":" + found.username + ":" + new Date().getTime();
  var token = Utilities.base64Encode(tokenPayload);

  return {
    id: found.id,
    username: found.username,
    nama: found.nama || found.username,
    role: found.role || "admin",
    status: found.status || "Aktif",
    token: token
  };
}

function getUsers() {
  var cfg = getSheetConfig("USERS");
  var users = readRows(cfg);
  return users.map(function(u) {
    return {
      id: u.id,
      username: u.username,
      nama: u.nama,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    };
  });
}

function addUser(data) {
  if (!data.username || !data.password) {
    throw new Error("Username dan password wajib diisi.");
  }
  var cfg = getSheetConfig("USERS");
  var users = readRows(cfg);
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username).toLowerCase() === String(data.username).toLowerCase()) {
      throw new Error("Username '" + data.username + "' sudah digunakan.");
    }
  }
  var now = new Date().toISOString();
  var item = {
    username: String(data.username).trim(),
    password: String(data.password).trim(),
    nama: data.nama || data.username,
    role: data.role || "admin",
    status: data.status || "Aktif",
    createdAt: now,
    updatedAt: now
  };
  return createRow(cfg, item);
}

function updateUser(data) {
  if (!data.id) throw new Error("ID Pengguna tidak ditemukan.");
  var cfg = getSheetConfig("USERS");
  data.updatedAt = new Date().toISOString();
  return updateRow(cfg, data.id, data);
}

function deleteUser(data) {
  if (!data.id) throw new Error("ID Pengguna tidak ditemukan.");
  var cfg = getSheetConfig("USERS");
  return deleteRow(cfg, data.id);
}