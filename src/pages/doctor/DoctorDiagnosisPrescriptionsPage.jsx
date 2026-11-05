import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Stethoscope, Pill, Pencil, Check, X, Printer } from "lucide-react";
import axios from "axios";
import { printPrescription } from "../../utils/printPrescription";
import { localISO, toLocalISO } from "../../utils/dates";
import { useConfirm } from "../../components/ConfirmDialog";
import SearchableSelect from "../../components/SearchableSelect";
import { patientOptions } from "../../utils/patientOptions";
import CheckupHistoryCard from "../../components/CheckupHistoryCard";
import LabResultsCard from "../../components/LabResultsCard";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

const emptyRxForm = {
  medication: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
  date_prescribed: localISO(),
};

export default function DoctorDiagnosisPrescriptionsPage() {
  const confirm = useConfirm();
  const { auth } = useOutletContext();
  const user = auth?.user;
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientDetail, setPatientDetail] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isEditingDisease, setIsEditingDisease] = useState(false);
  const [diseaseDraft, setDiseaseDraft] = useState("");
  const [savingDisease, setSavingDisease] = useState(false);

  const [showRxForm, setShowRxForm] = useState(false);
  const [rxForm, setRxForm] = useState(emptyRxForm);
  const [rxError, setRxError] = useState("");
  const [savingRx, setSavingRx] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPatients() {
      setIsLoadingPatients(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/patients`, { headers: authHeader });
        const all = res.data?.data ?? [];
        const mine = all.filter((p) => String(p.health_center_id) === String(user?.health_center_id));
        if (!cancelled) setPatients(mine);
      } catch (err) {
        // leave empty on failure
      } finally {
        if (!cancelled) setIsLoadingPatients(false);
      }
    }
    loadPatients();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  async function loadPatientDetail(patientId) {
    if (!patientId) {
      setPatientDetail(null);
      setPrescriptions([]);
      return;
    }
    setIsLoadingDetail(true);
    try {
      const [patientRes, rxRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/patients/${patientId}`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/prescriptions`, { headers: authHeader, params: { patient_id: patientId } }),
      ]);
      const p = patientRes.data?.data ?? null;
      setPatientDetail(p);
      setDiseaseDraft(p?.disease_type ?? "");
      setPrescriptions(rxRes.data?.data ?? []);
    } catch (err) {
      setPatientDetail(null);
      setPrescriptions([]);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  useEffect(() => {
    setIsEditingDisease(false);
    setShowRxForm(false);
    loadPatientDetail(selectedPatientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId]);

  async function handleSaveDisease() {
    const ok = await confirm({ title: "Save the diagnosis?", message: "It will be saved to the patient's record.", confirmText: "Yes, save" });
    if (!ok) return;
    setSavingDisease(true);
    try {
      await axios.put(
        `${API_BASE_URL}/patients/${selectedPatientId}/disease`,
        { disease_type: diseaseDraft || null },
        { headers: authHeader }
      );
      setPatientDetail((prev) => ({ ...prev, disease_type: diseaseDraft }));
      setIsEditingDisease(false);
    } catch (err) {
      // keep editor open to retry
    } finally {
      setSavingDisease(false);
    }
  }

  async function handleAddPrescription(e) {
    e.preventDefault();
    setRxError("");
    if (!rxForm.medication.trim() || !rxForm.date_prescribed) {
      setRxError("Medication and date are required.");
      return;
    }
    const okRx = await confirm({
      title: "Add this prescription?",
      message: `${rxForm.medication.trim()}${rxForm.dosage ? ` (${rxForm.dosage})` : ""}`,
      confirmText: "Yes, add",
    });
    if (!okRx) return;
    setSavingRx(true);
    try {
      await axios.post(
        `${API_BASE_URL}/prescriptions`,
        { ...rxForm, patient_id: selectedPatientId },
        { headers: authHeader }
      );
      setRxForm(emptyRxForm);
      setShowRxForm(false);
      await loadPatientDetail(selectedPatientId);
    } catch (err) {
      setRxError(err.response?.data?.message || "Unable to save prescription right now.");
    } finally {
      setSavingRx(false);
    }
  }

  // Prints every prescription that has the same date as the newest one,
  // so all the medicines from one consultation go on one slip.
  function handlePrintLatest() {
    if (prescriptions.length === 0) return;
    const newest = [...prescriptions]
      .map((rx) => toLocalISO(rx.date_prescribed))
      .sort()
      .pop();
    const sameDay = prescriptions.filter((rx) => toLocalISO(rx.date_prescribed) === newest);
    printPrescription({ patient: patientDetail, prescriptions: sameDay, doctorName: user?.full_name });
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
            Diagnosis & Prescriptions
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Select a patient to view or update their diagnosis and prescriptions
          </p>
        </div>
        {isLoadingPatients ? (
          <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Inter', sans-serif" }}>Loading patients…</p>
        ) : (
          <SearchableSelect
            className="w-full sm:w-96"
            size="lg"
            options={patientOptions(patients)}
            value={selectedPatientId}
            onChange={setSelectedPatientId}
            placeholder="Search or select a patient…"
            ariaLabel="Patient"
          />
        )}
      </div>

      {!selectedPatientId && (
        <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-10 text-center">
          <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Pick a patient above to get started.
          </p>
        </div>
      )}

      {selectedPatientId && isLoadingDetail && (
        <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Inter', sans-serif" }}>Loading…</p>
      )}

      {selectedPatientId && !isLoadingDetail && patientDetail && (
        <>
          <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6 mb-6">
            <h3 className="text-xl font-bold text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
              {patientDetail.full_name}
            </h3>
            <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
              {patientDetail.age} yrs · {patientDetail.sex}
            </p>
          </div>

          {/* Vital signs + physical assessment + check-up notes */}
          <CheckupHistoryCard key={`checkups-${selectedPatientId}`} patientId={selectedPatientId} auth={auth} />

          {/* Diagnosis card */}
          <div className="rounded-2xl bg-[#1B5E20] text-white shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Stethoscope size={20} />
                <h3 className="text-lg font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Diagnosis
                </h3>
              </div>
              {!isEditingDisease && (
                <button
                  type="button"
                  onClick={() => {
                    setDiseaseDraft(patientDetail.disease_type ?? "");
                    setIsEditingDisease(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <Pencil size={14} />
                  {patientDetail.disease_type ? "Edit" : "Add diagnosis"}
                </button>
              )}
            </div>

            {isEditingDisease ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  autoFocus
                  value={diseaseDraft}
                  onChange={(e) => setDiseaseDraft(e.target.value)}
                  placeholder="e.g. Pulmonary Tuberculosis"
                  className="flex-1 rounded-full bg-white px-5 py-2.5 text-sm text-[#1A1A1A] outline-none"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDisease}
                    disabled={savingDisease}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#1B5E20] px-4 py-2.5 text-sm font-bold hover:bg-white/90 disabled:opacity-60"
                  >
                    <Check size={14} />
                    {savingDisease ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingDisease(false)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/25"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-white/90" style={{ fontFamily: "'Inter', sans-serif" }}>
                {patientDetail.disease_type || "No diagnosis recorded yet."}
              </p>
            )}
          </div>

          {/* Prescriptions card */}
          <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Pill size={20} className="text-[#0B3D7A]" />
                <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Prescriptions
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {prescriptions.length > 0 && (
                  <button
                    type="button"
                    onClick={handlePrintLatest}
                    className="inline-flex items-center gap-2 rounded-full bg-white border border-[#0B3D7A]/30 text-[#0B3D7A] px-5 py-2.5 text-sm font-semibold hover:bg-[#0B3D7A]/5 transition-colors"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                    title="Print all prescriptions from the latest date"
                  >
                    <Printer size={16} />
                    Print Latest
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowRxForm((v) => !v)}
                  className="rounded-full bg-[#0B3D7A] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#092E5C] transition-colors"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {showRxForm ? "Cancel" : "+ New Prescription"}
                </button>
              </div>
            </div>

            {showRxForm && (
              <form
                onSubmit={handleAddPrescription}
                className="rounded-xl bg-[#F7F5F1] border border-[#E3E8EF] p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-xs text-[#5B6470] mb-1">Medication</label>
                  <input
                    type="text"
                    value={rxForm.medication}
                    onChange={(e) => setRxForm((p) => ({ ...p, medication: e.target.value }))}
                    className="w-full rounded-full bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#5B6470] mb-1">Dosage</label>
                  <input
                    type="text"
                    value={rxForm.dosage}
                    onChange={(e) => setRxForm((p) => ({ ...p, dosage: e.target.value }))}
                    placeholder="e.g. 500mg"
                    className="w-full rounded-full bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#5B6470] mb-1">Frequency</label>
                  <input
                    type="text"
                    value={rxForm.frequency}
                    onChange={(e) => setRxForm((p) => ({ ...p, frequency: e.target.value }))}
                    placeholder="e.g. 3x a day"
                    className="w-full rounded-full bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#5B6470] mb-1">Duration</label>
                  <input
                    type="text"
                    value={rxForm.duration}
                    onChange={(e) => setRxForm((p) => ({ ...p, duration: e.target.value }))}
                    placeholder="e.g. 7 days"
                    className="w-full rounded-full bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#5B6470] mb-1">Date Prescribed</label>
                  <input
                    type="date"
                    value={rxForm.date_prescribed}
                    onChange={(e) => setRxForm((p) => ({ ...p, date_prescribed: e.target.value }))}
                    className="w-full rounded-full bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#5B6470] mb-1">Instructions (optional)</label>
                  <textarea
                    rows={2}
                    value={rxForm.instructions}
                    onChange={(e) => setRxForm((p) => ({ ...p, instructions: e.target.value }))}
                    className="w-full rounded-2xl bg-white border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30 resize-none"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                </div>

                {rxError && <p className="sm:col-span-2 text-sm text-[#8A3B27]">{rxError}</p>}

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={savingRx}
                    className="rounded-full bg-[#1B5E20] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#164D1A] transition-colors disabled:opacity-60"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {savingRx ? "Saving…" : "Save Prescription"}
                  </button>
                </div>
              </form>
            )}

            {prescriptions.length === 0 ? (
              <p className="text-sm text-[#8A8578] text-center py-6" style={{ fontFamily: "'Inter', sans-serif" }}>
                No prescriptions recorded yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="rounded-xl border border-[#E3E8EF] p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {rx.medication}
                          {rx.dosage ? ` — ${rx.dosage}` : ""}
                        </p>
                        <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {[rx.frequency, rx.duration].filter(Boolean).join(" · ") || "—"}
                        </p>
                        {rx.instructions && (
                          <p className="text-sm text-[#5B6470] mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {rx.instructions}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-[#8A8578]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {formatDate(rx.date_prescribed)}
                        </p>
                        <p className="text-xs text-[#8A8578]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          Dr. {rx.doctor_name || "—"}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            printPrescription({ patient: patientDetail, prescriptions: [rx], doctorName: rx.doctor_name || user?.full_name })
                          }
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#0B3D7A]/30 px-3 py-1 text-xs font-semibold text-[#0B3D7A] hover:bg-[#0B3D7A]/5"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          <Printer size={13} />
                          Print
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Laboratory / X-ray results */}
          <div className="mt-6">
            <LabResultsCard key={`labs-${selectedPatientId}`} patientId={selectedPatientId} auth={auth} />
          </div>
        </>
      )}
    </div>
  );
}