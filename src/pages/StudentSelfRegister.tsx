import { useState, useEffect } from 'react';
import { Save, User, Loader2, Info, ArrowLeft, CheckCircle2, Award, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addStudent, getStudents } from '@/lib/store';
import { cn } from '@/lib/utils';
import { countryCodes } from '@/lib/countryCodes';


const StudentSelfRegister = () => {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    roomNo: '',
    name: '',
    age: '',
    dob: '',
    mobile: '',
    countryCode: '+91',
    email: '',
    degree: '',
    year: '',
    result: '',
    interest: '',
    profileImage: '',
    job: '',
    college: '',
    isAlumni: true,
    linkedin: '',
    socialLink: '',
    designation: '',
    jobPlace: '',
    livingPlace: '',
  });

  const [saving, setSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mobileError, setMobileError] = useState('');
  const [checkingMobile, setCheckingMobile] = useState(false);

  useEffect(() => {
    if (!formData.mobile || formData.mobile.length < 8) {
      setMobileError('');
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingMobile(true);
      try {
        const res = await api.get<{ registered: boolean; student?: { id: string; name: string } }>(
          `/api/students/check-mobile?mobile=${formData.mobile}`
        );
        if (res.data?.registered) {
          setMobileError(`Mobile number is already registered by ${res.data.student?.name || 'another student'}`);
        } else {
          setMobileError('');
        }
      } catch (err) {
        console.error('Error checking mobile registration:', err);
      } finally {
        setCheckingMobile(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.mobile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'mobile') {
      const cleaned = value.replace(/\D/g, '');
      setFormData(prev => ({
        ...prev,
        mobile: cleaned,
      }));
      return;
    }
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

      if (mobileError) {
        toast({
          title: "Validation Error",
          description: mobileError,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      await addStudent({
        ...formData,
        mobile: formData.mobile.replace(/\D/g, ''),
        age: formData.age ? Number(formData.age) : undefined,
        countryCode: formData.countryCode,
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

        {/* Default Profile Picture View (Static) */}
        <div className="flex flex-col items-center justify-center mb-8 animate-fade-in">
          <div className="relative">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-soft">
              <div className="w-full h-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center">
                {formData.name ? (
                  <span className="text-4xl sm:text-5xl font-extrabold text-primary">
                    {formData.name.trim().charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
                )}
              </div>
            </div>
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


            {/* Mobile Number */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="mobile" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Mobile Number *</Label>
              <div className="flex gap-2">
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
                  className="w-28 h-11 sm:h-12 px-3 bg-background/50 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm outline-none cursor-pointer"
                >
                  {countryCodes.map((c) => (
                    <option key={`${c.code}-${c.dial_code}`} value={c.dial_code}>
                      {c.dial_code} ({c.code}) - {c.name}
                    </option>
                  ))}
                </select>
                <Input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  placeholder="9876543210"
                  value={formData.mobile}
                  onChange={handleChange}
                  required
                  className={cn(
                    "flex-1 h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm",
                    mobileError && "border-destructive focus:border-destructive focus:ring-destructive/20"
                  )}
                />
              </div>
              {checkingMobile && (
                <p className="text-[11px] text-muted-foreground ml-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking registration status...
                </p>
              )}
              {mobileError && (
                <p className="text-[11px] text-destructive font-medium ml-1">
                  {mobileError}
                </p>
              )}
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
            {/* Degree * */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="degree" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">
                Last or pursuing Degree Completed *
              </Label>
              <Input
                id="degree"
                name="degree"
                type="text"
                placeholder="e.g. BBA"
                value={formData.degree}
                onChange={handleChange}
                required
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* College */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="college" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">
                College Name
              </Label>
              <Input
                id="college"
                name="college"
                type="text"
                placeholder="e.g. SEMCOM College"
                value={formData.college}
                onChange={handleChange}
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

            {/* Professional Details */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="job" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Company Name</Label>
              <Input
                id="job"
                name="job"
                type="text"
                placeholder="e.g. Google"
                value={formData.job}
                onChange={handleChange}
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="designation" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Designation</Label>
              <Input
                id="designation"
                name="designation"
                type="text"
                placeholder="e.g. Senior Developer"
                value={formData.designation}
                onChange={handleChange}
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="jobPlace" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Job Place or City</Label>
              <Input
                id="jobPlace"
                name="jobPlace"
                type="text"
                placeholder="e.g. Bangalore"
                value={formData.jobPlace}
                onChange={handleChange}
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="livingPlace" className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">Living Place or City</Label>
              <Input
                id="livingPlace"
                name="livingPlace"
                type="text"
                placeholder="e.g. Anand"
                value={formData.livingPlace}
                onChange={handleChange}
                className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
              />
            </div>

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
            disabled={saving}
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
