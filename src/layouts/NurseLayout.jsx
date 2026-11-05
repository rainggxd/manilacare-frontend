import PortalLayout from "./PortalLayout";
import { frontDeskSections } from "./frontDeskNav";

/**
 * Nurse portal: same front desk work as Staff (check-in, queue, height
 * and weight, records), but appointments are view-only and the
 * diagnosis is never shown (Doctor only).
 */
export default function NurseLayout({ auth, onLogout }) {
  return (
    <PortalLayout
      auth={auth}
      onLogout={onLogout}
      portalName="Nurse Portal"
      homePath="/nurse"
      sections={frontDeskSections("/nurse")}
    />
  );
}
