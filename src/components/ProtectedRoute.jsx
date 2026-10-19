import { Navigate } from "react-router-dom";

/**
 * Guards a route behind authentication, and optionally a role.
 * - Not logged in -> redirect to /login
 * - `role` can be one role name or a list of role names
 * - Logged in but wrong role -> redirect to /login with a message flag
 */
export default function ProtectedRoute({ auth, role, children }) {
  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = Array.isArray(role) ? role : role ? [role] : null;

  if (allowedRoles && !allowedRoles.includes(auth.user?.role)) {
    return <Navigate to="/login" replace state={{ wrongRole: true }} />;
  }

  return children;
}