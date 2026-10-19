import { Link } from "react-router-dom";
import { Eye, Target, ShieldCheck, MapPin, LogIn } from "lucide-react";
import backgroundImg from "../../assets/BACKGROUND_CAPSTONE.jpg";
import manilaLogo from "../../assets/MANILA_LOGO_CAPSTONE.jpg";
import mhdLogo from "../../assets/MHD_LOGO.jpg";
import {
  KALINGA_TITLE,
  KALINGA_TAGLINE,
  VISION,
  MISSION,
  QUALITY_POLICY,
  LANDING_HEALTH_CENTERS,
} from "../../utils/landingInfo";

/**
 * ManilaCare — Landing Page (shown before login)
 * Shows the "Kalinga sa Maynila" banner, the Mission and Vision of the
 * Manila Health Department, and the two health centers in the study.
 * The text comes from utils/landingInfo.js so it is easy to edit.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#0B3D7A] px-4 sm:px-8 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <img
            src={manilaLogo}
            alt="Lungsod ng Maynila seal"
            className="h-9 w-9 sm:h-11 sm:w-11 rounded-full object-cover"
          />
          <span className="text-white text-lg sm:text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            ManilaCare
          </span>
        </div>
        <nav className="flex items-center gap-4 sm:gap-8" style={{ fontFamily: "'Lora', serif" }}>
          <a href="#mission-vision" className="hidden sm:inline text-white/90 hover:text-white text-base">
            Mission &amp; Vision
          </a>
          <a href="#centers" className="hidden sm:inline text-white/90 hover:text-white text-base">
            Health Centers
          </a>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-white text-[#0B3D7A] px-5 py-2 text-sm font-bold hover:bg-white/90"
          >
            <LogIn size={16} />
            Login
          </Link>
        </nav>
      </header>

      {/* Kalinga banner */}
      <section
        className="relative px-4 py-16 sm:py-24 flex flex-col items-center text-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.6) 75%, rgba(255,255,255,0.3) 100%), url(${backgroundImg})`,
          backgroundSize: "cover",
          backgroundPosition: "bottom center",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <img src={manilaLogo} alt="City of Manila seal" className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover shadow" />
          <img src={mhdLogo} alt="Manila Health Department logo" className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover shadow" />
        </div>
        <h1
          className="text-4xl sm:text-6xl md:text-7xl text-[#1B5E20] leading-tight mb-4"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
        >
          {KALINGA_TITLE}
        </h1>
        <p className="max-w-2xl text-base sm:text-xl text-[#1A1A1A]/80 mb-8" style={{ fontFamily: "'Lora', serif" }}>
          {KALINGA_TAGLINE}
        </p>
        <Link
          to="/login"
          className="rounded-full bg-[#1B5E20] text-white px-10 py-4 text-base sm:text-lg tracking-wide hover:bg-[#164D1A] transition-colors"
          style={{ fontFamily: "'Lora', serif" }}
        >
          Login to ManilaCare
        </Link>
      </section>

      {/* Mission and Vision */}
      <section id="mission-vision" className="px-4 sm:px-8 py-14 bg-[#F7F5F1]">
        <h2
          className="text-3xl sm:text-4xl text-center text-[#0B3D7A] mb-10"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
        >
          Mission &amp; Vision
        </h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoCard icon={Eye} title="Vision" text={VISION} />
          <InfoCard icon={Target} title="Mission" text={MISSION} />
          {QUALITY_POLICY && (
            <div className="md:col-span-2">
              <InfoCard icon={ShieldCheck} title="Quality Policy" text={QUALITY_POLICY} />
            </div>
          )}
        </div>
      </section>

      {/* Health centers */}
      <section id="centers" className="px-4 sm:px-8 py-14">
        <h2
          className="text-3xl sm:text-4xl text-center text-[#0B3D7A] mb-10"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
        >
          Our Health Centers
        </h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {LANDING_HEALTH_CENTERS.map((hc) => (
            <div key={hc.name} className="rounded-2xl bg-[#1B5E20] text-white p-6 flex items-start gap-4">
              <div className="rounded-full bg-white/15 p-3 shrink-0">
                <MapPin size={22} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {hc.name}
                </p>
                <p className="text-white/80 text-sm" style={{ fontFamily: "'Lora', serif" }}>
                  {hc.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[#0B3D7A] text-white/80 px-4 py-6 text-center text-sm" style={{ fontFamily: "'Lora', serif" }}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <Link to="/terms" className="underline hover:text-white">Terms and Conditions</Link>
          <span>·</span>
          <Link to="/privacy" className="underline hover:text-white">Privacy Policy</Link>
        </div>
        <p>ManilaCare · Manila Health Department</p>
      </footer>
    </div>
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
      <p className="text-[#1A1A1A]/80 leading-relaxed" style={{ fontFamily: "'Lora', serif" }}>
        {text}
      </p>
    </div>
  );
}
