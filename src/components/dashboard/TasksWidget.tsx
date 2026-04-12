import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListTodo, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getTasks, updateTask, Task } from '@/lib/dataManager';

export function TasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const loadTasks = () => {
    const allTasks = getTasks().filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    const sorted = [...allTasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    setTasks(sorted);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    updateTask(taskId, { status: newStatus });
    loadTasks();
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  if (tasks.length === 0) return null;

  return (
    <Card className="shadow-md border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          משימות פתוחות ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-1 flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{task.title}</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>מוקצה: {task.assignedTo}</span>
                  <span className={isOverdue(task.dueDate) ? 'text-red-500 font-medium' : ''}>
                    {isOverdue(task.dueDate) && <AlertCircle className="h-3 w-3 inline ml-1" />}
                    יעד: {new Date(task.dueDate).toLocaleDateString('he-IL')}
                  </span>
                  {task.caseId && <span>תיק: {task.caseId}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 mr-3">
                <Badge variant={task.status === 'in-progress' ? 'default' : 'secondary'} className="text-xs">
                  {task.status === 'pending' ? 'ממתין' : 'בביצוע'}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => handleStatusChange(task.id, task.status === 'pending' ? 'in-progress' : 'completed')}
                  title={task.status === 'pending' ? 'התחל' : 'סיים'}
                >
                  {task.status === 'pending' ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                </Button>
              </div>
            </div>
          ))}
          {tasks.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              ועוד {tasks.length - 5} משימות...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
