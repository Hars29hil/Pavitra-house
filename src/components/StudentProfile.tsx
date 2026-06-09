import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, Calendar, BookOpen, GraduationCap, Heart, Edit, UserMinus, User, Hash, Award, UserCheck, Briefcase, School, Linkedin, Globe, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Student } from '@/types';
import { updateStudent, deleteStudent } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

interface StudentProfileProps {
    student: Student;
    onClose?: () => void;
    onUpdate?: () => void;
    hideEditAction?: boolean;
}

export const StudentProfile = ({ student, onClose, onUpdate, hideEditAction = false }: StudentProfileProps) => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleCopyUrl = () => {
        if (!student.mobile) {
            toast({
                title: 'No Mobile Number',
                description: 'Yuvak does not have a mobile number saved.',
                variant: 'destructive',
            });
            return;
        }
        // Use path-based URL instead of subdomain
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/self-update/${student.mobile.trim()}`;
        navigator.clipboard.writeText(url);
        toast({
            title: 'URL Copied',
            description: 'The Yuvak form URL has been copied to your clipboard.',
            duration: 3000,
        });
    };

    const handleDeleteStudent = async () => {
        const confirmed = window.confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            await deleteStudent(student.id);

            toast({
                title: 'Yuvak Deleted',
                description: `${student.name} has been successfully deleted.`,
                duration: 2000,
            });

            if (onUpdate) {
                await onUpdate();
            }

            if (onClose) {
                onClose();
            } else {
                navigate(-1);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete Yuvak.',
                variant: 'destructive',
            });
        }
    };

    const handleMoveToAlumni = async () => {
        try {
            // Optimistic UI updates could go here if we had local state for it, 
            // but we rely on the parent to refetch.
            await updateStudent(student.id, { isAlumni: true });

            toast({
                title: 'Moved to Alumni',
                description: `${student.name} has been moved to alumni list.`,
                duration: 2000,
            });

            // Ensure we wait for the parent to update before closing
            if (onUpdate) {
                await onUpdate();
            }

            if (onClose) {
                onClose();
            } else {
                navigate(-1);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to move Yuvak to alumni.',
                variant: 'destructive',
            });
        }
    };

    const handleMoveToCurrent = async () => {
        try {
            await updateStudent(student.id, { isAlumni: false });

            toast({
                title: 'Moved to Current',
                description: `${student.name} has been moved to current Yuvaks list.`,
                duration: 2000,
            });

            if (onUpdate) {
                await onUpdate();
            }

            if (onClose) {
                onClose();
            } else {
                navigate(-1);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to move Yuvak to current list.',
                variant: 'destructive',
            });
        }
    };

    const infoGroups = [
        {
            title: "Personal Information",
            items: [
                { label: 'Full Name', value: student.name, icon: User },
                { label: 'Date of Birth', value: student.dob, icon: Calendar },
                { label: 'Age', value: `${student.age} Years`, icon: User },
            ]
        },
        ...(!student.isAlumni ? [{
            title: "Hostel Details",
            items: [
                { label: 'Room Number', value: student.roomNo, icon: Hash },
            ]
        }] : []),
        {
            title: "Contact Details",
            items: [
                { label: 'Mobile Number', value: student.mobile, icon: Phone },
                { label: 'Email Address', value: student.email, icon: Mail },
            ]
        },
        {
            title: "Academic Information",
            items: [
                { label: student.isAlumni ? 'College Name' : 'College', value: student.college, icon: School },
                { label: student.isAlumni ? 'Last or pursuing Degree Completed' : 'Degree', value: student.degree, icon: BookOpen },
                ...(!student.isAlumni ? [
                    { label: 'Year', value: student.year, icon: GraduationCap },
                    { label: 'Result/CGPA', value: student.result, icon: Award }
                ] : []),
                { label: 'Interests', value: student.interest, icon: Heart },
            ]
        },
        {
            title: "Social Profiles",
            items: [
                { label: 'LinkedIn', value: student.linkedin, icon: Linkedin },
                { label: 'Social Link', value: student.socialLink, icon: Globe },
            ]
        },
        ...(student.isAlumni ? [{
            title: "Professional Information",
            items: [
                { label: 'Company Name', value: student.job, icon: Briefcase },
                { label: 'Designation', value: student.designation, icon: Briefcase },
                { label: 'Job Place or City', value: student.jobPlace, icon: Briefcase },
                { label: 'Living Place or City', value: student.livingPlace, icon: Briefcase }
            ]
        }] : [])
    ];

    const isCompact = hideEditAction;

    return (
        <div className="space-y-6">
            {/* Profile Card */}
            <div className={`bg-white border border-border/50 rounded-3xl shadow-soft text-center relative overflow-hidden ${isCompact ? 'p-4 sm:p-6' : 'p-6 sm:p-8'}`}>
                {/* Copy URL Button */}
                <button 
                    onClick={handleCopyUrl}
                    className="absolute top-4 right-4 p-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 group"
                    title="Copy Form URL"
                >
                    <Copy className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Copy Link</span>
                </button>

                {!hideEditAction && (
                    <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-4 left-4 rounded-xl h-9 w-9 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/20 shadow-sm transition-all"
                        onClick={handleDeleteStudent}
                    >
                        <Trash2 className="w-4.5 h-4.5" />
                    </Button>
                )}
                <div className={`${isCompact ? 'w-24 h-24 mb-4' : 'w-32 h-32 mb-6'} mx-auto rounded-3xl overflow-hidden shadow-soft-lg bg-muted/20 border-4 border-white`}>
                    {student.profileImage ? (
                        <img src={student.profileImage} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-primary flex items-center justify-center">
                            <span className={`${isCompact ? 'text-3xl' : 'text-5xl'} font-extrabold text-white`}>
                                {student.name.charAt(0)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <h2 className={`${isCompact ? 'text-lg sm:text-2xl' : 'text-xl sm:text-3xl'} font-extrabold text-foreground tracking-tight truncate px-2`}>{student.name}</h2>
                    {!student.isAlumni && student.roomNo && (
                        <p className="text-primary font-bold uppercase tracking-[0.2em] text-[10px] sm:text-xs">Room {student.roomNo}</p>
                    )}
                </div>

                <div className={`${isCompact ? 'mt-4' : 'mt-8'} flex flex-col sm:flex-row justify-center gap-3`}>
                    {!student.isAlumni ? (
                        <>
                            {!hideEditAction && (
                                <Button
                                    size="lg"
                                    className="rounded-2xl h-12 px-8 font-bold bg-primary hover:bg-primary/90 shadow-soft w-full sm:w-auto"
                                    onClick={() => navigate(`/students/${student.id}/edit`)}
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Profile
                                </Button>
                            )}
                            <Button
                                size="lg"
                                variant="secondary"
                                className="rounded-2xl h-12 px-8 font-bold border border-border/50 w-full sm:w-auto"
                                onClick={handleMoveToAlumni}
                            >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Move to Alumni
                            </Button>
                        </>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <div className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-accent/20 text-accent text-xs sm:text-sm font-bold rounded-2xl border border-accent/10 uppercase tracking-widest w-full sm:w-auto">
                                <GraduationCap className="w-5 h-5" />
                                Alumni Member
                            </div>
                            <Button
                                size="lg"
                                className="rounded-2xl h-12 px-8 font-bold bg-primary hover:bg-primary/90 shadow-soft w-full sm:w-auto"
                                onClick={handleMoveToCurrent}
                            >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Move to Current
                            </Button>
                        </div>
                    )}
                </div>
            </div>



            {/* Info Groups */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {infoGroups.map((group, groupIdx) => (
                    <div key={group.title} className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">{group.title}</h3>
                        <div className="bg-white border border-border/50 rounded-2xl shadow-soft divide-y divide-border/30 overflow-hidden text-left">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.label}
                                        className={`flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4 transition-colors ${item.label === 'Result/CGPA' ? 'cursor-pointer hover:bg-primary/10' : 'hover:bg-primary/[0.02]'}`}
                                        onClick={() => item.label === 'Result/CGPA' && navigate(`/students/${student.id}/results`)}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
                                            {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight leading-none mb-1">{item.label}</p>
                                            {['LinkedIn', 'Social Link'].includes(item.label) && item.value ? (
                                                <a 
                                                    href={item.value.startsWith('http') ? item.value : `https://${item.value}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-sm sm:text-base font-bold text-blue-600 hover:underline truncate block"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {item.value}
                                                </a>
                                            ) : (
                                                <p className="text-sm sm:text-base font-bold text-foreground truncate">{item.value || "N/A"}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>


        </div >
    );
};
