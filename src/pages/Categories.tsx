import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Loader2, Plus, UserCircle2, Trash2, Edit, ArrowLeft, UserPlus, UserMinus, Check, Filter, Clock, Calendar } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Task } from '@/types';
import { useConfirm } from '@/contexts/ConfirmationContext';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronsUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { getStudents, getCategories, addCategory, deleteCategory, updateCategory, getTasks, Karyakarta } from '@/lib/store';
import { Student } from '@/types';
import { toast } from 'sonner';

const Categories = () => {
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [karyakartas, setKaryakartas] = useState<Karyakarta[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Overview State
  const [selectedMainStudent, setSelectedMainStudent] = useState<Student | null>(null);
  const [openMainSearch, setOpenMainSearch] = useState(false);

  const [selectedSubStudent, setSelectedSubStudent] = useState<Student | null>(null);
  const [openSubSearch, setOpenSubSearch] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  // Edit State
  const [editingKaryakarta, setEditingKaryakarta] = useState<Karyakarta | null>(null);
  const [editName, setEditName] = useState("");

  // Detail View State
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
  const [selectedKaryakartaForDetail, setSelectedKaryakartaForDetail] = useState<Karyakarta | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedStudentsToAdd, setSelectedStudentsToAdd] = useState<Student[]>([]);
  const [openStudentSearch, setOpenStudentSearch] = useState(false);
  const [selectedRoomRange, setSelectedRoomRange] = useState<{ label: string, rooms: number[] } | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Dynamic Room Ranges
  const generatedRanges = useMemo(() => {
    const normalRooms = students
      .map(s => parseInt(s.roomNo || ''))
      .filter(r => !isNaN(r) && r % 1000 !== 0);
    const x000Rooms = students
      .map(s => parseInt(s.roomNo || ''))
      .filter(r => !isNaN(r) && r % 1000 === 0 && r > 0);

    const rangeMap = new Map<string, number[]>();
    normalRooms.forEach(r => {
      const floor = Math.floor(r / 100);
      const numberOnFloor = r % 100;

      if (numberOnFloor === 0) return;

      const chunkIndex = Math.floor((numberOnFloor - 1) / 9);

      const expectedMin = floor * 100 + (chunkIndex * 9) + 1;
      const expectedMax = floor * 100 + (chunkIndex * 9) + 9;
      const label = `${expectedMin}-${expectedMax}`;

      if (!rangeMap.has(label)) {
        rangeMap.set(label, []);
      }
      if (!rangeMap.get(label)!.includes(r)) {
        rangeMap.get(label)!.push(r);
      }
    });

    const ranges = Array.from(rangeMap.entries())
      .sort(([labelA], [labelB]) => {
        const minA = parseInt(labelA.split('-')[0]);
        const minB = parseInt(labelB.split('-')[0]);
        return minA - minB;
      })
      .map(([label, rooms]) => ({ label, rooms }));

    const x000Unique = [...new Set(x000Rooms)].sort((a, b) => a - b);
    if (x000Unique.length > 0) {
      ranges.push({
        label: x000Unique.join(', '),
        rooms: x000Unique
      });
    }

    return ranges;
  }, [students]);

  const filteredStudentsForSearch = useMemo(() => {
    return students.filter(student => {
      if (!selectedRoomRange) return true;
      const room = parseInt(student.roomNo || '');
      if (isNaN(room)) return false;

      if (selectedRoomRange.label.includes('-')) {
        const [min, max] = selectedRoomRange.label.split('-').map(Number);
        return room >= min && room <= max;
      } else {
        return selectedRoomRange.rooms.includes(room);
      }
    });
  }, [students, selectedRoomRange]);

  // Fetch Data on mount and setup polling
  useEffect(() => {
    const fetchData = async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const [studentsData, categoriesData, tasksData] = await Promise.all([
          getStudents(),
          getCategories(),
          getTasks()
        ]);
        setStudents((studentsData || []).filter(s => !s.isAlumni));
        setKaryakartas(categoriesData || []);
        setTasks(tasksData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
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

  // Synchronize view mode with URL search parameters and background updates
  useEffect(() => {
    const karyakartaId = searchParams.get('karyakarta');
    if (karyakartaId && karyakartas.length > 0) {
      const match = karyakartas.find(k => k.id === karyakartaId);
      if (match) {
        setSelectedKaryakartaForDetail(match);
        setViewMode('detail');
      } else {
        setSearchParams({});
      }
    } else if (!karyakartaId) {
      setViewMode('overview');
      setSelectedKaryakartaForDetail(null);
    }
  }, [searchParams, karyakartas]);

  const handleAddMain = async () => {
    if (!selectedMainStudent) {
      toast.error("Please select a student");
      return;
    }

    const newKaryakarta: Karyakarta = {
      id: crypto.randomUUID(),
      name: selectedMainStudent.name,
      studentIds: [],
      type: 'main'
    };

    try {
      const saved = await addCategory(newKaryakarta);
      if (saved) {
        setKaryakartas([...karyakartas, saved]);
        setSelectedMainStudent(null);
        toast.success(`${selectedMainStudent.name} added as Karyakarta!`);
      }
    } catch (error) {
      toast.error('Failed to add Karyakarta');
    }
  };

  const handleAddSub = async () => {
    if (!selectedParentId) {
      toast.error("Please select a Main Karyakarta first");
      return;
    }
    if (!selectedSubStudent) {
      toast.error("Please select a student");
      return;
    }

    const newKaryakarta: Karyakarta = {
      id: crypto.randomUUID(),
      name: selectedSubStudent.name,
      studentIds: [],
      type: 'sub',
      parentId: selectedParentId
    };

    try {
      const saved = await addCategory(newKaryakarta);
      if (saved) {
        setKaryakartas([...karyakartas, saved]);
        setSelectedSubStudent(null);
        toast.success(`${selectedSubStudent.name} added as Sub-Karyakarta!`);
      }
    } catch (error) {
      toast.error('Failed to add Sub-Karyakarta');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const hasSubs = karyakartas.some(k => k.parentId === id);
    if (hasSubs) {
      const isConfirmed = await confirm({
        title: "Delete Karyakarta?",
        message: "This Karyakarta has Sub-Karyakartas. Deleting it will also delete them. Continue?",
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "destructive"
      });
      if (!isConfirmed) return;
    } else {
      const isConfirmed = await confirm({
        title: "Delete Karyakarta?",
        message: "Are you sure you want to delete this Karyakarta?",
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "destructive"
      });
      if (!isConfirmed) return;
    }

    try {
      await deleteCategory(id);
      setKaryakartas(karyakartas.filter(k => k.id !== id && k.parentId !== id));
      toast.success('Karyakarta deleted successfully');
    } catch (error) {
      toast.error('Failed to delete Karyakarta');
    }
  };

  const openEdit = (karyakarta: Karyakarta, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingKaryakarta(karyakarta);
    setEditName(karyakarta.name);
  };

  const handleSaveEdit = async () => {
    if (!editingKaryakarta || !editName.trim()) return;

    try {
      await updateCategory(editingKaryakarta.id, { name: editName });
      setKaryakartas(karyakartas.map(k => k.id === editingKaryakarta.id ? { ...k, name: editName } : k));

      if (selectedKaryakartaForDetail?.id === editingKaryakarta.id) {
        setSelectedKaryakartaForDetail({ ...selectedKaryakartaForDetail, name: editName });
      }

      setEditingKaryakarta(null);
      toast.success('Karyakarta updated successfully');
    } catch (error) {
      toast.error('Failed to update Karyakarta');
    }
  };

  // Assigning students to a Karyakarta
  const handleAssignStudent = async () => {
    if (!selectedKaryakartaForDetail) return;

    const studentsToAdd = selectedRoomRange ? filteredStudentsForSearch : selectedStudentsToAdd;
    if (studentsToAdd.length === 0) return;

    const updatedStudentIds = [...(selectedKaryakartaForDetail.studentIds || [])];
    let addedCount = 0;

    for (const student of studentsToAdd) {
      if (!updatedStudentIds.includes(student.id)) {
        updatedStudentIds.push(student.id);
        addedCount++;
      }
    }

    if (addedCount === 0) {
      toast.error('Selected students are already assigned to this Karyakarta');
      return;
    }

    try {
      await updateCategory(selectedKaryakartaForDetail.id, { studentIds: updatedStudentIds });
      const updatedKaryakarta = { ...selectedKaryakartaForDetail, studentIds: updatedStudentIds };
      setKaryakartas(karyakartas.map(k => k.id === updatedKaryakarta.id ? updatedKaryakarta : k));
      setSelectedKaryakartaForDetail(updatedKaryakarta);
      setSelectedStudentsToAdd([]);
      setOpenStudentSearch(false);
      toast.success(`${addedCount} student(s) assigned successfully!`);
    } catch (e) {
      toast.error('Failed to assign students');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedKaryakartaForDetail) return;

    const updatedStudentIds = (selectedKaryakartaForDetail.studentIds || []).filter(id => id !== studentId);

    try {
      await updateCategory(selectedKaryakartaForDetail.id, { studentIds: updatedStudentIds });
      const updatedKaryakarta = { ...selectedKaryakartaForDetail, studentIds: updatedStudentIds };
      setKaryakartas(karyakartas.map(k => k.id === updatedKaryakarta.id ? updatedKaryakarta : k));
      setSelectedKaryakartaForDetail(updatedKaryakarta);
      toast.success('Yuvak removed from Karyakarta');
    } catch (e) {
      toast.error('Failed to remove Yuvak');
    }
  };

  const openDetailView = (karyakarta: Karyakarta) => {
    setSelectedStudentsToAdd([]);
    setSelectedRoomRange(null);
    setSearchParams({ karyakarta: karyakarta.id });
  };

  const mainKaryakartas = karyakartas.filter(k => k.type === 'main');

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <AppHeader title="Hari-Saurabh Hostel" />

      <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : viewMode === 'overview' ? (
          <>
            {/* Overview Section */}
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                Karyakartas
              </h2>
              <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs pl-1 mt-1">
                Manage your team Yuvaks
              </p>
            </div>

            <div className="space-y-10">
              {/* Forms Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Add Main Karyakarta Form */}
                <div className="bg-white p-6 rounded-3xl shadow-soft border border-border/50 space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <UserCircle2 className="w-5 h-5 text-primary" />
                    Add Main Karyakarta
                  </h3>
                  <p className="text-xs text-muted-foreground">Select a Yuvak to designate as a lead Karyakarta.</p>
                  <Popover open={openMainSearch} onOpenChange={setOpenMainSearch}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openMainSearch}
                        className="w-full justify-between h-14 text-base rounded-xl font-normal"
                      >
                        <span className="truncate">
                          {selectedMainStudent ? selectedMainStudent.name : "Search Yuvak..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search Yuvak by name..." />
                        <CommandList>
                          <CommandEmpty>No Yuvak found.</CommandEmpty>
                          <CommandGroup>
                            {students.map((student) => (
                              <CommandItem
                                key={student.id}
                                value={student.name}
                                onSelect={() => {
                                  setSelectedMainStudent(student);
                                  setOpenMainSearch(false);
                                }}
                                className="cursor-pointer py-3"
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                    {student.name.charAt(0)}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-medium text-base truncate">{student.name}</span>
                                    <span className="text-xs text-muted-foreground truncate">Room: {student.roomNo || 'N/A'}</span>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Button onClick={handleAddMain} className="w-full h-14 rounded-xl text-md font-bold gap-2">
                    <Plus className="w-5 h-5" />
                    Add Karyakarta
                  </Button>
                </div>

                {/* Add Sub-Karyakarta Form */}
                <div className="bg-white p-6 rounded-3xl shadow-soft border border-border/50 space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Add Sub-Karyakarta
                  </h3>
                  <p className="text-xs text-muted-foreground">Assign a Yuvak under an existing Karyakarta.</p>

                  <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                    <SelectTrigger className="w-full h-14 text-base rounded-xl font-normal bg-gray-50/50">
                      <SelectValue placeholder="Select Main Karyakarta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mainKaryakartas.map(k => (
                        <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                      ))}
                      {mainKaryakartas.length === 0 && (
                        <SelectItem value="none" disabled>No main karyakartas added yet</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  <Popover open={openSubSearch} onOpenChange={setOpenSubSearch}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openSubSearch}
                        className="w-full justify-between h-14 text-base rounded-xl font-normal"
                        disabled={!selectedParentId || selectedParentId === 'none'}
                      >
                        <span className="truncate">
                          {selectedSubStudent ? selectedSubStudent.name : "Search Yuvak..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search Yuvak by name..." />
                        <CommandList>
                          <CommandEmpty>No Yuvak found.</CommandEmpty>
                          <CommandGroup>
                            {students.map((student) => (
                              <CommandItem
                                key={student.id}
                                value={student.name}
                                onSelect={() => {
                                  setSelectedSubStudent(student);
                                  setOpenSubSearch(false);
                                }}
                                className="cursor-pointer py-3"
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                    {student.name.charAt(0)}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-medium text-base truncate">{student.name}</span>
                                    <span className="text-xs text-muted-foreground truncate">Room: {student.roomNo || 'N/A'}</span>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Button onClick={handleAddSub} className="w-full h-14 rounded-xl text-md font-bold gap-2" variant="secondary" disabled={!selectedParentId || selectedParentId === 'none'}>
                    <Plus className="w-5 h-5" />
                    Add Sub-Karyakarta
                  </Button>
                </div>

              </div>

              {/* Display Hierarchy Below */}
              {mainKaryakartas.length > 0 && (
                <div className="space-y-6">
                  <h3 className="font-bold text-2xl text-foreground mt-8 mb-4 border-b pb-2">Karyakartas</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {mainKaryakartas.map((main) => {
                      const subs = karyakartas.filter(k => k.parentId === main.id);

                      return (
                        <div
                          key={main.id}
                          className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden relative group/main cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => openDetailView(main)}
                        >
                          {/* Main Karyakarta Header */}
                          <div className="p-6 bg-gray-50/50 flex items-center justify-between border-b border-border/50">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <UserCircle2 className="w-7 h-7" />
                              </div>
                              <div>
                                <h4 className="text-xl font-bold text-foreground group-hover/main:text-primary transition-colors">{main.name}</h4>
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                                  Main Karyakarta • {main.studentIds?.length || 0} Yuvaks
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white hover:text-primary" onClick={(e) => openEdit(main, e)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-red-50 hover:text-destructive" onClick={(e) => handleDelete(main.id, e)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Sub Karyakartas List */}
                          <div className="p-0">
                            {subs.length === 0 ? (
                              <div className="p-6 text-center text-sm text-muted-foreground italic">
                                No Sub-Karyakartas assigned yet.
                              </div>
                            ) : (
                              <div className="divide-y divide-border/50">
                                {subs.map(sub => (
                                  <div
                                    key={sub.id}
                                    className="p-4 pl-8 flex items-center justify-between hover:bg-gray-50 transition-colors group/sub cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDetailView(sub);
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 rounded-full bg-primary/40" />
                                      <div>
                                        <h5 className="font-bold text-foreground group-hover/sub:text-primary transition-colors">{sub.name}</h5>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                          Sub Karyakarta • {sub.studentIds?.length || 0} Yuvaks
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={(e) => openEdit(sub, e)}>
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-red-50" onClick={(e) => handleDelete(sub.id, e)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {mainKaryakartas.length === 0 && (
                <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-3xl mt-10">
                  <p>No Karyakartas added yet.</p>
                </div>
              )}
            </div>
          </>
        ) : (() => {
          const assignedIds = selectedKaryakartaForDetail?.studentIds || [];
          const assignedStudents = students.filter(s => assignedIds.includes(s.id));
          
          const nameLower = (selectedKaryakartaForDetail?.name || '').trim().toLowerCase();
          const karyakartaTasks = tasks.filter(task => {
            const isCreatedBy = task.createdBy && task.createdBy.trim().toLowerCase() === nameLower;
            const taskStudentIds = (task.assignedTo || '').split(',').map(id => id.trim());
            const isAssignedToTheirYuvak = taskStudentIds.some(id => assignedIds.includes(id));
            return isCreatedBy || isAssignedToTheirYuvak;
          });

          const totalMeetings = karyakartaTasks.filter(t => t.category === 'Yuvak' && t.status === 'done').length;
          const pendingMeetings = karyakartaTasks.filter(t => t.category === 'Yuvak' && t.status === 'pending').length;

          const yuvakMeetData = assignedStudents.map(student => {
            const meetCount = tasks.filter(t => 
              t.category === 'Yuvak' && 
              t.status === 'done' && 
              t.assignedTo && 
              t.assignedTo.split(',').map(id => id.trim()).includes(student.id)
            ).length;
            
            return {
              name: student.name,
              shortName: student.name.split(' ')[0],
              meets: meetCount
            };
          });

          return (
            /* Detail View Section */
            <div className="space-y-6 animate-fade-in">
              {/* Header / Back Button */}
              <div className="flex items-center gap-4 border-b border-border/50 pb-6">
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => setSearchParams({})}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                    {selectedKaryakartaForDetail?.name}
                  </h2>
                  <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs mt-1">
                    Assign Yuvak to this {selectedKaryakartaForDetail?.type === 'main' ? 'Main' : 'Sub'} Karyakarta
                  </p>
                </div>
              </div>

              {/* Report Dashboard Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl shadow-soft border border-border/50 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-foreground">{assignedStudents.length}</p>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Yuvaks</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-soft border border-border/50 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-emerald-600">{totalMeetings}</p>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Meetings Done</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-soft border border-border/50 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-amber-600">{pendingMeetings}</p>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Meetings</p>
                  </div>
                </div>
              </div>

              {/* Graph / Chart */}
              {assignedStudents.length > 0 && (
                <div className="bg-white p-6 rounded-3xl shadow-soft border border-border/50 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Yuvak Meeting Frequency</h3>
                    <p className="text-xs text-muted-foreground">Number of times this Karyakarta has met each Yuvak</p>
                  </div>
                  <div className="h-[250px] w-full pt-4">
                    {totalMeetings === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                        <Calendar className="w-10 h-10 text-muted-foreground/40 mb-2" />
                        <p className="text-sm font-medium">No completed meetings logged yet.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yuvakMeetData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="meetGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="shortName" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#111827' }}
                          />
                          <Bar dataKey="meets" fill="url(#meetGradient)" radius={[8, 8, 0, 0]} name="Meets Count" maxBarSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              )}

              {/* Assign Student Form */}
              <div className="bg-white p-6 rounded-3xl shadow-soft border border-border/50 flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:flex-1 space-y-2">
                  <label className="text-sm font-semibold text-foreground/80 ml-1">Search Yuvak to Assign</label>
                  <Popover open={openStudentSearch} onOpenChange={setOpenStudentSearch}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openStudentSearch}
                        className="w-full justify-between h-14 text-base rounded-xl font-normal"
                      >
                        <span className="truncate">
                          {selectedStudentsToAdd.length > 0
                            ? `${selectedStudentsToAdd.length} Yuvak(s) selected`
                            : "Search from all Yuvaks..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] sm:w-[500px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search Yuvak by name..." />
                        <CommandList>
                          <CommandEmpty>No Yuvak found.</CommandEmpty>
                          <CommandGroup>
                            {filteredStudentsForSearch.map((student) => {
                              const isSelected = selectedStudentsToAdd.some(s => s.id === student.id);
                              return (
                                <CommandItem
                                  key={student.id}
                                  value={student.name}
                                  onSelect={() => {
                                    setSelectedStudentsToAdd(prev => {
                                      if (prev.some(s => s.id === student.id)) {
                                        return prev.filter(s => s.id !== student.id);
                                      } else {
                                        return [...prev, student];
                                      }
                                    });
                                  }}
                                  className={`cursor-pointer py-3 ${isSelected ? 'bg-primary/5' : ''}`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                                        {student.name.charAt(0)}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-medium text-base truncate">{student.name}</span>
                                        <span className="text-xs text-muted-foreground truncate">Room: {student.roomNo || 'N/A'}</span>
                                      </div>
                                    </div>
                                    {isSelected && <Check className="w-5 h-5 text-primary shrink-0 ml-3" />}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  {selectedKaryakartaForDetail?.type === 'main' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`h-14 px-4 rounded-xl font-bold ${selectedRoomRange ? 'bg-primary/10 text-primary border-primary' : ''}`}>
                          <Filter className="w-5 h-5 mr-2" />
                          {selectedRoomRange ? selectedRoomRange.label : 'Filter Range'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-0" align="end">
                        <Command>
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => { setSelectedRoomRange(null); setOpenStudentSearch(false); }}
                                className="cursor-pointer font-medium"
                              >
                                All Rooms
                              </CommandItem>
                              {generatedRanges.map(range => (
                                <CommandItem
                                  key={range.label}
                                  onSelect={() => { setSelectedRoomRange(range); setOpenStudentSearch(false); }}
                                  className="cursor-pointer"
                                >
                                  {range.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}

                  <Button
                    onClick={handleAssignStudent}
                    className="h-14 px-8 rounded-xl text-md font-bold gap-2"
                    disabled={selectedRoomRange ? filteredStudentsForSearch.length === 0 : selectedStudentsToAdd.length === 0}
                  >
                    <UserPlus className="w-5 h-5" />
                    {selectedRoomRange
                      ? `Add ${filteredStudentsForSearch.length} Filtered Yuvaks`
                      : `Add Yuvak${selectedStudentsToAdd.length > 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>

              {/* List of Assigned Yuvaks */}
              <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
                <div className="p-6 border-b border-border/50 bg-gray-50/50">
                  <h3 className="font-bold text-lg text-foreground">Currently Assigned Yuvaks</h3>
                </div>
                <div className="p-0 divide-y divide-border/50">
                  {assignedStudents.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground italic">
                      No Yuvaks are currently assigned to this Karyakarta.
                    </div>
                  ) : (
                    assignedStudents.map(student => {
                      const meetCount = tasks.filter(t => 
                        t.category === 'Yuvak' && 
                        t.status === 'done' && 
                        t.assignedTo && 
                        t.assignedTo.split(',').map(id => id.trim()).includes(student.id)
                      ).length;

                      return (
                        <div key={student.id} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <h5 className="font-bold text-foreground text-sm flex items-center gap-2">
                                {student.name}
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full">
                                  Met: {meetCount} times
                                </span>
                              </h5>
                              <p className="text-xs text-muted-foreground font-medium">Room: {student.roomNo || 'N/A'} • Mobile: {student.mobile || 'N/A'}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-red-50 text-muted-foreground" onClick={() => handleRemoveStudent(student.id)}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          );
        })()}

        {/* Edit Dialog */}
        <Dialog open={!!editingKaryakarta} onOpenChange={(open) => !open && setEditingKaryakarta(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Karyakarta Name"
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingKaryakarta(null)} className="rounded-xl h-12">Cancel</Button>
              <Button onClick={handleSaveEdit} className="rounded-xl h-12">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
};

export default Categories;
