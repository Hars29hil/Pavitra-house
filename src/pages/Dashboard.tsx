import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, SlidersHorizontal, RefreshCw, Download, LayoutDashboard, Clock, ArrowRight } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { StatCard } from '@/components/StatCard';
import { StudentListItem } from '@/components/StudentListItem';
import { StudentProfileSheet } from '@/components/StudentProfileSheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getStudents, getSetting, getAllStudentResults } from '@/lib/store';
import { Student } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import KaryakartaDashboard from './KaryakartaDashboard';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { addTask } from '@/lib/store';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Dashboard = () => {
  const { adminRole } = useAuth();
  
  if (adminRole === 'Karyakarta' || adminRole === 'Sub-Karyakarta') {
    return <KaryakartaDashboard />;
  }

  const navigate = useNavigate();
  const [showAlumni, setShowAlumni] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [tagsData, setTagsData] = useState<{ tags: any[], assignments: Record<string, string> }>({ tags: [], assignments: {} });
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [selectedInterest, setSelectedInterest] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Task state
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const fetchStudentsData = async () => {
      try {
        const data = await getStudents();
        setStudents(data || []);
        
        const tagsSetting = await getSetting('student_tags');
        if (tagsSetting) {
          try {
            setTagsData(JSON.parse(tagsSetting));
          } catch (e) {
            console.error('Error parsing student_tags setting:', e);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchStudentsData();

    const interval = setInterval(() => {
      fetchStudentsData();
    }, 5000); // Polling every 5 seconds for real-time updates

    return () => clearInterval(interval);
  }, [refetchTrigger]);

  const handleRefetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  const handleCreateTask = async (newTask: any) => {
    try {
      await addTask(newTask);
      toast.success("Task assigned successfully!");
    } catch (e) {
      toast.error("Failed to save task to database");
      throw e;
    }
  };

  const getStudentTags = (studentId: string) => {
    const val = tagsData.assignments[studentId];
    if (!val) return [];
    const ids = val.split(',').filter(Boolean);
    return ids
      .map(id => tagsData.tags.find(t => t.id === id))
      .filter((t): t is any => !!t);
  };

  const uniqueColleges = useMemo(() => {
    const colleges = students
      .map(s => s.college)
      .filter((c): c is string => !!c && c.trim() !== "");
    return Array.from(new Set(colleges)).sort();
  }, [students]);

  const uniqueInterests = useMemo(() => {
    const interestsSet = new Set<string>();
    students.forEach(s => {
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
  }, [students]);

  const handleExportResults = async () => {
    try {
      setExporting(true);
      toast.success("Preparing academic report...");
      
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
      toast.success("Report downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download results report");
    } finally {
      setExporting(false);
    }
  };

  // Filter students based on state
  const filteredStudents = students.filter(student => {
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
    <div className="min-h-screen pb-20 relative animate-fade-in">
      <AppHeader title="HSH" />

      <main className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Top Controls: Search, Toggle, Add */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search & Filter Button */}
          <div className="flex gap-2 w-full md:w-auto flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, room, mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-10 rounded-xl text-sm shadow-sm w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "h-11 px-4 rounded-xl border-border bg-white shadow-sm font-bold flex items-center gap-2 transition-all shrink-0",
                showFilters && "bg-primary/5 text-primary border-primary/20"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {((selectedCollege !== 'all' ? 1 : 0) + (selectedInterest !== 'all' ? 1 : 0)) > 0 && (
                <span className="flex items-center justify-center bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 font-black">
                  {(selectedCollege !== 'all' ? 1 : 0) + (selectedInterest !== 'all' ? 1 : 0)}
                </span>
              )}
            </Button>
          </div>

          {/* Toggle + Add */}
          <div className="flex w-full md:w-auto items-center gap-3">
            {/* Toggle */}
            <div className="flex flex-1 md:flex-none p-1 bg-gray-100 rounded-xl md:w-48">
              <button
                onClick={() => setShowAlumni(false)}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition",
                  !showAlumni
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-foreground"
                )}
              >
                Current
              </button>

              <button
                onClick={() => setShowAlumni(true)}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition",
                  showAlumni
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-foreground"
                )}
              >
                Alumni
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={() => navigate(`/students/add?alumni=${showAlumni}`)}
              className="h-11 px-4 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap shrink-0 hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Yuvak</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/10 p-4 rounded-2xl border border-border/20 animate-slide-down">
            {/* College Filter */}
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Filter by College</label>
              <Select value={selectedCollege} onValueChange={setSelectedCollege}>
                <SelectTrigger className="h-11 bg-white/70 backdrop-blur-md border border-border/50 rounded-xl shadow-sm font-medium text-sm">
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
                <SelectTrigger className="h-11 bg-white/70 backdrop-blur-md border border-border/50 rounded-xl shadow-sm font-medium text-sm">
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
                  className="h-11 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl w-full border border-dashed border-muted-foreground/30 hover:border-foreground/30"
                >
                  Clear Filters
                </Button>
              ) : (
                <div className="h-11" />
              )}
            </div>
            
            {/* Download Button */}
            <div className="col-span-1 flex items-end justify-end">
              <Button
                onClick={handleExportResults}
                disabled={exporting || filteredStudents.length === 0}
                className="w-full h-11 bg-gradient-to-r from-indigo-500 to-primary text-white rounded-xl shadow-sm hover:shadow-md font-bold flex items-center justify-center gap-2"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student, index) => (
              <div
                key={student.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <StudentListItem
                  student={student}
                  tags={getStudentTags(student.id)}
                  onClick={() => {
                    setSelectedStudent(student);
                    setIsProfileOpen(true);
                  }}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-12 col-span-full">
              <Search className="w-6 h-6 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No Yuvaks found</p>
            </div>
          )}
        </div>

      </main>

      <StudentProfileSheet
        student={selectedStudent}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onUpdate={handleRefetch}
      />

      {/* Floating Plus Task Button */}
      <Button
        className="fixed bottom-8 right-8 w-16 h-16 rounded-2xl shadow-soft-lg bg-primary hover:bg-primary/90 hover:scale-[1.1] active:scale-[0.9] transition-all z-50 group"
        size="icon"
        onClick={() => setShowCreateDialog(true)}
      >
        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
      </Button>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTaskCreate={handleCreateTask}
      />
    </div>
  );
};

export default Dashboard;
