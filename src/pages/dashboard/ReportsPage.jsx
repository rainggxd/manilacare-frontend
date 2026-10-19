import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Users, CalendarCheck, Clock, CheckCircle2, UserPlus, CalendarDays } from "lucide-react";
import axios from "axios";
import { HEALTH_CENTERS } from "../../utils/healthCenters";
import { localISO, toLocalISO, formatLongDate } from "../../utils/dates";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";


function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-[#1B5E20] text-white p-5 flex items-center gap-4">
      <div className="rounded-full bg-white/15 p-3 shrink-0">
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>
          {value}
        </p>
        <p className="text-xs text-white/80 mt-1" style={{ fontFamily: "'Lora', serif" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

function BarRow({ label, count, max, color = "#0B3D7A" }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-sm mb-1" style={{ fontFamily: "'Lora', serif" }}>
        <span className="text-[#1A1A1A]">{label}</span>
        <span className="font-bold text-[#1A1A1A]">{count}</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-[#0B3D7A]/10">
        <div
          className="h-2.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { auth } = useOutletContext();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // The day being reported. Defaults to today; the Admin can pick another day.
  const [reportDate, setReportDate] = useState(localISO());

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setLoadError("");
      try {
        const headers = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
        const [patientsRes, appointmentsRes, usersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/patients`, { headers }),
          axios.get(`${API_BASE_URL}/appointments`, { headers }),
          axios.get(`${API_BASE_URL}/users`, { headers }),
        ]);
        if (!cancelled) {
          setPatients(patientsRes.data?.data ?? []);
          setAppointments(appointmentsRes.data?.data ?? []);
          setUsers(usersRes.data?.data ?? []);
        }
      } catch (err) {
        if (!cancelled) setLoadError("Unable to load report data right now.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [auth?.token]);

  const stats = useMemo(() => {
    const totalPatients = patients.length;
    const totalAppointments = appointments.length;
    const pending = appointments.filter((a) => a.status === "Pending").length;
    const approved = appointments.filter((a) => a.status === "Approved").length;
    const rejected = appointments.filter((a) => a.status === "Rejected").length;
    const completed = appointments.filter((a) => a.status === "Completed").length;

    // An Admin only has data for their own center, so only show that one.
    const visibleCenters =
      auth?.user?.role === "Admin"
        ? HEALTH_CENTERS.filter((hc) => String(hc.id) === String(auth.user.health_center_id))
        : HEALTH_CENTERS;

    const byCenter = visibleCenters.map((hc) => ({
      ...hc,
      patientCount: patients.filter((p) => String(p.health_center_id) === String(hc.id)).length,
      appointmentCount: appointments.filter((a) => String(a.health_center_id) === String(hc.id)).length,
    }));

    const bySex = {
      Male: patients.filter((p) => p.sex === "Male").length,
      Female: patients.filter((p) => p.sex === "Female").length,
    };

    return { totalPatients, totalAppointments, pending, approved, rejected, completed, byCenter, bySex };
  }, [patients, appointments, auth?.user?.role, auth?.user?.health_center_id]);

  // Daily figures for the selected day
  const dailyStats = useMemo(() => {
    const onDay = (value) => toLocalISO(value) === reportDate;
    const dayAppointments = appointments.filter((a) => onDay(a.appointment_date));

    return {
      newPatients: patients.filter((p) => onDay(p.created_at)).length,
      newAccounts: users.filter((u) => onDay(u.created_at)).length,
      appointments: dayAppointments.length,
      completed: dayAppointments.filter((a) => a.status === "Completed").length,
    };
  }, [patients, users, appointments, reportDate]);

  // Completed appointments handled by each doctor on the selected day
  const doctorActivity = useMemo(() => {
    const doctors = users.filter((u) => u.role_name === "Doctor");

    return doctors
      .map((doc) => {
        const count = appointments.filter(
          (a) =>
            String(a.doctor_user_id) === String(doc.id) &&
            a.status === "Completed" &&
            toLocalISO(a.appointment_date) === reportDate
        ).length;
        return { id: doc.id, name: doc.full_name, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [users, appointments, reportDate]);

  const maxCenterPatients = Math.max(...stats.byCenter.map((c) => c.patientCount), 1);
  const maxSex = Math.max(stats.bySex.Male, stats.bySex.Female, 1);
  const maxDoctorActivity = Math.max(...doctorActivity.map((d) => d.count), 1);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
          Reports
        </h2>
        <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
          System-wide statistics for patients and appointments
        </p>
      </div>

      {loadError && (
        <p className="text-sm text-[#8A3B27] mb-4" style={{ fontFamily: "'Lora', serif" }}>
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Users} label="Total Patients" value={isLoading ? "…" : stats.totalPatients} />
        <StatCard icon={CalendarCheck} label="Total Appointments" value={isLoading ? "…" : stats.totalAppointments} />
        <StatCard icon={Clock} label="Pending" value={isLoading ? "…" : stats.pending} />
        <StatCard icon={CheckCircle2} label="Approved" value={isLoading ? "…" : stats.approved} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mt-4 mb-3">
        <h3 className="text-lg font-bold text-[#000000]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Daily Report: {formatLongDate(reportDate)}
        </h3>
        <label className="inline-flex items-center gap-2 text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
          <CalendarDays size={16} />
          <input
            type="date"
            value={reportDate}
            max={localISO()}
            onChange={(e) => setReportDate(e.target.value || localISO())}
            className="rounded-full bg-white border border-[#0B3D7A]/20 px-4 py-2 text-sm text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#0B3D7A]/30"
          />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={UserPlus} label="New Patients" value={isLoading ? "…" : dailyStats.newPatients} />
        <StatCard icon={CalendarCheck} label="Appointments" value={isLoading ? "…" : dailyStats.appointments} />
        <StatCard icon={CheckCircle2} label="Completed Appointments" value={isLoading ? "…" : dailyStats.completed} />
        <StatCard icon={Users} label="New Accounts" value={isLoading ? "…" : dailyStats.newAccounts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-[#0B3D7A]/20 p-6">
          <h3 className="text-lg font-bold text-[#000000] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Patients per Health Center
          </h3>
          {stats.byCenter.map((hc) => (
            <BarRow key={hc.id} label={hc.name} count={hc.patientCount} max={maxCenterPatients} color="#1B5E20" />
          ))}
        </div>

        <div className="rounded-2xl border border-[#0B3D7A]/20 p-6">
          <h3 className="text-lg font-bold text-[#000000] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Appointment Status Breakdown
          </h3>
          <BarRow label="Pending" count={stats.pending} max={stats.totalAppointments || 1} color="#CA8A04" />
          <BarRow label="Approved" count={stats.approved} max={stats.totalAppointments || 1} color="#1B5E20" />
          <BarRow label="Rejected" count={stats.rejected} max={stats.totalAppointments || 1} color="#8A3B27" />
          <BarRow label="Completed" count={stats.completed} max={stats.totalAppointments || 1} color="#0B3D7A" />
        </div>

        <div className="rounded-2xl border border-[#0B3D7A]/20 p-6">
          <h3 className="text-lg font-bold text-[#000000] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Patients by Sex
          </h3>
          <BarRow label="Male" count={stats.bySex.Male} max={maxSex} color="#0B3D7A" />
          <BarRow label="Female" count={stats.bySex.Female} max={maxSex} color="#8A3B27" />
        </div>

        <div className="rounded-2xl border border-[#0B3D7A]/20 p-6">
          <h3 className="text-lg font-bold text-[#000000] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Appointments per Health Center
          </h3>
          {stats.byCenter.map((hc) => (
            <BarRow
              key={hc.id}
              label={hc.name}
              count={hc.appointmentCount}
              max={Math.max(...stats.byCenter.map((c) => c.appointmentCount), 1)}
              color="#0B3D7A"
            />
          ))}
        </div>

        <div className="rounded-2xl border border-[#0B3D7A]/20 p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-[#000000] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            Doctor's Activity: {formatLongDate(reportDate)}
          </h3>
          <p className="text-xs text-[#8A8578] mb-4" style={{ fontFamily: "'Lora', serif" }}>
            Completed appointments handled by each doctor on the selected day
          </p>
          {doctorActivity.length === 0 ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>
              No Doctor accounts yet.
            </p>
          ) : (
            doctorActivity.map((d) => (
              <BarRow key={d.id} label={`Dr. ${d.name}`} count={d.count} max={maxDoctorActivity} color="#1B5E20" />
            ))
          )}
        </div>
      </div>

      <p className="text-xs text-[#5B6470] mt-6" style={{ fontFamily: "'Lora', serif" }}>
        Figures are computed live from current patient and appointment records.
      </p>
    </div>
  );
}