import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, CheckCircle2, ShieldAlert, Loader2, Send, Check, X, ArrowLeft } from 'lucide-react';
import { requestNotificationPermission, listenForMessages } from '@/lib/firebase';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface StudentData {
  id: string;
  name: string;
  mobile: string;
  email?: string;
}

export default function NotificationCheck() {
  const navigate = useNavigate();
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<StudentData | null>(null);
  
  // Steps: 'input' | 'enable' | 'test' | 'feedback' | 'completed'
  const [step, setStep] = useState<'input' | 'enable' | 'test' | 'feedback' | 'completed'>('input');
  
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [finalStatus, setFinalStatus] = useState<'received' | 'not_received' | null>(null);
  const [receivedInForeground, setReceivedInForeground] = useState(false);

  // Listen for foreground FCM messages
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupListener = async () => {
      const unsub = await listenForMessages((payload) => {
        console.log('Foreground FCM received in NotificationCheck:', payload);
        const title = payload?.notification?.title || 'Test Notification 🔔';
        const body = payload?.notification?.body || '';

        // 1. Trigger native notification banner if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body: body,
              icon: '/header-logo.png'
            });
          } catch (e) {
            console.error('Failed to show native foreground notification:', e);
          }
        }

        // 2. Play a subtle notification beep sound using Web Audio API
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5 note
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.15);
        } catch (e) {
          // ignore audio context failures (e.g. user interaction required)
        }

        // 3. Show a prominent toast
        toast.success(`🔔 ${title}`, {
          description: body,
          duration: 10000,
        });

        // 4. Mark as received and advance step
        setReceivedInForeground(true);
        setTestSent(true);
        setStep('feedback');
      });

      if (unsub) {
        unsubscribe = unsub;
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(`/api/students?action=check-mobile&mobile=${mobileNumber}`);
      if (res.data && res.data.registered && res.data.student) {
        setStudent(res.data.student);
        // Check browser notification permission status
        if ('Notification' in window && Notification.permission === 'granted') {
          setNotificationEnabled(true);
          setStep('test');
        } else {
          setStep('enable');
        }
      } else {
        toast.error('Mobile number not found in Hostel Hub database.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!student) return;
    setLoading(true);

    try {
      const token = await requestNotificationPermission(student.id, student.email || '');
      if (token) {
        setNotificationEnabled(true);
        toast.success('Notifications enabled successfully!');
        setStep('test');
      } else {
        toast.error('Could not enable notifications. Please grant permission in your browser.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error requesting notification permission.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!student) return;
    setLoading(true);

    try {
      const res = await api.post('/api/send_test_notification.php', {
        student_id: student.id,
        title: 'Test Notification 🔔',
        body: 'Awesome! Your push notifications are working perfectly.'
      });

      if (res.data && res.data.success) {
        setTestSent(true);
        toast.success('Test notification sent!');
        setStep('feedback');
      } else {
        toast.error(res.data.error || 'Failed to send test notification. Is the token registered?');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error sending test notification.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (received: boolean) => {
    if (!student) return;
    setLoading(true);
    const status = received ? 'received' : 'not_received';

    try {
      // Save status in the database using student update endpoint
      const res = await api.put(`/api/students/${student.id}`, {
        notificationStatus: status
      });

      if (res.data) {
        setFinalStatus(status);
        setStep('completed');
        if (received) {
          toast.success('Status updated: Working properly!');
        } else {
          toast.warning('Status updated: Not working. We will inspect this.');
        }
      } else {
        toast.error('Failed to update status in the database.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error saving status to database.');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setMobileNumber('');
    setStudent(null);
    setStep('input');
    setNotificationEnabled(false);
    setTestSent(false);
    setFinalStatus(null);
    setReceivedInForeground(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-primary/10 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-primary/10 rounded-full blur-[100px] -z-10" />

      <div className="w-full max-w-md animate-scale-in relative z-10">
        {/* Back navigation */}
        <button
          onClick={() => navigate('/login')}
          className="absolute -top-12 left-0 flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </button>

        <div className="bg-white/80 backdrop-blur-xl border border-border/80 rounded-3xl shadow-soft-lg p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Bell className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Notification Checker</h1>
            <p className="text-muted-foreground text-sm mt-1">Verify that task reminders will work on your device</p>
          </div>

          {/* STEP 1: Enter Mobile Number */}
          {step === 'input' && (
            <form onSubmit={handleMobileSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mobile" className="text-sm font-semibold text-foreground/80 ml-1">
                  Enter Mobile Number
                </Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="h-14 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 rounded-2xl transition-all"
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 rounded-2xl text-lg font-bold shadow-soft hover:shadow-soft-lg transition-all bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
                  </span>
                ) : 'Submit'}
              </Button>
            </form>
          )}

          {/* STEP 2: Enable Notification */}
          {step === 'enable' && student && (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-muted/40 rounded-2xl text-left border border-border/50">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">User details</p>
                <p className="text-lg font-black text-foreground mt-1">{student.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{student.mobile}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">Enable Push Alerts</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We need your permission to send task notifications to this device. Please grant permission when prompted.
                </p>
              </div>

              <Button
                onClick={handleEnableNotifications}
                size="lg"
                className="w-full h-14 rounded-2xl text-lg font-bold shadow-soft hover:shadow-soft-lg transition-all bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Requesting...
                  </span>
                ) : 'Enable Notifications'}
              </Button>
            </div>
          )}

          {/* STEP 3: Test Notification */}
          {step === 'test' && student && (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-muted/40 rounded-2xl text-left border border-border/50">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">User details</p>
                <p className="text-lg font-black text-foreground mt-1">{student.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{student.mobile}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">Push Notifications Active</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Permission is granted. Let's send a test notification to verify it displays properly on this device.
                </p>
              </div>

              <Button
                onClick={handleSendTestNotification}
                size="lg"
                className="w-full h-14 rounded-2xl text-lg font-bold shadow-soft hover:shadow-soft-lg transition-all bg-primary hover:bg-primary/90 gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Send Test Notification
              </Button>
            </div>
          )}

          {/* STEP 4: Ask Feedback */}
          {step === 'feedback' && student && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                <Send className="w-7 h-7 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Notification Dispatched</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We have triggered a test push notification to this device. Please check your system tray/banners.
                </p>
                {receivedInForeground && (
                  <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 animate-scale-in mt-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <span>Detected: Notification received on this tab!</span>
                  </div>
                )}
                <p className="text-base font-black text-foreground mt-4">Did you receive the notification?</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleFeedback(true)}
                  variant={receivedInForeground ? 'default' : 'outline'}
                  className={`h-14 rounded-2xl text-base font-bold shadow-soft transition-all flex items-center justify-center gap-2 ${
                    receivedInForeground 
                      ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse border-none' 
                      : 'border-green-500/30 text-green-600 hover:bg-green-50 hover:text-green-700 bg-white'
                  }`}
                  disabled={loading}
                >
                  <Check className="w-5 h-5" />
                  Yes, Received
                </Button>
                <Button
                  onClick={() => handleFeedback(false)}
                  variant="outline"
                  className="h-14 rounded-2xl text-base font-bold border-destructive/20 text-destructive hover:bg-destructive/5 bg-white shadow-soft transition-all flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  <X className="w-5 h-5" />
                  No, I didn't
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Completed */}
          {step === 'completed' && student && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center">
                {finalStatus === 'received' ? (
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Verification Done</h3>
                {finalStatus === 'received' ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Great! We've recorded that notifications are working on your device. You are all set to receive task alerts.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We've recorded that notifications failed to deliver. Please check your browser settings or system notification settings.
                  </p>
                )}
              </div>

              <Button
                onClick={resetFlow}
                size="lg"
                className="w-full h-14 rounded-2xl text-base font-bold shadow-soft hover:shadow-soft-lg transition-all"
              >
                Check Another Number
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
