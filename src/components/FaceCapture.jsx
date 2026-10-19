import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { captureDescriptor, checkFrame, FRAME_HINTS, loadFaceModels } from "../utils/faceApi";

/**
 * Camera preview with a capture button.
 * When the button is pressed it reads the face and calls
 * onCaptured(descriptor), where descriptor is an array of 128 numbers.
 *
 * Props:
 *   onCaptured  - async function(descriptor)
 *   samples     - how many good frames to average (default 3)
 *   buttonLabel - text on the button
 *   disabled    - disable the button from the outside
 */
export default function FaceCapture({ onCaptured, samples = 3, buttonLabel = "Capture Face", disabled = false }) {
  const videoRef = useRef(null);
  const capturingRef = useRef(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [modelsReady, setModelsReady] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [hint, setHint] = useState("");
  const [hintOk, setHintOk] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState("");

  // 1) Start the camera
  useEffect(() => {
    let stream = null;
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
        setCameraError("The camera only works on localhost or a secure (HTTPS) address.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setCameraReady(true);
        }
      } catch (err) {
        setCameraError(
          err?.name === "NotAllowedError"
            ? "Camera permission was denied. Please allow camera access and try again."
            : "Unable to open the camera. Make sure it is connected and not used by another app."
        );
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 2) Load the face models
  useEffect(() => {
    let cancelled = false;
    loadFaceModels()
      .then(() => {
        if (!cancelled) setModelsReady(true);
      })
      .catch(() => {
        if (!cancelled) setModelsError("The face models could not be loaded. Check that public/models has the model files.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 3) Show live tips (face found, too far, more than one face...)
  useEffect(() => {
    if (!cameraReady || !modelsReady) return undefined;

    let busy = false;
    const timer = setInterval(async () => {
      if (busy || capturingRef.current || !videoRef.current) return;
      busy = true;
      try {
        const result = await checkFrame(videoRef.current, false);
        setHint(FRAME_HINTS[result.status] || "");
        setHintOk(result.status === "ok");
      } catch (_) {
        // ignore a single failed frame
      } finally {
        busy = false;
      }
    }, 700);

    return () => clearInterval(timer);
  }, [cameraReady, modelsReady]);

  async function handleCapture() {
    if (capturingRef.current || !videoRef.current) return;
    capturingRef.current = true;
    setIsCapturing(true);
    setCaptureError("");
    try {
      const descriptor = await captureDescriptor(videoRef.current, samples);
      await onCaptured(descriptor);
    } catch (err) {
      setCaptureError(err?.message || "Could not read the face. Please try again.");
    } finally {
      capturingRef.current = false;
      setIsCapturing(false);
    }
  }

  const problem = cameraError || modelsError;
  const waiting = !problem && (!cameraReady || !modelsReady);

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] max-w-md mx-auto">
        {/* mirrored so it feels like a mirror */}
        <video ref={videoRef} muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />

        {(problem || waiting) && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <p className="text-sm text-white/90" style={{ fontFamily: "'Lora', serif" }}>
              {problem || (!cameraReady ? "Starting the camera…" : "Loading face models…")}
            </p>
          </div>
        )}
      </div>

      {!problem && cameraReady && modelsReady && hint && (
        <p
          className={`text-sm text-center mt-3 ${hintOk ? "text-[#1B5E20]" : "text-[#5B6470]"}`}
          style={{ fontFamily: "'Lora', serif" }}
        >
          {hint}
        </p>
      )}

      {captureError && (
        <p role="alert" className="text-sm text-center text-[#8A3B27] mt-3" style={{ fontFamily: "'Lora', serif" }}>
          {captureError}
        </p>
      )}

      <div className="flex justify-center mt-4">
        <button
          type="button"
          onClick={handleCapture}
          disabled={Boolean(problem) || !cameraReady || !modelsReady || isCapturing || disabled}
          className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#0A3468] transition-colors disabled:opacity-60"
          style={{ fontFamily: "'Lora', serif" }}
        >
          <Camera size={16} />
          {isCapturing ? "Reading face…" : buttonLabel}
        </button>
      </div>
    </div>
  );
}