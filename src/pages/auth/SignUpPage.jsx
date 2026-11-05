import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Hourglass, MailCheck } from "lucide-react";
import manilaLogo from "../../assets/MANILA_LOGO_CAPSTONE.jpg";
import { checkPassword, PASSWORD_RULE_TEXT } from "../../utils/passwordPolicy";
import { useConfirm } from "../../components/ConfirmDialog";

/**
 * ManilaCare — Patient sign-up (from the login page, no account needed).
 *
 * Flow:
 *  1. The patient fills in the form and verifies their email with a code.
 *  2. The form is sent as a REQUEST. No account exists yet.
 *  3. The Admin of the chosen health center approves or rejects it.
 *  4. The patient gets an email, and can only log in after approval.
 *
 * Built for older users: one column, big labels above each box,
 * large buttons, short sentences, and clear messages.
 */

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

const EMPTY_FORM = {
  health_center_id: "",
  full_name: "",
  date_of_birth: "",
  sex: "",
  contact_number: "",
  address: "",
  email: "",
  otp_code: "",
  password: "",
  confirm_password: "",
  agree: false,
};

function ageFromBirthday(dateString) {
  if (!dateString) return "";
  const birth = new Date(dateString);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : "";
}

export default function SignUpPage() {
  const confirm = useConfirm();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [centers, setCenters] = useState([]);
  const [centersError, setCentersError] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const age = useMemo(() => ageFromBirthday(form.date_of_birth), [form.date_of_birth]);
  // Patients aged 50+ may sign up without an email and log in with their mobile number.
  const canSkipEmail = age !== "" && Number(age) >= 50;
  const [noEmailChoice, setNoEmailChoice] = useState(false);
  const noEmail = canSkipEmail && noEmailChoice;
  // Without an email and without a mobile number there is no login, so no password is asked.
  const hasLogin = !noEmail || Boolean(form.contact_number);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/public/health-centers`)
      .then((res) => setCenters(res.data?.data ?? []))
      .catch(() => setCentersError("Unable to load the health centers. Please refresh the page."));
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSubmitError("");
    if (field === "email") {
      // A new email must be verified again
      setOtpSent(false);
      setEmailVerified(false);
      setOtpMessage("");
    }
  }

  async function sendCode() {
    const email = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email address." }));
      return;
    }
    setOtpBusy(true);
    setOtpMessage("");
    try {
      await axios.post(`${API_BASE_URL}/public/email/send-otp`, { email });
      setOtpSent(true);
      setOtpMessage("We sent a 6-digit code to your email. Please check your inbox (or Spam folder).");
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        email: err.response?.data?.message || "Unable to send the code right now. Please try again.",
      }));
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(form.otp_code.trim())) {
      setErrors((prev) => ({ ...prev, otp_code: "Please enter the 6-digit code." }));
      return;
    }
    setOtpBusy(true);
    try {
      await axios.post(`${API_BASE_URL}/public/email/verify-otp`, {
        email: form.email.trim(),
        otp_code: form.otp_code.trim(),
      });
      setEmailVerified(true);
      setOtpMessage("");
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        otp_code: err.response?.data?.message || "Wrong or expired code. Please try again.",
      }));
    } finally {
      setOtpBusy(false);
    }
  }

  function validate() {
    const e = {};
    if (!form.health_center_id) e.health_center_id = "Please choose your health center.";
    if (form.full_name.trim().length < 2) e.full_name = "Please enter your full name.";
    if (!form.date_of_birth) e.date_of_birth = "Please enter your birthday.";
    else if (age === "") e.date_of_birth = "Please check your birthday.";
    if (!form.sex) e.sex = "Please choose Male or Female.";
    if (form.contact_number && !/^09\d{9}$/.test(form.contact_number)) {
      e.contact_number = "Use 11 digits starting with 09 (example: 09171234567).";
    }
    if (!noEmail && !emailVerified) e.email = "Please verify your email first.";
    if (hasLogin) {
      if (checkPassword(form.password)) e.password = PASSWORD_RULE_TEXT;
      if (form.confirm_password !== form.password) e.confirm_password = "The passwords do not match.";
    }
    if (!form.agree) e.agree = "Please agree to the Terms and Privacy Policy.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    if (!validate()) {
      setSubmitError("Some details are missing or need fixing. Please check the boxes marked in red.");
      return;
    }
    const ok = await confirm({
      title: "Send your registration?",
      message: noEmail
        ? hasLogin
          ? "Please check that your name, birthday and mobile number are correct. You will log in with your mobile number after the health center approves it."
          : "Please check that your name and birthday are correct. Without an email or mobile number, you will not have a login, but you can still be served at the health center."
        : "Please check that your name, birthday and email are correct. The health center will review your registration.",
      confirmText: "Yes, send",
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/public/register`, {
        health_center_id: Number(form.health_center_id),
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth,
        age,
        sex: form.sex,
        contact_number: form.contact_number || null,
        address: form.address.trim() || null,
        email: noEmail ? "" : form.email.trim(),
        password: hasLogin ? form.password : "",
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const data = err.response?.data;
      const fieldErrors = data?.errors ? Object.values(data.errors).join(" ") : "";
      setSubmitError(fieldErrors || data?.message || "Unable to send your registration right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const centerName = centers.find((c) => String(c.id) === String(form.health_center_id))?.center_name;

  return (
    <div className="min-h-screen w-full bg-[#F5F7F5] flex flex-col">
      <header className="bg-[#0B3D7A] px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 sm:gap-3" title="Back to home">
          <img src={manilaLogo} alt="Lungsod ng Maynila seal" className="h-9 w-9 sm:h-11 sm:w-11 rounded-full object-cover" />
          <span className="text-white text-lg sm:text-2xl font-semibold">ManilaCare</span>
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-full border border-white/60 px-4 py-2 text-white text-sm sm:text-base font-semibold hover:bg-white/10"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Back to Login
        </Link>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {submitted ? (
          <SubmittedMessage email={noEmail ? "" : form.email.trim()} mobile={form.contact_number} centerName={centerName} />
        ) : (
          <>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1B5E20]">Patient Registration</h1>
            <p className="mt-2 text-base sm:text-lg text-[#33404D]">
              Fill in your details below. The health center will check your registration first.
              You can log in once it is approved.
            </p>
            <p className="mt-1 text-sm sm:text-base text-[#5B6470] italic">
              Punan ang form. Makakapag-login ka kapag na-approve na ng health center.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
              {/* Two columns on wide screens: steps 1-2 left, steps 3-4 right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-6">
              {/* 1. Health center */}
              <Section number="1" title="Your health center">
                {centersError && <ErrorText>{centersError}</ErrorText>}
                <div className="grid gap-3">
                  {centers.map((center) => {
                    const selected = String(form.health_center_id) === String(center.id);
                    return (
                      <label
                        key={center.id}
                        className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                          selected ? "border-[#1B5E20] bg-[#EAF6EC]" : "border-[#D5DCE3] bg-white hover:border-[#1B5E20]/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="health_center_id"
                          value={center.id}
                          checked={selected}
                          onChange={(e) => update("health_center_id", e.target.value)}
                          className="mt-1 h-5 w-5 accent-[#1B5E20]"
                        />
                        <span>
                          <span className="block text-lg font-semibold text-[#1A1A1A]">{center.center_name}</span>
                          {center.address && <span className="block text-sm text-[#5B6470]">{center.address}</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <ErrorText>{errors.health_center_id}</ErrorText>
              </Section>

              {/* 2. Personal details */}
              <Section number="2" title="Personal details">
                <Field label="Full name" hint="First name, middle name, last name" error={errors.full_name}>
                  <TextInput
                    value={form.full_name}
                    onChange={(v) => update("full_name", v)}
                    autoComplete="name"
                    placeholder="Juan Santos Dela Cruz"
                    invalid={Boolean(errors.full_name)}
                  />
                </Field>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Birthday" error={errors.date_of_birth}>
                    <TextInput
                      type="date"
                      max={today}
                      value={form.date_of_birth}
                      onChange={(v) => update("date_of_birth", v)}
                      invalid={Boolean(errors.date_of_birth)}
                    />
                  </Field>
                  <Field label="Age">
                    <div className="h-12 flex items-center rounded-xl border-2 border-[#E3E8EF] bg-[#F0F3F6] px-4 text-lg text-[#33404D]">
                      {age === "" ? "—" : `${age} years old`}
                    </div>
                  </Field>
                </div>

                <Field label="Sex" error={errors.sex}>
                  <div className="grid grid-cols-2 gap-3">
                    {["Male", "Female"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => update("sex", option)}
                        aria-pressed={form.sex === option}
                        className={`h-12 rounded-xl border-2 text-lg font-semibold transition-colors ${
                          form.sex === option
                            ? "border-[#1B5E20] bg-[#1B5E20] text-white"
                            : "border-[#D5DCE3] bg-white text-[#1A1A1A] hover:border-[#1B5E20]/50"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Mobile number" hint={noEmail ? "Optional: if you add it, this is your login" : "Optional"} error={errors.contact_number}>
                  <TextInput
                    inputMode="numeric"
                    maxLength={11}
                    value={form.contact_number}
                    onChange={(v) => update("contact_number", v.replace(/\D/g, ""))}
                    placeholder="09171234567"
                    autoComplete="tel"
                    invalid={Boolean(errors.contact_number)}
                  />
                </Field>

                <Field label="Home address" hint="Optional">
                  <TextInput
                    value={form.address}
                    onChange={(v) => update("address", v)}
                    placeholder="House no., street, barangay, Tondo, Manila"
                    autoComplete="street-address"
                  />
                </Field>
              </Section>

              </div>
              <div className="space-y-6">
              {/* 3. Email */}
              <Section number="3" title="Email address">
                {canSkipEmail && (
                  <label className="flex items-start gap-3 rounded-xl border-2 border-[#0B3D7A]/20 bg-[#E7EEF7] p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noEmailChoice}
                      onChange={(e) => {
                        setNoEmailChoice(e.target.checked);
                        setErrors((prev) => ({ ...prev, email: "", contact_number: "" }));
                      }}
                      className="mt-1 h-5 w-5 shrink-0 accent-[#0B3D7A]"
                    />
                    <span className="text-base text-[#1A1A1A]">
                      <b>I have no email.</b> I will log in with my mobile number instead.
                      <span className="block text-sm text-[#5B6470] italic">Wala akong email. Mobile number ang gagamitin ko sa pag-login.</span>
                    </span>
                  </label>
                )}
                {noEmail ? (
                  form.contact_number ? (
                    <p className="text-sm sm:text-base text-[#33404D]">
                      Your login will be your mobile number (<b>{form.contact_number}</b>). Since there is no email, please
                      ask the health center or try logging in later to know if your registration is approved.
                    </p>
                  ) : (
                    <p className="text-sm sm:text-base text-[#33404D]">
                      No email and no mobile number: you will not have a login, but the health center can still serve you
                      and give you a QR card. Add a mobile number in step 2 if you want to log in.
                      <span className="block text-sm text-[#5B6470] italic mt-1">
                        Walang login kung walang email at mobile number, pero puwede ka pa ring pagsilbihan sa health center.
                      </span>
                    </p>
                  )
                ) : (
                <>
                <p className="text-sm sm:text-base text-[#5B6470] -mt-1">
                  We will send a code to check that your email is real. We will also email you when your registration is approved.
                </p>
                <Field label="Email" error={errors.email}>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <TextInput
                      type="email"
                      value={form.email}
                      onChange={(v) => update("email", v)}
                      placeholder="juan@gmail.com"
                      autoComplete="email"
                      disabled={emailVerified}
                      invalid={Boolean(errors.email)}
                    />
                    {!emailVerified && (
                      <button
                        type="button"
                        onClick={sendCode}
                        disabled={otpBusy}
                        className="h-12 shrink-0 rounded-xl bg-[#0B3D7A] px-5 text-base font-semibold text-white hover:bg-[#08305F] disabled:opacity-60"
                      >
                        {otpBusy && !otpSent ? "Sending…" : otpSent ? "Send again" : "Send code"}
                      </button>
                    )}
                  </div>
                </Field>

                {emailVerified ? (
                  <p className="flex items-center gap-2 rounded-xl bg-[#EAF6EC] px-4 py-3 text-base font-semibold text-[#1B5E20]">
                    <MailCheck size={22} aria-hidden="true" /> Email verified
                  </p>
                ) : (
                  otpSent && (
                    <>
                      {otpMessage && <p className="text-sm sm:text-base text-[#0B3D7A]">{otpMessage}</p>}
                      <Field label="6-digit code" error={errors.otp_code}>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <TextInput
                            inputMode="numeric"
                            maxLength={6}
                            value={form.otp_code}
                            onChange={(v) => update("otp_code", v.replace(/\D/g, ""))}
                            placeholder="123456"
                            autoComplete="one-time-code"
                            invalid={Boolean(errors.otp_code)}
                            className="tracking-[0.4em] text-center"
                          />
                          <button
                            type="button"
                            onClick={verifyCode}
                            disabled={otpBusy}
                            className="h-12 shrink-0 rounded-xl bg-[#1B5E20] px-5 text-base font-semibold text-white hover:bg-[#164D1A] disabled:opacity-60"
                          >
                            {otpBusy ? "Checking…" : "Verify"}
                          </button>
                        </div>
                      </Field>
                    </>
                  )
                )}
                </>
                )}
              </Section>

              {/* 4. Password (only when there is a login) */}
              {hasLogin && (
              <Section number="4" title="Create a password">
                <p className="text-sm sm:text-base text-[#5B6470] -mt-1">{PASSWORD_RULE_TEXT} Example: Juan@2026</p>
                <Field label="Password" error={errors.password}>
                  <div className="relative">
                    <TextInput
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(v) => update("password", v)}
                      autoComplete="new-password"
                      invalid={Boolean(errors.password)}
                      className="pr-14"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#5B6470] hover:text-[#1A1A1A]"
                    >
                      {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </Field>
                <Field label="Type the password again" error={errors.confirm_password}>
                  <TextInput
                    type={showPassword ? "text" : "password"}
                    value={form.confirm_password}
                    onChange={(v) => update("confirm_password", v)}
                    autoComplete="new-password"
                    invalid={Boolean(errors.confirm_password)}
                  />
                </Field>
              </Section>
              )}

              </div>
              </div>

              {/* Agreement + submit */}
              <div className="rounded-2xl bg-white border border-[#E3E8EF] p-5 sm:p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agree}
                    onChange={(e) => update("agree", e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 accent-[#1B5E20]"
                  />
                  <span className="text-base text-[#1A1A1A]">
                    I agree to the{" "}
                    <Link to="/terms" target="_blank" className="font-semibold text-[#0B3D7A] underline">Terms and Conditions</Link>{" "}
                    and{" "}
                    <Link to="/privacy" target="_blank" className="font-semibold text-[#0B3D7A] underline">Privacy Policy</Link>,
                    and I allow the health center to keep my information under the Data Privacy Act of 2012.
                  </span>
                </label>
                <ErrorText>{errors.agree}</ErrorText>

                {submitError && (
                  <p role="alert" className="mt-4 rounded-xl border border-[#C97B63] bg-[#FBEAE5] px-4 py-3 text-base text-[#8A3B27]">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 w-full h-14 rounded-xl bg-[#1B5E20] text-lg font-bold text-white hover:bg-[#164D1A] disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Submit Registration"}
                </button>
              </div>

              <p className="text-center text-base text-[#33404D]">
                Already have an account?{" "}
                <Link to="/login" className="font-bold text-[#0B3D7A] underline underline-offset-4">Log in here</Link>
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

function SubmittedMessage({ email, mobile, centerName }) {
  return (
    <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6 sm:p-10 text-center">
      <Hourglass size={56} className="mx-auto text-[#0B3D7A]" aria-hidden="true" />
      <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-[#1B5E20]">Registration sent!</h1>
      <p className="mt-3 text-lg text-[#1A1A1A]">
        Please wait for the <b>Admin of {centerName || "your health center"}</b> to approve your registration.
      </p>
      {email ? (
        <>
          <p className="mt-2 text-base text-[#33404D]">
            We will send an email to <b>{email}</b> once it is approved. You can log in after that.
          </p>
          <p className="mt-2 text-base text-[#5B6470] italic">
            Hintayin ang approval ng Admin. Makakatanggap ka ng email kapag puwede ka nang mag-login.
          </p>
        </>
      ) : !mobile ? (
        <p className="mt-2 text-base text-[#33404D]">
          Please visit your health center to complete your registration and get your QR card.
          <span className="block text-[#5B6470] italic mt-1">Pumunta sa health center para makuha ang QR card mo.</span>
        </p>
      ) : (
        <>
          <p className="mt-2 text-base text-[#33404D]">
            After it is approved, log in with your mobile number <b>{mobile}</b> and your password. You may ask the health
            center if it is already approved.
          </p>
          <p className="mt-2 text-base text-[#5B6470] italic">
            Kapag na-approve na, mag-login gamit ang mobile number mo at ang password.
          </p>
        </>
      )}

      <ol className="mt-6 text-left mx-auto max-w-sm space-y-2 text-base text-[#33404D]">
        <li className="flex gap-2"><CheckCircle2 className="text-[#1B5E20] shrink-0" size={22} /> Registration sent</li>
        <li className="flex gap-2"><Hourglass className="text-[#0B3D7A] shrink-0" size={22} /> Waiting for Admin approval</li>
        <li className="flex gap-2"><MailCheck className="text-[#8A94A6] shrink-0" size={22} /> {email ? "Email when approved, then log in" : mobile ? "Log in with your mobile number once approved" : "Get your QR card at the health center"}</li>
      </ol>

      <Link
        to="/"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-[#0B3D7A] px-8 text-lg font-semibold text-white hover:bg-[#08305F]"
      >
        Back to Home
      </Link>
    </div>
  );
}

function Section({ number, title, children }) {
  return (
    <section className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-5 sm:p-6 space-y-4">
      <h2 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-[#0B3D7A]">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B3D7A] text-white text-lg">{number}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <p className="mb-1.5 text-base font-semibold text-[#1A1A1A]">
        {label} {hint && <span className="font-normal text-sm text-[#5B6470]">({hint})</span>}
      </p>
      {children}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

function TextInput({ value, onChange, invalid, className = "", ...props }) {
  return (
    <input
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      className={`h-12 w-full rounded-xl border-2 bg-white px-4 text-lg text-[#1A1A1A] outline-none placeholder:text-[#9AA4B2]
        focus:border-[#0B3D7A] disabled:bg-[#F0F3F6] disabled:text-[#5B6470]
        ${invalid ? "border-[#C0392B]" : "border-[#D5DCE3]"} ${className}`}
    />
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm sm:text-base font-medium text-[#B03A2E]">
      {children}
    </p>
  );
}
