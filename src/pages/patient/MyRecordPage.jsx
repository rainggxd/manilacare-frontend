import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Lock } from "lucide-react";
import VaccineHistoryCard from "../../components/VaccineHistoryCard";
import LabResultsCard from "../../components/LabResultsCard";
import { useConfirm } from "../../components/ConfirmDialog";
import SearchableSelect from "../../components/SearchableSelect";

/**
 * Patient: "My Personal Record".
 *
 * Sign-up only asks for the basics so it stays easy. After approval the
 * patient completes the rest here: contact and personal details, 4Ps,
 * OSCA/PWD, PhilHealth, blood type, medical and family history, and the
 * vaccines they already received.
 *
 * Name, birthday, sex, email and health center are shown but locked:
 * the health center manages those.
 *
 * Built for older users: big labels and boxes, one save button.
 */

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const CIVIL_STATUS = ["Single", "Married", "Widowed", "Separated"];
const EDUCATION = [
  "No formal schooling",
  "Elementary",
  "High School",
  "Senior High School",
  "Vocational",
  "College",
  "Post-graduate",
];
// The fields the patient can edit (same list as the backend).
const EDITABLE = [
  "contact_number",
  "address",
  "barangay_no",
  "place_of_birth",
  "civil_status",
  "religion",
  "educational_attainment",
  "occupation",
  "fathers_name",
  "mothers_name",
  "osca_pwd_no",
  "fourps_no",
  "philhealth_status",
  "philhealth_no",
  "philhealth_member_name",
  "philhealth_member_dob",
  "blood_type",
  "allergies",
  "past_illnesses",
  "past_surgeries",
  "maintenance_medications",
  "family_history",
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}

export default function MyRecordPage() {
  const confirm = useConfirm();
  const { auth } = useOutletContext();
  const headers = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [patient, setPatient] = useState(null);
  const [centerName, setCenterName] = useState("");
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: "", text: "" });
  const [errors, setErrors] = useState({});


  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [meRes, centersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/patients/me`, { headers }),
          axios.get(`${API_BASE_URL}/health-centers`, { headers }),
        ]);
        if (cancelled) return;
        const me = meRes.data?.data ?? {};
        setPatient(me);
        const values = {};
        EDITABLE.forEach((key) => {
          values[key] = me[key] ?? "";
        });
        setForm(values);
        const center = (centersRes.data?.data ?? []).find((c) => String(c.id) === String(me.health_center_id));
        setCenterName(center?.center_name ?? "");
      } catch {
        if (!cancelled) setLoadError("Unable to load your record right now. Please refresh the page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSaveMessage({ type: "", text: "" });
  }

  async function handleSave(event) {
    event.preventDefault();
    if (form.contact_number && !/^09\d{9}$/.test(form.contact_number)) {
      setErrors({ contact_number: "Use 11 digits starting with 09 (example: 09171234567)." });
      setSaveMessage({ type: "error", text: "Please fix the box marked in red." });
      return;
    }
    const ok = await confirm({ title: "Save your personal record?", message: "Please check your answers before saving.", confirmText: "Yes, save" });
    if (!ok) return;
    setSaving(true);
    setSaveMessage({ type: "", text: "" });
    try {
      const res = await axios.put(`${API_BASE_URL}/patients/me`, form, { headers });
      setPatient((prev) => ({ ...prev, ...form }));
      setErrors({});
      setSaveMessage({ type: "ok", text: res.data?.message || "Saved." });
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {});
      setSaveMessage({
        type: "error",
        text: err.response?.data?.message || "Unable to save right now. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-lg text-[#5B6470]">Loading your record…</p>;
  if (loadError) return <p className="text-lg text-[#8A3B27]">{loadError}</p>;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full">
      <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold">My Personal Record</h2>
      <p className="mt-1 text-base sm:text-lg text-[#33404D]">
        Please complete your details. This helps the health center take care of you.
      </p>
      <p className="text-sm sm:text-base text-[#5B6470] italic">
        Kumpletuhin ang iyong impormasyon para mas maalagaan ka ng health center.
      </p>

      {/* Locked basics */}
      <Section title="Basic information">
        <p className="flex items-center gap-2 text-sm sm:text-base text-[#5B6470] -mt-1">
          <Lock size={16} aria-hidden="true" /> To change these, please ask the health center.
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3">
          <ReadOnly label="Full name" value={patient?.full_name} />
          <ReadOnly label="Health center" value={centerName} />
          <ReadOnly label="Birthday" value={formatDate(patient?.date_of_birth)} />
          <ReadOnly label="Age / Sex" value={[patient?.age && `${patient.age} years old`, patient?.sex].filter(Boolean).join(" / ")} />
          <ReadOnly label="Email" value={patient?.email} />
          <ReadOnly label="Family number" value={patient?.family_number} />
        </dl>
      </Section>

      <form onSubmit={handleSave} noValidate>
        {/* Two columns on wide screens so the page does not look empty */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 items-start">
        <div>
        <Section title="Contact and address">
          <Field label="Mobile number" error={errors.contact_number}>
            <TextInput
              inputMode="numeric"
              maxLength={11}
              value={form.contact_number}
              onChange={(v) => update("contact_number", v.replace(/\D/g, ""))}
              placeholder="09171234567"
              invalid={Boolean(errors.contact_number)}
            />
          </Field>
          <Field label="Home address" error={errors.address}>
            <TextInput value={form.address} onChange={(v) => update("address", v)} placeholder="House no., street, barangay, Tondo, Manila" />
          </Field>
          <Field label="Barangay number" error={errors.barangay_no}>
            <TextInput value={form.barangay_no} onChange={(v) => update("barangay_no", v)} placeholder="Example: 105" />
          </Field>
        </Section>

        <Section title="Personal details">
          <Field label="Civil status" error={errors.civil_status}>
            <ChoiceButtons options={CIVIL_STATUS} value={form.civil_status} onChange={(v) => update("civil_status", v)} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Place of birth" error={errors.place_of_birth}>
              <TextInput value={form.place_of_birth} onChange={(v) => update("place_of_birth", v)} placeholder="Manila" />
            </Field>
            <Field label="Religion" error={errors.religion}>
              <TextInput value={form.religion} onChange={(v) => update("religion", v)} placeholder="Roman Catholic" />
            </Field>
          </div>
          <Field label="Highest school finished" error={errors.educational_attainment}>
            <SelectInput
              value={form.educational_attainment}
              onChange={(v) => update("educational_attainment", v)}
              options={EDUCATION.includes(form.educational_attainment) || !form.educational_attainment
                ? EDUCATION
                : [form.educational_attainment, ...EDUCATION]}
            />
          </Field>
          <Field label="Work / Occupation" error={errors.occupation}>
            <TextInput value={form.occupation} onChange={(v) => update("occupation", v)} placeholder="Example: Vendor, Retired, Housewife" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Father's name" error={errors.fathers_name}>
              <TextInput value={form.fathers_name} onChange={(v) => update("fathers_name", v)} />
            </Field>
            <Field label="Mother's name" error={errors.mothers_name}>
              <TextInput value={form.mothers_name} onChange={(v) => update("mothers_name", v)} />
            </Field>
          </div>
        </Section>

        </div>
        <div>
        <Section title="Benefits and IDs">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="4Ps number" hint="If you are a 4Ps member" error={errors.fourps_no}>
              <TextInput value={form.fourps_no} onChange={(v) => update("fourps_no", v)} />
            </Field>
            <Field label="Senior Citizen (OSCA) / PWD ID number" error={errors.osca_pwd_no}>
              <TextInput value={form.osca_pwd_no} onChange={(v) => update("osca_pwd_no", v)} />
            </Field>
          </div>
          <Field label="PhilHealth" hint="Leave blank if you have no PhilHealth" error={errors.philhealth_status}>
            <ChoiceButtons
              options={["Member", "Dependent"]}
              value={form.philhealth_status}
              onChange={(v) => update("philhealth_status", v)}
            />
          </Field>
          {form.philhealth_status && (
            <Field label="PhilHealth number" error={errors.philhealth_no}>
              <TextInput value={form.philhealth_no} onChange={(v) => update("philhealth_no", v)} placeholder="12-345678901-2" />
            </Field>
          )}
          {form.philhealth_status === "Dependent" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name of the PhilHealth member" error={errors.philhealth_member_name}>
                <TextInput value={form.philhealth_member_name} onChange={(v) => update("philhealth_member_name", v)} />
              </Field>
              <Field label="Member's birthday" error={errors.philhealth_member_dob}>
                <TextInput type="date" max={today} value={form.philhealth_member_dob} onChange={(v) => update("philhealth_member_dob", v)} />
              </Field>
            </div>
          )}
        </Section>

        <Section title="Medical history">
          <Field label="Blood type" error={errors.blood_type}>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {BLOOD_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={form.blood_type === type}
                  onClick={() => update("blood_type", form.blood_type === type ? "" : type)}
                  aria-label={type === "Unknown" ? "Blood type not known" : `Blood type ${type}`}
                  className={`h-12 rounded-xl border-2 text-base sm:text-lg font-bold transition-colors ${
                    form.blood_type === type
                      ? "border-[#8A3B27] bg-[#8A3B27] text-white"
                      : "border-[#D5DCE3] bg-white text-[#1A1A1A] hover:border-[#8A3B27]/50"
                  }`}
                >
                  {type === "Unknown" ? "---" : type}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Allergies" hint="Food, medicine, or others" error={errors.allergies}>
            <TextArea value={form.allergies} onChange={(v) => update("allergies", v)} placeholder="Example: Penicillin, shrimp. Type 'None' if you have none." />
          </Field>
          <Field label="Medicines you take every day" error={errors.maintenance_medications}>
            <TextArea value={form.maintenance_medications} onChange={(v) => update("maintenance_medications", v)} placeholder="Example: Amlodipine 5mg once a day" />
          </Field>
          <Field label="Past illnesses" error={errors.past_illnesses}>
            <TextArea value={form.past_illnesses} onChange={(v) => update("past_illnesses", v)} placeholder="Example: Asthma, Tuberculosis (2019)" />
          </Field>
          <Field label="Past operations or hospital stays" error={errors.past_surgeries}>
            <TextArea value={form.past_surgeries} onChange={(v) => update("past_surgeries", v)} />
          </Field>
          <Field label="Illnesses in the family" hint="Parents, brothers, sisters" error={errors.family_history}>
            <TextArea value={form.family_history} onChange={(v) => update("family_history", v)} placeholder="Example: High blood (father), Diabetes (mother)" />
          </Field>
        </Section>

        </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 sm:mx-0 mt-6 border-t sm:border sm:rounded-2xl border-[#E3E8EF] bg-white/95 backdrop-blur px-4 py-4 sm:p-5 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          {saveMessage.text && (
            <p
              role="status"
              className={`mb-3 flex items-center gap-2 rounded-xl px-4 py-3 text-base font-medium ${
                saveMessage.type === "ok" ? "bg-[#EAF6EC] text-[#1B5E20]" : "bg-[#FBEAE5] text-[#8A3B27]"
              }`}
            >
              {saveMessage.type === "ok" && <CheckCircle2 size={20} aria-hidden="true" />}
              {saveMessage.text}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full h-14 rounded-xl bg-[#1B5E20] text-lg font-bold text-white hover:bg-[#164D1A] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save My Record"}
          </button>
        </div>
      </form>

      <VaccineHistoryCard records={patient?.immunization_records} headers={headers} />
      <div className="mt-6">
        <LabResultsCard auth={auth} readOnly />
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="mt-6 rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-5 sm:p-6 space-y-4">
      <h3 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-[#0B3D7A]">
        {Icon && <Icon size={24} aria-hidden="true" />}
        {title}
      </h3>
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
      {error && (
        <p role="alert" className="mt-1.5 text-sm sm:text-base font-medium text-[#B03A2E]">
          {error}
        </p>
      )}
    </div>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <dt className="text-sm text-[#5B6470]">{label}</dt>
      <dd className="text-base sm:text-lg font-semibold text-[#1A1A1A]">{value || "—"}</dd>
    </div>
  );
}

const boxClass = (invalid) =>
  `w-full rounded-xl border-2 bg-white px-4 text-lg text-[#1A1A1A] outline-none placeholder:text-[#9AA4B2] focus:border-[#0B3D7A] ${
    invalid ? "border-[#C0392B]" : "border-[#D5DCE3]"
  }`;

function TextInput({ value, onChange, invalid, className = "", ...props }) {
  return (
    <input
      {...props}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      className={`h-12 ${boxClass(invalid)} ${className}`}
    />
  );
}

function TextArea({ value, onChange, ...props }) {
  return (
    <textarea
      {...props}
      rows={2}
      maxLength={1000}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`py-3 resize-y ${boxClass(false)}`}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <SearchableSelect
      big
      emptyLabel="Choose…"
      options={options.map((o) => ({ value: o, label: o }))}
      value={value ?? ""}
      onChange={onChange}
    />
  );
}

function ChoiceButtons({ options, value, onChange }) {
  return (
    <div className={`grid gap-2 ${options.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(value === option ? "" : option)}
          className={`h-12 rounded-xl border-2 text-base font-semibold transition-colors ${
            value === option
              ? "border-[#1B5E20] bg-[#1B5E20] text-white"
              : "border-[#D5DCE3] bg-white text-[#1A1A1A] hover:border-[#1B5E20]/50"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
