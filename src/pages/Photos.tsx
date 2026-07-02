import { useState, useEffect, useMemo } from "react";
import { 
    FolderOpen, FolderPlus, ArrowLeft, UploadCloud, Trash2, 
    Download, Image as ImageIcon, Video as VideoIcon, Play, X, 
    Search, Sparkles, Loader2, User, ChevronRight, FileText, Film,
    Share2, Edit2
} from "lucide-react";
import { jsPDF } from "jspdf";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import api, { API_BASE_URL } from "@/lib/api";
import { useConfirm } from "@/contexts/ConfirmationContext";
import { getCategories, Karyakarta } from "@/lib/store";
import { cn, isSameName } from "@/lib/utils";

interface Student {
    id: string;
    name: string;
    room_no: string;
    mobile: string;
    is_alumni: boolean;
    profileImage?: string;
}

interface MediaFile {
    name: string;
    url: string;
    type: "image" | "video" | "note";
    size: number;
    date: number;
    content?: string;
}

function StudentAvatar({ student }: { student: Student }) {
    const [error, setError] = useState(false);
    
    useEffect(() => {
        setError(false);
    }, [student.profileImage]);

    if (student.profileImage && !error) {
        return (
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-soft">
                <img 
                    src={student.profileImage} 
                    alt={student.name} 
                    className="w-full h-full object-cover"
                    onError={() => setError(true)}
                />
            </div>
        );
    }

    return (
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
            <span className="text-primary font-bold text-sm leading-none">{student.room_no || 'N/A'}</span>
            <span className="text-primary/70 font-bold text-[8px] uppercase mt-0.5">Room</span>
        </div>
    );
}

export default function Photos() {
    const { confirm } = useConfirm();
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Navigation state
    // "students" | "folders" | "files"
    const [view, setView] = useState<"students" | "folders" | "files">("students");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<string>("");

    // Folders and Files state
    const [folders, setFolders] = useState<string[]>([]);
    const [files, setFiles] = useState<MediaFile[]>([]);

    // Folder Creation Dialog state
    const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [creatingFolder, setCreatingFolder] = useState(false);

    // Note Creation Dialog state
    const [showCreateNoteDialog, setShowCreateNoteDialog] = useState(false);
    const [noteTitle, setNoteTitle] = useState("");
    const [noteContent, setNoteContent] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    // Upload state
    const [uploading, setUploading] = useState(false);

    // Subfolder & share states
    const [activeTab, setActiveTab] = useState<"photos" | "notes">("photos");
    const [isEditingNote, setIsEditingNote] = useState(false);

    // Lightbox / Preview state
    const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

    // Categories state
    const [categories, setCategories] = useState<Karyakarta[]>([]);

    // Resolve profile image URL helper
    const resolveProfileImageUrl = (url: string | null | undefined): string => {
        if (!url) return '';
        if (url.startsWith('/api/uploads/') || url.startsWith('api/uploads/')) {
            const cleanPath = url.startsWith('/') ? url : '/' + url;
            return `${API_BASE_URL}${cleanPath}`;
        }
        if (url.includes('localhost:') && (url.includes('/api/uploads/') || url.includes('/uploads/'))) {
            const pathStart = url.indexOf('/api/uploads/');
            if (pathStart !== -1) {
                return `${API_BASE_URL}${url.substring(pathStart)}`;
            }
            const uploadsStart = url.indexOf('/uploads/');
            if (uploadsStart !== -1) {
                return `${API_BASE_URL}/api${url.substring(uploadsStart)}`;
            }
        }
        return url;
    };

    // Fetch students list and categories on mount
    useEffect(() => {
        fetchStudents();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data || []);
        } catch (error) {
            console.error("Failed to load categories", error);
        }
    };

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const res = await api.get("/api/gallery?action=list_students");
            if (res.data.success) {
                const mapped = (res.data.students || []).map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    room_no: s.room_no,
                    mobile: s.mobile,
                    is_alumni: s.is_alumni === true || s.is_alumni === 1 || s.is_alumni === '1',
                    profileImage: resolveProfileImageUrl(s.profile_image)
                }));
                setStudents(mapped);
            } else {
                toast.error("Failed to load students list");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to connect to backend");
        } finally {
            setLoading(false);
        }
    };

    const adminRole = localStorage.getItem('adminRole') || '';
    const adminName = localStorage.getItem('adminName') || '';

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
        return students.filter(s => ids.includes(s.id));
    }, [students, categories, myCategory, adminRole]);

    // Load folders for selected student
    const loadFolders = async (student: Student) => {
        try {
            setLoading(true);
            setSelectedStudent(student);
            const res = await api.get(`/api/gallery?action=list_folders&student_id=${student.id}`);
            if (res.data.success) {
                setFolders(res.data.folders || []);
                setView("folders");
            } else {
                toast.error(res.data.error || "Failed to load folders");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load folders");
        } finally {
            setLoading(false);
        }
    };

    // Load files inside folder
    const loadFiles = async (folderName: string) => {
        if (!selectedStudent) return;
        try {
            setLoading(true);
            setSelectedFolder(folderName);
            const res = await api.get(`/api/gallery?action=list_files&student_id=${selectedStudent.id}&folder_name=${encodeURIComponent(folderName)}`);
            if (res.data.success) {
                setFiles(res.data.files || []);
                setView("files");
            } else {
                toast.error(res.data.error || "Failed to load files");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load files");
        } finally {
            setLoading(false);
        }
    };

    // Create a new folder
    const handleCreateFolder = async () => {
        if (!selectedStudent || !newFolderName.trim()) return;
        try {
            setCreatingFolder(true);
            const res = await api.post("/api/gallery?action=create_folder", {
                student_id: selectedStudent.id,
                folder_name: newFolderName.trim()
            });
            if (res.data.success) {
                toast.success(`Folder "${newFolderName}" created!`);
                setNewFolderName("");
                setShowCreateFolderDialog(false);
                // Reload folders list
                loadFolders(selectedStudent);
            } else {
                toast.error(res.data.error || "Failed to create folder");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "Failed to create folder");
        } finally {
            setCreatingFolder(false);
        }
    };

    // Delete a folder
    const handleDeleteFolder = async (e: React.MouseEvent, folderName: string) => {
        e.stopPropagation(); // Prevent opening the folder
        if (!selectedStudent) return;

        const isConfirmed = await confirm({
            title: "Delete Folder?",
            message: `Are you sure you want to delete "${folderName}" and all files inside? This cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            variant: "destructive"
        });
        if (!isConfirmed) return;

        try {
            setLoading(true);
            const res = await api.post("/api/gallery?action=delete_folder", {
                student_id: selectedStudent.id,
                folder_name: folderName
            });
            if (res.data.success) {
                toast.success("Folder deleted successfully");
                loadFolders(selectedStudent);
            } else {
                toast.error(res.data.error || "Failed to delete folder");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete folder");
        } finally {
            setLoading(false);
        }
    };

    // Delete a file
    const handleDeleteFile = async (fileName: string) => {
        if (!selectedStudent || !selectedFolder) return;

        const isConfirmed = await confirm({
            title: "Delete File?",
            message: `Are you sure you want to delete "${fileName}"? This cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            variant: "destructive"
        });
        if (!isConfirmed) return;

        try {
            setLoading(true);
            const res = await api.post("/api/gallery?action=delete_file", {
                student_id: selectedStudent.id,
                folder_name: selectedFolder,
                file_name: fileName
            });
            if (res.data.success) {
                toast.success("File deleted successfully");
                // Reload files
                loadFiles(selectedFolder);
            } else {
                toast.error(res.data.error || "Failed to delete file");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete file");
        } finally {
            setLoading(false);
        }
    };

    // File upload handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedStudent || !selectedFolder || !e.target.files || e.target.files.length === 0) return;
        const filesArray = Array.from(e.target.files);

        // Size check: e.g. 50MB limit per file
        const oversized = filesArray.some(file => file.size > 50 * 1024 * 1024);
        if (oversized) {
            toast.error("One or more files are too large. Max size is 50MB per file.");
            return;
        }

        try {
            setUploading(true);
            let successCount = 0;
            let failCount = 0;

            for (const file of filesArray) {
                const formData = new FormData();
                formData.append("student_id", selectedStudent.id);
                formData.append("folder_name", selectedFolder);
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
            loadFiles(selectedFolder);
        } catch (error: any) {
            console.error(error);
            toast.error("Upload failed");
        } finally {
            setUploading(false);
            // Reset input value
            e.target.value = "";
        }
    };

    // Note creation handler
    const handleCreateNote = async () => {
        if (!selectedStudent || !selectedFolder || !noteTitle.trim() || !noteContent.trim()) return;
        try {
            setSavingNote(true);
            const res = await api.post("/api/gallery?action=save_note", {
                student_id: selectedStudent.id,
                folder_name: selectedFolder,
                filename: noteTitle.trim(),
                content: noteContent.trim()
            });
            if (res.data.success) {
                toast.success("Note saved successfully!");
                setNoteTitle("");
                setNoteContent("");
                setShowCreateNoteDialog(false);
                loadFiles(selectedFolder);
            } else {
                toast.error(res.data.error || "Failed to save note");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "Failed to save note");
        } finally {
            setSavingNote(false);
        }
    };

    const downloadNoteAsPDF = (note: any) => {
        try {
            const doc = new jsPDF();
            const margin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
            const maxLineWidth = pageWidth - (margin * 2);

            // Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(20);
            const title = note.name.substring(note.name.indexOf('_') + 1).replace('.txt', '');
            doc.text(title, margin, 25);

            // Horizontal Line
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.5);
            doc.line(margin, 30, pageWidth - margin, 30);

            // Date
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            const formattedDate = new Date(note.date * 1000).toLocaleString();
            doc.text(`Last Updated: ${formattedDate}`, margin, 37);

            // Content
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            
            const contentText = note.content || '';
            const splitText = doc.splitTextToSize(contentText, maxLineWidth);
            
            let currentHeight = 46;
            const pageHeight = doc.internal.pageSize.getHeight();
            
            for (let i = 0; i < splitText.length; i++) {
                if (currentHeight + 10 > pageHeight - margin) {
                    doc.addPage();
                    currentHeight = margin + 10;
                }
                doc.text(splitText[i], margin, currentHeight);
                currentHeight += 6.5;
            }

            doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
            toast.success("PDF downloaded!");
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Failed to generate PDF");
        }
    };

    const handleShareFile = (file: any) => {
        if (!selectedStudent || !selectedFolder) return;
        const shareUrl = `${window.location.origin}/share?studentId=${selectedStudent.id}&folder=${encodeURIComponent(selectedFolder)}&file=${encodeURIComponent(file.name)}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success("Photo share link copied!");
    };

    const handleShareFolder = (folderName: string) => {
        if (!selectedStudent) return;
        const shareUrl = `${window.location.origin}/share?studentId=${selectedStudent.id}&folder=${encodeURIComponent(folderName)}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success("Folder share link copied!");
    };

    // Filter students by query
    const filteredStudents = myAssignedStudents.filter(s => 
        (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.room_no || "").toString().toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 relative animate-fade-in flex flex-col font-sans">
            <AppHeader title="Hostel Hub" />

            <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
                
                {/* Modern Gradient Header Card */}
                <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6 sm:p-8 rounded-[2rem] shadow-soft-lg hover:shadow-xl transition-all duration-500 group">
                    {/* Decorative Background Glows */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {view !== "students" && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="rounded-2xl text-white hover:text-white hover:bg-white/15 bg-white/10 border border-white/10 shrink-0"
                                    onClick={() => {
                                        if (view === "files") {
                                            if (selectedStudent) loadFolders(selectedStudent);
                                        } else {
                                            setView("students");
                                            setSelectedStudent(null);
                                        }
                                    }}
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            )}
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 drop-shadow-sm">
                                    <Sparkles className="w-6 h-6 text-yellow-300 fill-yellow-300 animate-pulse" />
                                    {view === "students" && "Yuvak Photo Gallery"}
                                    {view === "folders" && `${selectedStudent?.name}'s Folders`}
                                    {view === "files" && `${selectedFolder}`}
                                </h2>
                                <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1">
                                    {view === "students" && "Select a Yuvak to view folders"}
                                    {view === "folders" && `Manage folders for room ${selectedStudent?.room_no}`}
                                    {view === "files" && `Uploaded photos, videos, and notes`}
                                </p>
                            </div>
                        </div>

                        {/* Action buttons based on view */}
                        {view === "folders" && (
                            <Button 
                                className="rounded-2xl font-bold gap-2 shadow-soft hover:shadow-soft-lg transition-all bg-white text-indigo-600 hover:bg-white/95 border-none h-11 px-5"
                                onClick={() => setShowCreateFolderDialog(true)}
                            >
                                <FolderPlus className="w-4.5 h-4.5 text-indigo-600" /> Create Folder
                            </Button>
                        )}
                    </div>
                </div>

                {loading && (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-primary">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                        <span className="font-extrabold text-xs uppercase tracking-widest text-muted-foreground mt-4">Loading gallery content...</span>
                    </div>
                )}

                {!loading && (
                    <div className="flex-1 min-h-[400px]">
                        
                        {/* VIEW 1: STUDENTS LIST */}
                        {view === "students" && (
                            <div className="space-y-6">
                                <div className="relative max-w-md w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                                    <Input 
                                        placeholder="Search Yuvak by name or room..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="pl-11 h-12 bg-white border border-slate-200/85 rounded-2xl focus-visible:ring-indigo-500/20 shadow-sm text-sm"
                                    />
                                </div>

                                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map(student => (
                                            <div 
                                                key={student.id}
                                                onClick={() => loadFolders(student)}
                                                className="p-4 bg-white border border-slate-100 rounded-3xl shadow-soft hover:shadow-indigo-100 hover:scale-[1.01] hover:border-indigo-200/60 transition-all duration-300 flex items-center justify-between cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <StudentAvatar student={student} />
                                                    <div className="min-w-0">
                                                        <p className="font-extrabold text-base text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                                            {student.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-1 font-medium">
                                                            <span>{student.mobile || "No Mobile"}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold text-[9px] border border-indigo-100/50">
                                                                Room {student.room_no || 'N/A'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors shrink-0 group-hover:translate-x-1 duration-300">
                                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-[2rem] border border-dashed flex flex-col items-center justify-center p-6 space-y-2">
                                            <User className="w-12 h-12 opacity-20 mb-1" />
                                            <p className="font-bold text-slate-700">No Yuvaks found</p>
                                            <p className="text-xs text-muted-foreground">Try searching for a different name or room number</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW 2: FOLDER LIST */}
                        {view === "folders" && (
                            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                {folders.length > 0 ? (
                                    folders.map(folder => (
                                        <div 
                                            key={folder}
                                            onClick={() => loadFiles(folder)}
                                            className="p-5 bg-gradient-to-br from-amber-50/70 to-orange-50/40 border border-amber-200/50 rounded-[2rem] shadow-soft hover:shadow-amber-100 hover:border-amber-300 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer group relative min-h-[150px] hover:scale-[1.02]"
                                        >
                                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-all shadow-inner border border-amber-200/20">
                                                <FolderOpen className="w-6 h-6 text-amber-600" />
                                            </div>
                                            <span className="font-extrabold text-sm text-slate-800 break-all line-clamp-2 px-1">
                                                {folder}
                                            </span>
                                            
                                            {/* Folder Share Button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-3 left-3 w-8 h-8 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShareFolder(folder);
                                                }}
                                                title="Copy Share Link"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </Button>

                                            {/* Folder Delete Button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-3 right-3 w-8 h-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                onClick={(e) => handleDeleteFolder(e, folder)}
                                                title="Delete Folder"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-20 text-center text-slate-400 bg-white/60 backdrop-blur-sm rounded-[2rem] border border-dashed flex flex-col items-center justify-center p-6 space-y-4 max-w-lg mx-auto">
                                        <FolderOpen className="w-14 h-14 opacity-25 text-indigo-500" />
                                        <div>
                                            <p className="font-extrabold text-lg text-slate-800">No folders created yet</p>
                                            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Create a folder (like "2026") to start organizing photos, videos, and meetup notes.</p>
                                        </div>
                                        <Button 
                                            className="rounded-xl font-bold gap-2 shadow-soft hover:shadow-soft-lg"
                                            onClick={() => setShowCreateFolderDialog(true)}
                                        >
                                            <FolderPlus className="w-4 h-4" /> Create First Folder
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW 3: FILES GRID */}
                        {view === "files" && (
                            <div className="space-y-6">
                                {/* Elegant Breadcrumb Path */}
                                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-400 bg-white px-4 py-2.5 rounded-2xl border border-slate-100/80 w-fit shadow-sm">
                                    <span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setView("students")}>Gallery</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                    <span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => loadFolders(selectedStudent!)}>{selectedStudent?.name}</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                    <span className="text-slate-800 font-extrabold">{selectedFolder}</span>
                                </div>

                                {/* Custom Glassmorphism tab switcher */}
                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 flex-wrap gap-4">
                                    <div className="flex gap-1 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200/40">
                                        <button
                                            onClick={() => setActiveTab("photos")}
                                            className={cn(
                                                "px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
                                                activeTab === "photos"
                                                    ? "bg-white text-indigo-600 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-800"
                                            )}
                                        >
                                            <ImageIcon className="w-3.5 h-3.5" /> Photos & Videos
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("notes")}
                                            className={cn(
                                                "px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
                                                activeTab === "notes"
                                                    ? "bg-white text-indigo-600 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-800"
                                            )}
                                        >
                                            <FileText className="w-3.5 h-3.5" /> Notes
                                        </button>
                                    </div>

                                    {/* Action Buttons based on Active Tab */}
                                    <div className="flex gap-2">
                                        {activeTab === "photos" ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="file" 
                                                    id="gallery-file-input" 
                                                    className="hidden" 
                                                    accept="image/*,video/*"
                                                    multiple
                                                    onChange={handleFileUpload}
                                                    disabled={uploading}
                                                />
                                                <Button 
                                                    className="rounded-xl font-bold gap-2 shadow-soft hover:shadow-soft-lg transition-all h-10 bg-indigo-600 hover:bg-indigo-700 text-white"
                                                    onClick={() => document.getElementById("gallery-file-input")?.click()}
                                                    disabled={uploading}
                                                >
                                                    {uploading ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UploadCloud className="w-4 h-4" /> Upload Media
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button 
                                                className="rounded-xl font-bold gap-2 shadow-soft hover:shadow-soft-lg bg-amber-600 hover:bg-amber-700 text-white transition-all h-10"
                                                onClick={() => {
                                                    setIsEditingNote(false);
                                                    setNoteTitle("");
                                                    setNoteContent("");
                                                    setShowCreateNoteDialog(true);
                                                }}
                                            >
                                                <FileText className="w-4 h-4" /> Create Note
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {activeTab === "photos" ? (
                                    // Render Photos / Videos
                                    files.filter(f => f.type === 'image' || f.type === 'video').length > 0 ? (
                                        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                            {files.filter(f => f.type === 'image' || f.type === 'video').map(file => (
                                                <div 
                                                    key={file.name}
                                                    onClick={() => setPreviewFile(file)}
                                                    className="group bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-soft hover:shadow-indigo-100 hover:scale-[1.02] hover:border-indigo-100 transition-all duration-300 cursor-pointer flex flex-col relative aspect-square"
                                                >
                                                    <div className="flex-1 bg-slate-50 flex items-center justify-center overflow-hidden relative">
                                                        {file.type === "image" && (
                                                            <img 
                                                                src={file.url} 
                                                                alt={file.name}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                loading="lazy"
                                                            />
                                                        )}
                                                        {file.type === "video" && (
                                                            <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white p-3 text-center">
                                                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2 text-white">
                                                                    <Play className="w-6 h-6 fill-white" />
                                                                </div>
                                                                <span className="text-[10px] uppercase font-bold tracking-widest text-white/60 flex items-center gap-1">
                                                                    <Film className="w-3.5 h-3.5" /> Video
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-3 border-t bg-white flex items-center justify-between gap-2 shrink-0">
                                                        <span className="text-xs font-bold text-foreground truncate flex-1 leading-none">
                                                            {file.name.substring(file.name.indexOf('_') + 1)}
                                                        </span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleShareFile(file);
                                                                }}
                                                                className="p-1 rounded bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                                                                title="Copy Share Link"
                                                            >
                                                                <Share2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <a 
                                                                href={file.url}
                                                                download={file.name}
                                                                onClick={e => e.stopPropagation()}
                                                                className="p-1 rounded bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                                                                title="Download"
                                                            >
                                                                    <Download className="w-3.5 h-3.5" />
                                                            </a>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteFile(file.name);
                                                                }}
                                                                className="p-1 rounded bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-3xl border border-dashed border-border/60 w-full col-span-full">
                                            <ImageIcon className="w-14 h-14 opacity-20 mb-3" />
                                            <p className="font-bold text-lg text-foreground">No photos or videos uploaded yet</p>
                                            <p className="text-xs mt-1">Upload a photo or video under the "/photo" subdirectory.</p>
                                        </div>
                                    )
                                ) : (
                                    // Render Notes
                                    files.filter(f => f.type === 'note').length > 0 ? (
                                        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 animate-fade-in font-sans">
                                            {files.filter(f => f.type === 'note').map(file => (
                                                <div 
                                                    key={file.name}
                                                    onClick={() => setPreviewFile(file)}
                                                    className="group bg-gradient-to-br from-amber-50/60 to-orange-50/30 border border-amber-200/40 rounded-[2rem] overflow-hidden shadow-soft hover:shadow-amber-100 hover:border-amber-300 transition-all duration-300 cursor-pointer flex flex-col relative aspect-square hover:scale-[1.02]"
                                                >
                                                    <div className="flex-1 bg-transparent flex flex-col p-4 text-left overflow-hidden">
                                                        <FileText className="w-8 h-8 text-amber-600 mb-2 shrink-0" />
                                                        <span className="text-[9px] uppercase font-extrabold tracking-widest text-amber-700/80 mb-1.5 shrink-0">
                                                            Text Note
                                                        </span>
                                                        <p className="text-xs text-slate-600 font-medium line-clamp-4 leading-relaxed break-all select-none">
                                                            {file.content || ""}
                                                        </p>
                                                    </div>
                                                    <div className="p-3 border-t bg-white flex items-center justify-between gap-2 shrink-0">
                                                        <span className="text-xs font-bold text-slate-800 truncate flex-1 leading-none">
                                                            {file.name.substring(file.name.indexOf('_') + 1).replace('.txt', '')}
                                                        </span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleShareFile(file);
                                                                }}
                                                                className="p-1.5 rounded bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                                                title="Copy Share Link"
                                                            >
                                                                <Share2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    downloadNoteAsPDF(file);
                                                                }}
                                                                className="p-1.5 rounded bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                                                                title="Download PDF"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteFile(file.name);
                                                                }}
                                                                className="p-1.5 rounded bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-3xl border border-dashed border-border/60 w-full col-span-full">
                                            <FileText className="w-14 h-14 opacity-20 mb-3" />
                                            <p className="font-bold text-lg text-foreground">No notes created yet</p>
                                            <p className="text-xs mt-1">Create a text note under the "/note" subdirectory.</p>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* DIALOG: CREATE FOLDER */}
            <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
                <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Create Folder</DialogTitle>
                        <DialogDescription className="sr-only">Enter folder name to structure student gallery</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-3">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Folder Name</label>
                            <Input 
                                placeholder="e.g. Birthday Photo, Meetups"
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                className="h-11 rounded-xl focus-visible:ring-primary/20"
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-6 flex gap-2">
                        <Button 
                            variant="outline" 
                            className="rounded-xl flex-1 font-bold h-11"
                            onClick={() => setShowCreateFolderDialog(false)}
                            disabled={creatingFolder}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="rounded-xl flex-1 font-bold h-11 bg-primary hover:bg-primary/95 text-white"
                            onClick={handleCreateFolder}
                            disabled={creatingFolder || !newFolderName.trim()}
                        >
                            {creatingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
 
            {/* DIALOG: CREATE NOTE */}
            <Dialog open={showCreateNoteDialog} onOpenChange={setShowCreateNoteDialog}>
                <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">{isEditingNote ? "Edit Note" : "Create Note"}</DialogTitle>
                        <DialogDescription className="sr-only">Enter note details to save in this folder</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-3">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Note Title</label>
                            <Input 
                                placeholder="e.g. Anandswami Say Note, Meetup details"
                                value={noteTitle}
                                onChange={e => setNoteTitle(e.target.value)}
                                readOnly={isEditingNote}
                                className={cn(
                                    "h-11 rounded-xl focus-visible:ring-primary/20",
                                    isEditingNote && "bg-muted/50 text-muted-foreground"
                                )}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Note Content</label>
                            <textarea 
                                placeholder="Type note content here..."
                                value={noteContent}
                                onChange={e => setNoteContent(e.target.value)}
                                className="w-full h-32 p-4 rounded-xl border bg-muted/30 focus:ring-2 ring-primary/20 outline-none resize-none text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-6 flex gap-2">
                        <Button 
                            variant="outline" 
                            className="rounded-xl flex-1 font-bold h-11"
                            onClick={() => setShowCreateNoteDialog(false)}
                            disabled={savingNote}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="rounded-xl flex-1 font-bold h-11 bg-primary hover:bg-primary/95 text-white"
                            onClick={handleCreateNote}
                            disabled={savingNote || !noteTitle.trim() || !noteContent.trim()}
                        >
                            {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Note"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PREVIEW LIGHTBOX DIALOG */}
            {previewFile && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => setPreviewFile(null)}
                >
                    <button 
                        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all"
                        onClick={() => setPreviewFile(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div 
                        className="max-w-5xl max-h-[85vh] w-full flex flex-col items-center justify-center relative gap-3"
                        onClick={e => e.stopPropagation()} // Prevent close on body click
                    >
                        {previewFile.type === "image" && (
                            <img 
                                src={previewFile.url} 
                                alt={previewFile.name}
                                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                            />
                        )}
                        {previewFile.type === "video" && (
                            <video 
                                src={previewFile.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl"
                            />
                        )}
                        {previewFile.type === "note" && (
                            <div className="bg-white text-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border-none max-h-[70vh] overflow-y-auto relative flex flex-col text-left">
                                <div className="flex items-center gap-2 border-b pb-3 mb-4 shrink-0">
                                    <FileText className="w-5 h-5 text-amber-600" />
                                    <h3 className="text-base font-black text-slate-900 leading-none">
                                        {previewFile.name.substring(previewFile.name.indexOf('_') + 1).replace('.txt', '')}
                                    </h3>
                                </div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1 text-slate-600 font-medium font-mono bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    {previewFile.content || ""}
                                </p>
                            </div>
                        )}
 
                        <div className="flex items-center gap-4 justify-between w-full max-w-2xl px-2 flex-wrap">
                            <span className="text-white font-bold truncate text-sm">
                                {previewFile.name.substring(previewFile.name.indexOf('_') + 1).replace('.txt', '')}
                            </span>
                            <div className="flex gap-2">
                                {previewFile.type === "note" && (
                                    <>
                                        <button 
                                            onClick={() => {
                                                const rawName = previewFile.name.substring(previewFile.name.indexOf('_') + 1).replace('.txt', '');
                                                setNoteTitle(rawName);
                                                setNoteContent(previewFile.content || '');
                                                setIsEditingNote(true);
                                                setShowCreateNoteDialog(true);
                                                setPreviewFile(null);
                                            }}
                                            className="p-2 bg-amber-600/20 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-600/30 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1.5"
                                        >
                                            <Edit2 className="w-4 h-4" /> Edit
                                        </button>
                                        <button 
                                            onClick={() => downloadNoteAsPDF(previewFile)}
                                            className="p-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-600/30 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1.5"
                                        >
                                            <FileText className="w-4 h-4" /> PDF
                                        </button>
                                    </>
                                )}
                                <button 
                                    onClick={() => handleShareFile(previewFile)}
                                    className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-600/30 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1.5"
                                >
                                    <Share2 className="w-4 h-4" /> Share
                                </button>
                                <a 
                                    href={previewFile.url} 
                                    download={previewFile.name}
                                    className="p-2 bg-white/10 text-white rounded-xl hover:bg-white/20 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1.5"
                                >
                                    <Download className="w-4 h-4" /> Download
                                </a>
                                <button 
                                    onClick={() => {
                                        const name = previewFile.name;
                                        setPreviewFile(null);
                                        handleDeleteFile(name);
                                    }}
                                    className="p-2 bg-red-600/20 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-600/30 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1.5"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
