import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { CLAIM_TYPE_LABELS } from '@/lib/tortClaimTypes';
import type { TortClaim } from '@/lib/tortClaimTypes';

interface AiContentGeneratorProps {
  claimData: Omit<TortClaim, 'id'>;
  onGenerated: (content: {
    legalArguments: string;
    causesOfAction: string[];
    relevantLaws: string[];
  }) => void;
}

export function AiContentGenerator({ claimData, onGenerated }: AiContentGeneratorProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        // Mock mode - generate sample content
        await new Promise(resolve => setTimeout(resolve, 1500));
        onGenerated(getMockContent(claimData.claim_type));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('נדרשת התחברות לשימוש ב-AI');
        return;
      }

      const response = await supabase.functions.invoke('generate-tort-content', {
        body: {
          claimType: claimData.claim_type,
          claimTypeLabel: CLAIM_TYPE_LABELS[claimData.claim_type],
          eventDescription: claimData.incident_description,
          tortElements: claimData.tort_elements,
          plaintiffName: claimData.plaintiff_name,
          defendants: claimData.defendants.map(d => ({ name: d.name, type: d.type, role: d.role })),
          incidentLocation: claimData.incident_location,
          incidentDate: claimData.incident_date,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      if (result?.success && result?.data) {
        onGenerated({
          legalArguments: result.data.legalArguments || '',
          causesOfAction: result.data.causesOfAction || [],
          relevantLaws: result.data.relevantLaws || [],
        });
      } else {
        throw new Error(result?.error || 'שגיאה בניסוח');
      }
    } catch (error: any) {
      toast.error(error?.message || 'שגיאה בניסוח AI. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={loading || !claimData.incident_description}
      className="gap-2"
      title={!claimData.incident_description ? 'נדרש תיאור אירוע כדי לייצר טיעונים' : ''}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      ניסוח AI
    </Button>
  );
}

// Mock content when no Supabase connection
function getMockContent(claimType: string) {
  const base = {
    causesOfAction: [
      'עוולת הרשלנות (סעיפים 35-36 לפקודת הנזיקין)',
      'הפרת חובה חקוקה (סעיף 63 לפקודת הנזיקין)',
    ],
    relevantLaws: [
      'פקודת הנזיקין [נוסח חדש]',
    ],
  };

  if (claimType === 'road_accident') {
    return {
      legalArguments: `הנתבע נהג ברכבו ברשלנות חמורה, תוך הפרת חובת הזהירות המוטלת עליו כמשתמש בדרך. הנתבע לא נקט באמצעי הזהירות הנדרשים ובכך גרם לתאונה ולנזקי גוף חמורים לתובע.\n\nלחילופין, ובהתאם לחוק הפיצויים לנפגעי תאונות דרכים, תשל"ה-1975, התובע זכאי לפיצוי בגין נזקי הגוף שנגרמו לו כתוצאה מהתאונה, ללא צורך בהוכחת אשם.\n\nהנזקים שנגרמו לתובע כוללים כאב וסבל, הוצאות רפואיות, הפסד שכר בעבר ובעתיד, והוצאות נלוות כמפורט בכתב תביעה זה.`,
      causesOfAction: [
        ...base.causesOfAction,
        'חוק הפיצויים לנפגעי תאונות דרכים, תשל"ה-1975',
      ],
      relevantLaws: [
        ...base.relevantLaws,
        'חוק הפיצויים לנפגעי תאונות דרכים, תשל"ה-1975',
        'פקודת ביטוח רכב מנועי [נוסח חדש], תש"ל-1970',
      ],
    };
  }

  return {
    legalArguments: `הנתבע התרשל בחובת הזהירות המוטלת עליו כלפי התובע, ובכך גרם לתובע נזקי גוף ונזקים כספיים כמפורט להלן.\n\nהנתבע הפר את חובתו לנקוט בכל אמצעי הזהירות הסבירים למניעת הנזק, ולפיכך הוא אחראי לפצות את התובע בגין מלוא נזקיו.\n\nבנוסף, הנתבע הפר חובות חקוקות המוטלות עליו מכוח הדין, דבר המקים עילת תביעה עצמאית לפי סעיף 63 לפקודת הנזיקין.`,
    ...base,
  };
}
