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
      {/*
       * Top Bar
       *
       * iOS Safe Area: The top bar is positioned `top-3` on non-notch devices.
       * On notched iPhones / Dynamic Island, we use `top-[calc(0.75rem+env(safe-area-inset-top,0px))]`
       * so it floats BELOW the status bar area.
       *
       * Using inline style for the dynamic env() calc because Tailwind JIT
       * can't pre-generate arbitrary env() values reliably.
       */}
      <header
        style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        className="fixed left-3 right-3 z-30 flex h-13 items-center justify-between rounded-[18px] border border-white/85 bg-white/78 px-3 shadow-nav backdrop-blur-2xl"
      >
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
          className="-mr-0.5 rounded-xl p-2 text-brand-house transition-colors hover:bg-brand-pale active:bg-brand-pale"
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
            /*
             * Drawer top: accounts for safe-area-inset-top + navbar height (3.25rem) + gap (0.75rem each side)
             * Drawer bottom: accounts for iOS home indicator (safe-area-inset-bottom) + gap
             */
            style={{
              top: 'calc(3.25rem + 1.5rem + env(safe-area-inset-top, 0px))',
              bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
            }}
            className="absolute right-3 flex w-[min(19rem,calc(100vw-1.5rem))] flex-col space-y-0.5 overflow-y-auto rounded-[22px] border border-white/85 bg-white/92 p-2.5 shadow-nav"
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
                      : 'text-text-soft hover:bg-brand-pale hover:text-brand-house active:bg-brand-pale'
                  )
                }
              >
                <item.icon className="w-[17px] h-[17px] shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            ))}

            {/* Bottom home indicator spacer – rendered inside nav for context */}
            <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
          </nav>
        </div>
      )}
    </div>
  );
};
