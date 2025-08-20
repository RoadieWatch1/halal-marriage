import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function QuickUpload() {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErr(null);

      // must be logged in to upload
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData.user;
      if (!user) throw new Error('You must be logged in to upload.');

      // put files under {userId}/...
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar-${crypto.randomUUID()}.${ext}`;

      const { data, error } = await supabase.storage
        .from('profile-media')
        .upload(path, file, { upsert: false });

      if (error) throw error;

      const { data: pub } = supabase.storage
        .from('profile-media')
        .getPublicUrl(data.path);

      setUrl(pub.publicUrl);
    } catch (e: any) {
      setErr(e?.message || 'Upload failed.');
    }
  }

  return (
    <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
      <input type="file" accept="image/*" onChange={onFile} />
      {err && <p style={{ color: 'red' }}>{err}</p>}
      {url && <p><a href={url} target="_blank" rel="noreferrer">Open uploaded image</a></p>}
    </div>
  );
}
