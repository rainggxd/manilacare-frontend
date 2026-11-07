import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Check, X, Trash2 } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../utils/healthCenters";
import { formatTime, formatLongDate } from "../../utils/dates";
import SearchableSelect from "../../components/SearchableSelect";
import { patientOptions } from "../../utils/patientOptions";
import { useConfirm } from "../../components/ConfirmDialog";
import { appointmentStatusConfirm } from "../../utils/appointmentConfirm";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";


const STATUS_STYLES = {
  Pending: "bg-yellow-500/90",
  Approved: "bg-[#1B5E20]",
  Rejected: "bg-[#8A3B27]",
  Completed: "bg-[#0B3D7A]",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold text-white ${STATUS_STYLES[status] || "bg-gray-500"}`}
    >
      {status}
    </span>
  );
}

export default function AppointmentsPage() {
  const confirm = useConfirm();
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
  // Nurses can see the appointments but cannot add, approve, or delete them.
  const readOnly = auth?.user?.role === "Nurse";

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [todayOnly, setTodayOnly] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_user_id: "",
    appointment_date: "",
    appointment_time: "",
    reason: "",
  });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [actionError, setActionError] = useState("");

  async function loadAppointments() {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await axios.get(`${API_BASE_URL}/appointments`, { headers: authHeader });
      setAppointments(response.data?.data ?? []);
    } catch (err) {
      setLoadError("Unable to load appointments right now.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPatients() {
    try {
      const response = await axios.get(`${API_BASE_URL}/patients`, { headers: authHeader });
      setPatients(response.data?.data ?? []);
    } catch (err) {
      // Silently ignored here — the form itself will just show an empty
      // patient list, and the table above already surfaces the real error.
    }
  }

  async function loadDoctors() {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, { headers: authHeader });
      const all = response.data?.data ?? [];
      setDoctors(all.filter((u) => u.role_name === "Doctor"));
    } catch (err) {
      // Same as patients above — form just shows an empty doctor list.
    }
  }

  useEffect(() => {
    loadAppointments();
    loadPatients();
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  function doctorName(id) {
    return doctors.find((d) => String(d.id) === String(id))?.full_name ?? "";
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const sortedAppointments = useMemo(() => {
    let list = appointments;
    if (todayOnly) {
      list = list.filter((a) => a.appointment_date === todayStr);
    }
    return [...list].sort((a, b) => {
      const dateA = `${a.appointment_date} ${a.appointment_time}`;
      const dateB = `${b.appointment_date} ${b.appointment_time}`;
      return dateA.localeCompare(dateB);
    });
  }, [appointments, todayOnly, todayStr]);

  function handleFormChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");

    if (!formData.patient_id || !formData.appointment_date || !formData.appointment_time) {
      setFormError("Patient, date, and time are required.");
      return;
    }

    const patientName = patients.find((x) => String(x.id) === String(formData.patient_id))?.full_name ?? "the patient";
    const okCreate = await confirm({
      title: "Create this appointment?",
      message: `For ${patientName} on ${formatLongDate(formData.appointment_date)} at ${formatTime(formData.appointment_time)}.`,
      confirmText: "Yes, create",
    });
    if (!okCreate) return;

    setIsSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/appointments`, formData, { headers: authHeader });
      setFormData({ patient_id: "", doctor_user_id: "", appointment_date: "", appointment_time: "", reason: "" });
      setShowForm(false);
      await loadAppointments();
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to create appointment.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(id, status) {
    const appt = appointments.find((a) => a.id === id);
    const ok = await confirm(appointmentStatusConfirm(status, appt?.patient_name));
    if (!ok) return;
    setActionError("");
    try {
      await axios.put(`${API_BASE_URL}/appointments/${id}/status`, { status }, { headers: authHeader });
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch (err) {
      setActionError("Unable to update appointment status right now.");
    }
  }

  async function handleDelete(id) {
    const appt = appointments.find((a) => a.id === id);
    const ok = await confirm({
      title: "Delete this appointment?",
      message: `${appt?.patient_name ?? "This"} appointment will be removed. This cannot be undone.`,
      confirmText: "Yes, delete",
      tone: "danger",
    });
    if (!ok) return;
    setActionError("");
    try {
      await axios.delete(`${API_BASE_URL}/appointments/${id}`, { headers: authHeader });
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setActionError("Unable to delete this appointment right now.");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
            Appointments
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {readOnly ? "Appointments of your health center (view only)" : "Manage appointment requests and approvals"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTodayOnly((prev) => !prev)}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
              todayOnly
                ? "bg-[#0B3D7A]/10 text-[#0B3D7A] border border-[#0B3D7A]/30 hover:bg-[#0B3D7A]/15"
                : "bg-white text-[#3D4653] border border-[#E3E8EF] hover:bg-[#F4F6F9]"
            }`}
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {todayOnly ? "Showing Today's Queue" : "Showing All Dates"}
          </button>
        {!readOnly && (
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A] text-white px-6 py-3 text-sm font-semibold hover:bg-[#0A3468] transition-colors whitespace-nowrap"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <Plus size={16} />
          New Appointment
        </button>
        )}
        </div>
      </div>

      {showForm && !readOnly && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Patient</label>
            <SearchableSelect
              rounded="lg"
              options={patientOptions(patients)}
              value={formData.patient_id}
              onChange={(id) => handleFormChange("patient_id", id)}
              placeholder="Type a name, family no. or mobile…"
              ariaLabel="Patient"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Doctor (optional)</label>
            <SearchableSelect
              rounded="lg"
              emptyLabel="Unassigned"
              options={doctors.map((d) => ({ value: d.id, label: `Dr. ${d.full_name}` }))}
              value={formData.doctor_user_id}
              onChange={(v) => handleFormChange("doctor_user_id", v)}
              ariaLabel="Doctor"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Reason (optional)</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => handleFormChange("reason", e.target.value)}
              placeholder="e.g. Follow-up checkup"
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Date</label>
            <input
              type="date"
              min={new Date().toLocaleDateString("en-CA")} /* past days cannot be picked */
              value={formData.appointment_date}
              onChange={(e) => handleFormChange("appointment_date", e.target.value)}
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Time</label>
            <input
              type="time"
              value={formData.appointment_time}
              onChange={(e) => handleFormChange("appointment_time", e.target.value)}
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20"
            />
          </div>

          {formError && <p className="sm:col-span-2 text-sm text-[#B3261E]">{formError}</p>}

          <div className="sm:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#0A3468] disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save Appointment"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full bg-[#F4F6F9] text-[#3D4653] border border-[#E3E8EF] px-6 py-2.5 text-sm font-bold hover:bg-[#E3E8EF]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {actionError && (
        <p className="text-sm text-[#8A3B27] mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
          {actionError}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-sm">
        <table className="w-full min-w-[940px] border-collapse text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr className="bg-[#F4F6F9] text-[#5B6470] text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Doctor</th>
              <th className="px-4 py-3 font-semibold">Health Center</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Reason</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={8} className="px-4 py-6 text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && loadError && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={8} className="px-4 py-6 text-center">{loadError}</td>
              </tr>
            )}
            {!isLoading && !loadError && sortedAppointments.length === 0 && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={8} className="px-4 py-6 text-center">No appointments yet.</td>
              </tr>
            )}
            {!isLoading &&
              !loadError &&
              sortedAppointments.map((a) => (
                <tr key={a.id} className="bg-white text-[#1A1A1A] border-t border-[#E3E8EF]">
                  <td className="px-4 py-3">{a.patient_name}</td>
                  <td className="px-4 py-3">{a.doctor_name ? `Dr. ${a.doctor_name}` : "Unassigned"}</td>
                  <td className="px-4 py-3">{healthCenterName(a.health_center_id)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatLongDate(String(a.appointment_date).slice(0, 10))}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatTime(a.appointment_time)}</td>
                  <td className="px-4 py-3">{a.reason || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <span className="block text-right text-xs text-[#8A94A6]">View only</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        {a.status === "Pending" && (
                          <>
                            <button
                              type="button"
                              title="Approve"
                              onClick={() => handleStatusChange(a.id, "Approved")}
                              className="rounded-full p-2 text-[#5B6470] hover:bg-[#F4F6F9] hover:text-[#0B3D7A]"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              title="Reject"
                              onClick={() => handleStatusChange(a.id, "Rejected")}
                              className="rounded-full p-2 text-[#5B6470] hover:bg-[#F4F6F9] hover:text-[#0B3D7A]"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => handleDelete(a.id)}
                          className="rounded-full p-2 text-[#5B6470] hover:bg-[#F4F6F9] hover:text-[#0B3D7A]"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}