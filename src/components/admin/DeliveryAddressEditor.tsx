import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/db';
import { updateOrderDeliveryAddress } from '@/lib/order-operations';

/** Lets staff set or correct an order's delivery address (orders converted from quotations start without one). */
export function DeliveryAddressEditor({ orderId, address, editable, onChanged }: { orderId: string; address: string | null; editable: boolean; onChanged: () => Promise<void> | void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(address || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (value.trim().length < 5) { toast({ title: 'Enter a fuller address', description: 'Include the area, street or building so the driver can find it.', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      await updateOrderDeliveryAddress(orderId, value.trim());
      toast({ title: 'Delivery address saved' });
      setEditing(false);
      await onChanged();
    } catch (e) { toast({ title: 'Address not saved', description: errorMessage(e, 'Please try again'), variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">Delivery address</p>
        {editable && !editing && <button type="button" className="btn-secondary" onClick={() => { setValue(address || ''); setEditing(true); }}>{address ? 'Edit' : 'Add address'}</button>}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea className="input w-full" rows={3} maxLength={500} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Delivery address" />
          <div className="flex gap-2">
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>Save address</button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <p className="text-gray-600 mt-1">{address || 'No delivery address recorded. Add one before this order can be dispatched.'}</p>
      )}
    </div>
  );
}
