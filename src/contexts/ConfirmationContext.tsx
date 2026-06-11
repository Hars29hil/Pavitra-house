import React, { createContext, useContext, useState, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'destructive';
}

interface ConfirmationContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleCancel = () => {
    setOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
    }
  };

  const handleConfirm = () => {
    setOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
    }
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleCancel();
      }}>
        <AlertDialogContent className="rounded-3xl border border-border/50 bg-white/80 backdrop-blur-md shadow-lg max-w-[90%] sm:max-w-md p-6">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-xl font-extrabold text-foreground">
              {options.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground">
              {options.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-row items-center gap-2 sm:space-x-0">
            <AlertDialogCancel asChild>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="h-12 rounded-xl font-bold flex-1 border-border/60 hover:bg-muted"
              >
                {options.cancelText || 'Cancel'}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant={options.variant === 'destructive' ? 'destructive' : 'default'}
                onClick={handleConfirm}
                className="h-12 rounded-xl font-bold flex-1"
              >
                {options.confirmText || 'Confirm'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmationContext.Provider>
  );
};

export const useConfirm = (): ConfirmationContextType => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmationProvider');
  }
  return context;
};
