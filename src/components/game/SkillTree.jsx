import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Check, Zap, Shield, Crosshair, Zap as SpeedIcon, Heart, Star } from 'lucide-react';

// Skill Tree Data Structure
export const SKILL_DATA = {
  // Center - Core
  'core_mastery': {
    id: 'core_mastery',
    name: 'Core Mastery',
    description: 'Unlock the potential of your ship. +10% Score Gain.',
    icon: Star,
    cost: 0, // Free starter
    x: 0,
    y: 0,
    connections: ['offense_1', 'defense_1', 'utility_1']
  },

  // Offense Branch (Top)
  'offense_1': {
    id: 'offense_1',
    name: 'Precision Targeting',
    description: '+5% Critical Strike Chance.',
    icon: Crosshair,
    cost: 1,
    x: 0,
    y: -1,
    connections: ['offense_2_left', 'offense_2_right']
  },
  'offense_2_left': {
    id: 'offense_2_left',
    name: 'Rapid Fire',
    description: '+10% Fire Rate.',
    icon: Zap,
    cost: 2,
    x: -1,
    y: -2,
    connections: ['offense_3']
  },
  'offense_2_right': {
    id: 'offense_2_right',
    name: 'Power Spike',
    description: '+15% Damage.',
    icon: Zap,
    cost: 2,
    x: 1,
    y: -2,
    connections: ['offense_3']
  },
  'offense_3': {
    id: 'offense_3',
    name: 'Weapon Overclock',
    description: 'Unlock "Overdrive" ability chance on kill.',
    icon: Star,
    cost: 5,
    x: 0,
    y: -3,
    connections: []
  },

  // Defense Branch (Left)
  'defense_1': {
    id: 'defense_1',
    name: 'Reinforced Hull',
    description: '+20 Max Health.',
    icon: Heart,
    cost: 1,
    x: -1,
    y: 1,
    connections: ['defense_2']
  },
  'defense_2': {
    id: 'defense_2',
    name: 'Shield Capacitor',
    description: 'Shields regenerate 20% faster.',
    icon: Shield,
    cost: 3,
    x: -2,
    y: 2,
    connections: ['defense_3']
  },
  'defense_3': {
    id: 'defense_3',
    name: 'Emergency Protocol',
    description: 'Gain 3s invulnerability when hitting critical health (once per run).',
    icon: Star,
    cost: 5,
    x: -3,
    y: 3,
    connections: []
  },

  // Utility Branch (Right)
  'utility_1': {
    id: 'utility_1',
    name: 'Engine Tuning',
    description: '+10% Movement Speed.',
    icon: SpeedIcon,
    cost: 1,
    x: 1,
    y: 1,
    connections: ['utility_2']
  },
  'utility_2': {
    id: 'utility_2',
    name: 'Magnetism',
    description: 'Coin pickup range +50%.',
    icon: Star,
    cost: 3,
    x: 2,
    y: 2,
    connections: ['utility_3']
  },
  'utility_3': {
    id: 'utility_3',
    name: 'Scavenger',
    description: 'Enemies have a chance to drop health packs.',
    icon: Heart,
    cost: 5,
    x: 3,
    y: 3,
    connections: []
  }
};

export default function SkillTree({ 
  unlockedSkills = [], 
  skillPoints = 0, 
  onUnlockSkill 
}) {
  const [selectedSkill, setSelectedSkill] = useState(null);

  // Helper to check if skill is unlockable (parent unlocked + affordable)
  const canUnlock = (skillId) => {
    if (unlockedSkills.includes(skillId)) return false;
    const skill = SKILL_DATA[skillId];
    if (skill.cost > skillPoints) return false;
    
    // Core is always unlockable if not unlocked
    if (skillId === 'core_mastery') return true;

    // Check if any parent is unlocked
    // We need to find skills that connect TO this skill
    const parents = Object.values(SKILL_DATA).filter(s => s.connections.includes(skillId));
    return parents.some(parent => unlockedSkills.includes(parent.id));
  };

  const GRID_SIZE = 80;
  const CENTER_X = 400;
  const CENTER_Y = 300;

  return (
    <div className="relative w-full h-[600px] bg-[#050510] rounded-xl overflow-hidden border border-cyan-900/50 shadow-inner shadow-black">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20" 
           style={{ 
             backgroundImage: 'linear-gradient(#1a1a2e 1px, transparent 1px), linear-gradient(90deg, #1a1a2e 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }} 
      />

      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full border border-yellow-500/30">
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <span className="text-xl font-bold text-white">{skillPoints}</span>
        <span className="text-xs text-gray-400 uppercase">Skill Points</span>
      </div>

      <div className="relative w-full h-full">
        <svg className="absolute inset-0 pointer-events-none w-full h-full">
          {Object.values(SKILL_DATA).map(skill => (
            skill.connections.map(targetId => {
              const target = SKILL_DATA[targetId];
              const startX = CENTER_X + skill.x * GRID_SIZE;
              const startY = CENTER_Y + skill.y * GRID_SIZE;
              const endX = CENTER_X + target.x * GRID_SIZE;
              const endY = CENTER_Y + target.y * GRID_SIZE;
              
              const isUnlockedLine = unlockedSkills.includes(skill.id) && unlockedSkills.includes(targetId);
              
              return (
                <line 
                  key={`${skill.id}-${targetId}`}
                  x1={startX} y1={startY} x2={endX} y2={endY}
                  stroke={isUnlockedLine ? '#00f0ff' : '#333'}
                  strokeWidth={isUnlockedLine ? 3 : 1}
                  strokeDasharray={isUnlockedLine ? '0' : '5,5'}
                />
              );
            })
          ))}
        </svg>

        {Object.values(SKILL_DATA).map(skill => {
          const isUnlocked = unlockedSkills.includes(skill.id);
          const isUnlockable = canUnlock(skill.id);
          const Icon = skill.icon;
          const x = CENTER_X + skill.x * GRID_SIZE;
          const y = CENTER_Y + skill.y * GRID_SIZE;

          return (
            <motion.div
              key={skill.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: x, top: y }}
              whileHover={{ scale: 1.1 }}
            >
              <button
                onClick={() => setSelectedSkill(skill)}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-lg relative
                  ${isUnlocked 
                    ? 'bg-cyan-500 border-cyan-300 shadow-cyan-500/50' 
                    : isUnlockable 
                      ? 'bg-gray-800 border-yellow-500/50 hover:border-yellow-400 animate-pulse' 
                      : 'bg-gray-900 border-gray-700 opacity-50'}
                `}
              >
                <Icon className={`w-6 h-6 ${isUnlocked ? 'text-black' : isUnlockable ? 'text-yellow-400' : 'text-gray-500'}`} />
                {isUnlocked && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border border-black">
                    <Check className="w-2 h-2 text-black" />
                  </div>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedSkill && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-4 left-4 right-4 bg-black/90 border border-cyan-500/30 rounded-xl p-4 backdrop-blur-md"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className={`p-3 rounded-lg ${unlockedSkills.includes(selectedSkill.id) ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-400'}`}>
                  <selectedSkill.icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedSkill.name}</h3>
                  <p className="text-sm text-gray-400 max-w-md">{selectedSkill.description}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 items-end">
                {unlockedSkills.includes(selectedSkill.id) ? (
                  <div className="text-green-400 font-bold flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-lg">
                    <Check className="w-4 h-4" /> UNLOCKED
                  </div>
                ) : (
                  <Button 
                    onClick={() => {
                      if (canUnlock(selectedSkill.id)) {
                        onUnlockSkill(selectedSkill.id, selectedSkill.cost);
                      }
                    }}
                    disabled={!canUnlock(selectedSkill.id)}
                    className={`
                      ${canUnlock(selectedSkill.id) 
                        ? 'bg-yellow-500 hover:bg-yellow-400 text-black' 
                        : 'bg-gray-800 text-gray-500'}
                    `}
                  >
                    {selectedSkill.cost > 0 ? (
                      <>Unlock for {selectedSkill.cost} <Star className="w-4 h-4 ml-1 fill-current" /></>
                    ) : (
                      'Unlock Free'
                    )}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedSkill(null)} className="text-gray-500 hover:text-white">
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}