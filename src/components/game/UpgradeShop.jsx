import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Heart, Zap, Clock, Palette, X, Coins, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ShipCustomization from './ShipCustomization';
import SkillTree from './SkillTree';
import VolumeControl from './VolumeControl';

const UPGRADES = {
  health: {
    name: 'Extra Health',
    icon: Heart,
    description: 'Increase max health by 25',
    maxLevel: 10,
    baseCost: 50,
    color: 'text-red-400',
    bgColor: 'from-red-500/20 to-rose-500/20',
    borderColor: 'border-red-500/30'
  },
  damage: {
    name: 'Weapon Power',
    icon: Zap,
    description: 'Increase weapon damage by 25%',
    maxLevel: 10,
    baseCost: 75,
    color: 'text-yellow-400',
    bgColor: 'from-yellow-500/20 to-amber-500/20',
    borderColor: 'border-yellow-500/30'
  },
  powerDuration: {
    name: 'Power Efficiency',
    icon: Clock,
    description: 'Weapons consume 20% less power',
    maxLevel: 10,
    baseCost: 100,
    color: 'text-cyan-400',
    bgColor: 'from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-500/30'
  },
  speed: {
    name: 'Speed Thrusters',
    icon: Zap,
    description: 'Increase ship movement speed',
    maxLevel: 10,
    baseCost: 120,
    color: 'text-orange-400',
    bgColor: 'from-orange-500/20 to-red-500/20',
    borderColor: 'border-orange-500/30'
  },
  shipSkin: {
    name: 'Ship Skins',
    icon: Palette,
    description: 'Unlock new ship designs',
    maxLevel: 10,
    baseCost: 150,
    color: 'text-purple-400',
    bgColor: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30'
  },
  startingLevel: {
    name: 'Head Start',
    icon: Zap,
    description: 'Start game with higher weapon level',
    maxLevel: 10,
    baseCost: 200,
    color: 'text-emerald-400',
    bgColor: 'from-emerald-500/20 to-green-500/20',
    borderColor: 'border-emerald-500/30'
  },
  luck: {
    name: 'Fortune Hunter',
    icon: Coins,
    description: 'Increase coin drop rate',
    maxLevel: 10,
    baseCost: 250,
    color: 'text-yellow-400',
    bgColor: 'from-yellow-500/20 to-amber-500/20',
    borderColor: 'border-yellow-500/30'
  }
  };

export default function UpgradeShop({ 
  totalCoins, 
  upgrades, 
  customization, 
  onPurchase, 
  onPurchaseCustomization, 
  onEquipCustomization, 
  loadouts,
  maxLoadoutSlots,
  currentLoadout,
  onSaveLoadout,
  onLoadLoadout,
  onDeleteLoadout,
  onTestFlight,
  onPurchaseLoadoutSlot,
  onClose,
  onBulkPurchase,
  onDeductCoins,
  skillPoints = 0,
  unlockedSkills = [],
  onUnlockSkill,
  onAddDevCoins,
  volume,
  onVolumeChange
}) {
  const [selectedUpgrade, setSelectedUpgrade] = useState(null);
  const [activeTab, setActiveTab] = useState('upgrades');

  const getCost = (upgradeKey, levelOverride = null) => {
    const upgrade = UPGRADES[upgradeKey];
    const currentLevel = levelOverride !== null ? levelOverride : (upgrades[upgradeKey] || 0);
    // Increased multiplier from 1.5 to 1.8 for steeper price curve
    return Math.floor(upgrade.baseCost * Math.pow(1.8, currentLevel));
  };

  const calculateBuyAll = () => {
    let totalCost = 0;
    const nextUpgrades = { ...upgrades };
    let canBuyAny = false;

    Object.keys(UPGRADES).forEach(key => {
      const upgrade = UPGRADES[key];
      const currentLevel = upgrades[key] || 0;
      
      if (currentLevel < upgrade.maxLevel) {
        canBuyAny = true;
        totalCost += getCost(key);
        nextUpgrades[key] = currentLevel + 1;
      }
    });

    return { totalCost, nextUpgrades, canBuyAny };
  };

  const { totalCost: buyAllCost, nextUpgrades: buyAllUpgrades, canBuyAny: canBuyAll } = calculateBuyAll();

  const handleBuyAll = () => {
    if (totalCoins >= buyAllCost && canBuyAll) {
      onBulkPurchase(buyAllUpgrades, buyAllCost);
    }
  };

  const canAfford = (upgradeKey) => {
    const currentLevel = upgrades[upgradeKey] || 0;
    const upgrade = UPGRADES[upgradeKey];
    return totalCoins >= getCost(upgradeKey) && currentLevel < upgrade.maxLevel;
  };

  const isMaxLevel = (upgradeKey) => {
    const currentLevel = upgrades[upgradeKey] || 0;
    return currentLevel >= UPGRADES[upgradeKey].maxLevel;
  };

  const handlePurchase = (upgradeKey) => {
    if (canAfford(upgradeKey)) {
      onPurchase(upgradeKey, getCost(upgradeKey));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        className="bg-gradient-to-b from-gray-900 to-black border border-cyan-500/30 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-black text-white mb-2">SHOP</h2>
            <div 
              className="flex items-center gap-2 text-yellow-400 cursor-pointer hover:text-yellow-300 active:scale-95 transition-all select-none"
              onClick={onAddDevCoins}
              title="Dev Tool: Click to add 10k coins"
            >
              <Coins className="w-5 h-5" />
              <span className="text-xl font-bold">{totalCoins}</span>
              <span className="text-sm text-gray-400">coins available</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-3 bg-black/30">
            <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
            <TabsTrigger value="skills">Skill Tree</TabsTrigger>
            <TabsTrigger value="customization">Customization</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'upgrades' && (
          <>
          <div className="mb-4 flex justify-end">
            {canBuyAll && !Object.values(UPGRADES).every(u => (upgrades[Object.keys(UPGRADES).find(k => UPGRADES[k] === u)] || 0) >= u.maxLevel) && (
              <Button 
                onClick={handleBuyAll}
                disabled={totalCoins < buyAllCost}
                className={`
                  bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400
                  text-black font-bold border-2 border-yellow-300 shadow-[0_0_15px_rgba(255,200,0,0.3)]
                  transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(255,200,0,0.5)]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                `}
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-xs uppercase tracking-wider">Buy All Upgrades</span>
                    <span className="flex items-center gap-1 text-sm">
                      <Coins className="w-3 h-3" />
                      {buyAllCost.toLocaleString()}
                    </span>
                  </div>
                  <Zap className="w-5 h-5 fill-current animate-pulse" />
                </div>
              </Button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(UPGRADES).map(([key, upgrade]) => {
            const Icon = upgrade.icon;
            const currentLevel = upgrades[key] || 0;
            const cost = getCost(key);
            const affordable = canAfford(key);
            const maxed = isMaxLevel(key);

            return (
              <Card
                key={key}
                className={`bg-gradient-to-br ${upgrade.bgColor} border ${upgrade.borderColor} hover:scale-[1.02] transition-transform cursor-pointer ${
                  !affordable && !maxed ? 'opacity-60' : ''
                }`}
                onClick={() => !maxed && handlePurchase(key)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl bg-black/30 ${upgrade.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{upgrade.name}</CardTitle>
                        <p className="text-gray-400 text-sm mt-1">{upgrade.description}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Level</div>
                      <div className="flex gap-1 w-32">
                        {Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 rounded-full flex-1 ${
                              i < currentLevel ? upgrade.color.replace('text-', 'bg-') : 'bg-gray-700'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {currentLevel}/{upgrade.maxLevel}
                      </div>
                    </div>
                    <div>
                      {maxed ? (
                        <div className="text-green-400 font-bold flex items-center gap-1">
                          <Lock className="w-4 h-4" />
                          MAX
                        </div>
                      ) : (
                        <div className={`font-bold flex items-center gap-1 ${affordable ? 'text-yellow-400' : 'text-gray-500'}`}>
                          <Coins className="w-4 h-4" />
                          {cost}
                        </div>
                      )}
                    </div>
                  </div>
                  {!maxed && !affordable && (
                    <div className="text-xs text-red-400 mt-2">Not enough coins</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          </div>
          </>
          )}

          {activeTab === 'skills' && (
            <SkillTree
              skillPoints={skillPoints}
              unlockedSkills={unlockedSkills}
              onUnlockSkill={onUnlockSkill}
            />
          )}

          {activeTab === 'customization' && (
            <ShipCustomization
              totalCoins={totalCoins}
              customization={customization}
              onPurchase={onPurchaseCustomization}
              onEquip={onEquipCustomization}
              loadouts={loadouts}
              maxLoadoutSlots={maxLoadoutSlots}
              currentLoadout={currentLoadout}
              onSaveLoadout={onSaveLoadout}
              onLoadLoadout={onLoadLoadout}
              onDeleteLoadout={onDeleteLoadout}
              onTestFlight={onTestFlight}
              onPurchaseLoadoutSlot={onPurchaseLoadoutSlot}
              onDeductCoins={onDeductCoins}
            />
          )}

          {activeTab === 'upgrades' && (
          <div className="mt-6 text-center text-gray-500 text-sm">
          Tip: Upgrades are permanent and persist across all games!
          </div>
          )}
      </motion.div>
    </motion.div>
  );
}