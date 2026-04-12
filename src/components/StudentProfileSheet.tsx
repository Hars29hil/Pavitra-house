import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { StudentProfile } from "./StudentProfile";
import { Student } from "@/types";

interface StudentProfileSheetProps {
    student: Student | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export const StudentProfileSheet = ({
    student,
    isOpen,
    onClose,
    onUpdate
}: StudentProfileSheetProps) => {
    const [touchStart, setTouchStart] = React.useState<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        const touchEnd = e.changedTouches[0].clientX;
        const distance = touchEnd - touchStart;
        const isSwipeRight = distance > 100;

        // Trigger close if swipe right and started from left edge of drawer
        if (isSwipeRight && touchStart < 100) {
            onClose();
        }
        setTouchStart(null);
    };

    if (!student) return null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="right"
                hideClose
                className="w-full sm:max-w-xl overflow-y-auto bg-slate-50/95 backdrop-blur-md border-l border-white/20 shadow-2xl p-0"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <SheetHeader className="p-6 pb-0 sticky top-0 bg-transparent z-10">
                    <SheetTitle className="sr-only">Student Profile - {student.name}</SheetTitle>
                    <SheetDescription className="sr-only">Detailed profile view for {student.name}</SheetDescription>
                </SheetHeader>

                <div className="p-6 pt-10">
                    <StudentProfile student={student} onClose={onClose} onUpdate={onUpdate} hideEditAction={false} />
                </div>
            </SheetContent>
        </Sheet>
    );
};
