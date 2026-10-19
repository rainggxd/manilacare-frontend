import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Building2, Users, MapPin, Phone, Plus } from "lucide-react";
import axios from "axios";
import { refreshHealthCenters } from "../../utils/healthCenters";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

export default function HealthCentersPage() {
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [centers, setCenters] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ center_name: "", address: "", contact_number: "" });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadData() {
    setIsLoading(true);
    setLoadError("");
    try {
      // The Master Admin only gets counts (no patient records).
      const [centersRes, summaryRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/health-centers`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/admin/summary`, { headers: authHeader }),
      ]);
      setCenters(centersRes.data?.data ?? []);
      setSummary(summaryRes.data?.data ?? null);
    } catch (err) {
      setLoadError("Unable to load health centers right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const centersWithCounts = useMemo(() => {
    return centers.map((hc) => {
      const row = summary?.centers?.find((c) => String(c.id) === String(hc.id));
      return {
        ...hc,
        count: row?.patients ?? 0,
        admins: row?.admins ?? 0,
        staff: row?.staff ?? 0,
        doctors: row?.doctors ?? 0,
      };
    });
  }, [centers, summary]);

  function handleFormChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");

    if (!formData.center_name.trim()) {
      setFormError("Health center name is required.");
      return;
    }

    setIsSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/health-centers`, formData, { headers: authHeader });
      setFormData({ center_name: "", address: "", contact_number: "" });
      setShowForm(false);
      await refreshHealthCenters(auth?.token);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to add health center.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Health Centers
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
            Facilities covered by ManilaCare
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A] text-white px-6 py-3 text-sm font-semibold hover:bg-[#0A3468] transition-colors whitespace-nowrap"
          style={{ fontFamily: "'Lora', serif" }}
        >
          <Plus size={16} />
          Add Health Center
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-[#1B5E20] text-white p-6 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
          style={{ fontFamily: "'Lora', serif" }}
        >
          <div>
            <label className="block text-xs text-white/80 mb-1">Health Center Name</label>
            <input
              type="text"
              value={formData.center_name}
              onChange={(e) => handleFormChange("center_name", e.target.value)}
              placeholder="e.g. Balut Health Center"
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleFormChange("address", e.target.value)}
              placeholder="e.g. Balut, Tondo, Manila"
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Contact Number (optional)</label>
            <input
              type="text"
              value={formData.contact_number}
              onChange={(e) => handleFormChange("contact_number", e.target.value)}
              placeholder="e.g. (02) 8123 4567"
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            />
          </div>

          {formError && <p className="sm:col-span-3 text-sm text-red-200">{formError}</p>}

          <div className="sm:col-span-3 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-white text-[#1B5E20] px-6 py-2.5 text-sm font-bold hover:bg-white/90 disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Add Health Center"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full bg-white/20 px-6 py-2.5 text-sm font-bold hover:bg-white/30"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loadError && (
        <p className="text-sm text-[#8A3B27] mb-4" style={{ fontFamily: "'Lora', serif" }}>
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {!isLoading && centersWithCounts.length === 0 && (
          <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>
            No health centers on file yet.
          </p>
        )}
        {centersWithCounts.map((hc) => (
          <div key={hc.id} className="rounded-2xl bg-[#1B5E20] text-white p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-full bg-white/15 p-3 shrink-0">
                <Building2 size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {hc.center_name}
                </h3>
                {hc.address && (
                  <p className="text-xs text-white/70 flex items-center gap-1 mt-1" style={{ fontFamily: "'Lora', serif" }}>
                    <MapPin size={12} />
                    {hc.address}
                  </p>
                )}
                {hc.contact_number && (
                  <p className="text-xs text-white/70 flex items-center gap-1 mt-1" style={{ fontFamily: "'Lora', serif" }}>
                    <Phone size={12} />
                    {hc.contact_number}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/15 pt-4">
              <div className="flex items-center gap-2" style={{ fontFamily: "'Lora', serif" }}>
                <Users size={16} className="text-white/80" />
                <span className="text-sm text-white/80">Registered Patients</span>
              </div>
              <span className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                {isLoading ? "…" : hc.count}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 text-center" style={{ fontFamily: "'Lora', serif" }}>
              <div className="rounded-xl bg-white/10 py-2">
                <p className="text-lg font-bold">{isLoading ? "…" : hc.admins}</p>
                <p className="text-[11px] text-white/70">Admin</p>
              </div>
              <div className="rounded-xl bg-white/10 py-2">
                <p className="text-lg font-bold">{isLoading ? "…" : hc.staff}</p>
                <p className="text-[11px] text-white/70">Staff</p>
              </div>
              <div className="rounded-xl bg-white/10 py-2">
                <p className="text-lg font-bold">{isLoading ? "…" : hc.doctors}</p>
                <p className="text-[11px] text-white/70">Doctors</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#5B6470] mt-6" style={{ fontFamily: "'Lora', serif" }}>
        ManilaCare's capstone scope covers Bo. Magsaysay Health Center and Foreshore Tondo Health Center — additional
        centers added here are for demonstrating the feature and are not part of the study's defended scope.
      </p>
    </div>
  );
}