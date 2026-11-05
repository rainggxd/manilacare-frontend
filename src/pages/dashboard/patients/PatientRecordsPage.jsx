import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Search, Trash2, ArrowLeft } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../../utils/healthCenters";
import { useConfirm } from "../../../components/ConfirmDialog";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";


export default function PatientRecordsPage() {
  const confirm = useConfirm();
  const { auth } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const healthCenterFilter = searchParams.get("health_center_id") || "";
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

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

    if (healthCenterFilter) {
      list = list.filter((p) => String(p.health_center_id) === String(healthCenterFilter));
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = (p.full_name || "").toLowerCase();
        const familyNo = String(p.family_number ?? "").toLowerCase();
        return name.includes(q) || familyNo.includes(q);
      });
    }

    return list;
  }, [patients, query, healthCenterFilter]);

  async function handleDelete(patient) {
    const patientId = patient.id;
    const ok = await confirm({
      title: `Delete the record of ${patient.full_name}?`,
      message: "The patient record and the patient login will be removed. This cannot be undone.",
      confirmText: "Yes, delete",
      tone: "danger",
    });
    if (!ok) return;
    setDeleteError("");
    setDeletingId(patientId);
    try {
      await axios.delete(`${API_BASE_URL}/patients/${patientId}`, {
        headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
      });
      setPatients((prev) => prev.filter((p) => p.id !== patientId));
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
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
            Patient Records
          </h2>
          <p className="text-[#000000]" style={{ fontFamily: "'Inter', sans-serif" }}>
            View full medical records, 
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

      {healthCenterFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A]/10 text-[#0B3D7A] px-4 py-1.5 text-sm font-semibold"
            style={{ fontFamily: "'Inter', sans-serif" }}
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

      <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr className="bg-[#F4F6F9] text-[#5B6470] text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Family No.</th>
              <th className="px-4 py-3 font-semibold">Health Center</th>
              <th className="px-4 py-3 font-semibold">Age</th>
              <th className="px-4 py-3 font-semibold">Sex</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
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
            {!isLoading && !loadError && filteredPatients.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/dashboard/records/${p.id}`)}
                className="bg-white text-[#1A1A1A] border-t border-[#E3E8EF] cursor-pointer hover:bg-[#F4F6F9] transition-colors"
              >
                <td className="px-4 py-3">{p.full_name}</td>
                <td className="px-4 py-3">{p.family_number || "—"}</td>
                <td className="px-4 py-3">{healthCenterName(p.health_center_id)}</td>
                <td className="px-4 py-3">{p.age}</td>
                <td className="px-4 py-3">{p.sex}</td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    disabled={deletingId === p.id}
                    className="inline-flex items-center justify-center rounded-full p-2 text-[#5B6470] hover:bg-[#B3261E]/10 hover:text-[#B3261E] transition-colors"
                    title="Delete patient record"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteError && (
        <p className="text-xs text-[#8A3B27] mt-3" style={{ fontFamily: "'Inter', sans-serif" }}>
          {deleteError}
        </p>
      )}

      <p className="text-xs text-[#5B6470] mt-3" style={{ fontFamily: "'Inter', sans-serif" }}>
        The diagnosis of each patient is only shown to the doctors.
      </p>
    </div>
  );
}