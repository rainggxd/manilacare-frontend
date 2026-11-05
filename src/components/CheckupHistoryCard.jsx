import { useEffect, useState } from "react";
import { History, HeartPulse, FileText } from "lucide-react";
import axios from "axios";
import { formatLongDate, formatTime, toLocalISO } from "../utils/dates";
import { useConfirm } from "./ConfirmDialog";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Check-up History of a patient.
 * One entry per visit (newest first) with the vital signs taken that day
 * and the doctor's notes (complaint, physical assessment, diagnosis, treatment, notes).
 *
 * - Admin / Staff / Nurse / Doctor: can enter the vital signs on an open visit
 * - Doctor: can also write or edit the check-up notes of a visit
 * - The notes (complaint, assessment, diagnosis, treatment) are shown to the Doctor only;
 *   other roles only see that the visit has notes.
 *
 * Props:
 *  - patientId
 *  - auth: { token, user }
 */

const OPEN_STATUSES = ["Checked-in", "In Progress"];

const STATUS_STYLES = {
  "Checked-in": "bg-yellow-500/90",
  "In Progress": "bg-[#0B3D7A]",
  Completed: "bg-[#1B5E20]",
  Cancelled: "bg-gray-500",
};

function computeBmi(heightCm, weightKg) {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!h || !w) return null;
  return (w / (h * h)).toFixed(1);
}

/** Vital signs saved on each visit. [field, label, unit, input props] */
const VITAL_FIELDS = [
  ["blood_pressure", "Blood Pressure", "mmHg", { type: "text", placeholder: "120/80", inputMode: "numeric", maxLength: 7 }],
  ["temperature_c", "Temperature", "°C", { type: "number", step: "0.1", min: 30, max: 45, placeholder: "36.5" }],
  ["pulse_rate", "Pulse Rate", "bpm", { type: "number", step: "1", min: 30, max: 220, placeholder: "80" }],
  ["respiratory_rate", "Respiratory Rate", "/min", { type: "number", step: "1", min: 5, max: 60, placeholder: "18" }],
  ["oxygen_saturation", "Oxygen Saturation (SpO2)", "%", { type: "number", step: "1", min: 50, max: 100, placeholder: "98" }],
  ["height_cm", "Height", "cm", { type: "number", step: "0.1", min: 30, max: 250 }],
  ["weight_kg", "Weight", "kg", { type: "number", step: "0.1", min: 1, max: 300 }],
];

const CONDITIONS = ["Good", "Fair", "Poor", "Critical"];

const CONDITION_STYLES = {
  Good: "bg-[#E8F5E9] text-[#1B5E20]",
  Fair: "bg-[#FFF8E1] text-[#8A6D00]",
  Poor: "bg-[#FBEAE5] text-[#8A3B27]",
  Critical: "bg-[#8A3B27] text-white",
};

function showVital(value, unit) {
  if (value === null || value === undefined || value === "") return null;
  return unit === "mmHg" ? `${value} ${unit}` : `${Number(value)} ${unit}`;
}

const emptyNotes = {
  chief_complaint: "",
  general_condition: "",
  physical_assessment: "",
  diagnosis: "",
  treatment_plan: "",
  notes: "",
  ...Object.fromEntries(VITAL_FIELDS.map(([f]) => [f, ""])),
};

export default function CheckupHistoryCard({ patientId, auth }) {
  const confirm = useConfirm();
  const role = auth?.user?.role;
  const canEnterVitals = ["Admin", "Staff", "Nurse", "Doctor"].includes(role);
  // Only the Doctor (and the patient) can read the doctor's notes.
  const canSeeNotes = ["Doctor", "Patient"].includes(role);
  const isDoctor = role === "Doctor";
  const headers = { Authorization: `Bearer ${auth?.token}` };

  const [checkups, setCheckups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Which visit is being edited, and with which form ("vitals" or "notes")
  const [editing, setEditing] = useState({ visitId: null, mode: null });
  const [form, setForm] = useState(emptyNotes);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadCheckups() {
    setLoadError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/patients/${patientId}/checkups`, { headers });
      setCheckups(res.data?.data ?? []);
    } catch {
      setLoadError("Unable to load the check-up history right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (patientId) loadCheckups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, auth?.token]);

  function openForm(visit, mode) {
    setForm(Object.fromEntries(Object.keys(emptyNotes).map((k) => [k, visit[k] ?? ""])));
    setFormError("");
    setEditing({ visitId: visit.visit_id, mode });
  }

  function closeForm() {
    setEditing({ visitId: null, mode: null });
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError("");

    const vitals = Object.fromEntries(VITAL_FIELDS.map(([f]) => [f, String(form[f] ?? "").trim()]));
    if (editing.mode === "vitals" && Object.values(vitals).every((v) => v === "")) {
      setFormError("Please enter at least one vital sign.");
      return;
    }
    if (vitals.blood_pressure && !/^\d{2,3}\s*\/\s*\d{2,3}$/.test(vitals.blood_pressure)) {
      setFormError("Blood pressure must look like 120/80.");
      return;
    }
    if (editing.mode === "notes" && !form.chief_complaint.trim() && !form.diagnosis.trim()) {
      setFormError("Please enter at least the chief complaint or the diagnosis.");
      return;
    }

    const ok = await confirm({
      title: editing.mode === "vitals" ? "Save the vital signs?" : "Save the check-up notes?",
      message: "Please check the values before saving.",
      confirmText: "Yes, save",
    });
    if (!ok) return;

    setIsSaving(true);
    try {
      if (editing.mode === "vitals") {
        await axios.put(
          `${API_BASE_URL}/visits/${editing.visitId}/vitals`,
          vitals,
          { headers }
        );
      } else {
        // Saving the notes also completes the visit (done by the backend).
        await axios.post(`${API_BASE_URL}/medical-records`, { ...form, visit_id: editing.visitId }, { headers });
      }
      closeForm();
      await loadCheckups();
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to save right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-full bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30";
  const areaClass =
    "w-full rounded-2xl bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30 resize-none";

  return (
    <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6 mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center gap-2 mb-1">
        <History size={18} className="text-[#0B3D7A]" />
        <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Check-up History
        </h3>
      </div>
      <p className="text-xs text-[#8A8578] mb-4">
        {canSeeNotes
          ? "Every visit of the patient, with the vital signs taken that day and the doctor's notes."
          : "Every visit of the patient, with the vital signs taken that day."}
      </p>

      {isLoading && <p className="text-sm text-[#8A8578]">Loading…</p>}
      {!isLoading && loadError && <p className="text-sm text-[#8A3B27]">{loadError}</p>}
      {!isLoading && !loadError && checkups.length === 0 && (
        <p className="text-sm text-[#8A8578] text-center py-4">
          No check-ups yet. A check-up appears here once the patient is checked in.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {checkups.map((c) => {
          const isOpen = OPEN_STATUSES.includes(c.status);
          const bmi = computeBmi(c.height_cm, c.weight_kg);
          const isEditingThis = editing.visitId === c.visit_id;

          return (
            <div key={c.visit_id} className="rounded-xl border border-[#E3E8EF] p-4">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                <div>
                  <p className="font-bold text-[#1A1A1A]">
                    {formatLongDate(toLocalISO(c.visit_date))}
                    {c.visit_time ? ` · ${formatTime(c.visit_time)}` : ""}
                  </p>
                  <p className="text-xs text-[#5B6470]">{c.purpose || "Check-up"}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold text-white ${STATUS_STYLES[c.status] || "bg-gray-500"}`}
                >
                  {c.status}
                </span>
              </div>

              {(() => {
                const shown = VITAL_FIELDS.map(([f, label, unit]) => [label, showVital(c[f], unit)]).filter(([, v]) => v);
                if (bmi) shown.push(["BMI", bmi]);
                return shown.length ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {shown.map(([label, v]) => (
                      <div key={label} className="rounded-lg bg-[#F4F6F9] px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-[#8A8578]">{label}</p>
                        <p className="text-sm font-bold text-[#1A1A1A]">{v}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8A8578] mb-2">No vital signs recorded for this visit.</p>
                );
              })()}

              {!canSeeNotes ? (
                <p className="text-xs text-[#8A8578] border-t border-[#E3E8EF] pt-2">
                  {c.has_notes
                    ? `The doctor's notes for this visit are only visible to doctors${c.doctor_name ? ` (attended by Dr. ${c.doctor_name})` : ""}.`
                    : "No doctor's notes for this visit yet."}
                </p>
              ) : c.record_id ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-[#E3E8EF] pt-2">
                  <div>
                    <dt className="text-[#8A8578] text-xs uppercase tracking-wide">Chief Complaint</dt>
                    <dd className="text-[#1A1A1A]">{c.chief_complaint || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8A8578] text-xs uppercase tracking-wide">General Condition</dt>
                    <dd>
                      {c.general_condition ? (
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${CONDITION_STYLES[c.general_condition] || ""}`}>
                          {c.general_condition}
                        </span>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[#8A8578] text-xs uppercase tracking-wide">Physical Assessment</dt>
                    <dd className="text-[#1A1A1A] whitespace-pre-line">{c.physical_assessment || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8A8578] text-xs uppercase tracking-wide">Diagnosis</dt>
                    <dd className="text-[#1A1A1A] font-semibold">{c.diagnosis || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8A8578] text-xs uppercase tracking-wide">Treatment Plan</dt>
                    <dd className="text-[#1A1A1A]">{c.treatment_plan || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8A8578] text-xs uppercase tracking-wide">Notes</dt>
                    <dd className="text-[#1A1A1A]">{c.notes || "—"}</dd>
                  </div>
                  <div className="sm:col-span-2 text-xs text-[#5B6470]">
                    Attended by Dr. {c.doctor_name || "—"}
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-[#8A8578]">No doctor&apos;s notes for this visit yet.</p>
              )}

              {/* Action buttons */}
              {!isEditingThis && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {canEnterVitals && isOpen && (
                    <button
                      type="button"
                      onClick={() => openForm(c, "vitals")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#0B3D7A]/30 px-4 py-1.5 text-xs font-semibold text-[#0B3D7A] hover:bg-[#0B3D7A]/5"
                    >
                      <HeartPulse size={13} />
                      {VITAL_FIELDS.some(([f]) => c[f] !== null && c[f] !== undefined && c[f] !== "")
                        ? "Edit Vital Signs"
                        : "Enter Vital Signs"}
                    </button>
                  )}
                  {isDoctor && (isOpen || c.record_id) && (
                    <button
                      type="button"
                      onClick={() => openForm(c, "notes")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1B5E20] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#164D1A]"
                    >
                      <FileText size={13} />
                      {c.record_id ? "Edit Check-up Notes" : "Write Check-up Notes"}
                    </button>
                  )}
                </div>
              )}

              {/* Form */}
              {isEditingThis && (
                <form onSubmit={handleSave} className="mt-3 rounded-xl bg-[#F7F5F1] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <p className="sm:col-span-2 text-xs font-bold uppercase tracking-wide text-[#0B3D7A]">Vital Signs</p>
                  {VITAL_FIELDS.map(([f, label, unit, props]) => (
                    <div key={f}>
                      <label className="block text-xs text-[#5B6470] mb-1">
                        {label} ({unit})
                      </label>
                      <input
                        {...props}
                        value={form[f]}
                        onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  ))}

                  {editing.mode === "notes" && (
                    <>
                      <p className="sm:col-span-2 mt-2 text-xs font-bold uppercase tracking-wide text-[#0B3D7A]">
                        Check-up Notes
                      </p>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-[#5B6470] mb-1">Chief Complaint</label>
                        <textarea
                          rows={2}
                          value={form.chief_complaint}
                          onChange={(e) => setForm((p) => ({ ...p, chief_complaint: e.target.value }))}
                          className={areaClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-[#5B6470] mb-1">General Condition</label>
                        <div className="flex flex-wrap gap-2">
                          {CONDITIONS.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, general_condition: p.general_condition === opt ? "" : opt }))}
                              className={`rounded-full px-4 py-1.5 text-xs font-bold border ${
                                form.general_condition === opt
                                  ? `${CONDITION_STYLES[opt]} border-transparent`
                                  : "bg-white border-[#0B3D7A]/20 text-[#5B6470]"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-[#5B6470] mb-1">Physical Assessment</label>
                        <textarea
                          rows={3}
                          placeholder="e.g. Conscious, alert, not in distress. Clear breath sounds. No swelling."
                          value={form.physical_assessment}
                          onChange={(e) => setForm((p) => ({ ...p, physical_assessment: e.target.value }))}
                          className={areaClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-[#5B6470] mb-1">Diagnosis</label>
                        <textarea
                          rows={2}
                          value={form.diagnosis}
                          onChange={(e) => setForm((p) => ({ ...p, diagnosis: e.target.value }))}
                          className={areaClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-[#5B6470] mb-1">Treatment Plan</label>
                        <textarea
                          rows={2}
                          value={form.treatment_plan}
                          onChange={(e) => setForm((p) => ({ ...p, treatment_plan: e.target.value }))}
                          className={areaClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-[#5B6470] mb-1">Notes</label>
                        <textarea
                          rows={2}
                          value={form.notes}
                          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                          className={areaClass}
                        />
                      </div>
                      <p className="sm:col-span-2 text-xs text-[#5B6470]">
                        Saving the notes marks this visit as Completed.
                      </p>
                    </>
                  )}

                  {formError && <p className="sm:col-span-2 text-sm text-[#8A3B27]">{formError}</p>}

                  <div className="sm:col-span-2 flex gap-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-full bg-[#1B5E20] text-white px-6 py-2 text-sm font-bold hover:bg-[#164D1A] disabled:opacity-60"
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="rounded-full bg-[#0B3D7A]/10 text-[#0B3D7A] px-6 py-2 text-sm font-bold hover:bg-[#0B3D7A]/20"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
