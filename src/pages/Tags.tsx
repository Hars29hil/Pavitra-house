import { useState, useEffect, useRef } from 'react';
import { Tag as TagIcon, Plus, Trash2, Search, ChevronsUpDown, Check, Loader2, UserMinus } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getStudents, getSetting, updateSetting } from '@/lib/store';
import { Student } from '@/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// HSL to HEX helper
const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

// HEX to HSL helper
const hexToHsl = (hex: string) => {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(c)) {
    return { h: 0, s: 100, l: 50 };
  }
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

// Canvas-based interactive Color Wheel component
const ColorWheel = ({ color, onChange }: { color: string; onChange: (color: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 160;
    const height = 160;
    const radius = width / 2;

    // Set CSS display dimensions
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Scale canvas coordinate space for Retina/High-DPI displays
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Scale drawing context
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Draw HSL color wheel using anti-aliased gradient slices
    for (let angle = 0; angle < 360; angle += 0.5) {
      const startAngle = ((angle - 0.5) * Math.PI) / 180;
      const endAngle = ((angle + 0.6) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
      grad.addColorStop(0, '#FFFFFF'); // Center is white
      grad.addColorStop(1, `hsl(${angle}, 100%, 50%)`); // Outer edge is fully saturated HSL

      ctx.fillStyle = grad;
      ctx.fill();
    }
  }, []);

  const handleColorSelect = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const radius = 80; // Bounding rect width is always 160 CSS pixels, so layout radius is 80
    const rx = x - radius;
    const ry = y - radius;
    const d = Math.sqrt(rx * rx + ry * ry);

    if (d <= radius) {
      let angle = Math.atan2(ry, rx) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      const sat = (d / radius) * 100;
      const hex = hslToHex(angle, sat, 50);
      onChange(hex);
    }
  };

  const hsl = hexToHsl(color);
  const angleRad = (hsl.h * Math.PI) / 180;
  const radius = 80;
  const distance = (hsl.s / 100) * radius;
  const cursorX = radius + distance * Math.cos(angleRad);
  const cursorY = radius + distance * Math.sin(angleRad);

  return (
    <div className="relative flex flex-col items-center select-none">
      <canvas
        ref={canvasRef}
        width={160}
        height={160}
        className="cursor-crosshair rounded-full border border-border/80 shadow-inner"
        onMouseDown={(e) => {
          setIsDragging(true);
          handleColorSelect(e);
        }}
        onMouseMove={(e) => {
          if (isDragging) handleColorSelect(e);
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={(e) => {
          setIsDragging(true);
          handleColorSelect(e);
        }}
        onTouchMove={(e) => {
          if (isDragging) handleColorSelect(e);
        }}
        onTouchEnd={() => setIsDragging(false)}
      />
      <div
        className="absolute w-4.5 h-4.5 border-2 border-white rounded-full shadow-md pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${cursorX}px`,
          top: `${cursorY}px`,
          backgroundColor: color,
        }}
      />
    </div>
  );
};

interface TagItem {
  id: string;
  name: string;
  color: string;
}

const Tags = () => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // Form states
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#EF4444');
  const [savingTag, setSavingTag] = useState(false);

  // Assignment states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [openStudentSearch, setOpenStudentSearch] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);

  // List Dialog states
  const [selectedTagForList, setSelectedTagForList] = useState<TagItem | null>(null);
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);

  const handleTagCardClick = (tag: TagItem) => {
    setSelectedTagForList(tag);
    setIsListDialogOpen(true);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const studentList = await getStudents();
        setStudents(studentList || []);

        const tagsSetting = await getSetting('student_tags');
        if (tagsSetting) {
          try {
            const parsed = JSON.parse(tagsSetting);
            setTags(parsed.tags || []);
            setAssignments(parsed.assignments || {});
          } catch (e) {
            console.error('Error parsing student_tags JSON:', e);
            // Default templates if corrupted
            setTags([]);
            setAssignments({});
          }
        }
      } catch (err) {
        console.error('Failed to load tag data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const saveTagsData = async (updatedTags: TagItem[], updatedAssignments: Record<string, string>) => {
    try {
      await updateSetting('student_tags', JSON.stringify({ tags: updatedTags, assignments: updatedAssignments }));
      return true;
    } catch (e) {
      console.error('Failed to save tags data to DB:', e);
      toast.error('Failed to save changes to database');
      return false;
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) {
      toast.error('Tag name cannot be empty');
      return;
    }

    setSavingTag(true);
    const newTag: TagItem = {
      id: `tag-${Date.now()}`,
      name: newTagName.trim(),
      color: selectedColor,
    };

    const updatedTags = [...tags, newTag];
    const success = await saveTagsData(updatedTags, assignments);

    if (success) {
      setTags(updatedTags);
      setNewTagName('');
      toast.success(`Tag "${newTag.name}" created successfully`);
    }
    setSavingTag(false);
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Are you sure you want to delete tag "${tagName}"? This will unassign it from all Yuvak.`)) {
      return;
    }

    const updatedTags = tags.filter(t => t.id !== tagId);

    // Clean up assignments using this tag
    const updatedAssignments = { ...assignments };
    Object.keys(updatedAssignments).forEach(studentId => {
      if (updatedAssignments[studentId] === tagId) {
        delete updatedAssignments[studentId];
      }
    });

    const success = await saveTagsData(updatedTags, updatedAssignments);
    if (success) {
      setTags(updatedTags);
      setAssignments(updatedAssignments);
      toast.success(`Tag "${tagName}" deleted successfully`);
    }
  };

  const getStudentTagIds = (studentId: string): string[] => {
    const val = assignments[studentId];
    if (!val) return [];
    return val.split(',').filter(Boolean);
  };

  const handleAssignTag = async (studentId: string, tagId: string | null) => {
    setSavingAssignment(true);
    const updatedAssignments = { ...assignments };

    if (tagId === null) {
      delete updatedAssignments[studentId];
    } else {
      const currentTags = updatedAssignments[studentId]
        ? updatedAssignments[studentId].split(',').filter(Boolean)
        : [];

      if (currentTags.includes(tagId)) {
        // Toggle off
        const nextTags = currentTags.filter(id => id !== tagId);
        if (nextTags.length === 0) {
          delete updatedAssignments[studentId];
        } else {
          updatedAssignments[studentId] = nextTags.join(',');
        }
      } else {
        // Toggle on
        currentTags.push(tagId);
        updatedAssignments[studentId] = currentTags.join(',');
      }
    }

    const success = await saveTagsData(tags, updatedAssignments);
    if (success) {
      setAssignments(updatedAssignments);
      toast.success(tagId === null ? 'All tags removed successfully' : 'Tag assignments updated');
    }
    setSavingAssignment(false);
  };

  const currentStudentTagIds = selectedStudent ? getStudentTagIds(selectedStudent.id) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Loading tag manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <AppHeader title="Hari-Saurabh Hostel" />

      <main className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <TagIcon className="w-8 h-8 text-primary" />
            TAG Section
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Create custom tags and assign them to hostel residents</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Tag Creator / list (Left side: 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Create Tag Form */}
            <div className="bg-white border border-border/50 rounded-3xl p-6 shadow-soft space-y-4">
              <h3 className="text-xl font-bold text-foreground">Create New Tag</h3>

              <form onSubmit={handleAddTag} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tagName">Tag Name</Label>
                  <Input
                    id="tagName"
                    placeholder="e.g. Volunteer"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="h-12 bg-background/50 border-border/50 rounded-xl"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Tag Color (Color Wheel)</Label>

                  {/* Interactive Color Wheel */}
                  <div className="flex justify-center py-2 bg-muted/20 border border-border/40 rounded-2xl p-4">
                    <ColorWheel color={selectedColor} onChange={setSelectedColor} />
                  </div>

                  <div className="flex gap-3 items-center">
                    <div
                      className="w-10 h-10 rounded-full border border-border shadow-sm shrink-0 transition-colors duration-200"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <Input
                      id="tagColor"
                      type="text"
                      placeholder="#EF4444"
                      value={selectedColor}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val && !val.startsWith('#') && val.length <= 7) {
                          val = '#' + val.replace(/#/g, '');
                        }
                        setSelectedColor(val);
                      }}
                      className="h-12 bg-background/50 border-border/50 rounded-xl font-mono uppercase"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={savingTag || !newTagName.trim()}
                  className="w-full h-12 rounded-xl font-bold mt-2"
                >
                  {savingTag ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 mr-1" />}
                  Create Tag
                </Button>
              </form>
            </div>

            {/* List of Tags */}
            <div className="bg-white border border-border/50 rounded-3xl p-6 shadow-soft space-y-4">
              <h3 className="text-xl font-bold text-foreground">All Tags ({tags.length})</h3>

              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-6">No custom tags created yet.</p>
              ) : (
                <div className="space-y-3">
                  {tags.map((tag) => {
                    const assignedCount = Object.values(assignments).filter(val => {
                      if (!val) return false;
                      return val.split(',').includes(tag.id);
                    }).length;

                    return (
                      <div
                        key={tag.id}
                        onClick={() => handleTagCardClick(tag)}
                        className="flex items-center justify-between p-3.5 bg-background border border-border/50 rounded-2xl group transition-all cursor-pointer hover:border-primary/45 hover:shadow-sm active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="font-bold text-foreground">{tag.name}</span>
                          <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-medium">
                            {assignedCount} assigned
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTag(tag.id, tag.name);
                          }}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tag Assigner (Right side: 7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-border/50 rounded-3xl p-6 shadow-soft space-y-6 h-full flex flex-col">
              <div>
                <h3 className="text-xl font-bold text-foreground">Assign Tag to Yuvak</h3>
                <p className="text-muted-foreground text-sm mt-1">Search for a resident and select which tag to apply.</p>
              </div>

              {/* Student Combobox Selector */}
              <div className="space-y-2">
                <Label>Select Yuvak</Label>
                <Popover open={openStudentSearch} onOpenChange={setOpenStudentSearch}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openStudentSearch}
                      className="w-full justify-between h-14 text-base rounded-xl font-medium"
                    >
                      <span className="truncate flex items-center gap-2">
                        <Search className="w-5 h-5 opacity-40 shrink-0" />
                        {selectedStudent ? selectedStudent.name : "Search Yuvak name or room..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] sm:w-[450px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search student name or room..." />
                      <CommandList>
                        <CommandEmpty>No student found.</CommandEmpty>
                        <CommandGroup>
                          {students.map((student) => {
                            const studentTagIds = assignments[student.id]
                              ? assignments[student.id].split(',').filter(Boolean)
                              : [];

                            return (
                              <CommandItem
                                key={student.id}
                                value={`${student.name} ${student.roomNo}`}
                                onSelect={() => {
                                  setSelectedStudent(student);
                                  setOpenStudentSearch(false);
                                }}
                                className="cursor-pointer py-3"
                              >
                                <div className="flex items-center justify-between w-full min-w-0">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                      {student.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-semibold text-foreground text-sm truncate">{student.name}</span>
                                      <span className="text-xs text-muted-foreground truncate">Room: {student.roomNo || 'N/A'}</span>
                                    </div>
                                  </div>
                                  {studentTagIds.length > 0 && (
                                    <div className="flex gap-1 shrink-0 flex-wrap max-w-[150px] justify-end">
                                      {studentTagIds.map(id => {
                                        const t = tags.find(tag => tag.id === id);
                                        if (!t) return null;
                                        return (
                                          <span
                                            key={id}
                                            className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider"
                                            style={{ backgroundColor: t.color }}
                                          >
                                            {t.name}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
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

              {/* Tag Selection Options */}
              {selectedStudent ? (
                <div className="flex-1 flex flex-col justify-between border-t border-border/50 pt-6 animate-fade-in space-y-6">
                  <div className="space-y-4">
                    {/* Selected Student Card */}
                    <div className="bg-background border border-border/50 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-lg text-foreground">{selectedStudent.name}</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">Room {selectedStudent.roomNo} • {selectedStudent.mobile}</p>
                      </div>
                      {currentStudentTagIds.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5">
                            {currentStudentTagIds.map(id => {
                              const t = tags.find(tag => tag.id === id);
                              if (!t) return null;
                              return (
                                <span
                                  key={id}
                                  className="w-3 h-3 rounded-full border border-white ring-1 ring-black/5 shrink-0"
                                  style={{ backgroundColor: t.color }}
                                />
                              );
                            })}
                          </div>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">
                            {currentStudentTagIds.length} Active {currentStudentTagIds.length === 1 ? 'Tag' : 'Tags'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Choose Tag to Apply</Label>
                      {tags.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Please create some tags in the left panel first.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {tags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              disabled={savingAssignment}
                              onClick={() => handleAssignTag(selectedStudent.id, tag.id)}
                              className={`p-4 border rounded-2xl flex items-center justify-between transition-all font-semibold text-sm ${currentStudentTagIds.includes(tag.id)
                                ? 'bg-primary/5 border-primary text-primary shadow-sm'
                                : 'bg-white border-border/60 text-foreground hover:border-foreground/20'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className="w-3.5 h-3.5 rounded-full"
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </div>
                              {currentStudentTagIds.includes(tag.id) && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clear Tag Button */}
                  {currentStudentTagIds.length > 0 && (
                    <Button
                      variant="outline"
                      type="button"
                      disabled={savingAssignment}
                      onClick={() => handleAssignTag(selectedStudent.id, null)}
                      className="w-full h-12 text-destructive border-destructive/20 hover:bg-destructive/5 hover:border-destructive rounded-xl font-bold flex items-center gap-2 mt-auto"
                    >
                      <UserMinus className="w-4 h-4" />
                      Remove All Tags From Resident
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-muted-foreground border border-dashed border-border/60 rounded-3xl bg-background/30">
                  <Search className="w-10 h-10 opacity-30 mb-2" />
                  <p className="font-semibold text-sm">Please select a student above to manage their tag assignments</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Dialog showing students assigned to a specific tag */}
      <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 border border-border/50">
          <DialogHeader className="space-y-2 pb-4 border-b border-border/40">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full shadow-inner shrink-0"
                style={{ backgroundColor: selectedTagForList?.color }}
              />
              <span className="truncate">{selectedTagForList?.name} Tag</span>
            </DialogTitle>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
              Assigned Hostel Residents
            </p>
          </DialogHeader>

          <div className="mt-4 max-h-[350px] overflow-y-auto pr-1 space-y-3">
            {selectedTagForList && students.filter(s => assignments[s.id]?.split(',').includes(selectedTagForList.id)).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <TagIcon className="w-8 h-8 opacity-20 mb-2" />
                <p className="font-semibold text-sm">No residents are assigned to this tag yet.</p>
              </div>
            ) : (
              students
                .filter(s => assignments[s.id]?.split(',').includes(selectedTagForList?.id || ''))
                .map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-background border border-border/50 rounded-2xl hover:border-border transition-all"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {student.name.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-foreground text-sm truncate">{student.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          Room {student.roomNo || 'N/A'} • {student.mobile || 'No Mobile'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAssignTag(student.id, selectedTagForList.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl px-2.5 h-8 font-semibold text-xs shrink-0 flex items-center gap-1.5"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Remove
                    </Button>
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tags;
