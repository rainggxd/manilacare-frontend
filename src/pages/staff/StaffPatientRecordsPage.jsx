import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Search } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../utils/healthCenters";

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
    navigate(`/staff/records/${id}`);
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Patient Records
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
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
            style={{ fontFamily: "'Lora', serif" }}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#0B3D7A]/20">
        <table className="w-full min-w-[680px] border-collapse text-left" style={{ fontFamily: "'Lora', serif" }}>
          <thead>
            <tr className="bg-[#0B3D7A] text-white">
              <th className="px-4 py-3 font-bold">Patient</th>
              <th className="px-4 py-3 font-bold">Family No.</th>
              <th className="px-4 py-3 font-bold">Health Center</th>
              <th className="px-4 py-3 font-bold">Age</th>
              <th className="px-4 py-3 font-bold">Sex</th>
              <th className="px-4 py-3 font-bold">Contact No.</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={6} className="px-4 py-6 text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && loadError && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={6} className="px-4 py-6 text-center">{loadError}</td>
              </tr>
            )}
            {!isLoading && !loadError && filteredPatients.length === 0 && (
              <tr className="bg-[#1B5E20] text-white">
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
                  className="bg-[#1B5E20] text-white border-t border-white/10 cursor-pointer hover:bg-[#164D1A] focus:bg-[#164D1A] outline-none transition-colors"
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