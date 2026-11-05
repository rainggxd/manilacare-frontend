import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Trash2, RotateCcw, Search } from "lucide-react";
import axios from "axios";
import { HEALTH_CENTERS, healthCenterName } from "../../utils/healthCenters";
import { checkPassword } from "../../utils/passwordPolicy";
import { useConfirm } from "../../components/ConfirmDialog";
import SearchableSelect from "../../components/SearchableSelect";

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
  const [actionMessage, setActionMessage] = useState("");
  const confirm = useConfirm();

  // Search and filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [centerFilter, setCenterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function loadData() {
    setIsLoading(true);
    setLoadError("");
    try {
      const [usersRes, deletedRes, rolesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/users`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/users?deleted=1`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/roles`, { headers: authHeader }),
      ]);
      // is_active comes from the database as "1" / "0" (text), so turn it into true / false.
      // Without this, "0" counts as true and an inactive account looks active.
      setUsers((usersRes.data?.data ?? []).map((u) => ({ ...u, is_active: Number(u.is_active) === 1 })));
      setDeletedUsers(deletedRes.data?.data ?? []);
      // Patient accounts come from Patient Registration, and no one may
      // create another Master Admin from this page.
      setRoles(
        (rolesRes.data?.data ?? []).filter((r) => r.role_name !== "Patient" && r.role_name !== "Master Admin")
      );
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

  // Role names that appear in the list (for the Role filter)
  const roleOptions = useMemo(
    () => Array.from(new Set(users.map((u) => u.role_name).filter(Boolean))).sort(),
    [users]
  );

  function matchesSearch(u) {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [u.full_name, u.email, u.role_name, healthCenterName(u.health_center_id)]
      .some((v) => String(v ?? "").toLowerCase().includes(q));
  }

  const filteredUsers = useMemo(() => {
    return sortedUsers.filter((u) => {
      if (!matchesSearch(u)) return false;
      if (roleFilter && u.role_name !== roleFilter) return false;
      if (centerFilter && String(u.health_center_id ?? "") !== centerFilter) return false;
      if (statusFilter === "active" && !u.is_active) return false;
      if (statusFilter === "inactive" && u.is_active) return false;
      if (statusFilter === "online" && !u.is_online) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedUsers, search, roleFilter, centerFilter, statusFilter]);

  const filteredDeleted = useMemo(
    () => deletedUsers.filter(matchesSearch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletedUsers, search]
  );

  const hasFilters = search || roleFilter || centerFilter || statusFilter;

  function clearFilters() {
    setSearch("");
    setRoleFilter("");
    setCenterFilter("");
    setStatusFilter("");
  }

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
    if (!isCenterAdmin && !formData.health_center_id) {
      setFormError("Please select a health center for this account.");
      return;
    }

    const roleName = roles.find((r) => String(r.id) === String(formData.role_id))?.role_name ?? "";
    const ok = await confirm({
      title: "Create this account?",
      message: `${formData.full_name} (${roleName}) will sign in with ${formData.email}.`,
      confirmText: "Yes, create",
    });
    if (!ok) return;

    setIsSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/users`, formData, { headers: authHeader });
      setFormData({ full_name: "", email: "", password: "", role_id: "", health_center_id: "" });
      setShowForm(false);
      setActionMessage("Account created.");
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to create account.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(userId, currentStatus) {
    setActionError("");
    setActionMessage("");
    const user = users.find((u) => u.id === userId);
    const ok = await confirm(
      currentStatus
        ? {
            title: `Deactivate ${user?.full_name ?? "this account"}?`,
            message: "This person will not be able to sign in until the account is activated again.",
            confirmText: "Yes, deactivate",
            tone: "danger",
          }
        : {
            title: `Activate ${user?.full_name ?? "this account"}?`,
            message: "This person will be able to sign in again.",
            confirmText: "Yes, activate",
          }
    );
    if (!ok) return;
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
    setActionMessage("");
    const user = users.find((u) => u.id === userId);
    const ok = await confirm({
      title: `Delete ${user?.full_name ?? "this account"}?`,
      message: "The account can still be restored later from Recover Account.",
      confirmText: "Yes, delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await axios.delete(`${API_BASE_URL}/users/${userId}`, { headers: authHeader });
      setActionMessage("Account deleted.");
      await loadData();
    } catch (err) {
      setActionError("Unable to delete this account right now.");
    }
  }

  async function handleRestore(userId) {
    setActionError("");
    setActionMessage("");
    const user = deletedUsers.find((u) => u.id === userId);
    const ok = await confirm({
      title: `Restore ${user?.full_name ?? "this account"}?`,
      message: "The account will appear again in the list of active accounts.",
      confirmText: "Yes, restore",
    });
    if (!ok) return;
    try {
      await axios.put(`${API_BASE_URL}/users/${userId}/restore`, {}, { headers: authHeader });
      setActionMessage("Account restored.");
      await loadData();
    } catch (err) {
      setActionError("Unable to restore this account right now.");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
            User Management
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {isCenterAdmin ? "Create and manage Staff, Nurse and Doctor accounts" : "Create and manage Admin, Staff, Nurse and Doctor accounts"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDeleted((prev) => !prev)}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${showDeleted
                ? "bg-[#8A3B27] text-white hover:bg-[#6f2f1f]"
                : "bg-white text-[#8A3B27] border border-[#8A3B27]/30 hover:bg-[#FBEAE5]"
              }`}
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {showDeleted ? "Back to Active Accounts" : `Recover Account (${deletedUsers.length})`}
          </button>
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full bg-[#0B3D7A] text-white px-6 py-3 text-sm font-semibold hover:bg-[#0A3468] transition-colors whitespace-nowrap"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <Plus size={16} />
            New Account
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleFormChange("full_name", e.target.value)}
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Temporary Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleFormChange("password", e.target.value)}
              className="w-full rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Role</label>
            <SearchableSelect
              rounded="lg"
              placeholder="Select role…"
              options={roles.map((r) => ({ value: r.id, label: r.role_name }))}
              value={formData.role_id}
              onChange={(v) => handleFormChange("role_id", v)}
              ariaLabel="Role"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Health Center</label>
            <SearchableSelect
              rounded="lg"
              placeholder="Select health center…"
              options={(isCenterAdmin ? HEALTH_CENTERS.filter((hc) => String(hc.id) === String(ownCenterId)) : HEALTH_CENTERS).map(
                (hc) => ({ value: hc.id, label: hc.name })
              )}
              value={isCenterAdmin ? String(ownCenterId ?? "") : formData.health_center_id}
              onChange={(v) => handleFormChange("health_center_id", v)}
              disabled={isCenterAdmin}
              ariaLabel="Health Center"
            />
          </div>

          {formError && <p className="sm:col-span-2 text-sm text-[#B3261E]">{formError}</p>}

          <div className="sm:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-[#0B3D7A] text-white px-6 py-2.5 text-sm font-bold hover:bg-[#0A3468] disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Create Account"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full bg-[#F4F6F9] text-[#3D4653] border border-[#E3E8EF] px-6 py-2.5 text-sm font-bold hover:bg-[#E3E8EF]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {actionError && (
        <p className="text-sm text-[#8A3B27] mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
          {actionError}
        </p>
      )}
      {actionMessage && (
        <p className="text-sm text-[#1B5E20] font-semibold mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
          {actionMessage}
        </p>
      )}

      {/* Search and filters */}
      <div
        className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-end"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <label className="block">
          <span className="block text-xs font-semibold text-[#5B6470] mb-1">Search</span>
          <span className="relative block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A94A6]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, role or health center"
              className="w-full rounded-lg bg-white border border-[#CBD5E1] pl-9 pr-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B3D7A] focus:ring-2 focus:ring-[#0B3D7A]/20"
            />
          </span>
        </label>
        {!showDeleted && (
          <>
            <label className="block">
              <span className="block text-xs font-semibold text-[#5B6470] mb-1">Role</span>
              <SearchableSelect
                rounded="lg"
                emptyLabel="All roles"
                options={roleOptions.map((r) => ({ value: r, label: r }))}
                value={roleFilter}
                onChange={setRoleFilter}
                ariaLabel="Role filter"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-[#5B6470] mb-1">Health Center</span>
              <SearchableSelect
                rounded="lg"
                emptyLabel={isCenterAdmin ? "My health center" : "All health centers"}
                options={isCenterAdmin ? [] : HEALTH_CENTERS.map((hc) => ({ value: hc.id, label: hc.name }))}
                value={centerFilter}
                onChange={setCenterFilter}
                disabled={isCenterAdmin}
                ariaLabel="Health center filter"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-[#5B6470] mb-1">Status</span>
              <SearchableSelect
                rounded="lg"
                emptyLabel="All"
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "online", label: "Online now" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Status filter"
              />
            </label>
          </>
        )}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#5B6470] whitespace-nowrap">
            {showDeleted ? filteredDeleted.length : filteredUsers.length} shown
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full bg-[#F4F6F9] text-[#3D4653] border border-[#E3E8EF] px-4 py-2 text-sm font-semibold hover:bg-[#E3E8EF] whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {showDeleted ? (
        <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr className="bg-[#F4F6F9] text-[#5B6470] text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Deleted</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeleted.length === 0 && (
                <tr className="bg-white text-[#5B6470]">
                  <td colSpan={5} className="px-4 py-6 text-center">
                    {deletedUsers.length === 0 ? "No deleted accounts." : "No deleted account matches your search."}
                  </td>
                </tr>
              )}
              {filteredDeleted.map((u) => (
                <tr key={u.id} className="bg-white text-[#1A1A1A] border-t border-[#E3E8EF]">
                  <td className="px-4 py-3">{u.full_name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role_name}</td>
                  <td className="px-4 py-3">{u.deleted_at ? new Date(u.deleted_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRestore(u.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#E7EEF7] text-[#0B3D7A] px-3 py-1.5 text-xs font-bold hover:bg-[#d7e2f1]"
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
        <div className="overflow-x-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-sm">
          <table className="w-full min-w-[880px] border-collapse text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr className="bg-[#F4F6F9] text-[#5B6470] text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Health Center</th>
                <th className="px-4 py-3 font-semibold">Online</th>
                <th className="px-4 py-3 font-semibold">Last Login</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr className="bg-white text-[#5B6470]">
                  <td colSpan={8} className="px-4 py-6 text-center">Loading…</td>
                </tr>
              )}
              {!isLoading && loadError && (
                <tr className="bg-white text-[#5B6470]">
                  <td colSpan={8} className="px-4 py-6 text-center">{loadError}</td>
                </tr>
              )}
              {!isLoading && !loadError && filteredUsers.length === 0 && (
                <tr className="bg-white text-[#5B6470]">
                  <td colSpan={8} className="px-4 py-6 text-center">
                    {sortedUsers.length === 0 ? "No accounts yet." : "No account matches your search or filters."}
                  </td>
                </tr>
              )}
              {!isLoading &&
                !loadError &&
                filteredUsers.map((u) => (
                  <tr key={u.id} className="bg-white text-[#1A1A1A] border-t border-[#E3E8EF]">
                    <td className="px-4 py-3">{u.full_name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.role_name}</td>
                    <td className="px-4 py-3">{healthCenterName(u.health_center_id)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${u.is_online ? "bg-green-500" : "bg-gray-300"}`}
                          aria-hidden="true"
                        />
                        {u.is_online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5B6470] text-sm">
                      {u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${u.is_active ? "bg-[#E8F3E9] text-[#1B5E20] hover:bg-[#d5ead7]" : "bg-[#FBEAE5] text-[#8A3B27] hover:bg-[#f6d8cf]"
                          }`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        className="inline-flex items-center justify-center rounded-full p-2 text-[#5B6470] hover:bg-[#B3261E]/10 hover:text-[#B3261E] transition-colors"
                        title="Delete account"
                        aria-label={`Delete ${u.full_name}`}
                      >
                        <Trash2 size={16} />
                      </button>
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