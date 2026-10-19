import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { CalendarClock, UserCheck, Users, PhoneCall, Loader2 } from "lucide-react";
import axios from "axios";
import OutbreakAlert from "../../components/OutbreakAlert";
import AppointmentCalendar from "../../components/AppointmentCalendar";
import { localISO, toLocalISO } from "../../utils/dates";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

// Today's date in Philippine time (see utils/dates.js)
function todayISO() {
  return localISO();
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 flex items-center gap-4">
      <div className="rounded-full bg-[#0B3D7A]/10 p-3">
        <Icon size={22} className="text-[#0B3D7A]" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {value}
        </p>
        <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

export default function StaffDashboardPage() {
  const { auth } = useOutletContext();
  const navigate = useNavigate();
  const user = auth?.user;
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalling, setIsCalling] = useState(false);
  const [callError, setCallError] = useState("");

  async function loadData() {
    setIsLoading(true);
    try {
      const [apptRes, visitRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/appointments`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/visits`, { headers: authHeader }),
      ]);
      setAppointments(apptRes.data?.data ?? []);
      setVisits(visitRes.data?.data ?? []);
    } catch (err) {
      // stats stay at zero on failure
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const todaysAppointments = useMemo(
    () => appointments.filter((a) => toLocalISO(a.appointment_date) === todayISO() && a.status !== "Rejected"),
    [appointments]
  );

  const todaysVisits = useMemo(() => visits.filter((v) => v.visit_date === todayISO()), [visits]);

  const nowServing = useMemo(
    () => todaysVisits.find((v) => v.status === "In Progress") || null,
    [todaysVisits]
  );

  const waitingQueue = useMemo(
    () =>
      todaysVisits
        .filter((v) => v.status === "Checked-in")
        .sort((a, b) => (a.queue_number ?? 0) - (b.queue_number ?? 0)),
    [todaysVisits]
  );

  const waitingCount = waitingQueue.length;

  async function handleCallNext() {
    setIsCalling(true);
    setCallError("");
    try {
      await axios.post(`${API_BASE_URL}/visits/call-next`, {}, { headers: authHeader });
      await loadData();
    } catch (err) {
      setCallError(err.response?.data?.message || "Unable to call the next patient right now.");
    } finally {
      setIsCalling(false);
    }
  }

  return (
    <div>
      <h2 className="text-3xl text-[#1B5E20] font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
        Welcome, {user?.full_name ?? "Staff"}!
      </h2>

      <OutbreakAlert auth={auth} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatCard icon={CalendarClock} label="Today's Appointments" value={isLoading ? "…" : todaysAppointments.length} />
        <StatCard icon={UserCheck} label="Checked In Today" value={isLoading ? "…" : todaysVisits.length} />
        <StatCard icon={Users} label="Currently Waiting" value={isLoading ? "…" : waitingCount} />
      </div>

      {/* Queue calling panel */}
      <div className="rounded-2xl bg-[#1B5E20] text-white p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-white/70 uppercase tracking-wider mb-1" style={{ fontFamily: "'Lora', serif" }}>
              Now Serving
            </p>
            {nowServing ? (
              <div>
                <p className="text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Queue #{nowServing.queue_number ?? "—"}
                </p>
                <p className="text-white/85 mt-1" style={{ fontFamily: "'Lora', serif" }}>
                  {nowServing.patient_name}
                </p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-white/60" style={{ fontFamily: "'Playfair Display', serif" }}>
                No patient currently serving
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleCallNext}
            disabled={isCalling || waitingCount === 0}
            className="inline-flex items-center gap-2 rounded-full bg-white text-[#1B5E20] px-6 py-3 text-sm font-bold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "'Lora', serif" }}
          >
            {isCalling ? <Loader2 size={16} className="animate-spin" /> : <PhoneCall size={16} />}
            {isCalling ? "Calling…" : "Call Next Patient"}
          </button>
        </div>

        {callError && (
          <p className="text-sm text-red-200 mt-3" style={{ fontFamily: "'Lora', serif" }}>
            {callError}
          </p>
        )}

        {waitingCount > 0 && (
          <div className="mt-5 pt-4 border-t border-white/15">
            <p className="text-xs text-white/70 uppercase tracking-wider mb-2" style={{ fontFamily: "'Lora', serif" }}>
              Waiting in Queue ({waitingCount})
            </p>
            <div className="flex flex-wrap gap-2">
              {waitingQueue.slice(0, 10).map((v) => (
                <span
                  key={v.id}
                  className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold"
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  #{v.queue_number ?? "—"} {v.patient_name}
                </span>
              ))}
              {waitingCount > 10 && (
                <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/70" style={{ fontFamily: "'Lora', serif" }}>
                  +{waitingCount - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-xl font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Appointment Calendar
        </h3>
        <button
          type="button"
          onClick={() => navigate("/staff/check-in")}
          className="rounded-full bg-[#0B3D7A] text-white px-5 py-2 text-sm font-semibold hover:bg-[#0A3468] transition-colors"
          style={{ fontFamily: "'Lora', serif" }}
        >
          Go to Check-In
        </button>
      </div>
      <AppointmentCalendar appointments={appointments} isLoading={isLoading} />
    </div>
  );
}