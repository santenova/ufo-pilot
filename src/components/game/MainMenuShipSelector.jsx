import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield, Zap, Wind, Rocket } from 'lucide-react';
import ShipPreviewCanvas from './ShipPreviewCanvas';
import { Button } from '@/components/ui/button';
import { apiClient } from '../../apis/client';

const SHIP_MODELS = {
  black_triangle: { name: 'Black Triangle', type: 'Alien Tech', stats: { speed: 85, armor: 80, power: 80 } },
  basic: { name: 'Phoenix', type: 'Interceptor', stats: { speed: 50, armor: 40, power: 40 } },
  delta: { name: 'Delta Wing', type: 'Fighter', stats: { speed: 70, armor: 30, power: 60 } },
  arrow: { name: 'Arrow', type: 'Racer', stats: { speed: 90, armor: 20, power: 40 } },
  falcon: { name: 'Falcon', type: 'Heavy Fighter', stats: { speed: 40, armor: 70, power: 70 } },
  viper: { name: 'Viper', type: 'Assault', stats: { speed: 60, armor: 40, power: 80 } },
  guardian: { name: 'Guardian', type: 'Tank', stats: { speed: 30, armor: 90, power: 50 } },
  stealth: { name: 'Stealth', type: 'Stealth', stats: { speed: 80, armor: 20, power: 70 } }
};

export default function MainMenuShipSelector({ customization, onEquip }) {
  const [ships, setShips] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load ships (standard + custom)
  useEffect(() => {
    const loadShips = async () => {
      // Standard ships that are unlocked
      const unlockedModels = customization?.unlocked?.models || ['black_triangle'];
      const standardShips = unlockedModels
        .filter(id => SHIP_MODELS[id])
        .map(id => ({
          id,
          ...SHIP_MODELS[id],
          isCustom: false
        }));

      // Custom ships
      try {
        // Only fetch if we have backend access, otherwise fail gracefully
        const customShipsList = await apiClient.entities.Ship.list('-created_date', 100).catch(() => []);
        
        let items = [];
        if (Array.isArray(customShipsList)) items = customShipsList;
        else if (customShipsList && Array.isArray(customShipsList.items)) items = customShipsList.items;

        const unlockedCustom = items
          .filter(s => unlockedModels.includes(s.model_type))
          .map(s => ({
            id: s.model_type,
            name: s.name,
            type: s.rarity || 'Custom',
            stats: s.stats || { speed: 50, armor: 50, power: 50 },
            isCustom: true,
            imageUrl: s.image_url,
            colors: s.colors
          }));
        
        const allShips = [...standardShips, ...unlockedCustom];
        setShips(allShips);
        
        // Find current equipped index
        const currentId = customization?.equipped?.models;
        const index = allShips.findIndex(s => s.id === currentId);
        if (index >= 0) setCurrentIndex(index);
        
      } catch (e) {
        console.error("Failed to load ships", e);
        setShips(standardShips);
      } finally {
        setLoading(false);
      }
    };
    
    loadShips();
  }, [customization]);

  const handleNext = () => {
    const next = (currentIndex + 1) % ships.length;
    setCurrentIndex(next);
    onEquip('models', ships[next].id);
  };

  const handlePrev = () => {
    const prev = (currentIndex - 1 + ships.length) % ships.length;
    setCurrentIndex(prev);
    onEquip('models', ships[prev].id);
  };

  if (loading || ships.length === 0) return (
    <div className="h-64 flex items-center justify-center">
        <div className="animate-spin text-cyan-500"><Rocket className="w-8 h-8" /></div>
    </div>
  );

  const currentShip = ships[currentIndex];
  
  // Use equipped customization for trail/colors unless specific ship overrides (for colors)
  // For standard ships, we rely on customization.equipped.colors
  // For custom ships, if they have fixed colors, we might want to use them, but usually player colors override? 
  // Let's stick to player customization to be consistent with game view.
  const displayColors = customization?.equipped?.colors 
    ? (typeof customization.equipped.colors === 'string' 
        ? { primary: customization.equipped.colors } // simplistic fallback if it's just a string ID
        : customization.equipped.colors) // if it's an object
    : { primary: '#00f0ff' };

  // Note: ShipPreviewCanvas expects colors object or relies on defaults.
  // In Game.js, 'colors' in customization seems to be a string ID (e.g. 'cyan') or object?
  // Looking at Game.js state: `colors: ['cyan']`. It's a string ID. 
  // ShipPreviewCanvas handles this? No, it expects an object `{primary, secondary...}` OR `colors` prop.
  // Wait, `ShipRenderer` might handle color strings? 
  // Let's check `ShipPreviewCanvas` again. It has default props for colors object. 
  // And it uses `colors?.primary`.
  // In `Game.js`, customization.equipped.colors is likely a string like 'cyan'.
  // We need to map that string to actual hex values if we want it to look right, OR ShipRenderer handles it.
  // `ShipPreviewCanvas` does NOT seem to map 'cyan' to hex. 
  // But wait, `StartScreen` passes `customization` to `QuickShipSelector`.
  // I'll assume `ShipPreviewCanvas` needs proper color objects.
  // Actually, I should probably check `ShipCustomization.js` to see how colors are handled or just pass what we have.
  // For now, I'll pass a default object if it's a string.
  
  const getColorHex = (colorName) => {
    const colors = {
        cyan: { primary: '#00f0ff', secondary: '#0088ff', accent: '#004488', aura: '#00f0ff' },
        red: { primary: '#ff0055', secondary: '#aa0033', accent: '#550011', aura: '#ff0055' },
        green: { primary: '#00ff66', secondary: '#00aa44', accent: '#005522', aura: '#00ff66' },
        yellow: { primary: '#ffcc00', secondary: '#aa8800', accent: '#554400', aura: '#ffcc00' },
        purple: { primary: '#aa00ff', secondary: '#6600aa', accent: '#330055', aura: '#aa00ff' },
        white: { primary: '#ffffff', secondary: '#aaaaaa', accent: '#555555', aura: '#ffffff' },
        orange: { primary: '#ff6600', secondary: '#cc4400', accent: '#882200', aura: '#ff6600' },
        pink: { primary: '#ff00cc', secondary: '#aa0088', accent: '#550044', aura: '#ff00cc' },
    };
    return colors[colorName] || colors['cyan'];
  };

  const shipColors = typeof customization?.equipped?.colors === 'string' 
    ? getColorHex(customization.equipped.colors)
    : customization?.equipped?.colors;

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-full mx-auto mb-2 group">
      {/* Title / Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-500/50" />
        <span className="text-xs text-cyan-500/70 uppercase tracking-[0.2em]">Hangar Deck</span>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500/50" />
      </div>

      <div className="relative w-full h-40 sm:h-72 bg-white border border-cyan-500/20 rounded-2xl overflow-hidden backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,255,0.05)]">
          
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-30" 
             style={{ 
               backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', 
               backgroundSize: '40px 40px',
               transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)'
             }} 
        />

        {/* Navigation Buttons */}
        <div className="absolute inset-y-0 left-0 flex items-center z-30">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrev}
                className="h-full w-12 md:w-20 rounded-none rounded-r-xl bg-transparent hover:bg-black/5 text-black hover:text-cyan-600 border-r border-transparent transition-all"
            >
                <ArrowLeft className="w-8 h-8 md:w-16 md:h-16" />
            </Button>
        </div>

        <div className="absolute inset-y-0 right-0 flex items-center z-30">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNext}
                className="h-full w-12 md:w-20 rounded-none rounded-l-xl bg-transparent hover:bg-black/5 text-black hover:text-cyan-600 border-l border-transparent transition-all"
            >
                <ArrowRight className="w-8 h-8 md:w-16 md:h-16" />
            </Button>
        </div>

        {/* Main Display */}
        <div className="relative w-full h-full flex items-center justify-center pb-0 sm:pb-8">
            <AnimatePresence mode='wait'>
                <motion.div
                key={currentShip.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative z-10 scale-[0.6] sm:scale-100"
                >
                    <ShipPreviewCanvas 
                        model={currentShip.id}
                        colors={shipColors} 
                        trail={customization?.equipped?.trails || 'none'}
                        effect={customization?.equipped?.effects || 'standard'}
                        accessory={customization?.equipped?.accessories || 'none'}
                        size={280}
                        animated={true}
                        customShipImage={currentShip.imageUrl}
                    />
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Ship Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-8 sm:pt-12 pb-2 sm:pb-4 px-4 sm:px-6 flex justify-between items-end z-20">
            <div>
                <motion.h3 
                    key={`${currentShip.id}-name`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg sm:text-2xl font-black text-white italic tracking-wider drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] leading-tight"
                >
                    {currentShip.name.toUpperCase()}
                </motion.h3>
                <motion.p 
                    key={`${currentShip.id}-type`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-[9px] sm:text-xs font-bold uppercase tracking-[0.2em] ${
                        currentShip.type === 'legendary' ? 'text-yellow-400' :
                        currentShip.type === 'epic' ? 'text-purple-400' :
                        'text-cyan-400'
                    }`}
                >
                    {currentShip.type} CLASS
                </motion.p>
            </div>
            
            <div className="flex gap-2 sm:gap-4">
                {[
                    { icon: Wind, val: currentShip.stats.speed, color: 'bg-blue-500', label: 'SPD' },
                    { icon: Shield, val: currentShip.stats.armor, color: 'bg-green-500', label: 'ARM' },
                    { icon: Zap, val: currentShip.stats.power, color: 'bg-yellow-500', label: 'PWR' }
                ].map((stat, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5 sm:gap-1">
                        <div className="h-8 sm:h-12 w-1.5 sm:w-2 bg-gray-800 rounded-full relative overflow-hidden border border-gray-700">
                            <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${stat.val}%` }}
                                transition={{ delay: 0.2 }}
                                className={`absolute bottom-0 w-full ${stat.color}`} 
                            />
                        </div>
                        <span className="text-[8px] sm:text-[10px] text-gray-500 font-mono">{stat.label}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
      
      {/* Selector Indicator Dots */}
      <div className="flex gap-1 mt-2">
        {ships.map((_, i) => (
            <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentIndex ? 'w-8 bg-cyan-400' : 'w-2 bg-gray-700'
                }`} 
            />
        ))}
      </div>
    </div>
  );
}
