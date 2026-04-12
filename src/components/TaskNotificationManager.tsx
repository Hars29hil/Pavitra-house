import { useState, useEffect } from 'react';
import { getTasks } from '@/lib/store';
import { Task } from '@/types';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';

export const TaskNotificationManager = () => {
    const [tasks, setTasks] = useState<Task[]>([]);

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

    useTaskNotifications(tasks);

    return null;
};
