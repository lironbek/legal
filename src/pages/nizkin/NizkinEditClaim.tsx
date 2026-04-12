// NizkinEditClaim - /nizkin/:claimId/edit - Edit existing tort claim using same wizard

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { getClaim, patchClaim } from '@/lib/nizkin/api';
import { QuestionnaireWizard } from '@/components/nizkin/QuestionnaireWizard';
import type { TortClaim } from '@/lib/tortClaimTypes';

export default function NizkinEditClaim() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useOrgNavigate();
  const { toast } = useToast();
  const [claim, setClaim] = useState<TortClaim | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!claimId) return;
    getClaim(claimId).then(result => {
      setClaim(result.data || null);
      setLoading(false);
    });
  }, [claimId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <p>כתב תביעה לא נמצא</p>
      </div>
    );
  }

  const handleSave = async (data: Omit<TortClaim, 'id'> | TortClaim) => {
    await patchClaim(claim.id, data);
    toast({ title: 'כתב התביעה עודכן' });
    navigate(`/nizkin/${claim.id}`);
  };

  return (
    <QuestionnaireWizard
      initialData={claim}
      onSave={handleSave}
      onCancel={() => navigate(`/nizkin/${claim.id}`)}
      mode="edit"
    />
  );
}
