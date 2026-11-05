import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, UserPlus, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { formatTime } from "../../utils/dates";
import { useConfirm } from "../../components/ConfirmDialog";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_STYLES = {
  "Checked-in": "bg-yellow-500/90",
  "In Progress": "bg-[#0B3D7A]",
  Completed: "bg-[#1B5E20]",
  Cancelled: "bg-[#8A3B27]",
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold text-white ${STATUS_STYLES[status] || "bg-gray-500"}`}>
      {status}
    </span>
  );
}

export default function CheckInPage() {
  const confirm = useConfirm();
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState("");
  const [checkInSuccess, setCheckInSuccess] = useState("");

  async function loadAll() {
    setIsLoading(true);
    setLoadError("");
    try {
      const [patientsRes, apptRes, visitsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/patients`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/appointments`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/visits`, { headers: authHeader }),
      ]);
      setPatients(patientsRes.data?.data ?? []);
      setAppointments(apptRes.data?.data ?? []);
      setVisits(visitsRes.data?.data ?? []);
    } catch (err) {
      setLoadError("Unable to load check-in data right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  // Appointments booked for today that haven't been checked in yet
  const todaysAppointments = useMemo(() => {
    const checkedInApptIds = new Set(visits.map((v) => v.appointment_id).filter(Boolean));
    return appointments.filter(
      (a) =>
        a.appointment_date === todayISO() &&
        a.status === "Approved" &&
        !checkedInApptIds.has(a.id)
    );
  }, [appointments, visits]);

  const todaysVisits = useMemo(
    () => visits.filter((v) => v.visit_date === todayISO()).sort((a, b) => b.id - a.id),
    [visits]
  );

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return patients.filter((p) => p.full_name?.toLowerCase().includes(q)).slice(0, 8);
  }, [search, patients]);

  async function checkIn(patientId, appointmentId = null) {
    const p = patients.find((x) => String(x.id) === String(patientId));
    const ok = await confirm({ title: `Check in ${p?.full_name ?? "this patient"}?`, message: "A queue number will be given for today's visit.", confirmText: "Yes, check in" });
    if (!ok) return;
    setCheckInError("");
    setCheckInSuccess("");
    setIsCheckingIn(true);
    try {
      await axios.post(
        `${API_BASE_URL}/visits/check-in`,
        { patient_id: patientId, appointment_id: appointmentId },
        { headers: authHeader }
      );
      setCheckInSuccess("Patient checked in successfully.");
      setSearch("");
      setSelectedPatientId("");
      await loadAll();
    } catch (err) {
      setCheckInError(err.response?.data?.message || "Unable to check in this patient.");
    } finally {
      setIsCheckingIn(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
          Patient Check-In
        </h2>
        <p className="text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Check in patients arriving for a booked appointment, or as a walk-in
        </p>
      </div>

      {checkInError && (
        <p className="text-sm text-[#8A3B27] mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>{checkInError}</p>
      )}
      {checkInSuccess && (
        <p className="text-sm text-[#1B5E20] mb-3 flex items-center gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
          <CheckCircle2 size={16} /> {checkInSuccess}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Today's appointments awaiting check-in */}
        <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            Today's Appointments
          </h3>
          {isLoading ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Inter', sans-serif" }}>Loading…</p>
          ) : todaysAppointments.length === 0 ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Inter', sans-serif" }}>
              No approved appointments left to check in for today.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {todaysAppointments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-[#E3E8EF] px-4 py-3"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{a.patient_name}</p>
                    <p className="text-xs text-[#8A8578]">{formatTime(a.appointment_time)} · {a.reason || "Consultation"}</p>
                  </div>
                  <button
                    type="button"
                    disabled={isCheckingIn}
                    onClick={() => checkIn(a.patient_id, a.id)}
                    className="rounded-full bg-[#0B3D7A] text-white px-4 py-2 text-xs font-semibold hover:bg-[#0A3468] transition-colors disabled:opacity-60"
                  >
                    Check In
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Walk-in check-in */}
        <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-1 flex items-center gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
            <UserPlus size={18} className="text-[#0B3D7A]" /> Walk-In Check-In
          </h3>
          <p className="text-sm text-[#5B6470] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            Search a patient who doesn't have a booked appointment today
          </p>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8578]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedPatientId("");
              }}
              placeholder="Search patient by name…"
              className="w-full rounded-lg bg-white border border-[#CBD5E1] pl-10 pr-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20"
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
          </div>

          {search.trim() && (
            <div className="rounded-xl border border-[#E3E8EF] divide-y divide-[#E3E8EF] mb-3 max-h-56 overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  No matching patients.
                </p>
              ) : (
                filteredPatients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPatientId(String(p.id))}
                    className={`w-full text-left px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F4F6F9] transition-colors ${
                      selectedPatientId === String(p.id) ? "bg-[#0B3D7A]/10 text-[#0B3D7A] font-semibold" : ""
                    }`}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {p.full_name}
                  </button>
                ))
              )}
            </div>
          )}

          <button
            type="button"
            disabled={!selectedPatientId || isCheckingIn}
            onClick={() => checkIn(selectedPatientId, null)}
            className="w-full rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#0A3468] disabled:opacity-50 transition-colors"
          >
            {isCheckingIn ? "Checking in…" : "Check In as Walk-In"}
          </button>
        </div>
      </div>

      {/* Today's visit log */}
      <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr className="bg-[#F4F6F9] text-[#5B6470] text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Purpose</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={4} className="px-4 py-6 text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && loadError && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={4} className="px-4 py-6 text-center">{loadError}</td>
              </tr>
            )}
            {!isLoading && !loadError && todaysVisits.length === 0 && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={4} className="px-4 py-6 text-center">No check-ins yet today.</td>
              </tr>
            )}
            {!isLoading &&
              !loadError &&
              todaysVisits.map((v) => (
                <tr key={v.id} className="bg-white text-[#1A1A1A] border-t border-[#E3E8EF]">
                  <td className="px-4 py-3">{v.patient_name}</td>
                  <td className="px-4 py-3">{formatTime(v.visit_time)}</td>
                  <td className="px-4 py-3">{v.purpose || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={v.status} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}