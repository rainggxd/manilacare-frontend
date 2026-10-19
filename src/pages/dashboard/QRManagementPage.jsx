import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { QrCode, RefreshCw, Search } from "lucide-react";
import QRCode from "qrcode";
import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

function QrImage({ token, size = 140 }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(token, { width: size, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, size]);

  if (!dataUrl) {
    return <div className="w-[140px] h-[140px] bg-[#F7F5F1] rounded-xl animate-pulse" />;
  }

  return <img src={dataUrl} alt="Patient QR code" className="rounded-xl border border-[#0B3D7A]/10" width={size} height={size} />;
}

export default function QRManagementPage() {
  const { auth } = useOutletContext();
  const authHeader = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

  const [patients, setPatients] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [generatingId, setGeneratingId] = useState(null);
  const [actionError, setActionError] = useState("");

  async function loadData() {
    setIsLoading(true);
    setLoadError("");
    try {
      const [patientsRes, qrRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/patients`, { headers: authHeader }),
        axios.get(`${API_BASE_URL}/qr-codes`, { headers: authHeader }),
      ]);
      setPatients(patientsRes.data?.data ?? []);
      setQrCodes(qrRes.data?.data ?? []);
    } catch (err) {
      setLoadError("Unable to load QR code data right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const qrByPatientId = useMemo(() => {
    const map = new Map();
    qrCodes.forEach((qr) => map.set(String(qr.patient_id), qr));
    return map;
  }, [qrCodes]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        String(p.family_number ?? "").toLowerCase().includes(q)
    );
  }, [patients, search]);

  async function handleGenerate(patientId) {
    setGeneratingId(patientId);
    setActionError("");
    try {
      await axios.post(`${API_BASE_URL}/qr-codes/generate`, { patient_id: patientId }, { headers: authHeader });
      await loadData();
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to generate QR code right now.");
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl sm:text-4xl text-[#000000] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            QR Code Management
          </h2>
          <p className="text-[#5B6470]" style={{ fontFamily: "'Lora', serif" }}>
            Generate and manage patient QR codes used for check-in
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8578]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient…"
            className="w-full rounded-full bg-white border border-[#0B3D7A]/15 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0B3D7A]/30"
            style={{ fontFamily: "'Lora', serif" }}
          />
        </div>
      </div>

      {loadError && (
        <p className="text-sm text-[#8A3B27] mb-4" style={{ fontFamily: "'Lora', serif" }}>
          {loadError}
        </p>
      )}
      {actionError && (
        <p className="text-sm text-[#8A3B27] mb-4" style={{ fontFamily: "'Lora', serif" }}>
          {actionError}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>Loading…</p>
      ) : filteredPatients.length === 0 ? (
        <p className="text-sm text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>No patients found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPatients.map((p) => {
            const qr = qrByPatientId.get(String(p.id));
            const isGenerating = generatingId === p.id;
            return (
              <div key={p.id} className="rounded-2xl bg-white border border-[#0B3D7A]/10 shadow-sm p-5 flex flex-col items-center text-center">
                <div className="mb-3">
                  <p className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {p.full_name}
                  </p>
                  <p className="text-xs text-[#8A8578]" style={{ fontFamily: "'Lora', serif" }}>
                    Family No. {p.family_number || "—"}
                  </p>
                </div>

                {qr ? (
                  <QrImage token={qr.qr_token} />
                ) : (
                  <div className="w-[140px] h-[140px] rounded-xl bg-[#F7F5F1] flex items-center justify-center">
                    <QrCode size={32} className="text-[#8A8578]" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleGenerate(p.id)}
                  disabled={isGenerating}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0B3D7A] text-white px-5 py-2 text-sm font-semibold hover:bg-[#0A3468] transition-colors disabled:opacity-60"
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  {isGenerating ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : qr ? (
                    <RefreshCw size={14} />
                  ) : (
                    <QrCode size={14} />
                  )}
                  {isGenerating ? "Generating…" : qr ? "Regenerate QR" : "Generate QR"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}