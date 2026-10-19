import LegalLayout from "../../components/LegalLayout";
import { LEGAL_HEALTH_CENTERS } from "../../utils/legalInfo";

const summary = {
  title: "The short version",
  items: [
    "ManilaCare helps keep health records and appointments. It does not give medical advice and it is not for emergencies.",
    "Keep your password and your QR code to yourself.",
    "Face verification is a helper for the staff. It can be wrong, and the staff make the final decision.",
    "Staff and doctors may only open records they need for their work. Everything is logged.",
  ],
};

const sections = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    paragraphs: [
      `By registering or using ManilaCare you agree to these terms and to the Privacy Policy. If you do not agree, please do not use the system. For a child or a person who cannot decide for themselves, a parent or guardian agrees on their behalf.`,
      `ManilaCare was built as a capstone project for ${LEGAL_HEALTH_CENTERS} in Tondo, Manila. It is not an official system of the Department of Health or the City Health Office.`,
    ],
  },
  {
    id: "accounts",
    title: "Accounts and your QR code",
    bullets: [
      "Accounts are created by the health center. Patients are registered by the staff.",
      "If the staff set your first password, change it the first time you log in.",
      "Do not share your password. You are responsible for what happens under your account. Tell the staff right away if you think someone else used it.",
      "Your QR code is personal. Do not post or share it. If you lose it, ask the Admin for a new one. A new QR code makes the old one stop working.",
      "Patient accounts cannot scan QR codes. Scanning is done by the staff.",
    ],
  },
  {
    id: "permitted-use",
    title: "Allowed use",
    paragraphs: [
      "ManilaCare is for managing health records and appointments at the health centers named above. Commercial use and any other use is not allowed.",
    ],
    bullets: [
      "Do not try to get into accounts, records or functions that are not yours.",
      "Do not copy, sell, post or share patient information outside your work.",
      "Do not upload false information or harmful files.",
    ],
  },
  {
    id: "staff-duties",
    title: "Rules for staff, doctors and administrators",
    bullets: [
      "Open a patient's record only when your work needs it.",
      "Keep patient information confidential, also after you leave your role.",
      "Do not take photos or screenshots of patient records or of the face scan screen.",
      "Log out when you leave the computer. The system also logs you out after 15 minutes without activity.",
      "Your actions are recorded in the activity log. Misuse can lead to a deactivated account and to action under the Data Privacy Act.",
    ],
  },
  {
    id: "accuracy",
    title: "Accurate information",
    paragraphs: [
      "Give true and complete information when you register and when you are asked. Wrong health information can lead to wrong care. Tell the staff when your details change.",
    ],
  },
  {
    id: "face-verification",
    title: "Face verification",
    paragraphs: [
      "These terms apply to the face scan used at registration and at check-in. The Privacy Policy explains how face data is stored and protected.",
    ],
    bullets: [
      "Consent: the camera is only used after you tick the face consent box. For a child, a parent or guardian gives the consent.",
      "Purpose: your face is used only to confirm who you are at check-in and to help staff find your record. It is not used for any other purpose, and it is not used to judge or track you.",
      "A helper, not a judge: the system compares numbers and can make mistakes. A wrong or failed result is not a reason to deny you care. The staff can confirm your identity another way, and the choice is recorded in the activity log.",
      "Be honest: do not use a photo, a screen, or another person's face to pass the check.",
      "Staff limits: staff may use the face scan only for the patient being served. They must not scan people for any other reason.",
      "Changes in your face: if your face changes a lot, ask the staff to register it again.",
      "Removal: you can ask the Admin of your health center to remove your face data at any time. Check-in with your QR code continues to work.",
    ],
  },
  {
    id: "appointments",
    title: "Appointments and the queue",
    paragraphs: [
      "An appointment request is not confirmed until a doctor or the staff approve it. Check the status in your account. The queue number is given at check-in and the health center may change the order for urgent cases.",
    ],
  },
  {
    id: "medical-disclaimer",
    title: "Medical disclaimer",
    paragraphs: [
      "ManilaCare is a record keeping tool. It does not replace the advice, diagnosis or treatment of a qualified health professional. Do not use it for emergencies. In an emergency, go to the nearest hospital or call 911.",
    ],
  },
  {
    id: "availability",
    title: "Availability and backups",
    paragraphs: [
      "The system may be unavailable at times, for example during maintenance or when the computer or network has a problem. The administrators make backups, but we cannot promise that no data will ever be lost.",
    ],
  },
  {
    id: "liability",
    title: "Limits of responsibility",
    paragraphs: [
      "ManilaCare is a student capstone project. To the extent the law allows, the project team is not responsible for health outcomes based only on information in the system, or for losses caused by events outside its control. This does not take away any right you have under the Data Privacy Act or other laws.",
    ],
  },
  {
    id: "suspension",
    title: "Suspension of accounts",
    paragraphs: [
      "An account can be deactivated if its owner breaks these terms or puts the system or other people at risk. Patient records are not deleted because an account was deactivated.",
    ],
  },
  {
    id: "changes",
    title: "Changes and governing law",
    paragraphs: [
      "We may update these terms. The version and date at the top of the page will change when we do. Using the system after an update means you accept the new version. If a change affects your face data, we will ask for your consent again.",
      "These terms are governed by the laws of the Republic of the Philippines.",
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <LegalLayout
      title="Terms and Conditions"
      subtitle="ManilaCare Health Information System"
      switchTo={{ to: "/privacy", label: "Privacy Policy" }}
      summary={summary}
      sections={sections}
    />
  );
}