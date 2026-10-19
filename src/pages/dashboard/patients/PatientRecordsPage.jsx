import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Search, Trash2, ArrowLeft, ArrowUpDown } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../../utils/healthCenters";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";


export default function PatientRecordsPage() {
  const { auth } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const healthCenterFilter = searchParams.get("health_center_id") || "";
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [diseaseSortDir, setDiseaseSortDir] = useState(null); // null | "asc" | "desc"

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

  function toggleDiseaseSort() {
    setDiseaseSortDir((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  }

  const filteredPatients = useMemo(() => {
    let list = patients;

    if (healthCenterFilter) {
      list = list.filter((p) => String(p.health_center_id) === String(healthCenterFilter));
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

    if (diseaseSortDir) {
      list = [...list].sort((a, b) => {
        const da = (a.disease_type || "").toLowerCase();
        const db = (b.disease_type || "").toLowerCase();
        // Blank disease_type always sinks to the bottom regardless of direction
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return diseaseSortDir === "asc" ? da.localeCompare(db) : db.localeCompare(da);
      });
    }

    return list;
  }, [patients, query, healthCenterFilter, diseaseSortDir]);

  async function handleDelete(patientId) {
    setDeleteError("");
    setDeletingId(patientId);
    try {
      await axios.delete(`${API_BASE_URL}/patients/${patientId}`, {
        headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
      });
      setPatients((prev) => prev.filter((p) => p.id !== patientId));
      setConfirmId(null);
    } catch (err) {
      setDeleteError("Unable to delete this patient record right now.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B3D7A] hover:underline mb-4"
        style={{ fontFamily: "'Lora', serif" }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Patient Records
          </h2>
          <p className="text-[#000000]" style={{ fontFamily: "'Lora', serif" }}>
            View full medical records, 
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

      {healthCenterFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A]/10 text-[#0B3D7A] px-4 py-1.5 text-sm font-semibold"
            style={{ fontFamily: "'Lora', serif" }}
          >
            Filtered: {healthCenterName(healthCenterFilter)}
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="text-[#0B3D7A] hover:text-[#8A3B27]"
              aria-label="Clear filter"
            >
              ✕
            </button>
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#0B3D7A]/20">
        <table className="w-full min-w-[720px] border-collapse text-left" style={{ fontFamily: "'Lora', serif" }}>
          <thead>
            <tr className="bg-[#0B3D7A] text-white">
              <th className="px-4 py-3 font-bold">Patient</th>
              <th className="px-4 py-3 font-bold">Family No.</th>
              <th className="px-4 py-3 font-bold">Health Center</th>
              <th className="px-4 py-3 font-bold">Age</th>
              <th className="px-4 py-3 font-bold">Sex</th>
              <th className="px-4 py-3 font-bold">
                <button
                  type="button"
                  onClick={toggleDiseaseSort}
                  className="inline-flex items-center gap-1.5 hover:text-white/80 transition-colors"
                  title="Click to sort by disease type"
                >
                  Type of Disease
                  <ArrowUpDown size={13} />
                </button>
              </th>
              <th className="px-4 py-3 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={7} className="px-4 py-6 text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && loadError && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={7} className="px-4 py-6 text-center">{loadError}</td>
              </tr>
            )}
            {!isLoading && !loadError && filteredPatients.length === 0 && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={7} className="px-4 py-6 text-center">
                  {patients.length === 0 ? "No patient records yet." : "No patients match your search."}
                </td>
              </tr>
            )}
            {!isLoading && !loadError && filteredPatients.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/dashboard/records/${p.id}`)}
                className="bg-[#1B5E20] text-white border-t border-white/10 cursor-pointer hover:bg-[#164D1A] transition-colors"
              >
                <td className="px-4 py-3">{p.full_name}</td>
                <td className="px-4 py-3">{p.family_number || "—"}</td>
                <td className="px-4 py-3">{healthCenterName(p.health_center_id)}</td>
                <td className="px-4 py-3">{p.age}</td>
                <td className="px-4 py-3">{p.sex}</td>
                <td className="px-4 py-3">{p.disease_type || "—"}</td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  {confirmId === p.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs">Delete?</span>
                      <button
                        type="button"
                        disabled={deletingId === p.id}
                        onClick={() => handleDelete(p.id)}
                        className="rounded-full bg-[#8A3B27] px-3 py-1 text-xs font-bold text-white hover:bg-[#6f2f1f] disabled:opacity-60"
                      >
                        {deletingId === p.id ? "Deleting…" : "Yes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white hover:bg-white/30"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(p.id)}
                      className="inline-flex items-center justify-center rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                      title="Delete patient record"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteError && (
        <p className="text-xs text-[#8A3B27] mt-3" style={{ fontFamily: "'Lora', serif" }}>
          {deleteError}
        </p>
      )}

      <p className="text-xs text-[#5B6470] mt-3" style={{ fontFamily: "'Lora', serif" }}>
        Click "Type of Disease" to sort — useful for grouping patients with the same condition together (e.g. all TB patients).
      </p>
    </div>
  );
}