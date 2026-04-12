
import { useEffect, useRef } from 'react';
import { Task } from '@/types';
import { toast } from 'sonner';

export const useTaskNotifications = (tasks: Task[]) => {
    const hasChecked = useRef(false);

    useEffect(() => {
        // Request permission on mount
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    toast.success("Notifications enabled for Task Deadlines");
                }
            });
        }
    }, []);

    useEffect(() => {
        // Check deadlines only once per session or when tasks change significantly
        // To avoid spamming on every render, we use a ref, but we want to check on load.
        // However, tasks might load async (if we had backend), here they are local state.

        if (tasks.length === 0) return;
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") return;

        // We already checked this session? Maybe we should check anyway if tasks changed?
        // Let's check "due today" specifically.

        // Use local date (YYYY-MM-DD) to match the Input type='date' value
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        tasks.forEach(task => {
            if (task.status === 'pending' && task.dueDate === today) {
                // Simple deduplication logic could be needed in real app (e.g. store 'notified_task_id' in localStorage)
                // For now, we'll trust the user assumes "open app = check status"

                // We only notify if we haven't tracked this specific notification session-wise? 
                // Or just let it notify. The user wants to be notified.

                // Let's prevent spam loop: check only if this is a fresh load or we haven't checked yet.
                // Actually, if a user ADDS a task due today, they shouldn't just get a notification immediately 
                // because they just added it. But the prompt is about "Admin checking assigned task... at the deadline".
                // It implies time passing.

                // For this demo, we'll notify on mount. 
                if (!hasChecked.current) {
                    new Notification(`Task Deadline: ${task.title}`, {
                        body: `Task assigned to ${task.assignedToName || 'Student'} is due today! Please checks.`,
                        icon: '/pwa-192x192.png',
                        tag: `task-${task.id}` // Prevents duplicate notifications for same task
                    });
                }
            }
        });

        hasChecked.current = true;

        // Optional: Set up an interval to check crossing into "tomorrow" or "due time" if the app stays open.
        const interval = setInterval(() => {
            const d = new Date();
            const currentToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            tasks.forEach(task => {
                if (task.status === 'pending' && task.dueDate === currentToday) {
                    new Notification(`Task Deadline: ${task.title}`, {
                        body: `Task assigned to ${task.assignedToName || 'Student'} is due today!`,
                        icon: '/pwa-192x192.png',
                        tag: `task-${task.id}`
                    });
                }
            });
        }, 60 * 60 * 1000); // Check every hour

        return () => clearInterval(interval);

    }, [tasks]);
};
