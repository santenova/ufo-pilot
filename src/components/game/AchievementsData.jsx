import { Trophy, Crosshair, Zap, Shield, Skull, Target, Star, Flame } from 'lucide-react';

export const ACHIEVEMENTS = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Destroy your first enemy',
    icon: Crosshair,
    condition: (stats) => stats.enemiesDestroyed >= 1
  },
  {
    id: 'boss_slayer',
    name: 'Boss Slayer',
    description: 'Defeat 5 Bosses',
    icon: Skull,
    condition: (stats) => stats.bossesDefeated >= 5
  },
  {
    id: 'marathon',
    name: 'Marathon Runner',
    description: 'Reach 5000 ly distance in one run',
    icon: Trophy,
    condition: (stats) => stats.distance >= 5000
  },
  {
    id: 'rich',
    name: 'Money Maker',
    description: 'Collect 1000 coins in one run',
    icon: Star,
    condition: (stats) => stats.coins >= 1000
  },
  {
    id: 'untouchable',
    name: 'Untouchable',
    description: 'Reach 1000 ly without taking damage',
    icon: Shield,
    condition: (stats) => stats.distance >= 1000 && !stats.damageTaken
  },
  {
    id: 'arsenal',
    name: 'Walking Arsenal',
    description: 'Reach Weapon Level 10',
    icon: Zap,
    condition: (stats) => stats.weaponLevel >= 10
  },
  {
    id: 'sniper',
    name: 'Deadeye',
    description: 'Destroy 50 enemies in one run',
    icon: Target,
    condition: (stats) => stats.enemiesDestroyed >= 50
  },
  {
    id: 'survivor',
    name: 'Survivor',
    description: 'Survive for 10000 ly total distance (lifetime)',
    icon: Flame,
    condition: (stats, lifetime) => (lifetime.best_distance || 0) >= 10000 // Placeholder logic
  }
];