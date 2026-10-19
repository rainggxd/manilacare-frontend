import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";

import backgroundImg from "../assets/BACKGROUND_CAPSTONE.jpg";
import manilaLogo from "../assets/MANILA_LOGO_CAPSTONE.jpg";
import { healthCenterName } from "../utils/healthCenters";

const MASTER = "Master Admin";
const ADMIN = "Admin";

// `roles` says who sees each menu item.
//  - Master Admin: dashboard, users, health centers, backup, settings
//    (no patient records, those belong to each center's Admin)
//  - Admin: everything about their own health center
const NAV_SECTIONS = [
  {
    heading: "OVERVIEW",
    items: [{ label: "Dashboard", to: "/dashboard", roles: [MASTER, ADMIN] }],
  },
  {
    heading: "MANAGEMENT",
    items: [
      { label: "User Management", to: "/dashboard/users", roles: [MASTER, ADMIN] },
      { label: "Patient Registration", to: "/dashboard/patients", roles: [ADMIN] },
      { label: "Patient Records", to: "/dashboard/records", roles: [ADMIN] },
      { label: "QR Code", to: "/dashboard/qr-code", roles: [ADMIN] },
      { label: "Appointments", to: "/dashboard/appointments", roles: [ADMIN] },
    ],
  },
  {
    heading: "ANALYTICS",
    items: [
      { label: "Reports", to: "/dashboard/reports", roles: [ADMIN] },
      { label: "Activity Logs", to: "/dashboard/activity-logs", roles: [ADMIN] },
    ],
  },
  {
    heading: "SYSTEM",
    items: [
      { label: "Health Centers", to: "/dashboard/health-centers", roles: [MASTER] },
            { label: "Backup & Restore", to: "/dashboard/backup-restore", roles: [MASTER, ADMIN] },
      { label: "Settings", to: "/dashboard/settings", roles: [MASTER] },
    ],
  },
];

function getPageTitle(pathname) {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (pathname === item.to || pathname.startsWith(item.to + "/")) {
        return item.label;
      }
    }
  }
  return "Dashboard";
}

export default function AdminLayout({ auth, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth?.user;
  const isMaster = user?.role === MASTER;
  const centerName = user?.health_center_id ? healthCenterName(user.health_center_id) : "";

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(user?.role)),
  })).filter((section) => section.items.length > 0);

  const handleLogout = () => {
    onLogout?.();
    navigate("/login");
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F7F5F1]">
      {/* Sidebar */}
      <aside
        className="w-[320px] shrink-0 flex flex-col text-white relative"
        style={{
          backgroundImage: `linear-gradient(rgba(11,61,122,0.92), rgba(11,61,122,0.92)), url(${backgroundImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="px-6 pt-8 pb-5">
          <div className="flex items-center gap-3 mb-1">
            <img src={manilaLogo} alt="Lungsod ng Maynila seal" className="h-14 w-14 rounded-full object-cover" />
            <div>
              <div className="text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                ManilaCare
              </div>
              <div className="text-white/80 text-sm" style={{ fontFamily: "'Lora', serif" }}>
                {isMaster ? "Master Admin" : "Admin"}
              </div>
              {!isMaster && centerName && (
                <div className="text-white/60 text-xs" style={{ fontFamily: "'Lora', serif" }}>
                  {centerName}
                </div>
              )}
            </div>
          </div>
          <hr className="border-t border-white/30 mt-4" />
        </div>

        <nav className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.heading}>
              <div className="text-xs tracking-wider text-white/70 mb-2" style={{ fontFamily: "'Lora', serif" }}>
                {section.heading}
              </div>
              <div className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/dashboard"}
                    className={({ isActive }) =>
                      `rounded-full px-5 py-2.5 text-center text-sm transition-all duration-200 ease-out active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                        isActive
                          ? "bg-[#0B3D7A] text-white font-semibold shadow-md shadow-black/20"
                          : "bg-white text-[#1B5E20] hover:bg-[#EAF3EA] hover:shadow-sm"
                      }`
                    }
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-6 pb-8">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-full bg-[#B3261E] text-white px-5 py-2.5 text-sm font-semibold transition-all duration-200 ease-out hover:bg-[#96201A] active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            style={{ fontFamily: "'Lora', serif" }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">

        <main className="flex-1 overflow-y-auto p-8">
          <Outlet context={{ auth }} />
        </main>
      </div>
    </div>
  );
}