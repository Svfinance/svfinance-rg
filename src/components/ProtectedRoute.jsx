import { Navigate } from "react-router-dom";

function _isRGHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h === "restauraglass.svfinance.com.br" ||
    h === "solucoes.svfinance.com.br"      ||
    h === "localhost"                       ||
    h === "127.0.0.1"
  );
}

function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");

  if (!token) return <Navigate to="/" />;
  if (roles && !roles.includes(role)) return <Navigate to={_isRGHost() ? "/home" : "/dashboard"} />;

  return children;
}

export default ProtectedRoute;
