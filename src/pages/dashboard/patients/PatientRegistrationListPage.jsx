import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Trash2 } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../../utils/healthCenters";
import { useConfirm } from "../../../components/ConfirmDialog";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

// Kept in sync with the options offered in the registration form.

export default function PatientRegistrationListPage() {
  const confirm = useConfirm();
  const { auth } = useOutletContext();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
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
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
            Patient Registration
          </h2>
          <p className="text-[000000]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Register and manage patient records
          </p>
        </div>
        <Link
          to="/dashboard/patients/new"
          className="rounded-full bg-[#0B3D7A] text-white px-6 py-3 text-sm font-semibold hover:bg-[#0A3468] transition-colors whitespace-nowrap"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          + Register Patient
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr className="bg-[#F4F6F9] text-[#5B6470] text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">Patient ID</th>
              <th className="px-4 py-3 font-semibold">Full Name</th>
              <th className="px-4 py-3 font-semibold">Health Center</th>
              <th className="px-4 py-3 font-semibold">Age</th>
              <th className="px-4 py-3 font-semibold">Sex</th>
              <th className="px-4 py-3 font-semibold">Registered</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={7} className="px-4 py-6 text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && loadError && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={7} className="px-4 py-6 text-center">{loadError}</td>
              </tr>
            )}
            {!isLoading && !loadError && patients.length === 0 && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={7} className="px-4 py-6 text-center">No patients registered yet.</td>
              </tr>
            )}
            {!isLoading && !loadError && patients.map((p) => (
              <tr key={p.id} className="bg-white text-[#1A1A1A] border-t border-[#E3E8EF]">
                <td className="px-4 py-3">{p.id}</td>
                <td className="px-4 py-3">{p.full_name}</td>
                <td className="px-4 py-3">{healthCenterName(p.health_center_id)}</td>
                <td className="px-4 py-3">{p.age}</td>
                <td className="px-4 py-3">{p.sex}</td>
                <td className="px-4 py-3">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3 text-right">
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
    </div>
  );
}