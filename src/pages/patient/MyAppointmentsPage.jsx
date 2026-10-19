import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CalendarPlus, X } from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

const STATUS_STYLES = {
  Pending: "bg-[#F5E6C8] text-[#8A6D1F]",
  Approved: "bg-[#D6EAD9] text-[#1B5E20]",
  Rejected: "bg-[#F5D6D0] text-[#8A3B27]",
  Completed: "bg-[#DCE6F5] text-[#0B3D7A]",
};

const emptyForm = {
  appointment_date: "",
  appointment_time: "",
  reason: "",
};

export default function MyAppointmentsPage() {
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [myPatientId, setMyPatientId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadAll() {
    setIsLoading(true);
    setLoadError("");
    try {
      const meRes = await axios.get(`${API_BASE_URL}/patients/me`, { headers: authHeader });
      const patientId = meRes.data?.data?.id;
      setMyPatientId(patientId);

      const apptRes = await axios.get(`${API_BASE_URL}/appointments`, {
        headers: authHeader,
        params: { patient_id: patientId },
      });
      setAppointments(apptRes.data?.data ?? []);
    } catch (err) {
      setLoadError("Unable to load your appointments right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    if (!form.appointment_date || !form.appointment_time) {
      setFormError("Date and time are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/appointments`,
        { ...form, patient_id: myPatientId },
        { headers: authHeader }
      );
      setForm(emptyForm);
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to request appointment right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl text-[#1B5E20] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            My Appointments
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
            Request and track your health center visits
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-[#1B5E20] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#164D1A] transition-colors"
          style={{ fontFamily: "'Lora', serif" }}
        >
          {showForm ? <X size={16} /> : <CalendarPlus size={16} />}
          {showForm ? "Cancel" : "Request Appointment"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-xs text-[#5B6470] mb-1">Date</label>
            <input
              type="date"
              value={form.appointment_date}
              onChange={(e) => setForm((p) => ({ ...p, appointment_date: e.target.value }))}
              className="w-full rounded-full bg-[#F7F5F1] border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30"
              style={{ fontFamily: "'Lora', serif" }}
            />
          </div>
          <div>
            <label className="block text-xs text-[#5B6470] mb-1">Time</label>
            <input
              type="time"
              value={form.appointment_time}
              onChange={(e) => setForm((p) => ({ ...p, appointment_time: e.target.value }))}
              className="w-full rounded-full bg-[#F7F5F1] border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30"
              style={{ fontFamily: "'Lora', serif" }}
            />
          </div>
          <div>
            <label className="block text-xs text-[#5B6470] mb-1">Reason</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="e.g. Fever, check-up"
              className="w-full rounded-full bg-[#F7F5F1] border border-[#0B3D7A]/15 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30"
              style={{ fontFamily: "'Lora', serif" }}
            />
          </div>

          {formError && <p className="sm:col-span-3 text-sm text-[#8A3B27]">{formError}</p>}

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#092E5C] transition-colors disabled:opacity-60"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {isSubmitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
        {isLoading ? (
          <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-[#8A3B27]" style={{ fontFamily: "'Lora', serif" }}>{loadError}</p>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-[#8A8578] text-center py-6" style={{ fontFamily: "'Lora', serif" }}>
            No appointments yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {appointments.map((a) => (
              <div key={a.id} className="rounded-xl border border-[#0B3D7A]/10 p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Lora', serif" }}>
                    {a.appointment_date} · {a.appointment_time}
                  </p>
                  <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
                    {a.reason || "No reason given"}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_STYLES[a.status] || "bg-gray-100 text-gray-600"}`}
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}