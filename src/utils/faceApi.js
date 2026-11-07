// Small helper around face-api.js (the @vladmandic/face-api build, which is
// the maintained version with the same API and ships its own model files).
//
// All work happens in the browser. The models are loaded from /models
// (public/models), so no internet is needed. Only 128 numbers per face are
// sent to the server, never a photo.

// face-api.js is big (about 2 MB), so it is only downloaded the first time a
// camera page needs it. The landing page and the login page open faster,
// especially on a phone.
let faceapi = null;
async function lib() {
  if (!faceapi) faceapi = await import("@vladmandic/face-api");
  return faceapi;
}

const MODEL_URL = "/models";

let modelsPromise = null;

/** Loads the three models once. Safe to call many times. */
export function loadFaceModels() {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      await lib();
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
  await lib();
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
// ---------------------------------------------------------------------------
// Liveness check ("is this a real person and not a printed photo?")
//
// The patient is asked to do one simple action in front of the camera:
//   - "blink": close the eyes slowly, then open them again
//   - "turn":  turn the head a little to the left and to the right
// A printed photo or a picture on a phone cannot do these, so a match
// is only accepted after the action is seen. It uses the same 68 face
// points (landmarks) that face-api.js already finds, so no new model
// is needed.
// ---------------------------------------------------------------------------

const LIVE_OPTIONS = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Eye Aspect Ratio: about 0.3 when the eye is open, near 0.1 when closed. */
function eyeAspectRatio(eye) {
  // eye = 6 points around one eye
  return (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2 * dist(eye[0], eye[3]));
}

/**
 * Reads one frame for the liveness check.
 * Returns { status, ear, turn } where
 *   ear  = how open the eyes are (average of both eyes)
 *   turn = where the nose is between the two sides of the face
 *          (0.5 = looking straight, lower or higher = head turned)
 */
export async function readLiveFrame(video) {
  await lib();
  const faces = await faceapi.detectAllFaces(video, LIVE_OPTIONS()).withFaceLandmarks();
  if (faces.length === 0) return { status: "none" };
  if (faces.length > 1) return { status: "multiple" };

  const points = faces[0].landmarks.positions;
  const minWidth = (video.videoWidth || 640) * MIN_FACE_RATIO * 0.8;
  if (faces[0].detection.box.width < minWidth) return { status: "small" };

  const ear = (eyeAspectRatio(points.slice(36, 42)) + eyeAspectRatio(points.slice(42, 48))) / 2;
  const left = points[0].x; // side of the face (jaw start)
  const right = points[16].x; // other side of the face (jaw end)
  const nose = points[30].x; // tip of the nose
  const turn = (nose - left) / Math.max(1, right - left);

  return { status: "ok", ear, turn };
}

/**
 * The steps of the liveness check (like the face check of e-wallet apps):
 *   1. look straight at the camera
 *   2. turn the head to the LEFT
 *   3. turn the head to the RIGHT
 *   4. look straight again (the face is read at this point)
 * A photo, even one on a phone that is moved around, cannot turn its head,
 * so it cannot finish steps 2 and 3.
 *
 * "turn" from readLiveFrame() goes UP when the person turns to THEIR left
 * (the nose moves to the right side of the camera picture) and DOWN when
 * they turn to their right. The preview is shown like a mirror, so on the
 * screen the person sees themselves move the same way as the arrow.
 */
export const LIVENESS_STEPS = [
  { key: "center", title: "Look straight at the camera", tagalog: "Tumingin nang diretso sa camera" },
  { key: "left", title: "Slowly turn your head to the LEFT", tagalog: "Dahan-dahang lumingon sa KALIWA" },
  { key: "right", title: "Now turn your head to the RIGHT", tagalog: "Ngayon, lumingon sa KANAN" },
  { key: "front", title: "Look straight again and hold still", tagalog: "Tumingin ulit nang diretso at huwag gumalaw" },
];

const TURN_NEEDED = 0.12; // how far the nose must move from the center
const HOLD_FRAMES = 2; // the position must be seen in this many frames in a row
const LOST_LIMIT_MS = 1500; // if the face is gone longer than this, start again

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs the 4 steps. onStep({ index, step, hint }) is called whenever the
 * step or the tip changes. Resolves when all steps are done; throws an
 * Error with a readable message after the time limit.
 */
export async function runLivenessCheck(video, onStep, timeoutMs = 30000, readFrame = readLiveFrame) {
  const started = Date.now();
  let index = 0;
  let center = null;
  const centerSamples = [];
  let hold = 0;
  let lostSince = null;

  const report = (hint = "") => onStep?.({ index, step: LIVENESS_STEPS[index], hint });
  report();

  while (Date.now() - started < timeoutMs) {
    const frame = await readFrame(video);

    if (frame.status !== "ok") {
      if (lostSince === null) lostSince = Date.now();
      if (Date.now() - lostSince > LOST_LIMIT_MS && index > 0) {
        // The face left the camera: start again so a photo cannot be swapped in
        index = 0;
        center = null;
        centerSamples.length = 0;
        hold = 0;
        report("The face was lost. Let us start again.");
      } else {
        report(STATUS_MESSAGES[frame.status] || "Look at the camera.");
      }
      await sleep(80);
      continue;
    }
    lostSince = null;

    const step = LIVENESS_STEPS[index].key;

    if (step === "center") {
      // Learn where "straight" is for this person (median of a few frames)
      if (frame.turn > 0.3 && frame.turn < 0.7) {
        centerSamples.push(frame.turn);
        if (centerSamples.length >= 4) {
          const sorted = [...centerSamples].sort((a, b) => a - b);
          center = sorted[Math.floor(sorted.length / 2)];
          index = 1;
          hold = 0;
          report();
        } else {
          report("Hold still…");
        }
      } else {
        centerSamples.length = 0;
        report("Face the camera directly.");
      }
    } else if (step === "left" || step === "right") {
      const moved = step === "left" ? frame.turn - center : center - frame.turn;
      const wrongWay = -moved > TURN_NEEDED;
      if (moved > TURN_NEEDED) {
        hold += 1;
        if (hold >= HOLD_FRAMES) {
          index += 1;
          hold = 0;
          report("Good!");
        }
      } else {
        hold = 0;
        if (wrongWay) report(step === "left" ? "Other side: turn to your LEFT." : "Other side: turn to your RIGHT.");
        else if (moved > TURN_NEEDED / 3) report("A little more…");
        else report();
      }
    } else {
      // front: back to the center
      if (Math.abs(frame.turn - center) < TURN_NEEDED / 2) {
        hold += 1;
        if (hold >= HOLD_FRAMES) {
          onStep?.({ index: LIVENESS_STEPS.length, step: LIVENESS_STEPS[index], hint: "Done!" });
          return true;
        }
      } else {
        hold = 0;
        report();
      }
    }

    await sleep(80);
  }

  throw new Error(
    "The face check was not finished in time. Please try again: follow the arrow and turn your head slowly to the left, then to the right."
  );
}
