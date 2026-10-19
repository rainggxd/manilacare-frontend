import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";

import backgroundImg from "../assets/BACKGROUND_CAPSTONE.jpg";
import manilaLogo from "../assets/MANILA_LOGO_CAPSTONE.jpg";

const NAV_SECTIONS = [
  {
    heading: "OVERVIEW",
    items: [{ label: "Dashboard", to: "/doctor" }],
  },
    {
    heading: "CLINICAL",
    items: [
      { label: "Patient Records", to: "/doctor/records" },
      { label: "Appointments", to: "/doctor/appointments" },
      { label: "Diagnosis & Prescriptions", to: "/doctor/diagnosis" },
    ],
  },
  {
    heading: "ANALYTICS",
    items: [{ label: "Reports", to: "/doctor/reports" }],
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

export default function DoctorLayout({ auth, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth?.user;

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
                {user?.role ?? "Doctor"}
              </div>
            </div>
          </div>
          <hr className="border-t border-white/30 mt-4" />
        </div>

        <nav className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading}>
              <div className="text-xs tracking-wider text-white/70 mb-2" style={{ fontFamily: "'Lora', serif" }}>
                {section.heading}
              </div>
              <div className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/doctor"}
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