import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cake, Sparkles, Send, Settings, Clock, Power, Users, ChevronDown, GraduationCap, CheckSquare, X } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmationContext';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { getStudents, getSetting, updateSetting, getCategories, Karyakarta } from '@/lib/store';
import { Student } from '@/types';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, isSameName } from '@/lib/utils';
import { Calendar, UploadCloud, Loader2, FolderPlus, FolderOpen } from 'lucide-react';

const Birthdays = () => {
    const navigate = useNavigate();
    const { adminName, adminRole } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [categories, setCategories] = useState<Karyakarta[]>([]);
    const [messageTemplate, setMessageTemplate] = useState("Happy Birthday, {name}! 🎉🎂 Wishing you a fantastic day filled with joy and happiness!");
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);
    const [tempTemplate, setTempTemplate] = useState("");

    // Auto-send settings
    const [autoSendEnabled, setAutoSendEnabled] = useState(false);
    const [autoSendTime, setAutoSendTime] = useState("09:00"); // Default 9 AM
    const [groupLink, setGroupLink] = useState("");
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [lastSentDate, setLastSentDate] = useState<string | null>(null);

    // Meetup states
    const [meetupStudent, setMeetupStudent] = useState<Student | null>(null);
    const [showMeetupDialog, setShowMeetupDialog] = useState(false);
    const [meetingDesc, setMeetingDesc] = useState("");
    const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [markCompleted, setMarkCompleted] = useState(true);
    const [savingMeetup, setSavingMeetup] = useState(false);
    const [completedMeetupIds, setCompletedMeetupIds] = useState<string[]>([]);
    const { confirm } = useConfirm();
    const [isWhatsappConnected, setIsWhatsappConnected] = useState(false);

    // Media Upload states
    const [showUploadPrompt, setShowUploadPrompt] = useState(false);
    const [uploadFolderMode, setUploadFolderMode] = useState<'select' | 'create'>('select');
    const [existingFolders, setExistingFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string>("");
    const [newFolderName, setNewFolderName] = useState<string>("");
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadStep, setUploadStep] = useState<'ask' | 'upload'>('ask');

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

    const handleMeetupSubmit = async () => {
        if (!meetupStudent || !meetingDesc.trim()) {
            toast.error("Please enter a meetup description");
            return;
        }

        try {
            setSavingMeetup(true);
            const birthdayFolder = `Birthday ${new Date().getFullYear()}`;

            // Save the meetup details directly as a text note in the student's Birthday folder
            const res = await api.post('/api/gallery?action=save_note', {
                student_id: meetupStudent.id,
                folder_name: birthdayFolder,
                filename: 'anandswami say note.txt',
                content: meetingDesc.trim()
            });
            
            if (res.data && res.data.success) {
                toast.success("Meetup details saved!");
                setShowMeetupDialog(false);
                
                // Add student ID to completed meetup list (case-insensitive checking later)
                setCompletedMeetupIds(prev => [...prev, meetupStudent.id]);

                if (markCompleted) {
                    // Trigger upload flow directly to the Birthday folder
                    setUploadStep('ask');
                    setShowUploadPrompt(true);
                    setSelectedFolder(birthdayFolder);
                    setNewFolderName(birthdayFolder);
                    setUploadFolderMode('select');
                    setUploadFiles([]);
                    setExistingFolders([birthdayFolder]);
                }
            } else {
                toast.error("Failed to save meetup details");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to save meetup details");
        } finally {
            setSavingMeetup(false);
        }
    };

    const handleUploadSubmit = async () => {
        if (!meetupStudent || uploadFiles.length === 0) {
            toast.error("Please select files to upload");
            return;
        }

        const folderName = uploadFolderMode === 'select' ? selectedFolder : newFolderName.trim();
        if (!folderName) {
            toast.error("Please specify a folder name");
            return;
        }

        const oversized = uploadFiles.some(file => file.size > 50 * 1024 * 1024);
        if (oversized) {
            toast.error("One or more files are too large. Max size is 50MB per file.");
            return;
        }

        try {
            setUploading(true);
            let successCount = 0;
            let failCount = 0;

            for (const file of uploadFiles) {
                const formData = new FormData();
                formData.append("student_id", meetupStudent.id);
                formData.append("folder_name", folderName);
                formData.append("file", file);

                try {
                    const res = await api.post("/api/gallery?action=upload", formData, {
                        headers: {
                            "Content-Type": "multipart/form-data"
                        }
                    });

                    if (res.data.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (err) {
                    failCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`Successfully uploaded ${successCount} file(s)!`);
            }
            if (failCount > 0) {
                toast.error(`Failed to upload ${failCount} file(s).`);
            }
            setShowUploadPrompt(false);
        } catch (error: any) {
            console.error(error);
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleUndoMeetup = async (student: Student) => {
        const isConfirmed = await confirm({
            title: "Undo Meetup?",
            message: `Are you sure you want to undo the meetup for ${student.name}? This will delete the meetup note.`,
            confirmText: "Undo",
            cancelText: "Cancel",
            variant: "destructive"
        });
        if (!isConfirmed) return;

        try {
            const birthdayFolder = `Birthday ${new Date().getFullYear()}`;
            const res = await api.post('/api/gallery?action=delete_file', {
                student_id: student.id,
                folder_name: birthdayFolder,
                file_name: 'anandswami say note.txt'
            });

            if (res.data && res.data.success) {
                toast.success("Meetup status reset!");
                setCompletedMeetupIds(prev => prev.filter(id => id.toLowerCase() !== student.id.toLowerCase()));
            } else {
                toast.error("Failed to reset meetup status");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to reset meetup status");
        }
    };

    const sendIndividualBirthdayWish = async (student: Student) => {
        if (!student.mobile) {
            toast.error("Yuvak has no mobile number");
            return;
        }

        const messageText = `Jai Swaminarayan\nDas Na Das\n\nMany Many Happy Returns of the Day\n\nHappy Birthday\nMr. ${student.name}`;

        if (isWhatsappConnected) {
            const toastId = toast.loading(`Sending birthday wish to ${student.name}...`);
            try {
                await api.post('/api/send', {
                    number: student.mobile,
                    message: messageText
                });
                toast.success(`🎉 Birthday wish sent to ${student.name}!`, { id: toastId });
            } catch (error) {
                console.error("Failed to send automatic WhatsApp", error);
                toast.error("Failed to send WhatsApp message. Opening redirect link instead...", { id: toastId });
                const encodedMsg = encodeURIComponent(messageText);
                const url = `https://wa.me/${student.mobile}?text=${encodedMsg}`;
                window.open(url, '_blank');
            }
        } else {
            const encodedMsg = encodeURIComponent(messageText);
            const url = `https://wa.me/${student.mobile}?text=${encodedMsg}`;
            window.open(url, '_blank');
            toast.info("WhatsApp not connected. Redirecting to WhatsApp Web/App...");
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [studentsData, categoriesData, completedData] = await Promise.all([
                    getStudents(),
                    getCategories(),
                    api.get('/api/gallery?action=check_completed_meetups').then(res => res.data).catch(() => ({ success: false }))
                ]);
                setStudents(studentsData || []);
                setCategories(categoriesData || []);
                if (completedData && completedData.success) {
                    setCompletedMeetupIds(completedData.completed_ids || []);
                }
            } catch (error) {
                setStudents([]);
                setCategories([]);
            }
        };
        const checkWhatsapp = async () => {
            try {
                const res = await api.get('/api/get-qr');
                if (res.data && res.data.success && res.data.message === "Already connected") {
                    setIsWhatsappConnected(true);
                } else {
                    setIsWhatsappConnected(false);
                }
            } catch (error) {
                console.error("Failed to check WhatsApp status", error);
            }
        };
        fetchData();
        checkWhatsapp();
    }, []);

    const myCategory = useMemo(() => {
        return categories.find(c => isSameName(c.name, adminName));
    }, [categories, adminName]);

    const myAssignedStudents = useMemo(() => {
        if (adminRole === 'admin') return students;
        if (!myCategory) return [];

        let assignedIds = new Set<string>(myCategory.studentIds || []);
        if (myCategory.type === 'main') {
            const subs = categories.filter(c => c.parentId === myCategory.id);
            subs.forEach(sub => {
                (sub.studentIds || []).forEach(id => assignedIds.add(id));
                if (sub.studentId) {
                    assignedIds.add(sub.studentId);
                }
            });
        }
        const ids = Array.from(assignedIds);
        return students.filter(s => ids.includes(s.id) || s.isAlumni);
    }, [students, categories, myCategory, adminRole]);

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
    }, [autoSendEnabled, autoSendTime, lastSentDate, myAssignedStudents, messageTemplate, groupLink]);

    // Filter students whose birthday is TODAY
    const birthdayStudents = myAssignedStudents.filter(student => {
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
                const message = messageTemplate
                    .replace(/{name}/gi, student.name || "")
                    .replace(/{room}/gi, student.roomNo || "")
                    .replace(/{mobile}/gi, student.mobile || "")
                    .replace(/{dob}/gi, student.dob || "")
                    .replace(/{birthday}/gi, student.dob || "")
                    .replace(/{birthdate}/gi, student.dob || "")
                    .replace(/{birth_date}/gi, student.dob || "");
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
                const groupMsg = messageTemplate
                    .replace(/{name}/gi, names)
                    .replace(/{room}/gi, "")
                    .replace(/{mobile}/gi, "")
                    .replace(/{dob}/gi, "")
                    .replace(/{birthday}/gi, "")
                    .replace(/{birthdate}/gi, "")
                    .replace(/{birth_date}/gi, "");
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

            <main className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
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

                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-safe">
                        {birthdayStudents.length > 0 ? (
                            birthdayStudents.map((student, index) => {
                                const isCompleted = completedMeetupIds.some(
                                    id => id.toLowerCase() === student.id.toLowerCase()
                                );
                                return (
                                    <div
                                        key={student.id}
                                        className={cn(
                                            "animate-slide-in w-full flex flex-col sm:flex-row sm:items-center justify-between p-5 border rounded-2xl shadow-soft transition-all duration-300 hover:shadow-soft-lg gap-4",
                                            isCompleted ? "bg-emerald-50/70 border-emerald-200/60 animate-none hover:shadow-soft" : "bg-white border-border/50"
                                        )}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div
                                            className="flex items-center gap-4 flex-1 cursor-pointer min-w-0"
                                            onClick={() => navigate(`/students/${student.id}`)}
                                        >
                                            {student.isAlumni ? (
                                                <div className="w-14 h-14 rounded-2xl bg-accent/20 flex flex-col items-center justify-center shadow-soft shrink-0 text-accent border border-accent/10">
                                                    <GraduationCap className="w-6 h-6" />
                                                    <span className="font-bold text-[9px] uppercase tracking-tighter mt-0.5">Alumni</span>
                                                </div>
                                            ) : (
                                                <div className="w-14 h-14 rounded-2xl bg-primary flex flex-col items-center justify-center shadow-soft shrink-0">
                                                    <span className="text-white font-bold text-lg leading-none">{student.roomNo}</span>
                                                    <span className="text-white/70 font-bold text-[10px] uppercase tracking-tighter mt-0.5">Room</span>
                                                </div>
                                            )}
                                            <div className="overflow-hidden flex-1 min-w-0">
                                                <h3 className="font-bold text-lg text-foreground truncate">{student.name}</h3>
                                                <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                                                    <p className="text-xs font-semibold text-muted-foreground truncate">{student.mobile || 'No Mobile'}</p>
                                                    {student.mobile && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-6 rounded-lg text-[10px] font-bold px-2 gap-1 border-primary/20 hover:bg-primary/10 text-primary shrink-0"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    sendIndividualBirthdayWish(student);
                                                                }}
                                                            >
                                                                <Send className="w-3 h-3 text-primary" /> WhatsApp
                                                            </Button>
                                                            {isCompleted ? (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleUndoMeetup(student);
                                                                    }}
                                                                    className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-red-500/10 text-emerald-600 hover:text-red-600 px-2.5 py-1.5 rounded-xl text-[10px] font-bold shrink-0 shadow-sm border border-emerald-500/10 hover:border-red-500/15 transition-all group"
                                                                    title="Click to undo meetup"
                                                                >
                                                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 group-hover:hidden" />
                                                                    <X className="w-3.5 h-3.5 text-red-600 hidden group-hover:block animate-in zoom-in-50 duration-200" />
                                                                    <span className="group-hover:hidden">Meet Done</span>
                                                                    <span className="hidden group-hover:inline">Undo Meet</span>
                                                                </button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    className="h-6 rounded-lg text-[10px] font-bold px-2 gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-none shrink-0"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setMeetupStudent(student);
                                                                        setMeetingDesc("");
                                                                        setMeetingDate(new Date().toISOString().split('T')[0]);
                                                                        setMarkCompleted(true);
                                                                        setShowMeetupDialog(true);
                                                                    }}
                                                                >
                                                                    <Users className="w-3 h-3 text-primary" /> Meet Up
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-20 glass-card border-dashed border-2 border-border/50 rounded-3xl animate-fade-in flex flex-col items-center justify-center gap-4 col-span-full">
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
                {/* LOG MEETUP DIALOG */}
        <Dialog open={showMeetupDialog} onOpenChange={setShowMeetupDialog}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-foreground">Log Meetup</DialogTitle>
              <DialogDescription>
                Log a meeting with <span className="font-bold text-foreground">{meetupStudent?.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Meeting Description</Label>
                <Textarea
                  placeholder="What did you discuss during the meeting?"
                  value={meetingDesc}
                  onChange={(e) => setMeetingDesc(e.target.value)}
                  className="min-h-[100px] rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Meeting Date</Label>
                <Input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="mark-completed"
                  checked={markCompleted}
                  onCheckedChange={(checked) => setMarkCompleted(!!checked)}
                />
                <label
                  htmlFor="mark-completed"
                  className="text-sm font-bold text-foreground cursor-pointer select-none"
                >
                  Mark as Completed (Done)
                </label>
              </div>
            </div>

            <DialogFooter className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="rounded-xl flex-1 font-bold h-11"
                onClick={() => setShowMeetupDialog(false)}
                disabled={savingMeetup}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl flex-1 font-bold h-11 bg-primary hover:bg-primary/95 text-white"
                onClick={handleMeetupSubmit}
                disabled={savingMeetup || !meetingDesc.trim()}
              >
                {savingMeetup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  "Log Meetup"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GALLERY UPLOAD PROMPT DIALOG */}
        <Dialog open={showUploadPrompt} onOpenChange={setShowUploadPrompt}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none bg-white">
            {uploadStep === 'ask' ? (
              <>
                <DialogHeader className="text-center">
                  <DialogTitle className="text-xl font-black text-foreground flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
                    Upload Meetup Media?
                  </DialogTitle>
                  <DialogDescription className="pt-2 text-sm text-muted-foreground text-center">
                    Would you like to upload a photo or video for your meetup with <span className="font-bold text-foreground">{meetupStudent?.name}</span>?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 pt-6">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl font-bold h-11"
                    onClick={() => setShowUploadPrompt(false)}
                  >
                    No, Skip
                  </Button>
                  <Button
                    className="flex-1 rounded-xl font-bold h-11 bg-primary hover:bg-primary/95 text-white"
                    onClick={() => setUploadStep('upload')}
                  >
                    Yes, Upload
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-primary" />
                    Upload Media
                  </DialogTitle>
                  <DialogDescription className="sr-only">Choose a folder and file to upload</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  <div className="p-3 bg-primary/5 border border-primary/10 rounded-2xl">
                    <p className="text-xs text-primary font-bold">
                      📁 Saving to folder: <span className="underline">{selectedFolder}</span>
                    </p>
                  </div>

                  {/* File Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Photos/Videos</label>
                    <div className="border border-dashed border-border/80 rounded-2xl p-4 bg-muted/10 flex flex-col items-center justify-center text-center relative group hover:bg-muted/20 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={uploading}
                      />
                      <UploadCloud className="w-8 h-8 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-foreground">
                        {uploadFiles.length > 0 ? `${uploadFiles.length} file(s) selected` : "Click to select files"}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {uploadFiles.length > 0 
                          ? `${(uploadFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB total` 
                          : "Photos or Videos (Max 50MB per file)"}
                      </span>
                    </div>
                    {uploadFiles.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                        {uploadFiles.map((file, i) => (
                          <div key={i} className="flex justify-between items-center text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-1.5 px-2.5 font-bold">
                            <span className="truncate max-w-[250px]">{file.name}</span>
                            <span className="text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="mt-6 flex gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl flex-1 font-bold h-11"
                    onClick={() => setUploadStep('ask')}
                    disabled={uploading}
                  >
                    Back
                  </Button>
                  <Button
                    className="rounded-xl flex-1 font-bold h-11 bg-primary hover:bg-primary/95 text-white"
                    onClick={handleUploadSubmit}
                    disabled={uploading || uploadFiles.length === 0}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
        </div>
    );
};

export default Birthdays;
