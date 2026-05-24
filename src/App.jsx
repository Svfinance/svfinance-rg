// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider }  from "./contexts/ThemeContext"
import { PlanProvider }   from "./contexts/PlanContext"
import { NichoProvider }  from "./contexts/NichoContext"

import Login          from "./pages/Login"
import Dashboard      from "./pages/Dashboard"
import Analytics      from "./pages/Analytics"
import Transactions   from "./pages/Transactions"
import Bills          from "./pages/Bills"
import Products       from "./pages/Products"
import Quotes         from "./pages/Quotes"
import Settings       from "./pages/Settings"
import Clients        from "./pages/Clients"
import Sales          from "./pages/Sales"
import Team           from "./pages/Team"
import Goals          from "./pages/Goals"
import ImportExport   from "./pages/ImportExport"
import Reports        from "./pages/Reports"
import Commissions    from "./pages/Commissions"
import BrandStudio    from "./pages/BrandStudio"
import CheckinScanner from "./pages/Checkin/CheckinScanner"  // ← NOVO
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <ThemeProvider>
      <PlanProvider>
        <NichoProvider>
          <BrowserRouter>
            <Routes>
              {/* Rotas públicas */}
              <Route path="/"               element={<Login />} />
              <Route path="/verify-email"   element={<Login />} />
              <Route path="/reset-password" element={<Login />} />

              {/* ── CHECKIN — rota pública mas com auth interna ──
                  O colaborador escaneia o QR Code → cai aqui.
                  O CheckinScanner verifica o token internamente
                  e redireciona para login se não estiver logado,
                  voltando para esta URL após o login. */}
              <Route path="/checkin/:clientId" element={<CheckinScanner />} />

              {/* Rotas protegidas — qualquer role autenticado */}
              <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/clients"      element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/products"     element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/quotes"       element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
              <Route path="/sales"        element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/settings"     element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/goals"        element={<ProtectedRoute><Goals /></ProtectedRoute>} />
              <Route path="/brand-studio" element={<ProtectedRoute><BrandStudio /></ProtectedRoute>} />

              {/* Rotas protegidas — admin e financeiro */}
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
              <Route path="/reports" element={
                <ProtectedRoute roles={["admin", "financial"]}>
                  <Reports />
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
              <Route path="/commissions" element={
                <ProtectedRoute roles={["admin", "financial", "seller"]}>
                  <Commissions />
                </ProtectedRoute>
              } />
            </Routes>
          </BrowserRouter>
        </NichoProvider>
      </PlanProvider>
    </ThemeProvider>
  )
}

export default App