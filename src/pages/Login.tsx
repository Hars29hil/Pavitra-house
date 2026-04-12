import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = login(email, password);

    if (success) {
      navigate('/dashboard');
    } else {
      toast({
        title: 'Login failed',
        description: 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] -z-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] -z-1" />

      <div className="w-full max-w-sm animate-scale-in relative z-10">
        <div className="bg-white/80 backdrop-blur-xl border border-border rounded-3xl shadow-soft-lg p-8 md:p-10">
          {/* Logo & Title */}
          <div className="text-center mb-10">
            <div className="mx-auto mb-6 flex items-center justify-center">
              <img
                src="/pavitra-house-logo-v2.png"
                alt="Hari-Saurabh Hostel"
                className="w-80 h-auto object-contain rounded-2xl mix-blend-multiply"
              />
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground/80 ml-1">
                Email Address
              </Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@hostel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 pl-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-2xl transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground/80 ml-1">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 pl-12 pr-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-2xl transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-soft hover:shadow-soft-lg hover:scale-[1.01] active:scale-[0.99] transition-all bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-10 flex flex-col items-center gap-2">
            <div className="h-px w-12 bg-border/50" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tighter">
              Secure admin access only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
