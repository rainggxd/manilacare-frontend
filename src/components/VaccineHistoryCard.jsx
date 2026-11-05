import { useState } from "react";
import axios from "axios";
import { CheckCircle2, Plus, Syringe, X } from "lucide-react";
import { useConfirm } from "./ConfirmDialog";
import SearchableSelect from "./SearchableSelect";

/**
 * Patient: vaccine history table (same idea as the table on the Admin's
 * registration form). Every vaccine is OPTIONAL: the patient only fills in
 * the date of the ones they received.
 *
 *  - Childhood vaccines: BCG, Hepa B, Penta, OPV, PCV, IPV, MR
 *  - COVID-19: each dose has a brand and a date
 *  - Other vaccines: anything else (Flu, Pneumonia, Anti-rabies, ...)
 *
 * Saved together with PUT /api/patients/me/immunizations.
 */

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

// Same names as the Admin registration form, so records match.
const CHILDHOOD = [
  "BCG", "HEPA B",
  "PENTA 1", "PENTA 2", "PENTA 3",
  "OPV 1", "OPV 2", "OPV 3",
  "PCV 1", "PCV 2", "PCV 3",
  "IPV 1", "IPV 2",
  "MR 1",
];

const COVID_DOSES = ["1st dose", "2nd dose", "Booster 1", "Booster 2"];

const COVID_BRANDS = [
  "Pfizer-BioNTech",
  "Moderna",
  "AstraZeneca",
  "Johnson & Johnson",
  "CanSino",
  "Sinovac",
  "Sinopharm",
  "Novavax",
  "ZyCoV-D",
];

const OTHER_SUGGESTIONS = ["Flu (Influenza)", "Pneumonia (Pneumococcal)", "Anti-rabies", "Tetanus (Td)", "HPV", "Hepatitis A"];

const COVID_PATTERN = /^COVID-19 (1st dose|2nd dose|Booster 1|Booster 2)(?: \((.+)\))?$/;

function splitRecords(records) {
  const childhood = {};
  const covid = {};
  const others = [];
  (records ?? []).forEach((r) => {
    const date = r.date_given ? String(r.date_given).slice(0, 10) : "";
    const covidMatch = COVID_PATTERN.exec(r.vaccine_name ?? "");
    if (CHILDHOOD.includes(r.vaccine_name)) childhood[r.vaccine_name] = date;
    else if (covidMatch) covid[covidMatch[1]] = { brand: covidMatch[2] ?? "", date };
    else others.push({ id: r.id, vaccine_name: r.vaccine_name, date_given: date });
  });
  return { childhood, covid, others };
}

function formatDate(value) {
  if (!value) return "Date not known";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}

export default function VaccineHistoryCard({ records, headers }) {
  const confirm = useConfirm();
  const initial = splitRecords(records);
  const [childhood, setChildhood] = useState(initial.childhood);
  const [covid, setCovid] = useState(initial.covid);
  const [others, setOthers] = useState(initial.others);
  const [newOthers, setNewOthers] = useState([]); // rows added on this page, not saved yet
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const today = new Date().toISOString().slice(0, 10);

  function touched() {
    setMessage({ type: "", text: "" });
  }

  async function handleSave() {
    // A COVID-19 dose with a date needs a brand
    const missingBrand = COVID_DOSES.find((dose) => covid[dose]?.date && !covid[dose]?.brand);
    if (missingBrand) {
      setMessage({ type: "error", text: `Please choose the brand of your COVID-19 ${missingBrand}.` });
      return;
    }
    const unnamed = newOthers.find((o) => o.date_given && !o.vaccine_name.trim());
    if (unnamed) {
      setMessage({ type: "error", text: "Please type the name of the other vaccine you added." });
      return;
    }

    const payload = [
      ...CHILDHOOD.filter((name) => childhood[name]).map((name) => ({ vaccine_name: name, date_given: childhood[name] })),
      ...COVID_DOSES.filter((dose) => covid[dose]?.date).map((dose) => ({
        vaccine_name: `COVID-19 ${dose} (${covid[dose].brand})`,
        date_given: covid[dose].date,
      })),
      ...newOthers
        .filter((o) => o.vaccine_name.trim() && o.date_given)
        .map((o) => ({ vaccine_name: o.vaccine_name.trim(), date_given: o.date_given })),
    ];

    if (payload.length === 0) {
      setMessage({ type: "error", text: "Please enter at least one date first." });
      return;
    }

    const ok = await confirm({
      title: "Save your vaccine history?",
      message: "Please check that the dates are correct before saving.",
      confirmText: "Yes, save",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/patients/me/immunizations`, { records: payload }, { headers });
      const fresh = splitRecords(res.data?.data);
      setChildhood(fresh.childhood);
      setCovid(fresh.covid);
      setOthers(fresh.others);
      setNewOthers([]);
      setMessage({ type: "ok", text: res.data?.message || "Saved." });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Unable to save right now. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-5 sm:p-6 space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-[#0B3D7A]">
          <Syringe size={24} aria-hidden="true" /> Vaccine history
        </h3>
        <p className="mt-1 text-base text-[#33404D]">
          All optional. Just put the <b>date</b> of the vaccines you received. Leave the rest empty.
        </p>
        <p className="text-sm text-[#5B6470] italic">Lagyan lang ng petsa ang mga bakunang natanggap mo.</p>
      </div>

      {/* Childhood vaccines */}
      <div>
        <h4 className="mb-3 text-lg font-bold text-[#1A1A1A]">Childhood vaccines</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3">
          {CHILDHOOD.map((name) => (
            <label key={name} className="flex items-center gap-3 rounded-xl border border-[#E3E8EF] px-3 py-2">
              <span className="w-24 shrink-0 text-base font-bold text-[#1A1A1A]">{name}</span>
              <input
                type="date"
                max={today}
                value={childhood[name] ?? ""}
                onChange={(e) => {
                  setChildhood((prev) => ({ ...prev, [name]: e.target.value }));
                  touched();
                }}
                aria-label={`${name} date given`}
                className="h-11 w-full rounded-lg border-2 border-[#D5DCE3] bg-white px-3 text-base text-[#1A1A1A] outline-none focus:border-[#0B3D7A]"
              />
            </label>
          ))}
        </div>
      </div>

      {/* COVID-19 */}
      <div>
        <h4 className="mb-1 text-lg font-bold text-[#1A1A1A]">COVID-19 vaccine</h4>
        <p className="mb-3 text-sm text-[#5B6470]">Choose the brand and the date of each dose you received.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {COVID_DOSES.map((dose) => (
            <div key={dose} className="rounded-xl border border-[#E3E8EF] p-3">
              <p className="mb-2 text-base font-bold text-[#1A1A1A]">{dose}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <SearchableSelect
                  big
                  emptyLabel="Choose brand…"
                  options={COVID_BRANDS.map((brand) => ({ value: brand, label: brand }))}
                  value={covid[dose]?.brand ?? ""}
                  onChange={(v) => {
                    setCovid((prev) => ({ ...prev, [dose]: { ...prev[dose], brand: v } }));
                    touched();
                  }}
                  ariaLabel={`COVID-19 ${dose} brand`}
                />
                <input
                  type="date"
                  max={today}
                  value={covid[dose]?.date ?? ""}
                  onChange={(e) => {
                    setCovid((prev) => ({ ...prev, [dose]: { ...prev[dose], date: e.target.value } }));
                    touched();
                  }}
                  aria-label={`COVID-19 ${dose} date given`}
                  className="h-11 w-full rounded-lg border-2 border-[#D5DCE3] bg-white px-3 text-base text-[#1A1A1A] outline-none focus:border-[#0B3D7A]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other vaccines */}
      <div>
        <h4 className="mb-3 text-lg font-bold text-[#1A1A1A]">Other vaccines</h4>
        {others.length > 0 && (
          <ul className="mb-3 divide-y divide-[#E3E8EF] rounded-xl border border-[#E3E8EF]">
            {others.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-base">
                <span className="font-semibold text-[#1A1A1A]">{o.vaccine_name}</span>
                <span className="text-[#5B6470]">{formatDate(o.date_given)}</span>
              </li>
            ))}
          </ul>
        )}

        <datalist id="other-vaccines">
          {OTHER_SUGGESTIONS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        {newOthers.map((row, i) => (
          <div key={i} className="mb-2 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_200px_auto] gap-2">
            <input
              list="other-vaccines"
              value={row.vaccine_name}
              onChange={(e) => {
                const v = e.target.value;
                setNewOthers((prev) => prev.map((r, j) => (j === i ? { ...r, vaccine_name: v } : r)));
                touched();
              }}
              placeholder="Type or choose the vaccine"
              aria-label="Other vaccine name"
              className="h-11 w-full rounded-lg border-2 border-[#D5DCE3] bg-white px-3 text-base outline-none focus:border-[#0B3D7A]"
            />
            <input
              type="date"
              max={today}
              value={row.date_given}
              onChange={(e) => {
                const v = e.target.value;
                setNewOthers((prev) => prev.map((r, j) => (j === i ? { ...r, date_given: v } : r)));
                touched();
              }}
              aria-label="Other vaccine date given"
              className="col-span-1 row-start-2 sm:row-start-auto h-11 w-full rounded-lg border-2 border-[#D5DCE3] bg-white px-3 text-base outline-none focus:border-[#0B3D7A]"
            />
            <button
              type="button"
              onClick={() => setNewOthers((prev) => prev.filter((_, j) => j !== i))}
              aria-label="Remove this row"
              className="h-11 w-11 rounded-lg border-2 border-[#D5DCE3] text-[#5B6470] hover:text-[#8A3B27] flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setNewOthers((prev) => [...prev, { vaccine_name: "", date_given: "" }])}
          className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-[#0B3D7A] px-4 text-base font-semibold text-[#0B3D7A] hover:bg-[#EEF4FB]"
        >
          <Plus size={20} aria-hidden="true" /> Add another vaccine
        </button>
      </div>

      <div className="border-t border-[#E3E8EF] pt-5">
        {message.text && (
          <p
            role="status"
            className={`mb-3 flex items-center gap-2 rounded-xl px-4 py-3 text-base font-medium ${
              message.type === "ok" ? "bg-[#EAF6EC] text-[#1B5E20]" : "bg-[#FBEAE5] text-[#8A3B27]"
            }`}
          >
            {message.type === "ok" && <CheckCircle2 size={20} aria-hidden="true" />}
            {message.text}
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto h-14 rounded-xl bg-[#0B3D7A] px-10 text-lg font-bold text-white hover:bg-[#08305F] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Vaccine History"}
        </button>
        <p className="mt-2 text-sm text-[#5B6470]">If a saved vaccine is wrong, please tell the health center so they can fix it.</p>
      </div>
    </section>
  );
}
