import React, { useState, useEffect } from 'react';
import { apiClient } from '../apis/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Rocket, Sparkles, Paintbrush, Lock, Shield, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import ShipPreviewCanvas from '@/components/game/ShipPreviewCanvas';
import { SHIP_MODELS, COLOR_SCHEMES, TRAILS, WEAPON_EFFECTS, ACCESSORIES } from '@/components/game/ShipCustomization';

export default function Gallery() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [customization, setCustomization] = useState(null);
  const [customShips, setCustomShips] = useState([]);
  const [activeCategory, setActiveCategory] = useState('models');
  const [customShipImages, setCustomShipImages] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await apiClient.auth.me();
        setUserData(user);
        
        const userCustomization = user.game_customization || {
          unlocked: { models: ['basic'], trails: ['none'], effects: ['standard'], colors: ['cyan'], accessories: ['none'] },
          equipped: { models: 'basic', trails: 'none', effects: 'standard', colors: 'cyan', accessories: 'none' }
        };
        setCustomization(userCustomization);

        const ships = await apiClient.entities.Ship.list();
        let activeShips = [];
        if (Array.isArray(ships)) {
           activeShips = ships.filter(ship => ship.is_active !== false);
        } else if (ships && Array.isArray(ships.items)) {
           activeShips = ships.items.filter(ship => ship.is_active !== false);
        }
        setCustomShips(activeShips);

        // Preload custom ship images
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
        console.error('Failed to load gallery data', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleEquip = async (category, itemKey) => {
    const newEquipped = { ...customization.equipped, [category]: itemKey };
    let newCustomShipImageUrl = customization.customShipImageUrl;

    if (category === 'models') {
       const STANDARD_MODELS = Object.keys(SHIP_MODELS);
       if (!STANDARD_MODELS.includes(itemKey)) {
          // Find custom ship
          const ship = customShips.find(s => s.model_type === itemKey);
          if (ship && ship.image_url) {
             newCustomShipImageUrl = ship.image_url;
          } else {
             newCustomShipImageUrl = null;
          }
       } else {
          newCustomShipImageUrl = null;
       }
    }

    const newCustomization = {
       ...customization,
       equipped: newEquipped,
       customShipImageUrl: newCustomShipImageUrl
    };

    setCustomization(newCustomization);

    try {
       await apiClient.auth.updateMe({ game_customization: newCustomization });
    } catch (e) {
       console.error("Failed to equip item", e);
    }
  };

  const getUnlockedItems = (category) => {
    if (!customization?.unlocked) return [];
    
    // Get all unlocked keys for the category
    const unlockedKeys = [...(customization.unlocked[category] || [])];
    
    // For models, also include unlocked custom ships
    if (category === 'models') {
      const unlockedCustom = customShips
        .filter(s => isUnlocked('models', s.model_type))
        .map(s => s.model_type);
      
      // Merge unique
      unlockedCustom.forEach(k => {
        if (!unlockedKeys.includes(k)) unlockedKeys.push(k);
      });
    }
    
    return unlockedKeys;
  };

  const handleCycle = (direction, category = 'models') => {
    const unlockedItems = getUnlockedItems(category);
    if (unlockedItems.length <= 1) return;

    const currentItem = customization.equipped[category];
    let currentIndex = unlockedItems.indexOf(currentItem);
    
    if (currentIndex === -1) currentIndex = 0;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % unlockedItems.length;
    } else {
      newIndex = (currentIndex - 1 + unlockedItems.length) % unlockedItems.length;
    }

    handleEquip(category, unlockedItems[newIndex]);
  };

  const getShipName = (modelType) => {
    if (SHIP_MODELS[modelType]) return SHIP_MODELS[modelType].name;
    const custom = customShips.find(s => s.model_type === modelType);
    return custom ? custom.name : modelType;
  };

  const getShipColors = (colorKeyOrObj) => {
    if (typeof colorKeyOrObj === 'object' && colorKeyOrObj !== null) return colorKeyOrObj;
    return COLOR_SCHEMES[colorKeyOrObj]?.colors || COLOR_SCHEMES['cyan'].colors;
  };

  const isUnlocked = (category, item) => {
    return customization?.unlocked?.[category]?.includes(item) || false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-cyan-400 text-xl animate-pulse">Loading Gallery...</div>
      </div>
    );
  }

  const currentEquipped = customization.equipped;
  const currentColors = getShipColors(currentEquipped.colors);
  
  // Prepare current ship image if it's a custom one
  const currentCustomImage = customShipImages[currentEquipped.models] || null;

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Game')}>
            <Button variant="outline" size="icon" className="border-cyan-500/30 hover:bg-cyan-500/20">
              <ArrowLeft className="w-5 h-5 text-cyan-400" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              SHIP GALLERY
            </h1>
            <p className="text-gray-400">Showcase your fleet and unlocked technologies</p>
          </div>
        </div>

        {/* Current Loadout Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-black border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5980?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20"></div>
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl text-cyan-400 flex items-center gap-2">
              <Rocket className="w-6 h-6" />
              Current Flagship
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-center min-h-[400px]">

            {/* Navigation Arrows */}
            <button 
              onClick={() => handleCycle('prev')}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-cyan-500/20 text-white p-3 rounded-full border border-white/10 hover:border-cyan-500/50 transition-all z-20 backdrop-blur-sm"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <button 
              onClick={() => handleCycle('next')}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-cyan-500/20 text-white p-3 rounded-full border border-white/10 hover:border-cyan-500/50 transition-all z-20 backdrop-blur-sm"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            <motion.div 
              key={currentEquipped[activeCategory]} // Animate on change
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>
              <ShipPreviewCanvas
                model={currentEquipped.models}
                colors={currentColors}
                trail={currentEquipped.trails}
                effect={currentEquipped.effects}
                accessory={currentEquipped.accessories}
                customShipImage={currentCustomImage}
                size={400}
              />
            </motion.div>
              
              <div className="space-y-4 bg-black/50 backdrop-blur-md p-6 rounded-xl border border-white/10 min-w-[250px]">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Model</div>
                  <div className="text-xl font-bold text-white">{getShipName(currentEquipped.models)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Paint Job</div>
                  <div className="text-lg text-gray-300">{COLOR_SCHEMES[currentEquipped.colors]?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Engine Trail</div>
                  <div className="text-lg text-gray-300">{TRAILS[currentEquipped.trails]?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Weapon Effect</div>
                  <div className="text-lg text-gray-300">{WEAPON_EFFECTS[currentEquipped.effects]?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Accessory</div>
                  <div className="text-lg text-gray-300">{ACCESSORIES[currentEquipped.accessories]?.name}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats / Info */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Collection Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Ships Unlocked</span>
                   <span className="text-white">
                     {customization.unlocked.models.length} / {Object.keys(SHIP_MODELS).length + customShips.length}
                   </span>
                 </div>
                 <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-cyan-500" 
                     style={{ width: `${(customization.unlocked.models.length / (Object.keys(SHIP_MODELS).length + customShips.length)) * 100}%` }}
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Colors Unlocked</span>
                   <span className="text-white">
                     {customization.unlocked.colors.length} / {Object.keys(COLOR_SCHEMES).length}
                   </span>
                 </div>
                 <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-purple-500" 
                     style={{ width: `${(customization.unlocked.colors.length / Object.keys(COLOR_SCHEMES).length) * 100}%` }}
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Trails Unlocked</span>
                   <span className="text-white">
                     {customization.unlocked.trails?.length || 0} / {Object.keys(TRAILS).length}
                   </span>
                 </div>
                 <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-orange-500" 
                     style={{ width: `${((customization.unlocked.trails?.length || 0) / Object.keys(TRAILS).length) * 100}%` }}
                   />
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Collection Grid */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="bg-black/40 border border-gray-800">
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="trails">Trails</TabsTrigger>
            <TabsTrigger value="effects">Effects</TabsTrigger>
            <TabsTrigger value="accessories">Accessories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="models" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Standard Ships */}
              {Object.entries(SHIP_MODELS).map(([key, data]) => {
                const unlocked = isUnlocked('models', key);
                return (
                  <CollectionItem 
                    key={key}
                    name={data.name}
                    unlocked={unlocked}
                    isEquipped={currentEquipped.models === key}
                    onEquip={() => handleEquip('models', key)}
                    renderPreview={() => (
                      <ShipPreviewCanvas 
                        model={key} 
                        colors={unlocked ? currentColors : { primary: '#333333', secondary: '#222222', accent: '#111111' }}
                        size={120}
                        animated={unlocked}
                      />
                    )}
                  />
                );
              })}
              {/* Custom Ships */}
              {customShips.map((ship) => {
                 const unlocked = isUnlocked('models', ship.model_type);
                 return (
                  <CollectionItem 
                    key={ship.model_type}
                    name={ship.name}
                    unlocked={unlocked}
                    rarity={ship.rarity}
                    isEquipped={currentEquipped.models === ship.model_type}
                    onEquip={() => handleEquip('models', ship.model_type)}
                    renderPreview={() => (
                      <ShipPreviewCanvas 
                        model={ship.model_type} 
                        colors={unlocked ? currentColors : { primary: '#333333', secondary: '#222222', accent: '#111111' }}
                        size={120}
                        animated={unlocked}
                        customShipImage={customShipImages[ship.model_type]}
                      />
                    )}
                  />
                 );
              })}
            </div>
          </TabsContent>

          <TabsContent value="trails" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(TRAILS).map(([key, data]) => (
                <CollectionItem 
                  key={key}
                  name={data.name}
                  unlocked={isUnlocked('trails', key)}
                  isEquipped={currentEquipped.trails === key}
                  onEquip={() => handleEquip('trails', key)}
                  renderPreview={() => (
                    <ShipPreviewCanvas 
                      model={currentEquipped.models}
                      colors={currentColors}
                      trail={key}
                      size={120}
                      animated={true}
                      customShipImage={currentCustomImage}
                    />
                  )}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="effects" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {Object.entries(WEAPON_EFFECTS).map(([key, data]) => (
                <CollectionItem 
                  key={key}
                  name={data.name}
                  unlocked={isUnlocked('effects', key)}
                  isEquipped={currentEquipped.effects === key}
                  onEquip={() => handleEquip('effects', key)}
                  renderPreview={() => (
                    <ShipPreviewCanvas 
                      model={currentEquipped.models}
                      colors={currentColors}
                      effect={key}
                      size={120}
                      animated={true}
                      customShipImage={currentCustomImage}
                    />
                  )}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="accessories" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {Object.entries(ACCESSORIES).map(([key, data]) => (
                <CollectionItem 
                  key={key}
                  name={data.name}
                  unlocked={isUnlocked('accessories', key)}
                  isEquipped={currentEquipped.accessories === key}
                  onEquip={() => handleEquip('accessories', key)}
                  renderPreview={() => (
                    <ShipPreviewCanvas 
                      model={currentEquipped.models}
                      colors={currentColors}
                      accessory={key}
                      size={120}
                      animated={true}
                      customShipImage={currentCustomImage}
                    />
                  )}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CollectionItem({ name, unlocked, renderPreview, rarity, isEquipped, onEquip }) {
  return (
    <Card 
      onClick={() => unlocked && !isEquipped && onEquip()}
      className={`overflow-hidden border transition-all relative group
        ${unlocked ? 'bg-gray-900 border-gray-700 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10' : 'bg-black/50 border-gray-800 opacity-60'} 
        ${isEquipped ? 'border-cyan-500 ring-1 ring-cyan-500 bg-gray-900/80' : ''}
        ${unlocked && !isEquipped ? 'cursor-pointer transform hover:-translate-y-1' : ''}
      `}
    >
      <div className="h-32 flex items-center justify-center relative bg-black/20">
        {renderPreview()}
        
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
            <Lock className="w-8 h-8 text-gray-500" />
          </div>
        )}
        
        {isEquipped && (
          <div className="absolute top-2 right-2 bg-cyan-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-cyan-500/20 z-10 flex items-center gap-1">
            <Zap className="w-3 h-3 fill-current" /> ACTIVE
          </div>
        )}
        
        {unlocked && !isEquipped && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-10 backdrop-blur-[2px]">
            <div className="bg-cyan-500 text-black font-bold px-4 py-2 rounded-full transform scale-90 group-hover:scale-100 transition-transform shadow-xl shadow-cyan-500/20 flex items-center gap-2">
              <Rocket className="w-4 h-4" /> EQUIP
            </div>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-800 bg-black/40">
        <div className="flex items-center justify-between">
          <span className={`font-medium text-sm truncate pr-2 ${unlocked ? 'text-white' : 'text-gray-500'}`}>{name}</span>
          {rarity && rarity !== 'common' && (
             <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
               rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
               rarity === 'epic' ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30' :
               'bg-blue-500/20 text-blue-500 border border-blue-500/30'
             }`}>
               {rarity}
             </span>
          )}
        </div>
      </div>
    </Card>
  );
}
