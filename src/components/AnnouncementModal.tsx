import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { announcementService } from '../services/announcementService';
import { AppAnnouncement } from '../types';
import { Megaphone } from 'lucide-react';

export const AnnouncementModal: React.FC = () => {
  const { user, loading } = useAuth();
  const [announcement, setAnnouncement] = useState<AppAnnouncement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (loading) return;

    if (!user) {
      setAnnouncement(null);
      setIsVisible(false);
      return;
    }

    const fetchAnnouncement = async () => {
      try {
        const active = await announcementService.getActiveAnnouncement();
        const hasSeenInSession = active
          ? announcementService.hasSeenAnnouncement(active.id)
          : false;
        const shouldShow = Boolean(active && !hasSeenInSession);

        if (import.meta.env.DEV) {
          console.debug('[Announcement]', {
            activeAnnouncementId: active?.id,
            hasSeenInSession,
            shouldShow,
          });
        }

        if (!isMounted) return;

        setAnnouncement(active);
        setIsVisible(shouldShow);
      } catch (err) {
        console.warn('[AnnouncementModal] Failed to fetch announcement:', err);
      }
    };

    fetchAnnouncement();

    return () => {
      isMounted = false;
    };
  }, [loading, user?.id]);

  const handleDismiss = () => {
    if (announcement) {
      announcementService.markAnnouncementSeen(announcement.id);
    }
    setIsVisible(false);
  };

  if (!announcement || !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 z-10"
          >
            {/* Icon */}
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-3">
                <Megaphone className="w-7 h-7 text-brand-accent" />
              </div>
              <h2 className="text-xl font-bold text-brand">
                {announcement.title || 'Thông báo'}
              </h2>
            </div>

            {/* Content */}
            <div className="space-y-4 text-text-main text-[15px] leading-relaxed mb-6">
              {announcement.message.split('\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="w-full bg-brand text-white font-bold py-3 px-4 rounded-xl hover:bg-brand-accent transition-colors"
            >
              Đã hiểu
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
