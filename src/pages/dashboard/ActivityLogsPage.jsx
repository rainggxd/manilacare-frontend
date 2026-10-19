import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

const ACTION_STYLES = {
  patient_registered: "bg-[#1B5E20]",
  patient_deleted: "bg-[#8A3B27]",
  appointment_created: "bg-[#0B3D7A]",
  appointment_status_updated: "bg-yellow-600",
  appointment_deleted: "bg-[#8A3B27]",
};

const ACTION_LABELS = {
  patient_registered: "Patient Registered",
  patient_deleted: "Patient Deleted",
  appointment_created: "Appointment Created",
  appointment_status_updated: "Appointment Updated",
  appointment_deleted: "Appointment Deleted",
};

function ActionBadge({ action }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold text-white ${ACTION_STYLES[action] || "bg-gray-500"}`}
    >
      {ACTION_LABELS[action] || action}
    </span>
  );
}

export default function ActivityLogsPage() {
  const { auth } = useOutletContext();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  async function loadLogs() {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await axios.get(`${API_BASE_URL}/activity-logs`, {
        headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
      });
      setLogs(response.data?.data ?? []);
    } catch (err) {
      setLoadError("Unable to load activity logs right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return Array.from(set);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!actionFilter) return logs;
    return logs.filter((l) => l.action === actionFilter);
  }, [logs, actionFilter]);

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Activity Logs
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
            Recent actions taken across the system
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-full border border-[#0B3D7A]/30 px-4 py-2.5 text-sm text-[#1A1A1A] outline-none"
            style={{ fontFamily: "'Lora', serif" }}
          >
            <option value="">All actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] || a}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadLogs}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0B3D7A] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#0A3468] transition-colors"
            style={{ fontFamily: "'Lora', serif" }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#0B3D7A]/20">
        <table className="w-full min-w-[700px] border-collapse text-left" style={{ fontFamily: "'Lora', serif" }}>
          <thead>
            <tr className="bg-[#0B3D7A] text-white">
              <th className="px-4 py-3 font-bold">Actor</th>
              <th className="px-4 py-3 font-bold">Action</th>
              <th className="px-4 py-3 font-bold">Details</th>
              <th className="px-4 py-3 font-bold">Date &amp; Time</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={4} className="px-4 py-6 text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && loadError && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={4} className="px-4 py-6 text-center">{loadError}</td>
              </tr>
            )}
            {!isLoading && !loadError && filteredLogs.length === 0 && (
              <tr className="bg-[#1B5E20] text-white">
                <td colSpan={4} className="px-4 py-6 text-center">No activity recorded yet.</td>
              </tr>
            )}
            {!isLoading &&
              !loadError &&
              filteredLogs.map((log) => (
                <tr key={log.id} className="bg-[#1B5E20] text-white border-t border-white/10">
                  <td className="px-4 py-3">{log.actor_name || "System"}</td>
                  <td className="px-4 py-3">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-4 py-3">{log.description}</td>
                  <td className="px-4 py-3">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#5B6470] mt-3" style={{ fontFamily: "'Lora', serif" }}>
        Showing the 200 most recent entries. Only patient and appointment actions are logged so far.
      </p>
    </div>
  );
}