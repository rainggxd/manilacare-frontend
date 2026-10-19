import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

function BarRow({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-sm mb-1" style={{ fontFamily: "'Lora', serif" }}>
        <span className="text-[#1A1A1A] font-semibold">{label}</span>
        <span className="text-[#8A8578]">{count}</span>
      </div>
      <div className="w-full h-2.5 bg-[#F7F5F1] rounded-full overflow-hidden">
        <div className="h-full bg-[#0B3D7A] rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DoctorReportsPage() {
  const { auth } = useOutletContext();
  const user = auth?.user;
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/patients`, { headers: authHeader });
        if (!cancelled) setPatients(res.data?.data ?? []);
      } catch (err) {
        // leave empty on failure
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

  const myPatients = useMemo(
    () => patients.filter((p) => String(p.health_center_id) === String(user?.health_center_id)),
    [patients, user?.health_center_id]
  );

  const sexBreakdown = useMemo(() => {
    const counts = { Male: 0, Female: 0 };
    myPatients.forEach((p) => {
      if (p.sex === "Male" || p.sex === "Female") counts[p.sex] += 1;
    });
    return counts;
  }, [myPatients]);

  const diseaseBreakdown = useMemo(() => {
    const counts = {};
    myPatients.forEach((p) => {
      if (p.disease_type) {
        counts[p.disease_type] = (counts[p.disease_type] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [myPatients]);

  const diagnosedCount = myPatients.filter((p) => p.disease_type).length;
  const maxSex = Math.max(sexBreakdown.Male, sexBreakdown.Female, 1);
  const maxDisease = diseaseBreakdown.length > 0 ? diseaseBreakdown[0][1] : 1;

  return (
    <div>
      <h2 className="text-3xl text-[#1B5E20] font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
        Reports
      </h2>
      <p className="text-[#5B6470] mb-6" style={{ fontFamily: "'Lora', serif" }}>
        Overview of patients in your health center
      </p>

      {isLoading ? (
        <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
          <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {myPatients.length}
            </p>
            <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>Total Patients</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {diagnosedCount}
            </p>
            <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>Diagnosed</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {diseaseBreakdown.length}
            </p>
            <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>Distinct Conditions</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Patients by Sex
          </h3>
          <BarRow label="Male" count={sexBreakdown.Male} max={maxSex} />
          <BarRow label="Female" count={sexBreakdown.Female} max={maxSex} />
        </div>

        <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Top Diagnoses
          </h3>
          {diseaseBreakdown.length === 0 ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>
              No diagnoses recorded yet.
            </p>
          ) : (
            diseaseBreakdown
              .slice(0, 6)
              .map(([label, count]) => (
                <BarRow key={label} label={label} count={count} max={maxDisease} />
              ))
          )}
        </div>
      </div>
    </div>
  );
}