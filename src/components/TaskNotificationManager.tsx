import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BellRing } from 'lucide-react';
import { requestNotificationPermission, listenForMessages } from '@/lib/firebase';
import { toast } from 'sonner';

// NOTE: Task reminder notifications are now sent by the Hostinger cron job
// which calls /api/send_task_reminders.php every minute.
// This component only handles:
//   1. Asking the user to grant browser notification permission
//   2. Showing incoming FCM messages as toasts when the app is in foreground

export const TaskNotificationManager = () => {
    const { isAuthenticated, studentId, adminRole } = useAuth();
    const [showPrompt, setShowPrompt] = useState(false);
    const [loading, setLoading] = useState(false);

    // Show permission prompt 2 seconds after login if not yet granted
    useEffect(() => {
        if (isAuthenticated && 'Notification' in window) {
            const hasDismissed = sessionStorage.getItem('notifications_prompt_dismissed') === 'true';
            if (Notification.permission !== 'granted' && !hasDismissed) {
                const timer = setTimeout(() => setShowPrompt(true), 2000);
                return () => clearTimeout(timer);
            }
        }
    }, [isAuthenticated]);

    // Listen for foreground FCM messages and show as toast
    useEffect(() => {
        if (!isAuthenticated) return;
        listenForMessages((payload) => {
            const title = payload?.notification?.title || 'Pavitra Notification';
            const body  = payload?.notification?.body  || '';
            toast.info(`🔔 ${title}`, {
                description: body,
                duration: 8000,
            });
        });
    }, [isAuthenticated]);

    const handleEnable = async () => {
        setLoading(true);
        try {
            const email = adminRole === 'admin' ? 'admin@pavitra.com' : '';
            const token = await requestNotificationPermission(studentId, email);
            if (token) {
                toast.success('✅ Notifications enabled! You will now receive task reminders.');
                setShowPrompt(false);
            } else {
                toast.error('Could not register notifications. Please allow notifications in your browser settings.');
            }
        } catch (err) {
            console.error(err);
            toast.error('An error occurred while enabling notifications.');
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
                        Don't miss important task reminders and deadline alerts. Enable push notifications to stay updated even when the app is closed.
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
                        {loading ? 'Enabling...' : 'Enable Alerts'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
