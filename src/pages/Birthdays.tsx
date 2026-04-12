import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cake, Sparkles, Send, Settings, Clock, Power, Users, ChevronDown } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { getStudents, getSetting, updateSetting } from '@/lib/store';
import { Student } from '@/types';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const Birthdays = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState<Student[]>([]);
    const [messageTemplate, setMessageTemplate] = useState("Happy Birthday, {name}! 🎉🎂 Wishing you a fantastic day filled with joy and happiness!");
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);
    const [tempTemplate, setTempTemplate] = useState("");

    // Auto-send settings
    const [autoSendEnabled, setAutoSendEnabled] = useState(false);
    const [autoSendTime, setAutoSendTime] = useState("09:00"); // Default 9 AM
    const [groupLink, setGroupLink] = useState("");
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [lastSentDate, setLastSentDate] = useState<string | null>(null);

    // Helpers for rendering 12hr time UI
    const [timeHourStr, timeMinuteStr] = (autoSendTime || "09:00").split(':');
    const hourNum = parseInt(timeHourStr, 10);
    const isPM = hourNum >= 12;
    const hour12 = hourNum % 12 === 0 ? 12 : hourNum % 12;
    const minStr = timeMinuteStr || "00";

    const updateTime = (newHour12: number, newMin: string, pm: boolean) => {
        let h24 = newHour12;
        if (pm && h24 !== 12) h24 += 12;
        if (!pm && h24 === 12) h24 = 0;
        setAutoSendTime(`${String(h24).padStart(2, '0')}:${newMin}`);
    };

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const data = await getStudents();
                setStudents(data || []);
            } catch (error) {
                setStudents([]);
            }
        };
        fetchStudents();
    }, []);

    useEffect(() => {
        const loadSettings = async () => {
            const savedTemplate = await getSetting('birthday_template');
            const savedAutoSend = await getSetting('birthday_auto_send');
            const savedTime = await getSetting('birthday_auto_time');
            const savedLastSent = await getSetting('birthday_last_sent');
            const savedGroupLink = await getSetting('birthday_group_link');

            if (savedTemplate) setMessageTemplate(savedTemplate);
            if (savedAutoSend) setAutoSendEnabled(savedAutoSend === 'true');
            if (savedTime) setAutoSendTime(savedTime);
            if (savedLastSent) setLastSentDate(savedLastSent);
            if (savedGroupLink) setGroupLink(savedGroupLink);
        };
        loadSettings();
    }, []);

    // Auto-send checker - runs every minute
    useEffect(() => {
        if (!autoSendEnabled) return;

        const checkAndSend = async () => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const currentDate = now.toISOString().split('T')[0];

            // Check if it's time to send and we haven't sent today
            if (currentTime === autoSendTime && lastSentDate !== currentDate) {
                await sendBirthdayWishesToAll();
                setLastSentDate(currentDate);
                await updateSetting('birthday_last_sent', currentDate);
            }
        };

        const interval = setInterval(checkAndSend, 60000); // Check every minute
        checkAndSend(); // Check immediately

        return () => clearInterval(interval);
    }, [autoSendEnabled, autoSendTime, lastSentDate, students, messageTemplate, groupLink]);

    // Filter students whose birthday is TODAY
    const birthdayStudents = students.filter(student => {
        if (!student.dob) return false;

        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 0-indexed
        const currentDay = today.getDate();

        const [year, month, day] = student.dob.split('-').map(Number);

        return month === currentMonth && day === currentDay;
    });

    const handleSaveTemplate = async () => {
        try {
            await updateSetting('birthday_template', tempTemplate);
            setMessageTemplate(tempTemplate);
            setIsEditingTemplate(false);
            toast.success("Birthday template updated!");
        } catch (error) {
            toast.error("Failed to save template");
        }
    };

    const handleSaveSettings = async () => {
        try {
            await updateSetting('birthday_auto_send', String(autoSendEnabled));
            await updateSetting('birthday_auto_time', autoSendTime);
            await updateSetting('birthday_group_link', groupLink);
            setIsEditingSettings(false);
            toast.success("Auto-send settings saved!");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    const sendBirthdayWishesToAll = async () => {
        if (birthdayStudents.length === 0) return;

        let successCount = 0;
        let failCount = 0;

        for (const student of birthdayStudents) {
            if (!student.mobile) {
                failCount++;
                continue;
            }

            try {
                const message = messageTemplate.replace('{name}', student.name);
                await api.post('/api/send', {
                    number: student.mobile,
                    message: message
                });
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`🎉 Sent ${successCount} birthday wishes automatically!`);
        }
        if (failCount > 0) {
            toast.error(`Failed to send ${failCount} wishes`);
        }

        // Send to Group Link
        if (groupLink) {
            try {
                const names = birthdayStudents.map(s => s.name).join(', ');
                const groupMsg = messageTemplate.replace('{name}', names);
                await api.post('/api/send-group', {
                    groupLink: groupLink,
                    message: groupMsg
                });
                toast.success(`🎉 Sent combined wish to WhatsApp group!`);
            } catch (error) {
                toast.error("Failed to send wish to group");
            }
        }
    };

    return (
        <div className="min-h-screen pb-20 relative animate-fade-in">
            <AppHeader title="Hari-Saurabh Hostel" />

            <main className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">
                {/* Header Section */}
                <div className="relative overflow-hidden rounded-3xl p-8 glass-card animate-slide-in flex items-center justify-between">
                    <div className="absolute inset-0 gradient-primary opacity-5"></div>
                    <div className="relative z-10 space-y-2">
                        <h2 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                            <Cake className="w-8 h-8 text-primary" />
                            Birthdays
                        </h2>
                        <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Celebrate with your students today</p>
                        {autoSendEnabled && (
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                                    <Power className="w-3 h-3 text-green-600 animate-pulse" />
                                    <span className="text-xs font-bold text-green-600">Auto-send enabled at {autoSendTime}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="relative z-10 w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm border-primary/20 hover:bg-white hover:text-primary transition-all shadow-sm"
                        onClick={() => setIsEditingSettings(true)}
                    >
                        <Clock className="w-5 h-5" />
                    </Button>
                </div>

                {/* Auto-Send Settings Dialog */}
                {isEditingSettings && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-6 animate-in zoom-in-95 duration-200">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    Auto-Send Settings
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Automatically send birthday wishes at a scheduled time
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Enable/Disable Toggle */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Enable Auto-Send</Label>
                                        <p className="text-xs text-muted-foreground">Send wishes automatically every day</p>
                                    </div>
                                    <Switch
                                        checked={autoSendEnabled}
                                        onCheckedChange={setAutoSendEnabled}
                                    />
                                </div>

                                {/* Time Picker */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-bold text-foreground/90">Schedule Time</Label>
                                    <div className="flex items-center gap-3">
                                        
                                        {/* HOUR SELECT */}
                                        <div className="relative flex-1 group">
                                            <select
                                                value={hour12}
                                                onChange={(e) => updateTime(parseInt(e.target.value, 10), minStr, isPM)}
                                                className="w-full h-14 pl-4 pr-10 rounded-2xl border border-border bg-white appearance-none outline-none focus:ring-4 focus:ring-primary/20 hover:border-primary/50 text-center font-extrabold text-xl text-foreground transition-all disabled:opacity-50 disabled:hover:border-border cursor-pointer shadow-sm"
                                                disabled={!autoSendEnabled}
                                            >
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, '0')}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" />
                                        </div>
                                        
                                        <span className="text-2xl font-bold text-muted-foreground">:</span>
                                        
                                        {/* MINUTE SELECT */}
                                        <div className="relative flex-1 group">
                                            <select
                                                value={minStr}
                                                onChange={(e) => updateTime(hour12, e.target.value, isPM)}
                                                className="w-full h-14 pl-4 pr-10 rounded-2xl border border-border bg-white appearance-none outline-none focus:ring-4 focus:ring-primary/20 hover:border-primary/50 text-center font-extrabold text-xl text-foreground transition-all disabled:opacity-50 disabled:hover:border-border cursor-pointer shadow-sm"
                                                disabled={!autoSendEnabled}
                                            >
                                                {Array.from({ length: 60 }).map((_, i) => (
                                                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" />
                                        </div>
                                        
                                        {/* AM / PM TOGGLE */}
                                        <div className="flex bg-muted/60 p-1 rounded-2xl border border-border/50 h-14 w-32 shrink-0 shadow-inner">
                                            <button
                                                type="button"
                                                className={`flex-1 rounded-xl text-sm font-black tracking-widest transition-all disabled:opacity-50 ${!isPM ? "bg-white shadow-md text-primary ring-1 ring-border/50" : "text-muted-foreground hover:bg-black/5 hover:text-foreground"}`}
                                                onClick={() => updateTime(hour12, minStr, false)}
                                                disabled={!autoSendEnabled}
                                            >
                                                AM
                                            </button>
                                            <button
                                                type="button"
                                                className={`flex-1 rounded-xl text-sm font-black tracking-widest transition-all disabled:opacity-50 ${isPM ? "bg-white shadow-md text-primary ring-1 ring-border/50" : "text-muted-foreground hover:bg-black/5 hover:text-foreground"}`}
                                                onClick={() => updateTime(hour12, minStr, true)}
                                                disabled={!autoSendEnabled}
                                            >
                                                PM
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 opacity-80 mt-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        Wishes deploy exactly at this scheduled time 
                                    </p>
                                </div>

                                {/* Group Link Input */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold">WhatsApp Group Link (Optional)</Label>
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            value={groupLink}
                                            onChange={(e) => setGroupLink(e.target.value)}
                                            placeholder="https://chat.whatsapp.com/..."
                                            className="h-12 rounded-xl border-border/50 bg-white"
                                            disabled={!autoSendEnabled}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        If provided, a single combined wish will also be sent to this group.
                                    </p>
                                </div>

                                {/* Info Box */}
                                {autoSendEnabled && (
                                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                                        <p className="text-xs text-blue-600 font-medium">
                                            ℹ️ Wishes will be sent automatically to all students with birthdays today at {autoSendTime}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl font-bold"
                                    onClick={() => setIsEditingSettings(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 rounded-xl font-bold bg-primary text-white hover:bg-primary/90"
                                    onClick={handleSaveSettings}
                                >
                                    Save Settings
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {isEditingTemplate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-6 animate-in zoom-in-95 duration-200">
                            <div>
                                <h3 className="text-xl font-bold">Edit Message Template</h3>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-sm text-muted-foreground">
                                        Customize the birthday wish.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs font-mono bg-muted/50 border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
                                        onClick={() => setTempTemplate(prev => prev + "{name}")}
                                    >
                                        {`{name}`}
                                    </Button>
                                </div>
                            </div>
                            <textarea
                                value={tempTemplate}
                                onChange={(e) => setTempTemplate(e.target.value)}
                                className="w-full h-32 p-4 rounded-xl border bg-muted/30 focus:ring-2 ring-primary/20 outline-none resize-none text-sm"
                                placeholder="Type your message..."
                            />
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl font-bold"
                                    onClick={() => setIsEditingTemplate(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 rounded-xl font-bold bg-primary text-white hover:bg-primary/90"
                                    onClick={handleSaveTemplate}
                                >
                                    Save Template
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <section className="space-y-6 animate-slide-up">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-foreground/80">
                            Today's Celebrations
                        </h3>
                        <span className="px-3 py-1 gradient-primary text-white text-xs font-bold rounded-full shadow-soft">
                            {birthdayStudents.length}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 rounded-full bg-white/50 backdrop-blur-sm border-primary/20 hover:bg-white hover:text-primary transition-all shadow-sm"
                            onClick={() => {
                                setTempTemplate(messageTemplate);
                                setIsEditingTemplate(true);
                            }}
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-4 pb-safe">
                        {birthdayStudents.length > 0 ? (
                            birthdayStudents.map((student, index) => (
                                <div
                                    key={student.id}
                                    className="animate-slide-in w-full flex items-center justify-between p-5 bg-white border border-border/50 rounded-2xl shadow-soft transition-all duration-300 hover:shadow-soft-lg"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div
                                        className="flex items-center gap-4 flex-1 cursor-pointer min-w-0"
                                        onClick={() => navigate(`/students/${student.id}`)}
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-primary flex flex-col items-center justify-center shadow-soft shrink-0">
                                            <span className="text-white font-bold text-lg leading-none">{student.roomNo}</span>
                                            <span className="text-white/70 font-bold text-[10px] uppercase tracking-tighter mt-0.5">Room</span>
                                        </div>
                                        <div className="overflow-hidden">
                                            <h3 className="font-bold text-lg text-foreground truncate">{student.name}</h3>
                                            <p className="text-sm font-medium text-muted-foreground truncate">{student.mobile || 'No Mobile'}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!groupLink) {
                                                    toast.error("Please configure the WhatsApp Group Link in settings first (Clock icon)");
                                                    return;
                                                }
                                                try {
                                                    const message = messageTemplate.replace('{name}', student.name);
                                                    toast.info(`Sending wish for ${student.name} to group...`);
                                                    await api.post('/api/send-group', {
                                                        groupLink: groupLink,
                                                        message: message
                                                    });
                                                    toast.success(`Birthday wish for ${student.name} sent to group!`);
                                                } catch (error) {
                                                    toast.error(`Failed to send wish to group`);
                                                }
                                            }}
                                            className="rounded-xl font-bold gap-2 border shadow-sm"
                                            variant="outline"
                                        >
                                            <Users className="w-4 h-4" /> Send to Group
                                        </Button>
                                        <Button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!student.mobile) {
                                                    toast.error("No mobile number found");
                                                    return;
                                                }
                                                try {
                                                    const message = messageTemplate.replace('{name}', student.name);
                                                    toast.info(`Sending wish to ${student.name}...`);

                                                    await api.post('/api/send', {
                                                        number: student.mobile,
                                                        message: message
                                                    });
                                                    toast.success(`Birthday wish sent to ${student.name}!`);
                                                } catch (error) {
                                                    toast.error(`Failed to send wish to ${student.name}`);
                                                }
                                            }}
                                            className="rounded-xl font-bold gap-2 bg-primary text-white hover:bg-primary/90 shadow-md"
                                        >
                                            <Send className="w-4 h-4" /> Send Wish
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 glass-card border-dashed border-2 border-border/50 rounded-3xl animate-fade-in flex flex-col items-center justify-center gap-4">
                                <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-full flex items-center justify-center animate-pulse">
                                    <Sparkles className="w-10 h-10 text-muted-foreground/40" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">No birthdays today</h3>
                                    <p className="text-muted-foreground mt-1">Check back tomorrow for more celebrations!</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div >
    );
};

export default Birthdays;
