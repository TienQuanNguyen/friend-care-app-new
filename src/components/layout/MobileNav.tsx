import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Heart, Menu, Waves, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { navigationItems } from './Sidebar';
import { useCareSpace } from '../../contexts/CareSpaceContext';

export const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { careSpace } = useCareSpace();

  return (
    <div className="md:hidden">
      {/* Top Bar */}
      <header className="fixed left-3 right-3 top-3 z-30 flex h-13 items-center justify-between rounded-[18px] border border-white/85 bg-white/78 px-3 shadow-nav backdrop-blur-2xl">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-brand-house to-brand-accent">
            <Waves className="h-3.5 w-3.5 text-white" />
            <Heart className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-coral text-coral" />
          </div>
          <h1 className="truncate font-display text-[18px] font-semibold italic text-brand-house">
            {careSpace?.name || 'Friend Care'}
          </h1>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="-mr-0.5 rounded-xl p-2 text-brand-house transition-colors hover:bg-brand-pale"
          aria-label={isOpen ? 'Đóng menu' : 'Mở menu'}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Drawer overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-brand-house/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <nav
            className="absolute bottom-3 right-3 top-18 flex w-[min(19rem,calc(100vw-1.5rem))] flex-col space-y-0.5 overflow-y-auto rounded-[22px] border border-white/85 bg-white/90 p-2.5 shadow-nav"
            onClick={(e) => e.stopPropagation()}
          >
            {navigationItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[13px] font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-brand-house to-brand-accent text-white shadow-frap-base'
                      : 'text-text-soft hover:bg-brand-pale hover:text-brand-house'
                  )
                }
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};
