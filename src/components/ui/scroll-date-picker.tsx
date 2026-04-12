import * as React from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { getDaysInMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface ScrollDatePickerProps {
    date?: Date;
    onDateChange: (date: Date) => void;
    className?: string;
}

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const startYear = 1950;
const endYear = new Date().getFullYear();
// Reverse years so most recent are at the top (better for DOB pickers)
const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i);

type CarouselApi = UseEmblaCarouselType[1];

export function ScrollDatePicker({ date, onDateChange, className }: ScrollDatePickerProps) {
    const [currentDate, setCurrentDate] = React.useState<Date>(date || new Date());

    // Separate visual state for "What is currently highlighted/bold" vs "What is committed"
    const [visualMonth, setVisualMonth] = React.useState(currentDate.getMonth());
    const [visualDay, setVisualDay] = React.useState(currentDate.getDate());
    const [visualYear, setVisualYear] = React.useState(currentDate.getFullYear());

    const dateRef = React.useRef(currentDate);

    // Sync prop changes to both logical and visual state
    React.useEffect(() => {
        if (date && date.getTime() !== currentDate.getTime()) {
            setCurrentDate(date);
            dateRef.current = date;
            setVisualMonth(date.getMonth());
            setVisualDay(date.getDate());
            setVisualYear(date.getFullYear());
        }
    }, [date]);

    const [monthRef, monthApi] = useEmblaCarousel({ axis: "y", align: "center", dragFree: false, loop: true });
    const [dayRef, dayApi] = useEmblaCarousel({ axis: "y", align: "center", dragFree: false, loop: true });
    const [yearRef, yearApi] = useEmblaCarousel({ axis: "y", align: "center", dragFree: false, loop: false });

    // Initial scroll
    React.useEffect(() => {
        if (monthApi && dayApi && yearApi) {
            const monthIndex = currentDate.getMonth();
            const dayIndex = currentDate.getDate() - 1;
            const yearIndex = years.indexOf(currentDate.getFullYear());

            if (yearIndex !== -1) yearApi.scrollTo(yearIndex, true);
            monthApi.scrollTo(monthIndex, true);
            dayApi.scrollTo(dayIndex, true);
        }
    }, [monthApi, dayApi, yearApi]);

    // Sync scroll when currentDate changes (e.g. from prop)
    React.useEffect(() => {
        if (monthApi && dayApi && yearApi) {
            const monthIndex = currentDate.getMonth();
            const dayIndex = currentDate.getDate() - 1;
            const yearIndex = years.indexOf(currentDate.getFullYear());

            if (Math.abs(monthApi.selectedScrollSnap() - monthIndex) > 0) monthApi.scrollTo(monthIndex);
            if (Math.abs(dayApi.selectedScrollSnap() - dayIndex) > 0) dayApi.scrollTo(dayIndex);
            if (yearIndex !== -1 && Math.abs(yearApi.selectedScrollSnap() - yearIndex) > 0) yearApi.scrollTo(yearIndex);
        }
    }, [currentDate, monthApi, dayApi, yearApi]);

    // VISUAL UPDATE HANDLER (on "scroll")
    const updateVisuals = React.useCallback(() => {
        if (!monthApi || !dayApi || !yearApi) return;

        // Update visual highlights immediately based on scroll position
        setVisualMonth(monthApi.selectedScrollSnap());

        // For day, loop logic means index 0..N. Map 1:1
        const dayIdx = dayApi.selectedScrollSnap();
        setVisualDay(dayIdx + 1);

        const yearIdx = yearApi.selectedScrollSnap();
        setVisualYear(years[yearIdx] || visualYear);

    }, [monthApi, dayApi, yearApi, visualYear]);

    // LOGICAL COMMIT HANDLER (on "select" - snap end)
    const handleSelect = React.useCallback(() => {
        if (!monthApi || !dayApi || !yearApi) return;

        const monthIndex = monthApi.selectedScrollSnap();
        const dayIndex = dayApi.selectedScrollSnap();
        const yearIndex = yearApi.selectedScrollSnap();

        const selectedYear = years[yearIndex] || dateRef.current.getFullYear();
        const daysInNewMonth = getDaysInMonth(new Date(selectedYear, monthIndex));
        const selectedDay = Math.min(dayIndex + 1, daysInNewMonth);

        const newDate = new Date(selectedYear, monthIndex, selectedDay);

        // Update Logical State / Prop
        if (newDate.getTime() !== dateRef.current.getTime()) {
            setCurrentDate(newDate);
            dateRef.current = newDate;
            onDateChange(newDate);
        }

        // Always ensure visuals match final logic (especially if clamping changed the day)
        setVisualMonth(monthIndex);
        setVisualDay(selectedDay);
        setVisualYear(selectedYear);

        // If the day was clamped (e.g. Feb 31 -> 28) or if we need to sync visual snap
        if (dayIndex + 1 !== selectedDay) {
            dayApi.scrollTo(selectedDay - 1);
        }
    }, [monthApi, dayApi, yearApi, onDateChange]);

    React.useEffect(() => {
        if (!monthApi || !dayApi || !yearApi) return;

        // "scroll" event update visual highlight in real-time
        monthApi.on("scroll", updateVisuals);
        dayApi.on("scroll", updateVisuals);
        yearApi.on("scroll", updateVisuals);

        // "select" event commits the data (snap complete or target changed)
        monthApi.on("select", handleSelect);
        dayApi.on("select", handleSelect);
        yearApi.on("select", handleSelect);

        return () => {
            monthApi.off("scroll", updateVisuals);
            dayApi.off("scroll", updateVisuals);
            yearApi.off("scroll", updateVisuals);

            monthApi.off("select", handleSelect);
            dayApi.off("select", handleSelect);
            yearApi.off("select", handleSelect);
        };
    }, [monthApi, dayApi, yearApi, handleSelect, updateVisuals]);


    // We always show 31 days to keep the carousel stable during month/year scrolls.
    // We will dim/disable days that don't exist in the currently selected month/year.
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const maxDaysInVisualMonth = getDaysInMonth(new Date(visualYear, visualMonth));

    const WheelItem = ({ children, isSelected, isDisabled }: { children: React.ReactNode, isSelected: boolean, isDisabled?: boolean }) => (
        <div className={cn(
            "h-10 flex items-center justify-center text-sm transition-all duration-300 cursor-pointer select-none",
            isSelected ? "text-primary font-bold text-lg scale-110" : "text-muted-foreground/40 font-medium scale-95",
            isDisabled && "opacity-10 grayscale pointer-events-none"
        )}>
            {children}
        </div>
    );

    return (
        <div className={cn("relative flex flex-col items-center h-[260px] w-full max-w-[320px] mx-auto overflow-hidden bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[40px] p-4 pt-6", className)}>
            {/* Header Labels */}
            <div className="flex w-full px-4 mb-4 z-10">
                <span className="flex-1 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] text-center">Month</span>
                <span className="w-16 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] text-center">Day</span>
                <span className="w-20 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] text-center">Year</span>
            </div>

            <div className="relative flex items-center justify-center w-full h-[130px] mb-4">
                {/* Selection Highlight Bar */}
                <div className="absolute top-1/2 left-4 right-4 h-12 -translate-y-1/2 bg-primary/[0.08] border-y border-primary/10 rounded-2xl pointer-events-none z-0" />

                {/* Top/Bottom Gradient Masks */}
                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white via-white/40 to-transparent pointer-events-none z-20" />
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white via-white/40 to-transparent pointer-events-none z-20" />

                <div className="relative h-full flex-1 z-10 flex flex-col items-center">
                    <div className="h-full w-full overflow-hidden" ref={monthRef}>
                        <div className="flex flex-col py-[45px]">
                            {months.map((month, index) => (
                                <div key={month} className="flex-[0_0_auto] h-10 w-full" onClick={() => monthApi?.scrollTo(index)}>
                                    <WheelItem isSelected={visualMonth === index}>{month.substring(0, 3)}</WheelItem>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative h-full w-16 z-10 flex flex-col items-center border-x border-border/5">
                    <div className="h-full w-full overflow-hidden" ref={dayRef}>
                        <div className="flex flex-col py-[45px]">
                            {days.map((day, index) => (
                                <div key={day} className="flex-[0_0_auto] h-10 w-full" onClick={() => dayApi?.scrollTo(index)}>
                                    <WheelItem isSelected={visualDay === day} isDisabled={day > maxDaysInVisualMonth}>{day < 10 ? `0${day}` : day}</WheelItem>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative h-full w-20 z-10 flex flex-col items-center">
                    <div className="h-full w-full overflow-hidden" ref={yearRef}>
                        <div className="flex flex-col py-[45px]">
                            {years.map((year, index) => (
                                <div key={year} className="flex-[0_0_auto] h-10 w-full" onClick={() => yearApi?.scrollTo(index)}>
                                    <WheelItem isSelected={visualYear === year}>{year}</WheelItem>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="w-full flex gap-3 px-2 z-30">
                <button
                    className="flex-1 py-3 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 rounded-2xl transition-all"
                    onClick={() => onDateChange(date || new Date())}
                >
                    Cancel
                </button>
                <button
                    className="flex-1 py-3 text-xs font-black text-white bg-primary hover:bg-primary/90 rounded-2xl shadow-soft-lg hover:shadow-soft transition-all"
                    onClick={() => onDateChange(currentDate)}
                >
                    Confirm
                </button>
            </div>
        </div>
    );
}
