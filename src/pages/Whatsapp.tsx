import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Send, Search, Users, X, Filter, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";
import api from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { getStudents, getCategories, Karyakarta } from "@/lib/store";
import { Student } from "@/types";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
                // Direct Call to QR API (No separate status check)
                const qrRes = await fetch(`${API_BASE}/api/qr`, {
                    headers: { "ngrok-skip-browser-warning": "true" }
                });
                const qrData = await qrRes.json();

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
                    timeoutId = setTimeout(checkStatus, 3000); // Refresh QR every 3s
                } else {
                    setConnected(false);
                    setQr(null);
                    setLoading(true);
                    timeoutId = setTimeout(checkStatus, 3000);
                }
            } catch (error) {
                console.error("Connection Error:", error);
                setLoading(false);
                timeoutId = setTimeout(checkStatus, 5000);
            }
        };

        checkStatus();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    // Filter Students
    const filteredStudents = students.filter(s => {
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
        if (selectedIds.size === 0 || !message) {
            toast.error("Select users and enter a message");
            return;
        }

        setSending(true);
        const recipients = students.filter(s => selectedIds.has(s.id));
        let successCount = 0;
        let failCount = 0;

        toast.message(`Sending to ${recipients.length} students...`);

        for (const student of recipients) {
            if (!student.mobile) {
                failCount++;
                continue;
            }

            try {
                const personalizedMessage = message
                    .replace(/{name}/g, student.name || "")
                    .replace(/{room}/g, student.roomNo || "")
                    .replace(/{mobile}/g, student.mobile || "")
                    .replace(/{dob}/g, student.dob || "");

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

    const mainGroups = karyakartas.filter(k => k.type === 'main');
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
                                    Select Students
                                </h2>
                                <p className="text-muted-foreground text-sm">Target: <span className="font-semibold text-primary">{selectedGroupName}</span></p>
                            </div>
                            <Badge variant="secondary" className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20">
                                Selected: {selectedIds.size}
                            </Badge>
                        </div>

                        {/* Toggle Current / Alumni */}
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
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 ${selectedIds.has(student.id) ? "bg-primary/5 border-primary" : "border-transparent"}`}
                                        onClick={() => toggleSelection(student.id)}
                                    >
                                        <Checkbox checked={selectedIds.has(student.id)} onCheckedChange={() => toggleSelection(student.id)} />
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm">{student.name}</p>
                                            <div className="flex gap-2 text-xs text-muted-foreground">
                                                <span>Room: {student.roomNo}</span>
                                                <span>•</span>
                                                <span>{student.mobile || "No Mobile"}</span>
                                            </div>
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
                            <div className="flex items-center gap-2 text-primary">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Checking status...</span>
                            </div>
                        ) : connected ? (
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-green-600 font-bold">
                                <CheckCircle2 className="w-6 h-6" />
                                <span>System Online & Ready</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-600 font-medium text-sm text-center">
                                    Scan QR Code to Connect
                                </div>
                                {qr ? (
                                    <img src={qr} alt="QR Code" className="w-48 h-48 mx-auto object-contain rounded-xl border-4 border-white shadow-md bg-white" />
                                ) : (
                                    <div className="w-48 h-48 mx-auto flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-2" />
                                        <span className="text-xs text-slate-400">Loading QR...</span>
                                    </div>
                                )}
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

                        <Button
                            size="lg"
                            className="w-full text-lg h-14 rounded-xl shadow-soft hover:shadow-soft-lg gap-2"
                            onClick={handleBulkSend}
                            disabled={sending || !connected || selectedIds.size === 0 || !message}
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            Send to {selectedIds.size} Students
                        </Button>
                        {!connected && (
                            <p className="text-xs text-center text-destructive">Connect WhatsApp to send messages</p>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
