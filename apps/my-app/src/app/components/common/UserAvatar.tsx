import { useState, useEffect } from 'react';
import { getPreviewUrl } from '../../services/drive.service';

export const getAvatarUrl = (avatar?: string | null): string | null => {
  if (!avatar || typeof avatar !== 'string' || !avatar.trim()) return null;
  const trimmed = avatar.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return getPreviewUrl(trimmed);
};

// Mảng màu gradient phân bổ mượt mà theo tên người dùng
const GRADIENTS = [
  'from-indigo-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
];

const getGradientForName = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
};

interface UserAvatarProps {
  name?: string;
  avatar?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-16 h-16 text-xl',
};

export const UserAvatar = ({
  name = 'U',
  avatar,
  size = 'md',
  className = '',
}: UserAvatarProps) => {
  const [hasError, setHasError] = useState(false);
  const avatarUrl = getAvatarUrl(avatar);

  // Reset error khi avatar url thay đổi
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const initial = (name.trim() || 'U').charAt(0).toUpperCase();
  const gradientClass = getGradientForName(name || 'U');

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt=""
        onError={() => setHasError(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 border border-slate-200/80 shadow-xs ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-tr ${gradientClass} text-white font-bold flex items-center justify-center shrink-0 shadow-xs select-none ${className}`}
    >
      {initial}
    </div>
  );
};

export default UserAvatar;
