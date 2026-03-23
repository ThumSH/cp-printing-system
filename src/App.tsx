import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
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
import AdviceNotePage from './pages/gatepass/AdviceNotePage';
import AuditPage from './pages/audit/AuditPage';
import DeliveryTrackerPage from './pages/qc/DeliveryTrackerPage';
import UserManagementPage from './pages/admin/UserManagement';
import DailyOutputPage from './pages/worker/DailyOutputPage';
import DowntimeReportPage from './pages/worker/DowntimeReportPage';
import ActivityLogPage from './pages/admin/ActivityLogPage';
import SplashScreen from './components/SplashScreen';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const RoleRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
   const [showSplash, setShowSplash] = useState(true);
   
   if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />

          <Route path="development">
            <Route
              index
              element={
                <RoleRoute allowedRoles={['Developer', 'Admin']}>
                  <DevelopmentPage />
                </RoleRoute>
              }
            />
            <Route
              path="submit"
              element={
                <RoleRoute allowedRoles={['Developer', 'Admin']}>
                  <DevelopmentSubmission />
                </RoleRoute>
              }
            />
            <Route
              path="search"
              element={
                <RoleRoute allowedRoles={['Developer', 'Admin', 'QC']}>
                  <SubmissionSearch />
                </RoleRoute>
              }
            />
          </Route>

          <Route path="admin">
            <Route
              path="approve"
              element={
                <RoleRoute allowedRoles={['Admin']}>
                  <ApproveSubmission />
                </RoleRoute>
              }
            /> 

            <Route path="activity-log" element={
  <RoleRoute allowedRoles={['Admin']}>
    <ActivityLogPage />
  </RoleRoute>
} />      

          <Route
            path="users"
            element={
              <RoleRoute allowedRoles={['Admin']}>
                <UserManagementPage />
              </RoleRoute>
            }
          />
          
            <Route
              path="search"
              element={
                <RoleRoute allowedRoles={['Admin']}>
                  <ApprovalSearch />
                </RoleRoute>
              }
            />
          </Route>

          <Route path="inventory">
            <Route
              index
              element={
                <RoleRoute allowedRoles={['Stores', 'Admin']}>
                  <StoreInPage />
                </RoleRoute>
              }
            />
            <Route
              path="in"
              element={
                <RoleRoute allowedRoles={['Stores', 'Admin']}>
                  <StoreInPage />
                </RoleRoute>
              }
            />
            <Route
              path="production"
              element={
                <RoleRoute allowedRoles={['Stores', 'Admin']}>
                  <StoreProductionPage />
                </RoleRoute>
              }
            />
          </Route>

          <Route path="qc">
            <Route
              index
              element={
                <RoleRoute allowedRoles={['QC', 'Admin']}>
                  <CPIPage />
                </RoleRoute>
              }
            />
            <Route
              path="cpi"
              element={
                <RoleRoute allowedRoles={['QC', 'Admin']}>
                  <CPIPage />
                </RoleRoute>
              }
            />
            <Route
              path="delivery-tracker"
              element={
                <RoleRoute allowedRoles={['QC', 'Admin']}>
                  <DeliveryTrackerPage />
                </RoleRoute>
              }
            />
          </Route>

          <Route
            path="audit"
            element={
              <RoleRoute allowedRoles={['Audit', 'Admin']}>
                <AuditPage />
              </RoleRoute>
            }
          />

          <Route path="gatepass">
            <Route
              index
              element={
                <RoleRoute allowedRoles={['Gatepass', 'Admin']}>
                  <AdviceNotePage />
                </RoleRoute>
              }
            />
            <Route
              path="advicenote"
              element={
                <RoleRoute allowedRoles={['Gatepass', 'Admin']}>
                  <AdviceNotePage />
                </RoleRoute>
              }
            />
          </Route>

          <Route path="worker" element={<DailyOutputPage />} />
          <Route path="worker/downtime" element={
  <RoleRoute allowedRoles={['Worker', 'Admin']}>
    <DowntimeReportPage />
  </RoleRoute>
} />

          <Route path="orders" element={<div className="p-4">Orders Page Coming Soon</div>} />
          <Route path="customers" element={<div className="p-4">Customers Page Coming Soon</div>} />
          <Route path="settings" element={<div className="p-4">Settings Page Coming Soon</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;