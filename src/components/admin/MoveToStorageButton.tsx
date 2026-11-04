import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { uploadImageToStorage } from '@/lib/upload';
import { errorMessage } from '@/lib/db';

/** Copies a picture that lives on another website into our own storage bucket and returns the new address. */
export function MoveToStorageButton({ sourceUrl, folder, onDone }: { sourceUrl: string; folder: string; onDone: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(sourceUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('The picture could not be downloaded.');
      const blob = await res.blob();
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const file = new File([blob], `about.${ext}`, { type: blob.type || 'image/jpeg' });
      const { url } = await uploadImageToStorage(file, folder);
      onDone(url);
      setMsg('Saved to your storage. Remember to press Save.');
    } catch (e) {
      setMsg(errorMessage(e, 'Could not copy the picture. Upload it from your device instead.'));
    } finally { setBusy(false); }
  };
  return (
    <div className="mt-2">
      <button type="button" onClick={() => void run()} disabled={busy} className="btn-secondary text-xs inline-flex items-center gap-1.5">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Copy the current picture into our storage
      </button>
      {msg && <p className="text-xs text-gray-600 mt-1">{msg}</p>}
    </div>
  );
}
