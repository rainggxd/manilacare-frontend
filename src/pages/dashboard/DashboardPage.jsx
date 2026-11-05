import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Users, Stethoscope, CalendarCheck, QrCode } from "lucide-react";
import axios from "axios";
import OutbreakAlert from "../../components/OutbreakAlert";
import { healthCenterName } from "../../utils/healthCenters";
import AppointmentCalendar from "../../components/AppointmentCalendar";
import { localISO, toLocalISO } from "../../utils/dates";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";


function StatCard({ icon: Icon, label, value, note }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-5 flex items-center gap-4">
      <div className="rounded-xl bg-[#0B3D7A]/10 text-[#0B3D7A] p-3 shrink-0">
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
          {value}
        </p>
        <p className="text-xs text-[#5B6470] mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
          {label}
        </p>
        {note && (
          <p className="text-[10px] text-[#8A94A6] mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Small dependency-free bar chart built with plain HTML/CSS (flexbox).
 * Using divs instead of a stretched SVG keeps the numbers and labels
 * from getting squished when the card is wide. `bars` is
 * [{ label, value, color }].
 */
function BarChart({ bars, height = 180 }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const plotHeight = height - 44; // room for the number above and label below

  return (
    <div className="flex items-end gap-3 sm:gap-6" style={{ height }}>
      {bars.map((b) => {
        const barHeight = b.value === 0 ? 3 : Math.max(6, (b.value / max) * plotHeight);
        return (
          <div key={b.label} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full">
            <span
              className="text-sm font-bold text-[#1A1A1A] mb-1"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {b.value}
            </span>
            <div
              className="w-full max-w-[64px] rounded-t-md"
              style={{
                height: barHeight,
                backgroundColor: b.color,
                opacity: b.value === 0 ? 0.25 : 1,
              }}
            />
            <span
              className="mt-2 text-[11px] text-[#5B6470] text-center truncate w-full"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {b.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_COLORS = {
  Pending: "#D4A017",
  Approved: "#1B5E20",
  Rejected: "#8A3B27",
  Completed: "#0B3D7A",
};

// "Mon 10/19" style label for the daily chart
function dayLabel(date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
}

export default function DashboardPage() {
  const { auth } = useOutletContext();
  const navigate = useNavigate();
  const user = auth?.user;
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setIsLoading(true);
      setLoadError("");
      try {
        const [patientsRes, apptRes, usersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/patients`, { headers: authHeader }),
          axios.get(`${API_BASE_URL}/appointments`, { headers: authHeader }),
          axios.get(`${API_BASE_URL}/users`, { headers: authHeader }),
        ]);
        if (!cancelled) {
          setPatients(patientsRes.data?.data ?? []);
          setAppointments(apptRes.data?.data ?? []);
          setUsers(usersRes.data?.data ?? []);
        }
      } catch (err) {
        if (!cancelled) setLoadError("Unable to load dashboard data right now.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const stats = useMemo(() => {
    const total = patients.length;
    const todayStr = new Date().toDateString();
    const todayISO = localISO();

    const availableDoctors = users.filter((u) => u.role_name === "Doctor" && Number(u.is_active) === 1).length;

    const appointmentsToday = appointments.filter(
      (a) => a.created_at && new Date(a.created_at).toDateString() === todayStr
    ).length;

    const registeredToday = patients.filter(
      (p) => p.created_at && new Date(p.created_at).toDateString() === todayStr
    ).length;

    return { total, availableDoctors, appointmentsToday, registeredToday, todayISO };
  }, [patients, appointments, users]);

  const recentPatients = useMemo(() => {
    return [...patients]
      .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
      .slice(0, 5);
  }, [patients]);

  // Daily appointments: last 7 days including today, counted by appointment_date
  const dailyAppointmentBars = useMemo(() => {
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
    }
    return days.map((day) => {
      const iso = localISO(day);
      const count = appointments.filter((a) => toLocalISO(a.appointment_date) === iso).length;
      return { label: dayLabel(day), value: count, color: "#0B3D7A" };
    });
  }, [appointments]);

  const appointmentStatusBars = useMemo(() => {
    return ["Pending", "Approved", "Rejected", "Completed"].map((status) => ({
      label: status,
      value: appointments.filter((a) => a.status === status).length,
      color: STATUS_COLORS[status],
    }));
  }, [appointments]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
          Welcome, {user?.full_name ?? "User"}!
        </h2>
      </div>

      <OutbreakAlert auth={auth} showTable />

      {loadError && (
        <p className="text-sm text-[#8A3B27] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Patients" value={isLoading ? "…" : stats.total} />
        <StatCard icon={Stethoscope} label="Available Doctors" value={isLoading ? "…" : stats.availableDoctors} />
        <StatCard icon={CalendarCheck} label="Appointments Made Today" value={isLoading ? "…" : stats.appointmentsToday} />
        <StatCard icon={QrCode} label="QR Scans Made Today" value="—" note="Coming soon — QR feature not built yet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            Daily Appointments (Last 7 Days)
          </h3>
          {isLoading ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Inter', sans-serif" }}>Loading…</p>
          ) : (
            <BarChart bars={dailyAppointmentBars} />
          )}
        </div>

        <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            Appointment Status
          </h3>
          {isLoading ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Inter', sans-serif" }}>Loading…</p>
          ) : (
            <BarChart bars={appointmentStatusBars} />
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold text-[#000000] mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
        Appointment Calendar
      </h3>
      <div className="mb-8">
        <AppointmentCalendar appointments={appointments} isLoading={isLoading} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-[#000000]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Recently Registered
        </h3>
        <button
          type="button"
          onClick={() => navigate("/dashboard/records")}
          className="text-sm font-semibold text-[#0B3D7A] hover:underline"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          View all records →
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr className="bg-[#F4F6F9] text-[#5B6470] text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Health Center</th>
              <th className="px-4 py-3 font-semibold">Age</th>
              <th className="px-4 py-3 font-semibold">Sex</th>
              <th className="px-4 py-3 font-semibold">Registered</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={5} className="px-4 py-6 text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && !loadError && recentPatients.length === 0 && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={5} className="px-4 py-6 text-center">No patient records yet.</td>
              </tr>
            )}
            {!isLoading &&
              !loadError &&
              recentPatients.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/dashboard/records/${p.id}`)}
                  className="bg-white text-[#1A1A1A] border-t border-[#E3E8EF] cursor-pointer hover:bg-[#F4F6F9] transition-colors"
                >
                  <td className="px-4 py-3">{p.full_name}</td>
                  <td className="px-4 py-3">{healthCenterName(p.health_center_id)}</td>
                  <td className="px-4 py-3">{p.age}</td>
                  <td className="px-4 py-3">{p.sex}</td>
                  <td className="px-4 py-3">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}