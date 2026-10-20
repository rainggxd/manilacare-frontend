// Text shown on the public landing page (before login).
// Edit the values here. Keep the quotes around each text.

export const KALINGA_TITLE = "Kalinga sa Maynila";

export const KALINGA_TAGLINE =
  "Serbisyong pangkalusugan para sa bawat Manileño, mas mabilis at mas maayos sa tulong ng ManilaCare.";

export const VISION =
  "To be a strong and dominant force in the health care system of Manila by providing high standard of health care services.";

export const MISSION =
  "To conduct health care services in the highest form of professionalism guided by the high standards of competence, integrity and excellence.";

// Paste the Manila Health Department Quality Policy here.
// Leave it as an empty string "" to hide this section.
export const QUALITY_POLICY = "";

// "About Us" text about ManilaCare.
export const ABOUT_MANILACARE =
  "ManilaCare is a web-based health record system made for two barangay health centers in Tondo, Manila. It replaces paper records with one central record for each patient. Patients are identified with a QR code and a face scan, appointments are booked and tracked online, and doctors keep check-up notes and prescriptions in one place.";

// Details of each health center, used by "About Us" and "Contact Us".
// Leave a value as "" or [] if it is not known yet; empty values are hidden.
export const HEALTH_CENTER_INFO = [
  {
    name: "Bo. Magsaysay Health Center",
    about: "A health center of the Manila Health Department serving the residents of Bo. Magsaysay, Tondo.",
    address: "300 Herbosa Street, Tondo, Manila",
    phones: [],
    email: "bomag.mhd@gmail.com",
    hours: "",
    services: [],
  },
  {
    name: "Foreshore Tondo Health Center",
    about:
      "Also known as the Tondo Foreshore Super Health Center and Lying-in Clinic. It serves the Tondo Foreshore community and was built with SM Foundation, Inc. and the City Government of Manila.",
    address: "Pacheco Street corner Sta. Fe Street, Zone 9, Tondo, Manila",
    phones: ["(02) 8254 5760", "(02) 8531 3045"],
    email: "",
    hours: "Monday to Saturday, 8:00 AM to 5:00 PM",
    services: [
      "General medical consultation",
      "Dental care",
      "Immunization",
      "Lying-in and postpartum care",
      "Pharmacy",
      "Breastfeeding station",
      "HIV-AIDS treatment hub",
    ],
  },
];
