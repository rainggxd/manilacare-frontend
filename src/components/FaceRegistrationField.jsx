import { useState } from "react";
import { ScanFace } from "lucide-react";
import FaceCapture from "./FaceCapture";

/**
 * Required face step inside the registration form.
 *
 * Props:
 *   descriptor - the captured face (array of 128 numbers) or null
 *   consent    - true when the patient agreed
 *   error      - error text to show (or "")
 *   onConsent(bool), onCaptured(descriptor), onClear()
 */
export default function FaceRegistrationField({ descriptor, consent, error, onConsent, onCaptured, onClear }) {
  const [retaking, setRetaking] = useState(false);
  const captured = Boolean(descriptor) && !retaking;

  async function handleCaptured(d) {
    onCaptured(d);
    setRetaking(false);
  }

  return (
    <div className="mt-8 rounded-2xl bg-white/95 border border-[#1B5E20]/20 shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2">
        <ScanFace size={18} className="text-[#0B3D7A]" />
        <h3 className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Face Registration (required)
        </h3>
      </div>

      <p className="text-sm text-[#5B6470] mb-3" style={{ fontFamily: "'Lora', serif" }}>
        The system saves a set of numbers made from the face, not a photo. It is used to confirm the patient's
        identity at check-in, and it can be removed on request.
      </p>

      <label className="flex items-start gap-2 mb-4 text-sm text-[#1A1A1A]" style={{ fontFamily: "'Lora', serif" }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => onConsent(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#1B5E20] shrink-0"
        />
        <span>The patient agreed to have their face data saved for check-in verification.</span>
      </label>

      {consent && captured && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-[#1B5E20] font-semibold" style={{ fontFamily: "'Lora', serif" }}>
            Face captured.
          </p>
          <button
            type="button"
            onClick={() => {
              onClear();
              setRetaking(true);
            }}
            className="rounded-full bg-[#F7F5F1] text-[#1A1A1A] px-5 py-2 text-sm font-semibold hover:bg-[#EDEAE3] transition-colors"
            style={{ fontFamily: "'Lora', serif" }}
          >
            Retake
          </button>
        </div>
      )}

      {consent && !captured && (
        <FaceCapture samples={3} buttonLabel="Capture Face" onCaptured={handleCaptured} />
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-[#8A3B27] font-semibold">{error}</p>
      )}
    </div>
  );
}