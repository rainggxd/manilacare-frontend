import { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { ChevronLeft, Syringe } from "lucide-react";
import axios from "axios";
import { healthCenterName } from "../../utils/healthCenters";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";


function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function InfoCard({ title, children }) {
  return (
    <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm" style={{ fontFamily: "'Lora', serif" }}>
        {children}
      </dl>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <dt className="text-[#8A8578] text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-[#1A1A1A] font-semibold">{value || value === 0 ? value : "—"}</dd>
    </div>
  );
}

export default function DoctorPatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPatient() {
      setIsLoading(true);
      setLoadError("");
      try {
        const res = await axios.get(`${API_BASE_URL}/patients/${id}`, { headers: authHeader });
        if (!cancelled) setPatient(res.data?.data ?? res.data ?? null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err?.response?.status === 404 ? "Patient not found." : "Unable to load this patient right now."
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) {
    return <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>Loading…</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-[#8A3B27]/30 bg-[#FBEAE5] text-[#8A3B27] px-5 py-4" style={{ fontFamily: "'Lora', serif" }}>
        {loadError}
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="max-w-5xl">
      <button
        type="button"
        onClick={() => navigate("/doctor/records")}
        className="mb-6 text-[#0B3D7A] hover:text-[#092E5C] transition-colors flex items-center gap-1 text-sm font-semibold"
        style={{ fontFamily: "'Lora', serif" }}
      >
        <ChevronLeft size={18} />
        Back to Patient Records
      </button>

      {/* Patient header card */}
      <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {patient.full_name}
          </h2>
          <p className="text-sm text-[#5B6470] mt-1" style={{ fontFamily: "'Lora', serif" }}>
            {patient.age} yrs · {patient.sex} · {healthCenterName(patient.health_center_id)}
          </p>
        </div>
        <div className="flex gap-6 text-sm" style={{ fontFamily: "'Lora', serif" }}>
          <div>
            <p className="text-[#8A8578] text-xs uppercase tracking-wide">Family No.</p>
            <p className="font-semibold text-[#1A1A1A]">{patient.family_number || "—"}</p>
          </div>
          <div>
            <p className="text-[#8A8578] text-xs uppercase tracking-wide">Contact</p>
            <p className="font-semibold text-[#1A1A1A]">{patient.contact_number || "—"}</p>
          </div>
          <div>
            <p className="text-[#8A8578] text-xs uppercase tracking-wide">Registered</p>
            <p className="font-semibold text-[#1A1A1A]">{formatDate(patient.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Basic info */}
      <InfoCard title="Basic Information">
        <InfoField label="Date of Birth" value={formatDate(patient.date_of_birth)} />
        <InfoField label="Place of Birth" value={patient.place_of_birth} />
        <InfoField label="Civil Status" value={patient.civil_status} />
        <InfoField label="Email" value={patient.email} />
        <InfoField label="Address" value={patient.address} />
        <InfoField label="Barangay No." value={patient.barangay_no} />
      </InfoCard>

      {/* Family / Background */}
      <InfoCard title="Family | Background">
        <InfoField label="Father's Name" value={patient.fathers_name} />
        <InfoField label="Mother's Name" value={patient.mothers_name} />
        <InfoField label="Religion" value={patient.religion} />
        <InfoField label="Educational Attainment" value={patient.educational_attainment} />
        <InfoField label="OSCA/PWD No." value={patient.osca_pwd_no} />
        <InfoField label="4Ps No." value={patient.fourps_no} />
      </InfoCard>

      {/* Physical + PhilHealth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-6">
        <InfoCard title="Physical">
          <InfoField label="Height (cm)" value={patient.height_cm} />
          <InfoField label="Weight (kg)" value={patient.weight_kg} />
        </InfoCard>

        <InfoCard title="PhilHealth Information">
          <InfoField label="Status" value={patient.philhealth_status} />
          <InfoField label="PhilHealth No." value={patient.philhealth_no} />
          <InfoField label="Member Name" value={patient.philhealth_member_name} />
          <InfoField label="Member DOB" value={formatDate(patient.philhealth_member_dob)} />
        </InfoCard>
      </div>

      {/* Immunization History */}
      {Array.isArray(patient.immunization_records) && patient.immunization_records.length > 0 && (
        <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Syringe size={18} className="text-[#0B3D7A]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Immunization History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] border-collapse text-sm" style={{ fontFamily: "'Lora', serif" }}>
              <thead>
                <tr className="text-[#8A8578]">
                  <th className="text-left font-normal pb-2 pr-4">Vaccine</th>
                  <th className="text-left font-normal pb-2">Date Given</th>
                </tr>
              </thead>
              <tbody>
                {patient.immunization_records.map((rec, i) => (
                  <tr key={i} className="border-t border-[#0B3D7A]/10">
                    <td className="py-2 pr-4 text-[#1A1A1A]">{rec.vaccine_name}</td>
                    <td className="py-2 text-[#5B6470]">{formatDate(rec.date_given)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OB History */}
      {patient.ob_history && (
        <InfoCard title="Newborn and OB History">
          <InfoField label="Newborn Screening" value={patient.ob_history.newborn_screening_result} />
          <InfoField label="Hearing Test" value={patient.ob_history.hearing_test_result} />
          <InfoField label="Birth Order" value={patient.ob_history.birth_order} />
          <InfoField label="Birth Length" value={patient.ob_history.birth_length} />
          <InfoField label="Birth Weight" value={patient.ob_history.birth_weight} />
          <InfoField label="Type of Delivery" value={patient.ob_history.type_of_delivery} />
          <InfoField label="Type of Feeding" value={patient.ob_history.type_of_feeding} />
          <InfoField label="Birth Attendant" value={patient.ob_history.birth_attendant} />
          <InfoField label="Place of Delivery" value={patient.ob_history.place_of_delivery} />
          <InfoField label="G / P" value={`${patient.ob_history.ob_g ?? "—"} / ${patient.ob_history.ob_p ?? "—"}`} />
          <InfoField label="Menarche" value={patient.ob_history.menarche} />
          <InfoField label="TT Status" value={patient.ob_history.tt_status} />
        </InfoCard>
      )}
    </div>
  );
}