import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getStudents, getCategories, Karyakarta } from '@/lib/store';
import { Student, Task } from '@/types';
import { Search, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

    // Form fields
    const [descriptions, setDescriptions] = useState<Record<string, string>>({});
    const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Fetch students and categories when dialog opens
    useEffect(() => {
        if (open) {
            Promise.all([getStudents(), getCategories()]).then(([studentsData, categoriesData]) => {
                setStudents(studentsData || []);
                setCategories(categoriesData || []);
                setSelectedStudents([]);
                setDescriptions({});
                setDueDate(new Date().toISOString().split('T')[0]);
                setSearchQuery('');
            });
        }
    }, [open]);

    // Adjust descriptions when selectedStudents changes
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
    }, [selectedStudents]);

    const myCategory = useMemo(() => {
        return categories.find(
            c => c.name.trim().toLowerCase() === adminName.trim().toLowerCase()
        );
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

        if (!dueDate) {
            toast.error("Please select a date");
            return;
        }

        try {
            for (const student of selectedStudents) {
                const newTask = {
                    title: `Yuvak Meet: ${student.name}`,
                    dueDate: dueDate,
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
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6 border-none bg-white">
                <DialogHeader>
                    <DialogTitle>Yuvak Meet</DialogTitle>
                    <DialogDescription className="sr-only">Log how you met Yuvaks and keep track of interaction frequency.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 animate-fade-in mt-2">
                    {/* Step 1: Select Students */}
                    <div className="space-y-2">
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

                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 border border-border/40 rounded-xl p-2 bg-muted/20">
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
                    </div>

                    {selectedStudents.length > 0 && (
                        <div className="space-y-4 animate-slide-in">
                            {/* Selected Yuvaks Banner */}
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 space-y-2">
                                <p className="text-xs text-muted-foreground font-semibold">Selected Yuvaks ({selectedStudents.length})</p>
                                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
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

                            {/* Descriptions (individual meeting notes for each selected Yuvak) */}
                            <div className="space-y-4 border border-border/40 rounded-xl p-3 bg-muted/5 max-h-[220px] overflow-y-auto">
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Meeting Notes</p>
                                {selectedStudents.map(student => (
                                    <div key={student.id} className="space-y-2 border-b border-border/20 pb-3 last:border-b-0 last:pb-0">
                                        <Label htmlFor={`meet-desc-${student.id}`} className="font-bold text-xs flex items-center gap-1.5">
                                            <span>How did you meet</span>
                                            <span className="text-primary font-black">{student.name.split(' ')[0]}</span>?
                                        </Label>
                                        <Textarea
                                            id={`meet-desc-${student.id}`}
                                            placeholder={`Describe the meeting with ${student.name.split(' ')[0]}...`}
                                            value={descriptions[student.id] || ''}
                                            onChange={(e) => setDescriptions(prev => ({
                                                ...prev,
                                                [student.id]: e.target.value
                                            }))}
                                            className="min-h-[70px] rounded-xl text-xs"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Date (defaulting to today) */}
                            <div className="space-y-2">
                                <Label htmlFor="meet-date" className="font-bold">Meeting Date</Label>
                                <Input
                                    id="meet-date"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="h-11 rounded-xl"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button
                            disabled={selectedStudents.length === 0 || selectedStudents.some(s => !(descriptions[s.id] || '').trim())}
                            className="flex-1 bg-primary text-white hover:bg-primary/90 rounded-xl h-11"
                            onClick={handleSubmit}
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Log Meeting
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
