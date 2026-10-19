import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";import { Search } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../utils/healthCenters";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";


export default function DoctorPatientRecordsPage() {
  const { auth } = useOutletContext();
    const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");

  const doctorHealthCenterId = auth?.user?.health_center_id;

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
    let list = patients;

    // Scope to the doctor's own health center only
    if (doctorHealthCenterId) {
      list = list.filter((p) => String(p.health_center_id) === String(doctorHealthCenterId));
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = (p.full_name || "").toLowerCase();
        const familyNo = String(p.family_number ?? "").toLowerCase();
        const disease = (p.disease_type || "").toLowerCase();
        return name.includes(q) || familyNo.includes(q) || disease.includes(q);
      });
    }

    return list;
  }, [patients, query, doctorHealthCenterId]);

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Patient Records
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
            {doctorHealthCenterId ? healthCenterName(doctorHealthCenterId) : "Your patients"}
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1B5E20]/60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, family no., or disease"
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
              <th className="px-4 py-3 font-bold">Age</th>
              <th className="px-4 py-3 font-bold">Sex</th>
              <th className="px-4 py-3 font-bold">Type of Disease</th>
              <th className="px-4 py-3 font-bold">Registered</th>
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
            {!isLoading && !loadError && filteredPatients.map((p) => (
                           <tr
                key={p.id}
                onClick={() => navigate(`/doctor/records/${p.id}`)}
                className="bg-[#1B5E20] text-white border-t border-white/10 cursor-pointer hover:bg-[#164D1A] transition-colors"
              >
                <td className="px-4 py-3">{p.full_name}</td>
                <td className="px-4 py-3">{p.family_number || "—"}</td>
                <td className="px-4 py-3">{p.age}</td>
                <td className="px-4 py-3">{p.sex}</td>
                <td className="px-4 py-3">{p.disease_type || "—"}</td>
                <td className="px-4 py-3">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#5B6470] mt-3" style={{ fontFamily: "'Lora', serif" }}>
        View-only — patient editing and diagnosis input coming next.
      </p>
    </div>
  );
}