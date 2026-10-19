import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Check, X, Clock3 } from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

const STATUS_STYLES = {
  Pending: "bg-[#F5E6C8] text-[#8A6D1F]",
  Approved: "bg-[#D6EAD9] text-[#1B5E20]",
  Rejected: "bg-[#F5D6D0] text-[#8A3B27]",
  Completed: "bg-[#DCE6F5] text-[#0B3D7A]",
};

export default function DoctorAppointmentsPage() {
  const { auth } = useOutletContext();
  const user = auth?.user;
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  async function loadAppointments() {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/appointments`, { headers: authHeader });
      setAppointments(res.data?.data ?? []);
    } catch (err) {
      setLoadError("Unable to load appointments right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const myAppointments = useMemo(
    () =>
      appointments
        .filter((a) => String(a.health_center_id) === String(user?.health_center_id))
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date)),
    [appointments, user?.health_center_id]
  );

  async function handleStatusChange(id, status) {
    setUpdatingId(id);
    try {
      await axios.put(`${API_BASE_URL}/appointments/${id}/status`, { status }, { headers: authHeader });
      await loadAppointments();
    } catch (err) {
      // silently ignore; row keeps old status if it fails
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-3xl text-[#1B5E20] font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
        Appointments
      </h2>
      <p className="text-[#5B6470] mb-6" style={{ fontFamily: "'Lora', serif" }}>
        Requests from patients in your health center
      </p>

      <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
        {isLoading ? (
          <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-[#8A3B27]" style={{ fontFamily: "'Lora', serif" }}>{loadError}</p>
        ) : myAppointments.length === 0 ? (
          <p className="text-sm text-[#8A8578] text-center py-6" style={{ fontFamily: "'Lora', serif" }}>
            No appointment requests yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {myAppointments.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-[#0B3D7A]/10 p-4 flex items-center justify-between flex-wrap gap-3"
              >
                <div>
                  <p className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Lora', serif" }}>
                    {a.patient_name}
                  </p>
                  <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
                    {a.appointment_date} · {a.appointment_time} — {a.reason || "No reason given"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_STYLES[a.status] || "bg-gray-100 text-gray-600"}`}
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {a.status}
                  </span>

                  {a.status === "Pending" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={updatingId === a.id}
                        onClick={() => handleStatusChange(a.id, "Approved")}
                        className="inline-flex items-center gap-1 rounded-full bg-[#1B5E20] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#164D1A] disabled:opacity-60"
                      >
                        <Check size={12} /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === a.id}
                        onClick={() => handleStatusChange(a.id, "Rejected")}
                        className="inline-flex items-center gap-1 rounded-full bg-[#8A3B27] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#752F1F] disabled:opacity-60"
                      >
                        <X size={12} /> Reject
                      </button>
                    </div>
                  )}

                  {a.status === "Approved" && (
                    <button
                      type="button"
                      disabled={updatingId === a.id}
                      onClick={() => handleStatusChange(a.id, "Completed")}
                      className="inline-flex items-center gap-1 rounded-full bg-[#0B3D7A] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#092E5C] disabled:opacity-60"
                    >
                      <Clock3 size={12} /> Mark Completed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}