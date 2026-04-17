export interface AvatarChangePayload {
  file: File | null;
  previewUrl: string | null;
}

export interface AvatarTemplateProps {
  avatarUrl?: string;
  fallback?: string;
  onAvatarChange?: (payload: AvatarChangePayload) => void | Promise<void>;
}

export interface UseAvatarProps {
  initialAvatarUrl?: string | null;
  onAvatarChange?: (payload: AvatarChangePayload) => void | Promise<void>;
  maxFileSizeBytes?: number;
}
