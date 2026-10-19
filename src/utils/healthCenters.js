import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/**
 * Shared list of health centers used by every page for names and
 * dropdowns. It starts with the two centers of the study and is
 * replaced with the real list from the database right after login
 * (and again when the Master Admin adds a new center).
 *
 * The array is updated IN PLACE, so every page that imports it sees the
 * latest list the next time it renders.
 */
export const HEALTH_CENTERS = [
  { id: 1, name: "Bo. Magsaysay Health Center" },
  { id: 2, name: "Foreshore Tondo Health Center" },
];

export function healthCenterName(id) {
  return HEALTH_CENTERS.find((h) => String(h.id) === String(id))?.name ?? "\u2014";
}

export async function refreshHealthCenters(token) {
  try {
    const res = await axios.get(`${API_BASE_URL}/health-centers`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const rows = res.data?.data ?? [];
    if (rows.length > 0) {
      HEALTH_CENTERS.splice(
        0,
        HEALTH_CENTERS.length,
        ...rows.map((row) => ({ id: Number(row.id), name: row.center_name }))
      );
    }
  } catch (err) {
    // Keep the fallback list if the request fails; pages still work.
  }
  return HEALTH_CENTERS;
}