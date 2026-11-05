import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import { Check, X, Inbox } from "lucide-react";
import { useConfirm } from "../../components/ConfirmDialog";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

const TABS = ["Pending", "Approved", "Rejected"];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatBirthday(value) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}

/**
 * Admin: patients who registered by themselves from the login page.
 * Approving creates the patient record and login account, then emails the patient.
 * Rejecting emails the patient with the reason.
 */
export default function RegistrationRequestsPage() {
  const confirm = useConfirm();
  const { auth } = useOutletContext();
  const headers = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [tab, setTab] = useState("Pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // request being rejected (shows reason box)
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/registration-requests`, { headers, params: { status: tab } });
      setRows(res.data?.data ?? []);
    } catch {
      setLoadError("Unable to load registration requests right now.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, auth?.token]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(row) {
    const ok = await confirm({
      title: `Approve ${row.full_name}?`,
      message: row.email
        ? "A patient record and QR code will be created, and the patient will get an email that they can now sign in."
        : row.mobile_number
          ? `A patient record and QR code will be created. The patient has no email, so please call or text ${row.mobile_number} to say they can log in with their mobile number.`
          : "A patient record and QR code will be created. The patient has no email or mobile number, so there is no portal login.",
      confirmText: "Yes, approve",
    });
    if (!ok) return;
    setBusyId(row.id);
    setNotice({ type: "", text: "" });
    try {
      const res = await axios.post(`${API_BASE_URL}/registration-requests/${row.id}/approve`, {}, { headers });
      setNotice({ type: "ok", text: `${row.full_name}: ${res.data?.message ?? "Approved."}${row.email ? " An email was sent to the patient." : ""}` });
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      setNotice({ type: "error", text: err.response?.data?.message || "Unable to approve right now." });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    const row = rejecting;
    setBusyId(row.id);
    setNotice({ type: "", text: "" });
    try {
      const res = await axios.post(`${API_BASE_URL}/registration-requests/${row.id}/reject`, { reason }, { headers });
      setNotice({ type: "ok", text: `${row.full_name}: ${res.data?.message ?? "Rejected."}` });
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setRejecting(null);
      setReason("");
    } catch (err) {
      setNotice({ type: "error", text: err.response?.data?.message || "Unable to reject right now." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl text-[#0B3D7A] font-bold">Registration Requests</h2>
        <p className="text-[#5B6470]">
          Patients who signed up by themselves. They can log in only after you approve them.
        </p>
      </div>

      <div className="mb-5 inline-flex rounded-full bg-white border border-[#E3E8EF] p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setNotice({ type: "", text: "" });
            }}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              tab === t ? "bg-[#0B3D7A] text-white" : "text-[#5B6470] hover:text-[#0B3D7A]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {notice.text && (
        <p
          role="status"
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
            notice.type === "ok" ? "bg-[#EAF6EC] text-[#1B5E20]" : "bg-[#FBEAE5] text-[#8A3B27]"
          }`}
        >
          {notice.text}
        </p>
      )}

      {loading && <p className="text-[#5B6470]">Loading…</p>}
      {!loading && loadError && <p className="text-[#8A3B27]">{loadError}</p>}

      {!loading && !loadError && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-10 text-center text-[#5B6470]">
          <Inbox className="mx-auto mb-2" size={36} aria-hidden="true" />
          No {tab.toLowerCase()} requests.
        </div>
      )}

      <div className="grid gap-4">
        {!loading &&
          !loadError &&
          rows.map((row) => {
            const d = row.details || {};
            return (
              <article key={row.id} className="rounded-2xl bg-white border border-[#E3E8EF] shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#1A1A1A]">{row.full_name}</h3>
                    <p className="text-sm text-[#5B6470]">Sent {formatDate(row.created_at)}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>

                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {row.email ? (
                    <Info label="Email" value={row.email} />
                  ) : (
                    <Info label="Login (no email, 50+)" value={row.mobile_number ? `Mobile ${row.mobile_number}` : "No login (no email or mobile)"} />
                  )}
                  <Info label="Mobile number" value={d.contact_number} />
                  <Info label="Birthday" value={formatBirthday(d.date_of_birth)} />
                  <Info label="Age / Sex" value={[d.age, d.sex].filter(Boolean).join(" / ")} />
                  <Info label="Address" value={d.address} wide />
                  {row.status === "Rejected" && <Info label="Reason" value={row.reject_reason} wide />}
                  {row.status !== "Pending" && <Info label="Reviewed" value={formatDate(row.reviewed_at)} />}
                </dl>

                {row.status === "Pending" && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => approve(row)}
                      className="inline-flex items-center gap-2 rounded-full bg-[#1B5E20] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#164D1A] disabled:opacity-60"
                    >
                      <Check size={18} /> {busyId === row.id ? "Approving…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => {
                        setRejecting(row);
                        setReason("");
                      }}
                      className="inline-flex items-center gap-2 rounded-full border-2 border-[#8A3B27] px-5 py-2 text-sm font-semibold text-[#8A3B27] hover:bg-[#FBEAE5] disabled:opacity-60"
                    >
                      <X size={18} /> Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#1A1A1A]">Reject {rejecting.full_name}?</h3>
            <p className="mt-1 text-sm text-[#5B6470]">
              The reason will be emailed to the patient so they know what to fix. (Optional)
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Example: Not a resident of this barangay. Please visit the health center."
              className="mt-3 w-full rounded-xl border-2 border-[#D5DCE3] p-3 text-sm outline-none focus:border-[#0B3D7A]"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="rounded-full px-5 py-2 text-sm font-semibold text-[#5B6470] hover:bg-[#F4F6F9]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === rejecting.id}
                onClick={confirmReject}
                className="rounded-full bg-[#8A3B27] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6f2f1f] disabled:opacity-60"
              >
                {busyId === rejecting.id ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, wide }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-[#8A94A6]">{label}</dt>
      <dd className="text-[#1A1A1A]">{value || "—"}</dd>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-[#FFF4D6] text-[#8A6A00]",
    Approved: "bg-[#EAF6EC] text-[#1B5E20]",
    Rejected: "bg-[#FBEAE5] text-[#8A3B27]",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] || ""}`}>{status}</span>;
}
