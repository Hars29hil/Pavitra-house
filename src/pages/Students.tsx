import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users2, RefreshCw, Download, SlidersHorizontal } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { StudentListItem } from '@/components/StudentListItem';
import { StudentProfileSheet } from '@/components/StudentProfileSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"
import { getStudents, updateStudent, getCategories, Karyakarta, getAllStudentResults } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@/types';
import { cn, isSameName } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const Students = () => {
  const navigate = useNavigate();
  const { adminName, adminRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlumni, setShowAlumni] = useState(false);
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Karyakarta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [selectedInterest, setSelectedInterest] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const [studentsData, categoriesData] = await Promise.all([
        getStudents(),
        getCategories()
      ]);
      setStudents(studentsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Failed to fetch students', error);
      setStudents([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

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
        if (sub.studentId) {
          assignedIds.add(sub.studentId);
        }
      });
    }
    const ids = Array.from(assignedIds);
    return students.filter(s => ids.includes(s.id) && !s.isAlumni);
  }, [students, categories, myCategory, adminRole]);

  const uniqueColleges = useMemo(() => {
    const colleges = myAssignedStudents
      .map(s => s.college)
      .filter((c): c is string => !!c && c.trim() !== "");
    return Array.from(new Set(colleges)).sort();
  }, [myAssignedStudents]);

  const uniqueInterests = useMemo(() => {
    const interestsSet = new Set<string>();
    myAssignedStudents.forEach(s => {
      if (s.interest) {
        s.interest.split(',').forEach(item => {
          const trimmed = item.trim();
          if (trimmed) {
            const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
            interestsSet.add(normalized);
          }
        });
      }
    });
    return Array.from(interestsSet).sort();
  }, [myAssignedStudents]);

  const handleExportResults = async () => {
    try {
      setExporting(true);
      toast({ title: "Export Started", description: "Preparing academic report..." });
      
      const allResults = await getAllStudentResults();
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Academic Report');
      
      worksheet.columns = [
        { header: 'Yuvak Name', key: 'name', width: 25 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Mobile', key: 'mobile', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'College', key: 'college', width: 30 },
        { header: 'Degree', key: 'degree', width: 15 },
        { header: 'Current Year / Job', key: 'details', width: 20 },
        { header: 'Interests', key: 'interest', width: 20 },
        { header: 'Overall CGPA (Profile)', key: 'profileCgpa', width: 20 },
        { header: 'Semester', key: 'semester', width: 12 },
        { header: 'SGPA', key: 'sgpa', width: 10 },
        { header: 'Semester CGPA', key: 'semCgpa', width: 15 },
        { header: 'Backlogs', key: 'backlogs', width: 10 },
        { header: 'Exam Month/Year', key: 'examMonthYear', width: 18 }
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F46E5' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 28;

      const rowsData: any[] = [];
      
      filteredStudents.forEach(student => {
        const studentResults = allResults.filter(r => r.studentId === student.id);
        
        const baseData = {
          name: student.name || '',
          status: student.isAlumni ? 'Alumni' : 'Current',
          mobile: student.mobile || '',
          email: student.email || '',
          college: student.college || '',
          degree: student.degree || '',
          details: student.isAlumni ? (student.job || 'Alumni') : (student.year || 'Student'),
          interest: student.interest || '',
          profileCgpa: student.result || '-'
        };
        
        if (studentResults.length > 0) {
          studentResults.forEach(r => {
            rowsData.push({
              ...baseData,
              semester: r.semester,
              sgpa: r.sgpa,
              semCgpa: r.cgpa,
              backlogs: r.backlogs,
              examMonthYear: r.examMonthYear || '-'
            });
          });
        } else {
          rowsData.push({
            ...baseData,
            semester: '-',
            sgpa: '-',
            semCgpa: '-',
            backlogs: '-',
            examMonthYear: '-'
          });
        }
      });
      
      worksheet.addRows(rowsData);

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: 'middle', horizontal: 'left' };
          if (rowNumber % 2 === 0) {
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'F9FAFB' }
            };
          }
          const backlogVal = row.getCell('backlogs').value;
          if (typeof backlogVal === 'number' && backlogVal > 0) {
            row.getCell('backlogs').fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FEE2E2' }
            };
            row.getCell('backlogs').font = { color: { argb: '991B1B' }, bold: true };
          }
        }
        
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'E5E7EB' } },
            left: { style: 'thin', color: { argb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
            right: { style: 'thin', color: { argb: 'E5E7EB' } }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const filterText = (selectedCollege !== 'all' ? `_${selectedCollege}` : '') + (selectedInterest !== 'all' ? `_${selectedInterest}` : '');
      const filename = `Yuvak_Academic_Report${filterText.replace(/\s+/g, '_')}.xlsx`;
      
      saveAs(blob, filename);
      toast({ title: "Success", description: "Report downloaded successfully" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to download results report", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const filteredStudents = myAssignedStudents.filter(student => {
    const matchesSearch =
      student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roomNo?.includes(searchQuery) ||
      student.mobile?.includes(searchQuery) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = showAlumni ? student.isAlumni : !student.isAlumni;

    const matchesCollege = selectedCollege === 'all' || student.college === selectedCollege;

    const matchesInterest = selectedInterest === 'all' || (
      student.interest && student.interest.toLowerCase().split(',').map(i => i.trim()).includes(selectedInterest.toLowerCase())
    );

    return matchesSearch && matchesFilter && matchesCollege && matchesInterest;
  }).sort((a, b) => {
    const roomA = a.roomNo || '';
    const roomB = b.roomNo || '';
    return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <AppHeader title="Hari-Saurabh Hostel" />

      <main className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Users2 className="w-8 h-8 text-primary" />
            Yuvak Directory
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Browse and search for any resident</p>
        </div>

        {/* Search & Toggle Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
              <Input
                placeholder="Search name, room, mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 glass-card border-white/40 rounded-2xl focus:ring-primary/30 focus:border-primary transition-all text-base font-medium shadow-soft"
              />
            </div>

            <div className="flex gap-3 w-full sm:w-auto shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "h-14 px-6 rounded-2xl border-border bg-white shadow-soft font-bold flex items-center gap-2 transition-all w-full sm:w-auto",
                  showFilters && "bg-primary/5 text-primary border-primary/20"
                )}
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span>Filters</span>
                {((selectedCollege !== 'all' ? 1 : 0) + (selectedInterest !== 'all' ? 1 : 0)) > 0 && (
                  <span className="flex items-center justify-center bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 font-black">
                    {(selectedCollege !== 'all' ? 1 : 0) + (selectedInterest !== 'all' ? 1 : 0)}
                  </span>
                )}
              </Button>

              {adminRole === 'admin' && (
                <div className="flex flex-1 sm:flex-none p-1.5 bg-muted/30 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm">
                  <button
                    onClick={() => setShowAlumni(false)}
                    className={cn(
                      "flex-1 sm:flex-none px-3 sm:px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap",
                      !showAlumni
                        ? "bg-primary text-white shadow-soft"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                    )}
                  >
                    Current ({myAssignedStudents.filter(s => !s.isAlumni).length})
                  </button>
                  <button
                    onClick={() => setShowAlumni(true)}
                    className={cn(
                      "flex-1 sm:flex-none px-3 sm:px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap",
                      showAlumni
                        ? "bg-primary text-white shadow-soft"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                    )}
                  >
                    Alumni ({myAssignedStudents.filter(s => s.isAlumni).length})
                  </button>
                </div>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-muted/10 p-4 rounded-2xl border border-border/20 animate-slide-down">
              {/* College Filter */}
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Filter by College</label>
                <Select value={selectedCollege} onValueChange={setSelectedCollege}>
                  <SelectTrigger className="h-12 bg-white/70 backdrop-blur-md border border-border/50 rounded-xl shadow-soft font-medium text-sm">
                    <SelectValue placeholder="All Colleges" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border rounded-xl">
                    <SelectItem value="all">All Colleges</SelectItem>
                    {uniqueColleges.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interest Filter */}
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Filter by Interest</label>
                <Select value={selectedInterest} onValueChange={setSelectedInterest}>
                  <SelectTrigger className="h-12 bg-white/70 backdrop-blur-md border border-border/50 rounded-xl shadow-soft font-medium text-sm">
                    <SelectValue placeholder="All Interests" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border rounded-xl">
                    <SelectItem value="all">All Interests</SelectItem>
                    {uniqueInterests.map(interest => (
                      <SelectItem key={interest} value={interest}>{interest}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters */}
              <div className="col-span-1 flex items-end">
                {(selectedCollege !== 'all' || selectedInterest !== 'all') ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedCollege('all');
                      setSelectedInterest('all');
                    }}
                    className="h-12 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl w-full border border-dashed border-muted-foreground/30 hover:border-foreground/30"
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <div className="h-12" />
                )}
              </div>
              
              {/* Download Button */}
              <div className="col-span-1 flex items-end justify-end">
                <Button
                  onClick={handleExportResults}
                  disabled={exporting || filteredStudents.length === 0}
                  className="w-full h-12 bg-gradient-to-r from-indigo-500 to-primary text-white rounded-xl shadow-soft hover:shadow-soft-lg font-bold flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download Results
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Student List */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-20">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Updating Directory...</p>
              </div>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student, index) => (
                <div
                  key={student.id}
                  className="animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <StudentListItem
                    student={student}
                    onClick={() => {
                      setSelectedStudent(student);
                      setIsProfileOpen(true);
                    }}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white/50 border border-dashed border-border rounded-3xl animate-fade-in flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground">No records found</h3>
                <p className="text-muted-foreground mt-1">Try refining your search terms</p>
              </div>
            )}
          </div>
        </section>

        {/* FAB */}
        <Button
          onClick={() => navigate(`/students/add?alumni=${showAlumni}`)}
          className="fixed bottom-8 right-8 w-16 h-16 rounded-2xl shadow-soft-lg bg-primary hover:bg-primary/90 hover:scale-[1.1] active:scale-[0.9] transition-all z-50 group"
          size="icon"
        >
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
        </Button>
      </main>

      <StudentProfileSheet
        student={selectedStudent}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onUpdate={fetchStudents}
      />
    </div>
  );
};

export default Students;
