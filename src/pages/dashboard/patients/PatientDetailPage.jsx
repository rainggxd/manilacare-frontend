import { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../../utils/healthCenters";
import FaceEnrollmentCard from "../../../components/FaceEnrollmentCard";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";


function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useOutletContext();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPatient() {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await axios.get(`${API_BASE_URL}/patients/${id}`, {
          headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
        });
        if (!cancelled) setPatient(response.data?.data ?? response.data ?? null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err?.response?.status === 404
              ? "Patient not found."
              : "Unable to load this patient right now."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPatient();
    return () => {
      cancelled = true;
    };
  }, [id, auth?.token]);

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/dashboard/records")}
        aria-label="Back to Patient Records"
        className="mb-6 text-[#1B5E20] hover:text-[#0B3D7A] transition-colors flex items-center gap-1"
        style={{ fontFamily: "'Lora', serif" }}
      >
        <ChevronLeft size={20} />
        Back to Patient Records
      </button>

      {isLoading && (
        <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>Loading…</p>
      )}

      {!isLoading && loadError && (
        <div className="rounded-2xl border border-[#8A3B27]/30 bg-[#FBEAE5] text-[#8A3B27] px-5 py-4" style={{ fontFamily: "'Lora', serif" }}>
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && patient && (
        <div className="max-w-6xl space-y-5">
          <h2 className="text-3xl font-bold text-[#1B5E20]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {patient.full_name}
          </h2>

          <FaceEnrollmentCard patient={patient} auth={auth} canRemove />

          <Section title="Basic Information">
            <InfoField label="Age" value={patient.age} />
            <InfoField label="Sex" value={patient.sex} />
            <InfoField label="Date of Birth" value={formatDate(patient.date_of_birth)} />
            <InfoField label="Place of Birth" value={patient.place_of_birth} />
            <InfoField label="Civil Status" value={patient.civil_status} />
            <InfoField label="Contact Number" value={patient.contact_number} />
            <InfoField label="Email" value={patient.email} />
            <InfoField label="Address" value={patient.address} />
            <InfoField label="Barangay No." value={patient.barangay_no} />
            <InfoField label="Health Center" value={healthCenterName(patient.health_center_id)} />
            <InfoField label="Family No." value={patient.family_number} />
            <InfoField label="Registered" value={formatDate(patient.created_at)} />
          </Section>

          <Section title="Family | Background">
            <InfoField label="Father's Name" value={patient.fathers_name} />
            <InfoField label="Mother's Name" value={patient.mothers_name} />
            <InfoField label="Religion" value={patient.religion} />
            <InfoField label="Educational Attainment" value={patient.educational_attainment} />
            <InfoField label="OSCA/PWD No." value={patient.osca_pwd_no} />
            <InfoField label="4Ps No." value={patient.fourps_no} />
          </Section>

          <Section title="Physical">
            <InfoField label="Height (cm)" value={patient.height_cm} />
            <InfoField label="Weight (kg)" value={patient.weight_kg} />
          </Section>

          <Section title="PhilHealth Information">
            <InfoField label="Status" value={patient.philhealth_status} />
            <InfoField label="PhilHealth No." value={patient.philhealth_no} />
            <InfoField label="Member Name" value={patient.philhealth_member_name} />
            <InfoField label="Member Date of Birth" value={formatDate(patient.philhealth_member_dob)} />
          </Section>

          {Array.isArray(patient.immunization_records) && patient.immunization_records.length > 0 && (
            <Section title="Immunization History">
              <div className="col-span-2 overflow-x-auto -mt-2">
                <table className="w-full min-w-[400px] border-collapse text-sm">
                  <thead>
                    <tr className="text-white/70">
                      <th className="text-left font-normal pb-2 pr-4">Vaccine</th>
                      <th className="text-left font-normal pb-2">Date Given</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.immunization_records.map((rec, i) => (
                      <tr key={i} className="border-t border-white/10">
                        <td className="py-2 pr-4">{rec.vaccine_name}</td>
                        <td className="py-2">{formatDate(rec.date_given)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {patient.ob_history && (
            <Section title="Newborn and OB History">
              <InfoField label="Newborn Screening" value={patient.ob_history.newborn_screening_result} sub={formatDate(patient.ob_history.newborn_screening_date)} />
              <InfoField label="Hearing Test" value={patient.ob_history.hearing_test_result} sub={formatDate(patient.ob_history.hearing_test_date)} />
              <InfoField label="Birth Order" value={patient.ob_history.birth_order} />
              <InfoField label="Birth Length" value={patient.ob_history.birth_length} />
              <InfoField label="Birth Weight" value={patient.ob_history.birth_weight} />
              <InfoField label="Type of Delivery" value={patient.ob_history.type_of_delivery} />
              <InfoField label="Type of Feeding" value={patient.ob_history.type_of_feeding} />
              <InfoField label="Birth Attendant" value={patient.ob_history.birth_attendant} />
              <InfoField label="Place of Delivery" value={patient.ob_history.place_of_delivery} />
              <InfoField label="Vitamin A" value={patient.ob_history.vitamin_a_dose} sub={formatDate(patient.ob_history.vitamin_a_date_given)} />
              <InfoField label="Deworming (1st / 2nd)" value={`${formatDate(patient.ob_history.deworming_1st_dose)} / ${formatDate(patient.ob_history.deworming_2nd_dose)}`} />
              <InfoField label="G / P" value={`${patient.ob_history.ob_g ?? "—"} / ${patient.ob_history.ob_p ?? "—"}`} />
              <InfoField label="Menarche" value={patient.ob_history.menarche} />
              <InfoField label="PMP" value={formatDate(patient.ob_history.pmp)} />
              <InfoField label="LMP" value={formatDate(patient.ob_history.lmp)} />
              <InfoField label="EDC" value={formatDate(patient.ob_history.edc)} />
              <InfoField label="TT Status" value={patient.ob_history.tt_status} />
              <InfoField label="TD 1–5" value={[patient.ob_history.td_1, patient.ob_history.td_2, patient.ob_history.td_3, patient.ob_history.td_4, patient.ob_history.td_5].filter(Boolean).join(", ") || "—"} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl bg-[#1B5E20]/95 text-white p-6">
      <h3 className="text-lg font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm" style={{ fontFamily: "'Lora', serif" }}>
        {children}
      </dl>
    </div>
  );
}

function InfoField({ label, value, sub }) {
  return (
    <div>
      <dt className="text-white/70">{label}</dt>
      <dd>
        {value || value === 0 ? value : "—"}
        {sub && sub !== "—" ? <span className="text-white/70"> ({sub})</span> : null}
      </dd>
    </div>
  );
}