import { useEffect, useRef, useState } from "react";
import { Camera, X, RotateCcw } from "lucide-react";
import axios from "axios";
import { grabPhoto } from "../utils/photo";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Patient photo.
 * Shows the saved photo (or the initials if there is none). Admin and
 * Staff also get a "Take Photo" button that opens the webcam.
 *
 * Props:
 *  - patient: patient row (id, full_name, photo)
 *  - auth: { token, user } (needed only when editable)
 *  - size: width/height in pixels (default 112)
 *  - editable: show the Take/Retake Photo button
 *  - onUpdated(photo): called after a new photo is saved
 */
export default function PatientPhoto({ patient, auth, size = 112, editable = false, onUpdated }) {
  const [showCamera, setShowCamera] = useState(false);
  const canEdit = editable && ["Admin", "Staff"].includes(auth?.user?.role);

  if (!patient) return null;

  const initials = (patient.full_name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <div className="flex flex-col items-center gap-2 shrink-0" style={{ fontFamily: "'Lora', serif" }}>
      {patient.photo ? (
        <img
          src={patient.photo}
          alt={`Photo of ${patient.full_name}`}
          className="rounded-2xl object-cover border-2 border-[#0B3D7A]/20 shadow-sm"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-2xl bg-[#0B3D7A]/10 text-[#0B3D7A] flex flex-col items-center justify-center border-2 border-dashed border-[#0B3D7A]/30"
          style={{ width: size, height: size }}
        >
          <span className="font-bold" style={{ fontSize: size / 3.5 }}>{initials}</span>
          <span className="text-[10px] text-[#5B6470]">No photo</span>
        </div>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#0B3D7A]/30 bg-white px-3 py-1 text-xs font-semibold text-[#0B3D7A] hover:bg-[#0B3D7A]/5"
        >
          <Camera size={13} />
          {patient.photo ? "Retake Photo" : "Take Photo"}
        </button>
      )}

      {showCamera && (
        <PhotoCameraModal
          patient={patient}
          auth={auth}
          onClose={() => setShowCamera(false)}
          onSaved={(photo) => {
            setShowCamera(false);
            onUpdated?.(photo);
          }}
        />
      )}
    </div>
  );
}

/** Small webcam window: Capture → check the preview → Save. */
function PhotoCameraModal({ patient, auth, onClose, onSaved }) {
  const videoRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [preview, setPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Turn the webcam on when the window opens and off when it closes.
  useEffect(() => {
    let stream;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setCameraError("The camera could not be opened. Please allow camera access and try again.");
      }
    }
    start();

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function handleCapture() {
    const photo = grabPhoto(videoRef.current);
    if (photo) setPreview(photo);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError("");
    try {
      await axios.put(
        `${API_BASE_URL}/patients/${patient.id}/photo`,
        { photo: preview },
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      onSaved(preview);
    } catch (err) {
      setSaveError(err.response?.data?.message || "Unable to save the photo right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" style={{ fontFamily: "'Lora', serif" }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Patient Photo: {patient.full_name}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-[#0B3D7A]/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[#5B6470] mb-3">
          Ask the patient to look at the camera. Make sure the face is in the middle and well lit.
        </p>

        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
          {/* The live camera stays mounted so it can be used again after "Retake". */}
          <video
            ref={videoRef}
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-cover ${preview ? "invisible" : ""}`}
            style={{ transform: "scaleX(-1)" }}
          />
          {preview && <img src={preview} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />}
        </div>

        {cameraError && <p className="text-sm text-[#8A3B27] mt-3">{cameraError}</p>}
        {saveError && <p className="text-sm text-[#8A3B27] mt-3">{saveError}</p>}

        <div className="flex flex-wrap gap-2 mt-4">
          {!preview ? (
            <button
              type="button"
              onClick={handleCapture}
              disabled={Boolean(cameraError)}
              className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#0A3468] disabled:opacity-50"
            >
              <Camera size={16} />
              Capture
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-full bg-[#1B5E20] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#164D1A] disabled:opacity-60"
              >
                {isSaving ? "Saving…" : "Save Photo"}
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0B3D7A]/10 text-[#0B3D7A] px-5 py-2.5 text-sm font-bold hover:bg-[#0B3D7A]/20"
              >
                <RotateCcw size={14} />
                Retake
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
