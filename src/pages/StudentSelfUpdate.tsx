import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Save, User, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getStudentByMobile, updateStudent } from '@/lib/store';
import { uploadToImgBB } from '@/lib/imgbb';

const StudentSelfUpdate = () => {
  const { mobile } = useParams<{ mobile: string }>();
  const { toast } = useToast();
  const [studentId, setStudentId] = useState<string | null>(null);
  
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
    linkedin: '',
    socialLink: '',
    isAlumni: false,
    designation: '',
    jobPlace: '',
    livingPlace: '',
  });

  const [initialData, setInitialData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const student = await getStudentByMobile(mobile);
        if (student) {
          setStudentId(student.id);
          const data = {
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
            linkedin: student.linkedin || '',
            socialLink: student.socialLink || '',
            isAlumni: Boolean(student.isAlumni),
            designation: student.designation || '',
            jobPlace: student.jobPlace || '',
            livingPlace: student.livingPlace || '',
          };
          setFormData(data);
          
          // Store which fields had data initially to disable them
          const initialDataMap: Record<string, string> = {};
          Object.entries(data).forEach(([key, val]) => {
            if (val && val.toString().trim() !== '') {
              initialDataMap[key] = val;
            }
          });
          setInitialData(initialDataMap);
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
        toast({
          title: "Error",
          description: "Could not load your details. Please check the URL.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentData();
  }, [mobile, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    setSaving(true);
    try {
      await updateStudent(studentId, {
        ...formData,
        age: formData.age ? Number(formData.age) : undefined,
      });
      toast({
        title: 'Update Successful',
        description: `Your details have been saved successfully!`,
      });
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Saving Details',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Enter name' },
    ...(!formData.isAlumni ? [{ name: 'roomNo', label: 'Room Number', type: 'text', placeholder: '101' }] : []),
    { name: 'mobile', label: 'Mobile Number', type: 'tel', placeholder: '+91 9876543210' },
    { name: 'email', label: 'Email Address', type: 'email', placeholder: 'email@example.com' },
    { name: 'dob', label: 'Date of Birth (YYYY-MM-DD)', type: 'date', placeholder: '' },
    { name: 'age', label: 'Age', type: 'number', placeholder: '20' },
    { 
      name: 'college', 
      label: formData.isAlumni ? 'Last College Completed' : 'College', 
      type: 'text', 
      placeholder: formData.isAlumni ? 'Enter last college completed' : 'XYZ University' 
    },
    { 
      name: 'degree', 
      label: formData.isAlumni ? 'Last Degree Completed *' : 'Degree *', 
      type: 'text', 
      placeholder: formData.isAlumni ? 'Enter last degree completed' : 'B.Tech' 
    },
    ...(!formData.isAlumni ? [
      { name: 'year', label: 'Year', type: 'number', placeholder: '2' },
      { name: 'result', label: 'Result/CGPA', type: 'text', placeholder: '8.5 CGPA' }
    ] : []),
    { name: 'interest', label: 'Interests', type: 'text', placeholder: 'Sports, Music' },
    { name: 'linkedin', label: 'LinkedIn URL', type: 'text', placeholder: 'https://linkedin.com/in/username' },
    { name: 'socialLink', label: 'Social Media URL (Instagram, Facebook, X, etc.)', type: 'text', placeholder: 'https://instagram.com/username' },
    ...(formData.isAlumni ? [
      { name: 'job', label: 'Current Job', type: 'text', placeholder: 'e.g. Software Engineer / Google' },
      { name: 'designation', label: 'Designation', type: 'text', placeholder: 'e.g. Senior Developer' },
      { name: 'jobPlace', label: 'Job Place', type: 'text', placeholder: 'e.g. Bangalore' },
      { name: 'livingPlace', label: 'Current Living Place', type: 'text', placeholder: 'e.g. Anand' }
    ] : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-white border border-border/50 rounded-3xl shadow-soft p-8 text-center max-w-md w-full">
          <Info className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Student Not Found</h2>
          <p className="text-muted-foreground">We could not find any records matching this mobile number.</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
        <div className="bg-white border border-border/50 rounded-3xl shadow-soft p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Save className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-muted-foreground">Your details have been updated successfully. You can now close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border shadow-soft">
        <div className="flex items-center justify-center h-16 px-4 max-w-3xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Update Your Details</h1>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-8 mt-4">
        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 text-sm text-accent-foreground font-medium">
          <p>Please review your details below and fill in any missing information. Fields that already have data cannot be edited.</p>
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
            {!initialData.profileImage && (
              <label className="absolute inset-0 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
            )}
          </div>
          <p className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Profile Picture</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white border border-border/50 rounded-3xl shadow-soft p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 sm:gap-y-6">
            {fields.map((field, index) => {
              const isDisabled = initialData[field.name] !== undefined;
              
              return (
                <div
                  key={field.name}
                  className="space-y-1 sm:space-y-2 animate-slide-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <Label htmlFor={field.name} className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">
                    {field.label} {isDisabled && <span className="text-[10px] text-muted-foreground ml-2 font-normal">(Read Only)</span>}
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    placeholder={isDisabled ? '' : field.placeholder}
                    value={formData[field.name as keyof typeof formData] as string}
                    onChange={handleChange}
                    disabled={isDisabled}
                    className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm disabled:opacity-80 disabled:bg-muted/50"
                  />
                </div>
              );
            })}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={saving || Object.keys(initialData).length === Object.keys(formData).length}
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-soft hover:shadow-soft-lg hover:scale-[1.01] active:scale-[0.99] transition-all bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Submit Details
          </Button>
        </form>
      </main>
    </div>
  );
};

export default StudentSelfUpdate;
