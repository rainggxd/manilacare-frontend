import { useState, useEffect } from "react";
import axios from "axios";
import ReportsPage from "./pages/dashboard/ReportsPage";
import MasterAdminDashboardPage from "./pages/dashboard/MasterAdminDashboardPage";
import { refreshHealthCenters } from "./utils/healthCenters";
import UserManagementPage from "./pages/dashboard/UserManagementPage";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import TermsAndConditionsPage from "./pages/legal/TermsAndConditionsPage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/dashboard/DashboardPage";
import PatientRegistrationListPage from "./pages/dashboard/patients/PatientRegistrationListPage";
import PatientRecordsPage from "./pages/dashboard/patients/PatientRecordsPage";
import PatientDetailPage from "./pages/dashboard/patients/PatientDetailPage";
import AppointmentsPage from "./pages/dashboard/AppointmentsPage";
import HealthCentersPage from "./pages/dashboard/HealthCentersPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import ActivityLogsPage from "./pages/dashboard/ActivityLogsPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import LandingPage from "./pages/public/LandingPage";
import DoctorLayout from "./layouts/DoctorLayout";
import DoctorDashboardPage from "./pages/doctor/DoctorDashboardPage";
import DoctorPatientRecordsPage from "./pages/doctor/DoctorPatientRecordsPage";
import DoctorPatientDetailPage from "./pages/doctor/DoctorPatientDetailPage";
import DoctorReportsPage from "./pages/doctor/DoctorReportsPage";
import PatientLayout from "./layouts/PatientLayout";
import MyAppointmentsPage from "./pages/patient/MyAppointmentsPage";
import MyPrescriptionsPage from "./pages/patient/MyPrescriptionsPage";
import DoctorAppointmentsPage from "./pages/doctor/DoctorAppointmentsPage";
import DoctorDiagnosisPrescriptionsPage from "./pages/doctor/DoctorDiagnosisPrescriptionsPage";
import BackupRestorePage from "./pages/dashboard/BackupRestorePage";
import StaffLayout from "./layouts/StaffLayout";
import StaffDashboardPage from "./pages/staff/StaffDashboardPage";
import CheckInPage from "./pages/staff/CheckInPage";
import StaffPatientRecordsPage from "./pages/staff/StaffPatientRecordsPage";
import StaffPatientDetailPage from "./pages/staff/StaffPatientDetailPage";
import PatientDashboardPage from "./pages/patient/PatientDashboardPage";
import QRManagementPage from "./pages/dashboard/QRManagementPage";
import ScanQRPage from "./pages/staff/ScanQRPage";
import ScanPatientPage from "./pages/staff/ScanPatientPage";

// Health center computers are shared, so a forgotten session logs itself out.
const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes without any activity

function App() {
  const [auth, setAuth] = useState(null);

  // Auto logout when the user has been idle for a while.
  useEffect(() => {
    if (!auth) return undefined;

    let timer;
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setAuth(null), IDLE_LIMIT_MS);
    };

    events.forEach((name) => window.addEventListener(name, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, resetTimer));
    };
  }, [auth]);

  // If the server says the login is no longer valid (token expired, or the
  // account was deactivated), send the user back to the login page.
  useEffect(() => {
    if (!auth) return undefined;

    const id = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error?.response?.data?.message;
        const tokenProblem =
          message === "Invalid or expired token." || message === "Authentication required.";
        if (error?.response?.status === 401 && tokenProblem) {
          setAuth(null);
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(id);
  }, [auth]);

  const handleLoginSuccess = async (data) => {
    // Load the real list of health centers first so names and dropdowns are right.
    await refreshHealthCenters(data?.token);
    setAuth(data);
  };

  const handleLogout = () => {
    setAuth(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            auth ? (
              auth.user?.role === "Master Admin" || auth.user?.role === "Admin" ? (
                <Navigate to="/dashboard" replace />
              ) : auth.user?.role === "Doctor" ? (
                <Navigate to="/doctor" replace />
              ) : auth.user?.role === "Patient" ? (
                <Navigate to="/patient" replace />
              ) : auth.user?.role === "Staff" ? (
                <Navigate to="/staff" replace />
              ) : (
                <PortalComingSoon user={auth.user} onLogout={handleLogout} />
              )
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        {/* Public landing page (Kalinga, Mission and Vision) */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/terms" element={<TermsAndConditionsPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute auth={auth} role={["Master Admin", "Admin"]}>
              <AdminLayout auth={auth} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={auth?.user?.role === "Master Admin" ? <MasterAdminDashboardPage /> : <DashboardPage />}
          />
          <Route path="users" element={<UserManagementPage />} />

          {/* Master Admin = whole system, Admin = own center */}
          <Route path="backup-restore" element={<BackupRestorePage />} />

          {/* Admin (health center) only: all patient data */}
          <Route path="patients" element={<RoleOnly auth={auth} roles={["Admin"]}><PatientRegistrationListPage /></RoleOnly>} />
          <Route path="patients/new" element={<RoleOnly auth={auth} roles={["Admin"]}><RegisterPage /></RoleOnly>} />
          <Route path="records" element={<RoleOnly auth={auth} roles={["Admin"]}><PatientRecordsPage /></RoleOnly>} />
          <Route path="records/:id" element={<RoleOnly auth={auth} roles={["Admin"]}><PatientDetailPage /></RoleOnly>} />
          <Route path="qr-code" element={<RoleOnly auth={auth} roles={["Admin"]}><QRManagementPage /></RoleOnly>} />
          <Route path="appointments" element={<RoleOnly auth={auth} roles={["Admin"]}><AppointmentsPage /></RoleOnly>} />
          <Route path="reports" element={<RoleOnly auth={auth} roles={["Admin"]}><ReportsPage /></RoleOnly>} />
          <Route path="activity-logs" element={<RoleOnly auth={auth} roles={["Admin"]}><ActivityLogsPage /></RoleOnly>} />

          {/* Master Admin only: system management */}
          <Route path="health-centers" element={<RoleOnly auth={auth} roles={["Master Admin"]}><HealthCentersPage /></RoleOnly>} />
          <Route path="settings" element={<RoleOnly auth={auth} roles={["Master Admin"]}><SettingsPage /></RoleOnly>} />
        </Route>

        <Route
          path="/doctor"
          element={
            <ProtectedRoute auth={auth} role="Doctor">
              <DoctorLayout auth={auth} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<DoctorDashboardPage />} />
          <Route path="records" element={<DoctorPatientRecordsPage />} />
          <Route path="records/:id" element={<DoctorPatientDetailPage />} />
          <Route path="reports" element={<DoctorReportsPage />} />
          <Route path="appointments" element={<DoctorAppointmentsPage />} />
          <Route path="diagnosis" element={<DoctorDiagnosisPrescriptionsPage />} />
        </Route>

        <Route
          path="/staff"
          element={
            <ProtectedRoute auth={auth} role="Staff">
              <StaffLayout auth={auth} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<StaffDashboardPage />} />
          <Route path="check-in" element={<CheckInPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="records" element={<StaffPatientRecordsPage />} />
          <Route path="records/:id" element={<StaffPatientDetailPage />} />
          <Route path="scan-qr" element={<ScanQRPage />} />
          <Route path="scan-patient" element={<ScanPatientPage />} />
        </Route>

        <Route
          path="/patient"
          element={
            <ProtectedRoute auth={auth} role="Patient">
              <PatientLayout auth={auth} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<PatientDashboardPage />} />
          <Route path="appointments" element={<MyAppointmentsPage />} />
          <Route path="prescriptions" element={<MyPrescriptionsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/** Sends the user back to the dashboard when their role may not open this page. */
function RoleOnly({ auth, roles, children }) {
  if (!roles.includes(auth?.user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function PortalComingSoon({ user, onLogout }) {
  return (
    <div className="min-h-screen w-full bg-[#F7F5F1] flex flex-col items-center justify-center px-4 text-center">
      <h1
        className="text-3xl text-[#16324F] mb-3"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Welcome, {user?.full_name ?? "there"}!
      </h1>
      <p className="text-[#5B6470] mb-1" style={{ fontFamily: "'Lora', serif" }}>
        You're successfully logged in as {user?.role ?? "a user"}.
      </p>
      <p className="text-[#8A8578] text-sm mb-8 max-w-sm" style={{ fontFamily: "'Lora', serif" }}>
        Your portal is still being built. Please check back soon.
      </p>
      <button
        onClick={onLogout}
        className="rounded-full bg-[#4B4F58] text-white px-8 py-3 hover:bg-[#3C3F47] transition-colors"
        style={{ fontFamily: "'Lora', serif" }}
      >
        Logout
      </button>
    </div>
  );
}

export default App;