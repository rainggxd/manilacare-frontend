import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Upload, ShieldAlert, Lock, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../utils/healthCenters";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

export default function BackupRestorePage({ embedded = false }) {
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
  const fileInputRef = useRef(null);

  // Master Admin backs up the whole system; a center Admin only their own center.
  const isCenterAdmin = auth?.user?.role === "Admin";
  const centerName = isCenterAdmin ? healthCenterName(auth?.user?.health_center_id) : "";
  const fileLabel = isCenterAdmin ? `center${auth?.user?.health_center_id}` : "full";

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  // The backup file is locked with this password (it is not saved anywhere)
  const [backupPassword, setBackupPassword] = useState("");
  const [backupPassword2, setBackupPassword2] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState("");

  async function handleExport() {
    setExportError("");
    if (backupPassword.length < 8) {
      setExportError("Please set a backup password of at least 8 characters.");
      return;
    }
    if (backupPassword !== backupPassword2) {
      setExportError("The two passwords do not match.");
      return;
    }
    setIsExporting(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/backup/export`,
        { backup_password: backupPassword },
        { headers: authHeader, responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `manilacare_${fileLabel}_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setBackupPassword("");
      setBackupPassword2("");
    } catch (err) {
      let message = "Unable to export backup right now.";
      try {
        message = JSON.parse(await err.response.data.text()).message || message;
      } catch {
        // keep the default message
      }
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    setRestoreError("");
    setRestoreSuccess("");
    if (file) {
      setSelectedFile(file);
      setShowConfirm(true);
    }
  }

  async function handleConfirmRestore() {
    if (!selectedFile) return;
    setIsRestoring(true);
    setRestoreError("");
    setRestoreSuccess("");
    try {
      const text = await selectedFile.text();
      const parsed = JSON.parse(text);
      if (parsed.format && !restorePassword) {
        setRestoreError("This backup is locked. Please enter its backup password.");
        return;
      }
      await axios.post(
        `${API_BASE_URL}/backup/restore`,
        { ...parsed, backup_password: restorePassword },
        { headers: authHeader }
      );
      setRestorePassword("");
      setRestoreSuccess("Restored successfully. Please refresh the page.");
      setShowConfirm(false);
      setSelectedFile(null);
    } catch (err) {
      setRestoreError(
        err instanceof SyntaxError
          ? "That file isn't a valid backup (invalid JSON)."
          : err.response?.data?.message || "Restore failed right now."
      );
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleCancelRestore() {
    setRestorePassword("");
    setShowConfirm(false);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="max-w-3xl">
      {embedded ? (
        <h3 className="text-xl font-bold text-[#0B3D7A] mb-1">Backup & Restore</h3>
      ) : (
        <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
          Backup & Restore
        </h2>
      )}
      <p className={`text-[#5B6470] ${embedded ? "mb-5" : "mb-8"}`} style={{ fontFamily: "'Inter', sans-serif" }}>
        {isCenterAdmin
          ? `Keep a copy of ${centerName}'s data, or restore from a previous backup file`
          : "Keep a copy of all system data, or restore from a previous backup file"}
      </p>

      {/* Backup card */}
      <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Download size={20} className="text-[#0B3D7A]" />
          <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Create Backup
          </h3>
        </div>
        <p className="text-[#5B6470] text-sm mb-5" style={{ fontFamily: "'Inter', sans-serif" }}>
          {isCenterAdmin
            ? `Downloads a JSON file with the patient records, QR codes, appointments, visits, medical records and prescriptions of ${centerName} only. The file is locked with your backup password.`
            : "Downloads a single JSON file containing every patient record, user account, appointment, and prescription of all health centers. The file is locked with your backup password."}
        </p>
        <div className="rounded-xl bg-[#F4F6F9] p-4 mb-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1A1A1A] mb-1">
            <Lock size={15} className="text-[#0B3D7A]" /> Lock the backup with a password
          </p>
          <p className="text-xs text-[#5B6470] mb-3">
            The file is encrypted, so nobody can read it without this password. Remember it, because the
            system does not save it and it is needed to restore the file.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type={showPasswords ? "text" : "password"}
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              placeholder="Backup password (8+ characters)"
              autoComplete="new-password"
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm outline-none focus:border-[#0B3D7A]"
            />
            <input
              type={showPasswords ? "text" : "password"}
              value={backupPassword2}
              onChange={(e) => setBackupPassword2(e.target.value)}
              placeholder="Type the password again"
              autoComplete="new-password"
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm outline-none focus:border-[#0B3D7A]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0B3D7A]"
          >
            {showPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
            {showPasswords ? "Hide passwords" : "Show passwords"}
          </button>
        </div>
        {exportError && <p className="text-sm text-[#B3261E] mb-3">{exportError}</p>}
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#0A3468] transition-colors disabled:opacity-60"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {isExporting ? "Preparing…" : "Download Backup"}
        </button>
      </div>

      {/* Restore card */}
      <div className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <Upload size={20} className="text-[#0B3D7A]" />
          <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Restore from Backup
          </h3>
        </div>
        <p className="text-[#5B6470] text-sm mb-5" style={{ fontFamily: "'Inter', sans-serif" }}>
          {isCenterAdmin
            ? `Upload a backup file of ${centerName} to replace this center's current data with what's in that file. Other health centers are not affected.`
            : "Upload a previously downloaded full backup file to replace all current system data with what's in that file."}
        </p>

        <div className="rounded-2xl border border-[#8A3B27]/30 bg-[#FBEAE5] text-[#8A3B27] px-4 py-3 mb-5 flex items-start gap-2">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
            {isCenterAdmin
              ? "Restoring replaces ALL current data of your health center with the contents of the backup file. This cannot be undone."
              : "Restoring replaces ALL current data with the contents of the backup file. This cannot be undone."}
          </p>
        </div>

        {restoreError && <p className="text-sm text-[#8A3B27] mb-3">{restoreError}</p>}
        {restoreSuccess && <p className="text-sm text-[#1B5E20] font-semibold mb-3">{restoreSuccess}</p>}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileSelect}
          className="hidden"
          id="restore-file-input"
        />
        <label
          htmlFor="restore-file-input"
          className="inline-block rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#092E5C] transition-colors cursor-pointer"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Choose Backup File…
        </label>

        {showConfirm && selectedFile && (
          <div className="mt-5 rounded-xl border border-[#8A3B27]/30 bg-[#FBEAE5] p-4">
            <p className="text-sm text-[#8A3B27] mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
              You're about to restore from <strong>{selectedFile.name}</strong>. All current{" "}
              {isCenterAdmin ? "data of your health center" : "data"} will be replaced. Are you sure?
            </p>
            <input
              type="password"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              placeholder="Backup password"
              autoComplete="off"
              className="w-full sm:w-72 mb-3 rounded-lg bg-white border border-[#8A3B27]/30 px-3 py-2 text-sm outline-none focus:border-[#8A3B27]"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="rounded-full bg-[#8A3B27] text-white px-5 py-2 text-sm font-bold hover:bg-[#752F1F] disabled:opacity-60"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {isRestoring ? "Restoring…" : "Yes, Restore Now"}
              </button>
              <button
                type="button"
                onClick={handleCancelRestore}
                disabled={isRestoring}
                className="rounded-full bg-white border border-[#8A3B27]/30 text-[#8A3B27] px-5 py-2 text-sm font-bold hover:bg-[#F7F5F1] disabled:opacity-60"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}