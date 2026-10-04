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
  MessageCircleDashed,
  Waves,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCareSpace } from '../../contexts/CareSpaceContext';

export const navigationItems = [
  { name: 'Tổng quan',         href: '/',          icon: Home },
  { name: 'Cảm xúc',          href: '/mood',       icon: Smile },
  { name: 'Địa điểm món ăn',  href: '/foods',      icon: Utensils },
  { name: 'Lịch sự kiện',     href: '/schedules',  icon: Calendar },
  { name: 'Giữ ngọn lửa nhỏ', href: '/love-notes', icon: Heart },
  { name: 'Kỷ niệm',          href: '/memories',   icon: ImageIcon },
  { name: 'Chat',             href: '/chat',       icon: MessageCircleDashed },
  { name: 'Cài đặt',          href: '/settings',   icon: Settings },
];

export const Sidebar = () => {
  const { careSpace } = useCareSpace();

  return (
    <aside className="relative z-20 m-3 hidden w-[16rem] flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white/68 shadow-nav backdrop-blur-2xl md:flex">
      {/* Logo / Brand */}
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-brand-house via-brand to-brand-uplift shadow-frap-base">
            <Waves className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
            <Heart className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-coral text-coral" />
          </div>
          <div className="min-w-0">
            <p className="ui-kicker text-brand-accent">Our little tide</p>
            <h1 className="truncate font-display text-[19px] font-semibold leading-tight text-brand-house italic">
              {careSpace?.name || 'Friend Care'}
            </h1>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-brand-light to-transparent" />

      {/* Section label */}
      <p className="px-5 pb-1.5 pt-4 text-[10.5px] font-bold tracking-[0.08em] uppercase text-text-muted">
        Không gian chung
      </p>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3">
        {navigationItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-2.5 overflow-hidden rounded-[14px] px-3 py-2.5 text-[13px] font-semibold transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-brand-house to-brand-accent text-white shadow-frap-base'
                  : 'text-text-soft hover:bg-brand-pale hover:text-brand-house'
              )
            }
          >
            <item.icon className="h-[17px] w-[17px] shrink-0 transition-transform group-hover:scale-110" />
            <span>{item.name}</span>

            {/* Cactus accent dot on active – decorative */}
            {false && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cactus-light" />}
          </NavLink>
        ))}
      </nav>

      {/* Invite code card */}
      <div className="m-2.5 rounded-[18px] border border-brand-light/60 bg-gradient-to-br from-brand-pale to-cactus-pale/40 p-3.5">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-cactus" />
          <span className="section-title text-[11.5px] text-brand-house">Mời người thương</span>
        </div>
        <p className="text-[10.5px] leading-relaxed text-text-muted">Mã không gian</p>
        <div className="mt-1 font-mono text-[13px] font-bold tracking-[0.16em] text-brand">
          {careSpace?.invite_code || '••••••'}
        </div>
      </div>
    </aside>
  );
};
