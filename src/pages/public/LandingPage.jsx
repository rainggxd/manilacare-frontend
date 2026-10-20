import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Eye,
  Target,
  ShieldCheck,
  MapPin,
  LogIn,
  Phone,
  Mail,
  Clock,
  Stethoscope,
  Menu,
  X,
  CalendarCheck,
  Megaphone,
  HeartPulse,
  Building2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import manilaLogo from "../../assets/MANILA_LOGO_CAPSTONE.jpg";
import mhdLogo from "../../assets/MHD_LOGO.jpg";
import HeroCarousel from "../../components/landing/HeroCarousel";
import AnnouncementModal from "../../components/landing/AnnouncementModal";
import { ANNOUNCEMENT_CATEGORIES, categoryStyle, excerpt, formatPostDate } from "../../utils/announcements";
import {
  KALINGA_TITLE,
  KALINGA_TAGLINE,
  VISION,
  MISSION,
  QUALITY_POLICY,
  ABOUT_MANILACARE,
  HEALTH_CENTER_INFO,
} from "../../utils/landingInfo";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * ManilaCare — Public Landing Page (before login)
 *
 * Sections, top to bottom:
 *  1. Government strip and header with the City of Manila and MHD seals
 *  2. Menu (Home, Announcements, Health Tips, About Us, Contact Us, Login)
 *  3. Disease warning ribbon (only when a disease reaches the warning limit)
 *  4. Slideshow: "Kalinga sa Maynila" + pinned announcements
 *  5. Quick links
 *  6. Announcements (posted by the Admin of each center)
 *  7. Health Tips
 *  8. Mission and Vision, About Us, Contact Us, footer
 *
 * Announcements and warnings come from the public API, so no login is needed.
 * The fixed text (mission, vision, contact details) is in utils/landingInfo.js.
 */

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#announcements", label: "Announcements" },
  { href: "#health-tips", label: "Health Tips" },
  { href: "#about", label: "About Us" },
  { href: "#contact", label: "Contact Us" },
];

const ANNOUNCEMENTS_SHOWN = 6;

export default function LandingPage() {
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [alerts, setAlerts] = useState({ window_days: 30, alerts: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [openPost, setOpenPost] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [postsRes, alertsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/public/announcements`),
        axios.get(`${API_BASE_URL}/public/disease-alerts`),
      ]);
      if (cancelled) return;
      if (postsRes.status === "fulfilled") setPosts(postsRes.value.data?.data ?? []);
      if (alertsRes.status === "fulfilled") setAlerts(alertsRes.value.data?.data ?? { alerts: [] });
      setIsLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Coming from the login page's "About us" / "Contact Us" links (/#about, /#contact)
  useEffect(() => {
    if (!location.hash) return;
    const section = document.getElementById(location.hash.slice(1));
    if (section) section.scrollIntoView({ behavior: "smooth" });
  }, [location.hash]);

  const tips = useMemo(() => posts.filter((p) => p.category === "Health Tip"), [posts]);
  const notices = useMemo(() => posts.filter((p) => p.category !== "Health Tip"), [posts]);
  const pinned = useMemo(() => notices.filter((p) => Number(p.is_pinned) === 1), [notices]);

  const filteredNotices = useMemo(
    () => (filter === "All" ? notices : notices.filter((p) => p.category === filter)),
    [notices, filter]
  );
  const visibleNotices = showAll ? filteredNotices : filteredNotices.slice(0, ANNOUNCEMENTS_SHOWN);

  const closeModal = useCallback(() => setOpenPost(null), []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div id="home" className="min-h-screen w-full bg-white flex flex-col" style={{ fontFamily: "'Lora', serif" }}>
      {/* 1. Government strip */}
      <div className="bg-[#072B57] text-white/80 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-1.5 flex items-center justify-between gap-3">
          <span>Republic of the Philippines · Lungsod ng Maynila</span>
          <span className="hidden sm:inline">{today}</span>
        </div>
      </div>

      {/* Header with seals */}
      <header className="bg-white border-b border-[#0B3D7A]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
          <a href="#home" className="flex items-center gap-3 min-w-0">
            <img src={manilaLogo} alt="City of Manila seal" className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover" />
            <img src={mhdLogo} alt="Manila Health Department logo" className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-[#5B6470]">Manila Health Department</p>
              <p
                className="text-2xl sm:text-3xl text-[#0B3D7A] leading-tight"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
              >
                ManilaCare
              </p>
              <p className="hidden sm:block text-xs text-[#1B5E20]">{KALINGA_TITLE}</p>
            </div>
          </a>
          <Link
            to="/login"
            className="hidden md:inline-flex items-center gap-2 rounded-full bg-[#1B5E20] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#164D1A] transition-colors"
          >
            <LogIn size={16} />
            Login
          </Link>
        </div>
      </header>

      {/* 2. Menu */}
      <nav className="sticky top-0 z-40 bg-[#0B3D7A] text-white shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex items-center justify-between">
          <ul className="hidden md:flex items-center">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="block px-4 py-3 text-sm hover:bg-white/10 transition-colors">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex items-center gap-2 py-3 text-sm"
            aria-expanded={menuOpen}
            aria-label="Open menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
            Menu
          </button>
          <Link to="/login" className="md:hidden inline-flex items-center gap-1.5 rounded-full bg-white text-[#0B3D7A] px-4 py-1.5 text-sm font-bold">
            <LogIn size={14} />
            Login
          </Link>
        </div>
        {menuOpen && (
          <ul className="md:hidden border-t border-white/15 px-4 pb-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* 3. Disease warning ribbon */}
      {alerts.alerts?.length > 0 && (
        <div className="bg-[#8A3B27] text-white" role="alert">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-start gap-3 text-sm">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Health Advisory</p>
              {alerts.alerts.map((a) => (
                <p key={`${a.health_center_id}-${a.disease}`}>
                  High number of <b>{a.disease}</b> cases at {a.center_name}: {a.cases} cases in the last{" "}
                  {alerts.window_days} days.
                </p>
              ))}
              <p className="text-white/85 mt-1">If you have symptoms, please visit your health center right away.</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Slideshow */}
      <HeroCarousel title={KALINGA_TITLE} tagline={KALINGA_TAGLINE} pinnedPosts={pinned} onOpenPost={setOpenPost} />

      {/* 5. Quick links */}
      <section className="bg-[#F7F5F1] border-b border-[#0B3D7A]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLink to="/login" icon={CalendarCheck} title="Book an Appointment" text="Login to request a check-up" />
          <QuickLink href="#announcements" icon={Megaphone} title="Announcements" text="News and schedules" />
          <QuickLink href="#health-tips" icon={HeartPulse} title="Health Tips" text="Simple ways to stay healthy" />
          <QuickLink href="#contact" icon={Building2} title="Our Health Centers" text="Address, hours, contact" />
        </div>
      </section>

      {/* 6. Announcements */}
      <section id="announcements" className="scroll-mt-14 px-4 sm:px-8 py-14">
        <div className="max-w-6xl mx-auto">
          <SectionTitle eyebrow="Latest from the health centers" title="Announcements" />

          <div className="flex flex-wrap justify-center gap-2 mb-8" role="tablist" aria-label="Filter announcements">
            {["All", ...ANNOUNCEMENT_CATEGORIES.filter((c) => c.value !== "Health Tip").map((c) => c.value)].map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => {
                  setFilter(value);
                  setShowAll(false);
                }}
                className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
                  filter === value
                    ? "bg-[#0B3D7A] text-white border-[#0B3D7A]"
                    : "bg-white text-[#0B3D7A] border-[#0B3D7A]/25 hover:bg-[#0B3D7A]/5"
                }`}
              >
                {value === "All" ? "All" : categoryStyle(value).plural}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="text-center text-sm text-[#8A8578]">Loading announcements…</p>
          ) : visibleNotices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#0B3D7A]/25 p-10 text-center text-[#5B6470]">
              No announcements right now. Please check again soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleNotices.map((post) => (
                <PostCard key={post.id} post={post} onOpen={() => setOpenPost(post)} />
              ))}
            </div>
          )}

          {filteredNotices.length > ANNOUNCEMENTS_SHOWN && (
            <div className="text-center mt-8">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="rounded-full border border-[#0B3D7A]/30 px-6 py-2.5 text-sm font-semibold text-[#0B3D7A] hover:bg-[#0B3D7A]/5"
              >
                {showAll ? "Show fewer" : `Show all ${filteredNotices.length} announcements`}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 7. Health tips */}
      <section id="health-tips" className="scroll-mt-14 px-4 sm:px-8 py-14 bg-[#E8F3E9]/60">
        <div className="max-w-6xl mx-auto">
          <SectionTitle eyebrow="Paalala para sa lahat" title="Health Tips" />
          {tips.length === 0 ? (
            <p className="text-center text-sm text-[#5B6470]">{isLoading ? "Loading…" : "No health tips posted yet."}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tips.map((tip) => (
                <button
                  key={tip.id}
                  type="button"
                  onClick={() => setOpenPost(tip)}
                  className="text-left rounded-2xl bg-white border border-[#1B5E20]/15 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="rounded-full bg-[#1B5E20]/10 p-3 w-fit mb-4">
                    <HeartPulse size={22} className="text-[#1B5E20]" />
                  </div>
                  <p className="text-lg text-[#1A1A1A] mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                    {tip.title}
                  </p>
                  <p className="text-sm text-[#5B6470] leading-relaxed mb-3">{excerpt(tip.body, 120)}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#1B5E20]">
                    Read more <ChevronRight size={15} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 8a. Mission and Vision */}
      <section id="mission-vision" className="scroll-mt-14 px-4 sm:px-8 py-14">
        <div className="max-w-6xl mx-auto">
          <SectionTitle eyebrow="Manila Health Department" title="Mission & Vision" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard icon={Eye} title="Vision" text={VISION} />
            <InfoCard icon={Target} title="Mission" text={MISSION} />
            {QUALITY_POLICY && (
              <div className="md:col-span-2">
                <InfoCard icon={ShieldCheck} title="Quality Policy" text={QUALITY_POLICY} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 8b. About Us */}
      <section id="about" className="scroll-mt-14 px-4 sm:px-8 py-14 bg-[#F7F5F1]">
        <div className="max-w-6xl mx-auto">
          <SectionTitle eyebrow="ManilaCare" title="About Us" />
          <p className="max-w-3xl mx-auto text-center text-[#1A1A1A]/80 leading-relaxed mb-10">{ABOUT_MANILACARE}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {HEALTH_CENTER_INFO.map((hc) => (
              <div key={hc.name} className="rounded-2xl bg-[#1B5E20] text-white p-6">
                <p className="text-xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {hc.name}
                </p>
                <p className="text-white/85 text-sm leading-relaxed mb-4">{hc.about}</p>
                {hc.services.length > 0 && (
                  <>
                    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/70 mb-2">
                      <Stethoscope size={14} />
                      Services
                    </p>
                    <ul className="flex flex-wrap gap-2">
                      {hc.services.map((service) => (
                        <li key={service} className="rounded-full bg-white/15 px-3 py-1 text-xs">
                          {service}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8c. Contact Us */}
      <section id="contact" className="scroll-mt-14 px-4 sm:px-8 py-14">
        <div className="max-w-6xl mx-auto">
          <SectionTitle eyebrow="Visit or call us" title="Contact Us" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {HEALTH_CENTER_INFO.map((hc) => (
              <div key={hc.name} className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
                <p className="text-xl font-bold text-[#1B5E20] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {hc.name}
                </p>
                <ul className="flex flex-col gap-3 text-sm text-[#1A1A1A]">
                  {hc.address && <ContactLine icon={MapPin}>{hc.address}</ContactLine>}
                  {hc.phones.length > 0 && (
                    <ContactLine icon={Phone}>
                      {hc.phones.map((phone, i) => (
                        <span key={phone}>
                          {i > 0 && " / "}
                          <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className="hover:underline">
                            {phone}
                          </a>
                        </span>
                      ))}
                    </ContactLine>
                  )}
                  {hc.email && (
                    <ContactLine icon={Mail}>
                      <a href={`mailto:${hc.email}`} className="hover:underline">
                        {hc.email}
                      </a>
                    </ContactLine>
                  )}
                  {hc.hours && <ContactLine icon={Clock}>{hc.hours}</ContactLine>}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[#072B57] text-white/80 text-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={manilaLogo} alt="" className="h-10 w-10 rounded-full object-cover" />
              <img src={mhdLogo} alt="" className="h-10 w-10 rounded-full object-cover" />
            </div>
            <p className="text-white font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
              ManilaCare
            </p>
            <p>Manila Health Department · {KALINGA_TITLE}</p>
          </div>
          <div>
            <p className="text-white font-bold mb-3">Quick Links</p>
            <ul className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-white hover:underline">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/login" className="hover:text-white hover:underline">
                  Login
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-white font-bold mb-3">Health Centers</p>
            <ul className="flex flex-col gap-3">
              {HEALTH_CENTER_INFO.map((hc) => (
                <li key={hc.name}>
                  <p className="text-white">{hc.name}</p>
                  <p>{hc.address}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span>© {new Date().getFullYear()} ManilaCare · For Bo. Magsaysay and Foreshore Tondo Health Centers</span>
            <span className="flex gap-3">
              <Link to="/terms" className="hover:text-white hover:underline">Terms and Conditions</Link>
              <Link to="/privacy" className="hover:text-white hover:underline">Privacy Policy</Link>
            </span>
          </div>
        </div>
      </footer>

      <AnnouncementModal post={openPost} onClose={closeModal} />
    </div>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div className="text-center mb-8">
      <p className="text-xs uppercase tracking-[0.2em] text-[#1B5E20] mb-2">{eyebrow}</p>
      <h2 className="text-3xl sm:text-4xl text-[#0B3D7A]" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
        {title}
      </h2>
      <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-[#1B5E20]" />
    </div>
  );
}

function QuickLink({ to, href, icon: Icon, title, text }) {
  const content = (
    <>
      <span className="rounded-full bg-[#0B3D7A]/10 p-3 shrink-0">
        <Icon size={20} className="text-[#0B3D7A]" />
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-[#1A1A1A] text-sm sm:text-base">{title}</span>
        <span className="block text-xs text-[#5B6470]">{text}</span>
      </span>
    </>
  );
  const className =
    "flex items-center gap-3 rounded-2xl bg-white border border-[#0B3D7A]/10 p-4 shadow-sm hover:shadow-md hover:border-[#0B3D7A]/30 transition-all";
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <a href={href} className={className}>
      {content}
    </a>
  );
}

function PostCard({ post, onOpen }) {
  const style = categoryStyle(post.category);
  const Icon = style.icon;
  return (
    <article className="flex flex-col rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-1.5" style={{ backgroundColor: style.color }} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ backgroundColor: style.soft, color: style.color }}
          >
            <Icon size={13} />
            {style.label}
          </span>
          <span className="text-xs text-[#8A8578]">{formatPostDate(post.publish_date)}</span>
        </div>
        <h3 className="text-lg text-[#1A1A1A] leading-snug mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
          {post.title}
        </h3>
        <p className="text-sm text-[#5B6470] leading-relaxed mb-4 flex-1">{excerpt(post.body)}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-[#5B6470]">
            <MapPin size={12} />
            {post.center_name || "All health centers"}
          </span>
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 text-sm font-semibold text-[#0B3D7A] hover:underline">
            Read more <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

function InfoCard({ icon: Icon, title, text }) {
  return (
    <div className="h-full rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-full bg-[#0B3D7A]/10 p-3">
          <Icon size={22} className="text-[#0B3D7A]" />
        </div>
        <h3 className="text-2xl text-[#1B5E20]" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
          {title}
        </h3>
      </div>
      <p className="text-[#1A1A1A]/80 leading-relaxed">{text}</p>
    </div>
  );
}

function ContactLine({ icon: Icon, children }) {
  return (
    <li className="flex items-start gap-3">
      <span className="rounded-full bg-[#0B3D7A]/10 p-2 shrink-0">
        <Icon size={16} className="text-[#0B3D7A]" />
      </span>
      <span className="pt-1">{children}</span>
    </li>
  );
}
