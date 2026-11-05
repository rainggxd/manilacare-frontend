import PortalLayout from "./PortalLayout";
import { frontDeskSections } from "./frontDeskNav";

export default function StaffLayout({ auth, onLogout }) {
  return (
    <PortalLayout
      auth={auth}
      onLogout={onLogout}
      portalName="Staff Portal"
      homePath="/staff"
      sections={frontDeskSections("/staff")}
    />
  );
}
