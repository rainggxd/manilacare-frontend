import { useEffect, useState } from "react";
import { X } from "lucide-react";
import axios from "axios";
import FaceCapture from "./FaceCapture";
import { useConfirm } from "./ConfirmDialog";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Pop-up for saving (or updating) a patient's face.
 *
 * Props:
 *   patient  - { id, full_name }
 *   auth     - the logged-in auth object ({ token, user })
 *   onClose  - function(enrolled: boolean, photo?: string). Called when the pop-up closes.
 *              photo is the new profile photo when "use as profile photo" was checked.
 *
 * If facial recognition is turned off in Settings, the pop-up closes by
 * itself (onClose(false)), so registration is never blocked by it.
 */
export default function FaceEnrollModal({ patient, auth, onClose }) {
  const confirm = useConfirm();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [isChecking, setIsChecking] = useState(true);
  const [consent, setConsent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  // The same camera picture can also become the patient's profile photo,
  // so staff see the patient's face after a QR or face scan.
  const useAsPhoto = true; // the face picture is always the profile photo
  const [savedPhoto, setSavedPhoto] = useState(null);
  const [photoWarning, setPhotoWarning] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await axios.get(`${API_BASE_URL}/patients/${patient.id}/face`, { headers: authHeader });
        if (!cancelled && res.data?.data?.enabled === false) {
          onClose(false);
          return;
        }
      } catch (_) {
        // If the check fails, still let the user try.
      }
      if (!cancelled) setIsChecking(false);
    }
    check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  async function handleCaptured(descriptor, photo) {
    const ok = await confirm({
      title: "Save this face?",
      message:
        `The face will be used to confirm the identity of ${patient.full_name ?? "this patient"} at check-in.` +
        (useAsPhoto && photo ? " The picture will also be saved as the profile photo." : ""),
      confirmText: "Yes, save face",
    });
    if (!ok) return;
    setIsSaving(true);
    setError("");
    try {
      await axios.post(
        `${API_BASE_URL}/patients/${patient.id}/face`,
        { descriptor, consent: true },
        { headers: authHeader }
      );
      if (useAsPhoto && photo) {
        try {
          await axios.put(`${API_BASE_URL}/patients/${patient.id}/photo`, { photo }, { headers: authHeader });
          setSavedPhoto(photo);
        } catch (err) {
          setPhotoWarning(err.response?.data?.message || "The face was saved, but the profile photo could not be saved.");
        }
      }
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save the face right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-bold text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Register Face
            </h3>
            <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
              {patient.full_name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(done, savedPhoto || undefined)}
            aria-label="Close"
            className="text-[#5B6470] hover:text-[#1A1A1A]"
          >
            <X size={20} />
          </button>
        </div>

        {isChecking ? (
          <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Inter', sans-serif" }}>Checking…</p>
        ) : done ? (
          <div>
            <p className="text-sm text-[#1B5E20] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
              Face saved. It will be used to verify this patient during check-in.
              {savedPhoto && " The profile photo was updated too."}
            </p>
            {savedPhoto && (
              <img src={savedPhoto} alt="New profile photo" className="w-28 h-28 rounded-2xl object-cover border-2 border-[#0B3D7A]/20 mb-4" />
            )}
            {photoWarning && <p className="text-sm text-[#8A3B27] mb-4">{photoWarning}</p>}
            <button
              type="button"
              onClick={() => onClose(true, savedPhoto || undefined)}
              className="rounded-full bg-[#1B5E20] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#164D1A] transition-colors"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#5B6470] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
              The face check uses a set of numbers made from the face, not a photo. It is used only to confirm the
              patient's identity at check-in, and it can be removed on request. The same picture is saved as the
              patient's profile photo.
            </p>

            <label className="flex items-start gap-2 mb-4 text-sm text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              <span>The patient agreed to have their face data saved for check-in verification.</span>
            </label>



            {consent && <FaceCapture samples={3} buttonLabel="Capture and Save" onCaptured={handleCaptured} disabled={isSaving} />}

            {error && (
              <p role="alert" className="text-sm text-[#8A3B27] mt-3 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
                {error}
              </p>
            )}

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="rounded-full bg-[#F7F5F1] text-[#1A1A1A] px-5 py-2 text-sm font-semibold hover:bg-[#EDEAE3] transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Skip for now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}