import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, FileText, Paperclip, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getScannedDocuments } from '@/lib/documentScanService';
import { getDocuments } from '@/lib/dataManager';
import type { TortDocumentAttachment } from '@/lib/tortClaimTypes';

interface AvailableDocument {
  id: string;
  source: 'scanned' | 'document';
  title: string;
  fileName: string;
  fileUrl?: string;
  type?: string;
  date?: string;
}

interface DocumentAttachmentsStepProps {
  clientId?: string;
  companyId: string;
  documentAttachments: TortDocumentAttachment[];
  onChange: (attachments: TortDocumentAttachment[]) => void;
}

export function DocumentAttachmentsStep({
  clientId,
  companyId,
  documentAttachments,
  onChange,
}: DocumentAttachmentsStepProps) {
  const [search, setSearch] = useState('');

  // Load available documents for this client
  const availableDocs = useMemo((): AvailableDocument[] => {
    const docs: AvailableDocument[] = [];

    // Scanned documents linked to this client
    const scannedDocs = getScannedDocuments();
    const clientScanned = clientId
      ? scannedDocs.filter(d => d.linked_client_id === clientId)
      : [];
    for (const doc of clientScanned) {
      docs.push({
        id: `scanned-${doc.id}`,
        source: 'scanned',
        title: doc.title || doc.file_name,
        fileName: doc.file_name,
        fileUrl: doc.file_url || undefined,
        type: doc.document_type || undefined,
        date: doc.document_date || doc.created_at,
      });
    }

    // Regular documents (from dataManager)
    const allDocuments = getDocuments();
    // Filter by company and optionally by client name
    const clientDocs = allDocuments.filter(d => {
      if (d.company_id !== companyId) return false;
      // If we have a client_id, we can't directly match since documents use client name string
      // Show all company documents if no client selected, or all docs
      return true;
    });
    for (const doc of clientDocs) {
      docs.push({
        id: `doc-${doc.id}`,
        source: 'document',
        title: doc.title,
        fileName: doc.title,
        type: doc.category,
        date: doc.date,
      });
    }

    return docs;
  }, [clientId, companyId]);

  // Filter by search
  const filteredDocs = useMemo(() => {
    if (!search.trim()) return availableDocs;
    const q = search.toLowerCase();
    return availableDocs.filter(
      d => d.title.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q)
    );
  }, [availableDocs, search]);

  // Currently selected document IDs
  const selectedIds = new Set(documentAttachments.map(a => `${a.source}-${a.source_id}`));

  const toggleDocument = (doc: AvailableDocument) => {
    const key = `${doc.source}-${doc.id.replace(/^(scanned-|doc-)/, '')}`;
    const sourceId = doc.id.replace(/^(scanned-|doc-)/, '');

    if (selectedIds.has(doc.id)) {
      // Remove
      onChange(documentAttachments
        .filter(a => !(a.source === doc.source && a.source_id === sourceId))
        .map((a, i) => ({ ...a, order: i })));
    } else {
      // Add
      const newAttachment: TortDocumentAttachment = {
        id: doc.id,
        source: doc.source,
        source_id: sourceId,
        display_name: doc.title,
        order: documentAttachments.length,
        file_url: doc.fileUrl,
        file_name: doc.fileName,
      };
      onChange([...documentAttachments, newAttachment]);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...documentAttachments];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated.map((a, i) => ({ ...a, order: i })));
  };

  const moveDown = (index: number) => {
    if (index >= documentAttachments.length - 1) return;
    const updated = [...documentAttachments];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated.map((a, i) => ({ ...a, order: i })));
  };

  const updateDisplayName = (index: number, name: string) => {
    const updated = [...documentAttachments];
    updated[index] = { ...updated[index], display_name: name };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {!clientId && (
        <div className="text-sm text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-md p-3">
          לא נבחר לקוח. חזור לשלב "פרטי התובע" ובחר לקוח מהמערכת כדי לראות מסמכים מתוייקים.
        </div>
      )}

      {/* Available documents */}
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <Paperclip className="h-4 w-4" />
          מסמכים זמינים ({availableDocs.length})
        </Label>

        <div className="relative mb-3">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש מסמך..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>

        {filteredDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {availableDocs.length === 0
              ? 'אין מסמכים זמינים ללקוח זה'
              : 'לא נמצאו תוצאות'}
          </p>
        ) : (
          <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
            {filteredDocs.map(doc => {
              const isSelected = selectedIds.has(doc.id);
              return (
                <label
                  key={doc.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    isSelected ? 'bg-primary/5' : ''
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleDocument(doc)}
                  />
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {doc.source === 'scanned' ? 'סרוק' : 'מסמך'}
                      </Badge>
                      {doc.type && <span>{doc.type}</span>}
                      {doc.date && <span>{new Date(doc.date).toLocaleDateString('he-IL')}</span>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Selected documents with ordering */}
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4" />
          מסמכים נבחרים ({documentAttachments.length})
        </Label>

        {documentAttachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            טרם נבחרו מסמכים. סמן מסמכים מהרשימה למעלה.
          </p>
        ) : (
          <div className="space-y-2">
            {documentAttachments
              .sort((a, b) => a.order - b.order)
              .map((attachment, index) => (
                <Card key={attachment.id} className="border-dashed">
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    {/* Order number */}
                    <div className="flex flex-col items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                        {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveDown(index)}
                        disabled={index === documentAttachments.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Display name input */}
                    <div className="flex-1 min-w-0">
                      <Input
                        value={attachment.display_name}
                        onChange={e => updateDisplayName(index, e.target.value)}
                        className="h-8 text-sm"
                        placeholder="שם תצוגה במסמך המאוחד"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {attachment.file_name}
                      </p>
                    </div>

                    {/* Remove */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 text-xs shrink-0"
                      onClick={() => toggleDocument({
                        id: attachment.id,
                        source: attachment.source,
                        title: attachment.display_name,
                        fileName: attachment.file_name,
                        fileUrl: attachment.file_url,
                      })}
                    >
                      הסר
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
