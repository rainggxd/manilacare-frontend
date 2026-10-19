// Small helper around face-api.js (the @vladmandic/face-api build, which is
// the maintained version with the same API and ships its own model files).
//
// All work happens in the browser. The models are loaded from /models
// (public/models), so no internet is needed. Only 128 numbers per face are
// sent to the server, never a photo.

import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "/models";

let modelsPromise = null;

/** Loads the three models once. Safe to call many times. */
export function loadFaceModels() {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      // Use the graphics card when possible, otherwise fall back to the CPU.
      const hasWebgl = await faceapi.tf.setBackend("webgl").catch(() => false);
      if (!hasWebgl) await faceapi.tf.setBackend("cpu");
      await faceapi.tf.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    })().catch((err) => {
      modelsPromise = null; // allow a retry
      throw err;
    });
  }
  return modelsPromise;
}

function detectorOptions() {
  return new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
}

// A face must fill at least this part of the frame width.
const MIN_FACE_RATIO = 0.2;

/**
 * Looks at the current video frame.
 * Returns { status } where status is "none", "multiple", "small" or "ok".
 * When withDescriptor is true and the status is "ok", also returns the
 * 128-number descriptor.
 */
export async function checkFrame(video, withDescriptor = false) {
  const minWidth = (video.videoWidth || 640) * MIN_FACE_RATIO;

  if (!withDescriptor) {
    const boxes = await faceapi.detectAllFaces(video, detectorOptions());
    if (boxes.length === 0) return { status: "none" };
    if (boxes.length > 1) return { status: "multiple" };
    if (boxes[0].box.width < minWidth) return { status: "small" };
    return { status: "ok" };
  }

  const faces = await faceapi
    .detectAllFaces(video, detectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (faces.length === 0) return { status: "none" };
  if (faces.length > 1) return { status: "multiple" };
  if (faces[0].detection.box.width < minWidth) return { status: "small" };

  return { status: "ok", descriptor: Array.from(faces[0].descriptor) };
}

const STATUS_MESSAGES = {
  none: "No face found. Look straight at the camera.",
  multiple: "More than one face is in view. Only the patient should be in front of the camera.",
  small: "Move closer to the camera.",
};

/**
 * Takes several good frames and averages them into one descriptor
 * (an array of 128 numbers). Throws an Error with a readable message
 * when it cannot get enough good frames.
 */
export async function captureDescriptor(video, samples = 3) {
  const collected = [];
  let lastStatus = "none";

  for (let attempt = 0; attempt < 20 && collected.length < samples; attempt++) {
    const result = await checkFrame(video, true);
    lastStatus = result.status;
    if (result.status === "ok") {
      collected.push(result.descriptor);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (collected.length < samples) {
    throw new Error(STATUS_MESSAGES[lastStatus] || "Could not read the face. Please try again.");
  }

  const size = collected[0].length;
  const average = new Array(size).fill(0);
  for (const d of collected) {
    for (let i = 0; i < size; i++) average[i] += d[i] / collected.length;
  }
  return average;
}

export const FRAME_HINTS = {
  ok: "Face detected. Hold still, then press the button.",
  ...STATUS_MESSAGES,
};