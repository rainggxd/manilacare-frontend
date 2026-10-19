import manilaLogo from "../assets/MANILA_LOGO_CAPSTONE.jpg";
import mhdLogo from "../assets/MHD_LOGO.jpg";
import { healthCenterName } from "./healthCenters";

/**
 * Opens a printable prescription slip in a new window and shows the
 * browser's Print dialog. The doctor can print it or "Save as PDF".
 *
 * printPrescription({ patient, prescriptions, doctorName })
 *  - patient: the patient row (full_name, age, sex, address, health_center_id)
 *  - prescriptions: one or more prescription rows to put on the slip
 *  - doctorName: name of the doctor who is printing
 */

// Escape text so names like "<b>" are shown as text, not as HTML.
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function printPrescription({ patient, prescriptions = [], doctorName = "" }) {
  if (!patient || prescriptions.length === 0) return;

  const centerName = healthCenterName(patient.health_center_id);
  const slipDate = formatDate(prescriptions[0]?.date_prescribed) || formatDate(new Date());
  const doctor = doctorName || prescriptions[0]?.doctor_name || "";
  const origin = window.location.origin;

  const items = prescriptions
    .map(
      (rx, i) => `
      <li>
        <div class="med">${i + 1}. ${esc(rx.medication)}${rx.dosage ? ` <span>${esc(rx.dosage)}</span>` : ""}</div>
        <div class="sig">Sig: ${esc([rx.frequency, rx.duration].filter(Boolean).join(", ") || "As directed")}</div>
        ${rx.instructions ? `<div class="note">${esc(rx.instructions)}</div>` : ""}
      </li>`
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Prescription - ${esc(patient.full_name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; margin: 0; padding: 24px; }
  .slip { max-width: 560px; margin: 0 auto; border: 1px solid #ccc; padding: 24px 28px; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0B3D7A; padding-bottom: 10px; }
  .head img { width: 58px; height: 58px; border-radius: 50%; object-fit: cover; }
  .head .center { text-align: center; flex: 1; padding: 0 8px; }
  .head .center p { margin: 0; font-size: 12px; }
  .head .center h1 { margin: 2px 0; font-size: 17px; color: #0B3D7A; }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 13px; margin: 14px 0; }
  .info .wide { grid-column: span 2; }
  .info b { display: inline-block; min-width: 62px; }
  .rx { font-size: 40px; font-weight: bold; color: #0B3D7A; margin: 4px 0; }
  ol { list-style: none; padding: 0; margin: 0 0 24px; min-height: 160px; }
  li { margin-bottom: 14px; }
  .med { font-size: 15px; font-weight: bold; }
  .med span { font-weight: normal; }
  .sig, .note { font-size: 13px; margin-left: 18px; }
  .note { font-style: italic; color: #444; }
  .sign { margin-top: 30px; margin-left: auto; width: 240px; text-align: center; font-size: 13px; }
  .sign .line { border-top: 1px solid #1a1a1a; padding-top: 4px; font-weight: bold; }
  .foot { margin-top: 18px; font-size: 10px; color: #666; text-align: center; }
  @media print { body { padding: 0; } .slip { border: none; } }
</style>
</head>
<body>
  <div class="slip">
    <div class="head">
      <img src="${origin}${manilaLogo}" alt="">
      <div class="center">
        <p>Republic of the Philippines · City of Manila</p>
        <p>Manila Health Department</p>
        <h1>${esc(centerName)}</h1>
      </div>
      <img src="${origin}${mhdLogo}" alt="">
    </div>

    <div class="info">
      <div class="wide"><b>Name:</b> ${esc(patient.full_name)}</div>
      <div><b>Age:</b> ${esc(patient.age)}</div>
      <div><b>Sex:</b> ${esc(patient.sex)}</div>
      <div class="wide"><b>Address:</b> ${esc(patient.address || "")}</div>
      <div class="wide"><b>Date:</b> ${esc(slipDate)}</div>
    </div>

    <div class="rx">&#8478;</div>
    <ol>${items}</ol>

    <div class="sign">
      <div class="line">Dr. ${esc(doctor)}</div>
      <div>Attending Physician</div>
      <div style="margin-top:6px">License No.: ____________</div>
    </div>

    <p class="foot">Printed from ManilaCare</p>
  </div>
  <script>
    window.onload = function () { window.focus(); window.print(); };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=720,height=900");
  if (!win) {
    alert("Please allow pop-ups for this site so the prescription can be printed.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
