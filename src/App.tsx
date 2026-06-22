import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ConfirmationProvider } from "@/contexts/ConfirmationContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Birthdays from "./pages/Birthdays";
import StudentDetails from "./pages/StudentDetails";
import AddStudent from "./pages/AddStudent";
import StudentResults from "./pages/StudentResults";
import Update from "./pages/Update";
import Categories from "./pages/Categories";
import Education from "./pages/Education";
import Tasks from "./pages/Tasks";
import NotFound from "./pages/NotFound";
import Whatsapp from "./pages/Whatsapp";
import Tags from "./pages/Tags";

import { TaskNotificationManager } from "@/components/TaskNotificationManager";
import { InstallPrompt } from "@/components/InstallPrompt";

const queryClient = new QueryClient();

const ProtectedRoute = ({ 
  children, 
  allowedRoles = ['admin'] 
}: { 
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const { isAuthenticated, adminRole } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If the user's role is not in the allowed roles list, redirect based on role
  if (allowedRoles && !allowedRoles.includes(adminRole)) {
    return <Navigate to={adminRole === 'yuvak' ? "/profile" : "/dashboard"} replace />;
  }

  return <>{children}</>;
};

import StudentSelfUpdate from "./pages/StudentSelfUpdate";
import StudentSelfRegister from "./pages/StudentSelfRegister";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Profile from "./pages/Profile";
import NotificationCheck from "./pages/NotificationCheck";

// Layout component to wrap Auth and Global context components
const AuthLayout = () => {
  return (
    <AuthProvider>
      <TaskNotificationManager />
      <InstallPrompt />
      <Outlet />
    </AuthProvider>
  );
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AuthLayout />}>
      {/* Public Routes - Wrapped in AuthLayout to access auth context for redirecting if already logged in */}
      <Route path="/login" element={<LoginWrapper />} />
      <Route path="/self-update/:mobile" element={<StudentSelfUpdate />} />
      <Route path="/register" element={<StudentSelfRegister />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/students-check" element={<NotificationCheck />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'Karyakarta', 'Sub-Karyakarta']}><Dashboard /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute allowedRoles={['admin', 'Karyakarta', 'Sub-Karyakarta']}><Students /></ProtectedRoute>} />
      <Route path="/birthdays" element={<ProtectedRoute allowedRoles={['admin', 'Karyakarta', 'Sub-Karyakarta']}><Birthdays /></ProtectedRoute>} />
      <Route path="/students/add" element={<ProtectedRoute allowedRoles={['admin', 'Karyakarta', 'Sub-Karyakarta']}><AddStudent /></ProtectedRoute>} />
      <Route path="/students/:id" element={<ProtectedRoute allowedRoles={['admin', 'Karyakarta', 'Sub-Karyakarta']}><StudentDetails /></ProtectedRoute>} />
      <Route path="/students/:id/edit" element={<ProtectedRoute allowedRoles={['admin', 'Karyakarta', 'Sub-Karyakarta']}><AddStudent /></ProtectedRoute>} />
      <Route path="/students/:id/results" element={<ProtectedRoute allowedRoles={['admin']}><StudentResults /></ProtectedRoute>} />
      <Route path="/update" element={<ProtectedRoute allowedRoles={['admin']}><Update /></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute allowedRoles={['admin']}><Categories /></ProtectedRoute>} />
      <Route path="/education" element={<ProtectedRoute allowedRoles={['admin', 'Karyakarta', 'Sub-Karyakarta']}><Education /></ProtectedRoute>} />
      <Route path="/whatsapp" element={<ProtectedRoute allowedRoles={['admin', 'Karyakarta', 'Sub-Karyakarta']}><Whatsapp /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute allowedRoles={['admin', 'Karyakarta', 'Sub-Karyakarta']}><Tasks /></ProtectedRoute>} />
      <Route path="/tags" element={<ProtectedRoute allowedRoles={['admin']}><Tags /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute allowedRoles={['admin', 'Karyakarta', 'Sub-Karyakarta', 'yuvak']}><Profile /></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Route>
  ),
  {
    future: {
      // @ts-ignore
      v7_startTransition: true,
    }
  }
);

// Wrapper components needed because we can't use hooks inside the definition directly easily without extraction or layout
// Actually, we can just inline the logic in the router definition if we want, but keeping wrappers is safer for Hook usage.
// Wait, `Login` uses `useAuth` inside it? Yes. `ProtectedRoute` uses `useAuth`.
// `AuthLayout` wraps them all basically, so `AuthContext` IS provided.
// BUT `LoginWrapper` needs `useAuth`. `RootRedirect` needs `useAuth`.

function LoginWrapper() {
  const { isAuthenticated, adminRole } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={adminRole === 'yuvak' ? "/profile" : "/dashboard"} replace />;
  }
  return <Login />;
}

function RootRedirect() {
  const { isAuthenticated, adminRole } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={adminRole === 'yuvak' ? "/profile" : "/dashboard"} replace />;
  }
  return <Navigate to="/login" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ConfirmationProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </ConfirmationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
