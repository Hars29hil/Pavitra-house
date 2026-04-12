import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getStudents, getStudentResults, addStudentResult, deleteStudentResult, StudentResult } from '@/lib/store';
import { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';

const StudentResults = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [student, setStudent] = useState<Student | undefined>(undefined);
    const [results, setResults] = useState<StudentResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [resultsLoading, setResultsLoading] = useState(false);

    const [newResult, setNewResult] = useState({
        semester: '',
        sgpa: '',
        cgpa: '',
        backlogs: '0',
        examMonthYear: ''
    });

    useEffect(() => {
        const fetchStudent = async () => {
            try {
                const students = await getStudents();
                const found = students.find(s => s.id === id);
                setStudent(found);
            } catch (error) {
                console.error(error);
                setStudent(undefined);
            } finally {
                setLoading(false);
            }
        };
        fetchStudent();
    }, [id]);

    useEffect(() => {
        if (student?.id) {
            loadResults();
        }
    }, [student?.id]);

    const loadResults = async () => {
        if (!student?.id) return;
        setResultsLoading(true);
        const data = await getStudentResults(student.id);
        setResults(data);
        setResultsLoading(false);
    };

    const handleAdd = async () => {
        if (!newResult.semester || !newResult.sgpa) {
            toast({ title: "Error", description: "Semester and SGPA are required", variant: "destructive" });
            return;
        }

        if (!student?.id) return;

        try {
            await addStudentResult({
                studentId: student.id,
                semester: newResult.semester,
                sgpa: newResult.sgpa,
                cgpa: newResult.cgpa || newResult.sgpa,
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

    const handleDelete = async (resultId: string) => {
        try {
            await deleteStudentResult(resultId);
            toast({ title: "Success", description: "Result deleted" });
            loadResults();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete result", variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading...</p>
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                        <GraduationCap className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold">Student not found</h1>
                    <Button onClick={() => navigate(-1)}>Go Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border shadow-soft">
                <div className="flex items-center gap-4 h-16 px-4 max-w-7xl mx-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="text-muted-foreground hover:text-primary -ml-2"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Result History: {student.name}</h1>
                    </div>
                </div>
            </header>

            <main className="px-4 md:px-6 pb-8 space-y-6 max-w-4xl mx-auto mt-6">
                {/* Input Form */}
                <div className="bg-white rounded-3xl border border-border/50 shadow-soft p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Plus className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Add New Result</h2>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Enter academic details</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                        <div className="col-span-1 space-y-1.5">
                            <Label className="text-xs uppercase font-bold text-muted-foreground ml-1">Semester</Label>
                            <Input
                                placeholder="Sem 1"
                                value={newResult.semester}
                                onChange={e => setNewResult({ ...newResult, semester: e.target.value })}
                                className="rounded-xl border-border/60 focus:ring-primary/20"
                            />
                        </div>
                        <div className="col-span-1 space-y-1.5">
                            <Label className="text-xs uppercase font-bold text-muted-foreground ml-1">SGPA / %</Label>
                            <Input
                                placeholder="9.5"
                                value={newResult.sgpa}
                                onChange={e => setNewResult({ ...newResult, sgpa: e.target.value })}
                                className="rounded-xl border-border/60 focus:ring-primary/20"
                            />
                        </div>
                        <div className="col-span-1 space-y-1.5">
                            <Label className="text-xs uppercase font-bold text-muted-foreground ml-1">Backlogs</Label>
                            <Input
                                type="number"
                                value={newResult.backlogs}
                                onChange={e => setNewResult({ ...newResult, backlogs: e.target.value })}
                                className="rounded-xl border-border/60 focus:ring-primary/20"
                            />
                        </div>
                        <div className="col-span-1 space-y-1.5">
                            <Label className="text-xs uppercase font-bold text-muted-foreground ml-1">CGPA (Opt)</Label>
                            <Input
                                placeholder="9.5"
                                value={newResult.cgpa}
                                onChange={e => setNewResult({ ...newResult, cgpa: e.target.value })}
                                className="rounded-xl border-border/60 focus:ring-primary/20"
                            />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs uppercase font-bold text-muted-foreground ml-1">Month/Year</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Dec 2024"
                                    value={newResult.examMonthYear}
                                    onChange={e => setNewResult({ ...newResult, examMonthYear: e.target.value })}
                                    className="rounded-xl border-border/60 focus:ring-primary/20"
                                />
                                <Button
                                    size="icon"
                                    className="shrink-0 rounded-xl bg-primary hover:bg-primary/90 shadow-soft"
                                    onClick={handleAdd}
                                >
                                    <Plus className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results List */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-2">Academic History</h3>
                    <div className="bg-white border rounded-3xl overflow-hidden shadow-soft overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider pl-6">Semester</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">SGPA</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">CGPA</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-center">Backlogs</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Month</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resultsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading results...</TableCell>
                                    </TableRow>
                                ) : results.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <GraduationCap className="h-8 w-8 opacity-20" />
                                                <p>No results found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    results.map((res) => (
                                        <TableRow key={res.id} className="hover:bg-muted/20 transition-colors">
                                            <TableCell className="font-bold pl-6">{res.semester}</TableCell>
                                            <TableCell className="text-primary font-bold">{res.sgpa}</TableCell>
                                            <TableCell>{res.cgpa}</TableCell>
                                            <TableCell className="text-center">
                                                {res.backlogs > 0 ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10 text-destructive text-xs font-bold">{res.backlogs}</span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/10 text-success text-xs font-bold">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{res.examMonthYear}</TableCell>
                                            <TableCell className="pr-4">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => handleDelete(res.id)}>
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
            </main>
        </div>
    );
};

export default StudentResults;
