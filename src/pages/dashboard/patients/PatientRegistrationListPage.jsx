import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Trash2 } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../../utils/healthCenters";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

// Kept in sync with the options offered in the registration form.

export default function PatientRegistrationListPage() {
  const { auth } = useOutletContext();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
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
        if (!cancelled) {
          setPatients(response.data?.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError("Unable to load patients right now.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPatients();
    return () => {
      cancelled = true;
    };
  }, [auth?.token]);

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
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Patient Registration
          </h2>
          <p className="text-[000000]" style={{ fontFamily: "'Lora', serif" }}>
            Register and manage patient records
          </p>
        </div>
        <Link
          to="/dashboard/patients/new"
          className="rounded-full bg-[#0B3D7A] text-white px-6 py-3 text-sm font-semibold hover:bg-[#0A3468] transition-colors whitespace-nowrap"
          style={{ fontFamily: "'Lora', serif" }}
        >
          + Register Patient
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#0B3D7A]/20">
        <table className="w-full min-w-[720px] border-collapse text-left" style={{ fontFamily: "'Lora', serif" }}>
          <thead>
            <tr className="bg-[#0B3D7A] text-white">
              <th className="px-4 py-3 font-bold">Patient ID</th>
              <th className="px-4 py-3 font-bold">Full Name</th>
              <th className="px-4 py-3 font-bold">Health Center</th>
              <th className="px-4 py-3 font-bold">Age</th>
              <th className="px-4 py-3 font-bold">Sex</th>
              <th className="px-4 py-3 font-bold">Registered</th>
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
            {!isLoading && !loadError && patients.length === 0 && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={7} className="px-4 py-6 text-center">No patients registered yet.</td>
              </tr>
            )}
            {!isLoading && !loadError && patients.map((p) => (
              <tr key={p.id} className="bg-[#1B5E20] text-white border-t border-white/10">
                <td className="px-4 py-3">{p.id}</td>
                <td className="px-4 py-3">{p.full_name}</td>
                <td className="px-4 py-3">{healthCenterName(p.health_center_id)}</td>
                <td className="px-4 py-3">{p.age}</td>
                <td className="px-4 py-3">{p.sex}</td>
                <td className="px-4 py-3">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3 text-right">
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
    </div>
  );
}