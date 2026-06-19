import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8 animate-fade-in">
      <div className="max-w-3xl mx-auto bg-white border border-border/50 rounded-3xl shadow-soft-lg p-6 md:p-10 relative overflow-hidden mt-6">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-primary/5 rounded-full blur-[80px] -z-1" />

        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="rounded-full hover:bg-primary/10 hover:text-primary transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-sm font-bold uppercase tracking-wider">Privacy Policy</span>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground mb-8">Last Updated: June 19, 2026</p>

        <div className="space-y-6 text-foreground/80 leading-relaxed text-sm">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Introduction</h2>
            <p>
              Welcome to the <strong>Pavitra Group / Hari-Saurabh Hostel</strong> Resident & Alumni Directory. We respect your privacy and are committed to protecting the personal data of our residents and alumni. This Privacy Policy explains how we collect, use, and store your personal information when you register or update your details in our directory.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Information We Collect</h2>
            <p>When you register or update your details using our self-registration or self-update forms, we collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Personal Identification:</strong> Full Name, Date of Birth, Age, Profile Picture.</li>
              <li><strong>Contact Information:</strong> Mobile Number, Email Address, Living Place.</li>
              <li><strong>Academic Details:</strong> College Name, Degree, Academic Year, CGPA/Results.</li>
              <li><strong>Professional Details (for Alumni/Working Residents):</strong> Company Name, Designation, Job Location.</li>
              <li><strong>Social Connections:</strong> LinkedIn URL, Social Media links (Instagram, Facebook, etc.), Interests.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. How We Use Your Information</h2>
            <p>The collected information is used solely for the following institutional and administrative purposes:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Maintaining an internal directory of resident students and alumni of Hari-Saurabh Hostel.</li>
              <li>Orchestrating resident student tasks, duties, and hostel assignments.</li>
              <li>Sending automated birthday wishes and greetings.</li>
              <li>Connecting current resident students with alumni for career guidance, mentoring, and networking.</li>
              <li>Facilitating hostel communication and administration.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Data Sharing & Security</h2>
            <p>
              Your data is strictly confidential. We do not sell, rent, trade, or share your personal information with third-party advertisers or external organizations. Access to the full directory database is restricted to authorized Administrators and Karyakartas of the Pavitra Group.
            </p>
            <p>
              We implement industry-standard security measures (SSL encryption, secure database hosting, and password hashing for admin accounts) to protect your personal data from unauthorized access, alteration, or disclosure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">5. Your Control and Rights</h2>
            <p>
              You have the right to review, update, or correct your personal directory information at any time. If you wish to delete your record entirely from our directory database, please contact the hostel administrator or send an email to our support team.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">6. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please reach out to the Hari-Saurabh Hostel Administration.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex justify-between items-center text-xs text-muted-foreground font-semibold">
          <span>&copy; {new Date().getFullYear()} Hari-Saurabh Hostel</span>
          <span>Pavitra Group</span>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
