import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users, UserCheck, ShieldCheck, GraduationCap, ClipboardCheck, CheckSquare, SlidersHorizontal, RefreshCw, Download } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { StudentListItem } from '@/components/StudentListItem';
import { StudentProfileSheet } from '@/components/StudentProfileSheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { getStudents, getCategories, updateCategory, Karyakarta, getTasks, addTask, getAllStudentResults } from '@/lib/store';
import { Student, Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { CreateYuvakTaskDialog } from '@/components/CreateYuvakTaskDialog';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';

const KaryakartaDashboard = () => {
  const navigate = useNavigate();
  const { adminName, adminRole } = useAuth();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Karyakarta[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [showYuvakDialog, setShowYuvakDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [selectedInterest, setSelectedInterest] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Profile Drawer State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);



  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const fetchData = async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const [studentsData, categoriesData, tasksData] = await Promise.all([
          getStudents(),
          getCategories(),
          getTasks()
        ]);
        setStudents(studentsData || []);
        setCategories(categoriesData || []);
        setTasks(tasksData || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    fetchData(true);

    const interval = setInterval(() => {
      fetchData(false);
    }, 5000); // Polling every 5 seconds for real-time updates

    return () => clearInterval(interval);
  }, [refetchTrigger]);

  const handleRefetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  const handleCreateTask = async (newTask: Task) => {
    try {
      const savedTask = await addTask(newTask);
      if (savedTask) {
        setTasks(prev => [savedTask, ...prev]);
        toast.success("Task created successfully!");
      }
      return savedTask;
    } catch (e) {
      toast.error("Failed to save task to database");
      throw e;
    }
  };

  // 1. Find the logged-in Karyakarta's category
  const myCategory = useMemo(() => {
    return categories.find(
      c => c.name.trim().toLowerCase() === adminName.trim().toLowerCase()
    );
  }, [categories, adminName]);

  // 2. Find all Sub-Karyakartas if the logged-in user is a Main Karyakarta
  const mySubKaryakartas = useMemo(() => {
    if (!myCategory || myCategory.type !== 'main') return [];
    return categories.filter(c => c.parentId === myCategory.id);
  }, [categories, myCategory]);

  // 3. Gather student IDs based on selection options
  const filteredStudentIds = useMemo(() => {
    if (!myCategory) return [];

    // Main Karyakarta filters
    if (myCategory.type === 'main') {
      if (selectedFilter === 'direct') {
        return myCategory.studentIds || [];
      } else if (selectedFilter.startsWith('sub_')) {
        const subId = selectedFilter.replace('sub_', '');
        const subCat = mySubKaryakartas.find(s => s.id === subId);
        return subCat ? (subCat.studentIds || []) : [];
      } else {
        // 'all' - Union of direct students and all sub-karyakarta students
        const ids = new Set<string>(myCategory.studentIds || []);
        mySubKaryakartas.forEach(sub => {
          (sub.studentIds || []).forEach(id => ids.add(id));
        });
        return Array.from(ids);
      }
    }

    // Sub-Karyakarta is simple: they only have their assigned direct students
    return myCategory.studentIds || [];
  }, [myCategory, selectedFilter, mySubKaryakartas]);

  // 4. Retrieve Student objects from the IDs list (excluding Alumni)
  const assignedStudents = useMemo(() => {
    return students.filter(s => filteredStudentIds.includes(s.id) && !s.isAlumni);
  }, [students, filteredStudentIds]);

  // 5. Apply sub-karyakarta studying year or alumni filters if selected
  const roleFilteredStudents = useMemo(() => {
    if (!myCategory || myCategory.type !== 'sub') return assignedStudents;

    // Sub-Karyakarta specific selection filters
    if (selectedFilter === 'alumni') {
      return assignedStudents.filter(s => s.isAlumni);
    } else if (selectedFilter === 'year_1') {
      return assignedStudents.filter(s => !s.isAlumni && (s.year?.includes('1') || s.year?.toLowerCase().includes('first')));
    } else if (selectedFilter === 'year_2') {
      return assignedStudents.filter(s => !s.isAlumni && (s.year?.includes('2') || s.year?.toLowerCase().includes('second')));
    } else if (selectedFilter === 'year_3') {
      return assignedStudents.filter(s => !s.isAlumni && (s.year?.includes('3') || s.year?.toLowerCase().includes('third')));
    } else if (selectedFilter === 'year_4') {
      return assignedStudents.filter(s => !s.isAlumni && (s.year?.includes('4') || s.year?.toLowerCase().includes('fourth')));
    }
    return assignedStudents;
  }, [assignedStudents, myCategory, selectedFilter]);

  // 6. Apply search, college, and interest filters
  const finalStudentsList = useMemo(() => {
    return roleFilteredStudents.filter(student => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || (
        student.name?.toLowerCase().includes(query) ||
        student.roomNo?.includes(query) ||
        student.mobile?.includes(query) ||
        student.email?.toLowerCase().includes(query)
      );

      const matchesCollege = selectedCollege === 'all' || student.college === selectedCollege;

      const matchesInterest = selectedInterest === 'all' || (
        student.interest && student.interest.toLowerCase().split(',').map(i => i.trim()).includes(selectedInterest.toLowerCase())
      );

      return matchesSearch && matchesCollege && matchesInterest;
    }).sort((a, b) => {
      const roomA = a.roomNo || '';
      const roomB = b.roomNo || '';
      return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [roleFilteredStudents, searchQuery, selectedCollege, selectedInterest]);

  const uniqueColleges = useMemo(() => {
    const colleges = roleFilteredStudents
      .map(s => s.college)
      .filter((c): c is string => !!c && c.trim() !== "");
    return Array.from(new Set(colleges)).sort();
  }, [roleFilteredStudents]);

  const uniqueInterests = useMemo(() => {
    const interestsSet = new Set<string>();
    roleFilteredStudents.forEach(s => {
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
  }, [roleFilteredStudents]);

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
      
      finalStudentsList.forEach(student => {
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
      toast.success("Academic report downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export results");
    } finally {
      setExporting(false);
    }
  };



  // Summary counts for Quick Stats Cards
  const stats = useMemo(() => {
    if (!myCategory) return { total: 0, direct: 0 };
    
    // Direct assigned students (all for Sub, direct-only for Main)
    const directCount = (myCategory.studentIds || []).filter(id => {
      const s = students.find(x => x.id === id);
      return s && !s.isAlumni;
    }).length;
    
    // Total assigned (including all sub-karyakarta students if Main)
    let totalIds = new Set<string>();
    (myCategory.studentIds || []).forEach(id => {
      const s = students.find(x => x.id === id);
      if (s && !s.isAlumni) totalIds.add(id);
    });
    
    if (myCategory.type === 'main') {
      mySubKaryakartas.forEach(sub => {
        (sub.studentIds || []).forEach(id => {
          const s = students.find(x => x.id === id);
          if (s && !s.isAlumni) totalIds.add(id);
        });
      });
    }
    
    return {
      total: totalIds.size,
      direct: directCount
    };
  }, [myCategory, mySubKaryakartas, students]);

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <AppHeader title="Hari-Saurabh Hostel" />

      <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Welcome Greeting Banner */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-primary text-white p-6 sm:p-8 rounded-3xl shadow-soft-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 backdrop-blur-md">
              {adminRole === 'Karyakarta' ? 'Main Karyakarta' : 'Sub-Karyakarta'} Side
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Jay Swaminarayan, {adminName}!
            </h2>
            <p className="text-white/80 font-medium text-sm sm:text-base">
              Manage, track and register Yuvaks assigned under your care.
            </p>
          </div>
          
          <Button
            onClick={() => navigate('/students/add?alumni=false')}
            className="bg-white hover:bg-slate-50 text-blue-700 h-12 px-6 rounded-2xl font-bold flex items-center gap-2 self-start md:self-auto shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5 text-blue-700" />
            Add Yuvak
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Loading Dashboard...</p>
          </div>
        ) : !myCategory ? (
          <div className="text-center py-12 bg-white/50 border border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-3">
            <ShieldCheck className="w-12 h-12 text-destructive mb-2" />
            <h3 className="text-xl font-bold text-foreground">Category Record Not Found</h3>
            <p className="text-muted-foreground max-w-md">
              Please contact the Administrator. Your name <strong>"{adminName}"</strong> needs to be registered in the Karyakarta Categories list to load your group's Yuvaks.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-soft border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Yuvaks</p>
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-foreground">{stats.total}</p>
              </div>

              {myCategory.type === 'main' && (
                <div className="bg-white p-5 rounded-2xl shadow-soft border border-border/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Direct Yuvaks</p>
                    <UserCheck className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-foreground">{stats.direct}</p>
                </div>
              )}
            </div>

            {/* Search & Selection Filter Options */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Search Yuvak input */}
              <div className="relative w-full md:flex-1 max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                <Input
                  placeholder="Search by name, room, mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-11 bg-white border-border rounded-xl focus:ring-primary/20 focus:border-primary transition-all text-sm w-full shadow-soft"
                />
              </div>

              {/* Selection Dropdown filter & Toggle Filter button */}
              <div className="flex w-full md:w-auto items-center gap-3">
                {myCategory.type === 'main' ? (
                  <div className="w-full md:w-auto">
                    <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                      <SelectTrigger className="w-full md:w-64 h-12 rounded-xl border-border bg-white shadow-soft font-semibold">
                        <SelectValue placeholder="Filter Yuvaks..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-border rounded-xl">
                        <SelectItem value="all">All Assigned Yuvaks ({stats.total})</SelectItem>
                        {mySubKaryakartas.map(sub => (
                          <SelectItem key={sub.id} value={`sub_${sub.id}`}>
                            {sub.name}'s Group ({sub.studentIds?.length || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="w-full md:w-auto">
                    <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                      <SelectTrigger className="w-full md:w-64 h-12 rounded-xl border-border bg-white shadow-soft font-semibold">
                        <SelectValue placeholder="Filter by Year..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-border rounded-xl">
                        <SelectItem value="all">All Assigned Yuvaks ({stats.total})</SelectItem>
                        <SelectItem value="year_1">1st Year</SelectItem>
                        <SelectItem value="year_2">2nd Year</SelectItem>
                        <SelectItem value="year_3">3rd Year</SelectItem>
                        <SelectItem value="year_4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "h-12 px-4 rounded-xl border-border bg-white shadow-soft font-semibold gap-2 transition-all duration-200 shrink-0",
                    showFilters && "border-primary bg-primary/5 text-primary"
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
            </div>

            {/* Collapsible Filters Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-muted/10 p-4 rounded-2xl border border-border/20 animate-slide-down">
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
                    <div className="h-11 flex items-center justify-center text-[10px] font-black uppercase tracking-wider text-muted-foreground/40 w-full select-none">
                      No Active Filters
                    </div>
                  )}
                </div>

                {/* Download Button */}
                <div className="col-span-1 flex items-end">
                  <Button
                    onClick={handleExportResults}
                    disabled={exporting}
                    className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 w-full shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 disabled:opacity-50 transition-all"
                  >
                    {exporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Results</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Student Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {finalStudentsList.length > 0 ? (
                finalStudentsList.map((student, index) => (
                  <div
                    key={student.id}
                    className="animate-slide-in"
                    style={{ animationDelay: `${index * 30}ms` }}
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
                <div className="text-center py-20 bg-white/50 border border-dashed border-border rounded-3xl animate-fade-in flex flex-col items-center justify-center gap-3 col-span-full">
                  <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">No Yuvaks found</h3>
                    <p className="text-muted-foreground mt-1">
                      No Yuvak records match your query or filter.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Profile Details Sheet */}
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
        onClick={() => {
          setShowTypeSelection(true);
        }}
      >
        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
      </Button>

      {/* Type Selection Dialog */}
      <Dialog open={showTypeSelection} onOpenChange={setShowTypeSelection}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-6 border-none bg-white">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-black text-foreground">Choose Task Type</DialogTitle>
            <DialogDescription>
              Select what kind of task you want to create.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 pt-4">
            <Button 
              onClick={() => {
                setShowTypeSelection(false);
                setShowYuvakDialog(true);
              }}
              className="h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 bg-primary text-white hover:bg-primary/95 text-base font-black shadow-md border-none"
            >
              <Users className="w-6 h-6" />
              Log Yuvak Meet
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setShowTypeSelection(false);
                setShowCreateDialog(true);
              }}
              className="h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:bg-muted text-base font-black border border-border/60 text-foreground"
            >
              <CheckSquare className="w-6 h-6 text-primary" />
              Assign Other Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTaskCreate={handleCreateTask}
      />

      {/* Create Yuvak Task Dialog */}
      <CreateYuvakTaskDialog
        open={showYuvakDialog}
        onOpenChange={setShowYuvakDialog}
        onTaskCreate={handleCreateTask}
        tasks={tasks}
      />

    </div>
  );
};

export default KaryakartaDashboard;
