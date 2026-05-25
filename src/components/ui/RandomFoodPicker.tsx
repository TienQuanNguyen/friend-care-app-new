import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Card } from './Card';
import { FoodPlace } from '../../types';
import { Utensils, X, MapPin, Sparkles } from 'lucide-react';
import { AnimatedCheck } from './AnimatedCheck';
import { MiniConfetti } from './MiniConfetti';

interface RandomFoodPickerProps {
  places: FoodPlace[];
  onMarkAsTried: (place: FoodPlace) => void;
}

export const RandomFoodPicker: React.FC<RandomFoodPickerProps> = ({ places, onMarkAsTried }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<FoodPlace | null>(null);

  const pickRandom = () => {
    if (places.length === 0) return;
    
    setIsPicking(true);
    setSelectedPlace(null);
    
    // Simulate thinking/roulette animation
    setTimeout(() => {
      // Prefer untried places
      const untried = places.filter(p => !p.tried);
      const pool = untried.length > 0 ? untried : places;
      const randomPlace = pool[Math.floor(Math.random() * pool.length)];
      
      setSelectedPlace(randomPlace);
      setIsPicking(false);
    }, 800);
  };

  const handleOpen = () => {
    if (places.length === 0) {
      alert("Chưa có món nào để chọn. Thêm vài địa điểm trước nhé.");
      return;
    }
    setIsOpen(true);
    pickRandom();
  };

  return (
    <>
      <Button 
        onClick={handleOpen}
        className="px-6 py-2.5 rounded-pill font-bold shadow-sm transition-all bg-white text-brand border border-brand hover:bg-brand-light flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Ăn gì giờ?
      </Button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              className="absolute inset-0 bg-canvas-dark/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm z-10"
            >
              <Card className="overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl text-brand flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Hôm nay ăn...
                  </h3>
                  <button onClick={() => setIsOpen(false)} className="text-text-soft hover:text-text-main">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
                  {isPicking ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Utensils className="w-12 h-12 text-brand-light" />
                    </motion.div>
                  ) : selectedPlace ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full"
                    >
                      <MiniConfetti />
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-brand-light shadow-md bg-canvas-cool">
                         <img 
                            src={selectedPlace.image_url || ''} 
                            alt={selectedPlace.food_name}
                            className="w-full h-full object-cover"
                         />
                      </div>
                      <h4 className="text-2xl font-bold text-text-main mb-2 leading-tight">
                        {selectedPlace.food_name}
                      </h4>
                      {selectedPlace.restaurant_name && (
                        <p className="text-brand-accent font-semibold mb-2">{selectedPlace.restaurant_name}</p>
                      )}
                      {(selectedPlace.district || selectedPlace.address) && (
                        <div className="flex items-center justify-center gap-1.5 text-sm text-text-soft mb-6">
                          <MapPin className="w-4 h-4 text-brand-house" />
                          <span>{selectedPlace.district} {selectedPlace.address && `- ${selectedPlace.address}`}</span>
                        </div>
                      )}
                      
                      <div className="flex gap-3 w-full">
                        <Button 
                          onClick={pickRandom} 
                          variant="outline" 
                          className="flex-1 rounded-xl"
                        >
                          Chọn lại
                        </Button>
                        <Button 
                          onClick={() => {
                            onMarkAsTried(selectedPlace);
                            setIsOpen(false);
                          }}
                          className="flex-1 rounded-xl bg-brand text-white flex items-center justify-center gap-2"
                        >
                          {!selectedPlace.tried && <AnimatedCheck size={16} color="#fff" />}
                          {selectedPlace.tried ? 'Đã ăn rồi' : 'Chốt luôn!'}
                        </Button>
                      </div>
                    </motion.div>
                  ) : null}
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
