import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
    FolderOpen, Download, Image as ImageIcon, Play, 
    FileText, Film, Loader2, Lock, Sparkles
} from "lucide-react";
import { jsPDF } from "jspdf";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaFile {
    name: string;
    url: string;
    type: "image" | "video" | "note";
    size: number;
    date: number;
    content?: string;
}

export default function ShareView() {
    const [searchParams] = useSearchParams();
    const studentId = searchParams.get("studentId") || "";
    const folderName = searchParams.get("folder") || "";
    const fileName = searchParams.get("file") || "";

    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [activeTab, setActiveTab] = useState<"photos" | "notes">("photos");
    const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

    useEffect(() => {
        if (!studentId || !folderName) {
            setLoading(false);
            return;
        }
        fetchSharedFiles();
    }, [studentId, folderName]);

    const fetchSharedFiles = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/gallery?action=list_files&student_id=${studentId}&folder_name=${encodeURIComponent(folderName)}`);
            if (res.data.success) {
                const fetchedFiles = res.data.files || [];
                // If a single file is shared, filter it
                if (fileName) {
                    const filtered = fetchedFiles.filter((f: MediaFile) => f.name === fileName);
                    setFiles(filtered);
                    if (filtered.length > 0) {
                        setPreviewFile(filtered[0]);
                    }
                } else {
                    setFiles(fetchedFiles);
                }
            }
        } catch (error) {
            console.error("Failed to load shared files", error);
        } finally {
            setLoading(false);
        }
    };

    const downloadNoteAsPDF = (note: MediaFile) => {
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
            doc.text(`Shared Note - Last Updated: ${formattedDate}`, margin, 37);

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
        } catch (error) {
            console.error("PDF generation failed:", error);
        }
    };

    if (!studentId || !folderName) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-soft text-center border space-y-4">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">Invalid Link</h2>
                    <p className="text-sm text-muted-foreground">This share link is missing required folder parameters. Please check the URL and try again.</p>
                </div>
            </div>
        );
    }

    const photosFiles = files.filter(f => f.type === 'image' || f.type === 'video');
    const notesFiles = files.filter(f => f.type === 'note');

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-40 px-4 py-4 sm:px-6 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 leading-tight">
                                {fileName ? "Shared File" : folderName}
                            </h1>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-emerald-500" /> View-Only Access
                            </p>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10">
                        <Sparkles className="w-3.5 h-3.5 fill-primary" /> Hostel Hub Share
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
                {loading ? (
                    <div className="py-24 text-center text-primary flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">Loading shared items...</span>
                    </div>
                ) : files.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-3xl border shadow-soft flex flex-col items-center justify-center p-6 space-y-3 max-w-xl mx-auto mt-10">
                        <Lock className="w-12 h-12 text-slate-300" />
                        <h3 className="text-lg font-bold text-slate-800">No Shared Media Found</h3>
                        <p className="text-xs text-muted-foreground">The requested file or folder does not contain any media, or the link has expired.</p>
                    </div>
                ) : fileName ? (
                    // Single File View
                    <div className="max-w-4xl mx-auto bg-white border rounded-3xl shadow-soft p-6 flex flex-col items-center gap-6 mt-6">
                        <div className="w-full flex justify-between items-center border-b pb-4">
                            <span className="text-sm font-bold text-slate-800 truncate">
                                {previewFile?.name.substring(previewFile.name.indexOf('_') + 1).replace('.txt', '')}
                            </span>
                            {previewFile && (
                                <a 
                                    href={previewFile.url}
                                    download={previewFile.name}
                                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-soft hover:shadow-soft-lg transition-all"
                                >
                                    <Download className="w-4 h-4" /> Download File
                                </a>
                            )}
                        </div>

                        <div className="w-full flex justify-center bg-slate-50 rounded-2xl overflow-hidden p-4 min-h-[300px] items-center">
                            {previewFile?.type === "image" && (
                                <img 
                                    src={previewFile.url} 
                                    alt={previewFile.name} 
                                    className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md"
                                />
                            )}
                            {previewFile?.type === "video" && (
                                <video 
                                    src={previewFile.url} 
                                    controls 
                                    autoPlay 
                                    className="max-h-[60vh] max-w-full rounded-xl shadow-md"
                                />
                            )}
                            {previewFile?.type === "note" && (
                                <div className="bg-white border rounded-2xl p-6 w-full max-w-2xl text-left shadow-sm">
                                    <p className="text-sm font-medium leading-relaxed font-mono whitespace-pre-wrap text-slate-700">
                                        {previewFile.content || ""}
                                    </p>
                                    <div className="mt-6 flex justify-end border-t pt-4">
                                        <Button
                                            onClick={() => downloadNoteAsPDF(previewFile)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                                        >
                                            <FileText className="w-4 h-4 mr-1.5" /> Download PDF
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // Folder Tabbed View
                    <div className="space-y-6">
                        {/* Tab header */}
                        <div className="flex gap-1 bg-white p-1 rounded-2xl border w-fit shadow-sm">
                            <button
                                onClick={() => setActiveTab("photos")}
                                className={cn(
                                    "px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
                                    activeTab === "photos"
                                        ? "bg-slate-100 text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <ImageIcon className="w-3.5 h-3.5" /> Photos & Videos ({photosFiles.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("notes")}
                                className={cn(
                                    "px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
                                    activeTab === "notes"
                                        ? "bg-slate-100 text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <FileText className="w-3.5 h-3.5" /> Notes ({notesFiles.length})
                            </button>
                        </div>

                        {activeTab === "photos" ? (
                            photosFiles.length > 0 ? (
                                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                    {photosFiles.map(file => (
                                        <div 
                                            key={file.name}
                                            onClick={() => setPreviewFile(file)}
                                            className="group bg-white border border-border/40 rounded-3xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-300 cursor-pointer flex flex-col relative aspect-square"
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
                                                <a 
                                                    href={file.url}
                                                    download={file.name}
                                                    onClick={e => e.stopPropagation()}
                                                    className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-all shrink-0"
                                                    title="Download"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center bg-white rounded-3xl border shadow-soft w-full">
                                    <ImageIcon className="w-14 h-14 opacity-20 mb-3" />
                                    <p className="font-bold text-lg text-slate-800">No photos or videos shared yet</p>
                                </div>
                            )
                        ) : (
                            notesFiles.length > 0 ? (
                                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                    {notesFiles.map(file => (
                                        <div 
                                            key={file.name}
                                            onClick={() => setPreviewFile(file)}
                                            className="group bg-white border border-border/40 rounded-3xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-300 cursor-pointer flex flex-col relative aspect-square"
                                        >
                                            <div className="flex-1 bg-amber-50/10 flex flex-col p-4 text-left overflow-hidden">
                                                <FileText className="w-8 h-8 text-amber-600 mb-2 shrink-0" />
                                                <span className="text-[9px] uppercase font-extrabold tracking-widest text-amber-700/80 mb-1.5 shrink-0">
                                                    Text Note
                                                </span>
                                                <p className="text-xs text-slate-600 font-medium line-clamp-4 leading-relaxed break-all select-none">
                                                    {file.content || ""}
                                                </p>
                                            </div>
                                            <div className="p-3 border-t bg-white flex items-center justify-between gap-2 shrink-0">
                                                <span className="text-xs font-bold text-foreground truncate flex-1 leading-none">
                                                    {file.name.substring(file.name.indexOf('_') + 1).replace('.txt', '')}
                                                </span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        downloadNoteAsPDF(file);
                                                    }}
                                                    className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all shrink-0"
                                                    title="Download PDF"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center bg-white rounded-3xl border shadow-soft w-full">
                                    <FileText className="w-14 h-14 opacity-20 mb-3" />
                                    <p className="font-bold text-lg text-slate-800">No notes shared yet</p>
                                </div>
                            )
                        )}
                    </div>
                )}
            </main>

            {/* LIGHTBOX FOR GUESTS */}
            {previewFile && !fileName && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => setPreviewFile(null)}
                >
                    <div 
                        className="max-w-5xl max-h-[85vh] w-full flex flex-col items-center justify-center relative gap-3"
                        onClick={e => e.stopPropagation()}
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
                                    <button 
                                        onClick={() => downloadNoteAsPDF(previewFile)}
                                        className="p-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-600/30 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1.5"
                                    >
                                        <FileText className="w-4 h-4" /> Download PDF
                                    </button>
                                )}
                                <a 
                                    href={previewFile.url} 
                                    download={previewFile.name}
                                    className="p-2 bg-white/10 text-white rounded-xl hover:bg-white/20 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1.5"
                                >
                                    <Download className="w-4 h-4" /> Download File
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
