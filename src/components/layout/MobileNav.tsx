import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { navigationItems } from './Sidebar';
import { useCareSpace } from '../../contexts/CareSpaceContext';

export const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { careSpace } = useCareSpace();

  return (
    <div className="md:hidden">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-canvas-dark shadow-nav z-30 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">FC</span>
          </div>
          <h1 className="text-lg font-bold text-text-main tracking-tight">
            {careSpace?.name || 'Friend Care'}
          </h1>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 -mr-2 text-text-main"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/20" onClick={() => setIsOpen(false)}>
          <nav 
            className="absolute top-16 right-0 bottom-0 w-64 bg-white shadow-card flex flex-col p-4 space-y-2 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {navigationItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-card-sm transition-all duration-200 text-sm font-medium",
                  isActive
                    ? "bg-brand-light text-brand-accent font-semibold shadow-sm"
                    : "text-text-soft hover:bg-canvas-cool hover:text-text-main"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};
