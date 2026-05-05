import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../apis/client';
import ShipPreviewCanvas from '@/components/game/ShipPreviewCanvas';
import { Button } from '@/components/ui/button';
import { X, Rocket, Zap } from 'lucide-react';

const SHIP_MODELS = {
  black_triangle: { name: 'Black Triangle', icon: '🔺' },
  basic: { name: 'Phoenix', icon: '🔷' },
  delta: { name: 'Delta Wing', icon: '🔶' },
  arrow: { name: 'Arrow', icon: '⚡' },
  falcon: { name: 'Falcon', icon: '🦅' },
  viper: { name: 'Viper', icon: '🐍' },
  guardian: { name: 'Guardian', icon: '🛡️' },
  stealth: { name: 'Stealth', icon: '👻' }
};

export default function QuickLoadoutOverlay({ isOpen, onClose, customization, onEquip, upgrades }) {
  const [customShips, setCustomShips] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [customShipImages, setCustomShipImages] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadShips();
      setSelectedModel(customization?.equipped?.models || 'basic');
    }
  }, [isOpen, customization]);

  const loadShips = async () => {
    try {
      const ships = await apiClient.entities.Ship.list('-created_date', 100);
      let shipList = [];
      if (Array.isArray(ships)) {
        shipList = ships;
      } else if (ships && Array.isArray(ships.items)) {
        shipList = ships.items;
      }
      
      const activeShips = shipList.filter(ship => ship.is_active !== false);
      setCustomShips(activeShips);

      // Preload images
      const images = {};
      for (const ship of activeShips) {
        if (ship.image_url) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = ship.image_url;
          images[ship.model_type] = img;
        }
      }
      setCustomShipImages(images);
    } catch (e) {
      console.error("Failed to load ships", e);
    }
  };

  const unlockedModels = customization?.unlocked?.models || ['basic'];
  
  // Combine standard and custom unlocked ships
  const allUnlockedShips = [
    ...Object.keys(SHIP_MODELS).filter(k => unlockedModels.includes(k)).map(k => ({
      id: k,
      name: SHIP_MODELS[k].name,
      type: 'standard',
      rarity: 'common'
    })),
    ...customShips.filter(s => unlockedModels.includes(s.model_type)).map(s => ({
      id: s.model_type,
      name: s.name,
      type: 'custom',
      rarity: s.rarity,
      imageUrl: s.image_url
    }))
  ];

  const handleEquip = () => {
    if (selectedModel) {
      onEquip('models', selectedModel);
      onClose();
    }
  };

  const currentColors = customization?.equipped?.colors || { primary: '#00ffff', secondary: '#0088ff', accent: '#004488' };
  
  // Get color values if it's a key or object
  // Assuming customization.equipped.colors is a key like 'cyan', we need the actual colors
  // But wait, Game.js passes customization.equipped.colors which is a key string usually.
  // Game.js calculates colors for GameCanvas but passes raw customization to children.
  // We need to fetch color schemes map. 
  // Let's assume passed customization has colors object or we use a default if it's a string.
  // Actually, we should look at how Game.js handles it. 
  // In Gallery, `getShipColors` is used. We can replicate standard colors map here or just default to cyan if string.
  
  const COLOR_SCHEMES = {
    cyan: { name: 'Cyber Cyan', colors: { primary: '#00f0ff', secondary: '#0088ff', accent: '#004488', aura: 'rgba(0, 240, 255, 0.3)' } },
    red: { name: 'Crimson Fury', colors: { primary: '#ff0055', secondary: '#ff5500', accent: '#aa0000', aura: 'rgba(255, 0, 55, 0.3)' } },
    green: { name: 'Toxic Green', colors: { primary: '#00ff55', secondary: '#00aa33', accent: '#005511', aura: 'rgba(0, 255, 85, 0.3)' } },
    gold: { name: 'Solar Gold', colors: { primary: '#ffd700', secondary: '#ffaa00', accent: '#cc8800', aura: 'rgba(255, 215, 0, 0.3)' } },
    purple: { name: 'Void Purple', colors: { primary: '#aa00ff', secondary: '#6600cc', accent: '#440088', aura: 'rgba(170, 0, 255, 0.3)' } },
    white: { name: 'Pure White', colors: { primary: '#ffffff', secondary: '#cccccc', accent: '#999999', aura: 'rgba(255, 255, 255, 0.3)' } },
    pink: { name: 'Neon Pink', colors: { primary: '#ff00ff', secondary: '#cc00cc', accent: '#880088', aura: 'rgba(255, 0, 255, 0.3)' } },
    orange: { name: 'Blaze Orange', colors: { primary: '#ff6600', secondary: '#ff3300', accent: '#cc2200', aura: 'rgba(255, 102, 0, 0.3)' } },
  };

  const getColors = (val) => {
    if (typeof val === 'object' && val !== null) return val;
    return COLOR_SCHEMES[val]?.colors || COLOR_SCHEMES['cyan'].colors;
  };

  const effectiveColors = getColors(customization?.equipped?.colors);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900/90 border border-cyan-500/30 rounded-2xl w-[800px] h-[500px] shadow-2xl overflow-hidden flex"
      >
        {/* Left: List */}
        <div className="w-1/3 border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-cyan-400" />
              SELECT SHIP
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {allUnlockedShips.map(ship => (
              <button
                key={ship.id}
                onClick={() => setSelectedModel(ship.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${
                  selectedModel === ship.id 
                    ? 'bg-cyan-500/20 border border-cyan-500 text-white' 
                    : 'bg-black/20 hover:bg-white/5 border border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <div className="w-8 h-8 flex items-center justify-center bg-black/40 rounded">
                  {ship.imageUrl ? (
                    <img src={ship.imageUrl} className="w-full h-full object-contain" alt="" />
                  ) : (
                    <span className="text-xl">🚀</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{ship.name}</div>
                  <div className="text-xs opacity-70 capitalize">{ship.rarity}</div>
                </div>
                {customization?.equipped?.models === ship.id && (
                  <Zap className="w-4 h-4 text-cyan-400 fill-current" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="w-2/3 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 to-black">
           <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex-1 flex items-center justify-center relative">
            <div className="w-full h-full absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5980?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <ShipPreviewCanvas 
                model={selectedModel}
                colors={effectiveColors}
                trail={customization?.equipped?.trails}
                effect={customization?.equipped?.effects}
                accessory={customization?.equipped?.accessories}
                customShipImage={customShipImages[selectedModel]}
                size={350}
                animated={true}
              />
            </div>
          </div>

          <div className="p-6 border-t border-white/10 bg-black/40 flex justify-between items-center">
             <div>
                <div className="text-sm text-gray-400">Current Loadout</div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                   {allUnlockedShips.find(s => s.id === selectedModel)?.name || 'Unknown Ship'}
                </div>
             </div>
             <Button 
               onClick={handleEquip}
               className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-6 text-lg font-bold shadow-lg shadow-cyan-500/20"
               disabled={customization?.equipped?.models === selectedModel}
             >
               {customization?.equipped?.models === selectedModel ? 'EQUIPPED' : 'DEPLOY SHIP'}
             </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
