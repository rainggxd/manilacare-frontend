import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Upload, ShieldAlert } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../utils/healthCenters";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

export default function BackupRestorePage() {
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
  const fileInputRef = useRef(null);

  // Master Admin backs up the whole system; a center Admin only their own center.
  const isCenterAdmin = auth?.user?.role === "Admin";
  const centerName = isCenterAdmin ? healthCenterName(auth?.user?.health_center_id) : "";
  const fileLabel = isCenterAdmin ? `center${auth?.user?.health_center_id}` : "full";

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState("");

  async function handleExport() {
    setIsExporting(true);
    setExportError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/backup/export`, {
        headers: authHeader,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `manilacare_${fileLabel}_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError("Unable to export backup right now.");
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
      await axios.post(`${API_BASE_URL}/backup/restore`, parsed, { headers: authHeader });
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
    setShowConfirm(false);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        Backup & Restore
      </h2>
      <p className="text-[#5B6470] mb-8" style={{ fontFamily: "'Lora', serif" }}>
        {isCenterAdmin
          ? `Keep a copy of ${centerName}'s data, or restore from a previous backup file`
          : "Keep a copy of all system data, or restore from a previous backup file"}
      </p>

      {/* Backup card */}
      <div className="rounded-2xl bg-[#1B5E20] text-white shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Download size={20} />
          <h3 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Create Backup
          </h3>
        </div>
        <p className="text-white/85 text-sm mb-5" style={{ fontFamily: "'Lora', serif" }}>
          {isCenterAdmin
            ? `Downloads a JSON file with the patient records, QR codes, appointments, visits, medical records and prescriptions of ${centerName} only. Keep this file somewhere safe.`
            : "Downloads a single JSON file containing every patient record, user account, appointment, and prescription of all health centers. Keep this file somewhere safe."}
        </p>
        {exportError && <p className="text-sm text-red-200 mb-3">{exportError}</p>}
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="rounded-full bg-white text-[#1B5E20] px-6 py-2.5 text-sm font-bold hover:bg-white/90 transition-colors disabled:opacity-60"
          style={{ fontFamily: "'Lora', serif" }}
        >
          {isExporting ? "Preparing…" : "Download Backup"}
        </button>
      </div>

      {/* Restore card */}
      <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <Upload size={20} className="text-[#0B3D7A]" />
          <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Restore from Backup
          </h3>
        </div>
        <p className="text-[#5B6470] text-sm mb-5" style={{ fontFamily: "'Lora', serif" }}>
          {isCenterAdmin
            ? `Upload a backup file of ${centerName} to replace this center's current data with what's in that file. Other health centers are not affected.`
            : "Upload a previously downloaded full backup file to replace all current system data with what's in that file."}
        </p>

        <div className="rounded-2xl border border-[#8A3B27]/30 bg-[#FBEAE5] text-[#8A3B27] px-4 py-3 mb-5 flex items-start gap-2">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm" style={{ fontFamily: "'Lora', serif" }}>
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
          style={{ fontFamily: "'Lora', serif" }}
        >
          Choose Backup File…
        </label>

        {showConfirm && selectedFile && (
          <div className="mt-5 rounded-xl border border-[#8A3B27]/30 bg-[#FBEAE5] p-4">
            <p className="text-sm text-[#8A3B27] mb-3" style={{ fontFamily: "'Lora', serif" }}>
              You're about to restore from <strong>{selectedFile.name}</strong>. All current{" "}
              {isCenterAdmin ? "data of your health center" : "data"} will be replaced. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="rounded-full bg-[#8A3B27] text-white px-5 py-2 text-sm font-bold hover:bg-[#752F1F] disabled:opacity-60"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {isRestoring ? "Restoring…" : "Yes, Restore Now"}
              </button>
              <button
                type="button"
                onClick={handleCancelRestore}
                disabled={isRestoring}
                className="rounded-full bg-white border border-[#8A3B27]/30 text-[#8A3B27] px-5 py-2 text-sm font-bold hover:bg-[#F7F5F1] disabled:opacity-60"
                style={{ fontFamily: "'Lora', serif" }}
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