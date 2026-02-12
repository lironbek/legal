import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, ArrowRightLeft } from 'lucide-react';

const roleLabels: Record<string, string> = {
  admin: 'מנהל',
  lawyer: 'עורך דין',
  assistant: 'עוזר',
  client: 'לקוח',
};

export function ImpersonationBanner() {
  const { isImpersonating, profile, realAdmin, stopImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating || !profile || !realAdmin) return null;

  const handleStopImpersonation = () => {
    stopImpersonation();
    navigate('/');
  };

  return (
    <div className="sticky top-0 z-[60] w-full bg-amber-500 text-black px-4 py-2.5 flex items-center justify-between shadow-md" dir="rtl">
      <div className="flex items-center gap-3">
        <Eye className="h-5 w-5 shrink-0" />
        <span className="font-semibold text-sm">מצב צפייה כמשתמש:</span>
        <span className="font-medium text-sm">{profile.full_name}</span>
        <span className="text-sm opacity-80">({profile.email})</span>
        <Badge variant="outline" className="bg-black/10 border-black/20 text-black text-xs">
          {roleLabels[profile.role] || profile.role}
        </Badge>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="bg-white/90 hover:bg-white text-black border-black/30 gap-2"
        onClick={handleStopImpersonation}
      >
        <ArrowRightLeft className="h-4 w-4" />
        חזור לחשבון מנהל ({realAdmin.profile.full_name})
      </Button>
    </div>
  );
}
