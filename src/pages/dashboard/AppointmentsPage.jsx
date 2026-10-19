import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Check, X, Trash2 } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../utils/healthCenters";

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
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

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
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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
    setActionError("");
    try {
      await axios.put(`${API_BASE_URL}/appointments/${id}/status`, { status }, { headers: authHeader });
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch (err) {
      setActionError("Unable to update appointment status right now.");
    }
  }

  async function handleDelete(id) {
    setActionError("");
    try {
      await axios.delete(`${API_BASE_URL}/appointments/${id}`, { headers: authHeader });
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setActionError("Unable to delete this appointment right now.");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Appointments
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
            Manage appointment requests and approvals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTodayOnly((prev) => !prev)}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
              todayOnly
                ? "bg-[#1B5E20] text-white hover:bg-[#164D1A]"
                : "bg-white text-[#1B5E20] border border-[#1B5E20]/30 hover:bg-[#EAF3EA]"
            }`}
            style={{ fontFamily: "'Lora', serif" }}
          >
            {todayOnly ? "Showing Today's Queue" : "Showing All Dates"}
          </button>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A] text-white px-6 py-3 text-sm font-semibold hover:bg-[#0A3468] transition-colors whitespace-nowrap"
          style={{ fontFamily: "'Lora', serif" }}
        >
          <Plus size={16} />
          New Appointment
        </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-[#1B5E20] text-white p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ fontFamily: "'Lora', serif" }}
        >
          <div>
            <label className="block text-xs text-white/80 mb-1">Patient</label>
            <select
              value={formData.patient_id}
              onChange={(e) => handleFormChange("patient_id", e.target.value)}
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            >
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Doctor (optional)</label>
            <select
              value={formData.doctor_user_id}
              onChange={(e) => handleFormChange("doctor_user_id", e.target.value)}
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            >
              <option value="">Unassigned</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Reason (optional)</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => handleFormChange("reason", e.target.value)}
              placeholder="e.g. Follow-up checkup"
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Date</label>
            <input
              type="date"
              value={formData.appointment_date}
              onChange={(e) => handleFormChange("appointment_date", e.target.value)}
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Time</label>
            <input
              type="time"
              value={formData.appointment_time}
              onChange={(e) => handleFormChange("appointment_time", e.target.value)}
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            />
          </div>

          {formError && <p className="sm:col-span-2 text-sm text-red-200">{formError}</p>}

          <div className="sm:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-white text-[#1B5E20] px-6 py-2.5 text-sm font-bold hover:bg-white/90 disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save Appointment"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full bg-white/20 px-6 py-2.5 text-sm font-bold hover:bg-white/30"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {actionError && (
        <p className="text-sm text-[#8A3B27] mb-3" style={{ fontFamily: "'Lora', serif" }}>
          {actionError}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#0B3D7A]/20">
        <table className="w-full min-w-[940px] border-collapse text-left" style={{ fontFamily: "'Lora', serif" }}>
          <thead>
            <tr className="bg-[#0B3D7A] text-white">
              <th className="px-4 py-3 font-bold">Patient</th>
              <th className="px-4 py-3 font-bold">Doctor</th>
              <th className="px-4 py-3 font-bold">Health Center</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Time</th>
              <th className="px-4 py-3 font-bold">Reason</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={8} className="px-4 py-6 text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && loadError && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={8} className="px-4 py-6 text-center">{loadError}</td>
              </tr>
            )}
            {!isLoading && !loadError && sortedAppointments.length === 0 && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={8} className="px-4 py-6 text-center">No appointments yet.</td>
              </tr>
            )}
            {!isLoading &&
              !loadError &&
              sortedAppointments.map((a) => (
                <tr key={a.id} className="bg-[#1B5E20] text-white border-t border-white/10">
                  <td className="px-4 py-3">{a.patient_name}</td>
                  <td className="px-4 py-3">{a.doctor_name ? `Dr. ${a.doctor_name}` : "Unassigned"}</td>
                  <td className="px-4 py-3">{healthCenterName(a.health_center_id)}</td>
                  <td className="px-4 py-3">{a.appointment_date}</td>
                  <td className="px-4 py-3">{a.appointment_time}</td>
                  <td className="px-4 py-3">{a.reason || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    {confirmDeleteId === a.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs">Delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          className="rounded-full bg-[#8A3B27] px-3 py-1 text-xs font-bold hover:bg-[#6f2f1f]"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        {a.status === "Pending" && (
                          <>
                            <button
                              type="button"
                              title="Approve"
                              onClick={() => handleStatusChange(a.id, "Approved")}
                              className="rounded-full p-2 hover:bg-white/20 text-white"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              title="Reject"
                              onClick={() => handleStatusChange(a.id, "Rejected")}
                              className="rounded-full p-2 hover:bg-white/20 text-white"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => setConfirmDeleteId(a.id)}
                          className="rounded-full p-2 hover:bg-white/20 text-white"
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