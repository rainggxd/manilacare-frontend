import { useEffect, useRef, useState } from "react";
import { Camera, X, RotateCcw, ScanFace, Trash2 } from "lucide-react";
import FaceEnrollModal from "./FaceEnrollModal";
import axios from "axios";
import { grabPhoto } from "../utils/photo";
import { useConfirm } from "./ConfirmDialog";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Patient photo and face registration (one place for both).
 *
 * Shows the saved photo (or the initials). For Admin, Staff and Nurse
 * (editable), clicking the photo opens the face registration with the
 * left/right head-turn check. The same camera picture becomes the profile
 * photo, so the photo and the face always match. If facial recognition is
 * turned off in Settings, a plain camera is used for the photo instead.
 *
 * Props:
 *  - patient: patient row (id, full_name, photo)
 *  - auth: { token, user } (needed only when editable)
 *  - size: width/height in pixels (default 112)
 *  - editable: allow registering/updating the face and photo
 *  - canRemove: show "Remove Face" (Admin only). Removing the face also removes the photo.
 *  - onUpdated(photo): called after the photo changes (null when removed)
 */
export default function PatientPhoto({ patient, auth, size = 112, editable = false, canRemove = false, onUpdated }) {
  const confirm = useConfirm();
  const [showCamera, setShowCamera] = useState(false);
  const [showFace, setShowFace] = useState(false);
  const [faceStatus, setFaceStatus] = useState(null); // { enabled, enrolled }
  const [message, setMessage] = useState("");
  const canEdit = editable && ["Admin", "Staff", "Nurse"].includes(auth?.user?.role);
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  async function loadStatus() {
    try {
      const res = await axios.get(`${API_BASE_URL}/patients/${patient.id}/face`, { headers: authHeader });
      setFaceStatus(res.data?.data ?? null);
    } catch {
      setFaceStatus(null);
    }
  }

  useEffect(() => {
    if (canEdit && patient?.id) loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, patient?.id]);

  if (!patient) return null;

  const faceOn = faceStatus?.enabled !== false;
  const enrolled = Boolean(faceStatus?.enrolled);

  function openCapture() {
    setMessage("");
    if (faceOn) setShowFace(true);
    else setShowCamera(true);
  }

  async function handleRemove() {
    const ok = await confirm({
      title: enrolled ? "Remove the face and photo?" : "Remove the profile photo?",
      message: enrolled
        ? "The face data and the profile photo of this patient will both be removed. Face verification will not work until the face is registered again."
        : "The profile photo of this patient will be removed.",
      confirmText: "Yes, remove",
      tone: "danger",
    });
    if (!ok) return;
    try {
      // Removes the photo and, if saved, the face data too
      await axios.delete(`${API_BASE_URL}/patients/${patient.id}/photo`, { headers: authHeader });
      setMessage(enrolled ? "Face data and photo removed." : "Photo removed.");
      onUpdated?.(null);
      loadStatus();
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to remove the photo right now.");
    }
  }

  const initials = (patient.full_name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const picture = patient.photo ? (
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
  );

  return (
    <div className="flex flex-col items-center gap-2 shrink-0" style={{ fontFamily: "'Inter', sans-serif" }}>
      {canEdit ? (
        <button
          type="button"
          onClick={openCapture}
          title={faceOn ? (enrolled ? "Update face and photo" : "Register face and photo") : "Take photo"}
          className="group relative rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0B3D7A]/40"
        >
          {picture}
          <span className="absolute inset-0 rounded-2xl bg-black/45 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={18} />
            {faceOn ? (enrolled ? "Update Face" : "Register Face") : "Take Photo"}
          </span>
        </button>
      ) : (
        picture
      )}

      {canEdit && (
        <>
          {faceOn && faceStatus && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                enrolled ? "bg-[#E8F3E9] text-[#1B5E20]" : "bg-[#FBF3D9] text-[#8A6D00]"
              }`}
            >
              {enrolled ? <ScanFace size={12} /> : null}
              {enrolled ? "Face saved" : "No face yet"}
            </span>
          )}
          <div className="flex flex-wrap justify-center gap-1.5">
            <button
              type="button"
              onClick={openCapture}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#0B3D7A]/30 bg-white px-3 py-1 text-xs font-semibold text-[#0B3D7A] hover:bg-[#0B3D7A]/5"
            >
              <Camera size={13} />
              {faceOn ? (enrolled ? "Update Face" : "Register Face") : patient.photo ? "Retake Photo" : "Take Photo"}
            </button>
            {canRemove && (enrolled || patient.photo) && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#8A3B27]/30 bg-white px-3 py-1 text-xs font-semibold text-[#8A3B27] hover:bg-[#8A3B27]/5"
              >
                <Trash2 size={13} />
                {enrolled ? "Remove Face" : "Remove Photo"}
              </button>
            )}
          </div>
          {message && <p className="text-[11px] text-[#1B5E20] max-w-[180px] text-center">{message}</p>}
        </>
      )}

      {showFace && (
        <FaceEnrollModal
          patient={patient}
          auth={auth}
          onClose={(saved, photo) => {
            setShowFace(false);
            if (photo) onUpdated?.(photo);
            if (saved) {
              setMessage("Face and photo saved.");
              loadStatus();
            } else if (faceStatus?.enabled === false) {
              setShowCamera(true);
            }
          }}
        />
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

function PhotoCameraModal({ patient, auth, onClose, onSaved }) {
  const confirm = useConfirm();
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
    const ok = await confirm({ title: "Save this photo?", message: "It will replace the patient's current photo.", confirmText: "Yes, save photo" });
    if (!ok) return;
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
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
