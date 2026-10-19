import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../utils/healthCenters";
import FaceEnrollmentCard from "../../components/FaceEnrollmentCard";
import MedicalBackgroundCard from "../../components/MedicalBackgroundCard";
import CheckupHistoryCard from "../../components/CheckupHistoryCard";
import PatientPhoto from "../../components/PatientPhoto";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";


function show(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function showDate(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

const OB_FIELDS = [
  { label: "Newborn Screening Date", key: "newborn_screening_date", date: true },
  { label: "Newborn Screening Result", key: "newborn_screening_result" },
  { label: "Hearing Test Date", key: "hearing_test_date", date: true },
  { label: "Hearing Test Result", key: "hearing_test_result" },
  { label: "Birth Order", key: "birth_order" },
  { label: "Birth Length (cm)", key: "birth_length_cm" },
  { label: "Birth Weight (kg)", key: "birth_weight_kg" },
  { label: "Type of Delivery", key: "type_of_delivery" },
  { label: "Type of Feeding", key: "type_of_feeding" },
  { label: "Birth Attendant", key: "birth_attendant" },
  { label: "Place of Delivery", key: "place_of_delivery" },
  { label: "Vitamin A Dose", key: "vitamin_a_dose" },
  { label: "Vitamin A Date Given", key: "vitamin_a_date_given", date: true },
  { label: "Deworming 1st Dose", key: "deworming_1st_dose_date", date: true },
  { label: "Deworming 2nd Dose", key: "deworming_2nd_dose_date", date: true },
  { label: "Gravida (G)", key: "gravida" },
  { label: "Para (P)", key: "para" },
  { label: "Menarche", key: "menarche" },
  { label: "PMP", key: "pmp", date: true },
  { label: "LMP", key: "lmp", date: true },
  { label: "EDC", key: "edc", date: true },
  { label: "TT Status", key: "tt_status" },
  { label: "TD 1", key: "td_1", date: true },
  { label: "TD 2", key: "td_2", date: true },
  { label: "TD 3", key: "td_3", date: true },
  { label: "TD 4", key: "td_4", date: true },
  { label: "TD 5", key: "td_5", date: true },
];

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>
        {label}
      </p>
      <p className="text-[#1A1A1A]" style={{ fontFamily: "'Lora', serif" }}>
        {value}
      </p>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
      <h3 className="text-lg font-bold text-[#1B5E20] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </div>
  );
}

/**
 * Staff-facing patient profile. Shows the basic profile so front-desk
 * staff can confirm identity, and lets them register or update the
 * patient's face for check-in verification. Diagnosis and prescriptions
 * are handled in the Doctor portal.
 */
export default function StaffPatientDetailPage() {
  const { auth } = useOutletContext();
  const { id } = useParams();
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
        if (!cancelled) setPatient(response.data?.data ?? null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.message || "Unable to load this patient right now.");
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

  const immunizations = patient?.immunization_records ?? [];
  const ob = patient?.ob_history ?? null;

  return (
    <div>
      <Link
        to="/staff/records"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B3D7A] hover:underline mb-4"
        style={{ fontFamily: "'Lora', serif" }}
      >
        <ArrowLeft size={16} />
        Back to Patient Records
      </Link>

      {isLoading && (
        <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>Loading…</p>
      )}

      {!isLoading && loadError && (
        <div
          role="alert"
          className="rounded-2xl border border-[#C97B63] bg-[#FBEAE5] text-[#8A3B27] text-sm px-4 py-3"
          style={{ fontFamily: "'Lora', serif" }}
        >
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && patient && (
        <>
          <div className="flex items-center gap-5 flex-wrap mb-6">
            <PatientPhoto
              patient={patient}
              auth={auth}
              size={112}
              editable
              onUpdated={(photo) => setPatient((prev) => ({ ...prev, photo }))}
            />
            <div>
              <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                {patient.full_name}
              </h2>
              <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
                Family No. {show(patient.family_number)} · {healthCenterName(patient.health_center_id)}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <FaceEnrollmentCard patient={patient} auth={auth} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Basic Information">
              <Field label="Full Name" value={show(patient.full_name)} />
              <Field label="Sex" value={show(patient.sex)} />
              <Field label="Date of Birth" value={showDate(patient.date_of_birth)} />
              <Field label="Age" value={show(patient.age)} />
              <Field label="Civil Status" value={show(patient.civil_status)} />
              <Field label="Place of Birth" value={show(patient.place_of_birth)} />
              <Field label="Religion" value={show(patient.religion)} />
              <Field label="Educational Attainment" value={show(patient.educational_attainment)} />
              <Field label="Height (cm)" value={show(patient.height_cm)} />
              <Field label="Weight (kg)" value={show(patient.weight_kg)} />
            </Card>

            <Card title="Contact and Address">
              <Field label="Contact No." value={show(patient.contact_number)} />
              <Field label="Email" value={show(patient.email)} />
              <Field label="Address" value={show(patient.address)} />
              <Field label="Barangay No." value={show(patient.barangay_no)} />
              <Field label="Health Center" value={healthCenterName(patient.health_center_id)} />
            </Card>

            <Card title="Family Background">
              <Field label="Father's Name" value={show(patient.fathers_name)} />
              <Field label="Mother's Name" value={show(patient.mothers_name)} />
            </Card>

            <Card title="PhilHealth and IDs">
              <Field label="PhilHealth Status" value={show(patient.philhealth_status)} />
              <Field label="PhilHealth No." value={show(patient.philhealth_no)} />
              <Field label="Name of Member" value={show(patient.philhealth_member_name)} />
              <Field label="Member Date of Birth" value={showDate(patient.philhealth_member_dob)} />
              <Field label="OSCA/PWD No." value={show(patient.osca_pwd_no)} />
              <Field label="4Ps No." value={show(patient.fourps_no)} />
            </Card>
          </div>

          <div className="mt-6">
            <MedicalBackgroundCard
              patient={patient}
              auth={auth}
              onSaved={(changes) => setPatient((prev) => ({ ...prev, ...changes }))}
            />
            <CheckupHistoryCard patientId={patient.id} auth={auth} />
          </div>

          <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
            <h3 className="text-lg font-bold text-[#1B5E20] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Immunization History
            </h3>
            {immunizations.length === 0 ? (
              <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>
                No immunization records on file.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#0B3D7A]/10">
                <table className="w-full text-left" style={{ fontFamily: "'Lora', serif" }}>
                  <thead>
                    <tr className="bg-[#F7F5F1] text-[#1A1A1A]">
                      <th className="px-4 py-2 font-bold">Vaccine</th>
                      <th className="px-4 py-2 font-bold">Date Given</th>
                    </tr>
                  </thead>
                  <tbody>
                    {immunizations.map((rec) => (
                      <tr key={rec.id ?? `${rec.vaccine_name}-${rec.date_given}`} className="border-t border-[#0B3D7A]/10">
                        <td className="px-4 py-2">{show(rec.vaccine_name)}</td>
                        <td className="px-4 py-2">{showDate(rec.date_given)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {ob && (
            <div className="mt-6">
              <Card title="Newborn and OB History">
                {OB_FIELDS.map((f) => (
                  <Field key={f.key} label={f.label} value={f.date ? showDate(ob[f.key]) : show(ob[f.key])} />
                ))}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}