
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Phone } from 'lucide-react';

const contacts = [
  { id: 1, name: 'שרה כהן', role: 'עורכת דין בכירה', initials: 'ש.כ', status: 'online' },
  { id: 2, name: 'דוד לוי', role: 'עורך דין', initials: 'ד.ל', status: 'offline' },
  { id: 3, name: 'רחל אברהם', role: 'עוזרת משפטית', initials: 'ר.א', status: 'online' },
  { id: 4, name: 'משה גרינברג', role: 'עורך דין', initials: 'מ.ג', status: 'offline' },
  { id: 5, name: 'מירי יוסף', role: 'מזכירה משפטית', initials: 'מ.י', status: 'online' },
];

const avatarColors = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-purple-100 text-purple-700',
  'bg-cyan-100 text-cyan-700',
  'bg-amber-100 text-amber-700',
];

export function ContactsList() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display font-semibold text-foreground">צוות המשרד</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary text-sm">
            צפה עוד
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contacts.map((contact, index) => (
            <div key={contact.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={`text-xs font-semibold ${avatarColors[index % avatarColors.length]}`}>
                      {contact.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                    contact.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5">
                  <MessageCircle className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5">
                  <Phone className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
