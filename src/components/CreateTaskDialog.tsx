import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { getStudents } from '@/lib/store';
import { Student } from '@/types';
import { Search, User2, Calendar, ClipboardList, HelpCircle, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTaskCreate: (task: any) => void;
}

export const CreateTaskDialog = ({ open, onOpenChange, onTaskCreate }: CreateTaskDialogProps) => {
    const [step, setStep] = useState(1);
    const [showAlumni, setShowAlumni] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);

    const [taskData, setTaskData] = useState({
        title: '',
        isPracticeQuestion: false,
        questionContent: '',
        dueDate: '',
    });

    // Fetch students when dialog opens
    useEffect(() => {
        if (open) {
            getStudents().then(setStudents);
            setStep(1);
            setSelectedStudents([]);
            setTaskData({ title: '', isPracticeQuestion: false, questionContent: '', dueDate: '' });
        }
    }, [open]);

    const filteredStudents = students.filter(s =>
        (showAlumni ? s.isAlumni : !s.isAlumni) && (
            (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.roomNo || '').toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.mobile && s.mobile.toString().includes(searchQuery))
        )
    );

    const toggleSelection = (student: Student) => {
        if (selectedStudents.find(s => s.id === student.id)) {
            setSelectedStudents(selectedStudents.filter(s => s.id !== student.id));
        } else {
            setSelectedStudents([...selectedStudents, student]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedStudents.length === filteredStudents.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredStudents);
        }
    };


    const handleSubmit = async () => {
        if (!taskData.title || !taskData.dueDate) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (selectedStudents.length === 0) {
            toast.error("Please select at least one student");
            return;
        }

        toast.message(`Creating tasks for ${selectedStudents.length} students...`);

        let successCount = 0;
        let notificationSuccessCount = 0;
        let notificationFailCount = 0;

        for (const student of selectedStudents) {
            const newTask = {
                title: taskData.title,
                dueDate: taskData.dueDate,
                status: 'pending',
                category: 'General',
                assignedTo: student.id,
                assignedToName: student.name,
                isPracticeQuestion: taskData.isPracticeQuestion,
                questionContent: taskData.questionContent
            };

            try {
                // Create the task
                await onTaskCreate(newTask);
                successCount++;

                // Send WhatsApp notification
                if (student.mobile) {
                    const message = `*New Task Assigned: ${taskData.title}*\n\n${taskData.questionContent ? `Question: ${taskData.questionContent}\n\n` : ''}📅 Due Date: ${taskData.dueDate}\n\nPlease submit by the deadline.`;

                    // Sanitize phone number: remove spaces, dashes, and handle country code
                    let sanitizedNumber = student.mobile
                        .replace(/\s+/g, '') // Remove all spaces
                        .replace(/-/g, '')   // Remove dashes
                        .replace(/\(/g, '')  // Remove opening parenthesis
                        .replace(/\)/g, ''); // Remove closing parenthesis

                    // Remove +91 prefix if present (backend will add it)
                    if (sanitizedNumber.startsWith('+91')) {
                        sanitizedNumber = sanitizedNumber.substring(3);
                    } else if (sanitizedNumber.startsWith('91') && sanitizedNumber.length === 12) {
                        sanitizedNumber = sanitizedNumber.substring(2);
                    }

                    console.log(`📱 Sending to ${student.name}: ${student.mobile} → ${sanitizedNumber}`);

                    try {
                        const response = await api.post('/api/send', {
                            number: sanitizedNumber,
                            message: message
                        });

                        // Consider it successful if:
                        // 1. response.data.success is true, OR
                        // 2. status is 200 and no explicit error
                        const isSuccess = response.data?.success === true ||
                            (response.status === 200 && !response.data?.error);

                        if (isSuccess) {
                            notificationSuccessCount++;
                            console.log(`✅ WhatsApp sent to ${student.name} (${student.mobile})`);
                        } else {
                            notificationFailCount++;
                            console.warn(`⚠️ WhatsApp failed for ${student.name}: ${response.data?.message || response.data?.error || 'Unknown error'}`);
                        }
                    } catch (error: any) {
                        notificationFailCount++;

                        // Detailed error logging for debugging
                        const errorMsg = error.response?.data?.message ||
                            error.response?.data?.error ||
                            error.message ||
                            'Unknown error';
                        const statusCode = error.response?.status || 'N/A';

                        console.error(`❌ WhatsApp error for ${student.name}:`, {
                            status: statusCode,
                            message: errorMsg,
                            mobile: student.mobile,
                            sanitized: sanitizedNumber,
                            fullError: error
                        });
                    }
                } else {
                    notificationFailCount++;
                    console.warn(`⚠️ No mobile number for ${student.name}`);
                }
            } catch (error) {
                console.error(`Failed to create task for ${student.name}:`, error);
                toast.error(`Failed to assign task to ${student.name}`);
            }
        }

        // Show comprehensive feedback
        if (successCount > 0) {
            toast.success(`✅ Task assigned to ${successCount} students successfully!`);
        }

        if (notificationSuccessCount > 0) {
            toast.success(`📱 WhatsApp notifications sent to ${notificationSuccessCount} students`);
        }

        if (notificationFailCount > 0) {
            // More helpful message when WhatsApp fails
            const failMessage = notificationFailCount === selectedStudents.length
                ? `⚠️ Tasks created successfully, but WhatsApp notifications couldn't be sent. You can notify students manually from the WhatsApp page.`
                : `⚠️ ${notificationFailCount} WhatsApp notifications failed. Tasks are created successfully. You can send messages manually from the WhatsApp page.`;

            toast.warning(failMessage, {
                duration: 6000, // Show longer for important message
            });
        }

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6 border-none">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription className="sr-only">Fill in the form to create and assign a new task to students.</DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg">Select Students</h3>
                            <p className="text-sm text-muted-foreground">Assign task to one or more students</p>
                        </div>

                        {/* Toggle Current / Alumni */}
                        <div className="flex p-1 bg-muted/50 rounded-xl border border-border/50 mb-2">
                            <button
                                onClick={() => setShowAlumni(false)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${!showAlumni ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Current
                            </button>
                            <button
                                onClick={() => setShowAlumni(true)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${showAlumni ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Alumni
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search name, room..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-background/50"
                                />
                            </div>
                            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                                {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? "None" : "All"}
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {filteredStudents.map(student => {
                                const isSelected = selectedStudents.some(s => s.id === student.id);
                                return (
                                    <div
                                        key={student.id}
                                        onClick={() => toggleSelection(student)}
                                        className={cn(
                                            "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                                            isSelected
                                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                : "border-border/40 hover:border-border hover:bg-muted/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Checkbox checked={isSelected} />
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {student.roomNo}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{student.name}</p>
                                                <p className="text-xs text-muted-foreground">{student.mobile || 'No Mobile'}</p>
                                            </div>
                                        </div>
                                        {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">Selected: {selectedStudents.length}</p>
                            <Button
                                disabled={selectedStudents.length === 0}
                                onClick={() => setStep(2)}
                            >
                                Next Step
                            </Button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg">Task Details</h3>
                            <p className="text-sm text-muted-foreground">Assigning to <span className="text-primary font-bold">{selectedStudents.length} Students</span></p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Task Topic</Label>
                                <Input
                                    placeholder="e.g. Complete Assignment 1"
                                    value={taskData.title}
                                    onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center space-x-2 border p-4 rounded-xl">
                                <Checkbox
                                    id="practice"
                                    checked={taskData.isPracticeQuestion}
                                    onCheckedChange={(c) => setTaskData({ ...taskData, isPracticeQuestion: !!c })}
                                />
                                <Label htmlFor="practice" className="cursor-pointer flex-1">
                                    Is this a Practice Question?
                                    <span className="block text-xs text-muted-foreground font-normal">If checked, we'll draft a WhatsApp message.</span>
                                </Label>
                            </div>

                            {taskData.isPracticeQuestion && (
                                <div className="space-y-2 animate-slide-in">
                                    <Label>Question Content</Label>
                                    <Textarea
                                        placeholder="Enter the practice question here..."
                                        value={taskData.questionContent}
                                        onChange={(e) => setTaskData({ ...taskData, questionContent: e.target.value })}
                                        className="min-h-[100px]"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Deadline Date</Label>
                                <Input
                                    type="date"
                                    value={taskData.dueDate}
                                    onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                            <Button className="flex-1" onClick={handleSubmit}>
                                {taskData.isPracticeQuestion ? (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Assign & Send
                                    </>
                                ) : 'Assign Task'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

