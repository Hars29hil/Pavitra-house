import { useState, useEffect } from 'react';
import { Users, Loader2, Plus, UserCircle2, Trash2, Edit } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
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
import { getStudents, getCategories, addCategory, deleteCategory, updateCategory, Karyakarta } from '@/lib/store';
import { Student } from '@/types';
import { toast } from 'sonner';

const Categories = () => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [karyakartas, setKaryakartas] = useState<Karyakarta[]>([]);

  // State for Main Karyakarta form
  const [selectedMainStudent, setSelectedMainStudent] = useState<Student | null>(null);
  const [openMainSearch, setOpenMainSearch] = useState(false);

  // State for Sub-Karyakarta form
  const [selectedSubStudent, setSelectedSubStudent] = useState<Student | null>(null);
  const [openSubSearch, setOpenSubSearch] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  // Edit State
  const [editingKaryakarta, setEditingKaryakarta] = useState<Karyakarta | null>(null);
  const [editName, setEditName] = useState("");

  // Fetch Data on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [studentsData, categoriesData] = await Promise.all([
          getStudents(),
          getCategories()
        ]);
        setStudents(studentsData || []);
        setKaryakartas(categoriesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

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
        // We do NOT clear the selected parent id so they can quickly add multiple subs
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
      if (!confirm('This Karyakarta has Sub-Karyakartas. Deleting it will also delete them. Continue?')) return;
    } else {
      if (!confirm('Are you sure you want to delete this Karyakarta?')) return;
    }

    try {
      await deleteCategory(id);
      // Delete the karyakarta and any of its subs
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
      setEditingKaryakarta(null);
      toast.success('Karyakarta updated successfully');
    } catch (error) {
      toast.error('Failed to update Karyakarta');
    }
  };

  const mainKaryakartas = karyakartas.filter(k => k.type === 'main');

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <AppHeader title="Hari-Saurabh Hostel" />

      <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Karyakartas
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs pl-1 mt-1">
            Manage your team Yuvaks
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Forms Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Add Main Karyakarta Form */}
              <div className="bg-white p-6 rounded-3xl shadow-soft border border-border/50 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <UserCircle2 className="w-5 h-5 text-primary" />
                  Add Main Karyakarta
                </h3>
                <p className="text-xs text-muted-foreground">Select a student to designate as a lead Karyakarta.</p>
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
                      <CommandInput placeholder="Search student by name..." />
                      <CommandList>
                        <CommandEmpty>No student found.</CommandEmpty>
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
                      <CommandInput placeholder="Search student by name..." />
                      <CommandList>
                        <CommandEmpty>No student found.</CommandEmpty>
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
                      <div key={main.id} className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden relative group/main">
                        {/* Main Karyakarta Header */}
                        <div className="p-6 bg-gray-50/50 flex items-center justify-between border-b border-border/50">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                              <UserCircle2 className="w-7 h-7" />
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-foreground">{main.name}</h4>
                              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">Main Karyakarta</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
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
                                <div key={sub.id} className="p-4 pl-8 flex items-center justify-between hover:bg-gray-50 transition-colors group/sub">
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary/40" />
                                    <div>
                                      <h5 className="font-bold text-foreground">{sub.name}</h5>
                                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sub Karyakarta</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
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
        )}

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
