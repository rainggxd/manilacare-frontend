import { LayoutDashboard, FolderOpen, CalendarDays, Stethoscope, BarChart3 } from "lucide-react";
import PortalLayout from "./PortalLayout";

const NAV_SECTIONS = [
  {
    heading: "Overview",
    items: [{ label: "Dashboard", to: "/doctor", icon: LayoutDashboard }],
  },
  {
    heading: "Clinical",
    items: [
      { label: "Patient Records", to: "/doctor/records", icon: FolderOpen },
      { label: "Appointments", to: "/doctor/appointments", icon: CalendarDays },
      { label: "Diagnosis & Prescriptions", to: "/doctor/diagnosis", icon: Stethoscope },
    ],
  },
  {
    heading: "Analytics",
    items: [{ label: "Reports", to: "/doctor/reports", icon: BarChart3 }],
  },
];

export default function DoctorLayout({ auth, onLogout }) {
  return (
    <PortalLayout auth={auth} onLogout={onLogout} portalName="Doctor Portal" homePath="/doctor" sections={NAV_SECTIONS} />
  );
}
