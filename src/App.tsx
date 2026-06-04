import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Birthdays from "./pages/Birthdays";
import StudentDetails from "./pages/StudentDetails";
import AddStudent from "./pages/AddStudent";
import Update from "./pages/Update";
import Categories from "./pages/Categories";
import Education from "./pages/Education";
import Tasks from "./pages/Tasks";
import NotFound from "./pages/NotFound";
import Whatsapp from "./pages/Whatsapp";

import { TaskNotificationManager } from "@/components/TaskNotificationManager";
import { InstallPrompt } from "@/components/InstallPrompt";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

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
      <Route path="/" element={<RootRedirect />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
      <Route path="/birthdays" element={<ProtectedRoute><Birthdays /></ProtectedRoute>} />
      <Route path="/students/add" element={<ProtectedRoute><AddStudent /></ProtectedRoute>} />
      <Route path="/students/:id" element={<ProtectedRoute><StudentDetails /></ProtectedRoute>} />
      <Route path="/students/:id/edit" element={<ProtectedRoute><AddStudent /></ProtectedRoute>} />
      <Route path="/update" element={<ProtectedRoute><Update /></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
      <Route path="/education" element={<ProtectedRoute><Education /></ProtectedRoute>} />
      <Route path="/whatsapp" element={<ProtectedRoute><Whatsapp /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />

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
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />;
}

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
