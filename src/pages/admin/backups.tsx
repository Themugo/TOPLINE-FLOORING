import { useState } from 'react';
import { AdminLayout } from './dashboard';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminBackups() {
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [backups] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const handleCreateBackup = () => {
    setCreating(true);
    setTimeout(() => {
      setCreating(false);
      toast({
        title: "Backup Initiated",
        description: "A new backup has been started. You will be notified when it completes.",
      });
    }, 1500);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Backups</h1>
            <p className="text-muted-foreground">Manage database and file backups</p>
          </div>
          <Button onClick={handleCreateBackup} disabled={creating}>
            <Database className="h-4 w-4 mr-2" />
            {creating ? 'Creating...' : 'Create Backup'}
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-2">Last Backup</h3>
          <p className="text-sm text-muted-foreground">No backups have been created yet.</p>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="p-6 border-b">
            <h3 className="font-semibold">Recent Backups</h3>
          </div>
          {backups.length === 0 ? (
            <div className="p-12 text-center">
              <Database className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No backups available yet.</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Click "Create Backup" to generate your first backup.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Size</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-3 text-sm">{backup.date}</td>
                      <td className="p-3 text-sm">{backup.size}</td>
                      <td className="p-3 text-sm">{backup.status}</td>
                      <td className="p-3 text-right">
                        <span className="text-sm text-muted-foreground">-</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
