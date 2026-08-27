import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Pencil,
  Camera,
} from "lucide-react";
import type { RekrutmenField, RekrutmenForm, RekrutmenFieldType, RekrutmenFieldOption } from "../../types";
import { compressImageToSafeHd } from "../../services/api";
import { Modal } from "../ui/Modal";
import { ConfirmDialog } from "../ui/ConfirmDialog";

const FIELD_TYPES: { value: RekrutmenFieldType; label: string; hasOptions: boolean; isUpload: boolean; icon: string }[] = [
  { value: "text", label: "Teks Pendek", hasOptions: false, isUpload: false, icon: "Aa" },
  { value: "textarea", label: "Teks Panjang (Textarea)", hasOptions: false, isUpload: false, icon: "¶" },
  { value: "number", label: "Angka (Number)", hasOptions: false, isUpload: false, icon: "123" },
  { value: "date", label: "Tanggal (Date)", hasOptions: false, isUpload: false, icon: "📅" },
  { value: "radio", label: "Pilihan Tunggal (Radio)", hasOptions: true, isUpload: false, icon: "🔘" },
  { value: "checkbox", label: "Pilihan Ganda (Checkbox)", hasOptions: true, isUpload: false, icon: "☑️" },
  { value: "select", label: "Dropdown Pilihan", hasOptions: true, isUpload: false, icon: "▾" },
  { value: "image", label: "Upload Foto (JPG, PNG, WEBP)", hasOptions: false, isUpload: true, icon: "📸" },
  { value: "file", label: "Upload Dokumen (PDF, JPG, PNG)", hasOptions: false, isUpload: true, icon: "📄" },
];

interface FormBuilderProps {
  form: RekrutmenForm;
  fields: RekrutmenField[];
  onSaveForm: (override?: Partial<RekrutmenForm>) => Promise<boolean>;
  onAddField: (field: Omit<RekrutmenField, "id" | "createdAt" | "updatedAt">) => Promise<boolean>;
  onUpdateField: (id: string, field: Omit<RekrutmenField, "id" | "createdAt" | "updatedAt">) => Promise<boolean>;
  onDeleteField: (id: string) => Promise<boolean>;
  onReorderFields: (fieldOrders: { id: string; sortOrder: number }[]) => Promise<boolean>;
  onPreview: () => void;
  onCopyLink: () => void;
}

interface FormFieldData {
  label: string;
  description: string;
  placeholder: string;
  fieldType: RekrutmenFieldType;
  required: boolean;
  options: RekrutmenFieldOption[];
  exampleImageUrl: string;
  exampleImageTitle: string;
  maxFileSize: number; // in MB
}

const FIELD_EMPTY: FormFieldData = {
  label: "",
  description: "",
  placeholder: "",
  fieldType: "text",
  required: false,
  options: [],
  exampleImageUrl: "",
  exampleImageTitle: "",
  maxFileSize: 2,
};

export function FormBuilder({
  form,
  fields,
  onSaveForm,
  onAddField,
  onUpdateField,
  onDeleteField,
  onReorderFields,
  onPreview,
  onCopyLink,
}: FormBuilderProps) {
  const [activeTab, setActiveTab] = useState<"fields" | "settings">("fields");
  const [formSettings, setFormSettings] = useState({
    title: form.title,
    description: form.description,
    status: form.status,
  });
  const [savingForm, setSavingForm] = useState(false);

  const [editingField, setEditingField] = useState<RekrutmenField | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState<FormFieldData>(FIELD_EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savingField, setSavingField] = useState(false);
  const [deletingField, setDeletingField] = useState<RekrutmenField | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const [copySuccess, setCopySuccess] = useState(false);

  const sortedFields = useMemo(() => {
    return [...(Array.isArray(fields) ? fields : [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [fields]);

  useEffect(() => {
    setFormSettings({
      title: form.title,
      description: form.description,
      status: form.status,
    });
  }, [form]);

  const validateField = (f: FormFieldData): Record<string, string> => {
    const err: Record<string, string> = {};
    if (!f.label.trim()) err.label = "Label pertanyaan wajib diisi.";
    if (f.fieldType === "select" || f.fieldType === "radio" || f.fieldType === "checkbox") {
      const validOpts = f.options.filter((o) => o.value.trim() || o.label.trim());
      if (validOpts.length < 2) {
        err.options = "Minimal 2 pilihan jawaban wajib diisi.";
      }
    }
    return err;
  };

  const openAddField = () => {
    setEditingField(null);
    setFieldForm({
      ...FIELD_EMPTY,
      maxFileSize: 2,
    });
    setFieldErrors({});
    setIsFieldModalOpen(true);
  };

  const openEditField = (field: RekrutmenField) => {
    setEditingField(field);
    setFieldForm({
      label: field.label,
      description: field.description || "",
      placeholder: field.placeholder || "",
      fieldType: field.fieldType,
      required: field.required,
      options: (field.options || []).map((o) => ({ value: o.value, label: o.label })),
      exampleImageUrl: field.exampleImageUrl || "",
      exampleImageTitle: field.exampleImageTitle || "",
      maxFileSize: field.maxFileSize || (field.fieldType === "image" ? 2 : 5),
    });
    setFieldErrors({});
    setIsFieldModalOpen(true);
  };

  const handleFieldSubmit = async () => {
    const err = validateField(fieldForm);
    setFieldErrors(err);
    if (Object.keys(err).length > 0) return;

    setSavingField(true);
    const isUpload = fieldForm.fieldType === "image" || fieldForm.fieldType === "file";
    const payload: Omit<RekrutmenField, "id" | "createdAt" | "updatedAt"> = {
      formId: form.id,
      label: fieldForm.label.trim(),
      description: fieldForm.description.trim(),
      placeholder: fieldForm.placeholder.trim(),
      fieldType: fieldForm.fieldType,
      required: fieldForm.required,
      options: (fieldForm.fieldType === "select" || fieldForm.fieldType === "radio" || fieldForm.fieldType === "checkbox")
        ? fieldForm.options.filter((o) => o.value.trim() || o.label.trim())
        : [],
      sortOrder: editingField ? editingField.sortOrder : sortedFields.length + 1,
      exampleImageUrl: fieldForm.exampleImageUrl.trim(),
      exampleImageTitle: fieldForm.exampleImageTitle.trim(),
      maxFileSize: isUpload ? (fieldForm.maxFileSize || (fieldForm.fieldType === "image" ? 2 : 5)) : undefined,
      allowedFileTypes:
        fieldForm.fieldType === "image"
          ? ["jpg", "jpeg", "png", "webp"]
          : fieldForm.fieldType === "file"
          ? ["pdf", "jpg", "jpeg", "png"]
          : undefined,
    };

    let ok: boolean;
    if (editingField) {
      ok = await onUpdateField(editingField.id, payload);
    } else {
      ok = await onAddField(payload);
    }
    setSavingField(false);
    if (ok) {
      setIsFieldModalOpen(false);
      setEditingField(null);
      setFieldForm(FIELD_EMPTY);
    }
  };

  const handleDeleteField = async () => {
    if (!deletingField) return;
    const ok = await onDeleteField(deletingField.id);
    if (ok) setDeletingField(null);
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const reordered = [...sortedFields];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const fieldOrders = reordered.map((f, i) => ({ id: f.id, sortOrder: i + 1 }));
    await onReorderFields(fieldOrders);
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedFields.length) return;
    handleReorder(index, newIndex);
  };

  const addOption = () => {
    setFieldForm((prev) => ({ ...prev, options: [...prev.options, { value: "", label: "" }] }));
  };

  const removeOption = (idx: number) => {
    setFieldForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }));
  };

  const handleFormSave = async (overrideStatus?: "dibuka" | "ditutup") => {
    setSavingForm(true);
    const override = overrideStatus ? { status: overrideStatus } : undefined;
    await onSaveForm(override);
    setSavingForm(false);
  };

  const handleCopyLink = async () => {
    await onCopyLink();
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const [compressingImage, setCompressingImage] = useState(false);

  const handleExampleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Pilih file gambar yang valid (JPG, PNG, WEBP).");
        return;
      }
      try {
        setCompressingImage(true);
        const safeHdBase64 = await compressImageToSafeHd(file);
        setFieldForm((p) => ({
          ...p,
          exampleImageUrl: safeHdBase64,
          exampleImageTitle: p.exampleImageTitle || "Contoh foto yang benar",
        }));
      } catch (err) {
        alert("Gagal memproses gambar. Silakan coba lagi.");
      } finally {
        setCompressingImage(false);
      }
    }
  };

  const getFieldTypeLabel = (type: RekrutmenFieldType) => {
    return FIELD_TYPES.find((t) => t.value === type)?.label || type;
  };

  const publicLink = `${window.location.origin}/rekrutmen/form/${form.id || ""}`;

  return (
    <div className="form-builder" style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {/* Top Banner Card: Standout Red Container (Kotak Merah MB Chondro) */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #c8101e 0%, #a41111 50%, #8a1414 100%)",
          borderRadius: "var(--radius-lg, 14px)",
          padding: "16px 20px",
          color: "#ffffff",
          boxShadow: "0 6px 20px rgba(185, 28, 28, 0.22)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                {form.title || "Formulir Pendaftaran Anggota Baru MB Chondro"}
              </h2>
              <button
                type="button"
                onClick={() => handleFormSave(form.status === "dibuka" ? "ditutup" : "dibuka")}
                disabled={savingForm}
                title={form.status === "dibuka" ? "Klik untuk menonaktifkan link pendaftaran" : "Klik untuk mengaktifkan link pendaftaran"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: form.status === "dibuka" ? "rgba(16, 185, 129, 0.28)" : "rgba(239, 68, 68, 0.28)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: form.status === "dibuka" ? "#34d399" : "#f87171",
                  }}
                />
                {form.status === "dibuka" ? "🟢 Status: Aktif (Menerima Pendaftar)" : "🔴 Status: Ditutup (Draft)"}
              </button>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.45 }}>
              {form.description || "Silakan isi seluruh data dengan benar dan lengkap untuk proses seleksi calon anggota."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onPreview}
              style={{
                color: "#ffffff",
                borderColor: "rgba(255, 255, 255, 0.35)",
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(6px)",
                fontSize: "12.5px",
                fontWeight: 600,
              }}
            >
              <Eye size={14} /> Preview Form Publik
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleCopyLink}
              style={{
                color: "#ffffff",
                borderColor: "rgba(255, 255, 255, 0.35)",
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(6px)",
                fontSize: "12.5px",
                fontWeight: 600,
              }}
            >
              {copySuccess ? <Check size={14} style={{ color: "#34d399" }} /> : <Copy size={14} />}
              {copySuccess ? "Link Tersalin!" : "Salin Link Pendaftaran"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Pertanyaan vs Pengaturan Umum */}
      <div
        className="segment-group"
        style={{
          display: "flex",
          gap: 6,
          background: "var(--bg, #f8fafc)",
          padding: 4,
          borderRadius: "var(--radius-sm, 8px)",
          border: "1px solid var(--border, #e2e8f0)",
          width: "100%",
          maxWidth: "460px",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          className={`segment-btn ${activeTab === "fields" ? "active" : ""}`}
          onClick={() => setActiveTab("fields")}
          style={{
            flex: 1,
            padding: "8px 14px",
            borderRadius: "var(--radius-xs, 6px)",
            border: "none",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeTab === "fields" ? "#ffffff" : "transparent",
            color: activeTab === "fields" ? "var(--primary-700, #b91c1c)" : "var(--text-muted)",
            boxShadow: activeTab === "fields" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          📋 Daftar Pertanyaan ({sortedFields.length})
        </button>
        <button
          type="button"
          className={`segment-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
          style={{
            flex: 1,
            padding: "8px 14px",
            borderRadius: "var(--radius-xs, 6px)",
            border: "none",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeTab === "settings" ? "#ffffff" : "transparent",
            color: activeTab === "settings" ? "var(--primary-700, #b91c1c)" : "var(--text-muted)",
            boxShadow: activeTab === "settings" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          ⚙️ Pengaturan Formulir
        </button>
      </div>

      {/* TAB 1: DAFTAR PERTANYAAN (FORM BUILDER) */}
      {activeTab === "fields" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--navy-900)" }}>
                Struktur Pertanyaan Formulir
              </h3>
              <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                Susun pertanyaan yang wajib diisi calon anggota baru secara dinamis
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-sm" onClick={openAddField} style={{ fontSize: "12.5px" }}>
                <Plus size={15} /> Tambah Pertanyaan Baru
              </button>
            </div>
          </div>

          {sortedFields.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "48px 24px",
                textAlign: "center",
                background: "#ffffff",
                borderRadius: "var(--radius-md, 12px)",
                border: "1px dashed var(--border, #cbd5e1)",
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  background: "rgba(185, 28, 28, 0.08)",
                  color: "var(--primary-700, #b91c1c)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Sparkles size={26} />
              </div>
              <h4 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 600, color: "var(--navy-900)" }}>
                Belum Ada Pertanyaan
              </h4>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-muted)", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
                Mulai susun pertanyaan pendaftaran seperti Nama Lengkap, Nomor WhatsApp, Pas Foto Calon Anggota, dan Berkas Identitas.
              </p>
              <button className="btn btn-primary" onClick={openAddField}>
                <Plus size={16} /> Buat Pertanyaan Pertama
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sortedFields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", field.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData("text/plain");
                    const fromIndex = sortedFields.findIndex((f) => f.id === draggedId);
                    if (fromIndex !== -1 && fromIndex !== index) {
                      handleReorder(fromIndex, index);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    background: "#ffffff",
                    borderRadius: "var(--radius-sm, 10px)",
                    border: "1px solid var(--border, #e2e8f0)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    transition: "all 0.15s ease",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      cursor: "grab",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Geser untuk mengubah urutan"
                  >
                    <GripVertical size={18} />
                  </div>

                  <div style={{ width: 24, textAlign: "center", fontWeight: 700, fontSize: "13px", color: "var(--text-muted)" }}>
                    {index + 1}.
                  </div>

                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: field.fieldType === "image" ? "rgba(185, 28, 28, 0.1)" : "#f1f5f9",
                          color: field.fieldType === "image" ? "var(--primary-700, #b91c1c)" : "#475569",
                          border: field.fieldType === "image" ? "1px solid rgba(185, 28, 28, 0.2)" : "none",
                        }}
                      >
                        {getFieldTypeLabel(field.fieldType)}
                      </span>
                      {field.required ? (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "12px",
                            background: "rgba(220, 38, 38, 0.1)",
                            color: "#dc2626",
                          }}
                        >
                          * Wajib
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 500,
                            padding: "2px 7px",
                            borderRadius: "12px",
                            background: "#f8fafc",
                            color: "var(--text-muted)",
                          }}
                        >
                          Opsional
                        </span>
                      )}
                      {(field.fieldType === "image" || field.fieldType === "file") &&
                        Boolean(field.exampleImageUrl && field.exampleImageUrl.trim()) && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: "12px",
                            background: "rgba(37, 99, 235, 0.1)",
                            color: "#2563eb",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <ImageIcon size={12} /> Lampiran Contoh
                        </span>
                      )}
                    </div>
                    <strong style={{ fontSize: "14px", color: "var(--navy-900)" }}>{field.label}</strong>
                    {field.description && (
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>{field.description}</p>
                    )}
                    {field.options && field.options.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                        {field.options.map((opt, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: "11.5px",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: "4px",
                              padding: "1px 6px",
                              color: "#475569",
                            }}
                          >
                            {opt.label || opt.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions for each field */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => moveField(index, "up")}
                      disabled={index === 0}
                      title="Pindahkan ke atas"
                      style={{ padding: "6px", color: index === 0 ? "#cbd5e1" : "var(--navy-900)" }}
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => moveField(index, "down")}
                      disabled={index === sortedFields.length - 1}
                      title="Pindahkan ke bawah"
                      style={{ padding: "6px", color: index === sortedFields.length - 1 ? "#cbd5e1" : "var(--navy-900)" }}
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => openEditField(field)}
                      title="Edit Pertanyaan"
                      style={{
                        padding: "5px 12px",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        color: "var(--primary-700, #b91c1c)",
                        borderColor: "rgba(185, 28, 28, 0.3)",
                      }}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setDeletingField(field)}
                      title="Hapus Pertanyaan"
                      style={{ padding: "6px", color: "#dc2626" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENGATURAN UMUM FORMULIR */}
      {activeTab === "settings" && (
        <div
          className="card"
          style={{
            background: "#ffffff",
            borderRadius: "var(--radius-md, 12px)",
            border: "1px solid var(--border, #e2e8f0)",
            padding: "24px",
          }}
        >
          <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 16px", color: "var(--navy-900)" }}>
            Pengaturan Informasi Formulir
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group" style={{ gap: 4 }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Nama / Judul Formulir *</label>
              <input
                value={formSettings.title}
                onChange={(e) => setFormSettings((p) => ({ ...p, title: e.target.value }))}
                placeholder="Contoh: Formulir Pendaftaran Anggota Baru MB Chondro"
                style={{ height: 40, padding: "8px 12px", fontSize: "13.5px" }}
              />
            </div>

            <div className="form-group" style={{ gap: 4 }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Deskripsi / Instruksi Calon Anggota</label>
              <textarea
                value={formSettings.description}
                onChange={(e) => setFormSettings((p) => ({ ...p, description: e.target.value }))}
                placeholder="Deskripsi dan petunjuk pengisian yang akan dilihat calon anggota"
                rows={4}
                style={{ padding: "8px 12px", fontSize: "13px", resize: "vertical" }}
              />
            </div>

            <div className="form-group" style={{ gap: 4 }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Status Formulir Pendaftaran</label>
              <select
                value={formSettings.status}
                onChange={(e) => setFormSettings((p) => ({ ...p, status: e.target.value as "dibuka" | "ditutup" }))}
                style={{ height: 40, padding: "8px 12px", fontSize: "13.5px" }}
              >
                <option value="dibuka">🟢 Aktif — Formulir dibuka untuk publik (Menerima pendaftar)</option>
                <option value="ditutup">🔴 Nonaktif — Formulir ditutup (Draft / Tidak menerima pendaftar)</option>
              </select>
            </div>

            <div
              style={{
                background: "var(--bg, #f8fafc)",
                padding: "16px",
                borderRadius: "var(--radius-sm, 8px)",
                border: "1px solid var(--border, #e2e8f0)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Link Akses Formulir Publik Calon Anggota</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  readOnly
                  value={publicLink}
                  style={{
                    flex: 1,
                    background: "#ffffff",
                    height: 38,
                    padding: "6px 12px",
                    fontSize: "13px",
                    color: "var(--navy-900)",
                  }}
                />
                <button type="button" className="btn btn-outline" onClick={handleCopyLink} disabled={copySuccess}>
                  {copySuccess ? <Check size={16} style={{ color: "#10b981" }} /> : <Copy size={16} />}
                  {copySuccess ? "Tersalin" : "Salin Link"}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                Calon anggota dapat membuka link ini secara langsung tanpa perlu login.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleFormSave()}
                disabled={savingForm}
              >
                {savingForm ? "Menyimpan..." : "Simpan Pengaturan Formulir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT PERTANYAAN */}
      <Modal
        open={isFieldModalOpen}
        title={editingField ? "Edit Pertanyaan Formulir" : "Tambah Pertanyaan Baru"}
        onClose={() => {
          setIsFieldModalOpen(false);
          setEditingField(null);
          setFieldForm(FIELD_EMPTY);
          setFieldErrors({});
        }}
        size="lg"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setIsFieldModalOpen(false);
                setEditingField(null);
                setFieldForm(FIELD_EMPTY);
                setFieldErrors({});
              }}
              disabled={savingField}
            >
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleFieldSubmit} disabled={savingField}>
              {savingField ? "Menyimpan..." : editingField ? "Simpan Perubahan" : "Tambah Pertanyaan"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Label Pertanyaan */}
          <div className="form-group" style={{ gap: 4 }}>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>
              Label Pertanyaan * <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              value={fieldForm.label}
              onChange={(e) => setFieldForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="Contoh: Nama Lengkap / Nomor WhatsApp / Pas Foto Calon Anggota"
              style={{ height: 40, padding: "8px 12px", fontSize: "13.5px" }}
            />
            {fieldErrors.label && <span style={{ fontSize: "12px", color: "#dc2626" }}>{fieldErrors.label}</span>}
          </div>

          {/* Grid Tipe Input & Wajib Diisi */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group" style={{ gap: 4 }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Tipe Input Pertanyaan *</label>
              <select
                value={fieldForm.fieldType}
                onChange={(e) => {
                  const val = e.target.value as RekrutmenFieldType;
                  setFieldForm((p) => ({
                    ...p,
                    fieldType: val,
                    maxFileSize: val === "image" ? 2 : val === "file" ? 5 : p.maxFileSize,
                  }));
                }}
                style={{ height: 40, padding: "8px 12px", fontSize: "13.5px" }}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gap: 4 }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Keharusan Pengisian</label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 40,
                  padding: "0 12px",
                  background: "#f8fafc",
                  borderRadius: "var(--radius-xs, 6px)",
                  border: "1px solid var(--border, #e2e8f0)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={fieldForm.required}
                  onChange={(e) => setFieldForm((p) => ({ ...p, required: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: "var(--primary-700, #b91c1c)" }}
                />
                <span>Wajib diisi oleh calon anggota</span>
              </label>
            </div>
          </div>

          {/* Placeholder / Teks Bantuan */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group" style={{ gap: 4 }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Placeholder Input (Opsional)</label>
              <input
                value={fieldForm.placeholder}
                onChange={(e) => setFieldForm((p) => ({ ...p, placeholder: e.target.value }))}
                placeholder="Contoh: Masukkan nama lengkap sesuai KTP"
                style={{ height: 38, padding: "6px 12px", fontSize: "13px" }}
              />
            </div>

            <div className="form-group" style={{ gap: 4 }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Deskripsi / Petunjuk Pengisian (Opsional)</label>
              <input
                value={fieldForm.description}
                onChange={(e) => setFieldForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Contoh: Pastikan nomor aktif WhatsApp"
                style={{ height: 38, padding: "6px 12px", fontSize: "13px" }}
              />
            </div>
          </div>

          {/* Opsi Pilihan (Select, Radio, Checkbox) */}
          {(fieldForm.fieldType === "select" || fieldForm.fieldType === "radio" || fieldForm.fieldType === "checkbox") && (
            <div
              style={{
                background: "var(--bg, #f8fafc)",
                padding: "16px",
                borderRadius: "var(--radius-sm, 8px)",
                border: "1px solid var(--border, #e2e8f0)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy-900)" }}>
                  Daftar Pilihan Jawaban *
                </label>
                <button type="button" className="btn btn-outline btn-sm" onClick={addOption} style={{ fontSize: "12px" }}>
                  <Plus size={14} /> Tambah Opsi
                </button>
              </div>

              {fieldErrors.options && (
                <span style={{ fontSize: "12px", color: "#dc2626" }}>{fieldErrors.options}</span>
              )}

              {fieldForm.options.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", width: 20 }}>{idx + 1}.</span>
                  <input
                    value={opt.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFieldForm((p) => ({
                        ...p,
                        options: p.options.map((o, i) => (i === idx ? { value: val, label: val } : o)),
                      }));
                    }}
                    placeholder={`Pilihan ${idx + 1}`}
                    style={{ flex: 1, height: 36, padding: "6px 10px", fontSize: "13px" }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeOption(idx)}
                    style={{ padding: "6px", color: "#dc2626" }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pengaturan Khusus Upload File / Foto */}
          {(fieldForm.fieldType === "image" || fieldForm.fieldType === "file") && (
            <div
              style={{
                background: "var(--bg, #f8fafc)",
                padding: "16px",
                borderRadius: "var(--radius-sm, 8px)",
                border: "1px solid var(--border, #e2e8f0)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Camera size={18} style={{ color: "var(--primary-700, #b91c1c)" }} />
                <strong style={{ fontSize: "13.5px", color: "var(--navy-900)" }}>
                  Pengaturan Khusus {fieldForm.fieldType === "image" ? "Pas Foto" : "Dokumen"}
                </strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group" style={{ gap: 4 }}>
                  <label style={{ fontSize: "12.5px", fontWeight: 600 }}>Batas Maksimal Ukuran (MB)</label>
                  <select
                    value={fieldForm.maxFileSize}
                    onChange={(e) => setFieldForm((p) => ({ ...p, maxFileSize: Number(e.target.value) }))}
                    style={{ height: 36, padding: "6px 10px", fontSize: "13px" }}
                  >
                    <option value={1}>1 MB</option>
                    <option value={2}>2 MB (Rekomendasi Foto)</option>
                    <option value={5}>5 MB (Rekomendasi Dokumen)</option>
                  </select>
                </div>

                <div className="form-group" style={{ gap: 4 }}>
                  <label style={{ fontSize: "12.5px", fontWeight: 600 }}>Judul Foto Panduan (Opsional)</label>
                  <input
                    value={fieldForm.exampleImageTitle}
                    onChange={(e) => setFieldForm((p) => ({ ...p, exampleImageTitle: e.target.value }))}
                    placeholder="Contoh: Contoh pas foto 3x4 berseragam"
                    style={{ height: 36, padding: "6px 10px", fontSize: "13px" }}
                  />
                </div>
              </div>

              {/* Lampirkan Foto Panduan */}
              <div className="form-group" style={{ gap: 6 }}>
                <label style={{ fontSize: "12.5px", fontWeight: 600 }}>Foto Panduan / Contoh untuk Calon Anggota</label>
                {fieldForm.exampleImageUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={fieldForm.exampleImageUrl}
                      alt="Contoh"
                      style={{
                        width: 60,
                        height: 75,
                        objectFit: "cover",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() =>
                          setPreviewImage({
                            url: fieldForm.exampleImageUrl,
                            title: fieldForm.exampleImageTitle || "Foto Panduan",
                          })
                        }
                      >
                        <Eye size={13} /> Lihat Foto
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setFieldForm((p) => ({ ...p, exampleImageUrl: "" }))}
                        style={{ color: "#dc2626" }}
                      >
                        <Trash2 size={13} /> Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      className="btn btn-outline btn-sm"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", margin: 0 }}
                    >
                      <Upload size={14} />
                      {compressingImage ? "Memproses Gambar..." : "Unggah Foto Panduan (HD)"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleExampleImageUpload}
                        disabled={compressingImage}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* CONFIRM DELETE PERTANYAAN */}
      <ConfirmDialog
        open={deletingField !== null}
        title="Hapus Pertanyaan Formulir?"
        message={`Pertanyaan "${deletingField?.label || ""}" akan dihapus dari formulir pendaftaran.`}
        onConfirm={handleDeleteField}
        onCancel={() => setDeletingField(null)}
      />

      {/* PREVIEW GAMBAR MODAL */}
      {previewImage &&
        createPortal(
          <div
            onClick={() => setPreviewImage(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999999,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 600,
                width: "100%",
                background: "#ffffff",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong style={{ fontSize: "14px" }}>📸 {previewImage.title}</strong>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPreviewImage(null)}
                  style={{ padding: "4px 8px" }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: 20, textAlign: "center", background: "#0f172a" }}>
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}