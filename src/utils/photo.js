/**
 * Takes a still photo from a playing <video> (the webcam) and returns it
 * as a small square JPEG data URL, e.g. "data:image/jpeg;base64,...".
 * The middle of the frame is used and resized to `size` x `size`
 * pixels, so the saved photo stays small (about 20-40 KB).
 */
export function grabPhoto(video, size = 320) {
  if (!video || !video.videoWidth || !video.videoHeight) return null;

  const side = Math.min(video.videoWidth, video.videoHeight);
  const sx = (video.videoWidth - side) / 2;
  const sy = (video.videoHeight - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Not mirrored: the photo shows the face the way other people see it.
  ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.8);
}
