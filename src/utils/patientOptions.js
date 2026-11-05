/** Ready-made choices for patients: name + family no. / age / sex / mobile as the hint. */
export function patientOptions(patients) {
  return [...patients]
    .sort((a, b) => String(a.full_name).localeCompare(String(b.full_name)))
    .map((p) => ({
      value: String(p.id),
      label: p.full_name,
      hint: [
        p.family_number ? `Family No. ${p.family_number}` : null,
        p.age || p.age === 0 ? `${p.age} yrs` : null,
        p.sex,
        p.contact_number,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
}
