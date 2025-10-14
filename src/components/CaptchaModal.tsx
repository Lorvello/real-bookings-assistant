import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CaptchaModalProps {
  open: boolean;
  onVerified: () => void;
  onClose: () => void;
}

export const CaptchaModal = ({ open, onVerified, onClose }: CaptchaModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verificatie vereist</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Voltooi de onderstaande verificatie om door te gaan.
          </p>
          {/* TODO: Integrate with reCAPTCHA or hCaptcha */}
          <div className="mt-4 p-8 border-2 border-dashed rounded-lg text-center">
            <p className="text-sm text-muted-foreground">CAPTCHA widget komt hier</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
