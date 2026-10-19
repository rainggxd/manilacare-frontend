import LegalLayout from "../../components/LegalLayout";
import { LEGAL_HEALTH_CENTERS } from "../../utils/legalInfo";

const summary = {
  title: "The short version",
  items: [
    "ManilaCare keeps your health records in one place so the health center staff do not need paper files.",
    "Only the staff of your own health center can open your record. Doctors see it to treat you.",
    "At registration we scan your face. We save a list of numbers made from your face, not your photo. It is only used to check who you are at check-in.",
    "You can ask the health center to remove your face data at any time. You can still use your QR code and be served.",
    "We do not sell your data and we do not send your face to any cloud service.",
  ],
};

const sections = [
  {
    id: "about-system",
    title: "About ManilaCare and this policy",
    paragraphs: [
      `ManilaCare is a web-based system for patient records, appointments, QR code check-in and face verification. It was built as a capstone project for ${LEGAL_HEALTH_CENTERS} in Tondo, Manila. It is not an official system of the Department of Health or the City Health Office.`,
      "This policy explains what personal data the system collects, why, who can see it, how it is protected, and what you can do about it. It follows the Data Privacy Act of 2012 (Republic Act No. 10173).",
    ],
  },
  {
    id: "data-we-collect",
    title: "What we collect",
    bullets: [
      "Identity and contact details: full name, date of birth, sex, civil status, address, barangay number, contact number, email address, religion, and educational attainment.",
      "Family and benefit numbers: family number, PhilHealth details, 4Ps number, and OSCA or PWD number, when you give them.",
      "Health information: height and weight, diagnoses, medical notes, prescriptions, immunization records, and newborn or OB history where it applies.",
      "Visit data: appointments, check-in time, queue number, and visit status.",
      "Account data: your email and a scrambled form of your password. We never store the password itself.",
      "QR code: a random code linked to your record. Your name or ID number is not written inside it.",
      "Face data: a face template, explained in the next section.",
      "Activity records: a log of who did what in the system and when, such as registering a patient or opening a record.",
    ],
  },
  {
    id: "face-data",
    title: "Face data",
    paragraphs: [
      "Face data is handled with extra care, so it has its own section.",
    ],
    bullets: [
      "What we save: when you register, the camera takes a few frames. Your browser turns them into a list of 128 numbers called a face template. The photo itself is not saved.",
      "What it is used for: to confirm at check-in that the person in front of the staff is the patient on the QR code, or to help staff find your record from your face. We use it for nothing else.",
      "How the check works: the saved numbers are compared with the numbers from the new scan on our own server. The result is a match or no match. The system only suggests, and the staff member makes the final decision.",
      "It can be wrong: poor light, a new hairstyle, glasses, or a mask can cause a wrong result. If that happens, the staff can confirm your identity another way. This is recorded in the activity log.",
      "No cloud AI: the face models run in your browser from files on our own server. No image or template is sent to an outside face recognition service.",
      "Who can use it: only Admin and Staff accounts of your own health center. The template is never shown on screen, and patients and doctors cannot open it.",
      "Your consent: we ask for your permission in a separate checkbox before the camera is used. Face registration is part of registration while the feature is turned on in the system. If you do not agree, speak to the health center staff about your options.",
      "Removing it: ask the Admin of your health center to remove your face data. They delete the template and it stops working right away. You can register your face again later if you change your mind.",
      "Children: a parent or guardian must agree before a child's face is scanned.",
    ],
  },
  {
    id: "how-we-use-data",
    title: "Why we use your data",
    bullets: [
      "To keep your medical records and show them to the staff and doctors who treat you.",
      "To book, approve, and manage appointments and the daily queue.",
      "To check you in using your QR code and, if you agreed, your face.",
      "To let doctors write diagnoses, notes and prescriptions.",
      "To produce counts and reports, such as how many patients have a certain illness, so the health center can spot an outbreak. These reports show totals, not names.",
      "To protect the system and find misuse, using the activity log.",
    ],
    after: "We process your health information to give you medical care, and your face data only with your consent.",
  },
  {
    id: "who-can-see",
    title: "Who can see your data",
    table: {
      head: ["Role", "What they can see and do"],
      rows: [
        ["Patient", "Your own record, appointments, prescriptions, and visit history. Nobody else's."],
        ["Staff", "Patients of their own health center, for registration, check-in, appointments and the queue. They can enroll or verify a face."],
        ["Doctor", "Patients of their own health center, to write diagnoses, medical notes and prescriptions."],
        ["Admin", "Everything in their own health center: patients, QR codes, user accounts, reports, the activity log, backups of that center, and face removal."],
        ["Master Admin", "Health centers, user accounts, system settings, system-wide counts, and a full system backup, which contains all records."],
      ],
    },
    after: "Nobody can open a record from another health center unless they are the Master Admin working with a backup. Every access to a record leaves a trace in the activity log.",
  },
  {
    id: "sharing",
    title: "Sharing and outside services",
    paragraphs: [
      "We do not sell your data. We do not share it with advertisers or for commercial purposes. ManilaCare is not connected to any government database.",
      "One outside service is used: verification codes and password reset codes are sent by email through Gmail (Google). Only your email address and the code go through it. No health information or face data is sent.",
      "We may have to release information if a law or a court order requires it.",
    ],
  },
  {
    id: "security",
    title: "How we protect your data",
    bullets: [
      "Passwords are stored as one-way hashes (bcrypt).",
      "After 5 wrong password attempts, the account is locked for 15 minutes.",
      "A login lasts 1 hour at most, and it ends by itself after 15 minutes without activity.",
      "Role-based access: each account can only use the functions of its role, and only for its own health center.",
      "Each QR code holds a long random code, so it cannot be used to guess other patients.",
      "An activity log records important actions, including face enrollment, verification, mismatch, override, and removal. The log cannot be turned off.",
      "The system is meant to be used over a secured connection (HTTPS) once it runs beyond a single computer.",
    ],
    after: "No system is completely safe. Backup files contain full records and face templates and are not encrypted, so the administrators must keep them in a safe place and delete copies they no longer need.",
  },
  {
    id: "retention",
    title: "How long we keep data",
    paragraphs: [
      "The health center decides how long records are kept, following the rules that apply to it. ManilaCare does not delete records by itself.",
      "When an Admin deletes a patient, the system permanently removes the patient's record, QR code, face data, appointments, visits, medical records, prescriptions, immunization records and OB history. Activity log entries stay, because they show what happened in the system. Copies inside backup files stay until those files are deleted.",
    ],
  },
  {
    id: "your-rights",
    title: "Your rights",
    paragraphs: ["Under the Data Privacy Act you have the right to:"],
    bullets: [
      "be informed about how your data is collected and used,",
      "access your data,",
      "object to the processing of your data,",
      "correct wrong or old data,",
      "ask for your data to be removed or blocked,",
      "get a copy of your data in a usable format,",
      "claim damages if your data was misused, and",
      "file a complaint with the National Privacy Commission (privacy.gov.ph).",
    ],
    after: "You can also take back your consent, including your consent for face data, at any time. Ask the staff at your health center. They may ask you to prove who you are first. Some medical records may have to be kept by the health center even if you ask to remove them, and you will be told if that is the case.",
  },
  {
    id: "breach",
    title: "If something goes wrong",
    paragraphs: [
      "If a data breach could harm you, the health center and the ManilaCare team will tell the people affected and report it to the National Privacy Commission as the law requires.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    paragraphs: [
      "If we change this policy, we will update the version and date at the top of this page. If the change affects how your face data is used, we will ask for your consent again.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="Data Privacy Act of 2012 (RA 10173)"
      switchTo={{ to: "/terms", label: "Terms and Conditions" }}
      summary={summary}
      sections={sections}
    />
  );
}