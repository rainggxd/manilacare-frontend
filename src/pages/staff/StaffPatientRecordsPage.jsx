import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Search } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../utils/healthCenters";
import { portalBase } from "../../utils/portal";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";


/**
 * Staff-facing patient list — read-only. Staff can look up a patient's
 * basic profile to confirm identity at the front desk, but editing or
 * deleting records stays with Master Admin/Doctor. Click a row to open
 * the patient's full profile.
 */
export default function StaffPatientRecordsPage() {
  const { auth } = useOutletContext();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPatients() {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await axios.get(`${API_BASE_URL}/patients`, {
          headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
        });
        if (!cancelled) setPatients(response.data?.data ?? []);
      } catch (err) {
        if (!cancelled) setLoadError("Unable to load patient records right now.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadPatients();
    return () => {
      cancelled = true;
    };
  }, [auth?.token]);

  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const name = (p.full_name || "").toLowerCase();
      const familyNo = String(p.family_number ?? "").toLowerCase();
      return name.includes(q) || familyNo.includes(q);
    });
  }, [patients, query]);

  function openProfile(id) {
    navigate(`${portalBase(auth?.user?.role)}/records/${id}`);
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
            Patient Records
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Look up a patient's basic profile. Click a row to open the full profile.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1B5E20]/60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or family no."
            className="w-full rounded-full border border-[#1B5E20]/30 pl-11 pr-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#0B3D7A]/40"
            style={{ fontFamily: "'Inter', sans-serif" }}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-sm">
        <table className="w-full min-w-[680px] border-collapse text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr className="bg-[#F4F6F9] text-[#5B6470] text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Family No.</th>
              <th className="px-4 py-3 font-semibold">Health Center</th>
              <th className="px-4 py-3 font-semibold">Age</th>
              <th className="px-4 py-3 font-semibold">Sex</th>
              <th className="px-4 py-3 font-semibold">Contact No.</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={6} className="px-4 py-6 text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && loadError && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={6} className="px-4 py-6 text-center">{loadError}</td>
              </tr>
            )}
            {!isLoading && !loadError && filteredPatients.length === 0 && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={6} className="px-4 py-6 text-center">
                  {patients.length === 0 ? "No patient records yet." : "No patients match your search."}
                </td>
              </tr>
            )}
            {!isLoading &&
              !loadError &&
              filteredPatients.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => openProfile(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openProfile(p.id);
                  }}
                  tabIndex={0}
                  role="link"
                  className="bg-white text-[#1A1A1A] border-t border-[#E3E8EF] cursor-pointer hover:bg-[#F4F6F9] focus:bg-[#F4F6F9] outline-none transition-colors"
                >
                  <td className="px-4 py-3 font-semibold underline-offset-2 hover:underline">{p.full_name}</td>
                  <td className="px-4 py-3">{p.family_number || "—"}</td>
                  <td className="px-4 py-3">{healthCenterName(p.health_center_id)}</td>
                  <td className="px-4 py-3">{p.age}</td>
                  <td className="px-4 py-3">{p.sex}</td>
                  <td className="px-4 py-3">{p.contact_number || "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}