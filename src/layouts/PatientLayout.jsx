import { LayoutDashboard, CalendarDays, Pill, ClipboardList } from "lucide-react";
import PortalLayout from "./PortalLayout";

const NAV_SECTIONS = [
  {
    heading: "My Health",
    items: [
      { label: "Dashboard", to: "/patient", icon: LayoutDashboard },
      { label: "My Personal Record", to: "/patient/record", icon: ClipboardList },
      { label: "My Appointments", to: "/patient/appointments", icon: CalendarDays },
      { label: "My Prescriptions", to: "/patient/prescriptions", icon: Pill },
    ],
  },
];

export default function PatientLayout({ auth, onLogout }) {
  return (
    <PortalLayout auth={auth} onLogout={onLogout} portalName="Patient Portal" homePath="/patient" sections={NAV_SECTIONS} />
  );
}
