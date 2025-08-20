// C:\Users\vizir\halal-marriage\src\components\MediaUpload.tsx
import React, { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Upload, X, Play, Image as ImageIcon, Loader2 } from 'lucide-react';

interface MediaUploadProps {
  onMediaUpdate: (photos: string[], video?: string) => void;
  /** Optionally preload previously saved media */
  initialPhotos?: string[];
  initialVideo?: string;
}

const MAX_PHOTOS = 10;
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 50;
const BUCKET = 'profile-media';

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onMediaUpdate,
  initialPhotos = [],
  initialVideo = '',
}) => {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [video, setVideo] = useState<string>(initialVideo);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unique IDs in case this mounts more than once
  const uid = useId();
  const photoInputId = `photo-upload-${uid}`;
  const videoInputId = `video-upload-${uid}`;

  // Refs to click() programmatically
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Keep internal state in sync with incoming props
  useEffect(() => setPhotos(initialPhotos), [initialPhotos]);
  useEffect(() => setVideo(initialVideo), [initialVideo]);

  // ---------- helpers ----------
  const getUserId = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const user = data.user;
    if (!user) throw new Error('You must be logged in to upload.');
    return user.id;
  };

  const fileExt = (name: string) => name.split('.').pop()?.toLowerCase() || 'bin';

  /** Convert a public URL to a path inside the bucket */
  const pathFromPublicUrl = (publicUrl: string) => {
    try {
      const u = new URL(publicUrl);
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const i = u.pathname.indexOf(marker);
      if (i === -1) return null;
      return decodeURIComponent(u.pathname.slice(i + marker.length));
    } catch {
      return null;
    }
  };

  /** Best-effort delete from storage (won’t throw to UI) */
  const deleteFromStorage = async (publicUrl: string) => {
    const path = pathFromPublicUrl(publicUrl);
    if (!path) return;
    try {
      await supabase.storage.from(BUCKET).remove([path]);
    } catch {
      // swallow; we don't want to block UI on cleanup
    }
  };

  /** Centralized upload with strong validation and clear errors */
  const uploadFile = async (file: File, kind: 'photo' | 'video'): Promise<string | null> => {
    setError(null);

    // Quick validations
    if (kind === 'photo' && !file.type.startsWith('image/')) {
      setError('Please select image files only.');
      return null;
    }
    if (kind === 'video' && !file.type.startsWith('video/')) {
      setError('Please select a video file.');
      return null;
    }
    const maxMB = kind === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (file.size > maxMB * 1024 * 1024) {
      setError(`${kind === 'video' ? 'Video' : 'Image'} is too large. Max ${maxMB}MB.`);
      return null;
    }

    let userId: string;
    try {
      userId = await getUserId();
    } catch (e: any) {
      setError(e?.message || 'Auth error. Please sign in again.');
      return null;
    }

    const ext = fileExt(file.name);
    const name = `${kind}-${userId}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const folder = kind === 'photo' ? 'photos' : 'videos';
    const path = `${userId}/${folder}/${name}`;

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          upsert: false,
          cacheControl: '3600',
          contentType: file.type || (kind === 'video' ? 'video/mp4' : undefined),
        });

      if (error) {
        const msg = (error as any)?.message || String(error);
        if (/row-level security|not authorized|privileges/i.test(msg)) {
          setError(
            'Upload blocked by storage policy. Ensure INSERT on storage.objects allows paths starting with your user id (e.g., auth.uid() || \'/%\').'
          );
        } else {
          setError(msg);
        }
        console.error('Storage upload error:', error);
        return null;
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
      return pub.publicUrl;
    } catch (e: any) {
      const msg = e?.message || 'Upload failed.';
      setError(msg);
      console.error('Upload exception:', e);
      return null;
    }
  };

  // ---------- handlers ----------
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= MAX_PHOTOS) {
      setError(`You can upload up to ${MAX_PHOTOS} photos.`);
      event.currentTarget.value = '';
      return;
    }

    setPhotoUploading(true);
    setError(null);

    try {
      const remaining = Math.max(0, MAX_PHOTOS - photos.length);
      const selected = Array.from(files).slice(0, remaining);

      const urls = await Promise.all(selected.map((f) => uploadFile(f, 'photo')));
      const newOnes = urls.filter((u): u is string => Boolean(u));

      const merged = Array.from(new Set([...photos, ...newOnes])).slice(0, MAX_PHOTOS);

      setPhotos(merged);
      onMediaUpdate(merged, video);
    } finally {
      setPhotoUploading(false);
      event.currentTarget.value = ''; // allow re-select
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setVideoUploading(true);
    setError(null);

    try {
      const url = await uploadFile(file, 'video');
      if (url) {
        setVideo(url);
        onMediaUpdate(photos, url);
      }
    } finally {
      setVideoUploading(false);
      event.currentTarget.value = '';
    }
  };

  const removePhoto = async (index: number) => {
    const url = photos[index];
    deleteFromStorage(url);
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onMediaUpdate(newPhotos, video);
  };

  const removeVideo = async () => {
    if (video) deleteFromStorage(video);
    setVideo('');
    onMediaUpdate(photos, '');
  };

  const uploading = photoUploading || videoUploading;

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-blue-900 border-emerald-500/20">
      <CardHeader>
        <CardTitle className="text-emerald-400 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Profile Media
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-400 whitespace-pre-wrap break-words">
            {error}
          </div>
        )}

        {/* Hidden file inputs (triggered via refs) */}
        <input
          ref={photoInputRef}
          id={photoInputId}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          id={videoInputId}
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
        />

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Profile Pictures (1–{MAX_PHOTOS} photos)
          </label>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.map((photo, index) => (
                <div key={photo + index} className="relative group">
                  <img
                    src={photo}
                    alt={`Profile ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length < MAX_PHOTOS && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
              disabled={uploading}
              onClick={() => photoInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : `Add Photos (${photos.length}/${MAX_PHOTOS})`}
            </Button>
          )}
        </div>

        {/* Video */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Introduction Video (Optional)
          </label>

          {video ? (
            <div className="relative">
              <video src={video} className="w-full h-32 object-cover rounded-lg" controls />
              <button
                type="button"
                onClick={removeVideo}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                aria-label="Remove video"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
              disabled={uploading}
              onClick={() => videoInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : 'Add Video'}
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-400">
          All media will be reviewed for Islamic compliance before being visible to other users.
        </p>
      </CardContent>
    </Card>
  );
};
