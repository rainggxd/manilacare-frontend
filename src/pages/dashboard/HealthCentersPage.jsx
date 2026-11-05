import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Building2, Users, MapPin, Phone, Plus, Pencil, Trash2 } from "lucide-react";
import axios from "axios";
import { refreshHealthCenters } from "../../utils/healthCenters";
import { useConfirm } from "../../components/ConfirmDialog";

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
  const [editingId, setEditingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const confirm = useConfirm();

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
        nurses: row?.nurses ?? 0,
        doctors: row?.doctors ?? 0,
      };
    });
  }, [centers, summary]);

  function handleFormChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function startAdd() {
    setEditingId(null);
    setFormData({ center_name: "", address: "", contact_number: "" });
    setFormError("");
    setShowForm((prev) => !prev || editingId !== null);
  }

  function startEdit(hc) {
    setEditingId(hc.id);
    setFormData({
      center_name: hc.center_name ?? "",
      address: hc.address ?? "",
      contact_number: hc.contact_number ?? "",
    });
    setFormError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError("");
    setActionMessage("");

    if (!formData.center_name.trim()) {
      setFormError("Health center name is required.");
      return;
    }

    const ok = await confirm(
      editingId
        ? { title: "Save changes to this health center?", message: formData.center_name, confirmText: "Yes, save" }
        : { title: "Add this health center?", message: formData.center_name, confirmText: "Yes, add" }
    );
    if (!ok) return;

    setIsSaving(true);
    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/health-centers/${editingId}`, formData, { headers: authHeader });
        setActionMessage("Health center updated.");
      } else {
        await axios.post(`${API_BASE_URL}/health-centers`, formData, { headers: authHeader });
        setActionMessage("Health center added.");
      }
      setFormData({ center_name: "", address: "", contact_number: "" });
      closeForm();
      await refreshHealthCenters(auth?.token);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to save the health center.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(hc) {
    setActionError("");
    setActionMessage("");
    const ok = await confirm({
      title: `Delete ${hc.center_name}?`,
      message: "This cannot be undone. A health center can only be deleted when it has no patients, accounts, visits or appointments.",
      confirmText: "Yes, delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await axios.delete(`${API_BASE_URL}/health-centers/${hc.id}`, { headers: authHeader });
      if (editingId === hc.id) closeForm();
      setActionMessage("Health center deleted.");
      await refreshHealthCenters(auth?.token);
      await loadData();
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to delete this health center right now.");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
            Health Centers
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Facilities covered by ManilaCare
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A] text-white px-6 py-3 text-sm font-semibold hover:bg-[#0A3468] transition-colors whitespace-nowrap"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <Plus size={16} />
          Add Health Center
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <p className="sm:col-span-3 text-lg font-bold text-[#0B3D7A]">
            {editingId ? "Edit Health Center" : "Add Health Center"}
          </p>
          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Health Center Name</label>
            <input
              type="text"
              value={formData.center_name}
              onChange={(e) => handleFormChange("center_name", e.target.value)}
              placeholder="e.g. Balut Health Center"
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleFormChange("address", e.target.value)}
              placeholder="e.g. Balut, Tondo, Manila"
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Contact Number (optional)</label>
            <input
              type="text"
              value={formData.contact_number}
              onChange={(e) => handleFormChange("contact_number", e.target.value)}
              placeholder="e.g. (02) 8123 4567"
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20"
            />
          </div>

          {formError && <p className="sm:col-span-3 text-sm text-[#B3261E]">{formError}</p>}

          <div className="sm:col-span-3 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#0A3468] disabled:opacity-60"
            >
              {isSaving ? "Saving…" : editingId ? "Save Changes" : "Add Health Center"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full bg-[#F4F6F9] text-[#3D4653] border border-[#E3E8EF] px-6 py-2.5 text-sm font-bold hover:bg-[#E3E8EF]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {actionMessage && (
        <p className="text-sm text-[#1B5E20] font-semibold mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
          {actionMessage}
        </p>
      )}
      {actionError && (
        <p className="text-sm text-[#8A3B27] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
          {actionError}
        </p>
      )}
      {loadError && (
        <p className="text-sm text-[#8A3B27] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {!isLoading && centersWithCounts.length === 0 && (
          <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Inter', sans-serif" }}>
            No health centers on file yet.
          </p>
        )}
        {centersWithCounts.map((hc) => (
          <div key={hc.id} className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-xl bg-[#0B3D7A]/10 text-[#0B3D7A] p-3 shrink-0">
                <Building2 size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold text-[#1A1A1A] break-words" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {hc.center_name}
                </h3>
                {hc.address && (
                  <p className="text-xs text-[#5B6470] flex items-center gap-1 mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <MapPin size={12} />
                    {hc.address}
                  </p>
                )}
                {hc.contact_number && (
                  <p className="text-xs text-[#5B6470] flex items-center gap-1 mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <Phone size={12} />
                    {hc.contact_number}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(hc)}
                  title="Edit"
                  aria-label={`Edit ${hc.center_name}`}
                  className="rounded-full p-2 text-[#0B3D7A] hover:bg-[#0B3D7A]/10"
                >
                  <Pencil size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(hc)}
                  title="Delete"
                  aria-label={`Delete ${hc.center_name}`}
                  className="rounded-full p-2 text-[#8A3B27] hover:bg-[#8A3B27]/10"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#E3E8EF] pt-4">
              <div className="flex items-center gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                <Users size={16} className="text-[#5B6470]" />
                <span className="text-sm text-[#5B6470]">Registered Patients</span>
              </div>
              <span className="text-2xl font-bold text-[#0B3D7A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {isLoading ? "…" : hc.count}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
              <div className="rounded-xl bg-[#F4F6F9] py-2">
                <p className="text-lg font-bold text-[#1A1A1A]">{isLoading ? "…" : hc.admins}</p>
                <p className="text-[11px] text-[#5B6470]">Admin</p>
              </div>
              <div className="rounded-xl bg-[#F4F6F9] py-2">
                <p className="text-lg font-bold text-[#1A1A1A]">{isLoading ? "…" : hc.staff}</p>
                <p className="text-[11px] text-[#5B6470]">Staff</p>
              </div>
              <div className="rounded-xl bg-[#F4F6F9] py-2">
                <p className="text-lg font-bold text-[#1A1A1A]">{isLoading ? "…" : hc.nurses ?? 0}</p>
                <p className="text-[11px] text-[#5B6470]">Nurses</p>
              </div>
              <div className="rounded-xl bg-[#F4F6F9] py-2">
                <p className="text-lg font-bold text-[#1A1A1A]">{isLoading ? "…" : hc.doctors}</p>
                <p className="text-[11px] text-[#5B6470]">Doctors</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#5B6470] mt-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        ManilaCare's capstone scope covers Bo. Magsaysay Health Center and Foreshore Tondo Health Center — additional
        centers added here are for demonstrating the feature and are not part of the study's defended scope.
      </p>
    </div>
  );
}