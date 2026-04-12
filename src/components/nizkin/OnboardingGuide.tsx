// OnboardingGuide — Full-screen walkthrough shown before starting a tort claim wizard
// Explains the process step by step so the user knows what to expect and what to prepare

import { useState } from 'react';
import {
  Gavel, FileText, Users, MapPin, Scale, Calculator,
  BookOpen, CheckCircle2, ArrowLeft, ArrowRight, Sparkles,
  Clock, Paperclip, Shield, Bot, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OnboardingGuideProps {
  onStart: () => void;
  onBack: () => void;
}

interface GuideStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
  tip?: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Gavel className="h-6 w-6" />,
    title: 'סיווג התביעה',
    description: 'בחירת סוג התביעה, בית המשפט המוסמך ותאריך האירוע.',
    details: [
      'בחר את סוג התביעה (תאונת דרכים, רשלנות רפואית, רשלנות כללית וכו\')',
      'בחר את בית המשפט המתאים (שלום / מחוזי / תעבורה)',
      'הזן את תאריך האירוע — המערכת תחשב אוטומטית את מועד ההתיישנות',
    ],
    tip: 'המערכת תתאים את השלבים הבאים לפי סוג התביעה שתבחר.',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'פרטי התובע',
    description: 'מילוי פרטים אישיים של התובע — שם, ת.ז., כתובת ופרטי קשר.',
    details: [
      'שם מלא ותעודת זהות (חובה)',
      'כתובת מגורים ופרטי התקשרות',
      'אם התובע קטין — יש למלא גם פרטי אפוטרופוס',
      'שם עורך הדין המייצג',
    ],
    tip: 'ודא שהפרטים זהים למופיע בתעודת הזהות.',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'הנתבעים',
    description: 'הוספת פרטי הנתבע או הנתבעים בתביעה.',
    details: [
      'ניתן להוסיף מספר נתבעים',
      'לכל נתבע — שם, ת.ז./ח.פ., כתובת וסוג (יחיד / חברה / רשות)',
      'אם יש מבטח — ניתן לציין את חברת הביטוח',
    ],
    tip: 'בתאונות דרכים ניתן לתבוע גם את חברת הביטוח ישירות.',
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    title: 'פרטי האירוע',
    description: 'תיאור מפורט של נסיבות האירוע, המיקום והנזק.',
    details: [
      'מיקום מדויק של האירוע',
      'תיאור מפורט של מה שקרה — ככל שיותר מפורט, כך המסמך יהיה טוב יותר',
      'ניתן לצרף מסמכים (צילומים, דוחות, אישורים רפואיים)',
      'ה-AI ינתח אוטומטית מסמכים שתעלה ויחלץ מידע רלוונטי',
    ],
    tip: 'צרף כמה שיותר מסמכים — הם יעזרו ל-AI לנסח תביעה מדויקת יותר.',
  },
  {
    icon: <Scale className="h-6 w-6" />,
    title: 'יסודות העוולה',
    description: 'ניסוח הטיעונים המשפטיים — חובת זהירות, הפרה, קשר סיבתי ונזק.',
    details: [
      'חובת הזהירות — מה הנתבע היה אמור לעשות',
      'הפרת החובה — כיצד הנתבע הפר את חובתו',
      'קשר סיבתי — הקשר הישיר בין ההפרה לנזק',
      'תיאור הנזק — מה הנזק שנגרם בפועל',
    ],
    tip: 'לא בטוח מה לכתוב? לחץ על כפתור "עוזר AI" ובקש עזרה בניסוח.',
  },
  {
    icon: <Calculator className="h-6 w-6" />,
    title: 'ראשי נזק',
    description: 'פירוט הנזקים הכספיים — כאב וסבל, הוצאות רפואיות, הפסד השתכרות ועוד.',
    details: [
      'המערכת מציעה ראשי נזק מתאימים לפי סוג התביעה',
      'לכל ראש נזק — סכום מוערך ותיאור',
      'סכום התביעה הכולל מחושב אוטומטית',
      'הסכום קובע לאיזה בית משפט לפנות (שלום עד 2.5 מיליון, מחוזי מעל)',
    ],
    tip: 'סכומים ריאליים מגדילים את סיכויי הצלחת התביעה.',
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: 'טיעונים משפטיים',
    description: 'בחירת עילות תביעה, חקיקה רלוונטית וניסוח הטיעונים.',
    details: [
      'בחר עילות תביעה מרשימה מוכנה (רשלנות, הפרת חובה חקוקה וכו\')',
      'סמן חוקים רלוונטיים (פקודת הנזיקין, חוק הפיצויים ועוד)',
      'נסח את הטיעונים המשפטיים או בקש מה-AI לנסח עבורך',
      'הגדר את הסעד המבוקש',
    ],
    tip: 'ה-AI יכול לנסח טיעונים משפטיים מלאים על בסיס הנתונים שהזנת.',
  },
  {
    icon: <CheckCircle2 className="h-6 w-6" />,
    title: 'סיכום ויצירת מסמך',
    description: 'סקירת כל הנתונים, יצירת טיוטת כתב תביעה עם AI והורדת המסמך.',
    details: [
      'סקירה של כל הנתונים שהזנת במקום אחד',
      'לחיצה על "נסח כתב תביעה עם AI" — יוצרת טיוטה משפטית מלאה',
      'ניתן להוריד את המסמך כ-DOCX (לעריכה) או PDF (להגשה)',
      'שמירת כתב התביעה במערכת לצפייה ועריכה עתידית',
    ],
    tip: 'הטיוטה היא נקודת התחלה — מומלץ לעבור עליה ולערוך לפני הגשה.',
  },
];

const PREPARATION_ITEMS = [
  { icon: <FileText className="h-4 w-4" />, text: 'תעודת זהות של התובע' },
  { icon: <FileText className="h-4 w-4" />, text: 'פרטי הנתבע/ים (שם, כתובת, ת.ז. או ח.פ.)' },
  { icon: <Paperclip className="h-4 w-4" />, text: 'מסמכים רפואיים / דוחות / צילומים' },
  { icon: <Clock className="h-4 w-4" />, text: 'תאריך האירוע המדויק' },
  { icon: <MapPin className="h-4 w-4" />, text: 'מיקום האירוע' },
  { icon: <Calculator className="h-4 w-4" />, text: 'קבלות / אישורי הוצאות (אם יש)' },
];

export function OnboardingGuide({ onStart, onBack }: OnboardingGuideProps) {
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = intro, 1..N = steps

  const totalSlides = GUIDE_STEPS.length + 1; // +1 for intro

  const goNext = () => setCurrentSlide(i => Math.min(i + 1, totalSlides - 1));
  const goPrev = () => setCurrentSlide(i => Math.max(i - 1, 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            יצירת כתב תביעה בנזיקין
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            מדריך — מה מחכה לך ואיך להתכונן
          </p>
        </div>
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          חזרה לרשימה
        </Button>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 justify-center">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              i === currentSlide
                ? 'w-8 bg-primary'
                : i < currentSlide
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      {currentSlide === 0 ? (
        /* Intro slide */
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Gavel className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">ברוכים הבאים למודול כתבי התביעה</h2>
                <p className="text-muted-foreground leading-relaxed">
                  המערכת תנחה אותך שלב אחר שלב ביצירת כתב תביעה בנזיקין מלא ומקצועי.
                  בסיום התהליך תוכל להוריד מסמך מוכן להגשה לבית המשפט.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Process overview */}
          <Card>
            <CardContent className="pt-6 pb-6">
              <h3 className="font-semibold mb-4">התהליך כולל {GUIDE_STEPS.length} שלבים:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GUIDE_STEPS.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i + 1)}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-right"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-sm font-bold text-primary">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* What to prepare */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 pb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                מה כדאי להכין מראש?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PREPARATION_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-primary">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI assistance note */}
          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">עוזר AI לרשותך</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    לאורך כל התהליך, תוכל ללחוץ על כפתור <strong>"עוזר AI"</strong> בפינה השמאלית למטה.
                    העוזר יסביר מה צריך למלא, יציע ניסוחים משפטיים, ויעזור לך בכל שלב.
                    בשלב הסיכום, ה-AI ינסח עבורך כתב תביעה שלם על בסיס כל הנתונים שהזנת.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Step detail slides */
        <StepDetailSlide step={GUIDE_STEPS[currentSlide - 1]} stepNumber={currentSlide} />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          הקודם
        </Button>

        <div className="flex items-center gap-3">
          {currentSlide > 0 && (
            <Button variant="ghost" onClick={onStart} className="text-muted-foreground">
              דלג והתחל
            </Button>
          )}
          {currentSlide < totalSlides - 1 ? (
            <Button onClick={goNext} className="gap-2">
              הבא
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={onStart} className="gap-2">
              <Sparkles className="h-4 w-4" />
              מוכן — בואו נתחיל!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDetailSlide({ step, stepNumber }: { step: GuideStep; stepNumber: number }) {
  return (
    <Card>
      <CardContent className="pt-8 pb-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Step header */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary">{step.icon}</span>
            </div>
            <div>
              <Badge variant="secondary" className="mb-1">שלב {stepNumber}</Badge>
              <h2 className="text-xl font-bold">{step.title}</h2>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 pr-4">
            {step.details.map((detail, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm leading-relaxed">{detail}</span>
              </div>
            ))}
          </div>

          {/* Tip */}
          {step.tip && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
              <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300">{step.tip}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
