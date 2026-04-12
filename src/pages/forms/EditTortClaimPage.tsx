import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { getTortClaimById, updateTortClaim } from '@/lib/tortClaimService';
import type { TortClaim } from '@/lib/tortClaimTypes';
import { QuestionnaireWizard } from '@/components/nizkin/QuestionnaireWizard';

export default function EditTortClaimPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useOrgNavigate();
  const [claim, setClaim] = useState<TortClaim | null>(null);

  useEffect(() => {
    if (!claimId) return;
    const found = getTortClaimById(claimId);
    if (found) setClaim(found);
  }, [claimId]);

  if (!claim) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">כתב התביעה לא נמצא</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/tort-claims')}>
          חזרה לרשימה
        </Button>
      </div>
    );
  }

  const handleSave = (formData: Omit<TortClaim, 'id'> | TortClaim) => {
    updateTortClaim(claim.id, formData as Partial<TortClaim>);
    navigate(`/tort-claims/${claim.id}/view`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <QuestionnaireWizard
        initialData={claim}
        onSave={handleSave}
        onCancel={() => navigate('/tort-claims')}
        mode="edit"
      />
    </div>
  );
}
