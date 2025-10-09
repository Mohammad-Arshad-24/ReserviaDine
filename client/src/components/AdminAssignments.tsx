import React, { useEffect, useState } from 'react';
import localRestaurantsData from '../../../attached_assets/restaurants-list.json';
import { setRestaurantOwner, fetchRestaurantOwners } from '@/lib/firebase';

interface Props {
  onClose: () => void;
}

export default function AdminAssignments({ onClose }: Props) {
  const mod: any = localRestaurantsData as any;
  const items: any[] = (mod && (mod.default && mod.default.restaurants)) || (mod && mod.restaurants) || [];
  const [rows, setRows] = useState(items.map((r) => ({ name: r.name, email: (r.email || '').toLowerCase() })));
  const [remoteOwners, setRemoteOwners] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // load existing owners from DB to show current state
    (async () => {
      try {
        const map = await fetchRestaurantOwners();
        setRemoteOwners(map || {});
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const updateEmail = (i: number, email: string) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, email: (email || '').toLowerCase() } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // save each non-empty email to Firebase under restaurantOwners/{normalizedName}
      for (const r of rows) {
        const key = r.name;
        const em = (r.email || '').trim();
        if (em) {
          try { await setRestaurantOwner(key, em); } catch (e) { console.error('setRestaurantOwner failed', key, e); }
        }
      }
      // persist to localStorage for quick local fallback
      try { localStorage.setItem('local_restaurant_assignments', JSON.stringify(rows)); } catch (e) {}
      alert('Saved assignments to Firebase and localStorage.');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="w-full max-w-2xl bg-white p-6 rounded shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Manage Restaurant Assignments</h3>
          <div>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-auto">
          {rows.map((r, i) => (
            <div key={r.name} className="flex items-center gap-3 border-b py-2">
              <div className="w-48 font-medium">{r.name}</div>
              <input className="input flex-1" value={r.email || ''} onChange={(e) => updateEmail(i, e.target.value)} placeholder="owner email@example.com" />
              <div className="text-sm text-muted-foreground">DB: {(remoteOwners[r.name] || '')}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save to Firebase'}</button>
        </div>
      </div>
    </div>
  );
}
