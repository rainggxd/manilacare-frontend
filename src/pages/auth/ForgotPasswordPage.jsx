import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import manilaLogo from "../../assets/MANILA_LOGO_CAPSTONE.jpg";
import { checkPassword } from "../../utils/passwordPolicy";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";
const OTP_DURATION_SECONDS = 5 * 60;

const STEPS = [
  { number: 1, label: "Enter Email" },
  { number: 2, label: "Verify OTP" },
  { number: 3, label: "Reset Password" },
];

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", color: "bg-red-500", pct: 33 };
  if (score <= 2) return { label: "Fair", color: "bg-yellow-500", pct: 66 };
  return { label: "Strong", color: "bg-[#1B5E20]", pct: 100 };
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [secondsLeft, setSecondsLeft] = useState(OTP_DURATION_SECONDS);
  const timerRef = useRef(null);

  useEffect(() => {
    if (step !== 2) return;
    setSecondsLeft(OTP_DURATION_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      setMessage("");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send reset code right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      setSecondsLeft(OTP_DURATION_SECONDS);
      setOtp("");
    } catch (err) {
      setError("Unable to resend code right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
        email,
        otp_code: otp,
      });
      setResetToken(res.data?.reset_token || "");
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");

       const pwError = checkPassword(newPassword);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email,
        reset_token: resetToken,
        new_password: newPassword,
      });
      navigate("/login", { state: { passwordReset: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset password right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const strength = passwordStrength(newPassword);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* Left navy panel with stepper */}
      <div className="lg:w-[38%] bg-[#0B3D7A] text-white flex flex-col justify-center px-8 sm:px-14 py-16">
        <div className="flex items-center gap-3 mb-2">
          <img src={manilaLogo} alt="Lungsod ng Maynila seal" className="w-12 h-12 rounded-full object-cover" />
          <span className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            ManilaCare
          </span>
        </div>
        <p className="text-white/70 text-sm mb-12" style={{ fontFamily: "'Lora', serif" }}>
          Community Health Information System
        </p>

        <div className="flex flex-col gap-8">
          {STEPS.map((s) => {
            const isActive = step === s.number;
            const isDone = step > s.number;
            return (
              <div key={s.number} className="flex items-center gap-4">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isDone
                      ? "bg-white text-[#0B3D7A]"
                      : isActive
                      ? "bg-white text-[#0B3D7A] ring-4 ring-white/25"
                      : "bg-white/15 text-white/60"
                  }`}
                >
                  {isDone ? "✓" : s.number}
                </div>
                <span
                  className={`text-base ${isActive ? "font-bold text-white" : "text-white/60"}`}
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right green card */}
      <div className="flex-1 bg-[#F7F5F1] flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="w-full max-w-md rounded-3xl bg-[#1B5E20] p-8 sm:p-10 relative z-10 shadow-xl">
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-[#C97B63] bg-[#FBEAE5] text-[#8A3B27] text-sm px-4 py-3"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendCode}>
              <h2 className="text-white text-xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Forgot your password?
              </h2>
              <p className="text-white/80 text-sm mb-6" style={{ fontFamily: "'Lora', serif" }}>
                Enter your registered email address. We'll send a one-time code to reset your password.
              </p>

              <label className="block text-xs text-white/80 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-full bg-[#0B3D7A] px-6 py-3.5 text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-white/30 mb-6"
                style={{ fontFamily: "'Lora', serif" }}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-white text-[#1B5E20] py-3.5 font-bold hover:bg-white/90 transition-colors disabled:opacity-60"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {isSubmitting ? "Sending…" : "Send reset code"}
              </button>

              <div className="text-center mt-5">
                <Link to="/login" className="text-white/80 text-sm underline hover:text-white">
                  Back to login
                </Link>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <h2 className="text-white text-xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Verify your code
              </h2>
              <p className="text-white/80 text-sm mb-6" style={{ fontFamily: "'Lora', serif" }}>
                We sent a 6-digit code to <span className="font-semibold text-white">{email}</span>. Enter it below to continue.
              </p>

              <label className="block text-xs text-white/80 mb-1">One-time code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="000000"
                className="w-full rounded-full bg-[#0B3D7A] px-6 py-3.5 text-white placeholder-white/40 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-white/30 mb-3"
                style={{ fontFamily: "'Lora', serif" }}
              />

              <div className="flex items-center justify-between text-sm mb-6" style={{ fontFamily: "'Lora', serif" }}>
                <span className="text-white/70">
                  {secondsLeft > 0 ? `Code expires in ${formatTime(secondsLeft)}` : "Code expired"}
                </span>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={secondsLeft > 0 || isSubmitting}
                  className="text-white font-semibold underline disabled:opacity-40 disabled:no-underline"
                >
                  Resend Code
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-white text-[#1B5E20] py-3.5 font-bold hover:bg-white/90 transition-colors disabled:opacity-60"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {isSubmitting ? "Verifying…" : "Verify Code"}
              </button>

              <div className="text-center mt-5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-white/80 text-sm underline hover:text-white"
                >
                  Change Email
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <h2 className="text-white text-xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Create new password
              </h2>
              <p className="text-white/80 text-sm mb-6" style={{ fontFamily: "'Lora', serif" }}>
                Your new password must be at least 8 characters and include a number and a special character.
              </p>

              <label className="block text-xs text-white/80 mb-1">New password</label>
              <div className="relative mb-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-full bg-[#0B3D7A] px-6 py-3.5 pr-12 text-white outline-none focus:ring-2 focus:ring-white/30"
                  style={{ fontFamily: "'Lora', serif" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {newPassword && (
                <div className="mb-5">
                  <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div className={`h-full ${strength.color} transition-all`} style={{ width: `${strength.pct}%` }} />
                  </div>
                  <p className="text-xs text-white/70 mt-1" style={{ fontFamily: "'Lora', serif" }}>
                    Password strength: {strength.label}
                  </p>
                </div>
              )}

              <label className="block text-xs text-white/80 mb-1">Confirm new password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-full bg-[#0B3D7A] px-6 py-3.5 text-white outline-none focus:ring-2 focus:ring-white/30 mb-6"
                style={{ fontFamily: "'Lora', serif" }}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-white text-[#1B5E20] py-3.5 font-bold hover:bg-white/90 transition-colors disabled:opacity-60"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {isSubmitting ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}