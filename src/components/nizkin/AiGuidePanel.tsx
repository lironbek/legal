// AiGuidePanel — Floating AI assistant for the tort claim wizard
// Provides step-by-step guidance, suggests legal phrasing, and answers questions

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, X, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { sendGuideMessage, type GuideMessage } from '@/lib/nizkin/claim-generator';
import type { TortClaim } from '@/lib/tortClaimTypes';

interface AiGuidePanelProps {
  claimData?: Partial<TortClaim>;
  currentStep?: string;
  currentStepTitle?: string;
  /** Callback when the AI suggests filling a field */
  onSuggestFill?: (field: string, value: string) => void;
}

const QUICK_PROMPTS: { label: string; prompt: string }[] = [
  { label: 'מה למלא כאן?', prompt: 'מה עלי למלא בשלב הנוכחי?' },
  { label: 'הצע ניסוח', prompt: 'הצע לי ניסוח משפטי מתאים לתיאור האירוע' },
  { label: 'איזה סכומים?', prompt: 'מה הסכומים הריאליים לראשי הנזק בתביעה כזו?' },
  { label: 'מה חסר?', prompt: 'בדוק מה חסר בטופס שלי ומה עדיף להוסיף' },
];

export function AiGuidePanel({
  claimData,
  currentStep,
  currentStepTitle,
  onSuggestFill,
}: AiGuidePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<GuideMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send greeting when panel opens for first time
  useEffect(() => {
    if (isOpen && !hasGreeted && messages.length === 0) {
      setHasGreeted(true);
      sendMessage('שלום, אני רוצה לתחיל למלא כתב תביעה');
    }
  }, [isOpen, hasGreeted, messages.length]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: GuideMessage = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const result = await sendGuideMessage(updated, claimData, currentStep);
      if (result.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.text }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `שגיאה: ${result.error || 'לא ניתן להתחבר ל-AI'}. נסה שוב.`,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'שגיאה בחיבור. ודא שהפרוקסי פעיל:\n`GEMINI_API_KEY=AIza... bun run scripts/ai-proxy.ts`',
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, claimData, currentStep]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
      >
        <Bot className="h-5 w-5" />
        <span className="text-sm font-medium">עוזר AI</span>
        <Sparkles className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: '#a855f7' }} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-[400px] max-h-[600px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">עוזר משפטי AI</span>
          <Sparkles className="h-3.5 w-3.5" style={{ color: '#a855f7' }} />
          {currentStepTitle && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {currentStepTitle}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsOpen(false)}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => { setIsOpen(false); setMessages([]); setHasGreeted(false); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[380px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">חושב...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map(qp => (
            <button
              key={qp.label}
              onClick={() => sendMessage(qp.prompt)}
              disabled={loading}
              className="text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-muted transition-colors disabled:opacity-50"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t bg-muted/30">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="שאל שאלה או תאר את המצב..."
            className="min-h-[40px] max-h-[100px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 shrink-0"
            disabled={!input.trim() || loading}
            onClick={() => sendMessage(input)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
