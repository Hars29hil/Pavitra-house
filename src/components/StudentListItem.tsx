import React from 'react';
import { GraduationCap, Phone, MessageCircle, Hash } from 'lucide-react';
import { Student } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCategories, Karyakarta } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

interface StudentListItemProps {
  student: Student;
  onClick: () => void;
  hideContactActions?: boolean;
}

export const StudentListItem = ({ student, onClick, hideContactActions = false }: StudentListItemProps) => {
  const [tags, setTags] = useState<Karyakarta[]>([]);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [student.profileImage]);

  useEffect(() => {
    getCategories().then(cats => {
      const studentTags = cats.filter(c => c.studentIds.includes(student.id));
      setTags(studentTags);
    });
  }, [student.id]);

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!student.mobile) return;
    window.location.href = `tel:${student.mobile}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Remove all non-numeric characters for the WhatsApp API
    const cleanNumber = (student.mobile || '').replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanNumber}`;
    window.open(url, '_blank');
  };



  return (
    <div
      onClick={onClick}
      className="w-full flex items-center gap-2 sm:gap-4 p-3 sm:p-5 glass-card rounded-2xl shadow-soft transition-all duration-300 hover:shadow-soft-lg hover:scale-[1.01] active:scale-[0.99] animate-fade-in text-left cursor-pointer group"
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shadow-soft group-hover:shadow-soft-lg transition-all shrink-0 bg-primary/10 flex items-center justify-center">
        {student.profileImage && !imgError ? (
          <img
            src={student.profileImage}
            alt={student.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-xs sm:text-sm font-bold text-primary truncate max-w-full px-1">
            {student.roomNo || '?'}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 sm:mb-1 min-w-0">
          <h3 className="font-bold text-base sm:text-lg text-foreground truncate tracking-tight flex-1">{student.name}</h3>
          {student.isAlumni && (
            <span className="inline-flex shrink-0 items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-accent/30 to-accent/20 text-accent-foreground text-[8px] sm:text-[10px] font-bold rounded-full uppercase tracking-wider border border-accent/20">
              <GraduationCap className="w-2.5 h-2.5 sm:w-3 h-3" />
              Alumni
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <p className="text-xs sm:text-sm font-medium truncate">Room {student.roomNo || 'N/A'}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {!hideContactActions && (
          <div className="flex items-center gap-1 sm:gap-1.5 opacity-100 transition-opacity duration-200">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 sm:h-10 sm:w-10 text-success bg-success/10 hover:bg-success hover:text-white rounded-lg sm:rounded-xl transition-all shadow-sm hover:shadow-soft"
              onClick={handleWhatsApp}
            >
              <img src="/whatsapp-logo.png" alt="WhatsApp" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg sm:rounded-xl transition-all shadow-sm hover:shadow-soft"
              onClick={handleCall}
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        )}
      </div>
    </div >
  );
};
