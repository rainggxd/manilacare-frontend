import { useEffect, useState } from "react";
import { FlaskConical, Upload, X, Trash2, ImageIcon, Eye } from "lucide-react";
import axios from "axios";
import { formatLongDate, localISO, toLocalISO } from "../utils/dates";
import { resizeImageFile } from "../utils/image";
import { useConfirm } from "./ConfirmDialog";
import SearchableSelect from "./SearchableSelect";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Laboratory Results and X-ray pictures of a patient.
 * - Doctor: upload a picture of the result, view and delete it.
 * - Patient: view their own results (readOnly).
 *
 * Props:
 *  - patientId (not needed for the Patient, the server uses their own record)
 *  - auth: { token, user }
 *  - readOnly
 */
const TYPES = ["Laboratory", "X-ray", "Other"];
const TYPE_STYLES = {
  Laboratory: "bg-[#E7EEF7] text-[#0B3D7A]",
  "X-ray": "bg-[#1A1A1A] text-white",
  Other: "bg-[#F4F6F9] text-[#5B6470]",
};
// Bigger than the other pictures so the details of an X-ray stay readable
const LAB_MAX_SIDE = 2000;
const LAB_MAX_KB = 1400;

function today() {
  return localISO();
}

const emptyForm = { test_type: "Laboratory", title: "", result_date: "", visit_id: "", findings: "", image: "" };

export default function LabResultsCard({ patientId, auth, readOnly = false }) {
  const confirm = useConfirm();
  const headers = { Authorization: `Bearer ${auth?.token}` };
  const canUpload = !readOnly && auth?.user?.role === "Doctor";

  const [results, setResults] = useState([]);
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isReading, setIsReading] = useState(false);

  const [viewing, setViewing] = useState(null); // the result being shown big
  const [isOpening, setIsOpening] = useState(null);

  async function load() {
    setLoadError("");
    try {
      const params = readOnly ? {} : { patient_id: patientId };
      const res = await axios.get(`${API_BASE_URL}/lab-results`, { headers, params });
      setResults(res.data?.data ?? []);
    } catch {
      setLoadError("Unable to load the laboratory results right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (canUpload && patientId) {
      axios
        .get(`${API_BASE_URL}/patients/${patientId}/checkups`, { headers })
        .then((res) => setVisits(res.data?.data ?? []))
        .catch(() => setVisits([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, auth?.token]);

  function openForm() {
    setForm({ ...emptyForm, result_date: today() });
    setFormError("");
    setShowForm(true);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFormError("");
    setIsReading(true);
    try {
      const dataUrl = await resizeImageFile(file, LAB_MAX_SIDE, LAB_MAX_KB);
      setForm((p) => ({ ...p, image: dataUrl }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsReading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim()) return setFormError("Please enter the name of the test (e.g. CBC, Chest X-ray).");
    if (!form.result_date) return setFormError("Please enter the result date.");
    if (form.result_date > today()) return setFormError("The result date cannot be in the future.");
    if (!form.image) return setFormError("Please upload a picture of the result.");

    const ok = await confirm({
      title: "Upload this result?",
      message: `${form.test_type}: ${form.title.trim()}. Please check that the picture is clear and belongs to this patient.`,
      confirmText: "Yes, upload",
    });
    if (!ok) return;

    setIsSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/lab-results`, { ...form, patient_id: patientId }, { headers });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to upload right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function openResult(r) {
    setIsOpening(r.id);
    try {
      const res = await axios.get(`${API_BASE_URL}/lab-results/${r.id}`, { headers });
      setViewing(res.data?.data ?? null);
    } catch {
      setLoadError("Unable to open the picture right now.");
    } finally {
      setIsOpening(null);
    }
  }

  async function handleDelete(r) {
    const ok = await confirm({
      title: "Delete this result?",
      message: `${r.test_type}: ${r.title}. The picture will be removed and cannot be brought back.`,
      confirmText: "Yes, delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await axios.delete(`${API_BASE_URL}/lab-results/${r.id}`, { headers });
      setViewing(null);
      await load();
    } catch (err) {
      setLoadError(err.response?.data?.message || "Unable to delete right now.");
    }
  }

  const inputClass =
    "w-full rounded-full bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30";

  return (
    <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6 mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <div className="flex items-center gap-2">
          <FlaskConical size={18} className="text-[#0B3D7A]" />
          <h3 className="text-lg font-bold text-[#1A1A1A]">Laboratory &amp; X-ray Results</h3>
        </div>
        {canUpload && !showForm && (
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0B3D7A] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#092E5C]"
          >
            <Upload size={13} />
            Upload Result
          </button>
        )}
      </div>
      <p className="text-xs text-[#8A8578] mb-4">
        {canUpload
          ? "Upload a clear photo or scan of the laboratory result or X-ray film."
          : "Pictures of the laboratory results and X-rays uploaded by the doctor."}
      </p>

      {showForm && (
        <form onSubmit={handleSave} className="mb-4 rounded-xl bg-[#F7F5F1] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#5B6470] mb-1">Type</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, test_type: t }))}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold border ${
                    form.test_type === t ? "bg-[#0B3D7A] text-white border-transparent" : "bg-white border-[#0B3D7A]/20 text-[#5B6470]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#5B6470] mb-1">Name of Test</label>
            <input
              type="text"
              maxLength={150}
              placeholder={form.test_type === "X-ray" ? "e.g. Chest X-ray (PA view)" : "e.g. CBC, Urinalysis, FBS"}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-[#5B6470] mb-1">Result Date</label>
            <input
              type="date"
              max={today()}
              value={form.result_date}
              onChange={(e) => setForm((p) => ({ ...p, result_date: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-[#5B6470] mb-1">Check-up (optional)</label>
            <SearchableSelect
              emptyLabel="Not linked to a check-up"
              options={visits.map((v) => ({
                value: v.visit_id,
                label: formatLongDate(toLocalISO(v.visit_date)),
                hint: [v.purpose || "Check-up", v.status].filter(Boolean).join(" · "),
              }))}
              value={form.visit_id}
              onChange={(v) => setForm((p) => ({ ...p, visit_id: v }))}
              ariaLabel="Check-up"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-[#5B6470] mb-1">Findings / Remarks (optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Hemoglobin slightly low. Clear lung fields."
              value={form.findings}
              onChange={(e) => setForm((p) => ({ ...p, findings: e.target.value }))}
              className="w-full rounded-2xl bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30 resize-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-[#5B6470] mb-1">Picture of the Result</label>
            {form.image ? (
              <div className="relative inline-block">
                <img src={form.image} alt="Selected result" className="max-h-56 rounded-lg border border-[#E3E8EF] bg-white" />
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, image: "" }))}
                  className="absolute -top-2 -right-2 rounded-full bg-[#8A3B27] p-1 text-white"
                  aria-label="Remove picture"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#0B3D7A]/25 bg-white px-4 py-6 text-sm text-[#5B6470] cursor-pointer hover:bg-[#0B3D7A]/5">
                <ImageIcon size={22} className="text-[#0B3D7A]" />
                {isReading ? "Preparing the picture…" : "Choose a photo or scan (JPG, PNG)"}
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFile} className="hidden" />
              </label>
            )}
          </div>

          {formError && <p className="sm:col-span-2 text-sm text-[#8A3B27]">{formError}</p>}

          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={isSaving || isReading}
              className="rounded-full bg-[#1B5E20] text-white px-6 py-2 text-sm font-bold hover:bg-[#164D1A] disabled:opacity-60"
            >
              {isSaving ? "Uploading…" : "Upload"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full bg-[#0B3D7A]/10 text-[#0B3D7A] px-6 py-2 text-sm font-bold hover:bg-[#0B3D7A]/20"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-sm text-[#8A8578]">Loading…</p>}
      {!isLoading && loadError && <p className="text-sm text-[#8A3B27] mb-2">{loadError}</p>}
      {!isLoading && !loadError && results.length === 0 && (
        <p className="text-sm text-[#8A8578] text-center py-4">No laboratory or X-ray results yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <div key={r.id} className="rounded-xl border border-[#E3E8EF] p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TYPE_STYLES[r.test_type] || TYPE_STYLES.Other}`}>
                  {r.test_type}
                </span>
                <span className="font-bold text-[#1A1A1A] break-words">{r.title}</span>
              </div>
              <p className="text-xs text-[#5B6470] mt-0.5">
                {formatLongDate(toLocalISO(r.result_date))}
                {r.uploaded_by_name ? ` · Uploaded by Dr. ${r.uploaded_by_name}` : ""}
              </p>
              {r.findings && <p className="text-sm text-[#1A1A1A] mt-1 whitespace-pre-line">{r.findings}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openResult(r)}
                disabled={isOpening === r.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#0B3D7A]/30 px-4 py-1.5 text-xs font-semibold text-[#0B3D7A] hover:bg-[#0B3D7A]/5 disabled:opacity-60"
              >
                <Eye size={13} />
                {isOpening === r.id ? "Opening…" : "View"}
              </button>
              {canUpload && (
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#8A3B27]/30 px-3 py-1.5 text-xs font-semibold text-[#8A3B27] hover:bg-[#FBEAE5]"
                  aria-label="Delete result"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Big picture viewer */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-4xl max-h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 text-white mb-2">
              <div className="min-w-0">
                <p className="font-bold break-words">
                  {viewing.test_type}: {viewing.title}
                </p>
                <p className="text-xs text-white/70">{formatLongDate(toLocalISO(viewing.result_date))}</p>
              </div>
              <button type="button" onClick={() => setViewing(null)} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-auto rounded-lg bg-black flex-1 min-h-0">
              <img src={viewing.image} alt={viewing.title} className="mx-auto max-w-full h-auto" />
            </div>
            {viewing.findings && <p className="text-sm text-white/90 mt-2 whitespace-pre-line">{viewing.findings}</p>}
            <a href={viewing.image} download={`${viewing.title}.jpg`} className="self-start mt-2 text-xs font-semibold text-white underline">
              Download picture
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
