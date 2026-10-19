import { useNavigate, useLocation, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import backgroundImg from "../assets/BACKGROUND_CAPSTONE.jpg";
import manilaLogo from "../assets/MANILA_LOGO_CAPSTONE.jpg";
import { LEGAL_CONTACT_EMAIL, LEGAL_EFFECTIVE_DATE, LEGAL_HEALTH_CENTERS, LEGAL_VERSION } from "../utils/legalInfo";

/**
 * Shared look for the Privacy Policy and Terms and Conditions pages.
 *
 * Props:
 *   title, subtitle      - page heading
 *   switchTo             - { to, label } button to the other legal page
 *   summary              - { title, items: [string] } short box at the top (optional)
 *   sections             - [{ id, title, paragraphs, bullets, table, after }]
 */
export default function LegalLayout({ title, subtitle, switchTo, summary, sections }) {
  const navigate = useNavigate();
  const location = useLocation();
  // When the user opened this page from the registration form, "back" returns to that form.
  const resumeState = location.state?.resumeStep ? location.state : null;

  const handleBack = () => {
    if (resumeState) {
      navigate("/dashboard/patients/new", { state: resumeState });
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      <header className="bg-[#0B3D7A] px-4 sm:px-8 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/login" className="flex items-center gap-2 sm:gap-3">
          <img src={manilaLogo} alt="Lungsod ng Maynila seal" className="h-9 w-9 sm:h-11 sm:w-11 rounded-full object-cover" />
          <span className="text-white text-lg sm:text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            ManilaCare
          </span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-8">
          <a href="#about" className="text-white/90 hover:text-white text-sm sm:text-lg" style={{ fontFamily: "'Lora', serif" }}>About us</a>
          <a href="#contact" className="text-white/90 hover:text-white text-sm sm:text-lg" style={{ fontFamily: "'Lora', serif" }}>Contact Us</a>
        </nav>
      </header>

      <main
        className="flex-1 relative px-4 sm:px-6 md:px-16 py-8 sm:py-12"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,1) 55%, rgba(255,255,255,0.4) 85%), url(${backgroundImg})`,
          backgroundSize: "cover",
          backgroundPosition: "bottom center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="mb-6 text-[#1A1A1A] hover:text-[#1B5E20] transition-colors"
          >
            <ChevronLeft size={28} />
          </button>

          <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
            <div>
              <h1 className="text-3xl sm:text-4xl text-[#1B5E20]" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                {title}
              </h1>
              <p className="text-sm text-[#1A1A1A]/80 mt-1" style={{ fontFamily: "'Lora', serif" }}>
                Version {LEGAL_VERSION} · Effective {LEGAL_EFFECTIVE_DATE} · {subtitle}
              </p>
            </div>
            <Link
              to={switchTo.to}
              state={resumeState}
              className="rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm sm:text-base font-semibold hover:bg-[#0A3468] transition-colors whitespace-nowrap"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {switchTo.label}
            </Link>
          </div>
          <hr className="border-t border-[#1A1A1A]/30 mb-8" />

          {summary && (
            <div className="rounded-2xl bg-[#1B5E20] text-white p-5 sm:p-6 mb-10">
              <h2 className="text-lg sm:text-xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                {summary.title}
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base leading-relaxed" style={{ fontFamily: "'Lora', serif" }}>
                {summary.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-9 pb-10">
            {sections.map((section, index) => (
              <section key={section.id} id={index === 0 ? "about" : section.id}>
                <h2 className="text-xl sm:text-2xl text-[#1B5E20] font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {section.title}
                </h2>

                {(section.paragraphs ?? []).map((text) => (
                  <p key={text} className="text-[#1A1A1A] text-sm sm:text-base leading-relaxed mb-3" style={{ fontFamily: "'Lora', serif" }}>
                    {text}
                  </p>
                ))}

                {section.bullets && (
                  <ul className="list-disc pl-5 space-y-1.5 text-[#1A1A1A] text-sm sm:text-base leading-relaxed mb-3" style={{ fontFamily: "'Lora', serif" }}>
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}

                {section.table && (
                  <div className="overflow-x-auto rounded-2xl border border-[#1B5E20]/40 mb-3">
                    <table className="w-full min-w-[520px] text-left text-sm sm:text-base" style={{ fontFamily: "'Lora', serif" }}>
                      <thead>
                        <tr className="bg-[#1B5E20] text-white">
                          {section.table.head.map((cell) => (
                            <th key={cell} className="px-4 py-2.5 font-bold">{cell}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row) => (
                          <tr key={row[0]} className="bg-white/90 border-t border-[#1B5E20]/20 align-top">
                            {row.map((cell, i) => (
                              <td key={i} className={`px-4 py-2.5 text-[#1A1A1A] ${i === 0 ? "font-semibold" : ""}`}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {section.after && (
                  <p className="text-[#1A1A1A] text-sm sm:text-base leading-relaxed" style={{ fontFamily: "'Lora', serif" }}>
                    {section.after}
                  </p>
                )}
              </section>
            ))}

            <section id="contact">
              <h2 className="text-xl sm:text-2xl text-[#1B5E20] font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Contact
              </h2>
              <p className="text-[#1A1A1A] text-sm sm:text-base leading-relaxed" style={{ fontFamily: "'Lora', serif" }}>
                For questions or requests about this page or your data, talk to the staff at your health center
                ({LEGAL_HEALTH_CENTERS}).
                {LEGAL_CONTACT_EMAIL ? ` You can also write to ${LEGAL_CONTACT_EMAIL}.` : ""}
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}