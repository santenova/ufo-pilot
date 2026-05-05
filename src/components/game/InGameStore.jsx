
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, X, Lock, Clock, Zap, Heart, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const POWER_UPS = {
  shield_overcharge: { name: 'Shield Overcharge', cost: 50, icon: Shield, color: 'from-cyan-400 to-blue-500', duration: 12000, cooldown: 30000 },
  weapon_overdrive: { name: 'Weapon Overdrive', cost: 75, icon: Zap, color: 'from-pink-500 to-purple-600', duration: 8000, cooldown: 25000 },
  multiplier: { name: '2X Coins', cost: 100, icon: Coins, color: 'from-yellow-400 to-amber-500', duration: 10000, cooldown: 20000 },
  invincibility: { name: 'Invincibility', cost: 60, icon: Shield, color: 'from-cyan-400 to-blue-500', duration: 8000, cooldown: 35000 },
  rapidfire: { name: 'Rapid Fire', cost: 45, icon: Zap, color: 'from-pink-400 to-purple-500', duration: 10000, cooldown: 20000 }
};

const PERMANENT_UPGRADES = {
  health: { name: 'Extra Health (+25)', cost: 100, icon: Heart, color: 'from-red-500 to-rose-600', maxLevel: 4 },
  damage: { name: 'Weapon Power (+25%)', cost: 150, icon: Zap, color: 'from-yellow-500 to-amber-500', maxLevel: 4 },
  powerDuration: { name: 'Power Efficiency (-20%)', cost: 200, icon: Clock, color: 'from-cyan-500 to-blue-500', maxLevel: 3 }
};

export default function InGameStore({ 
  isOpen, 
  onClose, 
  coins, 
  upgrades,
  onPurchasePowerup, 
  onPurchaseUpgrade,
  cooldowns 
}) {
  const [activeTab, setActiveTab] = useState('powerups');

  if (!isOpen) return null;

  const canAffordPowerup = (cost) => coins >= cost;
  const canAffordUpgrade = (key, cost) => {
    const currentLevel = upgrades[key] || 0;
    const maxLevel = PERMANENT_UPGRADES[key].maxLevel;
    return coins >= cost && currentLevel < maxLevel;
  };

  const isOnCooldown = (type) => {
    const cooldownEnd = cooldowns[type];
    if (!cooldownEnd) return false;
    return Date.now() < cooldownEnd;
  };

  const getCooldownRemaining = (type) => {
    const cooldownEnd = cooldowns[type];
    if (!cooldownEnd) return 0;
    return Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-b from-gray-900 to-black border border-cyan-500/30 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-black text-white mb-2">IN-GAME STORE</h2>
              <div className="flex items-center gap-2 text-yellow-400">
                <Coins className="w-5 h-5" />
                <span className="text-xl font-bold">{coins}</span>
                <span className="text-sm text-gray-400">coins</span>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => setActiveTab('powerups')}
              variant={activeTab === 'powerups' ? 'default' : 'outline'}
              className={activeTab === 'powerups' ? 'bg-cyan-600' : ''}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Power-Ups
            </Button>
            <Button
              onClick={() => setActiveTab('upgrades')}
              variant={activeTab === 'upgrades' ? 'default' : 'outline'}
              className={activeTab === 'upgrades' ? 'bg-cyan-600' : ''}
            >
              <Zap className="w-4 h-4 mr-2" />
              Upgrades
            </Button>
          </div>

          {/* Power-ups Tab */}
          {activeTab === 'powerups' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(POWER_UPS).map(([key, item]) => {
                const Icon = item.icon;
                const affordable = canAffordPowerup(item.cost);
                const onCooldown = isOnCooldown(key);
                const cooldownSeconds = getCooldownRemaining(key);

                return (
                  <Card
                    key={key}
                    className={`bg-gradient-to-br ${item.color} bg-opacity-20 border ${
                      onCooldown ? 'border-gray-700 opacity-60' :
                      affordable ? 'border-cyan-500/30 hover:border-cyan-500/50' : 'border-gray-700 opacity-70'
                    } transition-all`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </div>
                        {onCooldown && <Clock className="w-4 h-4 text-orange-400" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-gray-400 mb-2">
                        Duration: {item.duration / 1000}s
                      </div>
                      {onCooldown ? (
                        <div className="text-center py-2">
                          <div className="text-orange-400 font-bold">{cooldownSeconds}s</div>
                          <div className="text-xs text-gray-500">Cooldown</div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => onPurchasePowerup(key, item.cost, item.duration, item.cooldown)}
                          disabled={!affordable}
                          className="w-full"
                        >
                          <Coins className="w-4 h-4 mr-2" />
                          {item.cost}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Upgrades Tab */}
          {activeTab === 'upgrades' && (
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(PERMANENT_UPGRADES).map(([key, item]) => {
                const Icon = item.icon;
                const currentLevel = upgrades[key] || 0;
                const cost = Math.floor(item.cost * Math.pow(1.5, currentLevel));
                const affordable = canAffordUpgrade(key, cost);
                const maxed = currentLevel >= item.maxLevel;

                return (
                  <Card
                    key={key}
                    className={`bg-gradient-to-br ${item.color} bg-opacity-20 border ${
                      maxed ? 'border-green-500/30' :
                      affordable ? 'border-cyan-500/30 hover:border-cyan-500/50' : 'border-gray-700 opacity-70'
                    } transition-all`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </div>
                        {maxed && <Lock className="w-4 h-4 text-green-400" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-400">
                          Level {currentLevel}/{item.maxLevel}
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: item.maxLevel }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-6 h-2 rounded-full ${
                                i < currentLevel ? 'bg-cyan-400' : 'bg-gray-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {maxed ? (
                        <div className="text-center py-2 text-green-400 font-bold">
                          MAX LEVEL
                        </div>
                      ) : (
                        <Button
                          onClick={() => onPurchaseUpgrade(key, cost)}
                          disabled={!affordable}
                          className="w-full"
                        >
                          <Coins className="w-4 h-4 mr-2" />
                          {cost}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-4 text-center text-gray-500 text-xs">
            ⚠️ Game continues while store is open! Shop quickly!
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
