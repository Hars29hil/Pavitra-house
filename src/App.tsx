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
import StudentResults from "./pages/StudentResults";
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
  const { isAuthenticated, adminRole, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminRole !== 'admin') {
    // Show a blank/placeholder page for Karyakartas for now
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Welcome!</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          You are logged in as a <strong>{adminRole}</strong>. The Karyakarta dashboard features are coming soon!
        </p>
        <button 
          onClick={logout}
          className="mt-8 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium shadow-sm hover:bg-primary/90 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

import StudentSelfUpdate from "./pages/StudentSelfUpdate";
import StudentSelfRegister from "./pages/StudentSelfRegister";

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
      <Route path="/" element={<RootRedirect />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
      <Route path="/birthdays" element={<ProtectedRoute><Birthdays /></ProtectedRoute>} />
      <Route path="/students/add" element={<ProtectedRoute><AddStudent /></ProtectedRoute>} />
      <Route path="/students/:id" element={<ProtectedRoute><StudentDetails /></ProtectedRoute>} />
      <Route path="/students/:id/edit" element={<ProtectedRoute><AddStudent /></ProtectedRoute>} />
      <Route path="/students/:id/results" element={<ProtectedRoute><StudentResults /></ProtectedRoute>} />
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
