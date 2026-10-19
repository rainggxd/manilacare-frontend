import { useEffect, useState } from "react";
import { ScanFace } from "lucide-react";
import axios from "axios";
import FaceEnrollModal from "./FaceEnrollModal";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Card for a patient's detail page showing whether a face is saved,
 * with buttons to register / update it (and remove it, for Admin).
 *
 * Props:
 *   patient   - { id, full_name }
 *   auth      - the logged-in auth object
 *   canRemove - show the Remove button (Admin only)
 */
export default function FaceEnrollmentCard({ patient, auth, canRemove = false }) {
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [status, setStatus] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");

  async function loadStatus() {
    setLoadError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/patients/${patient.id}/face`, { headers: authHeader });
      setStatus(res.data?.data ?? null);
    } catch (err) {
      setLoadError("Unable to check the face status right now.");
    }
  }

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id, auth?.token]);

  async function handleRemove() {
    if (!window.confirm("Remove the saved face of this patient?")) return;
    setMessage("");
    try {
      await axios.delete(`${API_BASE_URL}/patients/${patient.id}/face`, { headers: authHeader });
      setMessage("Face data removed.");
      await loadStatus();
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to remove the face data.");
    }
  }

  function handleModalClose(enrolled) {
    setShowModal(false);
    if (enrolled) {
      setMessage("Face saved.");
      loadStatus();
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <ScanFace size={18} className="text-[#0B3D7A]" />
        <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Face Verification
        </h3>
      </div>

      {loadError ? (
        <p className="text-sm text-[#8A3B27]" style={{ fontFamily: "'Lora', serif" }}>{loadError}</p>
      ) : !status ? (
        <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>Checking…</p>
      ) : !status.enabled ? (
        <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
          Facial recognition is turned off in Settings.
        </p>
      ) : (
        <>
          <p className="text-sm text-[#5B6470] mb-4" style={{ fontFamily: "'Lora', serif" }}>
            {status.enrolled
              ? `A face is saved for this patient${status.enrolled_at ? ` (updated ${new Date(status.enrolled_at).toLocaleDateString()})` : ""}.`
              : "No face is saved yet. Register it so the patient can be verified at check-in."}
          </p>

          {message && (
            <p className="text-sm text-[#1B5E20] mb-3" style={{ fontFamily: "'Lora', serif" }}>{message}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setShowModal(true);
              }}
              className="rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#0A3468] transition-colors"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {status.enrolled ? "Update Face" : "Register Face"}
            </button>

            {canRemove && status.enrolled && (
              <button
                type="button"
                onClick={handleRemove}
                className="rounded-full bg-[#8A3B27] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#742F20] transition-colors"
                style={{ fontFamily: "'Lora', serif" }}
              >
                Remove Face
              </button>
            )}
          </div>
        </>
      )}

      {showModal && <FaceEnrollModal patient={patient} auth={auth} onClose={handleModalClose} />}
    </div>
  );
}