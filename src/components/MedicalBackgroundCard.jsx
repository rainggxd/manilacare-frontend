import { useState } from "react";
import { ClipboardList, Pencil } from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Background and Medical History of a patient.
 * Shows occupation, family history, past illnesses, past surgeries,
 * allergies and maintenance medicines. Admin, Staff and Doctor can edit.
 *
 * Props:
 *  - patient: the patient row from GET /api/patients/:id
 *  - auth: { token, user }
 *  - onSaved(changes): called after saving so the page can update its copy
 */

const FIELDS = [
  { key: "occupation", label: "Occupation", wide: false },
  { key: "allergies", label: "Allergies", wide: false },
  { key: "family_history", label: "Family History", wide: true, hint: "e.g. Hypertension (father), Diabetes (mother)" },
  { key: "past_illnesses", label: "Past Illnesses", wide: true, hint: "e.g. Asthma, Tuberculosis (2019)" },
  { key: "past_surgeries", label: "Past Surgeries / Hospitalizations", wide: true },
  { key: "maintenance_medications", label: "Maintenance Medicines", wide: true, hint: "e.g. Amlodipine 5mg once a day" },
];

const EDITOR_ROLES = ["Admin", "Staff", "Doctor"];

export default function MedicalBackgroundCard({ patient, auth, onSaved }) {
  const canEdit = EDITOR_ROLES.includes(auth?.user?.role);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!patient) return null;

  function startEdit() {
    const values = {};
    FIELDS.forEach((f) => {
      values[f.key] = patient[f.key] ?? "";
    });
    setForm(values);
    setError("");
    setIsEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await axios.put(`${API_BASE_URL}/patients/${patient.id}/background`, form, {
        headers: { Authorization: `Bearer ${auth?.token}` },
      });
      onSaved?.(form);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 mb-6" style={{ fontFamily: "'Lora', serif" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-[#0B3D7A]" />
          <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Background and Medical History
          </h3>
        </div>
        {canEdit && !isEditing && (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B3D7A] hover:underline"
          >
            <Pencil size={14} />
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.wide ? "sm:col-span-2" : ""}>
              <label className="block text-xs text-[#5B6470] mb-1">{f.label}</label>
              {f.wide ? (
                <textarea
                  rows={2}
                  value={form[f.key]}
                  placeholder={f.hint || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full rounded-2xl bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30 resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={form[f.key]}
                  maxLength={f.key === "occupation" ? 100 : undefined}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full rounded-full bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30"
                />
              )}
            </div>
          ))}

          {error && <p className="sm:col-span-2 text-sm text-[#8A3B27]">{error}</p>}

          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-[#1B5E20] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#164D1A] disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-full bg-[#0B3D7A]/10 text-[#0B3D7A] px-6 py-2.5 text-sm font-bold hover:bg-[#0B3D7A]/20"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.wide ? "sm:col-span-2" : ""}>
              <dt className="text-[#8A8578] text-xs uppercase tracking-wide">{f.label}</dt>
              <dd className="text-[#1A1A1A] font-semibold whitespace-pre-line">{patient[f.key] || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
