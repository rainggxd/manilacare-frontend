/**
 * Makes a picture smaller in the browser before it is uploaded.
 * Big phone photos (5 MB or more) become a JPEG of about 100-400 KB,
 * so they upload fast and fit in the database.
 *
 * maxSide = longest side in pixels, maxKb = largest size allowed.
 * Returns a data URL like "data:image/jpeg;base64,...".
 */
export const MAX_IMAGE_KB = 750; // the server accepts up to 800 KB

export function resizeImageFile(file, maxSide = 1280, maxKb = MAX_IMAGE_KB) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
      reject(new Error("Please choose a JPG, PNG or WEBP picture."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The picture could not be read."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("The picture could not be opened. Please choose another one."));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        // White background so transparent PNGs do not turn black
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Lower the quality step by step until it is small enough
        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length * 0.75 > maxKb * 1024 && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        if (dataUrl.length * 0.75 > maxKb * 1024) {
          reject(new Error("The picture is too large. Please choose a smaller one."));
          return;
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
