import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ScanLine, UserCheck, X, Upload, ScanFace } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import axios from "axios";
import FaceCapture from "../../components/FaceCapture";
import FaceEnrollModal from "../../components/FaceEnrollModal";
import PatientProfileCards from "../../components/PatientProfileCards";
import { healthCenterName } from "../../utils/healthCenters";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";
const SCANNER_ELEMENT_ID = "qr-scanner-region";

const OVERRIDE_REASONS = [
  "Camera or lighting problem",
  "Patient looks different (staff checked ID)",
  "Other (staff checked ID)",
];

export default function ScanQRPage() {
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const [patient, setPatient] = useState(null);
  const [profile, setProfile] = useState(null); // full record, loaded after the scan
  const [profileError, setProfileError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState("");

  // Face verification
  const [faceStatus, setFaceStatus] = useState(null); // { enabled, enrolled }
  const [faceStep, setFaceStep] = useState("idle"); // idle | capturing | matched | mismatch | override
  const [faceMessage, setFaceMessage] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState(OVERRIDE_REASONS[0]);
  const [isOverriding, setIsOverriding] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);

  // The check-in button stays locked until the face matches (or staff
  // records a reason), but only for patients who have a face saved.
  const faceRequired = Boolean(faceStatus?.enabled && faceStatus?.enrolled);
  const canCheckIn = !faceRequired || faceStep === "matched" || faceStep === "override";

  function resetFaceState() {
    setFaceStatus(null);
    setFaceStep("idle");
    setFaceMessage("");
    setShowOverride(false);
    setOverrideReason(OVERRIDE_REASONS[0]);
    setShowEnroll(false);
  }

  async function startScanner() {
    setScanError("");
    setPatient(null);
    setProfile(null);
    setProfileError("");
    setCheckInMessage("");
    resetFaceState();

    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          await handleLookup(decodedText);
        },
        () => {
          // ignore per-frame scan failures (no QR in view yet)
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error("QR scanner start error:", err);
      setScanError(
        err?.message?.includes("Permission")
          ? "Camera permission was denied. Please allow camera access and try again."
          : "Unable to access the camera. Make sure a camera is connected and not in use by another app."
      );
      setIsScanning(false);
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        const state = scanner.getState?.();
        if (state === 2 /* SCANNING */) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) {
        console.warn("Scanner stop warning:", err);
      }
    }
    setIsScanning(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError("");
    setPatient(null);
    setProfile(null);
    setProfileError("");
    setCheckInMessage("");
    resetFaceState();

    // Camera scanning and file scanning can't safely share the DOM node
    // at the same time, so make sure the camera is off first.
    await stopScanner();

    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      const decodedText = await scanner.scanFile(file, false);
      await handleLookup(decodedText);
      try {
        scanner.clear();
      } catch (_) {
        // ignore cleanup errors
      }
    } catch (err) {
      console.error("QR file scan error:", err);
      setScanError("Could not read a QR code from that image. Please try a clearer photo.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLookup(token) {
    setIsLookingUp(true);
    setScanError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/qr-codes/lookup/${encodeURIComponent(token)}`, {
        headers: authHeader,
      });
      const found = res.data?.data ?? null;
      setPatient(found);
      if (found) {
        await Promise.all([loadFaceStatus(found.id), loadProfile(found.id)]);
      }
    } catch (err) {
      setScanError(err.response?.data?.message || "QR code not recognized. Please try again.");
    } finally {
      setIsLookingUp(false);
    }
  }

  async function loadProfile(patientId) {
    setProfileError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/patients/${patientId}`, { headers: authHeader });
      setProfile(res.data?.data ?? null);
    } catch (err) {
      setProfile(null);
      setProfileError("The full record could not be loaded, but you can still check in the patient.");
    }
  }

  async function loadFaceStatus(patientId) {
    try {
      const res = await axios.get(`${API_BASE_URL}/patients/${patientId}/face`, { headers: authHeader });
      setFaceStatus(res.data?.data ?? { enabled: false, enrolled: false });
    } catch (err) {
      // If the face check is unavailable, do not block the front desk.
      setFaceStatus({ enabled: false, enrolled: false, unavailable: true });
    }
  }

  async function handleFaceCaptured(descriptor) {
    setFaceMessage("");
    try {
      const res = await axios.post(
        `${API_BASE_URL}/patients/${patient.id}/face/verify`,
        { descriptor },
        { headers: authHeader }
      );
      if (res.data?.data?.match) {
        setFaceStep("matched");
        setFaceMessage("Face matched.");
      } else {
        setFaceStep("mismatch");
        setFaceMessage("The face does not match the saved one. Try again with better lighting, or check the patient's ID.");
      }
    } catch (err) {
      setFaceStep("mismatch");
      setFaceMessage(err.response?.data?.message || "Unable to verify the face right now.");
    }
  }

  async function handleOverride() {
    if (!patient) return;
    setIsOverriding(true);
    setFaceMessage("");
    try {
      await axios.post(
        `${API_BASE_URL}/patients/${patient.id}/face/override`,
        { reason: overrideReason },
        { headers: authHeader }
      );
      setFaceStep("override");
      setFaceMessage("Check-in without a face match was recorded in the activity log.");
    } catch (err) {
      setFaceMessage(err.response?.data?.message || "Unable to record the reason.");
    } finally {
      setIsOverriding(false);
    }
  }

  function handleEnrollClose(enrolled) {
    setShowEnroll(false);
    if (enrolled) {
      // The patient was just captured at the desk, so treat them as verified.
      setFaceStatus({ enabled: true, enrolled: true });
      setFaceStep("matched");
      setFaceMessage("Face saved and verified.");
    }
  }

  async function handleCheckIn() {
    if (!patient || !canCheckIn) return;
    setIsCheckingIn(true);
    setCheckInMessage("");
    try {
      await axios.post(
        `${API_BASE_URL}/visits/check-in`,
        { patient_id: patient.id },
        { headers: authHeader }
      );
      setCheckInMessage("Patient checked in successfully.");
    } catch (err) {
      setCheckInMessage(err.response?.data?.message || "Unable to check in this patient.");
    } finally {
      setIsCheckingIn(false);
    }
  }

  function handleReset() {
    setPatient(null);
    setProfile(null);
    setProfileError("");
    setScanError("");
    setCheckInMessage("");
    resetFaceState();
  }

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h2 className="text-3xl text-[#1B5E20] font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
        Scan Patient QR Code
      </h2>
      <p className="text-[#5B6470] mb-6" style={{ fontFamily: "'Lora', serif" }}>
        Scan a patient's QR code to pull up their record and check them in
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
          <div className="relative rounded-xl overflow-hidden bg-black/5 min-h-[280px]">
            <div id={SCANNER_ELEMENT_ID} className="w-full min-h-[280px]" />

            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <ScanLine size={40} className="text-[#8A8578]" />
              </div>
            )}
          </div>

          {scanError && (
            <p className="text-sm text-[#8A3B27] mt-4" style={{ fontFamily: "'Lora', serif" }}>
              {scanError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {!isScanning ? (
              <button
                type="button"
                onClick={startScanner}
                className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#0A3468] transition-colors"
                style={{ fontFamily: "'Lora', serif" }}
              >
                <ScanLine size={16} />
                Start Scanning
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanner}
                className="inline-flex items-center gap-2 rounded-full bg-[#8A3B27] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#742F20] transition-colors"
                style={{ fontFamily: "'Lora', serif" }}
              >
                <X size={16} />
                Stop Camera
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-[#F7F5F1] text-[#1A1A1A] px-6 py-2.5 text-sm font-semibold hover:bg-[#EDEAE3] transition-colors"
              style={{ fontFamily: "'Lora', serif" }}
            >
              <Upload size={16} />
              Upload QR Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Scanned Patient
          </h3>

          {isLookingUp ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>Looking up patient…</p>
          ) : !patient ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>
              No patient scanned yet. Start the camera or upload a QR image.
            </p>
          ) : (
            <div>
              <div className="rounded-xl border border-[#0B3D7A]/10 p-4 mb-4">
                <p className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {patient.full_name}
                </p>
                <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
                  Family No. {patient.family_number || "—"}
                </p>
                <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
                  {patient.sex || "—"}
                </p>
                <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
                  {patient.contact_number || "—"}
                </p>
              </div>

              {faceStatus?.enabled && (
                <div className="rounded-xl border border-[#0B3D7A]/10 p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ScanFace size={18} className="text-[#0B3D7A]" />
                    <p className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Face Verification
                    </p>
                  </div>

                  {!faceStatus.enrolled ? (
                    <>
                      <p className="text-sm text-[#5B6470] mb-3" style={{ fontFamily: "'Lora', serif" }}>
                        No face is saved for this patient. You can check them in without face verification.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowEnroll(true)}
                        className="rounded-full bg-[#F7F5F1] text-[#1A1A1A] px-5 py-2 text-sm font-semibold hover:bg-[#EDEAE3] transition-colors"
                        style={{ fontFamily: "'Lora', serif" }}
                      >
                        Register Face Now
                      </button>
                    </>
                  ) : (
                    <>
                      {faceMessage && (
                        <p
                          className={`text-sm mb-3 ${faceStep === "matched" ? "text-[#1B5E20]" : "text-[#8A3B27]"}`}
                          style={{ fontFamily: "'Lora', serif" }}
                        >
                          {faceMessage}
                        </p>
                      )}

                      {faceStep === "idle" && (
                        <p className="text-sm text-[#5B6470] mb-3" style={{ fontFamily: "'Lora', serif" }}>
                          Confirm that the person in front of you is this patient.
                        </p>
                      )}

                      {faceStep === "capturing" && (
                        <div className="mb-3">
                          <FaceCapture samples={2} buttonLabel="Verify Face" onCaptured={handleFaceCaptured} />
                        </div>
                      )}

                      {(faceStep === "idle" || faceStep === "mismatch") && (
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setFaceMessage("");
                              setFaceStep("capturing");
                            }}
                            className="rounded-full bg-[#0B3D7A] text-white px-5 py-2 text-sm font-semibold hover:bg-[#0A3468] transition-colors"
                            style={{ fontFamily: "'Lora', serif" }}
                          >
                            {faceStep === "mismatch" ? "Try Again" : "Verify Face"}
                          </button>
                          {!showOverride && (
                            <button
                              type="button"
                              onClick={() => setShowOverride(true)}
                              className="rounded-full bg-[#F7F5F1] text-[#1A1A1A] px-5 py-2 text-sm font-semibold hover:bg-[#EDEAE3] transition-colors"
                              style={{ fontFamily: "'Lora', serif" }}
                            >
                              Check In Without Face Match
                            </button>
                          )}
                        </div>
                      )}

                      {faceStep === "capturing" && (
                        <button
                          type="button"
                          onClick={() => setFaceStep("idle")}
                          className="text-sm text-[#5B6470] underline"
                          style={{ fontFamily: "'Lora', serif" }}
                        >
                          Cancel
                        </button>
                      )}

                      {showOverride && (faceStep === "idle" || faceStep === "mismatch") && (
                        <div className="mt-4 rounded-lg bg-[#F7F5F1] p-3">
                          <label className="block text-xs text-[#5B6470] mb-1" style={{ fontFamily: "'Lora', serif" }}>
                            Reason (saved in the activity log)
                          </label>
                          <select
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none border border-[#0B3D7A]/15"
                          >
                            {OVERRIDE_REASONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleOverride}
                            disabled={isOverriding}
                            className="mt-3 rounded-full bg-[#8A3B27] text-white px-5 py-2 text-sm font-semibold hover:bg-[#742F20] transition-colors disabled:opacity-60"
                            style={{ fontFamily: "'Lora', serif" }}
                          >
                            {isOverriding ? "Saving…" : "Confirm and Continue"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {faceStatus?.unavailable && (
                <p className="text-xs text-[#8A8578] mb-3" style={{ fontFamily: "'Lora', serif" }}>
                  Face verification is not available right now.
                </p>
              )}

              {checkInMessage && (
                <p
                  className={`text-sm mb-3 ${checkInMessage.includes("success") ? "text-[#1B5E20]" : "text-[#8A3B27]"}`}
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  {checkInMessage}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={isCheckingIn || !canCheckIn}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1B5E20] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#164D1A] transition-colors disabled:opacity-60"
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  <UserCheck size={16} />
                  {isCheckingIn ? "Checking in…" : "Check In This Patient"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-full bg-[#F7F5F1] text-[#1A1A1A] px-6 py-2.5 text-sm font-semibold hover:bg-[#EDEAE3] transition-colors"
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  Scan Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {patient && (profile || profileError) && (
        <div className="mt-8">
          <h3 className="text-2xl text-[#1B5E20] font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Patient Record
          </h3>
          {profileError ? (
            <p className="text-sm text-[#8A3B27]" style={{ fontFamily: "'Lora', serif" }}>{profileError}</p>
          ) : (
            <PatientProfileCards patient={profile} healthCenterName={healthCenterName} />
          )}
        </div>
      )}

      {showEnroll && patient && (
        <FaceEnrollModal patient={patient} auth={auth} onClose={handleEnrollClose} />
      )}
    </div>
  );
}