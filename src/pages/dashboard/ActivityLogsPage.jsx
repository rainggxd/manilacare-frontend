import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import axios from "axios";
import { HEALTH_CENTERS } from "../../utils/healthCenters";
import SearchableSelect from "../../components/SearchableSelect";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Activity Logs (audit trail).
 *  - Master Admin: actions of every health center (plus their own)
 *  - Admin: actions made by the users of their own health center
 * The list can be searched and filtered by action, health center and date.
 */

// Plain names and colors for each kind of action.
// Green = added, blue = changed, red = removed, gray = viewed/other.
const ACTIONS = {
  user_login: ["Signed In", "gray"],
  patient_registered: ["Patient Registered", "green"],
  patient_deleted: ["Patient Deleted", "red"],
  patient_background_updated: ["Medical Background Updated", "blue"],
  patient_photo_updated: ["Patient Photo Updated", "blue"],
  patient_photo_removed: ["Patient Photo Removed", "red"],
  patient_disease_updated: ["Diagnosis Updated", "blue"],
  patient_self_updated: ["Patient Updated Own Record", "blue"],
  patient_vaccine_added: ["Vaccine Added", "green"],
  patient_vaccines_updated: ["Vaccines Updated", "blue"],
  patient_checked_in: ["Patient Checked In", "green"],
  self_registration: ["Online Sign-up", "green"],
  registration_approved: ["Sign-up Approved", "green"],
  registration_rejected: ["Sign-up Rejected", "red"],
  appointment_created: ["Appointment Created", "green"],
  appointment_status_updated: ["Appointment Updated", "blue"],
  appointment_deleted: ["Appointment Deleted", "red"],
  medical_record_saved: ["Medical Record Saved", "green"],
  prescription_created: ["Prescription Added", "green"],
  visit_vitals_saved: ["Vital Signs Saved", "green"],
  lab_result_uploaded: ["Lab / X-ray Uploaded", "green"],
  lab_result_deleted: ["Lab / X-ray Deleted", "red"],
  lab_result_viewed: ["Lab / X-ray Opened", "gray"],
  patient_record_viewed: ["Patient Record Opened", "gray"],
  queue_called_next: ["Queue: Next Patient", "gray"],
  qr_code_generated: ["QR Code Generated", "green"],
  qr_code_scanned: ["QR Code Scanned", "gray"],
  face_enrolled: ["Face Registered", "green"],
  face_deleted: ["Face Removed", "red"],
  face_verified: ["Face Verified", "green"],
  face_mismatch: ["Face Did Not Match", "red"],
  face_override: ["Identity Confirmed Manually", "blue"],
  face_identify: ["Face Search", "gray"],
  face_identify_none: ["Face Search: No Match", "gray"],
  user_account_created: ["Account Created", "green"],
  user_account_deleted: ["Account Deleted", "red"],
  user_account_restored: ["Account Restored", "green"],
  user_status_updated: ["Account Status Changed", "blue"],
  health_center_added: ["Health Center Added", "green"],
  health_center_updated: ["Health Center Updated", "blue"],
  health_center_deleted: ["Health Center Deleted", "red"],
  announcement_posted: ["Announcement Posted", "green"],
  announcement_updated: ["Announcement Updated", "blue"],
  announcement_deleted: ["Announcement Deleted", "red"],
  system_setting_updated: ["Setting Changed", "blue"],
  backup_created: ["Backup Downloaded", "gray"],
  backup_restored: ["Backup Restored", "red"],
};

const TONES = {
  green: "bg-[#E8F3E9] text-[#1B5E20]",
  blue: "bg-[#E7EEF7] text-[#0B3D7A]",
  red: "bg-[#FBEAE5] text-[#8A3B27]",
  gray: "bg-[#F1F3F6] text-[#3D4653]",
};

function actionLabel(action) {
  return ACTIONS[action]?.[0] ?? String(action ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ActionBadge({ action }) {
  const tone = TONES[ACTIONS[action]?.[1] ?? "gray"];
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${tone}`}>
      {actionLabel(action)}
    </span>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ActivityLogsPage() {
  const { auth } = useOutletContext();
  const isMaster = auth?.user?.role === "Master Admin";

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [centerFilter, setCenterFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
    return Array.from(new Set(logs.map((l) => l.action))).sort((a, b) => actionLabel(a).localeCompare(actionLabel(b)));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter && log.action !== actionFilter) return false;
      if (centerFilter === "none" && log.health_center_id) return false;
      if (centerFilter && centerFilter !== "none" && String(log.health_center_id ?? "") !== centerFilter) return false;
      const day = String(log.created_at ?? "").slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (q) {
        const text = [log.actor_name, log.actor_role, log.center_name, log.description, actionLabel(log.action)]
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, actionFilter, centerFilter, dateFrom, dateTo]);

  const hasFilters = search || actionFilter || centerFilter || dateFrom || dateTo;

  function clearFilters() {
    setSearch("");
    setActionFilter("");
    setCenterFilter("");
    setDateFrom("");
    setDateTo("");
  }

  const inputClass =
    "w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20";

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold">Activity Logs</h2>
          <p className="text-[#5B6470]">
            {isMaster
              ? "Every action done in the system, from all health centers"
              : "Actions done by the users of your health center"}
          </p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0B3D7A] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#0A3468] transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Search and filters */}
      <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <label className="block sm:col-span-2">
          <span className="block text-xs font-semibold text-[#5B6470] mb-1">Search</span>
          <span className="relative block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A94A6]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, role or details"
              className={`${inputClass} pl-9`}
            />
          </span>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-[#5B6470] mb-1">Action</span>
          <SearchableSelect
            rounded="lg"
            emptyLabel="All actions"
            sort
            options={uniqueActions.map((a) => ({ value: a, label: actionLabel(a) }))}
            value={actionFilter}
            onChange={setActionFilter}
            ariaLabel="Action filter"
          />
        </label>
        {isMaster && (
          <label className="block">
            <span className="block text-xs font-semibold text-[#5B6470] mb-1">Health Center</span>
            <SearchableSelect
              rounded="lg"
              emptyLabel="All"
              options={[
                ...HEALTH_CENTERS.map((hc) => ({ value: hc.id, label: hc.name })),
                { value: "none", label: "Master Admin / System" },
              ]}
              value={centerFilter}
              onChange={setCenterFilter}
              ariaLabel="Health center filter"
            />
          </label>
        )}
        <label className="block">
          <span className="block text-xs font-semibold text-[#5B6470] mb-1">From</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-[#5B6470] mb-1">To</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
        </label>
        <div className="flex items-center gap-3 lg:col-span-6">
          <span className="text-sm text-[#5B6470]">
            Showing {filteredLogs.length} of {logs.length} entries
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full bg-[#F4F6F9] text-[#3D4653] border border-[#E3E8EF] px-4 py-1.5 text-sm font-semibold hover:bg-[#E3E8EF]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-sm">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="bg-[#F4F6F9] text-[#5B6470] text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">Date &amp; Time</th>
              <th className="px-4 py-3 font-semibold">User</th>
              {isMaster && <th className="px-4 py-3 font-semibold">Health Center</th>}
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={5} className="px-4 py-6 text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && loadError && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={5} className="px-4 py-6 text-center">{loadError}</td>
              </tr>
            )}
            {!isLoading && !loadError && filteredLogs.length === 0 && (
              <tr className="bg-white text-[#5B6470]">
                <td colSpan={5} className="px-4 py-6 text-center">
                  {logs.length === 0 ? "No activity recorded yet." : "No entry matches your search or filters."}
                </td>
              </tr>
            )}
            {!isLoading &&
              !loadError &&
              filteredLogs.map((log) => (
                <tr key={log.id} className="bg-white text-[#1A1A1A] border-t border-[#E3E8EF] align-top">
                  <td className="px-4 py-3 text-sm text-[#5B6470] whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{log.actor_name || "System"}</p>
                    {log.actor_role && <p className="text-xs text-[#5B6470]">{log.actor_role}</p>}
                  </td>
                  {isMaster && <td className="px-4 py-3 text-sm">{log.center_name || "—"}</td>}
                  <td className="px-4 py-3">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-4 py-3 text-sm break-words max-w-[420px]">{log.description}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#5B6470] mt-3">
        Showing the 500 most recent entries. Logs cannot be edited or deleted.
      </p>
    </div>
  );
}
