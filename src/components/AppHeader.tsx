import { LogOut, Menu, UserPlus, RefreshCw, CheckSquare, FolderOpen, LayoutDashboard, Users, Cake, MessageCircle, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface AppHeaderProps {
  title: string;
}

export const AppHeader = ({ title }: AppHeaderProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'All Student', icon: LayoutDashboard },
    { path: '/birthdays', label: 'Birthdays', icon: Cake },
    { path: '/update', label: 'Update', icon: RefreshCw },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/categories', label: 'Categories', icon: Users },
    { path: '/education', label: 'Education', icon: BookOpen },
    { path: '/whatsapp', label: 'Message', icon: MessageCircle },
  ];

  const filteredMenuItems = menuItems.filter(item => item.path !== location.pathname);
  const isDashboard = location.pathname === '/dashboard';

  const handleBack = () => {
    const path = location.pathname;
    // Edit Page -> Detail Page
    if (path.includes('/edit')) {
      navigate(path.replace('/edit', ''));
      return;
    }
    // Add Page -> Student List
    if (path.includes('/students/add')) {
      navigate('/students');
      return;
    }
    // Detail Page -> Student List
    if (path.match(/^\/students\/[^/]+$/)) {
      navigate('/students');
      return;
    }
    // Default -> Dashboard
    navigate('/dashboard');
  };

  return (
    <header className="sticky top-0 z-40 glass-header shadow-soft">
      <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto relative">
        <div className="flex items-center">
          {isDashboard ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all rounded-xl"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 border-r border-border/40 shadow-soft-xl bg-white [&>button]:hidden">
                <SheetHeader className="p-6 border-b border-border/10">
                  <SheetTitle className="text-left text-2xl font-black text-foreground">
                    Pavitra House
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col p-4 gap-2 h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Button
                          key={item.path}
                          variant="ghost"
                          onClick={() => navigate(item.path)}
                          className={cn(
                            "w-full justify-start h-14 rounded-2xl gap-4 text-base font-bold transition-all duration-300",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-soft-lg hover:bg-primary hover:text-primary-foreground scale-[1.02]"
                              : "hover:bg-muted hover:text-foreground text-muted-foreground hover:shadow-sm"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="pt-4 mt-auto border-t border-border/10 text-center space-y-2">
                    <p className="text-xs text-muted-foreground font-mono">
                      Last Updated: {new Date().toLocaleDateString()}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl text-xs h-9 gap-2 bg-background/50"
                      onClick={() => window.location.reload()}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Check for Updates
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all rounded-xl"
              onClick={handleBack}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
          )}
        </div>



        {/* Centered Logo */}
        < div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center" >
          <img
            src="/header-logo.png"
            alt="Logo"
            className="h-14 sm:h-16 w-auto object-contain cursor-pointer transition-transform hover:scale-110 active:scale-90 mix-blend-multiply"
            onClick={() => navigate('/dashboard')}
          />
        </div >

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-xl z-10"
          onClick={logout}
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div >
    </header >
  );
};
