import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Building2, Users, UserCog, Stethoscope } from "lucide-react";
import axios from "axios";
import OutbreakAlert from "../../components/OutbreakAlert";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

function StatCard({ icon: Icon, label, value }) {
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
      </div>
    </div>
  );
}

/**
 * Master Admin dashboard: totals per health center, accounts and
 * outbreak warnings. Patient records are not shown here on purpose;
 * each health center's Admin looks after its own patient data.
 */
export default function MasterAdminDashboardPage() {
  const { auth } = useOutletContext();
  const navigate = useNavigate();
  const user = auth?.user;

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError("");
      try {
        const res = await axios.get(`${API_BASE_URL}/admin/summary`, {
          headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
        });
        if (!cancelled) setSummary(res.data?.data ?? null);
      } catch (err) {
        if (!cancelled) setLoadError("Unable to load the dashboard right now.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [auth?.token]);

  const totals = summary?.totals;
  const centers = summary?.centers ?? [];
  const show = (value) => (isLoading ? "…" : value ?? 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
          Welcome, {user?.full_name ?? "Master Admin"}!
        </h2>
        <p className="text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Overview of all health centers
        </p>
      </div>

      {loadError && (
        <p className="text-sm text-[#8A3B27] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard icon={Building2} label="Health Centers" value={show(totals?.health_centers)} />
        <StatCard icon={Users} label="Registered Patients" value={show(totals?.patients)} />
        <StatCard icon={UserCog} label="Admins" value={show(totals?.admins)} />
        <StatCard icon={Stethoscope} label="Doctors" value={show(totals?.doctors)} />
      </div>

      <OutbreakAlert auth={auth} showTable />

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-[#000000]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Health Centers
        </h3>
        <button
          type="button"
          onClick={() => navigate("/dashboard/health-centers")}
          className="text-sm font-semibold text-[#0B3D7A] hover:underline"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Manage health centers →
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr className="bg-[#F4F6F9] text-[#5B6470] text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">Health Center</th>
              <th className="px-4 py-3 font-semibold text-right">Patients</th>
              <th className="px-4 py-3 font-semibold text-right">Admins</th>
              <th className="px-4 py-3 font-semibold text-right">Staff</th>
              <th className="px-4 py-3 font-semibold text-right">Nurses</th>
              <th className="px-4 py-3 font-semibold text-right">Doctors</th>
              <th className="px-4 py-3 font-semibold text-right">Appointments</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={7} className="px-4 py-6 text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && centers.length === 0 && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={7} className="px-4 py-6 text-center">No health centers yet.</td>
              </tr>
            )}
            {!isLoading &&
              centers.map((c) => (
                <tr key={c.id} className="bg-white text-[#1A1A1A] border-t border-[#E3E8EF]">
                  <td className="px-4 py-3">{c.center_name}</td>
                  <td className="px-4 py-3 text-right">{c.patients}</td>
                  <td className="px-4 py-3 text-right">{c.admins}</td>
                  <td className="px-4 py-3 text-right">{c.staff}</td>
                  <td className="px-4 py-3 text-right">{c.nurses ?? 0}</td>
                  <td className="px-4 py-3 text-right">{c.doctors}</td>
                  <td className="px-4 py-3 text-right">{c.appointments}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#8A8578] mt-3" style={{ fontFamily: "'Inter', sans-serif" }}>
        Only totals are shown here. Patient records are handled by each health center's Admin.
      </p>
    </div>
  );
}