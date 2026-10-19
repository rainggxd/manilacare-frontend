import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import axios from "axios";
import { HEALTH_CENTERS, healthCenterName } from "../../utils/healthCenters";
import { checkPassword } from "../../utils/passwordPolicy";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";


export default function UserManagementPage() {
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
  // A health-center Admin can only create Staff/Doctor accounts for their own center.
  const isCenterAdmin = auth?.user?.role === "Admin";
  const ownCenterId = auth?.user?.health_center_id;

  const [users, setUsers] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role_id: "",
    health_center_id: "",
  });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [actionError, setActionError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function loadData() {
    setIsLoading(true);
    setLoadError("");
    try {
      const [usersRes, deletedRes, rolesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/users`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/users?deleted=1`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/roles`, { headers: authHeader }),
      ]);
      setUsers(usersRes.data?.data ?? []);
      setDeletedUsers(deletedRes.data?.data ?? []);
      setRoles((rolesRes.data?.data ?? []).filter((r) => r.role_name !== "Patient"));
    } catch (err) {
      setLoadError("Unable to load user accounts right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0));
  }, [users]);

  function handleFormChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");

    if (!formData.full_name || !formData.email || !formData.password || !formData.role_id) {
      setFormError("Full name, email, password, and role are required.");
      return;
    }

    const pwError = checkPassword(formData.password);
    if (pwError) {
      setFormError(pwError);
      return;
    }
    const selectedRole = roles.find((r) => String(r.id) === String(formData.role_id));
    if (!isCenterAdmin && selectedRole?.role_name !== "Master Admin" && !formData.health_center_id) {
      setFormError("Please select a health center for this account.");
      return;
    }

    setIsSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/users`, formData, { headers: authHeader });
      setFormData({ full_name: "", email: "", password: "", role_id: "", health_center_id: "" });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to create account.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(userId, currentStatus) {
    setActionError("");
    try {
      await axios.put(
        `${API_BASE_URL}/users/${userId}/status`,
        { is_active: !currentStatus },
        { headers: authHeader }
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );
    } catch (err) {
      setActionError("Unable to update account status right now.");
    }
  }

  async function handleDelete(userId) {
    setActionError("");
    try {
      await axios.delete(`${API_BASE_URL}/users/${userId}`, { headers: authHeader });
      setConfirmDeleteId(null);
      await loadData();
    } catch (err) {
      setActionError("Unable to delete this account right now.");
    }
  }

  async function handleRestore(userId) {
    setActionError("");
    try {
      await axios.put(`${API_BASE_URL}/users/${userId}/restore`, {}, { headers: authHeader });
      await loadData();
    } catch (err) {
      setActionError("Unable to restore this account right now.");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            User Management
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
            Create and manage Staff and Doctor accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDeleted((prev) => !prev)}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${showDeleted
                ? "bg-[#8A3B27] text-white hover:bg-[#6f2f1f]"
                : "bg-white text-[#8A3B27] border border-[#8A3B27]/30 hover:bg-[#FBEAE5]"
              }`}
            style={{ fontFamily: "'Lora', serif" }}
          >
            {showDeleted ? "Back to Active Accounts" : `Recover Account (${deletedUsers.length})`}
          </button>
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A] text-white px-6 py-3 text-sm font-semibold hover:bg-[#0A3468] transition-colors whitespace-nowrap"
            style={{ fontFamily: "'Lora', serif" }}
          >
            <Plus size={16} />
            New Account
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-[#1B5E20] text-white p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ fontFamily: "'Lora', serif" }}
        >
          <div>
            <label className="block text-xs text-white/80 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleFormChange("full_name", e.target.value)}
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Temporary Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleFormChange("password", e.target.value)}
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Role</label>
            <select
              value={formData.role_id}
              onChange={(e) => handleFormChange("role_id", e.target.value)}
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none"
            >
              <option value="">Select role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.role_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">Health Center</label>
            <select
              value={isCenterAdmin ? String(ownCenterId ?? "") : formData.health_center_id}
              onChange={(e) => handleFormChange("health_center_id", e.target.value)}
              disabled={isCenterAdmin}
              className="w-full rounded-full bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none disabled:opacity-80"
            >
              <option value="">Select health center…</option>
              {(isCenterAdmin ? HEALTH_CENTERS.filter((hc) => String(hc.id) === String(ownCenterId)) : HEALTH_CENTERS).map((hc) => (
                <option key={hc.id} value={hc.id}>
                  {hc.name}
                </option>
              ))}
            </select>
          </div>

          {formError && <p className="sm:col-span-2 text-sm text-red-200">{formError}</p>}

          <div className="sm:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-white text-[#1B5E20] px-6 py-2.5 text-sm font-bold hover:bg-white/90 disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Create Account"}
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

      {actionError && (
        <p className="text-sm text-[#8A3B27] mb-3" style={{ fontFamily: "'Lora', serif" }}>
          {actionError}
        </p>
      )}

      {showDeleted ? (
        <div className="overflow-x-auto rounded-2xl border border-[#8A3B27]/20">
          <table className="w-full min-w-[640px] border-collapse text-left" style={{ fontFamily: "'Lora', serif" }}>
            <thead>
              <tr className="bg-[#8A3B27] text-white">
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">Email</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Deleted</th>
                <th className="px-4 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {deletedUsers.length === 0 && (
                <tr className="bg-[#1B5E20] text-white">
                  <td colSpan={5} className="px-4 py-6 text-center">No deleted accounts.</td>
                </tr>
              )}
              {deletedUsers.map((u) => (
                <tr key={u.id} className="bg-[#1B5E20] text-white border-t border-white/10">
                  <td className="px-4 py-3">{u.full_name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role_name}</td>
                  <td className="px-4 py-3">{u.deleted_at ? new Date(u.deleted_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRestore(u.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold hover:bg-white/30"
                    >
                      <RotateCcw size={14} />
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#0B3D7A]/20">
          <table className="w-full min-w-[880px] border-collapse text-left" style={{ fontFamily: "'Lora', serif" }}>
            <thead>
              <tr className="bg-[#0B3D7A] text-white">
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">Email</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Health Center</th>
                <th className="px-4 py-3 font-bold">Online</th>
                <th className="px-4 py-3 font-bold">Last Login</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr className="bg-[#1B5E20] text-white">
                  <td colSpan={8} className="px-4 py-6 text-center">Loading…</td>
                </tr>
              )}
              {!isLoading && loadError && (
                <tr className="bg-[#1B5E20] text-white">
                  <td colSpan={8} className="px-4 py-6 text-center">{loadError}</td>
                </tr>
              )}
              {!isLoading && !loadError && sortedUsers.length === 0 && (
                <tr className="bg-[#1B5E20] text-white">
                  <td colSpan={8} className="px-4 py-6 text-center">No accounts yet.</td>
                </tr>
              )}
              {!isLoading &&
                !loadError &&
                sortedUsers.map((u) => (
                  <tr key={u.id} className="bg-[#1B5E20] text-white border-t border-white/10">
                    <td className="px-4 py-3">{u.full_name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.role_name}</td>
                    <td className="px-4 py-3">{healthCenterName(u.health_center_id)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${u.is_online ? "bg-green-400" : "bg-white/30"}`}
                          aria-hidden="true"
                        />
                        {u.is_online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/80 text-sm">
                      {u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${u.is_active ? "bg-white/20 hover:bg-white/30" : "bg-[#8A3B27] hover:bg-[#6f2f1f]"
                          }`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmDeleteId === u.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id)}
                            className="rounded-full bg-[#8A3B27] px-3 py-1 text-xs font-bold hover:bg-[#6f2f1f]"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(u.id)}
                          className="inline-flex items-center justify-center rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                          title="Delete account"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}