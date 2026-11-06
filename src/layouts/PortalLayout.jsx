import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import manilaLogo from "../assets/MANILA_LOGO_CAPSTONE.jpg";
import { healthCenterName } from "../utils/healthCenters";
import { useConfirm } from "../components/ConfirmDialog";

/**
 * Shared layout of every portal (Admin, Staff, Nurse, Doctor, Patient).
 *
 *  - Left: white sidebar with the menu (icons + labels). On small screens
 *    it slides in from the left when the Menu button is pressed.
 *  - Top: page title, today's date, and the logged-in user.
 *  - Middle: the current page (<Outlet />).
 *
 * Props:
 *  - auth, onLogout
 *  - portalName: e.g. "Staff Portal"
 *  - homePath: e.g. "/staff" (the Dashboard link, matched exactly)
 *  - sections: [{ heading, items: [{ label, to, icon }] }]
 */
export default function PortalLayout({ auth, onLogout, portalName, homePath, sections }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const confirm = useConfirm();
  const user = auth?.user;
  const centerName = user?.health_center_id ? healthCenterName(user.health_center_id) : "";

  const pageTitle = findPageTitle(sections, location.pathname, homePath);
  const initials = (user?.full_name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  async function handleLogout() {
    const ok = await confirm({ title: "Log out?", message: "You will need to sign in again to use ManilaCare.", confirmText: "Yes, log out" });
    if (!ok) return;
    onLogout?.();
    navigate("/login");
  }

  const sidebar = (
    <div className="h-full flex flex-col bg-white">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-[#E3E8EF]">
        <div className="flex items-center gap-3">
          <img src={manilaLogo} alt="Lungsod ng Maynila seal" className="h-11 w-11 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="text-xl text-[#0B3D7A] leading-tight" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
              ManilaCare
            </p>
            <p className="text-xs text-[#5B6470]">{portalName}</p>
          </div>
        </div>
        {centerName && (
          <p className="mt-3 rounded-lg bg-[#F4F6F9] px-3 py-2 text-xs text-[#1B5E20] font-semibold">{centerName}</p>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main menu">
        {sections.map((section) => (
          <div key={section.heading} className="mb-5">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">{section.heading}</p>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === homePath}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors outline-none ${
                          isActive
                            ? "bg-[#0B3D7A] text-white font-semibold shadow-[0_6px_16px_-8px_rgba(11,61,122,0.7)]"
                            : "text-[#3D4653] hover:bg-[#EEF4FB] hover:text-[#0B3D7A]"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {Icon && (
                            <Icon
                              size={20}
                              className={`shrink-0 transition-transform duration-200 ${
                                isActive ? "text-white" : "text-[#8A94A6] group-hover:text-[#0B3D7A] group-hover:translate-x-0.5"
                              }`}
                            />
                          )}
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t border-[#E3E8EF] p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="h-9 w-9 shrink-0 rounded-full bg-[#0B3D7A] text-white text-sm font-bold flex items-center justify-center">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">{user?.full_name ?? "User"}</p>
            <p className="text-xs text-[#5B6470]">{user?.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#B3261E]/30 px-4 py-2 text-sm font-semibold text-[#B3261E] hover:bg-[#B3261E] hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex bg-[#F4F6F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar: fixed on large screens */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[#E3E8EF] sticky top-0 h-screen">{sidebar}</aside>

      {/* Sidebar: slide-in on small screens */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[85%] h-full shadow-xl mc-pop">{sidebar}</div>
          <button type="button" className="flex-1 bg-black/40 mc-fade" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#E3E8EF]">
          <div className="h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="lg:hidden rounded-lg p-2 hover:bg-[#F4F6F9]"
                aria-label="Open menu"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#8A94A6]">{portalName}</p>
                <h1 className="text-lg text-[#1A1A1A] font-semibold truncate">{pageTitle}</h1>
              </div>
            </div>
            <p className="hidden md:block text-sm text-[#5B6470]">{today}</p>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8">
          {/* key = page address, so each page fades in when it opens */}
          <div key={location.pathname} className="max-w-7xl mx-auto mc-page">
            <Outlet context={{ auth }} />
          </div>
        </main>
      </div>
    </div>
  );
}

function findPageTitle(sections, pathname, homePath) {
  let best = null;
  for (const section of sections) {
    for (const item of section.items) {
      const matches = item.to === homePath ? pathname === homePath : pathname === item.to || pathname.startsWith(item.to + "/");
      if (matches && (!best || item.to.length > best.to.length)) best = item;
    }
  }
  return best?.label ?? "Dashboard";
}
