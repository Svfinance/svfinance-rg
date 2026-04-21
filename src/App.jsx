import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import Analytics    from "./pages/Analytics";
import Transactions from "./pages/Transactions";
import Bills        from "./pages/Bills";
import Products     from "./pages/Products";
import Quotes       from "./pages/Quotes";
import Settings     from "./pages/Settings";
import Clients      from "./pages/Clients";
import Sales        from "./pages/Sales";
import Team         from "./pages/Team";
import Goals        from "./pages/Goals";
import ImportExport from "./pages/ImportExport";
import DRE          from "./pages/DRE";
import CashFlow     from "./pages/CashFlow";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/verify-email"   element={<Login />} />
          <Route path="/reset-password" element={<Login />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/clients"   element={<ProtectedRoute><Clients /></ProtectedRoute>} />
          <Route path="/products"  element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/quotes"    element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
          <Route path="/sales"     element={<ProtectedRoute><Sales /></ProtectedRoute>} />
          <Route path="/settings"  element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/goals"     element={<ProtectedRoute><Goals /></ProtectedRoute>} />

          <Route path="/transactions" element={
            <ProtectedRoute roles={["admin", "financial"]}>
              <Transactions />
            </ProtectedRoute>
          } />
          <Route path="/bills" element={
            <ProtectedRoute roles={["admin", "financial"]}>
              <Bills />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute roles={["admin", "financial"]}>
              <Analytics />
            </ProtectedRoute>
          } />
          <Route path="/dre" element={
            <ProtectedRoute roles={["admin", "financial"]}>
              <DRE />
            </ProtectedRoute>
          } />
          <Route path="/team" element={
            <ProtectedRoute roles={["admin"]}>
              <Team />
            </ProtectedRoute>
          } />
          <Route path="/import-export" element={
            <ProtectedRoute roles={["admin", "financial"]}>
              <ImportExport />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;