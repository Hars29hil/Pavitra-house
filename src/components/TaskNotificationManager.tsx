import { useState, useEffect } from 'react';
import { getTasks } from '@/lib/store';
import { Task } from '@/types';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BellRing } from 'lucide-react';
import { requestNotificationPermission } from '@/lib/firebase';
import { toast } from 'sonner';

export const TaskNotificationManager = () => {
    const { isAuthenticated, studentId, adminRole } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [showPrompt, setShowPrompt] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const data = await getTasks();
                setTasks(data || []);
            } catch (error) {
                console.error("Error fetching tasks for notifications:", error);
            }
        };

        fetchTasks();

        // Optional: Poll every 10 minutes to keep notifications fresh
        const interval = setInterval(fetchTasks, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Check if permission is not granted on login
    useEffect(() => {
        if (isAuthenticated && 'Notification' in window) {
            const hasDismissed = sessionStorage.getItem('notifications_prompt_dismissed') === 'true';
            if (Notification.permission !== 'granted' && !hasDismissed) {
                // Show prompt after a short delay so user is settled on the page
                const timer = setTimeout(() => {
                    setShowPrompt(true);
                }, 2000);
                return () => clearTimeout(timer);
            }
        }
    }, [isAuthenticated]);

    useTaskNotifications(tasks);

    const handleEnable = async () => {
        setLoading(true);
        try {
            const email = adminRole === 'admin' ? 'admin@pavitra.com' : '';
            const token = await requestNotificationPermission(studentId, email);
            if (token) {
                toast.success("✅ Notifications enabled successfully!");
                setShowPrompt(false);
            } else {
                toast.error("Could not register notifications. Please check site permissions.");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred enabling notifications.");
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        sessionStorage.setItem('notifications_prompt_dismissed', 'true');
        setShowPrompt(false);
    };

    return (
        <Dialog open={showPrompt} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
            <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none bg-white shadow-2xl">
                <DialogHeader className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
                        <BellRing className="w-8 h-8 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-foreground">
                        Enable Notifications
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-xs">
                        Don't miss out on important task updates, reminders, and deadline alerts. Keep track of all your duties in real-time.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button 
                        variant="outline" 
                        onClick={handleDismiss}
                        className="flex-1 rounded-2xl h-12 text-sm font-bold border-border/80 hover:bg-muted"
                    >
                        Maybe Later
                    </Button>
                    <Button 
                        onClick={handleEnable}
                        disabled={loading}
                        className="flex-1 bg-primary text-white hover:bg-primary/95 rounded-2xl h-12 text-sm font-bold shadow-soft"
                    >
                        {loading ? "Enabling..." : "Enable Alerts"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
