import { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  X,
  FileText,
  User,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Calculator
} from 'lucide-react';
import { getClients, Client } from '@/lib/dataManager';
import { PageHeader } from '@/components/layout/PageHeader';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function NewInvoicePage() {
  const navigate = useOrgNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
    paymentTerms: '30'
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: 'ייעוץ משפטי',
      quantity: 1,
      rate: 500,
      amount: 500
    }
  ]);

  // Load clients on component mount
  useEffect(() => {
    const clientsList = getClients();
    setClients(clientsList);
  }, []);

  // Generate invoice number
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const invoiceCount = Math.floor(Math.random() * 100) + 1; // Mock counter
    setFormData(prev => ({
      ...prev,
      invoiceNumber: `${currentYear}-${invoiceCount.toString().padStart(3, '0')}`
    }));
  }, []);

  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(client => client.id === clientId);
    if (selectedClient) {
      setFormData({
        ...formData,
        clientId: clientId,
        clientName: selectedClient.name
      });
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Calculate amount when quantity or rate changes
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = updatedItem.quantity * updatedItem.rate;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateVAT = () => {
    return calculateSubtotal() * 0.17; // 17% VAT
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId) {
      alert('יש לבחור לקוח');
      return;
    }

    if (!formData.dueDate) {
      alert('יש למלא תאריך פירעון');
      return;
    }

    // Here you would save the invoice
    const invoiceData = {
      ...formData,
      items,
      subtotal: calculateSubtotal(),
      vat: calculateVAT(),
      total: calculateTotal(),
      status: 'טיוטה',
      createdAt: new Date().toISOString()
    };

    console.log('Invoice created:', invoiceData);
    alert('החשבונית נוצרה בהצלחה!');
    navigate('/billing');
  };

  const handleCancel = () => {
    navigate('/billing');
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <PageHeader
        title="חשבונית חדשה"
        subtitle="יצירת חשבונית חדשה ללקוח"
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 ml-2" />
            ביטול
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Header */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" />
              פרטי החשבונית
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber" className="text-foreground">מספר חשבונית</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                  className="bg-muted/50"
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issueDate" className="text-foreground">תאריך הנפקה</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-foreground">תאריך פירעון *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Selection */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <User className="h-5 w-5" />
              פרטי לקוח
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client" className="text-foreground">בחר לקוח *</Label>
              <Select value={formData.clientId} onValueChange={handleClientSelect} required>
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח מהרשימה" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{client.name}</span>
                        {client.email && <span className="text-muted-foreground">({client.email})</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.clientName && (
                <div className="mt-2">
                  <Badge className="bg-primary/10 text-primary">
                    נבחר: {formData.clientName}
                  </Badge>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentTerms" className="text-foreground">תנאי תשלום</Label>
                <Select value={formData.paymentTerms} onValueChange={(value) => setFormData({...formData, paymentTerms: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">תשלום מיידי</SelectItem>
                    <SelectItem value="15">15 ימים</SelectItem>
                    <SelectItem value="30">30 ימים</SelectItem>
                    <SelectItem value="45">45 ימים</SelectItem>
                    <SelectItem value="60">60 ימים</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                פריטי החשבונית
              </div>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 ml-2" />
                הוסף פריט
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-border rounded-lg">
                <div className="md:col-span-5 space-y-2">
                  <Label className="text-sm text-foreground">תיאור</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="תיאור השירות או המוצר"
                    required
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm text-foreground">כמות</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    required
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm text-foreground">מחיר יחידה</Label>
                  <Input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm text-foreground">סכום</Label>
                  <div className="flex items-center h-10 px-3 py-2 border border-border rounded-md bg-muted/50">
                    ₪{item.amount.toFixed(2)}
                  </div>
                </div>

                <div className="md:col-span-1 flex items-end">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="space-y-2 max-w-sm ml-auto">
                <div className="flex justify-between">
                  <span className="text-foreground">סכום ביניים:</span>
                  <span className="font-medium">₪{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">מע"מ (17%):</span>
                  <span className="font-medium">₪{calculateVAT().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-foreground border-t pt-2">
                  <span>סה"כ לתשלום:</span>
                  <span>₪{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">הערות נוספות</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="הערות או הוראות תשלום נוספות..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 ml-2" />
            ביטול
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 ml-2" />
            שמור חשבונית
          </Button>
        </div>
      </form>
    </div>
  );
}
