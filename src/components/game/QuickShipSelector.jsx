import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Rocket } from 'lucide-react';
import { apiClient } from '../../apis/client';

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

export default function QuickShipSelector({ customization, onEquip }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customShips, setCustomShips] = useState([]);

  useEffect(() => {
    loadCustomShips();
  }, []);

  const loadCustomShips = async () => {
    try {
      // Fetch up to 100 ships, sorted by newest
      const ships = await apiClient.entities.Ship.list('-created_date', 100);
      
      let shipList = [];
      if (Array.isArray(ships)) {
        shipList = ships;
      } else if (ships && Array.isArray(ships.items)) {
        shipList = ships.items;
      }
      
      const activeShips = shipList.filter(ship => ship.is_active !== false);
      setCustomShips(activeShips);
    } catch (e) {
      console.error('Failed to load custom ships', e);
      setCustomShips([]);
    }
  };

  const currentShip = customization?.equipped?.models || 'basic';
  const unlockedShips = customization?.unlocked?.models || ['basic'];

  const getCurrentShipName = () => {
    if (SHIP_MODELS[currentShip]) {
      return SHIP_MODELS[currentShip].name;
    }
    const customShip = customShips.find(s => s.model_type === currentShip);
    return customShip?.name || 'Unknown Ship';
  };

  const getCurrentShipIcon = () => {
    if (SHIP_MODELS[currentShip]) {
      return SHIP_MODELS[currentShip].icon;
    }
    return '🚀';
  };

  const handleShipSelect = (shipKey) => {
    onEquip('models', shipKey);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 gap-2"
      >
        <span className="text-xl">{getCurrentShipIcon()}</span>
        <div className="flex flex-col items-start">
          <span className="text-xs opacity-70">Current Ship</span>
          <span className="font-bold">{getCurrentShipName()}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <Card className="absolute top-full mt-2 right-0 z-50 w-64 bg-gray-900 border-cyan-500/30 shadow-2xl">
            <CardContent className="p-2 max-h-96 overflow-y-auto">
              <div className="space-y-1">
                {Object.entries(SHIP_MODELS)
                  .filter(([key]) => unlockedShips.includes(key))
                  .map(([key, data]) => (
                    <button
                      key={key}
                      onClick={() => handleShipSelect(key)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                        currentShip === key
                          ? 'bg-cyan-500/20 border border-cyan-500'
                          : 'hover:bg-gray-800 border border-transparent'
                      }`}
                    >
                      <span className="text-2xl">{data.icon}</span>
                      <span className="text-white font-medium">{data.name}</span>
                    </button>
                  ))}

                {customShips
                  .filter(ship => unlockedShips.includes(ship.model_type))
                  .map(ship => (
                    <button
                      key={ship.model_type}
                      onClick={() => handleShipSelect(ship.model_type)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                        currentShip === ship.model_type
                          ? 'bg-cyan-500/20 border border-cyan-500'
                          : 'hover:bg-gray-800 border border-transparent'
                      }`}
                    >
                      {ship.image_url ? (
                        <img src={ship.image_url} alt={ship.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <span className="text-2xl">🚀</span>
                      )}
                      <div className="flex flex-col items-start">
                        <span className="text-white font-medium">{ship.name}</span>
                        {ship.rarity && ship.rarity !== 'common' && (
                          <span className={`text-xs ${
                            ship.rarity === 'legendary' ? 'text-yellow-400' :
                            ship.rarity === 'epic' ? 'text-purple-400' :
                            'text-blue-400'
                          }`}>
                            {ship.rarity}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
