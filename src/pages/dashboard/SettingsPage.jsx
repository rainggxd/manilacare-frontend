import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import BackupRestorePage from "./BackupRestorePage";
import { useConfirm } from "../../components/ConfirmDialog";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-[#5B6470]">{label}</span>
      <span className="text-sm font-semibold text-[#1A1A1A]">{value}</span>
    </div>
  );
}

/** A setting that can be switched on or off (saved right away). */
function ToggleRow({ label, isOn, onToggle, disabled, onLabel = "Enabled", offLabel = "Disabled" }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-[#5B6470]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        onClick={onToggle}
        disabled={disabled}
        className="inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
      >
        <span className={isOn ? "text-[#1B5E20]" : "text-[#8A94A6]"}>{isOn ? onLabel : offLabel}</span>
        <span className={`relative h-6 w-11 rounded-full transition-colors ${isOn ? "bg-[#1B5E20]" : "bg-[#CBD5E1]"}`}>
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isOn ? "left-[22px]" : "left-0.5"}`}
          />
        </span>
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const confirm = useConfirm();
  const { auth } = useOutletContext();
  // Master Admin: system settings + full backup. Admin: backup of their own center only.
  const isMasterAdmin = auth?.user?.role === "Master Admin";
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [settings, setSettings] = useState({
    facial_recognition_enabled: "1",
    outbreak_threshold: "50",
    outbreak_window_days: "30",
  });
  const [limitDraft, setLimitDraft] = useState({ outbreak_threshold: "50", outbreak_window_days: "30" });
  const [limitError, setLimitError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [savingKey, setSavingKey] = useState("");

  async function loadSettings() {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/settings`, { headers: authHeader });
      const data = res.data?.data ?? {};
      setSettings((prev) => ({ ...prev, ...data }));
      setLimitDraft((prev) => ({
        outbreak_threshold: data.outbreak_threshold ?? prev.outbreak_threshold,
        outbreak_window_days: data.outbreak_window_days ?? prev.outbreak_window_days,
      }));
    } catch (err) {
      setLoadError("Unable to load settings right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  async function handleToggle(key) {
    const currentValue = settings[key] === "1";
    const newValue = currentValue ? "0" : "1";

    const ok = await confirm(
      currentValue
        ? {
            title: "Turn off facial recognition?",
            message: "Check-in will use the QR code only. Staff will not be asked to verify the patient's face.",
            confirmText: "Yes, turn off",
            tone: "danger",
          }
        : {
            title: "Turn on facial recognition?",
            message: "Staff will verify the patient's face after scanning the QR code.",
            confirmText: "Yes, turn on",
          }
    );
    if (!ok) return;

    // Optimistic update
    setSettings((prev) => ({ ...prev, [key]: newValue }));
    setSavingKey(key);
    setSavedMessage("");

    try {
      await axios.put(`${API_BASE_URL}/settings`, { key, value: newValue }, { headers: authHeader });
      setSavedMessage("Setting saved.");
      window.clearTimeout(handleToggle._t);
      handleToggle._t = window.setTimeout(() => setSavedMessage(""), 2500);
    } catch (err) {
      // Revert on failure
      setSettings((prev) => ({ ...prev, [key]: currentValue ? "1" : "0" }));
      setSavedMessage("Unable to save that change. Please try again.");
    } finally {
      setSavingKey("");
    }
  }

  /** Saves the disease case warning limit (number of cases within a number of days). */
  async function handleSaveLimit(e) {
    e.preventDefault();
    setLimitError("");
    setSavedMessage("");
    const keys = ["outbreak_threshold", "outbreak_window_days"];
    for (const key of keys) {
      const n = Number(limitDraft[key]);
      if (!Number.isInteger(n) || n < 1 || n > 365) {
        setLimitError("Enter whole numbers from 1 to 365.");
        return;
      }
    }
    const ok = await confirm({
      title: "Save the case warning limit?",
      message: `A warning will show when one disease reaches ${Number(limitDraft.outbreak_threshold)} cases within ${Number(limitDraft.outbreak_window_days)} days.`,
      confirmText: "Yes, save",
    });
    if (!ok) return;
    setSavingKey("outbreak");
    try {
      for (const key of keys) {
        await axios.put(`${API_BASE_URL}/settings`, { key, value: String(Number(limitDraft[key])) }, { headers: authHeader });
      }
      setSettings((prev) => ({ ...prev, ...limitDraft }));
      setSavedMessage("Case warning limit saved.");
    } catch (err) {
      setLimitError(err?.response?.data?.message || "Unable to save the warning limit. Please try again.");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
          Settings
        </h2>
        <p className="text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
          {isMasterAdmin ? "System configuration, security options, and backups" : "System and security information, and backups of your health center"}
        </p>
      </div>

      <>
      {loadError && (
        <p className="text-sm text-[#8A3B27] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
          {loadError}
        </p>
      )}

      {savedMessage && (
        <p className="text-sm text-[#1B5E20] mb-4 font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
          {savedMessage}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          <h3 className="text-lg font-bold text-[#0B3D7A] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
            System Information
          </h3>

          <div className="divide-y divide-[#E3E8EF]">
            <InfoRow label="System name" value="ManilaCare v1.0" />
            <InfoRow label="Email (SMTP)" value="Gmail SMTP" />
            <InfoRow label="Session timeout" value="1 hour (15 min idle)" />
            <InfoRow label="Password policy" value="8+ chars, mixed, symbol" />
            <ToggleRow
              label="Facial recognition"
              isOn={settings.facial_recognition_enabled === "1"}
              onToggle={() => handleToggle("facial_recognition_enabled")}
              disabled={!isMasterAdmin || isLoading || savingKey === "facial_recognition_enabled"}
            />
            <InfoRow label="QR Code expiry" value="Never" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          <h3 className="text-lg font-bold text-[#0B3D7A] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
            Security Settings
          </h3>

          <div className="divide-y divide-[#E3E8EF]">
            <InfoRow label="Login attempt limit" value="5 attempts" />
            <InfoRow label="Account lock duration" value="15 minutes" />
            <InfoRow label="RBAC" value="Always on" />
            <InfoRow label="Audit trail" value="Always on" />
            <InfoRow label="Password storage" value="Bcrypt hash" />
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          <h3 className="text-lg font-bold text-[#0B3D7A] mb-1">Disease Case Warning Limit</h3>
          <p className="text-sm text-[#5B6470] mb-4">
            A warning is shown on the dashboards when one disease reaches this many cases within the set number of days.
          </p>
          <form onSubmit={handleSaveLimit} className="flex flex-wrap items-end gap-4">
            <label className="text-sm text-[#5B6470]">
              Number of cases
              <input
                type="number" min="1" max="365"
                value={limitDraft.outbreak_threshold}
                onChange={(e) => setLimitDraft((d) => ({ ...d, outbreak_threshold: e.target.value }))}
                disabled={!isMasterAdmin || isLoading}
                className="mt-1 block w-36 rounded-lg border border-[#CBD5E1] px-3 py-2 text-base text-[#1A1A1A] disabled:bg-[#F3F5F8]"
              />
            </label>
            <label className="text-sm text-[#5B6470]">
              Within (days)
              <input
                type="number" min="1" max="365"
                value={limitDraft.outbreak_window_days}
                onChange={(e) => setLimitDraft((d) => ({ ...d, outbreak_window_days: e.target.value }))}
                disabled={!isMasterAdmin || isLoading}
                className="mt-1 block w-36 rounded-lg border border-[#CBD5E1] px-3 py-2 text-base text-[#1A1A1A] disabled:bg-[#F3F5F8]"
              />
            </label>
            {isMasterAdmin && (
              <button
                type="submit"
                disabled={isLoading || savingKey === "outbreak"}
                className="rounded-lg bg-[#0B3D7A] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingKey === "outbreak" ? "Saving..." : "Save Limit"}
              </button>
            )}
          </form>
          {limitError && <p className="text-sm text-[#8A3B27] mt-3">{limitError}</p>}
        </div>
      </div>

      <p className="text-xs text-[#5B6470] mt-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        {isMasterAdmin
          ? "Switches are saved to the system right away. The warning limit is saved when you press Save Limit."
          : "These are system-wide settings. Only the Master Admin can change them."}
      </p>
      </>

      <section id="backup" className="mt-10 pt-8 border-t border-[#E3E8EF]">
        <BackupRestorePage embedded />
      </section>
    </div>
  );
}