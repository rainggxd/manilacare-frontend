import { useEffect, useState } from "react";
import { History, Ruler, FileText } from "lucide-react";
import axios from "axios";
import { formatLongDate, formatTime, toLocalISO } from "../utils/dates";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Check-up History of a patient.
 * One entry per visit (newest first) with the height and weight taken that
 * day and the doctor's notes (complaint, diagnosis, treatment, notes).
 *
 * - Admin / Staff / Doctor: can enter height and weight on an open visit
 * - Doctor: can also write or edit the check-up notes of a visit
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

function showNumber(value, unit) {
  if (value === null || value === undefined || value === "") return "—";
  return `${Number(value)} ${unit}`;
}

const emptyNotes = {
  chief_complaint: "",
  diagnosis: "",
  treatment_plan: "",
  notes: "",
  height_cm: "",
  weight_kg: "",
};

export default function CheckupHistoryCard({ patientId, auth }) {
  const role = auth?.user?.role;
  const canEnterVitals = ["Admin", "Staff", "Doctor"].includes(role);
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
    setForm({
      chief_complaint: visit.chief_complaint ?? "",
      diagnosis: visit.diagnosis ?? "",
      treatment_plan: visit.treatment_plan ?? "",
      notes: visit.notes ?? "",
      height_cm: visit.height_cm ?? "",
      weight_kg: visit.weight_kg ?? "",
    });
    setFormError("");
    setEditing({ visitId: visit.visit_id, mode });
  }

  function closeForm() {
    setEditing({ visitId: null, mode: null });
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError("");

    if (editing.mode === "vitals" && form.height_cm === "" && form.weight_kg === "") {
      setFormError("Please enter the height or weight.");
      return;
    }
    if (editing.mode === "notes" && !form.chief_complaint.trim() && !form.diagnosis.trim()) {
      setFormError("Please enter at least the chief complaint or the diagnosis.");
      return;
    }

    setIsSaving(true);
    try {
      if (editing.mode === "vitals") {
        await axios.put(
          `${API_BASE_URL}/visits/${editing.visitId}/vitals`,
          { height_cm: form.height_cm, weight_kg: form.weight_kg },
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
    <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 mb-6" style={{ fontFamily: "'Lora', serif" }}>
      <div className="flex items-center gap-2 mb-1">
        <History size={18} className="text-[#0B3D7A]" />
        <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Check-up History
        </h3>
      </div>
      <p className="text-xs text-[#8A8578] mb-4">
        Every visit of the patient, with the height and weight taken that day and the doctor&apos;s notes.
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
            <div key={c.visit_id} className="rounded-xl border border-[#0B3D7A]/10 p-4">
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

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mb-2">
                <span>
                  <span className="text-[#8A8578]">Height:</span> <b>{showNumber(c.height_cm, "cm")}</b>
                </span>
                <span>
                  <span className="text-[#8A8578]">Weight:</span> <b>{showNumber(c.weight_kg, "kg")}</b>
                </span>
                {bmi && (
                  <span>
                    <span className="text-[#8A8578]">BMI:</span> <b>{bmi}</b>
                  </span>
                )}
              </div>

              {c.record_id ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-[#0B3D7A]/10 pt-2">
                  <div>
                    <dt className="text-[#8A8578] text-xs uppercase tracking-wide">Chief Complaint</dt>
                    <dd className="text-[#1A1A1A]">{c.chief_complaint || "—"}</dd>
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
                      <Ruler size={13} />
                      Enter Height &amp; Weight
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
                  <div>
                    <label className="block text-xs text-[#5B6470] mb-1">Height (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="30"
                      max="250"
                      value={form.height_cm}
                      onChange={(e) => setForm((p) => ({ ...p, height_cm: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5B6470] mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="300"
                      value={form.weight_kg}
                      onChange={(e) => setForm((p) => ({ ...p, weight_kg: e.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  {editing.mode === "notes" && (
                    <>
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
