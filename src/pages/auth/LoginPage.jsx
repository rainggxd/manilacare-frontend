import { useState, useCallback } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";

import { Link, useLocation } from "react-router-dom";
import backgroundImg from "../../assets/BACKGROUND_CAPSTONE.jpg";
import manilaLogo from "../../assets/MANILA_LOGO_CAPSTONE.jpg";

/**
 * ManilaCare — Login / Home Page
 * Matches the approved Figma design: navy header with seal + wordmark,
 * white body with a faded City Hall photo along the bottom, a large
 * green "Welcome to ManilaCare" heading, and pill-shaped NAME/PASSWORD
 * inputs with a gray LOGIN button.
 *
 * Responsive: header wraps and shrinks on small screens, hero heading
 * scales down on mobile, form stays full-width within a max column.
 *
 * Security notes (Chapter 2 / RBAC & Security Requirements):
 * - Credentials go once over HTTPS to the CI4 REST endpoint; backend
 *   verifies against a bcrypt hash and returns a signed JWT.
 * - JWT is kept in memory (passed up via onLoginSuccess), never in
 *   localStorage, to reduce XSS token-theft exposure.
 * - Error messages are generic ("Invalid email or password") so the
 *   API never confirms whether an account exists (anti-enumeration).
 * - Submit button disables while a request is in flight to prevent
 *   double submission.
 */

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
const location = useLocation();
const [showRegisteredMessage, setShowRegisteredMessage] = useState(Boolean(location.state?.registered));
  const validate = useCallback(() => {
    const errors = {};
    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (!password) {
      errors.password = "Password is required.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: email.trim(),
        password,
      });
      const { token, user } = response.data;
      onLoginSuccess?.({ token, user });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 404) {
        setErrorMessage("Invalid email or password.");
      } else if (status === 429) {
        setErrorMessage("Too many attempts. Please wait a moment and try again.");
      } else {
        setErrorMessage("Unable to sign in right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#0B3D7A] px-4 sm:px-8 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 sm:gap-3" title="Back to home">
          <img
            src={manilaLogo}
            alt="Lungsod ng Maynila seal"
            className="h-9 w-9 sm:h-11 sm:w-11 rounded-full object-cover"
          />
          <span
            className="text-white text-lg sm:text-2xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            ManilaCare
          </span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-8">
          <Link
            to="/#about"
            className="text-white/90 hover:text-white text-sm sm:text-lg"
            style={{ fontFamily: "'Lora', serif" }}
          >
            About us
          </Link>
          <Link
            to="/#contact"
            className="text-white/90 hover:text-white text-sm sm:text-lg"
            style={{ fontFamily: "'Lora', serif" }}
          >
            Contact Us
          </Link>
        </nav>
      </header>

      {/* Body with faded background photo at the bottom */}
      <main
        className="flex-1 relative flex flex-col items-center pt-10 sm:pt-16 md:pt-20 px-4"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,1) 45%, rgba(255,255,255,0.55) 70%, rgba(255,255,255,0.15) 100%), url(${backgroundImg})`,
          backgroundSize: "cover",
          backgroundPosition: "bottom center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h1
          className="text-3xl sm:text-5xl md:text-6xl text-[#1B5E20] text-center mb-8 sm:mb-12 md:mb-16 leading-tight"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
        >
          Welcome to ManilaCare
        </h1>

        {showRegisteredMessage && (
          <div
            role="status"
            className="mb-5 w-full max-w-md rounded-2xl border border-[#1B5E20]/40 bg-[#EAF6EC] text-[#1B5E20] text-sm px-4 py-3 text-center flex items-center justify-between gap-3"
            style={{ fontFamily: "'Lora', serif" }}
          >
            <span>Registered successfully! You can now log in.</span>
            <button
              type="button"
              onClick={() => setShowRegisteredMessage(false)}
              aria-label="Dismiss"
              className="text-[#1B5E20]/70 hover:text-[#1B5E20] font-bold leading-none"
            >
              ×
            </button>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 w-full max-w-md rounded-2xl border border-[#C97B63] bg-[#FBEAE5] text-[#8A3B27] text-sm px-4 py-3 text-center"
            style={{ fontFamily: "'Lora', serif" }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="w-full max-w-md flex flex-col items-center">
          <div className="w-full mb-4">
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-label="Name / Email"
              placeholder="NAME"
              className={`w-full rounded-full border-0 px-5 sm:px-6 py-3.5 sm:py-4 text-center text-base sm:text-lg tracking-wide text-white placeholder-white/90 outline-none
                bg-[#1B5E20] focus:ring-2 focus:ring-[#0B3D7A]/40
                ${fieldErrors.email ? "ring-2 ring-red-400" : ""}`}
              style={{ fontFamily: "'Lora', serif" }}
            />
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-[#8A3B27] text-center">{fieldErrors.email}</p>
            )}
          </div>

          <div className="w-full mb-2 relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-label="Password"
              placeholder="PASSWORD"
              className={`w-full rounded-full border-0 px-5 sm:px-6 py-3.5 sm:py-4 pr-14 text-center text-base sm:text-lg tracking-wide text-white placeholder-white/90 outline-none
                bg-[#1B5E20] focus:ring-2 focus:ring-[#0B3D7A]/40
                ${fieldErrors.password ? "ring-2 ring-red-400" : ""}`}
              style={{ fontFamily: "'Lora', serif" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-white/90 hover:text-white"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mb-2 text-xs text-[#8A3B27] text-center w-full">{fieldErrors.password}</p>
          )}

                   <p
            className="text-[#1B5E20] text-sm mb-8 text-center"
            style={{ fontFamily: "'Lora', serif" }}
          >
            Forgot Password?{" "}
            <Link to="/forgot-password" className="text-[#0B3D7A] font-semibold hover:underline">
              Click here
            </Link>
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full max-w-sm rounded-full bg-[#4B4F58] text-white py-3.5 sm:py-4 text-base sm:text-lg tracking-wide
              transition-colors hover:bg-[#3C3F47] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontFamily: "'Lora', serif" }}
          >
            {isSubmitting ? "Signing in…" : "LOGIN"}
          </button>

          <div className="mt-6 rounded-full bg-white/90 border border-[#1B5E20]/20 px-5 py-2 shadow-sm inline-flex items-center gap-2">
            <Link
              to="/terms"
              className="text-[#0B3D7A] text-sm font-bold underline underline-offset-2 hover:text-[#1B5E20]"
              style={{ fontFamily: "'Lora', serif" }}
            >
              Terms and Conditions
            </Link>
            <span className="text-[#1A1A1A]/50">·</span>
            <Link
              to="/privacy"
              className="text-[#0B3D7A] text-sm font-bold underline underline-offset-2 hover:text-[#1B5E20]"
              style={{ fontFamily: "'Lora', serif" }}
            >
              Privacy Policy
            </Link>
          </div>
        </form>

        <div className="h-20 sm:h-32 md:h-40" aria-hidden="true" />
      </main>
    </div>
  );
}