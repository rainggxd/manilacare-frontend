import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-white/85">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function ToggleRow({ label, isOn, onToggle, disabled, onLabel = "Enabled", offLabel = "Disabled" }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-white/85">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`text-sm font-bold underline decoration-dotted underline-offset-2 disabled:opacity-50 ${
          isOn ? "text-sky-300 hover:text-sky-200" : "text-white/60 hover:text-white/80"
        }`}
      >
        {isOn ? onLabel : offLabel}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [settings, setSettings] = useState({
    facial_recognition_enabled: "1",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [savingKey, setSavingKey] = useState("");

  async function loadSettings() {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/settings`, { headers: authHeader });
      setSettings((prev) => ({ ...prev, ...(res.data?.data ?? {}) }));
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
          Settings
        </h2>
        <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
          System configuration and security options
        </p>
      </div>

      {loadError && (
        <p className="text-sm text-[#8A3B27] mb-4" style={{ fontFamily: "'Lora', serif" }}>
          {loadError}
        </p>
      )}

      {savedMessage && (
        <p className="text-sm text-[#1B5E20] mb-4 font-semibold" style={{ fontFamily: "'Lora', serif" }}>
          {savedMessage}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-[#1B5E20] text-white p-6" style={{ fontFamily: "'Lora', serif" }}>
          <h3 className="text-xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            System Information
          </h3>

          <div className="divide-y divide-white/10">
            <InfoRow label="System name" value="ManilaCare v1.0" />
            <InfoRow label="Email (SMTP)" value="Gmail SMTP" />
            <InfoRow label="Session timeout" value="1 hour (15 min idle)" />
            <InfoRow label="Password policy" value="8+ chars, mixed, symbol" />
            <ToggleRow
              label="Facial recognition"
              isOn={settings.facial_recognition_enabled === "1"}
              onToggle={() => handleToggle("facial_recognition_enabled")}
              disabled={isLoading || savingKey === "facial_recognition_enabled"}
            />
            <InfoRow label="QR Code expiry" value="Never" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#1B5E20] text-white p-6" style={{ fontFamily: "'Lora', serif" }}>
          <h3 className="text-xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Security Settings
          </h3>

          <div className="divide-y divide-white/10">
            <InfoRow label="Login attempt limit" value="5 attempts" />
            <InfoRow label="Account lock duration" value="15 minutes" />
            <InfoRow label="RBAC" value="Always on" />
            <InfoRow label="Audit trail" value="Always on" />
            <InfoRow label="Password storage" value="Bcrypt hash" />
          </div>
        </div>
      </div>

      <p className="text-xs text-[#5B6470] mt-6" style={{ fontFamily: "'Lora', serif" }}>
        Blue values are toggleable and are saved immediately to the system database.
      </p>
    </div>
  );
}