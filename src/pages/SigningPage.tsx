import { PenTool, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SigningRequestList } from '@/components/signing/SigningRequestList';
import { useSigningRequests } from '@/hooks/useSigningRequests';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { cancelSigningRequest, resendSigningRequest, getSignedDocumentUrl, deleteSigningRequest } from '@/services/signingService';
import type { SigningRequest } from '@/services/signingService';

export default function SigningPage() {
  const navigate = useOrgNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const { data: requests = [], isLoading } = useSigningRequests(currentCompany?.id);

  const handleView = (req: SigningRequest) => {
    if (req.status === 'draft') {
      navigate(`/signing/${req.id}`);
    } else if (req.status === 'signed' && req.signed_file_url) {
      handleDownload(req);
    } else {
      navigate(`/signing/${req.id}`);
    }
  };

  const invalidateRequests = () => {
    queryClient.invalidateQueries({ queryKey: ['signing-requests', currentCompany?.id] });
  };

  const handleResend = async (req: SigningRequest) => {
    try {
      await resendSigningRequest(req.id);
      alert('הבקשה נשלחה שוב בהצלחה');
      invalidateRequests();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'שגיאה בשליחה חוזרת');
    }
  };

  const handleCancel = async (req: SigningRequest) => {
    if (!confirm('האם לבטל את בקשת החתימה?')) return;
    try {
      await cancelSigningRequest(req.id);
      alert('הבקשה בוטלה');
      invalidateRequests();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'שגיאה בביטול');
    }
  };

  const handleDownload = async (req: SigningRequest) => {
    try {
      const url = await getSignedDocumentUrl(req.id);
      window.open(url, '_blank');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'שגיאה בהורדה');
    }
  };

  const handleDelete = async (req: SigningRequest) => {
    if (!user) return;
    if (!confirm('האם אתה בטוח שברצונך למחוק את בקשת החתימה? פעולה זו אינה ניתנת לביטול.')) return;
    try {
      await deleteSigningRequest(req.id, user.id);
      alert('הבקשה נמחקה בהצלחה');
      invalidateRequests();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'שגיאה במחיקה');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-3">
            <PenTool className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            חתימה דיגיטלית
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            שלח מסמכים לחתימה דיגיטלית דרך וואטסאפ
          </p>
        </div>
        <Button onClick={() => navigate('/signing/new')} className="w-full sm:w-auto">
          <Plus className="ml-2 h-5 w-5" />
          בקשה חדשה
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>בקשות חתימה</CardTitle>
          <CardDescription>
            כל המסמכים שנשלחו לחתימה
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SigningRequestList
            requests={requests}
            loading={isLoading}
            currentUserId={user?.id}
            onView={handleView}
            onResend={handleResend}
            onCancel={handleCancel}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
}
