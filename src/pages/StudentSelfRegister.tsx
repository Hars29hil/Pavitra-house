import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, User, Loader2, Info, ArrowLeft, CheckCircle2, Award, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addStudent, getStudents } from '@/lib/store';
import { cn } from '@/lib/utils';
import { countryCodes } from '@/lib/countryCodes';
import api from '@/lib/api';
import { Switch } from '@/components/ui/switch';


const collegeSuggestions = [
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
  
  const matched = collegeSuggestions.find(s => s.toLowerCase() === clean);
  return matched || name;
};

const StudentSelfRegister = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const isAlumniParam = searchParams.get('alumni') === 'true';

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
    isAlumni: isAlumniParam,
    linkedin: '',
    socialLink: '',
    designation: '',
    jobPlace: '',
    livingPlace: '',
  });

  const [isWorking, setIsWorking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mobileError, setMobileError] = useState('');
  const [checkingMobile, setCheckingMobile] = useState(false);
  const [consent, setConsent] = useState(false);

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
          setMobileError(`Mobile number is already registered by ${res.data.student?.name || 'another Yuvak'}`);
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

  const handleCollegeBlur = () => {
    if (formData.college) {
      setFormData(prev => ({
        ...prev,
        college: normalizeCollegeName(prev.college)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast({
        title: "Consent Required",
        description: "You must consent to the directory policies to register.",
        variant: "destructive",
      });
      return;
    }
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
            description: `Room ${formData.roomNo} already has ${maxStudents} Yuvaks.`,
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

      const payload = {
        ...formData,
        mobile: formData.mobile.replace(/\D/g, ''),
        age: formData.age ? Number(formData.age) : undefined,
        countryCode: formData.countryCode,
        college: normalizeCollegeName(formData.college),
      };
      if (!formData.isAlumni && !isWorking) {
        payload.job = '';
        payload.designation = '';
        payload.jobPlace = '';
      }

      await addStudent(payload);

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

  const dynamicFields = [
    ...(!formData.isAlumni ? [
      { name: 'roomNo', label: 'Room Number *', type: 'text', placeholder: 'e.g. 101', required: true },
      { name: 'college', label: 'College *', type: 'text', placeholder: 'e.g. SEMCOM College', required: true },
      { name: 'degree', label: 'Degree *', type: 'text', placeholder: 'e.g. BBA', required: true },
      { name: 'year', label: 'Year *', type: 'text', placeholder: 'e.g. 2nd Year', required: true },
      { name: 'result', label: 'Result/CGPA', type: 'text', placeholder: 'e.g. 8.5', required: false },
      { name: 'isWorkingToggle', label: 'Doing Job?', type: 'toggle', placeholder: '', required: false },
    ] : [
      { name: 'college', label: 'College Name *', type: 'text', placeholder: 'e.g. SEMCOM College', required: true },
      { name: 'degree', label: 'Last or Pursuing Degree Completed *', type: 'text', placeholder: 'e.g. BBA', required: true },
      { name: 'job', label: 'Company Name', type: 'text', placeholder: 'e.g. Google', required: false },
      { name: 'designation', label: 'Designation', type: 'text', placeholder: 'e.g. Senior Developer', required: false },
      { name: 'jobPlace', label: 'Job Place or City', type: 'text', placeholder: 'e.g. Bangalore', required: false },
      { name: 'livingPlace', label: 'Living Place or City', type: 'text', placeholder: 'e.g. Anand', required: false },
    ]),

    ...(!formData.isAlumni && isWorking ? [
      { name: 'job', label: 'Company Name', type: 'text', placeholder: 'e.g. Google', required: false },
      { name: 'designation', label: 'Designation', type: 'text', placeholder: 'e.g. Senior Developer', required: false },
      { name: 'jobPlace', label: 'Job Place or City', type: 'text', placeholder: 'e.g. Bangalore', required: false },
    ] : []),

    { name: 'interest', label: 'Interests', type: 'text', placeholder: 'Sports, Music, Coding', required: false },
    { name: 'linkedin', label: 'LinkedIn URL', type: 'text', placeholder: 'https://linkedin.com/in/username', required: false },
    { name: 'socialLink', label: 'Social Media URL (Instagram, Facebook, etc.)', type: 'text', placeholder: 'https://instagram.com/username', required: false, fullWidth: true },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border shadow-soft">
        <div className="flex items-center justify-center h-16 px-4 max-w-3xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {formData.isAlumni ? 'Alumni Self-Registration' : 'Resident Yuvak Self-Registration'}
          </h1>
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
            {dynamicFields.map((field) => (
              <div
                key={field.name}
                className={cn(
                  "space-y-1 sm:space-y-2",
                  field.fullWidth && "md:col-span-2"
                )}
              >
                <Label htmlFor={field.name} className="text-xs sm:text-sm font-bold text-foreground/80 ml-1">
                  {field.label}
                </Label>
                {field.type === 'toggle' ? (
                  <div className="flex items-center space-x-2 h-11 sm:h-12">
                    <Switch
                      id={field.name}
                      checked={isWorking}
                      onCheckedChange={(checked) => {
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
                      required={field.required}
                      list={field.name === 'college' ? 'college-suggestions' : undefined}
                      className="h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium text-xs sm:text-sm"
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

          {/* Consent Checkbox */}
          <div className="flex items-start gap-3 bg-muted/30 border border-border/50 rounded-2xl p-4">
            <input
              id="consent-checkbox"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary focus:ring-primary border-border rounded cursor-pointer"
              required
            />
            <label htmlFor="consent-checkbox" className="text-xs font-medium text-muted-foreground leading-normal cursor-pointer">
              By checking this box, I consent to Pavitra Group / Hari-Saurabh Hostel collecting and storing my personal, academic, and professional details in the internal student/alumni directory. I understand my data is used solely for hostel tasks, administration, and alumni mentoring. Read our <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">Privacy Policy</a> and <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">Terms of Service</a>.
            </label>
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
        
        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground font-semibold">
          <span>&copy; {new Date().getFullYear()} Hari-Saurabh Hostel. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <span>&bull;</span>
            <a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default StudentSelfRegister;
