import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation, useOutletContext, Link } from "react-router-dom";
import axios from "axios";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { HEALTH_CENTERS } from "../../utils/healthCenters";
import { checkPassword } from "../../utils/passwordPolicy";
import FaceRegistrationField from "../../components/FaceRegistrationField";
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

const initialForm = {
  full_name: "",
  family_number: "",
  contact_number: "",
  date_of_birth: "",
  email: "",
  sex: "",
  place_of_birth: "",
  password: "",
  confirm_password: "",
  address: "",
  age: "",
  barangay_no: "",
  civil_status: "",
  health_center_id: "",
  fathers_name: "",
  mothers_name: "",
  height_cm: "",
  weight_kg: "",
  osca_pwd_no: "",
  fourps_no: "",
  religion: "",
  educational_attainment: "",
  philhealth_status: "",
  philhealth_no: "",
  philhealth_member_name: "",
  philhealth_member_dob: "",
  immunization_bcg_date: "",
  immunization_hepa_b_date: "",
  immunization_penta_1_date: "",
  immunization_opv_1_date: "",
  immunization_pcv_1_date: "",
  immunization_ipv_1_date: "",
  immunization_ipv_2_date: "",
  immunization_covid_date: "",
  immunization_penta_2_date: "",
  immunization_opv_2_date: "",
  immunization_pcv_2_date: "",
  immunization_penta_3_date: "",
  immunization_opv_3_date: "",
  immunization_pcv_3_date: "",
  immunization_mr_1_date: "",
  newborn_screening_date: "",
  newborn_screening_result: "",
  hearing_test_date: "",
  hearing_test_result: "",
  birth_order: "",
  birth_length: "",
  birth_weight: "",
  type_of_delivery: "",
  type_of_feeding: "",
  birth_attendant: "",
  place_of_delivery: "",
  vitamin_a_dose: "",
  vitamin_a_date_given: "",
  deworming_1st_dose: "",
  deworming_2nd_dose: "",
  ob_g: "",
  ob_p: "",
  menarche: "",
  pmp: "",
  lmp: "",
  edc: "",
  tt_status: "",
  td_1: "",
  td_2: "",
  td_3: "",
  td_4: "",
  td_5: "",
  face_descriptor: null,
  face_consent: false,
  terms_agreed: false,
};

const IMMUNIZATION_LEFT = [
  { key: "bcg", label: "BCG" },
  { key: "hepa_b", label: "HEPA B" },
  { key: "penta_1", label: "PENTA 1" },
  { key: "opv_1", label: "OPV 1" },
  { key: "pcv_1", label: "PCV 1" },
  { key: "ipv_1", label: "IPV 1" },
  { key: "ipv_2", label: "IPV 2" },
  { key: "covid", label: "COVID-19" },
];

const IMMUNIZATION_RIGHT = [
  { key: "penta_2", label: "PENTA 2" },
  { key: "opv_2", label: "OPV 2" },
  { key: "pcv_2", label: "PCV 2" },
  { key: "penta_3", label: "PENTA 3" },
  { key: "opv_3", label: "OPV 3" },
  { key: "pcv_3", label: "PCV 3" },
  { key: "mr_1", label: "MR 1" },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useOutletContext();
  const authHeaders = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
  // A health-center Admin can only register patients into their own center.
  const isCenterAdmin = auth?.user?.role === "Admin";
  const ownCenterId = auth?.user?.health_center_id;
  const [step, setStep] = useState(() => location.state?.resumeStep || 1);
  const [form, setForm] = useState(
    () =>
      location.state?.resumeForm || {
        ...initialForm,
        health_center_id: isCenterAdmin && ownCenterId ? String(ownCenterId) : "",
      }
  );
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [faceRequired, setFaceRequired] = useState(false); // false when facial recognition is off in Settings

  const [emailOtpStage, setEmailOtpStage] = useState("idle"); // idle | sent | verified
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpError, setEmailOtpError] = useState("");
  const [emailOtpSubmitting, setEmailOtpSubmitting] = useState(false);
  const [emailOtpSecondsLeft, setEmailOtpSecondsLeft] = useState(300);

  // Ask the server if a face is required (it is, unless Settings turned it off).
  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_BASE_URL}/face/enabled`, { headers: authHeaders })
      .then((res) => {
        if (!cancelled) setFaceRequired(Boolean(res.data?.data?.enabled));
      })
      .catch(() => {
        if (!cancelled) setFaceRequired(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const ageNum = Number(form.age);
  const showObHistory = form.sex === "Female" && Number.isFinite(ageNum) && ageNum > 0 && ageNum <= 49;

  useEffect(() => {
    if (emailOtpStage !== "sent") return;
    setEmailOtpSecondsLeft(300);
    const timer = setInterval(() => {
      setEmailOtpSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailOtpStage]);

  async function sendEmailVerificationOtp() {
    setEmailOtpError("");
    setEmailOtpSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/email/send-otp`,
        { email: form.email },
        { headers: authHeaders }
      );
      setEmailOtpStage("sent");
    } catch (err) {
      setEmailOtpError(err.response?.data?.message || "Unable to send verification code.");
    } finally {
      setEmailOtpSubmitting(false);
    }
  }

  async function handleVerifyEmailOtp(e) {
    e.preventDefault();
    setEmailOtpError("");
    if (emailOtp.length !== 6) {
      setEmailOtpError("Enter the 6-digit code.");
      return;
    }
    setEmailOtpSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/email/verify-otp`,
        {
          email: form.email,
          otp_code: emailOtp,
        },
        { headers: authHeaders }
      );
      setEmailOtpStage("verified");
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setEmailOtpError(err.response?.data?.message || "Invalid or expired code.");
    } finally {
      setEmailOtpSubmitting(false);
    }
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSelect = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = useCallback(() => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Required.";
    if (!form.date_of_birth) e.date_of_birth = "Required.";
    if (!form.email.trim()) {
      e.email = "Required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Enter a valid email.";
    }
    if (!form.sex) e.sex = "Required.";
    if (!form.password) {
      e.password = "Required.";
       } else if (checkPassword(form.password)) {
      e.password = "8+ chars: uppercase, lowercase, number, symbol.";
    }
    if (form.confirm_password !== form.password) {
      e.confirm_password = "Passwords must match.";
    }
    if (form.contact_number && form.contact_number.length !== 11) {
      e.contact_number = "Must be exactly 11 digits.";
    }
    if (!form.health_center_id) e.health_center_id = "Required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const handleNext = (e) => {
    e.preventDefault();
    if (!validateStep1()) return;
    setErrors({});
    if (emailOtpStage === "verified") {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      sendEmailVerificationOtp();
    }
  };

  const handleBack = () => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep2 = (e) => {
    e.preventDefault();
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToStep2 = () => {
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep3 = (e) => {
    e.preventDefault();
    if (showObHistory) {
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleSubmit(e);
    }
  };

  const handleBackToStep3 = () => {
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateStep4 = useCallback(() => {
    const e = {};
    if (!form.terms_agreed) e.terms_agreed = "You must agree to the Terms and Conditions and Privacy Policy.";
    if (faceRequired && (!form.face_consent || !form.face_descriptor)) {
      e.face = "A face scan with the patient's consent is required before registering.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, faceRequired]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep4()) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const immunization_records = [...IMMUNIZATION_LEFT, ...IMMUNIZATION_RIGHT]
        .map(({ key, label }) => ({
          vaccine_name: label,
          date_given: form[`immunization_${key}_date`] || null,
        }))
        .filter((record) => record.date_given);

      const payload = {
        health_center_id: Number(form.health_center_id),
        family_number: form.family_number || null,
        full_name: form.full_name,
        contact_number: form.contact_number,
        date_of_birth: form.date_of_birth,
        email: form.email,
        sex: form.sex,
        place_of_birth: form.place_of_birth,
        password: form.password,
        address: form.address,
        age: Number(form.age),
        barangay_no: form.barangay_no,
        civil_status: form.civil_status,
        fathers_name: form.fathers_name,
        mothers_name: form.mothers_name,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        osca_pwd_no: form.osca_pwd_no,
        fourps_no: form.fourps_no,
        religion: form.religion,
        educational_attainment: form.educational_attainment,
        philhealth_status: form.philhealth_status,
        philhealth_no: form.philhealth_no,
        philhealth_member_name: form.philhealth_member_name,
        philhealth_member_dob: form.philhealth_member_dob || null,
        immunization_records,
        face_descriptor: faceRequired ? form.face_descriptor : null,
        face_consent: faceRequired ? form.face_consent : false,
      };

      if (showObHistory) {
        payload.ob_history = {
          newborn_screening_date: form.newborn_screening_date || null,
          newborn_screening_result: form.newborn_screening_result,
          hearing_test_date: form.hearing_test_date || null,
          hearing_test_result: form.hearing_test_result,
          birth_order: form.birth_order,
          birth_length_cm: form.birth_length ? Number(form.birth_length) : null,
          birth_weight_kg: form.birth_weight ? Number(form.birth_weight) : null,
          type_of_delivery: form.type_of_delivery,
          type_of_feeding: form.type_of_feeding,
          birth_attendant: form.birth_attendant,
          place_of_delivery: form.place_of_delivery,
          vitamin_a_dose: form.vitamin_a_dose,
          vitamin_a_date_given: form.vitamin_a_date_given || null,
          deworming_1st_dose_date: form.deworming_1st_dose || null,
          deworming_2nd_dose_date: form.deworming_2nd_dose || null,
          gravida: form.ob_g,
          para: form.ob_p,
          menarche: form.menarche,
          pmp: form.pmp || null,
          lmp: form.lmp || null,
          edc: form.edc || null,
          tt_status: form.tt_status,
          td_1: form.td_1 || null,
          td_2: form.td_2 || null,
          td_3: form.td_3 || null,
          td_4: form.td_4 || null,
          td_5: form.td_5 || null,
        };
      }

      await axios.post(`${API_BASE_URL}/patients`, payload, {
        headers: authHeaders,
      });
      navigate("/dashboard/patients", { state: { registered: true } });
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message || "Unable to register right now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {step === 1 ? (
        <>
          <h1 className="text-2xl sm:text-4xl text-[#000000] text-center mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            ManilaCare Registration
          </h1>
          <p className="text-[#000000] font-semibold mb-6 text-sm sm:text-base" style={{ fontFamily: "'Lora', serif" }}>
            Please fill out the form to register
          </p>
        </>
      ) : step === 2 ? (
        <>
          <h1 className="text-2xl sm:text-4xl text-[#1B5E20] text-center mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            Additional Information
          </h1>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <p className="text-[#1B5E20] font-semibold text-sm sm:text-base" style={{ fontFamily: "'Lora', serif" }}>
              Please fill out the form to register (skip if no data can be provided)
            </p>
            <p className="text-[#1B5E20] font-semibold text-sm sm:text-base" style={{ fontFamily: "'Lora', serif" }}>
              PhilHealth Information
            </p>
          </div>
        </>
      ) : step === 3 ? (
        <>
          <h1 className="text-2xl sm:text-4xl text-[#1B5E20] text-center mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            Immunization History
          </h1>
          <p className="text-[#1B5E20] font-semibold mb-6 text-sm sm:text-base" style={{ fontFamily: "'Lora', serif" }}>
            Please fill out the form to register (skip if no data can be provided)
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl sm:text-4xl text-[#1B5E20] text-center mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            Newborn and Obstetric (OB) History
          </h1>
          <p className="text-[#1B5E20] font-semibold mb-6 text-sm sm:text-base" style={{ fontFamily: "'Lora', serif" }}>
            Please fill out the form to register (skip if no data can be provided)
          </p>
        </>
      )}
      <hr className="border-t border-[#1A1A1A]/60 mb-8" />

      {submitError && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-[#C97B63] bg-[#FBEAE5] text-[#8A3B27] text-sm px-4 py-3"
          style={{ fontFamily: "'Lora', serif" }}
        >
          {submitError}
        </div>
      )}

      {step === 1 && emailOtpStage === "sent" && (
        <form onSubmit={handleVerifyEmailOtp} className="max-w-md mx-auto">
          <div className="rounded-2xl bg-[#1B5E20] p-8 text-white text-center">
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Verify your email
            </h3>
            <p className="text-sm text-white/85 mb-6" style={{ fontFamily: "'Lora', serif" }}>
              We sent a 6-digit code to <span className="font-semibold">{form.email}</span>. Enter it below to continue.
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="000000"
              className="w-full rounded-full bg-[#0B3D7A] px-6 py-3.5 text-white placeholder-white/40 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-white/30 mb-3"
              style={{ fontFamily: "'Lora', serif" }}
            />

            {emailOtpError && <p className="text-sm text-red-200 mb-3">{emailOtpError}</p>}

            <div className="flex items-center justify-between text-sm mb-6" style={{ fontFamily: "'Lora', serif" }}>
              <span className="text-white/70">
                {emailOtpSecondsLeft > 0
                  ? `Code expires in ${Math.floor(emailOtpSecondsLeft / 60)}:${String(emailOtpSecondsLeft % 60).padStart(2, "0")}`
                  : "Code expired"}
              </span>
              <button
                type="button"
                onClick={sendEmailVerificationOtp}
                disabled={emailOtpSecondsLeft > 0 || emailOtpSubmitting}
                className="text-white font-semibold underline disabled:opacity-40 disabled:no-underline"
              >
                Resend Code
              </button>
            </div>

            <button
              type="submit"
              disabled={emailOtpSubmitting}
              className="w-full rounded-full bg-white text-[#1B5E20] py-3.5 font-bold hover:bg-white/90 transition-colors disabled:opacity-60 mb-3"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {emailOtpSubmitting ? "Verifying…" : "Verify Code"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEmailOtpError("");
                setEmailOtpStage("idle");
              }}
              className="text-white/80 text-sm underline hover:text-white"
            >
              Change Email
            </button>
          </div>
        </form>
      )}

      {step === 1 && emailOtpStage !== "sent" && (
        <form onSubmit={handleNext} noValidate>
          {emailOtpError && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-[#C97B63] bg-[#FBEAE5] text-[#8A3B27] text-sm px-4 py-3"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {emailOtpError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <PillInput placeholder="FULL NAME" value={form.full_name} onChange={handleChange("full_name")} error={errors.full_name} />
            <PillInput placeholder="CONTACT NUMBER" value={form.contact_number} onChange={handleChange("contact_number")} numericOnly error={errors.contact_number} />
            <PillInput type="date" placeholder="DATE OF BIRTH" value={form.date_of_birth} onChange={handleChange("date_of_birth")} error={errors.date_of_birth} />

            <PillInput type="email" placeholder="EMAIL ADDRESS" value={form.email} onChange={handleChange("email")} error={errors.email} />
            <PillDropdown placeholder="SEX" value={form.sex} onChange={handleSelect("sex")} options={["Male", "Female"]} error={errors.sex} />
            <PillInput placeholder="PLACE OF BIRTH" value={form.place_of_birth} onChange={handleChange("place_of_birth")} />

            <PillInput type="password" placeholder="PASSWORD" value={form.password} onChange={handleChange("password")} error={errors.password} />
            <PillInput placeholder="ADDRESS" value={form.address} onChange={handleChange("address")} />
            <PillInput placeholder="AGE" value={form.age} onChange={handleChange("age")} error={errors.age} numericOnly />

            <PillInput type="password" placeholder="CONFIRM PASSWORD" value={form.confirm_password} onChange={handleChange("confirm_password")} error={errors.confirm_password} />
            <PillInput placeholder="BARANGAY NO." value={form.barangay_no} onChange={handleChange("barangay_no")} numericOnly />
            <PillDropdown
              placeholder="CIVIL STATUS"
              value={form.civil_status}
              onChange={handleSelect("civil_status")}
              options={["Single", "Married", "Widowed", "Separated"]}
            />

            <PillDropdown
              placeholder="HEALTH CENTER"
              value={form.health_center_id ? HEALTH_CENTERS.find((h) => String(h.id) === form.health_center_id)?.name : ""}
              onChange={(label) => {
                const found = HEALTH_CENTERS.find((h) => h.name === label);
                handleSelect("health_center_id")(found ? String(found.id) : "");
              }}
              options={(isCenterAdmin ? HEALTH_CENTERS.filter((h) => String(h.id) === String(ownCenterId)) : HEALTH_CENTERS).map((hc) => hc.name)}
              error={errors.health_center_id}
            />
            <PillInput placeholder="FAMILY NO." value={form.family_number} onChange={handleChange("family_number")} numericOnly />
          </div>

          <div className="flex justify-center mt-10">
            <button
              type="submit"
              disabled={emailOtpSubmitting}
              className="rounded-full bg-[#1B5E20] text-white px-14 py-4 text-lg tracking-wide hover:bg-[#164D1A] transition-colors disabled:opacity-60"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {emailOtpSubmitting ? "Sending code…" : "PROCEED"}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleNextStep2} noValidate>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <PillInput placeholder="FATHER'S NAME" value={form.fathers_name} onChange={handleChange("fathers_name")} />
            <PillInput placeholder="OSCA/PWD NO." value={form.osca_pwd_no} onChange={handleChange("osca_pwd_no")} numericOnly />

            <div className="flex flex-col gap-2 justify-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.philhealth_status === "Member"}
                  onChange={() => handleSelect("philhealth_status")(form.philhealth_status === "Member" ? "" : "Member")}
                  className="h-4 w-4 accent-[#1B5E20]"
                />
                <span className="text-[#1B5E20] font-semibold text-sm" style={{ fontFamily: "'Lora', serif" }}>Member</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.philhealth_status === "Dependent"}
                  onChange={() => handleSelect("philhealth_status")(form.philhealth_status === "Dependent" ? "" : "Dependent")}
                  className="h-4 w-4 accent-[#1B5E20]"
                />
                <span className="text-[#1B5E20] font-semibold text-sm" style={{ fontFamily: "'Lora', serif" }}>Dependent</span>
              </label>
            </div>

            <PillInput placeholder="MOTHER'S NAME" value={form.mothers_name} onChange={handleChange("mothers_name")} />
            <PillInput placeholder="4PS NO." value={form.fourps_no} onChange={handleChange("fourps_no")} numericOnly />
            <PillInput placeholder="PhilHealth No." value={form.philhealth_no} onChange={handleChange("philhealth_no")} numericOnly />

            <PillInput placeholder="HEIGHT (cm)" value={form.height_cm} onChange={handleChange("height_cm")} numericOnly />
            <PillInput placeholder="RELIGION" value={form.religion} onChange={handleChange("religion")} />
            <PillInput placeholder="NAME OF MEMBER" value={form.philhealth_member_name} onChange={handleChange("philhealth_member_name")} />

            <PillInput placeholder="WEIGHT (kg)" value={form.weight_kg} onChange={handleChange("weight_kg")} numericOnly />
            <PillInput placeholder="EDUCATIONAL ATTAINMENT" value={form.educational_attainment} onChange={handleChange("educational_attainment")} />
            <PillInput type="date" placeholder="MEMBER DATE OF BIRTH" value={form.philhealth_member_dob} onChange={handleChange("philhealth_member_dob")} />
          </div>

          <div className="flex justify-center gap-4 mt-10">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full bg-white border-2 border-[#1B5E20] text-[#1B5E20] px-10 py-4 text-lg tracking-wide hover:bg-[#F0F5F0] transition-colors"
              style={{ fontFamily: "'Lora', serif" }}
            >
              BACK
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#1B5E20] text-white px-14 py-4 text-lg tracking-wide hover:bg-[#164D1A] transition-colors"
              style={{ fontFamily: "'Lora', serif" }}
            >
              PROCEED
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleNextStep3} noValidate>
          <ImmunizationTable form={form} handleChange={handleChange} />

          {!showObHistory && (
            <>
            {faceRequired && (
              <FaceRegistrationField
                descriptor={form.face_descriptor}
                consent={form.face_consent}
                error={errors.face}
                onConsent={(v) => setForm((prev) => ({ ...prev, face_consent: v, face_descriptor: v ? prev.face_descriptor : null }))}
                onCaptured={(d) => setForm((prev) => ({ ...prev, face_descriptor: d }))}
                onClear={() => setForm((prev) => ({ ...prev, face_descriptor: null }))}
              />
            )}
            <div className="mt-8 rounded-2xl bg-white/95 border border-[#1B5E20]/20 shadow-sm p-4 sm:p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.terms_agreed}
                  onChange={() => setForm((prev) => ({ ...prev, terms_agreed: !prev.terms_agreed }))}
                  className="mt-1 h-4 w-4 accent-[#1B5E20] shrink-0"
                />
                <span className="text-sm text-[#1A1A1A] leading-relaxed" style={{ fontFamily: "'Lora', serif" }}>
                  I have read and agree to the{" "}
                  <Link
                    to="/terms"
                    state={{ resumeStep: 3, resumeForm: form }}
                    className="text-[#0B3D7A] font-bold underline underline-offset-2 hover:text-[#0A3468]"
                  >
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    state={{ resumeStep: 3, resumeForm: form }}
                    className="text-[#0B3D7A] font-bold underline underline-offset-2 hover:text-[#0A3468]"
                  >
                    Privacy Policy
                  </Link>{" "}
                  of ManilaCare. I understand that my personal and sensitive health information will be collected,
                  stored, and processed securely for healthcare-related services, including consultations, records
                  management, and system improvements, in compliance with the Data Privacy Act of 2012.
                </span>
              </label>
              {errors.terms_agreed && <p className="mt-2 text-xs text-[#8A3B27] font-semibold">{errors.terms_agreed}</p>}
            </div>
            </>
          )}

          <div className="flex justify-center gap-4 mt-10">
            <button
              type="button"
              onClick={handleBackToStep2}
              className="rounded-full bg-white border-2 border-[#1B5E20] text-[#1B5E20] px-10 py-4 text-lg tracking-wide hover:bg-[#F0F5F0] transition-colors"
              style={{ fontFamily: "'Lora', serif" }}
            >
              BACK
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[#1B5E20] text-white px-14 py-4 text-lg tracking-wide hover:bg-[#164D1A] transition-colors disabled:opacity-60"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {showObHistory ? "PROCEED" : isSubmitting ? "Registering…" : "REGISTER"}
            </button>
          </div>
        </form>
      )}

      {step === 4 && (
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
            <PillFieldLabel label="NEWBORN SCREENING" />
            <PillInput type="date" placeholder="DATE DONE" value={form.newborn_screening_date} onChange={handleChange("newborn_screening_date")} />
            <PillInput placeholder="RESULT" value={form.newborn_screening_result} onChange={handleChange("newborn_screening_result")} />

            <PillFieldLabel label="HEARING TEST" />
            <PillInput type="date" placeholder="DATE DONE" value={form.hearing_test_date} onChange={handleChange("hearing_test_date")} />
            <PillInput placeholder="RESULT" value={form.hearing_test_result} onChange={handleChange("hearing_test_result")} />

            <PillInput placeholder="BIRTH ORDER" value={form.birth_order} onChange={handleChange("birth_order")} numericOnly />
            <PillInput placeholder="BIRTH LENGTH" value={form.birth_length} onChange={handleChange("birth_length")} />
            <PillInput placeholder="BIRTH WEIGHT" value={form.birth_weight} onChange={handleChange("birth_weight")} />

            <PillFieldLabel label="BIRTH ATTENDANT" />
            <PillToggleGroup value={form.birth_attendant} onChange={handleSelect("birth_attendant")} options={["SBA", "NON-SBA"]} />
            <div />

            <PillFieldLabel label="PLACE OF DELIVERY" />
            <PillToggleGroup value={form.place_of_delivery} onChange={handleSelect("place_of_delivery")} options={["FB", "NFB"]} />
            <div />

            <PillInput placeholder="TYPE OF DELIVERY" value={form.type_of_delivery} onChange={handleChange("type_of_delivery")} />
            <PillInput placeholder="TYPE OF FEEDING" value={form.type_of_feeding} onChange={handleChange("type_of_feeding")} />
            <div />

            <PillFieldLabel label="VITAMIN A" />
            <PillToggleGroup value={form.vitamin_a_dose} onChange={handleSelect("vitamin_a_dose")} options={["100K IU", "200K IU"]} />
            <PillInput type="date" placeholder="DATE GIVEN" value={form.vitamin_a_date_given} onChange={handleChange("vitamin_a_date_given")} />

            <PillFieldLabel label="DEWORMING DATE" />
            <PillInput type="date" placeholder="1ST DOSE" value={form.deworming_1st_dose} onChange={handleChange("deworming_1st_dose")} />
            <PillInput type="date" placeholder="2ND DOSE" value={form.deworming_2nd_dose} onChange={handleChange("deworming_2nd_dose")} />

            <PillFieldLabel label="OB HISTORY" />
            <PillInput placeholder="G" value={form.ob_g} onChange={handleChange("ob_g")} numericOnly />
            <PillInput placeholder="P" value={form.ob_p} onChange={handleChange("ob_p")} numericOnly />

            <div />
            <PillInput placeholder="MENARCHE" value={form.menarche} onChange={handleChange("menarche")} />
            <PillInput type="date" placeholder="PMP" value={form.pmp} onChange={handleChange("pmp")} />

            <PillInput type="date" placeholder="LMP" value={form.lmp} onChange={handleChange("lmp")} />
            <PillInput type="date" placeholder="EDC" value={form.edc} onChange={handleChange("edc")} />
            <PillInput placeholder="TT STATUS" value={form.tt_status} onChange={handleChange("tt_status")} />

            <PillInput placeholder="TD 1" value={form.td_1} onChange={handleChange("td_1")} />
            <PillInput placeholder="TD 2" value={form.td_2} onChange={handleChange("td_2")} />
            <PillInput placeholder="TD 3" value={form.td_3} onChange={handleChange("td_3")} />

            <PillInput placeholder="TD 4" value={form.td_4} onChange={handleChange("td_4")} />
            <PillInput placeholder="TD 5" value={form.td_5} onChange={handleChange("td_5")} />
          </div>

          {faceRequired && (
            <FaceRegistrationField
              descriptor={form.face_descriptor}
              consent={form.face_consent}
              error={errors.face}
              onConsent={(v) => setForm((prev) => ({ ...prev, face_consent: v, face_descriptor: v ? prev.face_descriptor : null }))}
              onCaptured={(d) => setForm((prev) => ({ ...prev, face_descriptor: d }))}
              onClear={() => setForm((prev) => ({ ...prev, face_descriptor: null }))}
            />
          )}

          <div className="mt-8 rounded-2xl bg-white/95 border border-[#1B5E20]/20 shadow-sm p-4 sm:p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.terms_agreed}
                onChange={() => setForm((prev) => ({ ...prev, terms_agreed: !prev.terms_agreed }))}
                className="mt-1 h-4 w-4 accent-[#1B5E20] shrink-0"
              />
              <span className="text-sm text-[#1A1A1A] leading-relaxed" style={{ fontFamily: "'Lora', serif" }}>
                I have read and agree to the{" "}
                <Link
                  to="/terms"
                  state={{ resumeStep: 4, resumeForm: form }}
                  className="text-[#0B3D7A] font-bold underline underline-offset-2 hover:text-[#0A3468]"
                >
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  state={{ resumeStep: 4, resumeForm: form }}
                  className="text-[#0B3D7A] font-bold underline underline-offset-2 hover:text-[#0A3468]"
                >
                  Privacy Policy
                </Link>{" "}
                of ManilaCare. I understand that my personal and sensitive health information will be collected,
                stored, and processed securely for healthcare-related services, including consultations, records
                management, and system improvements, in compliance with the Data Privacy Act of 2012.
              </span>
            </label>
            {errors.terms_agreed && <p className="mt-2 text-xs text-[#8A3B27] font-semibold">{errors.terms_agreed}</p>}
          </div>

          <div className="flex justify-center gap-4 mt-10">
            <button
              type="button"
              onClick={handleBackToStep3}
              className="rounded-full bg-white border-2 border-[#1B5E20] text-[#1B5E20] px-10 py-4 text-lg tracking-wide hover:bg-[#F0F5F0] transition-colors"
              style={{ fontFamily: "'Lora', serif" }}
            >
              BACK
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[#1B5E20] text-white px-14 py-4 text-lg tracking-wide hover:bg-[#164D1A] transition-colors disabled:opacity-60"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {isSubmitting ? "Registering…" : "REGISTER"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PillInput({ placeholder, type = "text", value, onChange, error, numericOnly = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  const handleInputChange = (e) => {
    if (numericOnly) {
      const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
      onChange({ target: { value: digitsOnly } });
    } else {
      onChange(e);
    }
  };

  return (
    <div>
      <div className="relative">
        <input
          type={numericOnly ? "text" : isPassword ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          autoComplete="off"
          inputMode={numericOnly ? "numeric" : undefined}
          className={`manilacare-pill-input w-full rounded-full border-0 px-6 py-3.5 text-center text-white placeholder-white/90 outline-none bg-[#1B5E20] focus:ring-2 focus:ring-[#0B3D7A]/40 ${
            isPassword ? "pr-12" : ""
          } ${error ? "ring-2 ring-red-400" : ""}`}
          style={{ fontFamily: "'Lora', serif" }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-white/90 hover:text-white"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-[#8A3B27] text-center">{error}</p>}

      <style>{`
        input.manilacare-pill-input:-webkit-autofill,
        input.manilacare-pill-input:-webkit-autofill:hover,
        input.manilacare-pill-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff;
          -webkit-box-shadow: 0 0 0px 1000px #1B5E20 inset;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}

function PillDropdown({ placeholder, value, onChange, options, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full rounded-full border-0 px-6 py-3.5 text-center text-white outline-none bg-[#1B5E20] focus:ring-2 focus:ring-[#0B3D7A]/40 flex items-center justify-center gap-2 hover:bg-[#164D1A] transition-colors ${
          error ? "ring-2 ring-red-400" : ""
        }`}
        style={{ fontFamily: "'Lora', serif" }}
      >
        <span className={value ? "" : "text-white/90"}>{value || placeholder}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute z-20 mt-2 w-full rounded-2xl bg-[#164D1A] shadow-lg overflow-hidden border border-[#0B3D7A]/20"
          style={{ fontFamily: "'Lora', serif" }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-center px-6 py-3 text-white hover:bg-[#0B3D7A] transition-colors ${
                opt === value ? "bg-[#0B3D7A]" : ""
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-[#8A3B27] text-center">{error}</p>}
    </div>
  );
}

function ImmunizationTable({ form, handleChange }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#1B5E20]">
      <table className="w-full min-w-[640px] border-collapse text-center text-white" style={{ fontFamily: "'Lora', serif" }}>
        <thead>
          <tr className="bg-[#1B5E20]">
            <th className="border border-white/20 px-4 py-3 font-bold">VACCINE</th>
            <th className="border border-white/20 px-4 py-3 font-bold">DATE GIVEN</th>
            <th className="border border-white/20 px-4 py-3 font-bold">VACCINE</th>
            <th className="border border-white/20 px-4 py-3 font-bold">DATE GIVEN</th>
          </tr>
        </thead>
        <tbody>
          {IMMUNIZATION_LEFT.map((left, i) => {
            const right = IMMUNIZATION_RIGHT[i];
            return (
              <tr key={left.key} className="bg-[#1B5E20]">
                <td className="border border-white/20 px-4 py-3 font-semibold">{left.label}</td>
                <td className="border border-white/20 px-2 py-2">
                  <input
                    type="date"
                    value={form[`immunization_${left.key}_date`]}
                    onChange={handleChange(`immunization_${left.key}_date`)}
                    className="w-full bg-transparent text-white text-center outline-none [color-scheme:dark]"
                  />
                </td>
                {right ? (
                  <>
                    <td className="border border-white/20 px-4 py-3 font-semibold">{right.label}</td>
                    <td className="border border-white/20 px-2 py-2">
                      <input
                        type="date"
                        value={form[`immunization_${right.key}_date`]}
                        onChange={handleChange(`immunization_${right.key}_date`)}
                        className="w-full bg-transparent text-white text-center outline-none [color-scheme:dark]"
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border border-white/20" />
                    <td className="border border-white/20" />
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PillFieldLabel({ label }) {
  return (
    <div className="flex items-center px-2">
      <span className="text-[#1B5E20] font-bold text-sm sm:text-base" style={{ fontFamily: "'Lora', serif" }}>
        {label}
      </span>
    </div>
  );
}

function PillToggleGroup({ value, onChange, options }) {
  return (
    <div className="flex gap-3">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? "" : opt)}
          className={`flex-1 rounded-full border-0 px-4 py-3.5 text-center text-white outline-none transition-colors ${
            value === opt ? "bg-[#0B3D7A]" : "bg-[#1B5E20] hover:bg-[#164D1A]"
          }`}
          style={{ fontFamily: "'Lora', serif" }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}