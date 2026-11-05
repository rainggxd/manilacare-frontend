import { LayoutDashboard, UserCheck, QrCode, ScanFace, CalendarDays, FolderOpen } from "lucide-react";

/**
 * Front desk menu. Used by the Staff portal (/staff) and the Nurse
 * portal (/nurse); both do check-in, queue, appointments and records.
 */
export function frontDeskSections(base) {
  return [
    {
      heading: "Overview",
      items: [{ label: "Dashboard", to: base, icon: LayoutDashboard }],
    },
    {
      heading: "Front Desk",
      items: [
        { label: "Patient Check-In", to: `${base}/check-in`, icon: UserCheck },
        { label: "Scan QR Code", to: `${base}/scan-qr`, icon: QrCode },
        { label: "Scan Patient", to: `${base}/scan-patient`, icon: ScanFace },
        { label: "Appointments", to: `${base}/appointments`, icon: CalendarDays },
        { label: "Patient Records", to: `${base}/records`, icon: FolderOpen },
      ],
    },
  ];
}
