import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Users, Stethoscope, Clock } from "lucide-react";
import axios from "axios";
import OutbreakAlert from "../../components/OutbreakAlert";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

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

export default function DoctorDashboardPage() {
  const { auth } = useOutletContext();
  const navigate = useNavigate();
  const user = auth?.user;
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadPatients() {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/patients`, { headers: authHeader });
        if (!cancelled) setPatients(res.data?.data ?? []);
      } catch (err) {
        // stats stay at zero on failure
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadPatients();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const myPatients = useMemo(
    () => patients.filter((p) => String(p.health_center_id) === String(user?.health_center_id)),
    [patients, user?.health_center_id]
  );

  const diagnosedCount = myPatients.filter((p) => p.disease_type).length;

  const recentPatients = useMemo(
    () =>
      [...myPatients]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    [myPatients]
  );

  return (
    <div>
      <h2 className="text-3xl text-[#1B5E20] font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
        Welcome, Dr. {user?.full_name ?? "Doctor"}!
      </h2>

      <OutbreakAlert auth={auth} showTable />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatCard icon={Users} label="Patients in Your Health Center" value={isLoading ? "…" : myPatients.length} />
        <StatCard icon={Stethoscope} label="With a Diagnosis on File" value={isLoading ? "…" : diagnosedCount} />
        <StatCard icon={Clock} label="Awaiting Diagnosis" value={isLoading ? "…" : myPatients.length - diagnosedCount} />
      </div>

      <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
        <h3 className="text-lg font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
          Recently Registered
        </h3>
        {isLoading ? (
          <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>Loading…</p>
        ) : recentPatients.length === 0 ? (
          <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>No patients yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentPatients.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/doctor/records/${p.id}`)}
                className="flex items-center justify-between rounded-xl border border-[#0B3D7A]/10 px-4 py-3 text-left hover:bg-[#F7F5F1] transition-colors"
                style={{ fontFamily: "'Lora', serif" }}
              >
                <span className="font-semibold text-[#1A1A1A]">{p.full_name}</span>
                <span className="text-sm text-[#8A8578]">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}