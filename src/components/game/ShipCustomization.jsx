import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Coins, Lock, Check, Sparkles, Rocket, Zap, Eye, Paintbrush, Upload, Palette, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ShipLoadout from './ShipLoadout';
import VinylEditor from './VinylEditor';
import AIShipDesigner from './AIShipDesigner';
import ShipPreviewCanvas from './ShipPreviewCanvas';
import { apiClient } from '../../apis/client';

// Ship models with stats
export const SHIP_MODELS = {
  basic: { name: 'Phoenix', cost: 0, stats: { speed: 1, handling: 1, durability: 1 } },
  delta: { name: 'Delta Wing', cost: 200, stats: { speed: 1.2, handling: 0.9, durability: 0.8 } },
  arrow: { name: 'Arrow', cost: 250, stats: { speed: 1.4, handling: 1.1, durability: 0.7 } },
  falcon: { name: 'Falcon', cost: 300, stats: { speed: 1, handling: 1.3, durability: 1 } },
  viper: { name: 'Viper', cost: 350, stats: { speed: 1.5, handling: 0.8, durability: 0.9 } },
  guardian: { name: 'Guardian', cost: 400, stats: { speed: 0.8, handling: 0.9, durability: 1.5 } },
  stealth: { name: 'Stealth', cost: 500, stats: { speed: 1.3, handling: 1.2, durability: 0.6 } }
};

// Color schemes (primary, secondary, accent)
export const COLOR_SCHEMES = {
  cyan: { name: 'Cyan Storm', cost: 0, colors: { primary: '#00f0ff', secondary: '#0088ff', accent: '#004488' } },
  crimson: { name: 'Crimson Fury', cost: 150, colors: { primary: '#ff0044', secondary: '#cc0033', accent: '#880022' } },
  emerald: { name: 'Emerald Blaze', cost: 150, colors: { primary: '#00ff88', secondary: '#00cc66', accent: '#008844' } },
  gold: { name: 'Golden Phoenix', cost: 200, colors: { primary: '#ffd700', secondary: '#ffaa00', accent: '#cc8800' } },
  violet: { name: 'Violet Shadow', cost: 200, colors: { primary: '#aa00ff', secondary: '#8800cc', accent: '#550088' } },
  arctic: { name: 'Arctic Frost', cost: 250, colors: { primary: '#88ffff', secondary: '#44dddd', accent: '#008888' } }
};

// Trails
export const TRAILS = {
  none: { name: 'None', cost: 0 },
  fire: { name: 'Fire Trail', cost: 100 },
  plasma: { name: 'Plasma Trail', cost: 150 },
  rainbow: { name: 'Rainbow Trail', cost: 200 },
  cosmic: { name: 'Cosmic Trail', cost: 250 },
  lightning: { name: 'Lightning Trail', cost: 300 }
};

// Weapon effects
export const WEAPON_EFFECTS = {
  standard: { name: 'Standard', cost: 0 },
  glow: { name: 'Enhanced Glow', cost: 100 },
  spark: { name: 'Electric Spark', cost: 150 },
  neon: { name: 'Neon Blast', cost: 200 },
  crystal: { name: 'Crystal Shards', cost: 250 },
  void: { name: 'Void Energy', cost: 300 }
};

// Accessories
export const ACCESSORIES = {
  none: { name: 'None', cost: 0 },
  antenna: { name: 'Radar Antenna', cost: 200 },
  wings: { name: 'Energy Wings', cost: 350 },
  shield: { name: 'Shield Generator', cost: 400 },
  booster: { name: 'Turbo Boosters', cost: 450 }
};

// Drones
export const DRONES = {
  none: { name: 'No Drone', cost: 0, description: 'No orbital support' },
  attack: { name: 'Attack Drone', cost: 2000, description: 'Auto-fires at nearby enemies', rarity: 'epic' },
  defense: { name: 'Shield Drone', cost: 2500, description: 'Blocks enemy projectiles', rarity: 'legendary' }
};

// HUD Themes
export const HUD_THEMES = {
  cyber: { name: 'Cyber (Default)', cost: 0, description: 'Standard holographic display' },
  retro: { name: 'Retro 8-Bit', cost: 1000, description: 'Green monochrome phosphor style', rarity: 'rare' },
  minimal: { name: 'Clean White', cost: 1500, description: 'Modern minimalist interface', rarity: 'epic' }
};

export default function ShipCustomization({ 
  totalCoins, 
  customization, 
  onPurchase, 
  onEquip,
  loadouts,
  maxLoadoutSlots,
  currentLoadout,
  onSaveLoadout,
  onLoadLoadout,
  onDeleteLoadout,
  onTestFlight,
  onPurchaseLoadoutSlot,
  onDeductCoins
}) {
  const [activeTab, setActiveTab] = useState('models');
  const [previewCustomization, setPreviewCustomization] = useState(null);
  const [customShips, setCustomShips] = useState([]);
  const [showAIDesigner, setShowAIDesigner] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Custom Color State
  const [customColors, setCustomColors] = useState({
    primary: '#ffffff',
    secondary: '#888888',
    accent: '#000000'
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadCustomShips();
  }, []);

  const loadCustomShips = async () => {
    try {
      const ships = await apiClient.entities.Ship.list();
      if (Array.isArray(ships)) {
        const activeShips = ships.filter(ship => ship.is_active !== false);
        setCustomShips(activeShips);
      } else if (ships && Array.isArray(ships.items)) {
        const activeShips = ships.items.filter(ship => ship.is_active !== false);
        setCustomShips(activeShips);
      } else {
        console.warn('Unexpected ship list format:', ships);
        setCustomShips([]);
      }
    } catch (e) {
      console.error('Failed to load custom ships', e);
      setCustomShips([]);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (category, item) => {
    return customization.unlocked[category]?.includes(item) || false;
  };

  const isEquipped = (category, item) => {
    return customization.equipped[category] === item;
  };

  const handlePurchase = (category, item, cost) => {
    if (totalCoins >= cost && !isUnlocked(category, item)) {
      onPurchase(category, item, cost);
    }
  };

  const handleEquip = (category, item) => {
    if (typeof item === 'object' || isUnlocked(category, item)) {
      onEquip(category, item);
    }
  };

  const handleCustomColorChange = (type, value) => {
    const newColors = { ...customColors, [type]: value };
    setCustomColors(newColors);
    handlePreview('colors', newColors);
  };

  const applyCustomColors = () => {
    onEquip('colors', customColors);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
      // We use a special model key for custom uploaded ships, but we need to pass the URL
      // Since onEquip mainly handles keys, we'll assume the parent component handles this
      // But based on Game.js, it updates customShipImageUrl when model changes.
      // We might need a way to tell Game.js "this is a custom user ship".
      // Let's rely on a callback for this specifically or update customization directly.
      
      // Actually Game.js expects customShipImageUrl in the customization object.
      // We can pass it via onEquip if we modify Game.js, but onEquip only updates 'equipped'.
      // Let's call a special prop or reuse onEquip with a special structure if possible.
      // Game.js has handleEquipCustomization which calculates customShipImageUrl.
      
      // Strategy: We'll assume the user wants to use this image with their CURRENT model, or a "custom" model.
      // To keep it simple, let's just update the customShipImageUrl directly if possible.
      // Since we can't easily change Game.js's handleEquipCustomization signature without reading it all again,
      // We will assume there is a prop 'onEquip' which updates the state.
      
      // Let's try to update the customization object directly via the parent?
      // ShipCustomization doesn't have onUpdate.
      
      // Alternative: Pass the URL as the "item" for a special category "customImage"?
      // No, let's stick to the request: "enable players to upload their own ship sprite".
      // We'll treat it as a model update where we pass the URL.
      // But Game.js expects model to be a string key.
      
      // Let's just alert the user for now that we uploaded it, and we need a way to save it.
      // We can use apiClient.auth.updateMe directly here!
      
      const user = await apiClient.auth.me();
      const newCustomization = {
        ...user.game_customization,
        customShipImageUrl: file_url
      };
      await apiClient.auth.updateMe({ game_customization: newCustomization });
      
      // Force reload/update
      window.location.reload(); // Simple but effective to refresh state
      
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreview = (category, item) => {
    setPreviewCustomization({
      ...customization,
      equipped: {
        ...customization.equipped,
        [category]: item
      }
    });
  };

  const clearPreview = () => {
    setPreviewCustomization(null);
  };

  const renderItemCard = (category, itemKey, itemData) => {
    const unlocked = isUnlocked(category, itemKey);
    const equipped = isEquipped(category, itemKey);
    const canAfford = totalCoins >= itemData.cost;
    const cost = itemData.cost;

    const rarityColors = {
      common: 'border-gray-700',
      rare: 'border-blue-500/50',
      epic: 'border-purple-500/50',
      legendary: 'border-yellow-500/50'
    };

    const borderClass = itemData.rarity ? rarityColors[itemData.rarity] : 'border-gray-700';

    return (
      <Card
        key={itemKey}
        className={`cursor-pointer transition-all ${
          equipped ? 'border-cyan-400 bg-cyan-500/10' : 
          unlocked ? 'border-green-500/30 hover:border-green-500/50' : 
          `${borderClass} opacity-60`
        }`}
        onMouseEnter={() => handlePreview(category, itemKey)}
        onMouseLeave={clearPreview}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-1">
              {itemData.name}
              {itemData.rarity && itemData.rarity !== 'common' && (
                <span className={`text-xs px-1 rounded ${
                  itemData.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                  itemData.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {itemData.rarity}
                </span>
              )}
            </span>
            {equipped && <Check className="w-4 h-4 text-cyan-400" />}
            {!unlocked && <Lock className="w-4 h-4 text-gray-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {itemData.shipData?.image_url && (
            <div className="mb-2 h-16 flex items-center justify-center bg-black/40 rounded">
              <img src={itemData.shipData.image_url} alt={itemData.name} className="max-h-14 max-w-full object-contain" />
            </div>
          )}
          {itemData.stats && (
            <div className="text-xs text-gray-400 mb-2 space-y-1">
              <div className="flex justify-between">
                <span>Speed:</span>
                <span>{(itemData.stats.speed * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Handling:</span>
                <span>{(itemData.stats.handling * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Durability:</span>
                <span>{(itemData.stats.durability * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
          {itemData.colors && (
            <div className="flex gap-1 mb-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: itemData.colors.primary }} />
              <div className="w-6 h-6 rounded" style={{ backgroundColor: itemData.colors.secondary }} />
              <div className="w-6 h-6 rounded" style={{ backgroundColor: itemData.colors.accent }} />
            </div>
          )}
          {!unlocked && cost > 0 ? (
            <Button
              size="sm"
              className="w-full"
              disabled={!canAfford}
              onClick={() => handlePurchase(category, itemKey, cost)}
            >
              <Coins className="w-3 h-3 mr-1" />
              {cost}
            </Button>
          ) : unlocked && !equipped ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleEquip(category, itemKey)}
            >
              Equip
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  const [showVinylEditor, setShowVinylEditor] = useState(false);

  const handleSaveVinyl = async (decals) => {
    // Save as currently equipped decal
    onEquip('decal', decals);
    // You might also want to save to a list of saved decals in a real app
    setShowVinylEditor(false);
  };

  const getResolvedColors = () => {
    const currentColors = (previewCustomization || customization).equipped.colors;
    if (typeof currentColors === 'string') {
      return COLOR_SCHEMES[currentColors]?.colors || COLOR_SCHEMES['cyan'].colors;
    }
    return currentColors || COLOR_SCHEMES['cyan'].colors;
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 bg-black/30">
          <TabsTrigger value="models">Ship & Colors</TabsTrigger>
          <TabsTrigger value="effects">Effects & Trails</TabsTrigger>
          <TabsTrigger value="loadouts">Loadouts</TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2"><Zap className="w-3 h-3" /> AI Lab</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          {/* Live Preview */}
          <Card className="bg-black/40 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 to-black rounded-lg relative overflow-hidden">
              <div className="relative z-10 scale-150 mb-4">
                <ShipPreviewCanvas
                  model={(previewCustomization || customization).equipped.models}
                  colors={getResolvedColors()}
                  trail={(previewCustomization || customization).equipped.trails}
                  effect={(previewCustomization || customization).equipped.effects}
                  accessory={(previewCustomization || customization).equipped.accessories}
                  customShipImage={(previewCustomization || customization).customShipImageUrl}
                  decals={(previewCustomization || customization).equipped.decal}
                  size={200}
                  animated={true}
                />
              </div>
              <div className="text-center z-10">
                <div className="text-xs text-gray-400 mb-2">
                  {previewCustomization ? 'Preview Mode' : 'Current Configuration'}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTestFlight(previewCustomization || customization)}
                >
                  <Rocket className="w-3 h-3 mr-1" />
                  Test Flight
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ship Models */}
          <div>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Ship Models
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(SHIP_MODELS).map(([key, data]) => renderItemCard('models', key, data))}
            </div>
          </div>

          {/* Custom Ships from Admin */}
          {customShips.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Custom Ships
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {customShips.map((ship) => renderItemCard('models', ship.model_type, {
                  name: ship.name,
                  cost: ship.cost || 0,
                  stats: ship.stats || { speed: 1, handling: 1, durability: 1 },
                  rarity: ship.rarity,
                  customShip: true,
                  shipData: ship
                }))}
              </div>
            </div>
          )}

          {/* Color Schemes */}
          <div>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Color Schemes
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {Object.entries(COLOR_SCHEMES).map(([key, data]) => renderItemCard('colors', key, data))}
            </div>

            {/* Custom Colors & Sprite */}
            <Card className="bg-black/40 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-purple-400">
                  <Palette className="w-4 h-4" />
                  Custom Workshop
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Custom Colors */}
                <div className="space-y-3">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custom Paint Job</h4>
                   <div className="flex flex-wrap gap-4">
                     <div className="space-y-1">
                       <Label className="text-xs text-gray-400">Primary</Label>
                       <div className="flex items-center gap-2">
                         <input 
                           type="color" 
                           value={customColors.primary}
                           onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                           className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                         />
                         <span className="text-xs font-mono">{customColors.primary}</span>
                       </div>
                     </div>
                     <div className="space-y-1">
                       <Label className="text-xs text-gray-400">Secondary</Label>
                       <div className="flex items-center gap-2">
                         <input 
                           type="color" 
                           value={customColors.secondary}
                           onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                           className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                         />
                         <span className="text-xs font-mono">{customColors.secondary}</span>
                       </div>
                     </div>
                     <div className="space-y-1">
                       <Label className="text-xs text-gray-400">Accent</Label>
                       <div className="flex items-center gap-2">
                         <input 
                           type="color" 
                           value={customColors.accent}
                           onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                           className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                         />
                         <span className="text-xs font-mono">{customColors.accent}</span>
                       </div>
                     </div>
                   </div>
                   <Button size="sm" onClick={applyCustomColors} className="w-full bg-purple-600 hover:bg-purple-700">
                     Apply Custom Colors
                   </Button>
                </div>

                <div className="h-px bg-white/10" />

                {/* Custom Sprite Upload */}
                <div className="space-y-3">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Upload Custom Ship Sprite</h4>
                   <div className="flex items-center gap-4">
                     <Button 
                        variant="outline" 
                        size="sm" 
                        className="relative overflow-hidden border-dashed"
                        disabled={isUploading}
                     >
                       {isUploading ? 'Uploading...' : 'Choose File'}
                       <input 
                         type="file" 
                         className="absolute inset-0 opacity-0 cursor-pointer" 
                         accept="image/*"
                         onChange={handleFileUpload}
                       />
                     </Button>
                     <span className="text-xs text-gray-500">
                       PNG/GIF (Max 2MB)
                     </span>
                   </div>
                   <p className="text-[10px] text-gray-500">
                     Upload a transparent PNG for best results. The image will replace your current ship model visuals.
                   </p>
                   </div>

                   <div className="h-px bg-white/10" />

                   {/* Custom Horizon Upload */}
                   <div className="space-y-3">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custom Horizon (Background)</h4>
                   <div className="flex items-center gap-4">
                     <Button 
                        variant="outline" 
                        size="sm" 
                        className="relative overflow-hidden border-dashed"
                        disabled={isUploading}
                     >
                       {isUploading ? 'Uploading...' : 'Choose Background'}
                       <input 
                         type="file" 
                         className="absolute inset-0 opacity-0 cursor-pointer" 
                         accept="image/*"
                         onChange={async (e) => {
                           const file = e.target.files[0];
                           if (!file) return;
                           setIsUploading(true);
                           try {
                             const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
                             const user = await apiClient.auth.me();
                             const newCustomization = {
                               ...user.game_customization,
                               customHorizonImageUrl: file_url
                             };
                             await apiClient.auth.updateMe({ game_customization: newCustomization });
                             window.location.reload();
                           } catch (error) {
                             console.error("Upload failed", error);
                           } finally {
                             setIsUploading(false);
                           }
                         }}
                       />
                     </Button>
                     <span className="text-xs text-gray-500">
                       JPG/PNG (Max 2MB)
                     </span>
                   </div>
                   <p className="text-[10px] text-gray-500">
                     Upload an image to replace the game background/horizon.
                   </p>
                   </div>

                   </CardContent>
                   </Card>
          </div>
        </TabsContent>

        <TabsContent value="drones" className="space-y-4">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Rocket className="w-4 h-4" />
            Combat Drones
          </h3>
          <p className="text-sm text-gray-400 mb-4">Deploy automated drones to assist you in combat.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(DRONES).map(([key, data]) => renderItemCard('drones', key, data))}
          </div>
        </TabsContent>

        <TabsContent value="hud" className="space-y-4">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            HUD Themes
          </h3>
          <p className="text-sm text-gray-400 mb-4">Customize your cockpit display interface.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(HUD_THEMES).map(([key, data]) => renderItemCard('hud', key, data))}
          </div>
        </TabsContent>

        <TabsContent value="effects" className="space-y-4">
          {/* Trails */}
          <div>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Engine Trails
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(TRAILS).map(([key, data]) => renderItemCard('trails', key, data))}
            </div>
          </div>

          {/* Weapon Effects */}
          <div>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Weapon Effects
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(WEAPON_EFFECTS).map(([key, data]) => renderItemCard('effects', key, data))}
            </div>
          </div>

          {/* Accessories */}
          <div>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Accessories
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(ACCESSORIES).map(([key, data]) => renderItemCard('accessories', key, data))}
            </div>
          </div>

          {/* Vinyl Editor */}
          <div>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Paintbrush className="w-4 h-4" />
              Custom Decals
            </h3>
            <Card className="bg-black/40 border-cyan-500/30">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-400 mb-4">Create custom vinyl decals for your ship. Currently equipped decal will be applied.</p>
                <div className="flex gap-2">
                  <Button onClick={() => setShowVinylEditor(true)} className="w-full">
                    <Paintbrush className="w-4 h-4 mr-2" />
                    Open Vinyl Editor
                  </Button>
                  {customization.equipped.decal && (
                    <Button 
                      onClick={() => onEquip('decal', null)} 
                      variant="destructive"
                      className="w-1/3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loadouts">
          <ShipLoadout
            customization={customization}
            loadouts={loadouts}
            maxLoadoutSlots={maxLoadoutSlots}
            currentLoadout={currentLoadout}
            onSaveLoadout={onSaveLoadout}
            onLoadLoadout={onLoadLoadout}
            onDeleteLoadout={onDeleteLoadout}
            onTestFlight={onTestFlight}
            totalCoins={totalCoins}
            onPurchaseLoadoutSlot={onPurchaseLoadoutSlot}
          />
        </TabsContent>

        <TabsContent value="ai">
             <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 bg-black/40 rounded-lg border border-cyan-500/20">
                <div className="w-24 h-24 rounded-full bg-cyan-500/20 flex items-center justify-center animate-pulse">
                    <Zap className="w-12 h-12 text-cyan-400" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-white mb-2">AI Ship Architect</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Design unique starships using advanced AI. Input your specifications and let the system generate blueprints, stats, and visuals.
                    </p>
                </div>
                <Button 
                    onClick={() => setShowAIDesigner(true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-6 text-lg"
                >
                    Launch Designer
                </Button>
             </div>
        </TabsContent>
      </Tabs>

      {showAIDesigner && (
        <AIShipDesigner 
            onClose={() => setShowAIDesigner(false)}
            totalCoins={totalCoins}
            cost={1000}
            onDeductCoins={onDeductCoins}
            onShipCreated={(ship) => {
                // Refresh custom ships or auto-equip
                onEquip('models', ship.model_type); // Auto equip new ship
                loadCustomShips(); // Reload list to show new ship
                setActiveTab('models'); // Go back to models
            }}
        />
      )}

      {showVinylEditor && (
        <VinylEditor
          onSave={handleSaveVinyl}
          onClose={() => setShowVinylEditor(false)}
          initialDecals={customization.equipped.decal || []}
        />
      )}
    </div>
  );
}
