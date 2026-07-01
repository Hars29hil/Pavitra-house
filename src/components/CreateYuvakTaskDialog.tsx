import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getStudents, getCategories, Karyakarta } from '@/lib/store';
import { Student, Task } from '@/types';
import { Search, Send, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn, isSameName } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface CreateYuvakTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTaskCreate: (task: any) => void;
    tasks: Task[];
}

export const CreateYuvakTaskDialog = ({
    open,
    onOpenChange,
    onTaskCreate,
    tasks
}: CreateYuvakTaskDialogProps) => {
    const { adminName, adminRole } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [categories, setCategories] = useState<Karyakarta[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
    
    // Wizard step state
    const [step, setStep] = useState(1);

    // Form fields
    const [descriptions, setDescriptions] = useState<Record<string, string>>({});
    const [dueDates, setDueDates] = useState<Record<string, string>>({});

    // Fetch students and categories when dialog opens
    useEffect(() => {
        if (open) {
            Promise.all([getStudents(), getCategories()]).then(([studentsData, categoriesData]) => {
                setStudents(studentsData || []);
                setCategories(categoriesData || []);
                setSelectedStudents([]);
                setDescriptions({});
                setDueDates({});
                setStep(1);
                setSearchQuery('');
            });
        }
    }, [open]);

    // Adjust descriptions and dueDates when selectedStudents changes
    useEffect(() => {
        setDescriptions(prev => {
            const next = { ...prev };
            const selectedIds = selectedStudents.map(s => s.id);
            Object.keys(next).forEach(key => {
                if (!selectedIds.includes(key)) {
                    delete next[key];
                }
            });
            selectedStudents.forEach(student => {
                if (next[student.id] === undefined) {
                    next[student.id] = '';
                }
            });
            return next;
        });

        setDueDates(prev => {
            const next = { ...prev };
            const selectedIds = selectedStudents.map(s => s.id);
            Object.keys(next).forEach(key => {
                if (!selectedIds.includes(key)) {
                    delete next[key];
                }
            });
            selectedStudents.forEach(student => {
                if (next[student.id] === undefined) {
                    next[student.id] = new Date().toISOString().split('T')[0];
                }
            });
            return next;
        });
    }, [selectedStudents]);

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
            });
        }
        const ids = Array.from(assignedIds);
        return students.filter(s => ids.includes(s.id));
    }, [students, categories, myCategory, adminRole]);

    const filteredStudents = myAssignedStudents.filter(s =>
        !s.isAlumni && (
            (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.roomNo || '').toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.mobile && s.mobile.toString().includes(searchQuery))
        )
    );

    const handleToggleStudent = (student: Student) => {
        setSelectedStudents(prev => {
            const exists = prev.some(s => s.id === student.id);
            if (exists) {
                return prev.filter(s => s.id !== student.id);
            } else {
                return [...prev, student];
            }
        });
    };

    const handleSubmit = async () => {
        if (selectedStudents.length === 0) {
            toast.error("Please select at least one Yuvak");
            return;
        }

        const emptyDescStudent = selectedStudents.find(s => !(descriptions[s.id] || '').trim());
        if (emptyDescStudent) {
            toast.error(`Please enter a meeting description for ${emptyDescStudent.name.split(' ')[0]}`);
            return;
        }

        const emptyDateStudent = selectedStudents.find(s => !dueDates[s.id]);
        if (emptyDateStudent) {
            toast.error(`Please select a date for ${emptyDateStudent.name.split(' ')[0]}`);
            return;
        }

        try {
            for (const student of selectedStudents) {
                const newTask = {
                    title: `Yuvak Meet: ${student.name}`,
                    dueDate: dueDates[student.id],
                    status: 'pending', // Starts as pending, Karyakarta will mark it as done/complete
                    category: 'Yuvak',
                    assignedTo: student.id,
                    assignedToName: student.name,
                    description: (descriptions[student.id] || '').trim(),
                    showToKaryakarta: true,
                    createdBy: adminName
                };
                await onTaskCreate(newTask);
            }
            toast.success(`✅ ${selectedStudents.length} Yuvak meet(s) logged successfully!`);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to create Yuvak task(s):", error);
            toast.error("Failed to log one or more Yuvak tasks");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-[100vw] h-[100dvh] max-h-none rounded-none shadow-none p-4 sm:p-8 border-none overflow-y-auto bg-background flex flex-col items-center">
                <div className="w-full max-w-2xl flex flex-col flex-1">
                    <DialogHeader>
                        <DialogTitle>Yuvak Meet</DialogTitle>
                        <DialogDescription className="sr-only">Log how you met Yuvaks and keep track of interaction frequency.</DialogDescription>
                    </DialogHeader>

                    {step === 1 ? (
                        <div className="space-y-4 animate-fade-in mt-2 flex-1 flex flex-col justify-between">
                            <div className="space-y-4">
                                <Label className="font-bold">Select Yuvak(s)</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name, room..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-background/50 h-11 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 border border-border/40 rounded-xl p-2 bg-muted/20">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map(student => {
                                            const isSelected = selectedStudents.some(s => s.id === student.id);
                                            const studentMeetCount = tasks.filter(t => t.category === 'Yuvak' && t.status === 'done' && t.assignedTo && t.assignedTo.split(',').map(id => id.trim()).includes(student.id)).length;
                                            return (
                                                <div
                                                    key={student.id}
                                                    onClick={() => handleToggleStudent(student)}
                                                    className={cn(
                                                        "p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                                                        isSelected
                                                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                            : "border-transparent hover:bg-muted/60"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            {student.roomNo || 'N/A'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-xs text-foreground">{student.name}</p>
                                                            <p className="text-[10px] text-muted-foreground">{student.mobile || 'No Mobile'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                                                            Met: {studentMeetCount}
                                                        </span>
                                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-xs text-muted-foreground text-center py-4">No Yuvaks found</p>
                                    )}
                                </div>

                                {selectedStudents.length > 0 && (
                                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2 max-h-[150px] overflow-y-auto">
                                        <p className="text-xs text-muted-foreground font-semibold">Selected Yuvaks ({selectedStudents.length})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedStudents.map(student => (
                                                <span
                                                    key={student.id}
                                                    className="inline-flex items-center gap-1 bg-white border border-border/80 text-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-sm animate-scale-in"
                                                >
                                                    {student.name}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleStudent(student);
                                                        }}
                                                        className="text-muted-foreground hover:text-destructive text-[10px] font-bold ml-1.5 transition-colors"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-border/20 mt-4">
                                <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => onOpenChange(false)}>Cancel</Button>
                                <Button
                                    disabled={selectedStudents.length === 0}
                                    className="flex-1 bg-primary text-white hover:bg-primary/90 rounded-xl h-11"
                                    onClick={() => setStep(2)}
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1.5" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in mt-2 flex-1 flex flex-col justify-between">
                            <div className="space-y-4 flex-1">
                                <p className="text-sm font-semibold text-muted-foreground">
                                    Step 2: Enter meeting details for selected Yuvaks ({selectedStudents.length})
                                </p>
                                
                                <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
                                    {selectedStudents.map(student => (
                                        <div key={student.id} className="border border-border/60 rounded-xl p-4 space-y-3 bg-muted/5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                                                    {student.roomNo || 'N/A'}
                                                </div>
                                                <p className="font-bold text-xs text-foreground">{student.name}</p>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="space-y-1">
                                                    <Label htmlFor={`meet-date-${student.id}`} className="text-xs font-bold text-muted-foreground">Meeting Date</Label>
                                                    <Input
                                                        id={`meet-date-${student.id}`}
                                                        type="date"
                                                        value={dueDates[student.id] || ''}
                                                        onChange={(e) => setDueDates(prev => ({
                                                            ...prev,
                                                            [student.id]: e.target.value
                                                        }))}
                                                        className="h-10 rounded-lg text-xs"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label htmlFor={`meet-desc-${student.id}`} className="text-xs font-bold text-muted-foreground">How did you meet?</Label>
                                                    <Textarea
                                                        id={`meet-desc-${student.id}`}
                                                        placeholder={`Describe the meeting with ${student.name.split(' ')[0]}...`}
                                                        value={descriptions[student.id] || ''}
                                                        onChange={(e) => setDescriptions(prev => ({
                                                            ...prev,
                                                            [student.id]: e.target.value
                                                        }))}
                                                        className="min-h-[60px] rounded-lg text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-border/20 mt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl h-11"
                                    onClick={() => setStep(1)}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                                    Back
                                </Button>
                                <Button
                                    disabled={selectedStudents.some(s => !(descriptions[s.id] || '').trim()) || selectedStudents.some(s => !dueDates[s.id])}
                                    className="flex-1 bg-primary text-white hover:bg-primary/90 rounded-xl h-11"
                                    onClick={handleSubmit}
                                >
                                    <Send className="w-4 h-4 mr-1.5" />
                                    Log Meeting
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
