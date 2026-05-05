
export const GAME_MODES = {
  SURVIVAL: { id: 'survival', name: 'Survival', description: 'Endless run. Survive as long as you can.', icon: 'infinity' },
  BOSS_RUSH: { id: 'boss_rush', name: 'Boss Rush', description: 'Face consecutive bosses. High intensity.', icon: 'skull' },
  COOP: { id: 'coop', name: 'Co-op', description: '2 Players local. WASD + Arrows.', icon: 'users' },
  CHALLENGE: { id: 'challenge', name: 'Challenge', description: 'Special objectives with modifiers.', icon: 'trophy' },
  CAMPAIGN: { id: 'campaign', name: 'Campaign', description: 'Complete missions to earn rewards.', icon: 'map' },
  TRAINING: { id: 'training', name: 'Weapons Run', description: 'Cycle through all weapons every 2.5s.', icon: 'crosshair' }
};

export const CHALLENGES = [
  { id: 'time_attack', name: 'Time Attack', description: 'Reach the furthest distance in 3 minutes.', timeLimit: 180, icon: 'clock' },
  { id: 'glass_cannon', name: 'Glass Cannon', description: 'Start with 1 HP. Deal double damage.', health: 1, maxHealth: 1, damageMult: 2, icon: 'shield-off' },
  { id: 'sniper_elite', name: 'Sniper Elite', description: 'Railgun only. High accuracy required.', weapon: 'railgun', lockWeapon: true, icon: 'crosshair' }
];
