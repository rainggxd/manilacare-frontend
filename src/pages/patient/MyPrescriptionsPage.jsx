import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Pill } from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function MyPrescriptionsPage() {
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError("");
      try {
        const meRes = await axios.get(`${API_BASE_URL}/patients/me`, { headers: authHeader });
        const patientId = meRes.data?.data?.id;

        const rxRes = await axios.get(`${API_BASE_URL}/prescriptions`, {
          headers: authHeader,
          params: { patient_id: patientId },
        });
        if (!cancelled) setPrescriptions(rxRes.data?.data ?? []);
      } catch (err) {
        if (!cancelled) setLoadError("Unable to load your prescriptions right now.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  return (
    <div>
      <h2 className="text-3xl text-[#1B5E20] font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
        My Prescriptions
      </h2>
      <p className="text-[#5B6470] mb-6" style={{ fontFamily: "'Lora', serif" }}>
        Medications prescribed to you by your doctor
      </p>

      <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
        {isLoading ? (
          <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-[#8A3B27]" style={{ fontFamily: "'Lora', serif" }}>{loadError}</p>
        ) : prescriptions.length === 0 ? (
          <p className="text-sm text-[#8A8578] text-center py-6" style={{ fontFamily: "'Lora', serif" }}>
            No prescriptions yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="rounded-xl border border-[#0B3D7A]/10 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <Pill size={18} className="text-[#0B3D7A] mt-1" />
                    <div>
                      <p className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Lora', serif" }}>
                        {rx.medication}
                        {rx.dosage ? ` — ${rx.dosage}` : ""}
                      </p>
                      <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
                        {[rx.frequency, rx.duration].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {rx.instructions && (
                        <p className="text-sm text-[#5B6470] mt-1" style={{ fontFamily: "'Lora', serif" }}>
                          {rx.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>
                      {formatDate(rx.date_prescribed)}
                    </p>
                    <p className="text-xs text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>
                      Dr. {rx.doctor_name || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}