import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users, UserCheck, ShieldCheck, GraduationCap, ClipboardCheck } from 'lucide-react';
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
import { getStudents, getCategories, updateCategory, Karyakarta } from '@/lib/store';
import { Student } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const KaryakartaDashboard = () => {
  const navigate = useNavigate();
  const { adminName, adminRole } = useAuth();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Karyakarta[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  // Profile Drawer State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Add Yuvak Dialog State
  const [isAddYuvakOpen, setIsAddYuvakOpen] = useState(false);
  const [addYuvakSearchQuery, setAddYuvakSearchQuery] = useState('');
  const [selectedYuvakIds, setSelectedYuvakIds] = useState<string[]>([]);
  const [savingYuvaks, setSavingYuvaks] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsData, categoriesData] = await Promise.all([
        getStudents(),
        getCategories()
      ]);
      setStudents(studentsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
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

  // 4. Retrieve Student objects from the IDs list
  const assignedStudents = useMemo(() => {
    return students.filter(s => filteredStudentIds.includes(s.id));
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

  // 6. Apply search query filter
  const finalStudentsList = useMemo(() => {
    return roleFilteredStudents.filter(student => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      return (
        student.name?.toLowerCase().includes(query) ||
        student.roomNo?.includes(query) ||
        student.mobile?.includes(query) ||
        student.email?.toLowerCase().includes(query)
      );
    }).sort((a, b) => {
      const roomA = a.roomNo || '';
      const roomB = b.roomNo || '';
      return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [roleFilteredStudents, searchQuery]);

  // Available students who are NOT already assigned to this Karyakarta
  const availableStudents = useMemo(() => {
    if (!myCategory) return [];
    const assignedIds = myCategory.studentIds || [];
    return students.filter(s => !assignedIds.includes(s.id));
  }, [students, myCategory]);

  // Filtered available students based on search query in the dialog
  const filteredAvailableStudents = useMemo(() => {
    const query = addYuvakSearchQuery.trim().toLowerCase();
    if (!query) return availableStudents;
    return availableStudents.filter(s => 
      s.name?.toLowerCase().includes(query) ||
      (s.roomNo && s.roomNo.includes(query)) ||
      (s.mobile && s.mobile.includes(query))
    );
  }, [availableStudents, addYuvakSearchQuery]);

  const handleToggleSelectAll = () => {
    const allFilteredIds = filteredAvailableStudents.map(s => s.id);
    const areAllSelected = allFilteredIds.every(id => selectedYuvakIds.includes(id));
    
    if (areAllSelected) {
      // Deselect all filtered
      setSelectedYuvakIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      // Select all filtered
      setSelectedYuvakIds(prev => {
        const uniqueIds = new Set([...prev, ...allFilteredIds]);
        return Array.from(uniqueIds);
      });
    }
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredAvailableStudents.length === 0) return false;
    return filteredAvailableStudents.every(s => selectedYuvakIds.includes(s.id));
  }, [filteredAvailableStudents, selectedYuvakIds]);

  const handleAddSelectedYuvaks = async () => {
    if (selectedYuvakIds.length === 0 || !myCategory) return;
    
    setSavingYuvaks(true);
    try {
      const updatedStudentIds = [...(myCategory.studentIds || []), ...selectedYuvakIds];
      await updateCategory(myCategory.id, { studentIds: updatedStudentIds });
      
      toast.success(`${selectedYuvakIds.length} Yuvak(s) assigned successfully!`);
      
      // Update categories local state
      setCategories(prev =>
        prev.map(c => c.id === myCategory.id ? { ...c, studentIds: updatedStudentIds } : c)
      );
      
      // Reset dialog states
      setIsAddYuvakOpen(false);
      setSelectedYuvakIds([]);
      setAddYuvakSearchQuery('');
    } catch (error) {
      console.error('Failed to add Yuvaks:', error);
      toast.error('Failed to add Yuvaks. Please try again.');
    } finally {
      setSavingYuvaks(false);
    }
  };

  // Summary counts for Quick Stats Cards
  const stats = useMemo(() => {
    if (!myCategory) return { total: 0, direct: 0, current: 0, alumni: 0 };
    
    // Direct assigned students (all for Sub, direct-only for Main)
    const directCount = myCategory.studentIds?.length || 0;
    
    // Total assigned (including all sub-karyakarta students if Main)
    let totalIds = new Set<string>(myCategory.studentIds || []);
    if (myCategory.type === 'main') {
      mySubKaryakartas.forEach(sub => {
        (sub.studentIds || []).forEach(id => totalIds.add(id));
      });
    }
    
    const matchedStudents = students.filter(s => totalIds.has(s.id));
    const currentCount = matchedStudents.filter(s => !s.isAlumni).length;
    const alumniCount = matchedStudents.filter(s => s.isAlumni).length;

    return {
      total: totalIds.size,
      direct: directCount,
      current: currentCount,
      alumni: alumniCount
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
            onClick={() => {
              setSelectedYuvakIds([]);
              setAddYuvakSearchQuery('');
              setIsAddYuvakOpen(true);
            }}
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
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Direct</p>
                    <UserCheck className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-foreground">{stats.direct}</p>
                </div>
              )}

              <div className="bg-white p-5 rounded-2xl shadow-soft border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current</p>
                  <ClipboardCheck className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-foreground">{stats.current}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-soft border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Alumni</p>
                  <GraduationCap className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-foreground">{stats.alumni}</p>
              </div>
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

              {/* Selection Dropdown filter */}
              {myCategory.type === 'main' && (
                <div className="w-full md:w-auto">
                  <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                    <SelectTrigger className="w-full md:w-64 h-12 rounded-xl border-border bg-white shadow-soft font-semibold">
                      <SelectValue placeholder="Filter Yuvaks..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assigned Yuvaks ({stats.total})</SelectItem>
                      {mySubKaryakartas.map(sub => (
                        <SelectItem key={sub.id} value={`sub_${sub.id}`}>
                          {sub.name}'s Group ({sub.studentIds?.length || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

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
        onUpdate={fetchData}
      />

      {/* Add Yuvak Dialog */}
      <Dialog open={isAddYuvakOpen} onOpenChange={setIsAddYuvakOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground">Add Yuvaks to My Group</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Select existing Yuvaks from the hostel database to assign to your group.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar inside dialog */}
          <div className="relative my-4 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search Yuvak by name, room or mobile..."
              value={addYuvakSearchQuery}
              onChange={(e) => setAddYuvakSearchQuery(e.target.value)}
              className="pl-9 h-11 border-border rounded-xl focus:ring-primary/20 focus:border-primary text-sm shadow-sm"
            />
          </div>

          {/* Selection Stats and Select All */}
          {filteredAvailableStudents.length > 0 && (
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-yuvaks"
                  checked={isAllFilteredSelected}
                  onCheckedChange={handleToggleSelectAll}
                  className="rounded"
                />
                <label htmlFor="select-all-yuvaks" className="cursor-pointer hover:text-foreground">
                  Select All Filtered ({filteredAvailableStudents.length})
                </label>
              </div>
              <div>
                Selected: <span className="text-primary font-black">{selectedYuvakIds.length}</span>
              </div>
            </div>
          )}

          {/* Yuvaks List */}
          <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2 pr-1 min-h-[150px]">
            {filteredAvailableStudents.length > 0 ? (
              filteredAvailableStudents.map(student => {
                const isSelected = selectedYuvakIds.includes(student.id);
                return (
                  <div
                    key={student.id}
                    onClick={() => {
                      setSelectedYuvakIds(prev =>
                        isSelected ? prev.filter(id => id !== student.id) : [...prev, student.id]
                      );
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/5 border-primary/40 shadow-sm'
                        : 'border-border/40 hover:bg-slate-50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {}} // onClick handles selection
                      className="rounded"
                    />
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-sm truncate">{student.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Room: {student.roomNo || 'N/A'} • Mobile: {student.mobile || 'N/A'}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Users className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-sm font-semibold">No available Yuvaks found</p>
                <p className="text-xs max-w-xs mt-1">
                  All Yuvaks in the database are already assigned or don't match your search.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-between items-center border-t border-border/50 pt-4">
            <div className="text-xs text-muted-foreground self-start sm:self-center">
              Can't find them?{' '}
              <a
                href="/students/add"
                onClick={(e) => {
                  e.preventDefault();
                  setIsAddYuvakOpen(false);
                  navigate('/students/add');
                }}
                className="text-blue-600 hover:underline font-bold"
              >
                Create new Yuvak
              </a>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddYuvakOpen(false);
                  setSelectedYuvakIds([]);
                  setAddYuvakSearchQuery('');
                }}
                className="rounded-xl h-11 px-4"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSelectedYuvaks}
                disabled={selectedYuvakIds.length === 0 || savingYuvaks}
                className="rounded-xl h-11 px-6 font-bold"
              >
                {savingYuvaks ? 'Adding...' : `Add Selected (${selectedYuvakIds.length})`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KaryakartaDashboard;
