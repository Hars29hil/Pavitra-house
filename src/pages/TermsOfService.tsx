import { ArrowLeft, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
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
            <Scale className="w-6 h-6" />
            <span className="text-sm font-bold uppercase tracking-wider">Terms of Service</span>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-foreground mb-4">Terms of Service</h1>
        <p className="text-xs text-muted-foreground mb-8">Last Updated: June 19, 2026</p>

        <div className="space-y-6 text-foreground/80 leading-relaxed text-sm">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing, submitting, or updating your information on the <strong>Pavitra Group / Hari-Saurabh Hostel</strong> Resident & Alumni Directory portal, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use this portal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Purpose of the Directory</h2>
            <p>
              This portal serves as an internal registry for current resident students and alumni of Hari-Saurabh Hostel, Anand. Its purpose is to facilitate internal organization management (task assignments, birthday celebrations, and resident coordination) and networking between current residents and alumni.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Accuracy of Submitted Data</h2>
            <p>
              By filling out the self-registration or self-update forms, you represent and warrant that all information provided (including your name, mobile number, email, date of birth, academic status, and employment) is accurate, truthful, and belongs to you. Falsification of information, impersonation of other individuals, or submitting malicious content is strictly prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Permissible Use & Prohibitions</h2>
            <p>
              Access to this directory is restricted to authorized personnel. Any attempt by unauthorized users to access, scraping, download, or distribute directory data is a violation of these terms. You agree not to use any contact details found in this directory for commercial solicitation, marketing, spamming, or harassment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">5. Administrative Rights</h2>
            <p>
              The Administrators of Hari-Saurabh Hostel / Pavitra Group reserve the right to review, edit, or delete any record submitted to the database if it is found to contain incorrect, offensive, inappropriate, or malicious details.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">6. Modifications to Terms</h2>
            <p>
              We reserve the right to update these terms at any time. Any changes will be posted on this page with an updated revision date. Your continued use of the portal after such changes constitutes acceptance of the new terms.
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

export default TermsOfService;
