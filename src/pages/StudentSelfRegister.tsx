import { useState, useEffect } from 'react';
import { Save, User, Loader2, Info, ArrowLeft, CheckCircle2, Award, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addStudent, getStudents } from '@/lib/store';
import { uploadToImgBB } from '@/lib/imgbb';
import { cn } from '@/lib/utils';

const StudentSelfRegister = () => {
  const { toast } = useToast();
  
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
    isAlumni: false,
    linkedin: '',
    socialLink: '',
  });

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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
    setSaving(true);

    try {
      // Room Occupancy Check (Only for current students)
      if (!formData.isAlumni && formData.roomNo) {
        const students = await getStudents();
        const roommates = students.filter(s => s.roomNo === formData.roomNo && !s.isAlumni);
        
        const isLargeRoom = formData.roomNo.endsWith('000');
        const maxStudents = isLargeRoom ? 6 : 2;

        if (roommates.length >= maxStudents) {
          toast({
            title: "Validation Error",
            description: `Room ${formData.roomNo} already has ${maxStudents} students.`,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      await addStudent({
        ...formData,
        age: formData.age ? Number(formData.age) : undefined,
      });

      toast({
        title: 'Registration Successful',
        description: `Welcome! Your details have been submitted successfully.`,
      });
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Please try again later.';
      toast({
        title: 'Registration Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Automatically calculate age when DOB changes
  useEffect(() => {
    if (formData.dob) {
      const dobDate = new Date(formData.dob);
      if (!isNaN(dobDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
          age--;
        }
        setFormData(prev => ({ ...prev, age: age.toString() }));
      }
    }
  }, [formData.dob]);

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
        <div className="bg-white border border-border/50 rounded-3xl shadow-soft p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Registration Completed!</h2>
          <p className="text-muted-foreground mb-4">Your details have been saved successfully.</p>
          <p className="text-xs text-muted-foreground font-medium">You can now close this tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border shadow-soft">
        <div className="flex items-center justify-center h-16 px-4 max-w-3xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Student Self-Registration</h1>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-8 mt-4">
        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 text-sm text-accent-foreground font-medium">
          <p>Please enter your information to register yourself in the Pavitra House directory.</p>
        </div>

        {/* Profile Picture Upload */}
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
                      <span className="text-[10px] font-bold uppercase tracking-widest text-center px-4">Upload Photo</span>
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
                className="absolute -top-2 -right-2 p-1.5 bg-destructive text-white rounded-full shadow-md"
              >
                ✕
              </button>
            )}
          </div>
          <p className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Profile Picture</p>
        </div>

        {/* Alumni Status Toggle Card */}
        <div className="bg-white border border-border/50 rounded-3xl shadow-soft p-6 space-y-4">
          <Label className="text-sm font-bold text-foreground/80">Alumni Status</Label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isAlumni: false }))}
              className={cn(
                "h-16 rounded-2xl border flex items-center justify-center gap-3 font-bold text-sm transition-all",
                !formData.isAlumni
                  ? "bg-primary/10 border-primary text-primary shadow-sm"
                  : "bg-background border-border hover:border-foreground/20 text-muted-foreground"
              )}
            >
              <BookOpen className="w-5 h-5" />
              Current Student
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isAlumni: true }))}
              className={cn(
                "h-16 rounded-2xl border flex items-center justify-center gap-3 font-bold text-sm transition-all",
                formData.isAlumni
                  ? "bg-primary/10 border-primary text-primary shadow-sm"
                  : "bg-background border-border hover:border-foreground/20 text-muted-foreground"
              )}
            >
              <Award className="w-5 h-5" />
              Alumni
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white border border-border/50 rounded-3xl shadow-soft p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 sm:gap-y-6">
            {/* Full Name */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="name" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Full Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                required
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* Room Number */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="roomNo" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Room Number *</Label>
              <Input
                id="roomNo"
                name="roomNo"
                type="text"
                placeholder="101"
                value={formData.roomNo}
                onChange={handleChange}
                required
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* Mobile Number */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="mobile" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Mobile Number *</Label>
              <Input
                id="mobile"
                name="mobile"
                type="tel"
                placeholder="+91 9876543210"
                value={formData.mobile}
                onChange={handleChange}
                required
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="dob" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Date of Birth *</Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                required
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* Age */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="age" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Age *</Label>
              <Input
                id="age"
                name="age"
                type="number"
                placeholder="20"
                value={formData.age}
                onChange={handleChange}
                required
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* College */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="college" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">College</Label>
              <Input
                id="college"
                name="college"
                type="text"
                placeholder="XYZ University"
                value={formData.college}
                onChange={handleChange}
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* Degree */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="degree" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Degree *</Label>
              <Input
                id="degree"
                name="degree"
                type="text"
                placeholder="B.Tech"
                value={formData.degree}
                onChange={handleChange}
                required
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* If Current Student: Year and Result */}
            {!formData.isAlumni && (
              <>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="year" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Year</Label>
                  <Input
                    id="year"
                    name="year"
                    type="text"
                    placeholder="2nd Year"
                    value={formData.year}
                    onChange={handleChange}
                    className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="result" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Result/CGPA</Label>
                  <Input
                    id="result"
                    name="result"
                    type="text"
                    placeholder="8.5 CGPA"
                    value={formData.result}
                    onChange={handleChange}
                    className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
                  />
                </div>
              </>
            )}

            {/* If Alumni: Job / Work */}
            {formData.isAlumni && (
              <div className="space-y-1 sm:space-y-2 md:col-span-2">
                <Label htmlFor="job" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Job / Work (Company & Designation)</Label>
                <Input
                  id="job"
                  name="job"
                  type="text"
                  placeholder="Software Engineer @ Google"
                  value={formData.job}
                  onChange={handleChange}
                  className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
                />
              </div>
            )}

            {/* Interests */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="interest" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Interests</Label>
              <Input
                id="interest"
                name="interest"
                type="text"
                placeholder="Sports, Music, Coding"
                value={formData.interest}
                onChange={handleChange}
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* LinkedIn URL */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="linkedin" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">LinkedIn URL</Label>
              <Input
                id="linkedin"
                name="linkedin"
                type="text"
                placeholder="https://linkedin.com/in/username"
                value={formData.linkedin}
                onChange={handleChange}
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* Social Media URL */}
            <div className="space-y-1 sm:space-y-2 md:col-span-2">
              <Label htmlFor="socialLink" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Social Media URL (Instagram, Facebook, etc.)</Label>
              <Input
                id="socialLink"
                name="socialLink"
                type="text"
                placeholder="https://instagram.com/username"
                value={formData.socialLink}
                onChange={handleChange}
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={saving || uploadingImage}
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-soft hover:shadow-soft-lg hover:scale-[1.01] active:scale-[0.99] transition-all bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Register Details
          </Button>
        </form>
      </main>
    </div>
  );
};

export default StudentSelfRegister;
