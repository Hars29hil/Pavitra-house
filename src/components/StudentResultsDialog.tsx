import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, GraduationCap } from 'lucide-react';
import { Student } from '@/types';
import { getStudentResults, addStudentResult, deleteStudentResult, StudentResult } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

interface StudentResultsDialogProps {
    student: Student;
    isOpen: boolean;
    onClose: () => void;
}

export const StudentResultsDialog = ({ student, isOpen, onClose }: StudentResultsDialogProps) => {
    const [results, setResults] = useState<StudentResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [newResult, setNewResult] = useState({
        semester: '',
        sgpa: '',
        cgpa: '',
        backlogs: '0',
        examMonthYear: ''
    });
    const { toast } = useToast();

    // Fetch results on open
    useEffect(() => {
        if (isOpen && student.id) {
            loadResults();
        }
    }, [isOpen, student.id]);

    const loadResults = async () => {
        setLoading(true);
        const data = await getStudentResults(student.id);
        setResults(data);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newResult.semester || !newResult.sgpa) {
            toast({ title: "Error", description: "Semester and SGPA are required", variant: "destructive" });
            return;
        }

        try {
            await addStudentResult({
                studentId: student.id,
                semester: newResult.semester,
                sgpa: newResult.sgpa,
                cgpa: newResult.cgpa || newResult.sgpa, // Default CGPA to SGPA if empty
                backlogs: parseInt(newResult.backlogs) || 0,
                examMonthYear: newResult.examMonthYear || new Date().toLocaleString('default', { month: 'short', year: 'numeric' })
            });

            toast({ title: "Success", description: "Result added successfully" });
            setNewResult({ semester: '', sgpa: '', cgpa: '', backlogs: '0', examMonthYear: '' });
            loadResults();
        } catch (error) {
            toast({ title: "Error", description: "Failed to add result", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteStudentResult(id);
            toast({ title: "Success", description: "Result deleted" });
            loadResults();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete result", variant: "destructive" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl p-4 sm:p-6 rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                        <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        Result History
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        Academic performance for {student.name}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Input Form - Mobile Optimized */}
                    <div className="bg-muted/30 rounded-xl border border-border/50 p-3 sm:p-4">
                        <Label className="text-xs font-bold text-muted-foreground uppercase mb-3 block">Add New Result</Label>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                            <div className="col-span-1 space-y-0.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground/70 ml-1">Semester</Label>
                                <Input
                                    placeholder="Sem 1"
                                    value={newResult.semester}
                                    onChange={e => setNewResult({ ...newResult, semester: e.target.value })}
                                    className="h-6 bg-white text-[10px] rounded-full px-2 shadow-none border-border/60"
                                />
                            </div>
                            <div className="col-span-1 space-y-0.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground/70 ml-1">SGPA / %</Label>
                                <Input
                                    placeholder="9.5"
                                    value={newResult.sgpa}
                                    onChange={e => setNewResult({ ...newResult, sgpa: e.target.value })}
                                    className="h-6 bg-white text-[10px] rounded-full px-2 shadow-none border-border/60"
                                />
                            </div>
                            <div className="col-span-1 space-y-0.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground/70 ml-1">Backlogs</Label>
                                <Input
                                    type="number"
                                    value={newResult.backlogs}
                                    onChange={e => setNewResult({ ...newResult, backlogs: e.target.value })}
                                    className="h-6 bg-white text-[10px] rounded-full px-2 shadow-none border-border/60"
                                />
                            </div>

                            <div className="col-span-1 space-y-0.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground/70 ml-1">CGPA (Opt)</Label>
                                <Input
                                    placeholder="9.5"
                                    value={newResult.cgpa}
                                    onChange={e => setNewResult({ ...newResult, cgpa: e.target.value })}
                                    className="h-6 bg-white text-[10px] rounded-full px-2 shadow-none border-border/60"
                                />
                            </div>

                            <div className="col-span-1 space-y-0.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground/70 ml-1">Month/Year</Label>
                                <Input
                                    placeholder="Dec 2024"
                                    value={newResult.examMonthYear}
                                    onChange={e => setNewResult({ ...newResult, examMonthYear: e.target.value })}
                                    className="h-6 bg-white text-[10px] w-full rounded-full px-2 shadow-none border-border/60"
                                />
                            </div>

                            <div className="col-span-1 flex items-end">
                                <Button className="w-full h-6 font-bold shadow-soft text-[10px] p-0 bg-primary/90 hover:bg-primary rounded-full mb-[1px]" onClick={handleAdd}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="border rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Semester</TableHead>
                                    <TableHead>SGPA</TableHead>
                                    <TableHead>CGPA</TableHead>
                                    <TableHead>Backlogs</TableHead>
                                    <TableHead>Month/Year</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading results...</TableCell>
                                    </TableRow>
                                ) : results.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No results found. Add a new record above.</TableCell>
                                    </TableRow>
                                ) : (
                                    results.map((res) => (
                                        <TableRow key={res.id}>
                                            <TableCell className="font-medium">{res.semester}</TableCell>
                                            <TableCell>{res.sgpa}</TableCell>
                                            <TableCell>{res.cgpa}</TableCell>
                                            <TableCell>
                                                {res.backlogs > 0 ? (
                                                    <span className="text-red-500 font-bold">{res.backlogs}</span>
                                                ) : (
                                                    <span className="text-green-500">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{res.examMonthYear}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(res.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
