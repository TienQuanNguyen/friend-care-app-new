import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Smile, 
  Utensils, 
  Calendar, 
  Heart, 
  Image as ImageIcon, 
  Settings,
  MessageCircleDashed
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCareSpace } from '../../contexts/CareSpaceContext';

export const navigationItems = [
  { name: 'Tổng quan', href: '/', icon: Home },
  { name: 'Cảm xúc', href: '/mood', icon: Smile },
  { name: 'Địa điểm món ăn', href: '/foods', icon: Utensils },
  { name: 'Lịch sự kiện', href: '/schedules', icon: Calendar },
  { name: 'Giữ ngọn lửa nhỏ', href: '/love-notes', icon: Heart },
  // { name: 'Chat', href: '/chat', icon: MessageCircleDashed },
  { name: 'Cài đặt', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const { careSpace } = useCareSpace();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-canvas-dark shadow-nav z-20">
      <div className="p-6 h-20 flex items-center justify-start border-b border-canvas-dark">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand to-brand-accent flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <h1 className="text-lg font-bold text-text-main tracking-tight">
            {careSpace?.name || 'Friend Care'}
          </h1>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-card-sm transition-all duration-200 text-sm font-medium",
              isActive
                ? "bg-brand-light text-brand-accent font-semibold shadow-sm"
                : "text-text-soft hover:bg-canvas-cool hover:text-text-main"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
