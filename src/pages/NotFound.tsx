import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Ghost } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] -z-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] -z-1" />

      <div className="text-center space-y-8 animate-scale-in">
        <div className="w-24 h-24 bg-white/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-soft flex items-center justify-center mx-auto transform rotate-6 hover:rotate-0 transition-transform duration-500">
          <Ghost className="w-12 h-12 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-8xl font-black text-primary tracking-tighter">404</h1>
          <h2 className="text-2xl font-bold text-foreground">Lost in the Hallway?</h2>
          <p className="text-muted-foreground font-medium max-w-[280px] mx-auto">The page you're looking for doesn't exist or has been moved.</p>
        </div>

        <Button
          onClick={() => navigate('/')}
          size="lg"
          className="h-14 px-10 rounded-2xl font-bold bg-primary hover:bg-primary/90 shadow-soft hover:shadow-soft-lg hover:scale-[1.05] active:scale-[0.95] transition-all"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
