import {
  LayoutDashboard,
  Users,
  UserPlus,
  FolderOpen,
  QrCode,
  CalendarDays,
  Megaphone,
  BarChart3,
  History,
  Building2,
  UserCheck,
  Settings,
} from "lucide-react";
import PortalLayout from "./PortalLayout";

const MASTER = "Master Admin";
const ADMIN = "Admin";

// `roles` says who sees each menu item.
//  - Master Admin: dashboard, users, announcements, activity logs, health centers, settings (with backup)
//    (no patient records, those belong to each center's Admin)
//  - Admin: everything about their own health center
const NAV_SECTIONS = [
  {
    heading: "Overview",
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: [MASTER, ADMIN] }],
  },
  {
    heading: "Management",
    items: [
      { label: "User Management", to: "/dashboard/users", icon: Users, roles: [MASTER, ADMIN] },
      { label: "Patient Registration", to: "/dashboard/patients", icon: UserPlus, roles: [ADMIN] },
      { label: "Registration Requests", to: "/dashboard/registration-requests", icon: UserCheck, roles: [ADMIN] },
      { label: "Patient Records", to: "/dashboard/records", icon: FolderOpen, roles: [ADMIN] },
      { label: "QR Code", to: "/dashboard/qr-code", icon: QrCode, roles: [ADMIN] },
      { label: "Appointments", to: "/dashboard/appointments", icon: CalendarDays, roles: [ADMIN] },
      { label: "Announcements", to: "/dashboard/announcements", icon: Megaphone, roles: [MASTER, ADMIN] },
    ],
  },
  {
    heading: "Analytics",
    items: [
      { label: "Reports", to: "/dashboard/reports", icon: BarChart3, roles: [ADMIN] },
      { label: "Activity Logs", to: "/dashboard/activity-logs", icon: History, roles: [MASTER, ADMIN] },
    ],
  },
  {
    heading: "System",
    items: [
      { label: "Health Centers", to: "/dashboard/health-centers", icon: Building2, roles: [MASTER] },
      // Backup & Restore is inside Settings
      { label: "Settings", to: "/dashboard/settings", icon: Settings, roles: [MASTER, ADMIN] },
    ],
  },
];

export default function AdminLayout({ auth, onLogout }) {
  const role = auth?.user?.role;
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);

  return (
    <PortalLayout
      auth={auth}
      onLogout={onLogout}
      portalName={role === MASTER ? "Master Admin" : "Admin Portal"}
      homePath="/dashboard"
      sections={sections}
    />
  );
}
