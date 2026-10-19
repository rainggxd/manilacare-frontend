import PatientPhoto from "./PatientPhoto";
// Read-only patient profile (basic info, contact, family, PhilHealth,
// immunizations, OB history). Used on the Scan QR page so staff can see
// the full record right after a scan.

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

export default function PatientProfileCards({ patient, healthCenterName }) {
  const immunizations = patient?.immunization_records ?? [];
  const ob = patient?.ob_history ?? null;

  return (
    <div>
      {/* Photo first, so the staff can compare it with the person in front of them */}
      <div className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6 mb-6 flex items-center gap-5 flex-wrap">
        <PatientPhoto patient={patient} size={140} />
        <div>
          <p className="text-2xl font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {show(patient.full_name)}
          </p>
          <p className="text-sm text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
            {show(patient.age)} yrs · {show(patient.sex)}
          </p>
          {!patient.photo && (
            <p className="text-xs text-[#8A8578] mt-1" style={{ fontFamily: "'Lora', serif" }}>
              No photo yet. A photo can be taken from the patient&apos;s record.
            </p>
          )}
        </div>
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
          <Field label="Occupation" value={show(patient.occupation)} />
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
          <Field label="Family History" value={show(patient.family_history)} />
          <Field label="Allergies" value={show(patient.allergies)} />
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

      <div className="mt-6 rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-6">
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
    </div>
  );
}