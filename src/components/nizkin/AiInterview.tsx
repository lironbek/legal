// AiInterview — AI-driven interview panel that asks questions to fill claim fields
// Analyzes existing data, identifies gaps, asks targeted questions, suggests field values

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Loader2, CheckCircle2, X, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  sendInterviewMessage,
  type GuideMessage,
  type InterviewFieldSuggestion,
} from '@/lib/nizkin/claim-generator';
import type { TortClaim } from '@/lib/tortClaimTypes';

interface AiInterviewProps {
  claimData: Partial<TortClaim>;
  onFieldUpdate: (field: string, value: any) => void;
  onClose: () => void;
}

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: InterviewFieldSuggestion[];
  appliedSuggestions?: Set<number>;
}

export function AiInterview({ claimData, onFieldUpdate, onClose }: AiInterviewProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<GuideMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start interview on mount
  useEffect(() => {
    startInterview();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startInterview = async () => {
    setLoading(true);
    const greeting: GuideMessage = {
      role: 'user',
      content: 'שלום, אני רוצה למלא כתב תביעה. תעזור לי לענות על השאלות.',
    };
    try {
      const result = await sendInterviewMessage([greeting], claimData);
      const apiMsgs: GuideMessage[] = [
        greeting,
        { role: 'assistant', content: result.message },
      ];
      setApiMessages(apiMsgs);
      setMessages([{
        role: 'assistant',
        content: result.message,
        suggestions: result.suggestions,
        appliedSuggestions: new Set(),
      }]);
    } catch {
      setMessages([{
        role: 'assistant',
        content: 'שגיאה בהתחברות ל-AI. ודא שהפרוקסי פעיל.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: GuideMessage = { role: 'user', content: text };
    const updatedApi = [...apiMessages, userMsg];
    setApiMessages(updatedApi);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const result = await sendInterviewMessage(updatedApi, claimData);
      const assistantMsg: GuideMessage = { role: 'assistant', content: result.message };
      setApiMessages(prev => [...prev, assistantMsg]);

      // Auto-apply suggestions if there are any
      const appliedSet = new Set<number>();
      if (result.suggestions && result.suggestions.length > 0) {
        result.suggestions.forEach((s, i) => {
          try {
            applyFieldSuggestion(s);
            appliedSet.add(i);
          } catch (err) {
            console.warn('[nizkin] Failed to apply suggestion:', s, err);
          }
        });
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.message || '',
        suggestions: result.suggestions || [],
        appliedSuggestions: appliedSet,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'שגיאה. נסה שוב.',
      }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }, [apiMessages, loading, claimData]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFieldSuggestion = (suggestion: InterviewFieldSuggestion) => {
    if (!suggestion || !suggestion.field) return;
    const { field, value } = suggestion;

    // Handle nested fields (e.g., tort_elements.duty_of_care)
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'tort_elements') {
        const current = (claimData as any).tort_elements || {};
        onFieldUpdate('tort_elements', { ...current, [child]: value });
      } else if (parent === 'plaintiff_contact') {
        const current = (claimData as any).plaintiff_contact || {};
        onFieldUpdate('plaintiff_contact', { ...current, [child]: value });
      }
    } else if (field === 'plaintiff_phone') {
      const current = (claimData as any).plaintiff_contact || {};
      onFieldUpdate('plaintiff_contact', { ...current, phone: value });
    } else if (field === 'defendant') {
      // Add a new defendant
      try {
        const defData = typeof value === 'string' ? JSON.parse(value) : value;
        const current = (claimData as any).defendants || [];
        onFieldUpdate('defendants', [...current, {
          id: crypto.randomUUID(),
          name: defData.name || '',
          type: defData.type || 'individual',
          address: defData.address || '',
          city: defData.city || '',
          role: defData.role || '',
          idNumber: defData.idNumber || '',
          insurerName: '',
          attorney: '',
        }]);
      } catch { /* ignore invalid defendant data */ }
    } else {
      onFieldUpdate(field, value);
    }
    setAppliedCount(c => c + 1);
  };

  const handleManualApply = (msgIndex: number, sugIndex: number, suggestion: InterviewFieldSuggestion) => {
    applyFieldSuggestion(suggestion);
    setMessages(prev => prev.map((m, i) => {
      if (i === msgIndex && m.appliedSuggestions) {
        const newSet = new Set(m.appliedSuggestions);
        newSet.add(sugIndex);
        return { ...m, appliedSuggestions: newSet };
      }
      return m;
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/10">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">ראיון AI — מילוי כתב תביעה</span>
            <Sparkles className="h-3.5 w-3.5" style={{ color: '#a855f7' }} />
            {appliedCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {appliedCount} שדות מולאו
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[400px]">
          {messages.map((msg, msgIdx) => (
            <div key={msgIdx}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border text-foreground'
                  }`}
                >
                  {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                </div>
              </div>

              {/* Suggestions */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-2 mr-0 ml-auto max-w-[90%] space-y-1">
                  {msg.suggestions.map((s, sIdx) => {
                    const applied = msg.appliedSuggestions?.has(sIdx) ?? false;
                    const displayValue = typeof s.value === 'string' ? s.value : JSON.stringify(s.value);
                    return (
                      <button
                        key={sIdx}
                        onClick={() => !applied && handleManualApply(msgIdx, sIdx, s)}
                        disabled={applied}
                        className={`w-full text-right flex items-center gap-2 text-xs px-3 py-1.5 rounded border transition-colors ${
                          applied
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-background hover:bg-muted border-muted-foreground/20 cursor-pointer'
                        }`}
                      >
                        {applied ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        <span className="font-medium">{s.label || s.field}:</span>
                        <span className="truncate flex-1">{displayValue}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-background border rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">חושב...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ענה על השאלה..."
              className="min-h-[40px] max-h-[100px] resize-none text-sm"
              rows={1}
              dir="rtl"
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
      </CardContent>
    </Card>
  );
}
