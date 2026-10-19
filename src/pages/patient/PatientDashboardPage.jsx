import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { User, CalendarClock, Pill, MapPin } from "lucide-react";
import axios from "axios";
import OutbreakAlert from "../../components/OutbreakAlert";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#0B3D7A]/10 last:border-0">
      <span className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
        {label}
      </span>
      <span className="text-sm font-bold text-[#1A1A1A]" style={{ fontFamily: "'Lora', serif" }}>
        {value || "—"}
      </span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 flex items-center gap-4 text-left hover:shadow-md transition-shadow"
    >
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
    </button>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function PatientDashboardPage() {
  const { auth } = useOutletContext();
  const navigate = useNavigate();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [patient, setPatient] = useState(null);
  const [healthCenterName, setHealthCenterName] = useState("");
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError("");
      try {
        const meRes = await axios.get(`${API_BASE_URL}/patients/me`, { headers: authHeader });
        const me = meRes.data?.data;
        if (cancelled) return;
        setPatient(me);

        const [centersRes, apptRes, rxRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/health-centers`, { headers: authHeader }),
          axios.get(`${API_BASE_URL}/appointments`, { headers: authHeader, params: { patient_id: me?.id } }),
          axios.get(`${API_BASE_URL}/prescriptions`, { headers: authHeader, params: { patient_id: me?.id } }),
        ]);

        if (cancelled) return;

        const centers = centersRes.data?.data ?? [];
        const match = centers.find((c) => String(c.id) === String(me?.health_center_id));
        setHealthCenterName(match?.center_name || "");

        const appointments = apptRes.data?.data ?? [];
        setAppointmentCount(appointments.length);
        setUpcomingCount(appointments.filter((a) => a.status === "Approved" || a.status === "Pending").length);

        setPrescriptionCount((rxRes.data?.data ?? []).length);
      } catch (err) {
        if (!cancelled) setLoadError("Unable to load your profile right now.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  return (
    <div>
      <h2 className="text-3xl text-[#1B5E20] font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
        Welcome, {patient?.full_name ?? auth?.user?.full_name ?? "Patient"}!
      </h2>
      <p className="text-[#5B6470] mb-6" style={{ fontFamily: "'Lora', serif" }}>
        Your ManilaCare profile and health summary
      </p>

      <OutbreakAlert auth={auth} showTips />

      {loadError && (
        <p className="text-sm text-[#8A3B27] mb-4" style={{ fontFamily: "'Lora', serif" }}>
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatCard
          icon={CalendarClock}
          label="Upcoming Appointments"
          value={isLoading ? "…" : upcomingCount}
          onClick={() => navigate("/patient/appointments")}
        />
        <StatCard
          icon={CalendarClock}
          label="Total Appointments"
          value={isLoading ? "…" : appointmentCount}
          onClick={() => navigate("/patient/appointments")}
        />
        <StatCard
          icon={Pill}
          label="Active Prescriptions"
          value={isLoading ? "…" : prescriptionCount}
          onClick={() => navigate("/patient/prescriptions")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-[#0B3D7A]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Basic Information
            </h3>
          </div>
          {isLoading ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>Loading…</p>
          ) : (
            <div>
              <InfoRow label="Full Name" value={patient?.full_name} />
              <InfoRow label="Family No." value={patient?.family_number} />
              <InfoRow label="Sex" value={patient?.sex} />
              <InfoRow label="Date of Birth" value={formatDate(patient?.date_of_birth)} />
              <InfoRow label="Age" value={patient?.age} />
              <InfoRow label="Civil Status" value={patient?.civil_status} />
              <InfoRow label="Contact Number" value={patient?.contact_number} />
              <InfoRow label="Email" value={patient?.email} />
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={18} className="text-[#0B3D7A]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Health Center & Address
            </h3>
          </div>
          {isLoading ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>Loading…</p>
          ) : (
            <div>
              <InfoRow label="Assigned Health Center" value={healthCenterName} />
              <InfoRow label="Address" value={patient?.address} />
              <InfoRow label="Barangay No." value={patient?.barangay_no} />
              <InfoRow label="Religion" value={patient?.religion} />
              <InfoRow label="PhilHealth Status" value={patient?.philhealth_status} />
              <InfoRow label="PhilHealth No." value={patient?.philhealth_no} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}