/**
 * Start of the URL of the logged-in user's portal.
 * Staff and Nurse share the same front desk pages, so links inside those
 * pages use this to stay in the right portal (/staff/... or /nurse/...).
 */
export function portalBase(role) {
  switch (role) {
    case "Nurse":
      return "/nurse";
    case "Staff":
      return "/staff";
    case "Doctor":
      return "/doctor";
    case "Patient":
      return "/patient";
    default:
      return "/dashboard";
  }
}
