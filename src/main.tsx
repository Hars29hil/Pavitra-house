import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import StudentSelfUpdate from "./pages/StudentSelfUpdate.tsx";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import "./index.css";

const hostname = window.location.hostname;
const parts = hostname.split('.');

// Check if it's a subdomain for a mobile number
// E.g., 9876543210.pavitra-house.vercel.app or 9876543210.localhost
let isMobileSubdomain = false;
let mobileNumber = "";

if (parts.length >= 3 || (parts.length >= 2 && parts[1] === 'localhost')) {
  const potentialMobile = parts[0];
  // Basic validation: checks if the subdomain is a string of numbers (typically 10+ digits for mobile)
  if (/^\d{8,15}$/.test(potentialMobile)) {
    isMobileSubdomain = true;
    mobileNumber = potentialMobile;
  }
}

const root = createRoot(document.getElementById("root")!);

if (isMobileSubdomain) {
  root.render(
    <>
      <Toaster />
      <Sonner />
      <StudentSelfUpdate mobile={mobileNumber} />
    </>
  );
} else {
  root.render(<App />);
}
