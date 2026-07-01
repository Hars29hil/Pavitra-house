import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useBlocker, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, Save, Calendar as CalendarIcon, X, User, Loader2, Copy, BookOpen, Award } from 'lucide-react';
import { format } from "date-fns";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from "@/components/ui/calendar";
import { ScrollDatePicker } from '@/components/ui/scroll-date-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import { getStudents, addStudent, updateStudent, upsertStudents, getCategories, updateCategory, deleteStudent } from '@/lib/store';
import { Student } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { BulkUpdate } from '@/components/BulkUpdate';
import { uploadToImgBB } from '@/lib/imgbb';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/contexts/ConfirmationContext';

import { Switch } from '@/components/ui/switch';

// Hook for blocking navigation
function useUnsavedChanges(isDirty: boolean) {
  const { confirm } = useConfirm();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname
  );
  const isConfirmingRef = useRef(false);

  useEffect(() => {
    if (blocker.state === "blocked" && !isConfirmingRef.current) {
      isConfirmingRef.current = true;
      confirm({
        title: "Unsaved Changes",
        message: "Changes save nathi thaya. Bahar javu che?",
        confirmText: "Leave",
        cancelText: "Stay"
      }).then((proceed) => {
        if (proceed) {
          blocker.proceed();
        } else {
          isConfirmingRef.current = false;
          blocker.reset();
        }
      });
    }
  }, [blocker, confirm]);
}

const normalizeCollegeName = (name: string): string => {
  const clean = name.trim().toLowerCase();
  if (clean === 'gcet') return 'G H Patel Information & Technology';
  if (clean === 'semcom') return 'SEMCOM';
  if (clean === 'mbit') return 'MBIT';
  if (clean === 'bvm') return 'BVM';
  if (clean === 'bjvm') return 'BJVM Commerce College';
  if (clean === 'charusat') return 'CHARUSAT';
  if (clean === 'nvpas') return 'NVPAS';
  if (clean === 'spec') return 'SPEC';
  if (clean === 'cisst') return 'CISST';
  if (clean === 'dr. v. h. dave' || clean === 'dr v h dave' || clean === 'dave') return 'Dr. V. H. Dave';
  
  const matched = [
    "G H Patel Information & Technology",
    "SEMCOM",
    "MBIT",
    "BVM",
    "BJVM Commerce College",
    "CHARUSAT",
    "NVPAS",
    "SPEC",
    "CISST",
    "Dr. V. H. Dave",
    "Anand Institute of Social Work",
    "P. G. Department of Computer Science"
  ].find(s => s.toLowerCase() === clean);
  return matched || name;
};

const AddStudent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { adminRole, adminName } = useAuth();
  const isEditing = !!id;
  const [searchParams] = useSearchParams();
  const isAlumniParam = searchParams.get('alumni') === 'true';

  const [formData, setFormData] = useState({
    roomNo: '',
    name: '',
    age: '',
    dob: '',
    mobile: '',
    email: '',
    degree: '',
    year: '',
    result: '',
    interest: '',
    profileImage: '',
    job: '',
    college: '',
    isAlumni: isAlumniParam,
    linkedin: '',
    socialLink: '',
    designation: '',
    jobPlace: '',
    livingPlace: '',
    notifications_enabled: false,
  });

  const [isWorking, setIsWorking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  const collegeSuggestions = useMemo(() => {
    const predefined = [
      "G H Patel Information & Technology",
      "SEMCOM",
      "MBIT",
      "BVM",
      "BJVM Commerce College",
      "CHARUSAT",
      "NVPAS",
      "SPEC",
      "CISST",
      "Dr. V. H. Dave",
      "Anand Institute of Social Work",
      "P. G. Department of Computer Science"
    ];
    const dbColleges = allStudents.map(s => s.college).filter((c): c is string => !!c && c.trim() !== "");
    const combined = Array.from(new Set([...predefined, ...dbColleges]));
    return combined.sort();
  }, [allStudents]);

  // 1. Recover History (Prevent random back swipes)
  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  // 2. Browser Level Warning (Refresh/Close Tab)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // 3. App Level Warning (React Router)
  useUnsavedChanges(isDirty);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const data = await getStudents();
        setAllStudents(data);

        if (isEditing && id) {
          const student = data.find(s => s.id === id);
          if (student) {
            setFormData({
              roomNo: student.roomNo || '',
              name: student.name || '',
              age: student.age?.toString() || '',
              dob: student.dob || '',
              mobile: student.mobile || '',
              email: student.email || '',
              degree: student.degree || '',
              year: student.year || '',
              result: student.result || '',
              interest: student.interest || '',
              profileImage: student.profileImage || '',
              job: student.job || '',
              college: student.college || '',
              isAlumni: Boolean(student.isAlumni),
              linkedin: student.linkedin || '',
              socialLink: student.socialLink || '',
              designation: student.designation || '',
              jobPlace: student.jobPlace || '',
              livingPlace: student.livingPlace || '',
              notifications_enabled: student.notifications_enabled !== undefined ? student.notifications_enabled : false,
            });
            const studentIsWorking = Boolean(student.job || student.designation || student.jobPlace);
            setIsWorking(studentIsWorking);
            // Reset dirty after loading initial data
            setIsDirty(false);
          } else {
            toast({ title: "Error", description: "Yuvak not found", variant: "destructive" });
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchAllData();
  }, [id, isEditing, navigate, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDirty(true);
    const { name, value } = e.target;
    if (name === 'year') {
      const numericVal = value.replace(/\D/g, '');
      setFormData(prev => ({
        ...prev,
        year: numericVal,
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCollegeBlur = () => {
    if (formData.college) {
      setFormData(prev => ({
        ...prev,
        college: normalizeCollegeName(prev.college)
      }));
    }
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size should be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadingImage(true);
      const url = await uploadToImgBB(file);
      setIsDirty(true);
      setFormData(prev => ({ ...prev, profileImage: url }));
      toast({
        title: "Upload Successful",
        description: "Image uploaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setIsDirty(true);
    setFormData(prev => ({ ...prev, profileImage: '' }));
  };

  const handleCopyRegisterLink = () => {
    const registerUrl = `${window.location.origin}/register?alumni=${formData.isAlumni}`;
    navigator.clipboard.writeText(registerUrl);
    toast({
      title: 'Link Copied',
      description: 'Registration form link copied to clipboard.',
      duration: 3000,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Room Occupancy Check
      const students = await getStudents();
      const roommates = students.filter(s => s.roomNo === formData.roomNo && s.id !== id && !s.isAlumni);
      
      const isLargeRoom = formData.roomNo && formData.roomNo.endsWith('000');
      const maxStudents = isLargeRoom ? 6 : 2;

      if (roommates.length >= maxStudents) {
        toast({
          title: "Validation Error",
          description: `Room ${formData.roomNo} already has ${maxStudents} Yuvaks.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        age: Number(formData.age),
        college: normalizeCollegeName(formData.college),
      };
      if (!formData.isAlumni && !isWorking) {
        payload.job = '';
        payload.designation = '';
        payload.jobPlace = '';
      }

      if (isEditing && id) {
        await updateStudent(id, payload);
        toast({
          title: 'Yuvak Updated',
          description: `${formData.name} has been updated successfully.`,
        });
        setIsDirty(false); // Important: Clear flag before nav
        navigate(-1); 
      } else {
        // New Student
        const newStudent = await addStudent(payload);

        // Auto-assign newly created student to active Karyakarta/Sub-Karyakarta
        if (adminRole === 'Karyakarta' || adminRole === 'Sub-Karyakarta') {
          try {
            const categoriesData = await getCategories();
            const myCat = categoriesData.find(
              c => c.name.trim().toLowerCase() === adminName.trim().toLowerCase()
            );
            if (myCat) {
              const updatedStudentIds = [...(myCat.studentIds || []), newStudent.id];
              await updateCategory(myCat.id, { studentIds: updatedStudentIds });
            }
          } catch (linkError) {
            console.error('Failed to auto-link Yuvak to Karyakarta:', linkError);
          }
        }

        toast({
          title: 'Registration Successful',
          description: `${formData.name} has been added to the system.`,
        });
        setIsDirty(false); // Important: Clear flag before nav
        navigate('/dashboard');
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: isEditing ? 'Error Updating Yuvak' : 'Error Saving Yuvak',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Enter name' },
    { name: 'age', label: 'Age', type: 'number', placeholder: '20' },
    { name: 'dob', label: 'Date of Birth', type: 'date', placeholder: '' },
    { name: 'mobile', label: 'Mobile Number', type: 'tel', placeholder: '+91 9876543210' },
    { name: 'email', label: 'Email Address', type: 'email', placeholder: 'email@example.com' },
    
    ...(!formData.isAlumni ? [
      { name: 'roomNo', label: 'Room Number', type: 'text', placeholder: 'e.g. 101' },
      { name: 'college', label: 'College', type: 'text', placeholder: 'e.g. SEMCOM College' },
      { name: 'degree', label: 'Degree', type: 'text', placeholder: 'e.g. BBA' },
      { name: 'year', label: 'Year', type: 'text', placeholder: 'e.g. 2nd Year' },
      { name: 'result', label: 'Result/CGPA', type: 'text', placeholder: 'e.g. 8.5' },
      { name: 'isWorkingToggle', label: 'Doing Job?', type: 'toggle', placeholder: '' },
    ] : [
      { name: 'college', label: 'College Name', type: 'text', placeholder: 'e.g. SEMCOM College' },
      { name: 'degree', label: 'Last or pursuing Degree Completed', type: 'text', placeholder: 'e.g. BBA' },
      { name: 'job', label: 'Company Name', type: 'text', placeholder: 'e.g. Google' },
      { name: 'designation', label: 'Designation', type: 'text', placeholder: 'e.g. Senior Developer' },
      { name: 'jobPlace', label: 'Job Place or City', type: 'text', placeholder: 'e.g. Bangalore' },
      { name: 'livingPlace', label: 'Living Place or City', type: 'text', placeholder: 'e.g. Anand' },
    ]),

    ...(!formData.isAlumni && isWorking ? [
      { name: 'job', label: 'Company Name', type: 'text', placeholder: 'e.g. Google' },
      { name: 'designation', label: 'Designation', type: 'text', placeholder: 'e.g. Senior Developer' },
      { name: 'jobPlace', label: 'Job Place or City', type: 'text', placeholder: 'e.g. Bangalore' },
    ] : []),

    { name: 'interest', label: 'Interests', type: 'text', placeholder: 'Sports, Music' },
    { name: 'linkedin', label: 'LinkedIn URL', type: 'text', placeholder: 'https://linkedin.com/in/username' },
    { name: 'socialLink', label: 'Social Media URL (Instagram, Facebook, X, etc.)', type: 'text', placeholder: 'https://instagram.com/username' },
    { name: 'notifications_enabled', label: 'Enable Notifications', type: 'notifications_toggle', placeholder: '' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border shadow-soft">
        <div className="flex items-center gap-4 h-16 px-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{isEditing ? 'Edit Yuvak Details' : (formData.isAlumni ? 'Register Alumni' : 'New Admission')}</h1>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-5xl mx-auto space-y-8 mt-4">
        {/* Banner to Copy Form Link for Self Registration */}
        {!isEditing && adminRole === 'admin' && (
          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-soft">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Self-Registration</h3>
              <p className="text-muted-foreground text-sm">Share this link with Yuvaks so they can fill out this form themselves.</p>
            </div>
            <Button
              type="button"
              onClick={handleCopyRegisterLink}
              variant="outline"
              className="h-12 px-6 bg-white hover:bg-primary/5 border-primary/20 hover:border-primary/50 text-primary rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 shadow-sm"
            >
              <Copy className="w-4 h-4" />
              Copy Form Link
            </Button>
          </div>
        )}

        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-primary" />
            {isEditing ? 'Update Information' : (formData.isAlumni ? 'New Alumni Registration' : 'New Admission')}
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Fill in the details below to proceed</p>
        </div>

        {/* Image Upload Section */}
        <div className="flex flex-col items-center justify-center mb-8 animate-fade-in">
          <div className="relative group">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-border group-hover:border-primary transition-colors shadow-soft">
              {formData.profileImage ? (
                <img src={formData.profileImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  {uploadingImage ? (
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  ) : (
                    <>
                      <User className="w-10 h-10" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-center px-4">({uploadingImage ? "Uploading..." : "Upload Photo"})</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <label className="absolute inset-0 cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
            </label>
            {formData.profileImage && (
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, profileImage: '' }))}
                className="absolute -top-2 -right-2 p-1.5 bg-destructive text-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Profile Picture</p>
        </div>


        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white border border-border/50 rounded-3xl shadow-soft p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 sm:gap-y-6">
            {fields
              .map((field, index) => (
                <div
                  key={field.name}
                  className="space-y-1 sm:space-y-2 animate-slide-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <Label htmlFor={field.name} className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">
                    {field.label}
                  </Label>
                  {field.name === 'dob' ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                             "w-full h-11 sm:h-12 justify-start text-left font-normal bg-background/50 border-border/50 rounded-xl text-xs sm:text-sm",
                            !formData[field.name as keyof typeof formData] && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData[field.name as keyof typeof formData] ? (
                            format(new Date(formData[field.name as keyof typeof formData] as string), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData[field.name as keyof typeof formData] ? new Date(formData[field.name as keyof typeof formData] as string) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const today = new Date();
                              let age = today.getFullYear() - date.getFullYear();
                              const monthDiff = today.getMonth() - date.getMonth();

                              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
                                age--;
                              }

                              setFormData(prev => ({
                                ...prev,
                                [field.name]: format(date, 'yyyy-MM-dd'),
                                age: age.toString()
                              }));
                            }
                          }}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  ) : field.type === 'toggle' ? (
                    <div className="flex items-center space-x-2 h-11 sm:h-12">
                      <Switch
                        id={field.name}
                        checked={isWorking}
                        onCheckedChange={(checked) => {
                          setIsDirty(true);
                          setIsWorking(checked);
                          if (!checked) {
                            setFormData(prev => ({
                              ...prev,
                              job: '',
                              designation: '',
                              jobPlace: '',
                            }));
                          }
                        }}
                      />
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {isWorking ? 'Yes' : 'No'}
                      </span>
                    </div>
                  ) : field.type === 'notifications_toggle' ? (
                    <div className="flex items-center space-x-2 h-11 sm:h-12">
                      <Switch
                        id={field.name}
                        checked={formData.notifications_enabled}
                        onCheckedChange={(checked) => {
                          setIsDirty(true);
                          setFormData(prev => ({ ...prev, notifications_enabled: checked }));
                        }}
                      />
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {formData.notifications_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[field.name as keyof typeof formData] as string}
                        onChange={handleChange}
                        onBlur={field.name === 'college' ? handleCollegeBlur : undefined}
                        list={field.name === 'college' ? 'college-suggestions' : undefined}
                        className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
                        required={!['job', 'designation', 'jobPlace', 'livingPlace', 'interest', 'profileImage', 'linkedin', 'socialLink', 'college', 'result', 'year'].includes(field.name)}
                      />
                      {field.name === 'college' && (
                        <datalist id="college-suggestions">
                          {collegeSuggestions.map(col => (
                            <option key={col} value={col} />
                          ))}
                        </datalist>
                      )}
                    </>
                  )}
                </div>
              ))}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-soft hover:shadow-soft-lg hover:scale-[1.01] active:scale-[0.99] transition-all bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {isEditing ? 'Save Changes' : 'Confirm Admission'}
          </Button>
        </form>

        {/* Bulk Add Section */}
        {
          !isEditing && adminRole === 'admin' && (
            <div className="mt-12 pt-8 border-t border-border/50">
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Bulk Registration</h3>
                <p className="text-muted-foreground text-sm">Upload multiple Yuvaks at once via Excel</p>
              </div>

              {/* If we have actual students, pass them to extract actual data. Otherwise pass dummy for template. */}
              <BulkUpdate
                students={allStudents.length > 0 ? allStudents : [{
                  id: 'TEMPLATE_ID',
                  name: 'John Doe',
                  roomNo: '101',
                  mobile: '9876543210',
                  email: 'john@example.com',
                  age: 20,
                  dob: '2000-01-01',
                  degree: 'B.Tech',
                  year: '2nd Year',
                  result: '8.5',
                  interest: 'Coding',
                  job: '',
                  college: 'XYZ University',
                  isAlumni: false,
                  createdAt: new Date().toISOString()
                }]}
                onUpdate={async (newStudents) => {
                  try {
                    toast({
                      title: "Updating database...",
                      description: "Please wait while the data is being updated.",
                    });

                    await upsertStudents(newStudents);
                    toast({
                      title: "Bulk Update Successful",
                      description: `Added/Updated ${newStudents.length} Yuvaks.`,
                    });
                    navigate('/dashboard');
                  } catch (e) {
                    toast({
                      title: "Error",
                      description: "Failed to process bulk upload.",
                      variant: "destructive"
                    });
                  }
                }}
              />
            </div>
          )
        }
      </main >
    </div >
  );
};

export default AddStudent;
