import { useMemo, useEffect, useState } from 'react';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { getClients, getCases } from '@/lib/dataManager';
import { addTortClaim, loadAutosave, clearAutosave } from '@/lib/tortClaimService';
import { createEmptyTortClaim } from '@/lib/tortClaimTypes';
import type { TortClaim } from '@/lib/tortClaimTypes';
import { QuestionnaireWizard } from '@/components/nizkin/QuestionnaireWizard';

export default function NewTortClaimPage() {
  const navigate = useOrgNavigate();
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [showRestore, setShowRestore] = useState(false);

  const initialData = useMemo(() =>
    createEmptyTortClaim(currentCompany?.id || '', user?.id || ''),
    [currentCompany?.id, user?.id]
  );

  const [data, setData] = useState<Omit<TortClaim, 'id'>>(initialData);

  // Check for auto-saved draft
  useEffect(() => {
    const saved = loadAutosave();
    if (saved) setShowRestore(true);
  }, []);

  const handleRestore = () => {
    const saved = loadAutosave();
    if (saved?.data) {
      setData(prev => ({ ...prev, ...saved.data }));
    }
    setShowRestore(false);
  };

  const handleDismissRestore = () => {
    clearAutosave();
    setShowRestore(false);
  };

  const handleSave = (formData: Omit<TortClaim, 'id'> | TortClaim) => {
    const claim = addTortClaim(formData as Omit<TortClaim, 'id'>);
    navigate(`/tort-claims/${claim.id}/view`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {showRestore && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
          <span className="text-sm">נמצאה טיוטה שנשמרה אוטומטית. לשחזר?</span>
          <div className="flex gap-2">
            <button
              onClick={handleRestore}
              className="text-sm font-medium text-primary hover:underline"
            >
              שחזר
            </button>
            <button
              onClick={handleDismissRestore}
              className="text-sm text-muted-foreground hover:underline"
            >
              התעלם
            </button>
          </div>
        </div>
      )}

      <QuestionnaireWizard
        initialData={data}
        onSave={handleSave}
        onCancel={() => navigate('/tort-claims')}
        mode="create"
      />
    </div>
  );
}
