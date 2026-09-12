import { IconType } from 'react-icons';
import { BsChatDots, BsFolder2, BsPerson } from 'react-icons/bs';

export interface NavItem {
  id: 'chat' | 'drive' | 'profile';
  label: string;
  to: string;
  icon: IconType;
}

// Cấu hình dùng chung cho cả Sidebar (Desktop) và BottomNav (Mobile)
export const WORKSPACE_NAV_ITEMS: NavItem[] = [
  { id: 'chat', label: 'Chat', to: '/', icon: BsChatDots },
  { id: 'drive', label: 'Drive', to: '/drive', icon: BsFolder2 },
  { id: 'profile', label: 'Profile', to: '/profile', icon: BsPerson },
];
