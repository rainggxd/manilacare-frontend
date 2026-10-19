import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ScanFace, UserCheck } from "lucide-react";
import axios from "axios";
import FaceCapture from "../../components/FaceCapture";
import PatientProfileCards from "../../components/PatientProfileCards";
import { healthCenterName } from "../../utils/healthCenters";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Scan Patient: staff scans the patient's FACE and the system suggests who
 * it is (only among patients of the same health center who have a face
 * saved). Staff must confirm before the record opens, and then can check
 * the patient in. Patients without a saved face are found with the QR
 * page or the check-in search instead.
 */
export default function ScanPatientPage() {
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  // step: scan | suggested | notfound | confirmed
  const [step, setStep] = useState("scan");
  const [error, setError] = useState("");
  const [suggested, setSuggested] = useState(null); // { id, full_name, family_number }
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState("");

  function reset() {
    setStep("scan");
    setError("");
    setSuggested(null);
    setProfile(null);
    setProfileError("");
    setCheckInMessage("");
  }

  async function handleCaptured(descriptor) {
    setError("");
    try {
      const res = await axios.post(
        `${API_BASE_URL}/face/identify`,
        { descriptor },
        { headers: authHeader }
      );
      const data = res.data?.data;
      if (data?.found) {
        setSuggested(data.patient);
        setStep("suggested");
      } else {
        setStep("notfound");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to scan the face right now.");
    }
  }

  async function handleConfirm() {
    if (!suggested) return;
    setStep("confirmed");
    setIsLoadingProfile(true);
    setProfileError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/patients/${suggested.id}`, { headers: authHeader });
      setProfile(res.data?.data ?? null);
    } catch (err) {
      setProfile(null);
      setProfileError("The full record could not be loaded, but you can still check in the patient.");
    } finally {
      setIsLoadingProfile(false);
    }
  }

  async function handleCheckIn() {
    if (!suggested) return;
    setIsCheckingIn(true);
    setCheckInMessage("");
    try {
      await axios.post(
        `${API_BASE_URL}/visits/check-in`,
        { patient_id: suggested.id },
        { headers: authHeader }
      );
      setCheckInMessage("Patient checked in successfully.");
    } catch (err) {
      setCheckInMessage(err.response?.data?.message || "Unable to check in this patient.");
    } finally {
      setIsCheckingIn(false);
    }
  }

  return (
    <div>
      <h2 className="text-3xl text-[#1B5E20] font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
        Scan Patient
      </h2>
      <p className="text-[#5B6470] mb-6" style={{ fontFamily: "'Lora', serif" }}>
        Scan a patient's face to find their record. Only patients with a saved face can be found this way.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <ScanFace size={18} className="text-[#0B3D7A]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Face Scan
            </h3>
          </div>

          {step === "scan" || step === "notfound" ? (
            <>
              <FaceCapture samples={2} buttonLabel="Scan Face" onCaptured={handleCaptured} />
              {error && (
                <p role="alert" className="text-sm text-center text-[#8A3B27] mt-3" style={{ fontFamily: "'Lora', serif" }}>
                  {error}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
              Face scanned. Use the panel on the right, or press Scan Another to start again.
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Result
          </h3>

          {step === "scan" && (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>
              No face scanned yet. Ask the patient to look at the camera, then press Scan Face.
            </p>
          )}

          {step === "notfound" && (
            <div>
              <p className="text-sm text-[#8A3B27] mb-3" style={{ fontFamily: "'Lora', serif" }}>
                No clear match was found. The patient may not have a saved face, or the picture was not clear.
                Try again with better lighting, or use Scan QR Code or the Patient Check-In search.
              </p>
            </div>
          )}

          {(step === "suggested" || step === "confirmed") && suggested && (
            <div>
              <div className="rounded-xl border border-[#0B3D7A]/10 p-4 mb-4">
                <p className="text-xs uppercase tracking-wide text-[#8A8578] mb-1" style={{ fontFamily: "'Lora', serif" }}>
                  {step === "suggested" ? "Possible match" : "Confirmed patient"}
                </p>
                <p className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {suggested.full_name}
                </p>
                <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
                  Family No. {suggested.family_number || "—"}
                </p>
              </div>

              {step === "suggested" && (
                <>
                  <p className="text-sm text-[#5B6470] mb-3" style={{ fontFamily: "'Lora', serif" }}>
                    Ask the patient to say their name. Is this the patient?
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="rounded-full bg-[#1B5E20] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#164D1A] transition-colors"
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      Yes, this is the patient
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-full bg-[#F7F5F1] text-[#1A1A1A] px-6 py-2.5 text-sm font-semibold hover:bg-[#EDEAE3] transition-colors"
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      No, scan again
                    </button>
                  </div>
                </>
              )}

              {step === "confirmed" && (
                <>
                  {checkInMessage && (
                    <p
                      className={`text-sm mb-3 ${checkInMessage.includes("success") ? "text-[#1B5E20]" : "text-[#8A3B27]"}`}
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      {checkInMessage}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCheckIn}
                      disabled={isCheckingIn}
                      className="inline-flex items-center gap-2 rounded-full bg-[#1B5E20] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#164D1A] transition-colors disabled:opacity-60"
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      <UserCheck size={16} />
                      {isCheckingIn ? "Checking in…" : "Check In This Patient"}
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-full bg-[#F7F5F1] text-[#1A1A1A] px-6 py-2.5 text-sm font-semibold hover:bg-[#EDEAE3] transition-colors"
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      Scan Another
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {step === "confirmed" && (
        <div className="mt-8">
          <h3 className="text-2xl text-[#1B5E20] font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Patient Record
          </h3>
          {isLoadingProfile ? (
            <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>Loading record…</p>
          ) : profileError ? (
            <p className="text-sm text-[#8A3B27]" style={{ fontFamily: "'Lora', serif" }}>{profileError}</p>
          ) : profile ? (
            <PatientProfileCards patient={profile} healthCenterName={healthCenterName} />
          ) : null}
        </div>
      )}
    </div>
  );
}