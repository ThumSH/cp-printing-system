// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DevelopmentPage from './pages/development/DevelopmentPage';
import DevelopmentSubmission from './pages/development/DevelopmentSubmission';
import SubmissionSearch from './pages/development/SubmissionSearch';
import ApproveSubmission from './pages/admin/ApproveSubmission';
import ApprovalSearch from './pages/admin/ApprovalSearch';
import StoreInPage from './pages/inventory/StoreInPage';
import CPIPage from './pages/qc/CPIPage';
import StoreProductionPage from './pages/inventory/StoreProductionPage';
// --- The Gatekeeper Component ---
// This prevents unauthorized access to the main application
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    // If they aren't logged in, instantly redirect them to the login page
    // 'replace' prevents them from hitting the "back" button to return to a protected page
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Public Route */}
        <Route path="/login" element={<Login />} />

        {/* 2. Protected Application Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* These render INSIDE the MainLayout's <Outlet /> */}
          <Route index element={<Dashboard />} />
          <Route path="development">
            <Route index element={<DevelopmentPage />} />
            <Route path="submit" element={<DevelopmentSubmission />} />
            <Route path="search" element={<SubmissionSearch />} />
          </Route>
          
          <Route path="admin">
            <Route path="approve" element={<ApproveSubmission />} />
            <Route path="search" element={<ApprovalSearch />} />
          </Route>

          <Route path="inventory">
            <Route index element={<StoreInPage />} />
            <Route path="in" element={<StoreInPage />} />
            <Route path="production" element={<StoreProductionPage />} /> {/* NEW */}
          </Route>
          
          <Route path="qc">
            <Route index element={<CPIPage />} />
            <Route path="cpi" element={<CPIPage />} />
          </Route>
          
          <Route path="orders" element={<div className="p-4">Orders Page Coming Soon</div>} />
          <Route path="customers" element={<div className="p-4">Customers Page Coming Soon</div>} />
          <Route path="inventory" element={<div className="p-4">Inventory Page Coming Soon</div>} />
          <Route path="settings" element={<div className="p-4">Settings Page Coming Soon</div>} />
        </Route>

        {/* 3. Catch-all: If user types a random URL, send them to the dashboard (or login if caught by gatekeeper) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;