import { useEffect, useState } from "react";
import axios from "axios";
import { AlertTriangle, Activity } from "lucide-react";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

const DEFAULT_TIP = "Practice good hygiene, rest when you feel unwell, and visit your health center if you have symptoms.";
const DENGUE_TIP =
  "Clear stagnant water around your home, use mosquito repellent, and see a doctor if fever lasts more than 2 days.";

function tipFor(disease) {
  return String(disease || "").toLowerCase().includes("dengue") ? DENGUE_TIP : DEFAULT_TIP;
}

/**
 * Shows an outbreak warning when one disease has reached the case
 * threshold in a health center, and (optionally) a table of how many
 * patients were diagnosed with each disease recently.
 *
 * Only totals come from the API, never patient names.
 *
 * Props:
 *   auth      - the logged-in auth object ({ token, user })
 *   showTable - also show the diagnosis counts per disease
 *   showTips  - show a short awareness tip under each warning (for patients)
 */
export default function OutbreakAlert({ auth, showTable = false, showTips = false }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await axios.get(`${API_BASE_URL}/disease-stats`, {
          headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
        });
        if (!cancelled) setStats(res.data?.data ?? null);
      } catch (err) {
        // The warning is a bonus feature: if it fails, the page still works.
        if (!cancelled) setStats(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [auth?.token]);

  if (!stats) return null;

  const alerts = stats.alerts ?? [];
  const centers = stats.centers ?? [];
  const showCenterName = auth?.user?.role === "Master Admin";

  if (alerts.length === 0 && !showTable) return null;

  return (
    <div className="mb-8">
      {alerts.map((a) => (
        <div
          key={`${a.health_center_id}-${a.disease}`}
          role="alert"
          className="rounded-2xl bg-[#8A3B27] text-white p-5 mb-4 flex items-start gap-4"
        >
          <div className="rounded-full bg-white/15 p-3 shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="font-bold uppercase tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
              Warning: there might be a {a.disease} outbreak
            </p>
            <p className="text-sm text-white/90 mt-1" style={{ fontFamily: "'Lora', serif" }}>
              {a.cases} patients were diagnosed with {a.disease} in the last {stats.window_days} days
              {showCenterName ? ` at ${a.center_name}` : ""}.
            </p>
            {showTips && (
              <p className="text-sm text-white/90 mt-2" style={{ fontFamily: "'Lora', serif" }}>
                {tipFor(a.disease)}
              </p>
            )}
          </div>
        </div>
      ))}

      {showTable && (
        <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={18} className="text-[#0B3D7A]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Diagnoses in the Last {stats.window_days} Days
            </h3>
          </div>
          <p className="text-xs text-[#8A8578] mb-4" style={{ fontFamily: "'Lora', serif" }}>
            A warning appears when one disease reaches {stats.threshold} cases.
          </p>

          {centers.length === 0 ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>
              No diagnoses recorded in the last {stats.window_days} days.
            </p>
          ) : (
            centers.map((c) => (
              <div key={c.health_center_id} className="mb-4 last:mb-0">
                {showCenterName && (
                  <p className="text-sm font-bold text-[#0B3D7A] mb-2" style={{ fontFamily: "'Lora', serif" }}>
                    {c.center_name}
                  </p>
                )}
                <div className="overflow-x-auto rounded-xl border border-[#0B3D7A]/15">
                  <table className="w-full border-collapse text-left text-sm" style={{ fontFamily: "'Lora', serif" }}>
                    <thead>
                      <tr className="bg-[#0B3D7A] text-white">
                        <th className="px-4 py-2 font-bold">Disease</th>
                        <th className="px-4 py-2 font-bold text-right">Cases</th>
                        <th className="px-4 py-2 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.diseases.map((d) => (
                        <tr key={d.disease} className="border-t border-[#0B3D7A]/10">
                          <td className="px-4 py-2 text-[#1A1A1A]">{d.disease}</td>
                          <td className="px-4 py-2 text-right font-bold text-[#1A1A1A]">{d.cases}</td>
                          <td className="px-4 py-2">
                            {d.is_outbreak ? (
                              <span className="rounded-full bg-[#8A3B27] text-white text-xs font-bold px-3 py-1">
                                Possible outbreak
                              </span>
                            ) : (
                              <span className="text-[#5B6470]">Normal</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}