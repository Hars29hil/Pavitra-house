import { useEffect, useState, useMemo } from "react";
import { Loader2, CheckCircle2, Send, Search, Users, X, Filter, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmationContext";
import api from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { getStudents, getCategories, Karyakarta } from "@/lib/store";
import { Student } from "@/types";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

const API_BASE = API_BASE_URL;

export default function Whatsapp() {
    const { confirm } = useConfirm();
    const { adminRole, adminName } = useAuth();
    const [connected, setConnected] = useState(false);
    const [qr, setQr] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Bulk Messaging State
    const [students, setStudents] = useState<Student[]>([]);
    const [karyakartas, setKaryakartas] = useState<Karyakarta[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null); // null means "All"
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [showAlumni, setShowAlumni] = useState(false);
    const [groupLink, setGroupLink] = useState("");
    const [isSavingGroup, setIsSavingGroup] = useState(false);

    // Pairing Code Connection States
    const [phoneNumber, setPhoneNumber] = useState("");
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [requestingCode, setRequestingCode] = useState(false);

    const handleGetPairingCode = async () => {
        if (!phoneNumber) {
            toast.error("Please enter a phone number");
            return;
        }
        try {
            setRequestingCode(true);
            setPairingCode(null);
            const res = await api.post('/api/connect', { phoneNumber });
            if (res.data.success && res.data.pairingCode) {
                setPairingCode(res.data.pairingCode);
                toast.success("Pairing code generated successfully!");
            } else if (res.data.success && res.data.message === "Session is already connected.") {
                setConnected(true);
                toast.success("Session is already connected!");
            } else {
                toast.error(res.data.error || "Failed to generate pairing code");
            }
        } catch (error: any) {
            console.error("Pairing Code Error:", error);
            const errMsg = error.response?.data?.error || "Error connecting to server";
            toast.error(errMsg);
        } finally {
            setRequestingCode(false);
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhoneNumber(e.target.value);
        if (pairingCode) setPairingCode(null);
    };

    const handleReconnect = async () => {
        try {
            setLoading(true);
            const res = await api.post('/api/reconnect');
            if (res.data.success) {
                toast.success("Restarting WhatsApp client...");
            } else {
                toast.error("Failed to restart client");
            }
        } catch (error) {
            console.error("Reconnect Error:", error);
            toast.error("Connection error. Make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetSession = async () => {
        const isConfirmed = await confirm({
            title: "Reset Session?",
            message: "This will PERMANENTLY delete your login session and force a new QR code. Use this only if you are stuck. Continue?",
            confirmText: "Reset Session",
            cancelText: "Cancel",
            variant: "destructive"
        });
        if (!isConfirmed) return;

        try {
            setLoading(true);
            const res = await api.post('/api/reset-session');
            if (res.data.success) {
                toast.success("Session reset. Waiting for new QR...");
                setQr(null);
                setConnected(false);
            } else {
                toast.error("Reset failed");
            }
        } catch (error) {
            console.error("Reset Error:", error);
            toast.error("Connection error. Make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const isConfirmed = await confirm({
            title: "Logout?",
            message: "Are you sure you want to logout? This will require scanning the QR code again.",
            confirmText: "Logout",
            cancelText: "Cancel",
            variant: "destructive"
        });
        if (!isConfirmed) return;

        try {
            setLoading(true);
            const res = await api.post('/api/logout');
            if (res.data.success) {
                toast.success("Logged out. Waiting for new QR...");
                setQr(null);
                setConnected(false);
            } else {
                toast.error("Logout failed");
            }
        } catch (error) {
            console.error("Logout Error:", error);
            toast.error("Connection error. Make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // 1. Fetch Data ONCE on mount
        const fetchData = async () => {
            try {
                const [studentsData, categoriesData] = await Promise.all([
                    getStudents(),
                    getCategories()
                ]);
                setStudents(studentsData);
                setKaryakartas(categoriesData);

                // Load Group Link from settings
                const savedGroupLink = await api.get('/api/status'); // We could use a setting, but let's check if we have a way to get settings
                // Better: use the store helper
                const { getSetting } = await import('@/lib/store');
                const link = await getSetting('whatsapp_group_link');
                if (link) setGroupLink(link);
            } catch (error) {
                console.error("Failed to load data", error);
            }
        };

        fetchData();

        // 2. Poll for Status & QR
        let timeoutId: NodeJS.Timeout;
        let isMounted = true;

        const checkStatus = async () => {
            if (!isMounted) return;

            try {
                // Use the configured api instance for consistency
                const res = await api.get('/api/get-qr');
                const qrData = res.data;

                if (qrData.success && qrData.message === "Already connected") {
                    setConnected(true);
                    setQr(null);
                    setLoading(false);
                    timeoutId = setTimeout(checkStatus, 10000); // Check again in 10s
                } else if (qrData.success && qrData.message === "Authenticated, loading...") {
                    setConnected(false);
                    setQr(null);
                    setLoading(true);
                    timeoutId = setTimeout(checkStatus, 3000); // Poll faster
                } else if (qrData.success && qrData.qr) {
                    setConnected(false);
                    setQr(qrData.qr);
                    setLoading(false);
                    timeoutId = setTimeout(checkStatus, 1000); // Check every 1s for faster display
                } else {
                    setConnected(false);
                    setQr(null);
                    setLoading(false);
                    timeoutId = setTimeout(checkStatus, 1000); // Check every 1s
                }
            } catch (error) {
                console.error("Connection Error:", error);
                setLoading(false);
                timeoutId = setTimeout(checkStatus, 2000); // Wait slightly longer on error
            }
        };

        checkStatus();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    const myCategory = useMemo(() => {
        return karyakartas.find(
            c => c.name.trim().toLowerCase() === adminName.trim().toLowerCase()
        );
    }, [karyakartas, adminName]);

    const myAssignedStudents = useMemo(() => {
        if (adminRole === 'admin') return students;
        if (!myCategory) return [];

        let assignedIds = new Set<string>(myCategory.studentIds || []);
        if (myCategory.type === 'main') {
            const subs = karyakartas.filter(c => c.parentId === myCategory.id);
            subs.forEach(sub => {
                (sub.studentIds || []).forEach(id => assignedIds.add(id));
            });
        }
        const ids = Array.from(assignedIds);
        return students.filter(s => ids.includes(s.id) && !s.isAlumni);
    }, [students, karyakartas, myCategory, adminRole]);

    // Filter Students
    const filteredStudents = myAssignedStudents.filter(s => {
        // 1. Basic Filters (Alumni, Search)
        const matchesType = showAlumni ? s.isAlumni : !s.isAlumni;
        const matchesSearch = matchesType && (
            s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.roomNo?.toString().includes(searchQuery) ||
            s.mobile?.includes(searchQuery) ||
            s.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (!matchesSearch) return false;

        // 2. Group Filter
        if (selectedGroupId) {
            const group = karyakartas.find(k => k.id === selectedGroupId);
            if (group) {
                return group.studentIds.includes(s.id);
            }
        }

        return true;
    });

    // Toggle Selection
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredStudents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const handleBulkSend = async () => {
        if (!connected) {
            toast.error("Please connect WhatsApp first!");
            return;
        }
        if (selectedIds.size === 0 || !message) {
            toast.error("Select Yuvaks and enter a message");
            return;
        }

        setSending(true);
        const recipients = myAssignedStudents.filter(s => selectedIds.has(s.id));
        let successCount = 0;
        let failCount = 0;

        toast.message(`Sending to ${recipients.length} Yuvak...`);

        for (const student of recipients) {
            if (!student.mobile) {
                failCount++;
                continue;
            }

            try {
                const formLink = student.mobile ? `https://pavitra-house.vercel.app/self-update/${student.mobile.trim()}` : "";
                const personalizedMessage = message
                    .replace(/{name}/gi, student.name || "")
                    .replace(/{room}/gi, student.roomNo || "")
                    .replace(/{mobile}/gi, student.mobile || "")
                    .replace(/{dob}/gi, student.dob || "")
                    .replace(/{birthday}/gi, student.dob || "")
                    .replace(/{birthdate}/gi, student.dob || "")
                    .replace(/{birth_date}/gi, student.dob || "")
                    .replace(/{form_link}/gi, formLink);

                const res = await api.post('/api/send', {
                    number: student.mobile,
                    message: personalizedMessage
                });
                const data = res.data;
                if (data.success) successCount++;
                else failCount++;
            } catch (e) {
                failCount++;
            }
        }

        setSending(false);
        setMessage("");
        setSelectedIds(new Set());
        toast.success(`Sent: ${successCount}, Failed: ${failCount}`);
    };

    const handleGroupSend = async () => {
        if (!connected) {
            toast.error("Please connect WhatsApp first!");
            return;
        }
        if (!groupLink) {
            toast.error("Please enter a WhatsApp Group Link first");
            return;
        }
        if (!message) {
            toast.error("Enter a message to send");
            return;
        }

        try {
            setSending(true);
            // If students are selected, we might want to personalize? 
            // Usually group messages are generic, but let's support {name} if exactly one student is selected
            let finalMessage = message;
            if (selectedIds.size === 1) {
                const student = students.find(s => selectedIds.has(s.id));
                if (student) {
                    const formLink = student.mobile ? `https://pavitra-house.vercel.app/self-update/${student.mobile.trim()}` : "";
                    finalMessage = message
                        .replace(/{name}/gi, student.name || "")
                        .replace(/{room}/gi, student.roomNo || "")
                        .replace(/{mobile}/gi, student.mobile || "")
                        .replace(/{dob}/gi, student.dob || "")
                        .replace(/{birthday}/gi, student.dob || "")
                        .replace(/{birthdate}/gi, student.dob || "")
                        .replace(/{birth_date}/gi, student.dob || "")
                        .replace(/{form_link}/gi, formLink);
                }
            }

            const res = await api.post('/api/send-group', {
                groupLink: groupLink,
                message: finalMessage
            });

            if (res.data.success) {
                toast.success("Message sent to group successfully!");
                setMessage("");
            } else {
                toast.error("Failed to send to group");
            }
        } catch (error) {
            toast.error("Connection error while sending to group");
        } finally {
            setSending(false);
        }
    };

    const saveGroupLinkSetting = async () => {
        try {
            setIsSavingGroup(true);
            const { updateSetting } = await import('@/lib/store');
            await updateSetting('whatsapp_group_link', groupLink);
            toast.success("Group link saved!");
        } catch (error) {
            toast.error("Failed to save group link");
        } finally {
            setIsSavingGroup(false);
        }
    };

    const handleToggleNotifications = async (studentId: string, currentStatus: boolean) => {
        try {
            // Update locally first for instant feedback
            setStudents(prev => prev.map(s => s.id === studentId ? { ...s, notifications_enabled: !currentStatus } : s));

            // Send API call to backend
            const res = await api.put(`/api/students/${studentId}`, {
                notifications_enabled: !currentStatus ? 1 : 0
            });

            if (res.data) {
                toast.success(`Notifications ${!currentStatus ? 'enabled' : 'disabled'} for this Yuvak`);
            }
        } catch (error) {
            console.error("Failed to toggle notifications:", error);
            toast.error("Failed to update notification setting");
            // Revert on error
            setStudents(prev => prev.map(s => s.id === studentId ? { ...s, notifications_enabled: currentStatus } : s));
        }
    };

    const mainGroups = useMemo(() => {
        const mains = karyakartas.filter(k => k.type === 'main');
        if (adminRole === 'admin') return mains;
        return mains.filter(k => k.name.trim().toLowerCase() === adminName.trim().toLowerCase());
    }, [karyakartas, adminRole, adminName]);
    const selectedGroupName = selectedGroupId ? karyakartas.find(k => k.id === selectedGroupId)?.name : "All Students";

    return (
        <div className="min-h-screen bg-background relative animate-fade-in flex flex-col">
            <AppHeader title="Hostel Hub" />

            <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Column: Student Selection */}
                <div className="space-y-4 h-full flex flex-col">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Users className="w-6 h-6 text-primary" />
                                    Select Yuvak
                                </h2>
                                <p className="text-muted-foreground text-sm">Target: <span className="font-semibold text-primary">{selectedGroupName}</span></p>
                            </div>
                            <Badge variant="secondary" className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20">
                                Selected: {selectedIds.size}
                            </Badge>
                        </div>

                        {/* Toggle Current / Alumni */}
                        {adminRole === 'admin' && (
                            <div className="flex p-1 bg-muted/50 rounded-xl border border-border/50">
                                <button
                                    onClick={() => setShowAlumni(false)}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!showAlumni ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    Current
                                </button>
                                <button
                                    onClick={() => setShowAlumni(true)}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${showAlumni ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    Alumni
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, room..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Category Filter */}
                        {adminRole !== 'Sub-Karyakarta' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Users className="w-4 h-4" />
                                        <span className="hidden sm:inline">Filter</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Filter by Group</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setSelectedGroupId(null)}>
                                        <Users className="w-4 h-4 mr-2" />
                                        All Students
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {mainGroups.length > 0 ? (
                                        mainGroups.map(main => (
                                            <DropdownMenuSub key={main.id}>
                                                <DropdownMenuSubTrigger>
                                                    <span>{main.name}</span>
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    <DropdownMenuItem onClick={() => setSelectedGroupId(main.id)}>
                                                        Select Main Group
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {karyakartas.filter(k => k.parentId === main.id).map(sub => (
                                                        <DropdownMenuItem key={sub.id} onClick={() => setSelectedGroupId(sub.id)}>
                                                            {sub.name}
                                                        </DropdownMenuItem>
                                                    ))}
                                                    {karyakartas.filter(k => k.parentId === main.id).length === 0 && (
                                                        <DropdownMenuItem disabled>No Sub-groups</DropdownMenuItem>
                                                    )}
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                        ))
                                    ) : (
                                        <DropdownMenuItem disabled>No Groups Found</DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <Button variant="outline" onClick={toggleSelectAll}>
                            {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? "Deselect All" : "Select All"}
                        </Button>
                    </div>

                    <div className="flex-1 border rounded-xl bg-white/50 backdrop-blur-sm overflow-hidden flex flex-col shadow-sm max-h-[320px]">
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <div
                                        key={student.id}
                                        className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 ${selectedIds.has(student.id) ? "bg-primary/5 border-primary" : "border-transparent"}`}
                                        onClick={() => toggleSelection(student.id)}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Checkbox checked={selectedIds.has(student.id)} onCheckedChange={() => toggleSelection(student.id)} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm truncate">{student.name}</p>
                                                <div className="flex gap-2 text-xs text-muted-foreground">
                                                    <span>Room: {student.roomNo}</span>
                                                    <span>•</span>
                                                    <span>{student.mobile || "No Mobile"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notifications Tick/Checkbox */}
                                        <div
                                            className="flex items-center gap-2 pl-2 border-l border-slate-100 shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleNotifications(student.id, !!student.notifications_enabled);
                                            }}
                                            title={student.notifications_enabled ? "Disable Notifications" : "Enable Notifications"}
                                        >
                                            <Checkbox
                                                checked={!!student.notifications_enabled}
                                                onCheckedChange={() => handleToggleNotifications(student.id, !!student.notifications_enabled)}
                                                className={`h-4.5 w-4.5 rounded ${student.notifications_enabled ? "border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:text-white" : "border-slate-300"}`}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                                    <Users className="w-10 h-10 mb-2 opacity-20" />
                                    <p>No students found</p>
                                    {selectedGroupId && <p className="text-xs mt-2">Try selecting a different group</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Connection & Message */}
                <div className="space-y-6">
                    {/* Connection Status Card */}
                    <div className="p-6 glass-card rounded-3xl shadow-soft border-white/40">
                        <h3 className="font-bold text-lg mb-4">Connection Status</h3>
                        {loading ? (
                            <div className="flex items-center gap-2 text-primary p-6 justify-center">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="font-medium text-sm">Processing...</span>
                            </div>
                        ) : connected ? (
                            <div className="space-y-4 p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm">
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-green-600 font-bold">
                                    <CheckCircle2 className="w-6 h-6" />
                                    <span>System Online & Ready</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 rounded-xl h-11"
                                    onClick={handleLogout}
                                >
                                    Logout / Disconnect
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm">
                                {/* Option 1: Link with Phone Number (Pairing Code) */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                        Link with Phone Number (Pairing Code)
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="text"
                                            placeholder="e.g. 919773134116"
                                            value={phoneNumber}
                                            onChange={handlePhoneChange}
                                            disabled={requestingCode}
                                            className="rounded-xl h-11"
                                        />
                                        <Button
                                            onClick={handleGetPairingCode}
                                            disabled={requestingCode || !phoneNumber}
                                            className="rounded-xl h-11"
                                        >
                                            {requestingCode ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                "Get Code"
                                            )}
                                        </Button>
                                    </div>
                                    {pairingCode && (
                                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-center space-y-2">
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                                Your Pairing Code
                                            </p>
                                            <p className="text-2xl font-mono font-bold tracking-widest text-primary">
                                                {pairingCode}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground leading-normal px-2">
                                                Open WhatsApp &gt; Linked Devices &gt; Link a Device &gt; Link with phone number instead, then enter this code.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Compose Message */}
                    <div className="p-6 glass-card rounded-3xl shadow-soft border-white/40 flex flex-col gap-4">
                        <h3 className="font-bold text-lg">Compose Message</h3>

                        <div className="flex gap-2 flex-wrap">
                            {[
                                { label: "Name", value: "{name}" },
                                { label: "Room", value: "{room}" },
                                { label: "Mobile", value: "{mobile}" },
                                { label: "DOB", value: "{dob}" },
                                { label: "Form Link", value: "{form_link}" },
                            ].map((tag) => (
                                <Button
                                    key={tag.value}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs font-mono bg-muted/50 border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
                                    onClick={() => setMessage((prev) => prev + tag.value)}
                                >
                                    {tag.value}
                                </Button>
                            ))}
                        </div>

                        <div className="relative">
                            <textarea
                                className="w-full p-4 rounded-xl border bg-white/50 focus:ring-2 ring-primary/20 outline-none min-h-[150px] resize-none text-base"
                                placeholder="Type your message here..."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                            />
                            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                                {message.length} chars
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full text-base h-14 rounded-xl shadow-soft border-primary/20 text-primary hover:bg-primary/5 gap-2"
                                onClick={handleGroupSend}
                                disabled={sending || !message || !groupLink}
                            >
                                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
                                Send to Group
                            </Button>
                            <Button
                                size="lg"
                                className="w-full text-base h-14 rounded-xl shadow-soft hover:shadow-soft-lg gap-2"
                                onClick={handleBulkSend}
                                disabled={sending || selectedIds.size === 0 || !message}
                            >
                                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                Send to {selectedIds.size} Students
                            </Button>
                        </div>
                        {!connected && (
                            <p className="text-xs text-center text-amber-600 font-medium">Please scan the QR code above to connect your WhatsApp first.</p>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
