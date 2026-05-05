import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { drawShip, drawEngineGlow } from './ShipRenderer';
import { TRAILS, WEAPON_EFFECTS } from './ShipCustomization';
import { apiClient } from '../../apis/client';
import { createSoundPlayer } from './SoundPlayer';
import { getBossData } from './BossData';
import { ALL_SHOOTER_WEAPONS, getWeaponStats } from './WeaponConfig';
import { getTheme } from './ThemeConfig';
import { renderPlayerShip } from './ShipDrawer';
import { initBackground, drawBackground } from './BackgroundRenderer';

import { gameEventBus } from '@/lib/gameEventBus';
const PLAYER_SIZE = 40;
const LANE_COUNT = 7;
const BOSS_INTERVAL = 1000;
const WARNING_DISTANCE = 200;

export default function GameCanvas({ 
  gameState, 
  gameMode = 'survival',
  difficulty = 'rookie', // 'easy', 'rookie', 'ufo_pilot'
  challengeConfig = null,
  onStateUpdate, 
  isPlaying,
  isPaused = false,
  upgrades = { health: 0, damage: 0, powerDuration: 0, shipSkin: 0 },
  customization,
  onGameOver,
  onVictory,
  onLevelComplete,
  level = 1,
  unlockedSkills = [],
  volume = 0.5
}) {
  // Ensure customization has proper defaults
  const safeCustomization = React.useMemo(() => ({
    unlocked: customization?.unlocked || { models: ['basic'], trails: ['none'], effects: ['standard'] },
    equipped: customization?.equipped || { models: 'basic', trails: 'none', effects: 'standard', decal: [] },
    customShipImageUrl: customization?.customShipImageUrl || null,
    customHorizonImageUrl: customization?.customHorizonImageUrl || null
    }), [customization]);
  
  const [dimensions, setDimensions] = React.useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const GAME_WIDTH = dimensions.width;
  const GAME_HEIGHT = dimensions.height;
  const LANE_WIDTH = GAME_WIDTH / LANE_COUNT;
  const HORIZON_Y = GAME_HEIGHT * 0.3; // 30% down from top

  const canvasRef = useRef(null);
  const gameRef = useRef({
    player: { x: GAME_WIDTH / 2, lane: Math.floor(LANE_COUNT / 2) },
    bullets: [],
    enemies: [],
    coins: [],
    babies: [],
    weapons: [],
    explosions: [],
    roadLines: [],
    particles: [],
    stars: [],
    nebulae: [],
    planets: [],
    keys: {},
    lastShot: 0,
    lastEnemySpawn: 0,
    lastCoinSpawn: 0,
    lastBabySpawn: 0,
    lastWeaponSpawn: 0,
    lastPowerupSpawn: 0,
    soundPlayer: null,
    boss: null,
    bossClone: null,
    lastBossCheck: 0,
    levelBossSpawned: false,
    bossDeathTimer: 0,
    powerups: [],
    bossDefeated: false,
    customShipImage: null,
    customShipLoaded: false,
    currentShipModel: null,
    customShipImageUrl: null,
    customHorizonImage: null,
    customHorizonLoaded: false,
    customHorizonImageUrl: null,
    debugEffectIndex: 0, // 0: Normal, 1: High Bloom, 2: Retro Grid, 3: Motion Blur
    phaseTransitionTimer: 0,
    screenShake: 0,
    demoMode: false,
    demoTimer: 0,
    demoIndex: 0,
    customItems: [],
    floatingTexts: [],
    lastMoveTime: Date.now(),
    lastPlayerX: 0,
    afkTimer: 0,
    lastSquadSpawn: 0,
    hybridWeaponState: {
      activeWeapon: 'blaster',
      lastSwitchTime: 0,
      cycleIndex: 0,
      weapons: [],
    }
    });
  const animationRef = useRef(null);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Update volume when it changes
  useEffect(() => {
    if (gameRef.current.soundPlayer) {
      gameRef.current.soundPlayer.setVolume(volume);
    }
  }, [volume]);

  // Initialize sound player and fetch custom assets
  useEffect(() => {
    gameRef.current.soundPlayer = createSoundPlayer();
    gameRef.current.soundPlayer.setVolume(volume); // Set initial volume
    
    // Fetch custom assets
    const fetchCustomAssets = async () => {
      try {
        const itemsRes = await apiClient.entities.CustomItem.list();
        
        const items = Array.isArray(itemsRes) ? itemsRes : (itemsRes?.items || []);
        
        if (items && items.length) {
            items.forEach(i => {
               if (i.image_url) {
                   const img = new Image();
                   img.crossOrigin = "anonymous";
                   img.src = i.image_url;
                   i.image = img;
               }
            });
            gameRef.current.customItems = items;
        }
      } catch (e) {
        console.error("Failed to load custom assets", e);
      }
    };
    
    fetchCustomAssets();
  }, []);

  // Reset game state
  const resetGame = useCallback(() => {
    const game = gameRef.current;
    // Recalculate based on current dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    game.player = { x: width / 2 - (gameMode === 'coop' ? 50 : 0), y: GAME_HEIGHT - 60, lane: Math.floor(LANE_COUNT / 2) };
    
    if (gameMode === 'coop') {
      game.player2 = { 
        x: width / 2 + 50, 
        y: GAME_HEIGHT - 60, 
        lane: Math.floor(LANE_COUNT / 2), 
        isDead: false,
        isBot: false
      };
    } else {
      game.player2 = null;
    }

    game.bullets = [];
    game.enemies = [];
    game.coins = [];
    game.weapons = [];
    game.explosions = [];
    game.particles = [];
    game.roadLines = Array.from({ length: 15 }, (_, i) => ({ y: i * 50 }));
    
    const bgAssets = initBackground(width, height, level);
    game.stars = bgAssets.stars;
    game.nebulae = bgAssets.nebulae;
    game.planets = bgAssets.planets;
    
    game.lastShot = 0;
    game.lastEnemySpawn = 0;
    game.lastCoinSpawn = 0;
    game.lastBabySpawn = 0;
    game.lastWeaponSpawn = 0;
    game.boss = null;
    game.bossClone = null;
    game.levelBossSpawned = false;
    game.localDistance = 0;
    game.localPower = 100;
    Object.assign(game, { bossDefeated: false, bossDeathTimer: 0, lastBossCheck: 0, nextEventTimer: 0, activeEvent: null, eventDuration: 0 });
    
    // Reset AFK tracker
    game.lastMoveTime = Date.now();
    game.lastPlayerX = game.player.x;
    game.lastAFKSpawn = 0;
    game.afkTimer = 0;

    // Initialize drone if equipped
    const droneType = safeCustomization.equipped.drone || 'none';
    if (droneType !== 'none') {
    game.drone = {
    type: droneType,
    x: game.player.x,
    y: game.player.y,
    angle: 0,
    cooldown: 0,
    target: null
    };
    } else {
    game.drone = null;
    }

    // Initialize Hybrid Weapon State
    game.hybridWeaponState.weapons = [...ALL_SHOOTER_WEAPONS]; 
    game.hybridWeaponState.activeWeapon = game.hybridWeaponState.weapons[0];
    game.hybridWeaponState.lastSwitchTime = 0;
    game.hybridWeaponState.cycleIndex = 0;
    }, [safeCustomization]); // Dependencies removed to prevent auto-reset on resize

  useEffect(() => {
    if (isPlaying) {
      resetGame();
    }
  }, [isPlaying, level]); 

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      gameRef.current.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') e.preventDefault();
      // Debug key to cycle visual effects
      if (e.key.toLowerCase() === 'e') {
        gameRef.current.debugEffectIndex = (gameRef.current.debugEffectIndex + 1) % 4;
        console.log('Visual Effect:', ['Normal', 'High Bloom', 'Retro Grid', 'Motion Blur'][gameRef.current.debugEffectIndex]);
      }
      // Toggle demo mode for continuous rotation of effects/trails
      if (e.key.toLowerCase() === 'r') {
        gameRef.current.demoMode = !gameRef.current.demoMode;
        console.log('Demo Mode:', gameRef.current.demoMode ? 'ON' : 'OFF');
      }

      // Training Mode Weapon Switching
      if (gameMode === 'training' && e.key.toLowerCase() === 'w') {
        if(e.repeat) return;
        onStateUpdate(prev => {
            const nextWpn = ALL_SHOOTER_WEAPONS[(ALL_SHOOTER_WEAPONS.indexOf(prev.currentWeapon)+1) % ALL_SHOOTER_WEAPONS.length];
            // gameEventBus.emit('message', nextWpn.toUpperCase());
            return { ...prev, currentWeapon: nextWpn, powerLevel: 100 };
        });
      }
    };
    
    const handleKeyUp = (e) => {
      gameRef.current.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Create particles
  const createParticles = useCallback((x, y, count, color, speed = 3, life = 30) => {
    const game = gameRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (Math.random() * speed + speed * 0.5),
        vy: Math.sin(angle) * (Math.random() * speed + speed * 0.5),
        life,
        maxLife: life,
        size: Math.random() * 3 + 2,
        color
      });
    }
  }, []);

  const shoot = useCallback((sourcePlayer = null) => {
    const game = gameRef.current;
    const shooter = sourcePlayer || game.player;
    const now = Date.now();

    // Challenge Mode: Weapon Lock
    const lockedWeapon = challengeConfig?.weapon;
    const effectiveWeapon = lockedWeapon || gameState.currentWeapon;

    let effectiveWeaponTypeForBullet = effectiveWeapon;
    if (effectiveWeapon === 'hybrid') {
      const switchInterval = 2500; // 2.5 seconds burst
      const nowShoot = Date.now(); 
      if (nowShoot - game.hybridWeaponState.lastSwitchTime > switchInterval) {
        game.hybridWeaponState.cycleIndex = (game.hybridWeaponState.cycleIndex + 1) % game.hybridWeaponState.weapons.length;
        game.hybridWeaponState.activeWeapon = game.hybridWeaponState.weapons[game.hybridWeaponState.cycleIndex];
        game.hybridWeaponState.lastSwitchTime = nowShoot;
        // gameEventBus.emit('message', game.hybridWeaponState.activeWeapon.toUpperCase());
        game.soundPlayer?.playPowerup(); 
      }
      effectiveWeaponTypeForBullet = game.hybridWeaponState.activeWeapon;
    }

    let { bulletCount, bulletSpeed, bulletSize, damage, bulletColor, isHoming, spreadFactor, isWave } = getWeaponStats(effectiveWeaponTypeForBullet, gameState.isMutated, gameState.weaponLevel);

    // Apply damage upgrade (Double for Glass Cannon)
    let damageMultiplier = (1 + (upgrades.damage * 0.25)) * (safeCustomization.equipped.models === 'black_triangle' ? 1.3 : 1);
    if (challengeConfig?.damageMult) damageMultiplier *= challengeConfig.damageMult;

    // Skill Tree Bonuses
    if (unlockedSkills.includes('offense_2_right')) damageMultiplier *= 1.15; // Power Spike
    if (unlockedSkills.includes('core_mastery')) damageMultiplier *= 1.05; // Core Mastery Small Bonus

    // Apply Weapon Overdrive power-up
    const hasWeaponOverdrive = gameState.activePowerups?.some(p => p.type === 'weapon_overdrive');
    if (hasWeaponOverdrive) {
      damageMultiplier *= 2.5;
      bulletSize *= 1.5;
      bulletSpeed *= 1.3;
    }

    const weaponLevelBonus = 1 + (gameState.weaponLevel - 1) * 0.15;

    // Weapon stats configuration moved to WeaponConfig.js

    bulletSpeed *= 2; // Global speed boost
    damage = Math.floor(damage * damageMultiplier * weaponLevelBonus);

    for (let i = 0; i < bulletCount; i++) {
    const spread = bulletCount > 1 ? (i - (bulletCount - 1) / 2) * spreadFactor : 0;
    let vx = 0;
    if (effectiveWeaponTypeForBullet === 'spread') vx = spread * 0.15;
    if (effectiveWeaponTypeForBullet === 'flamethrower') vx = (Math.random() - 0.5) * 5;
    if (effectiveWeaponTypeForBullet === 'prism') vx = (i - (bulletCount-1)/2) * 2;
    if (effectiveWeaponTypeForBullet === 'swarm') vx = (Math.random() - 0.5) * 10;
    if (effectiveWeaponTypeForBullet === 'swarm_drone') vx = (Math.random() - 0.5) * 15;
    if (effectiveWeaponTypeForBullet === 'starfall') vx = spread * 0.1; // Slight spread for starfall
    if (effectiveWeaponTypeForBullet === 'starfall_missile') vx = spread * 0.2;
    if (effectiveWeaponTypeForBullet === 'grenade') vx = (Math.random() - 0.5) * 8;
    if (effectiveWeaponTypeForBullet === 'plasma_burst') vx = spread * 0.2;
    if (effectiveWeaponTypeForBullet === 'laser_turret') vx = (i === 0 ? -5 : 5); // Side shots
    if (effectiveWeaponTypeForBullet === 'cluster') vx = (Math.random() - 0.5) * 10;

    // Helix specific logic
    const isHelix = effectiveWeaponTypeForBullet === 'helix' || effectiveWeaponTypeForBullet === 'helix_shot';
    const helixOffset = isHelix ? (i * Math.PI) : 0;

    game.bullets.push({
        x: shooter.x + (effectiveWeaponTypeForBullet === 'spread' || effectiveWeaponTypeForBullet === 'starfall' ? 0 : spread),
        y: shooter.y - 20,
        speed: bulletSpeed,
        vx: vx,
        size: bulletSize,
        damage,
        weapon: effectiveWeaponTypeForBullet,
        isHoming,
        isWave,
        waveOffset: i * Math.PI,
        isHelix,
        helixOffset,
        isMutated: gameState.isMutated,
        timer: 0
      });

      createParticles(shooter.x + spread, shooter.y - 20, 5, bulletColor, 2, 15);
    }

    game.soundPlayer?.playShoot(effectiveWeaponTypeForBullet);
    
    // Power drain only for P1 or shared? Shared pool.
    let powerCost = 3; // Simplified cost logic for brevity
    if (effectiveWeapon === 'blaster') powerCost = 0;
    
    const powerReduction = 1 - (upgrades.powerDuration * 0.2);
    const finalPowerCost = Math.max(1, Math.floor(powerCost * powerReduction));
    const totalDrain = finalPowerCost * (gameState.isMutated ? 2 : 1);
    
    if (gameRef.current.localPower !== undefined) {
      gameRef.current.localPower = Math.max(0, gameRef.current.localPower - totalDrain);
    }
    
    onStateUpdate(prev => {
      const newXP = prev.weaponXP + 1;
      const newLevel = Math.floor(newXP / 10) + 1;
      return {
        ...prev,
        powerLevel: Math.max(0, prev.powerLevel - totalDrain),
        weaponXP: newXP,
        weaponLevel: newLevel
      };
    });
  }, [gameState.currentWeapon, gameState.powerLevel, gameState.isMutated, gameState.weaponLevel, upgrades, challengeConfig, onStateUpdate, createParticles]);

  // Touch controls
  const touchState = useRef({ startX: 0, playerStartX: 0, isDragging: false });
  const _shootIfAble = useCallback(() => {
    const game = gameRef.current, now = Date.now();
    if (now - game.lastShot > (gameState.currentWeapon === 'rocket' ? 500 : 150) && gameState.powerLevel > 0) shoot();
  }, [gameState, shoot]);
  const handleTouchStart = useCallback((e) => {
    if (!isPlaying) return;
    const t = e.touches[0];
    touchState.current = { startX: t.clientX, playerStartX: gameRef.current.player.x, isDragging: true };
    _shootIfAble();
  }, [isPlaying, _shootIfAble]);
  const handleTouchMove = useCallback((e) => {
    if (!isPlaying || !touchState.current.isDragging) return;
    let newX = Math.max(40, Math.min(GAME_WIDTH - 40, touchState.current.playerStartX + (e.touches[0].clientX - touchState.current.startX) * 1.5));
    gameRef.current.player.x = newX; gameRef.current.player.lane = Math.floor((newX - 20) / LANE_WIDTH);
    _shootIfAble();
  }, [isPlaying, GAME_WIDTH, LANE_WIDTH, _shootIfAble]);
  const handleTouchEnd = useCallback(() => touchState.current.isDragging = false, []);

  // Main game loop
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Safe Monkey-patch to prevent crashes (Radial Gradient)
    if (!ctx.createRadialGradient.isSafePatched) {
      const original = ctx.createRadialGradient;
      const safeRadialGradient = function(x0, y0, r0, x1, y1, r1) {
        if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(r0) ||
            !Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(r1) || r0 < 0 || r1 < 0) {
          // Suppressed logging to prevent freeze on spam
          return original.call(this, 0, 0, 0, 0, 0, 1);
        }
        return original.call(this, x0, y0, r0, x1, y1, r1);
      };
      safeRadialGradient.isSafePatched = true;
      ctx.createRadialGradient = safeRadialGradient;
    }

    // Safe Monkey-patch for Linear Gradient (Visual Queues/Beams)
    if (!ctx.createLinearGradient.isSafePatched) {
      const originalLinear = ctx.createLinearGradient;
      const safeLinearGradient = function(x0, y0, x1, y1) {
        if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) {
          // Suppressed logging to prevent freeze on spam
          return originalLinear.call(this, 0, 0, 0, 1);
        }
        return originalLinear.call(this, x0, y0, x1, y1);
      };
      safeLinearGradient.isSafePatched = true;
      ctx.createLinearGradient = safeLinearGradient;
    }

    const game = gameRef.current;
    
    // Initialize road lines
    if (game.roadLines.length === 0) {
      game.roadLines = Array.from({ length: 15 }, (_, i) => ({ y: i * 50 }));
    }

    let lastTime = 0;
    const gameLoop = (timestamp) => {
      if (lastTime && timestamp - lastTime < 16.6) { animationRef.current = requestAnimationFrame(gameLoop); return; }
      const game = gameRef.current;
      let gameSpeed = game.activeEvent === 'hyper_speed' ? 15 : 5;
      if (GAME_HEIGHT <= 0 || GAME_WIDTH <= 0) { animationRef.current = requestAnimationFrame(gameLoop); return; }

      const rawGameState = gameStateRef.current;
      if (game.localDistance === undefined) game.localDistance = rawGameState.distance || 0;
      const gameState = { ...rawGameState, distance: game.localDistance };
      const deltaTime = lastTime === 0 ? 16.66 : timestamp - lastTime; lastTime = timestamp;
      const now = Date.now(); const timeScale = Math.min(deltaTime / 16.66, 5);

      // Reset transform at the start of the frame
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      // Handle screen shake decay globally
      if (game.screenShake > 0) game.screenShake *= 0.9;
      if (game.screenShake < 0.5) game.screenShake = 0;

      // Force clear screen to prevent artifacts
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Post-Processing: Bloom Simulation via Global Composite (Subtle)
      // We can't do real post-processing efficiently in 2D canvas without offscreen, 
      // but we can set context properties for glowing drawing.
      // Or use CSS on the canvas element itself for global bloom.
      
      // Camera Shake
      // Apply screen shake GLOBALLY before drawing background
      // This ensures background moves with the world and prevents parallax tearing
      if (game.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * game.screenShake;
        const shakeY = (Math.random() - 0.5) * game.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // Get current theme based on Level and Boss status
      let theme = getTheme(level, game.debugEffectIndex, game.boss);

      const visualMode = game.debugEffectIndex;

      // Load Custom Ship Image if needed
      if (safeCustomization.customShipImageUrl && game.customShipImageUrl !== safeCustomization.customShipImageUrl) {
         game.customShipImage = new Image();
         game.customShipImage.crossOrigin = "anonymous";
         game.customShipImage.src = safeCustomization.customShipImageUrl;
         game.customShipLoaded = false;
         game.customShipImage.onload = () => { 
            console.log("Custom ship image loaded");
            game.customShipLoaded = true; 
         };
         game.customShipImage.onerror = (e) => {
            console.error("Failed to load custom ship image", e);
         };
         game.customShipImageUrl = safeCustomization.customShipImageUrl;
      }
      
      // Load Custom Horizon if needed
      if (safeCustomization.customHorizonImageUrl && game.customHorizonImageUrl !== safeCustomization.customHorizonImageUrl) {
         game.customHorizonImage = new Image();
         game.customHorizonImage.crossOrigin = "anonymous";
         game.customHorizonImage.src = safeCustomization.customHorizonImageUrl;
         game.customHorizonLoaded = false;
         game.customHorizonImage.onload = () => { game.customHorizonLoaded = true; };
         game.customHorizonImageUrl = safeCustomization.customHorizonImageUrl;
      }

      // Clear canvas with theme background (sky) - OVERSIZED DRAWING
      // We draw -100 to +100 to cover screen shake gaps
      const SHAKE_PAD = 100;

      if (visualMode === 3) { // Motion Blur
        // Smoother motion blur
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; 
        ctx.fillRect(-SHAKE_PAD, -SHAKE_PAD, GAME_WIDTH + SHAKE_PAD*2, GAME_HEIGHT + SHAKE_PAD*2);
      } else {
        if (game.customHorizonLoaded && game.customHorizonImage) {
           // Draw Custom Background - Scaled to cover shake
           ctx.drawImage(game.customHorizonImage, -SHAKE_PAD, -SHAKE_PAD, GAME_WIDTH + SHAKE_PAD*2, GAME_HEIGHT + SHAKE_PAD*2);
           // Darken lower part for road contrast
           const fadeGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, GAME_HEIGHT);
           fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
           fadeGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
           ctx.fillStyle = fadeGrad;
           ctx.fillRect(-SHAKE_PAD, HORIZON_Y, GAME_WIDTH + SHAKE_PAD*2, (GAME_HEIGHT - HORIZON_Y) + SHAKE_PAD);
        } else {
           const skyGradient = ctx.createLinearGradient(0, -SHAKE_PAD, 0, GAME_HEIGHT + SHAKE_PAD);
           skyGradient.addColorStop(0, theme.bg);
           skyGradient.addColorStop(0.4, theme.bg);
           skyGradient.addColorStop(1, theme.road);
           ctx.fillStyle = skyGradient;
           ctx.fillRect(-SHAKE_PAD, -SHAKE_PAD, GAME_WIDTH + SHAKE_PAD*2, GAME_HEIGHT + SHAKE_PAD*2);
        }
      }
      
      if (!game.customHorizonLoaded) {
       // Draw horizon glow - Oversized
       const SHAKE_PAD = 100;
       const horizonGlow = ctx.createLinearGradient(0, HORIZON_Y - 50, 0, HORIZON_Y + 50);
       horizonGlow.addColorStop(0, 'transparent');
       horizonGlow.addColorStop(0.5, theme.horizon);
       horizonGlow.addColorStop(1, 'transparent');
       ctx.fillStyle = horizonGlow;
       ctx.globalAlpha = 0.2;
       ctx.fillRect(-SHAKE_PAD, HORIZON_Y - 50, GAME_WIDTH + SHAKE_PAD*2, 100);
       ctx.globalAlpha = 1;

       // Draw City Skyline (Parallax)
       ctx.save();
       const cityOffset = (Date.now() * 0.05) % 200;
       const horizonShift = Math.floor(Date.now() / 10000); 

       ctx.fillStyle = '#050510';
       ctx.beginPath();
       ctx.moveTo(-SHAKE_PAD - 20, HORIZON_Y); // Start far off-screen left

       // Extended loop to cover oversized area
       const startI = Math.floor(-SHAKE_PAD / 20) - 2;
       const endI = Math.ceil((GAME_WIDTH + SHAKE_PAD) / 20) + 2;

       for (let i = startI; i <= endI; i++) {
         const seed = i + horizonShift; 
         const h = 20 + Math.sin(seed * 1324 + cityOffset * 0.01) * 15 + Math.cos(seed * 321) * 10;
         ctx.lineTo(i * 20 - (cityOffset % 20), HORIZON_Y - Math.abs(h));
         ctx.lineTo((i + 1) * 20 - (cityOffset % 20), HORIZON_Y - Math.abs(h));
       }
       ctx.lineTo(GAME_WIDTH + SHAKE_PAD + 20, HORIZON_Y); // End far off-screen right
       ctx.fill();

       // City Lights
       ctx.fillStyle = theme.accent;
       for (let i = startI; i <= endI; i++) {
          if (i % 3 === 0) {
             const seed = i + horizonShift;
             const x = i * 20 - (cityOffset % 20) + 5;
             const h = 20 + Math.sin(seed * 1324 + cityOffset * 0.01) * 15 + Math.cos(seed * 321) * 10;
             if (x > -SHAKE_PAD - 20 && x < GAME_WIDTH + SHAKE_PAD + 20) {
                ctx.fillRect(x, HORIZON_Y - Math.abs(h) + 5, 2, 2);
                ctx.fillRect(x + 5, HORIZON_Y - Math.abs(h) + 10, 2, 2);
             }
          }
       }
       ctx.restore();

       ctx.strokeStyle = theme.accent;
       ctx.lineWidth = 2;
       ctx.shadowBlur = visualMode === 1 ? 20 : 10;
       ctx.shadowColor = theme.accent;
       ctx.beginPath();
       ctx.moveTo(-SHAKE_PAD, HORIZON_Y);
       ctx.lineTo(GAME_WIDTH + SHAKE_PAD, HORIZON_Y);
       ctx.stroke();
       ctx.shadowBlur = 0;
      }

      // Screen shake already applied globally at start of frame
      
      // Damage Visual Cue (Red Vignette)
      if (game.screenShake > 5) { // Shake correlates with damage
         const vignette = ctx.createRadialGradient(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_HEIGHT*0.4, GAME_WIDTH/2, GAME_HEIGHT/2, GAME_HEIGHT);
         vignette.addColorStop(0, 'transparent');
         vignette.addColorStop(1, `rgba(255, 0, 0, ${Math.min(0.5, game.screenShake/40)})`);
         ctx.fillStyle = vignette;
         ctx.fillRect(-100, -100, GAME_WIDTH+200, GAME_HEIGHT+200);
      }


      drawBackground(ctx, game, { width: GAME_WIDTH, height: GAME_HEIGHT, horizonY: HORIZON_Y, visualMode, theme, timeScale, activeEvent: game.activeEvent, distance: gameState.distance, bossInterval: BOSS_INTERVAL, boss: game.boss });
      
      // Draw road with perspective
      const VANISHING_POINT_X = GAME_WIDTH / 2;
      const VANISHING_POINT_Y = HORIZON_Y;
      const ROAD_BOTTOM_WIDTH = GAME_WIDTH - 40;
      const ROAD_TOP_WIDTH = GAME_WIDTH * 0.2;
      
      // Road surface with perspective - Oversized
      const SHAKE_PAD_ROAD = 100;
      ctx.fillStyle = theme.road;
      ctx.beginPath();
      ctx.moveTo((GAME_WIDTH - ROAD_TOP_WIDTH) / 2, HORIZON_Y);
      ctx.lineTo((GAME_WIDTH + ROAD_TOP_WIDTH) / 2, HORIZON_Y);
      // Flare out bottom to cover shake
      ctx.lineTo(GAME_WIDTH + SHAKE_PAD_ROAD, GAME_HEIGHT + SHAKE_PAD_ROAD);
      ctx.lineTo(-SHAKE_PAD_ROAD, GAME_HEIGHT + SHAKE_PAD_ROAD);
      ctx.closePath();
      ctx.fill();

      // Cyberpunk Grid Floor
      const gridOffset = (Date.now() * 0.2) % 100; // Moving grid
      ctx.save();
      ctx.beginPath();
      
      // Vertical lines
      const roadWidthBottom = ROAD_BOTTOM_WIDTH;
      const roadWidthTop = ROAD_TOP_WIDTH;
      const roadLeftBottom = (GAME_WIDTH - roadWidthBottom) / 2;
      const roadLeftTop = (GAME_WIDTH - roadWidthTop) / 2;

      for (let i = 0; i <= LANE_COUNT; i++) {
        const t = i / LANE_COUNT;
        const xBottom = roadLeftBottom + roadWidthBottom * t;
        const xTop = roadLeftTop + roadWidthTop * t;
        
        ctx.moveTo(xTop, HORIZON_Y);
        ctx.lineTo(xBottom, GAME_HEIGHT);
      }

      // Horizontal lines (perspective)
      // Exponential spacing for perspective
      for (let i = 0; i < 20; i++) {
        const y = HORIZON_Y + Math.pow(i / 20, 3) * (GAME_HEIGHT - HORIZON_Y);
        // Add movement
        const yOffset = (y - HORIZON_Y) + (gridOffset * (y - HORIZON_Y) / (GAME_HEIGHT - HORIZON_Y) * 0.5);
        const finalY = HORIZON_Y + (yOffset % (GAME_HEIGHT - HORIZON_Y));
        
        if (finalY > HORIZON_Y && finalY < GAME_HEIGHT) {
           const depth = (finalY - HORIZON_Y) / (GAME_HEIGHT - HORIZON_Y);
           const currentRoadWidth = roadWidthTop + (roadWidthBottom - roadWidthTop) * depth;
           const currentRoadLeft = (GAME_WIDTH - currentRoadWidth) / 2;
           
           ctx.moveTo(currentRoadLeft, finalY);
           ctx.lineTo(currentRoadLeft + currentRoadWidth, finalY);
        }
      }

      ctx.strokeStyle = theme.grid || 'rgba(0, 255, 255, 0.2)';
      ctx.lineWidth = 1;

      if (visualMode === 1) { // High Bloom
        ctx.shadowBlur = 15;
        ctx.shadowColor = theme.accent;
        ctx.stroke(); // Draw again for intensity
      } else if (visualMode === 2) { // Retro Grid
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ff00ff';
        ctx.strokeStyle = '#ff00ff';
      }

      ctx.stroke();
      ctx.shadowBlur = 0; // Reset
      ctx.restore();

      // Retro Grid Overlay (Sky Grid)
      if (visualMode === 2) {
         ctx.save();
         ctx.strokeStyle = 'rgba(255, 0, 255, 0.15)';
         ctx.lineWidth = 1;
         const sunY = HORIZON_Y - 50;
         const sunX = GAME_WIDTH / 2;

         // Vertical sky lines
         for (let i = -10; i <= 10; i++) {
            ctx.beginPath();
            ctx.moveTo(sunX + i * 50, -100);
            ctx.lineTo(sunX + i * 150, HORIZON_Y);
            ctx.stroke();
         }

         // Horizontal sky lines
         for (let i = 0; i < 10; i++) {
            const y = HORIZON_Y - Math.pow(i/10, 2) * 200;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_WIDTH, y);
            ctx.stroke();
         }

         // Retro Sun
         const sunGrad = ctx.createLinearGradient(sunX, sunY - 100, sunX, sunY + 100);
         sunGrad.addColorStop(0, '#ffff00');
         sunGrad.addColorStop(0.5, '#ff00ff');
         sunGrad.addColorStop(1, 'transparent');

         ctx.fillStyle = sunGrad;
         ctx.beginPath();
         ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
         ctx.fill();

         // Sun stripes
         for(let i=0; i<10; i++) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(sunX - 80, sunY - 20 + i*10, 160, 4);
         }

         ctx.restore();
      }
      
      // Handle player movement
      const speedUpgrade = upgrades.speed || 0;
      let moveSpeed = (8 + (speedUpgrade * 1.5)) * (safeCustomization.equipped.models === 'black_triangle' ? 1.3 : 1);
      if (unlockedSkills.includes('utility_1')) moveSpeed *= 1.1; // Engine Tuning

      // P1 Controls
      const p1Left = gameMode === 'coop' ? game.keys['a'] : (game.keys['a'] || game.keys['arrowleft']);
      const p1Right = gameMode === 'coop' ? game.keys['d'] : (game.keys['d'] || game.keys['arrowright']);
      
      if (p1Left && game.player.x > 40) {
        game.player.x -= moveSpeed;
        game.player.lane = Math.floor((game.player.x - 20) / LANE_WIDTH);
      }
      if (p1Right && game.player.x < GAME_WIDTH - 40) {
        game.player.x += moveSpeed;
        game.player.lane = Math.floor((game.player.x - 20) / LANE_WIDTH);
      }

      // AFK Check
      if (Math.abs(game.player.x - (game.lastPlayerX || game.player.x)) > 5) { // Increased threshold to prevent micro-movements resetting timer
         game.lastMoveTime = now;
         game.lastPlayerX = game.player.x;
         game.afkTimer = 0;
      } else {
         // Not moving
         if (now - game.lastMoveTime > 30000) { // 30 seconds
             // Spawn AFK Rocket if not already present (or spawn periodically)
             // Let's spawn one every 5 seconds if they keep standing
             if (!game.lastAFKSpawn || now - game.lastAFKSpawn > 5000) {
                 game.lastAFKSpawn = now;
                 game.enemies.push({
                     x: game.player.x, // Spawn above player
                     y: -200,
                     type: 'afk_rocket',
                     health: 999999, // Indestructible mostly
                     maxHealth: 999999,
                     speed: 40, // Extremely fast
                     size: 50, // Larger hit box
                     homingTarget: true,
                     isAFK: true,
                     color: '#ff0000'
                 });
                 game.soundPlayer?.playBossTaunt(); // Warning sound
                 // gameEventBus.emit('message', "MOVE OR DIE!");
             }
         }
      }

      // P2 Controls (Co-op)
      if (game.player2 && !game.player2.isDead) {
        // Human P2 Controls
        if (game.keys['arrowleft'] && game.player2.x > 40) {
          game.player2.x -= moveSpeed;
          game.player2.lane = Math.floor((game.player2.x - 20) / LANE_WIDTH);
        }
        if (game.keys['arrowright'] && game.player2.x < GAME_WIDTH - 40) {
          game.player2.x += moveSpeed;
          game.player2.lane = Math.floor((game.player2.x - 20) / LANE_WIDTH);
        }
      }

      // Shooting logic
      // const now = Date.now(); // Defined at top of loop
      const hasRapidFire = gameState.activePowerups?.some(p => p.type === 'rapidfire');
      const hasWeaponOverdrive = gameState.activePowerups?.some(p => p.type === 'weapon_overdrive');
      const hasTimeSlow = gameState.activePowerups?.some(p => p.type === 'time_slow');

      // Challenge Mode: Time Limit Check
      if (challengeConfig?.timeLimit) {
        // Decrease timeRemaining logic handled via onStateUpdate below or separate effect, 
        // but here we check for timeout
        if (gameState.timeRemaining <= 0) {
           if (challengeConfig.objective?.type === 'survive' || challengeConfig.objective?.type === 'escort') {
              // Survival time reached = VICTORY
              onVictory?.({ timeSurvived: challengeConfig.timeLimit }); 
              return; // Stop loop
           } else {
              // Time attack time reached = GAME OVER (or check score)
              // For speedrun, if time runs out you fail
              onGameOver?.(); // End game
           }
        }
      }

      // Check Campaign Objectives
      if (gameMode === 'campaign' && challengeConfig?.objective) {
         const obj = challengeConfig.objective;
         if (obj.type === 'kills' && gameState.enemiesDestroyed >= obj.target) {
            onVictory?.({ enemiesDestroyed: gameState.enemiesDestroyed });
            return;
         }
         if (obj.type === 'nodamage') {
            if (gameState.health < 100) { // Assuming 100 is base, strict check
               // Failed objective? Game over?
               // Usually for "perfect run" taking damage is failure
               onGameOver?.(); 
            }
            if (gameState.distance >= obj.target) {
               onVictory?.({ distance: gameState.distance });
               return;
            }
         }
         if (obj.type === 'waves' && (gameState.wavesCleared || 0) >= obj.target) { // Need to track waves
             onVictory?.({ waves: gameState.wavesCleared });
             return;
         }
         if (obj.type === 'killtype' && (gameState.typeKills?.[obj.enemyType] || 0) >= obj.target) {
             onVictory?.({ typeKills: gameState.typeKills });
             return;
         }
         if (obj.type === 'bosses' && (gameState.bossesDefeatedCount || 0) >= obj.target) {
             onVictory?.({ bossesDefeated: gameState.bossesDefeatedCount });
             return;
         }
         if (obj.type === 'speedrun' && gameState.distance >= obj.distance) {
             // Reached distance within time (time checked above)
             onVictory?.({ timeTaken: challengeConfig.timeLimit - gameState.timeRemaining });
             return;
         }
         if (obj.type === 'elites' && (gameState.eliteKills || 0) >= obj.target) {
             onVictory?.({ eliteKills: gameState.eliteKills });
             return;
         }
         if (obj.type === 'megaboss' && gameState.bossDefeated && gameState.boss?.milestone >= 10) { // Specific boss check needed
             onVictory?.({});
             return;
         }
      }

      // Determine Fire Rate
      let baseDelay = 150;
      const weapon = challengeConfig?.weapon || gameState.currentWeapon;
      switch(weapon) {
        case 'rocket': baseDelay = 500; break;
        case 'railgun': baseDelay = 800; break;
        case 'flamethrower': baseDelay = 50; break;
        case 'sonic': baseDelay = 300; break;
        case 'prism': baseDelay = 200; break;
        case 'swarm': baseDelay = 400; break;
        case 'vortex': baseDelay = 1000; break;
        case 'neutron': baseDelay = 600; break;
        case 'helix': baseDelay = 200; break;
        case 'starfall': baseDelay = 250; break;
        case 'cannon': baseDelay = 600; break;
        case 'torpedo': baseDelay = 1000; break;
        case 'dart': baseDelay = 80; break;
        case 'rail_pulse': baseDelay = 400; break;
        case 'energy_ball': baseDelay = 300; break;
        case 'plasma_burst': baseDelay = 350; break;
        case 'ion_cannon': baseDelay = 500; break;
        case 'shockwave': baseDelay = 400; break;
        case 'vortex_trap': baseDelay = 1200; break;
        case 'neutron_pulse': baseDelay = 500; break;
        case 'starfall_missile': baseDelay = 300; break;
        default: baseDelay = 150;
      }
      let shootDelay = hasWeaponOverdrive ? baseDelay * 0.3 : hasRapidFire ? baseDelay * 0.5 : baseDelay;
      if (unlockedSkills.includes('offense_2_left')) shootDelay *= 0.9; // Rapid Fire Skill

      // P1 Shooting
      const p1ShootKey = gameMode === 'coop' ? (game.keys[' '] || game.keys['space']) : (game.keys[' '] || game.keys['space']);
      const canShoot = gameState.powerLevel > 0 || weapon === 'blaster';
      
      if ((p1ShootKey || gameState.autoFire) && now - game.lastShot > shootDelay && canShoot) {
        shoot(game.player);
        if (gameMode !== 'coop') game.lastShot = now; // Only update global CD for single player or shared CD?
      }

      // P2 Shooting (Separate CD? For now shared to keep it simple, or separate check)
      if (game.player2 && !game.player2.isDead && (game.keys['enter'] || gameState.autoFire) && now - (game.lastShotP2 || 0) > shootDelay && canShoot) {
        shoot(game.player2);
        game.lastShotP2 = now;
      }
      
      if (gameMode !== 'coop') {
         // Keep existing single player global CD logic
         if ((p1ShootKey || gameState.autoFire) && now - game.lastShot > shootDelay && canShoot) {
            game.lastShot = now;
         }
      } else {
         // Co-op shared CD optimization: if both shoot, power drains fast.
         if ((p1ShootKey || gameState.autoFire) && now - game.lastShot > shootDelay && canShoot) game.lastShot = now;
      }

      if (!game.boss) {
         game.localDistance += (gameSpeed * 0.1 * timeScale);
         gameState.distance = game.localDistance;
      }

      // Adaptive Difficulty System
      // Dynamically adjust game parameters based on player performance metrics
      const healthMetric = Math.max(0, (gameState.health - 50) / 50); // High health = doing well
      const weaponMetric = gameState.weaponLevel * 0.15; // Better gear = harder game
      const killMetric = Math.min(1.5, gameState.enemiesDestroyed / 200); // Killing efficiency
      const distanceMetric = gameState.distance / 1000; // Survival time

      const performanceScore = healthMetric + weaponMetric + killMetric + (gameState.powerLevel > 80 ? 0.2 : 0) + distanceMetric;
      
      // Calculated Multipliers
      let difficultyMultiplier = 1 + (performanceScore * 0.4);
      let enemyProjectileSpeedMult = Math.min(1.8, 1 + (performanceScore * 0.15));
      let bossAggressionMult = Math.max(0.4, 1 - (performanceScore * 0.08)); // Lower is faster attacks
      let playerDamageTakenMult = Math.min(2.5, 1 + (performanceScore * 0.25)) * (safeCustomization.equipped.models === 'black_triangle' ? 0.7 : 1);

      // DIFFICULTY SETTINGS
      if (difficulty === 'easy') {
          difficultyMultiplier *= 0.7;
          enemyProjectileSpeedMult *= 0.8;
          bossAggressionMult *= 1.5; // Slower attacks
          playerDamageTakenMult *= 0.5; // Half damage
      } else if (difficulty === 'ufo_pilot') {
          difficultyMultiplier *= 1.5;
          enemyProjectileSpeedMult *= 1.3;
          bossAggressionMult *= 0.7; // Faster attacks
          playerDamageTakenMult *= 1.5; // +50% damage
      }

      // BOSS RUSH DIFFICULTY OVERRIDE (10x Harder)
      if (gameMode === 'boss_rush') {
          difficultyMultiplier *= 3;
          enemyProjectileSpeedMult *= 1.5;
          bossAggressionMult *= 0.5; // Attacks twice as fast
          playerDamageTakenMult *= 2; // Double damage taken
      }
      
      // Spawn Rate (Lower is faster)
      let spawnRate = Math.max(120, 1000 / (1 + performanceScore * 0.8));
      if (difficulty === 'easy') spawnRate *= 1.5; // Slower spawns
      if (difficulty === 'ufo_pilot') spawnRate *= 0.7; // Faster spawns
      
      // Boss Definition Helper - 10 Level Structure


      // Boss Rush Override
      if (gameMode === 'boss_rush') {
        spawnRate = 999999; // Disable regular spawns mostly
        
        if (!game.boss && !game.bossWarning) {
           // Force spawn boss immediately if dead
           const milestone = (game.bossRushCount || 0) + 1;
           game.lastBossCheck = gameState.distance; // Prevent double spawn logic
           
           const bossData = getBossData(milestone);
           // Exponential health scaling for Boss Rush (Buffed 10x Base, Steeper Curve)
           const bossHealth = (100000 * Math.pow(1.3, milestone)) * (1 + (gameState.weaponLevel * 0.8)) * bossData.healthMult;

           game.boss = {
             x: GAME_WIDTH / 2,
             y: -100,
             type: 'boss',
             phase: 1,
             health: bossHealth,
             maxHealth: bossHealth,
             size: 60 + (milestone * 2),
             speed: (1.5 + (milestone * 0.2)) * bossData.speedMult, // Starts 50% faster
             moveTimer: 0,
             attackTimer: 0,
             phaseTransition: false,
             milestone: milestone,
             name: `${bossData.name} MK-${bossData.level}`,
             data: bossData,
             persistenceTauntPlayed: false,
             neverStopTauntPlayed: false,
             mercyTauntPlayed: false,
             imageUrl: bossData.imageUrl,
             image: null,
             imageLoaded: false
             };
             if (bossData.imageUrl) {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.src = bossData.imageUrl;
              img.onload = () => { if(game.boss) { game.boss.image = img; game.boss.imageLoaded = true; }};
             }
             game.bossRushCount = milestone;
             game.soundPlayer?.playExplosion();
           game.soundPlayer?.playBossTaunt();
           createParticles(GAME_WIDTH / 2, 100, 50, bossData.accent, 8, 40);
           }
           } else {
           // Standard Level Boss Logic
           // Spawn boss when distance reaches threshold for current level
           // Use 'level' prop to determine difficulty and boss type
           if (!game.boss && !game.levelBossSpawned && gameState.distance >= BOSS_INTERVAL) {
              game.levelBossSpawned = true;
              onStateUpdate(prev => ({ ...prev, bossWarning: false }));

              // Use configured boss if available, otherwise default to level
              const bossId = challengeConfig?.boss_type !== 'none' && challengeConfig?.boss_type ? challengeConfig.boss_type : level;
              if (challengeConfig?.boss_type === 'none') return; // No boss

              const bossData = getBossData(bossId);
              // Boss HP scales with level
              // Boss HP scales significantly with level
                 // Exponential health scaling for high levels
                 const bossBaseHealth = (10000 * Math.pow(1.15, level)) * 25; 
                 // Ensure healthMult is valid
                 const safeHealthMult = Number.isFinite(bossData.healthMult) ? bossData.healthMult : 1.0;
                 const bossHealth = (bossBaseHealth + (gameState.weaponLevel * 10000)) * safeHealthMult;

                 game.boss = {
                x: GAME_WIDTH / 2,
                y: -100,
                type: 'boss',
                phase: 1,
                health: bossHealth,
                maxHealth: bossHealth,
                size: 60,
                speed: 1 * bossData.speedMult,
                moveTimer: 0,
                attackTimer: 0,
                phaseTransition: false,
                milestone: level, // Use level as milestone
                name: `${bossData.name}`,
                data: bossData,
                persistenceTauntPlayed: false,
                neverStopTauntPlayed: false,
                mercyTauntPlayed: false,
                imageUrl: bossData.imageUrl,
                image: null,
                imageLoaded: false
                };
                if (bossData.imageUrl) {
                  const img = new Image();
                  img.crossOrigin = "anonymous";
                  img.src = bossData.imageUrl;
                  img.onload = () => { if(game.boss) { game.boss.image = img; game.boss.imageLoaded = true; }};
                }
                game.soundPlayer?.playExplosion();
              game.soundPlayer?.playBossTaunt();
              createParticles(GAME_WIDTH / 2, 100, 50, bossData.accent, 8, 40);
           }
           }

      if (game.activeEvent === 'asteroid_shower' && Math.random() < 0.15 && !game.boss) {
         game.enemies.push({ x: GAME_WIDTH/2 + (Math.random() - 0.5) * GAME_WIDTH, y: HORIZON_Y, vx: (Math.random() - 0.5) * 10, type: 'asteroid', health: 200, maxHealth: 200, speed: 10 + Math.random() * 6, size: 40 + Math.random() * 30, moveDir: 0, moveTimer: 0, attackTimer: 0, retreatTimer: 0, coordTimer: 0, isAsteroid: true, color: '#888', aiState: 'aggressive' });
      }

      // Spawn regular enemies (only if no boss and not boss rush restricted)
      if (!game.boss && now - game.lastEnemySpawn > spawnRate && gameMode !== 'boss_rush') {
        const canSpawnSquad = gameState.distance > 400 && now - (game.lastSquadSpawn || 0) > 8000;
        if (canSpawnSquad && Math.random() < 0.25) {
           game.lastSquadSpawn = now; game.lastEnemySpawn = now;
           const squadId = `squad_${now}`;
           const pattern = ['V', 'Line', 'Diamond', 'Column'][Math.floor(Math.random() * 4)];
           const leaderX = GAME_WIDTH / 2;
           const squadSize = 3 + Math.floor(Math.random() * 2);
           const createSquadMember = (offsetX, offsetY, isLeader = false) => {
              const hp = isLeader ? 80 : 40;
              game.enemies.push({ x: leaderX + offsetX, y: HORIZON_Y + offsetY, vx: 0, type: isLeader && gameState.distance > 1000 ? 'tank' : 'fast', health: hp, maxHealth: hp, speed: 4, size: isLeader ? 35 : 25, moveDir: Math.random() > 0.5 ? 1 : -1, moveTimer: 0, attackTimer: 0, squadId: squadId, isLeader: isLeader, leaderId: isLeader ? null : squadId + '_leader', squadOffset: { x: offsetX, y: offsetY }, aiState: 'formation', color: isLeader ? '#ffaa00' : '#ff4400' });
           };

           // Spawn Leader
           createSquadMember(0, 0, true);
           
           // Spawn Members based on pattern
           for(let i=1; i<squadSize; i++) {
              let offX = 0, offY = 0;
              const spacing = 40;
              
              if (pattern === 'V') {
                 offX = (i % 2 === 0 ? 1 : -1) * (Math.ceil(i/2) * spacing);
                 offY = Math.ceil(i/2) * -spacing;
              } else if (pattern === 'Line') {
                 offX = (i % 2 === 0 ? 1 : -1) * (Math.ceil(i/2) * spacing * 1.5);
                 offY = 0;
              } else if (pattern === 'Column') {
                 offX = 0;
                 offY = -i * spacing;
              } else if (pattern === 'Diamond') {
                 // Simple diamond for 4 units: Top (leader), Left, Right, Bottom
                 if (i===1) { offX = -spacing; offY = spacing; }
                 if (i===2) { offX = spacing; offY = spacing; }
                 if (i===3) { offX = 0; offY = spacing * 2; }
              }
              
              createSquadMember(offX, offY, false);
           }
           
           // Skip regular spawn this frame
        } else {

        const lane = Math.floor(Math.random() * LANE_COUNT);

        // Expanded enemy roster with elite variants and new types
        let availableTypes = ['basic'];

        if (gameState.distance > 300) availableTypes.push('fast', 'shield');
        if (gameState.distance > 700) availableTypes.push('tank', 'sniper', 'flyer');
        if (gameState.distance > 1200) availableTypes.push('splitter', 'divebomber');
        if (gameState.distance > 1800) availableTypes.push('teleporter', 'kamikaze');
        if (gameState.distance > 2500) availableTypes.push('summoner', 'healer');
        if (gameState.distance > 3200) availableTypes.push('stealth', 'reflector');
        if (gameState.distance > 4000) availableTypes.push('orbital', 'blackhole');
        
        // Ground Fixed Forces
        if (gameState.distance > 500) availableTypes.push('turret');
        if (gameState.distance > 1500) availableTypes.push('heavy_turret');

        // Elite variants at higher distances (chance scales with performance)
        // More deadly: higher elite chance
        const eliteChance = 0.25 + (performanceScore * 0.15); // Up to ~50-60% for good players
        const isElite = gameState.distance > 800 && Math.random() < eliteChance;

        let type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        if (isElite) type = 'elite_' + type;
        
        // Speed increases with distance and weapon level (difficultyMultiplier includes both now)
        const speedBoost = Math.min(difficultyMultiplier * 0.6, 5);
        
        // Enemy stats based on type (including elite variants)
        let enemyData = { health: 50, speed: 3, size: 25, isElite: false };
        const baseType = type.replace('elite_', '');

        switch(baseType) {
          case 'basic': enemyData = { health: 50, speed: 3, size: 25 }; break;
          case 'fast': enemyData = { health: 30, speed: 6, size: 20 }; break;
          case 'tank': enemyData = { health: 100, speed: 2, size: 35 }; break;
          case 'shield': enemyData = { health: 60, speed: 2.5, size: 28, shield: true, shieldRecharge: true }; break;
          case 'sniper': enemyData = { health: 40, speed: 1.5, size: 22, canShoot: true }; break;
          case 'splitter': enemyData = { health: 70, speed: 2.8, size: 26, splits: true, splitCount: 3 }; break;
          case 'teleporter': enemyData = { health: 50, speed: 3.5, size: 24, teleports: true }; break;
          case 'flyer': enemyData = { health: 45, speed: 4, size: 22, flies: true }; break;
          case 'divebomber': enemyData = { health: 55, speed: 2, size: 24, diveBombs: true }; break;
          case 'kamikaze': enemyData = { health: 35, speed: 5, size: 20, kamikaze: true }; break;
          case 'summoner': enemyData = { health: 80, speed: 1.5, size: 30, summons: true }; break;
          case 'healer': enemyData = { health: 60, speed: 2, size: 26, heals: true }; break;
          case 'stealth': enemyData = { health: 40, speed: 4, size: 22, stealth: true }; break;
          case 'orbital': enemyData = { health: 75, speed: 3, size: 28, orbital: true }; break;
          case 'turret': enemyData = { health: 80, speed: 5, size: 30, canShoot: true, fixed: true }; break; // Ground speed matches game flow
          case 'heavy_turret': enemyData = { health: 150, speed: 5, size: 35, canShoot: true, fixed: true, rapidFire: true }; break;
          case 'reflector': enemyData = { health: 90, speed: 2, size: 32, reflects: true }; break;
          case 'blackhole': enemyData = { health: 200, speed: 1, size: 45, pulls: true }; break;
        }

        // Elite enhancements: +50% health, +30% speed, special resistances
        if (type.startsWith('elite_')) {
          enemyData.health = Math.floor(enemyData.health * 1.5);
          enemyData.speed *= 1.3;
          enemyData.isElite = true;
          enemyData.resistance = 0.25; // 25% damage reduction
        }

        // Calculate trajectory
        const targetX = 20 + (lane + 0.5) * LANE_WIDTH;
        let startX = GAME_WIDTH / 2;
        let startY = HORIZON_Y;
        let vx = 0;
        let totalSpeed = enemyData.speed + speedBoost;

        if (enemyData.fixed) {
           // Fixed ground units spawn directly on their lane at horizon
           startX = targetX;
           vx = 0;
           totalSpeed = 5; // Fixed speed for ground illusion
        } else {
           // Flying units spawn from mothership
           const distY = Math.max(1, GAME_HEIGHT - HORIZON_Y);
           const safeSpeed = Math.max(0.1, totalSpeed);
           const frames = distY / safeSpeed;
           vx = (targetX - (GAME_WIDTH / 2)) / Math.max(1, frames);
        }

        game.enemies.push({
          x: startX,
          y: startY,
          vx,
          baseLaneX: targetX,
          type,
          health: enemyData.health,
          maxHealth: enemyData.health,
          speed: totalSpeed,
          size: enemyData.size,
          moveDir: Math.random() > 0.5 ? 1 : -1,
          moveTimer: 0,
          attackTimer: 0,
          teleportTimer: 0,
          retreatTimer: 0,
          coordTimer: 0,
          movePattern: gameState.distance > 1500 ? (Math.random() > 0.5 ? 'zigzag' : 'wave') : 'simple',
          shield: enemyData.shield || false,
          shieldActive: true,
          shieldRecharge: enemyData.shieldRecharge || false,
          shieldRechargeTimer: 0,
          canShoot: enemyData.canShoot || false,
          splits: enemyData.splits || false,
          splitCount: enemyData.splitCount || 2,
          teleports: enemyData.teleports || false,
          flies: enemyData.flies || false,
          flyTimer: 0,
          diveBombs: enemyData.diveBombs || false,
          diveState: 'hover',
          diveTimer: 0,
          kamikaze: enemyData.kamikaze || false,
          summons: enemyData.summons || false,
          summonTimer: 0,
          heals: enemyData.heals || false,
          healTimer: 0,
          stealth: enemyData.stealth || false,
          orbital: enemyData.orbital || false,
          orbitalAngle: Math.random() * Math.PI * 2,
          reflects: enemyData.reflects || false,
          pulls: enemyData.pulls || false,
          isElite: enemyData.isElite || false,
          resistance: enemyData.resistance || 0,
          aiState: 'aggressive', // aggressive, retreating, flanking, coordinating
          flankDirection: Math.random() > 0.5 ? 1 : -1,
          fixed: enemyData.fixed || false,
          rapidFire: enemyData.rapidFire || false
        });
        game.lastEnemySpawn = now;
      }
      }

      game.nextEventTimer = (game.nextEventTimer || 0) + deltaTime;
      if (game.nextEventTimer > 40000 && !game.boss && !game.activeEvent && gameState.distance > 500 && gameMode !== 'boss_rush') {
         game.nextEventTimer = 0; game.activeEvent = ['asteroid_shower', 'coin_frenzy', 'hyper_speed', 'nebula_cloud'][Math.floor(Math.random() * 4)];
         game.eventDuration = 15000; 
         // gameEventBus.emit('message', game.activeEvent.replace('_', ' ').toUpperCase() + "!");
         onStateUpdate(prev => ({ ...prev, activeEvent: game.activeEvent }));
         game.soundPlayer?.playBossTaunt();
      }
      if (game.activeEvent && (game.eventDuration -= deltaTime) <= 0) {
         game.activeEvent = null; onStateUpdate(prev => ({ ...prev, activeEvent: null }));
      }
      const cr = game.activeEvent === 'asteroid_shower' ? 400 : game.activeEvent === 'coin_frenzy' ? 150 : 800;
      if (now - game.lastCoinSpawn > cr) {
        game.coins.push({ x: 20 + (Math.floor(Math.random() * LANE_COUNT) + 0.5) * LANE_WIDTH, y: -20, collected: false }); game.lastCoinSpawn = now;
      }
      if (now - game.lastBabySpawn > 2000 && Math.random() < 0.3) {
        game.babies.push({ x: 20 + (Math.floor(Math.random() * LANE_COUNT) + 0.5) * LANE_WIDTH, y: -20, floatOffset: Math.random() * Math.PI * 2, collected: false }); game.lastBabySpawn = now;
      }
      if (now - game.lastWeaponSpawn > Math.max(3000, 8000 - (gameState.distance * 0.5))) {
        const wt = [...ALL_SHOOTER_WEAPONS, 'random', 'hybrid'];
        game.weapons.push({ x: 20 + (Math.floor(Math.random() * LANE_COUNT) + 0.5) * LANE_WIDTH, y: -30, type: wt[Math.floor(Math.random() * wt.length)] }); game.lastWeaponSpawn = now;
      }

      // Spawn temporary power-ups with expanded variety
      const powerupSpawnRate = 10000; // Every 10 seconds
      if (now - game.lastPowerupSpawn > powerupSpawnRate) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        let customSpawned = false;

        // Inject Custom Powerups/Items
        if (game.customItems && game.customItems.length > 0 && Math.random() < 0.3) {
           const customItem = game.customItems[Math.floor(Math.random() * game.customItems.length)];
           if (customItem) {
             game.powerups.push({
                x: 20 + (lane + 0.5) * LANE_WIDTH,
                y: -30,
                type: 'custom_' + customItem.id,
                customData: customItem,
                image: customItem.image,
                pulseTimer: 0
             });
             game.lastPowerupSpawn = now;
             customSpawned = true;
           }
        }

        if (!customSpawned) {
            // Expanded power-up pool - Include requested types earlier for dynamic gameplay
            let powerupTypes = ['multiplier_50', 'invincibility', 'rapidfire', 'weapon_overdrive', 'coin_magnet'];

            // Add advanced power-ups at higher distances
            if (gameState.distance > 500) {
              powerupTypes.push('shield_overcharge', 'weapon_overdrive', 'chain_lightning', 'multiplier_500');
            }
            if (gameState.distance > 1000) {
              powerupTypes.push('coin_magnet', 'ghost_mode', 'time_slow', 'vampirism');
            }
            if (gameState.distance > 1500) {
              powerupTypes.push('orbital_guard', 'nuke', 'multiplier_1000');
            }

            const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
            game.powerups.push({
              x: 20 + (lane + 0.5) * LANE_WIDTH,
              y: -30,
              type,
              pulseTimer: 0
            });
            game.lastPowerupSpawn = now;
        }
      }

      // Update and draw bullets
      if (visualMode === 1) ctx.globalCompositeOperation = 'lighter'; // Additive blending for bullets in bloom mode
      
      game.bullets = game.bullets.filter(bullet => {
        bullet.timer = (bullet.timer || 0) + 1;

        // Homing behavior
        if (bullet.isHoming && game.enemies.length > 0) {
          const closestEnemy = game.enemies.reduce((closest, enemy) => {
            const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
            const closestDist = Math.hypot(bullet.x - closest.x, bullet.y - closest.y);
            return dist < closestDist ? enemy : closest;
          }, game.enemies[0]);

          const dx = closestEnemy.x - bullet.x;
          const dy = closestEnemy.y - bullet.y;
          const angle = Math.atan2(dy, dx);
          bullet.x += Math.cos(angle) * 5; // Faster homing
          bullet.y += Math.sin(angle) * 5;
        }

        // Wave behavior
        if (bullet.isWave) {
           bullet.x += Math.sin(bullet.timer * 0.2 + (bullet.waveOffset || 0)) * 5;
        }

        // Helix behavior
        if (bullet.isHelix) {
           bullet.x += Math.sin(bullet.timer * 0.2 + (bullet.helixOffset || 0)) * 8; // Wider helix
        }

        // Angular spread
        if (bullet.vx) {
           bullet.x += bullet.vx;
        }

        // Boomerang logic: fly out, slow down, fly back
        if (bullet.weapon === 'boomerang') {
           if (bullet.timer < 30) {
              bullet.y -= bullet.speed; // Fly out
           } else if (bullet.timer < 45) {
              bullet.y -= bullet.speed * 0.3; // Slow down
           } else {
              bullet.y += bullet.speed * 0.8; // Return (but will hit horizon check? No, goes down)
              // We need to keep it alive if it goes down? 
              // The horizon check returns bullet.y > HORIZON_Y. 
              // If it comes back down towards player (y increases), it stays valid until it goes off screen bottom
              // Standard check is `return bullet.y > HORIZON_Y;`
              // If it goes DOWN, y increases. It will eventually hit GAME_HEIGHT. 
              // We need to remove if y > GAME_HEIGHT too.
              if (bullet.y > GAME_HEIGHT) return false;
           }
        } else {
           bullet.y -= bullet.speed;
        }

        // Calculate perspective scale
        const horizonDist = Math.max(1, GAME_HEIGHT - HORIZON_Y);
        const bulletDepth = (bullet.y - HORIZON_Y) / horizonDist;
        if (bulletDepth <= 0 || !Number.isFinite(bulletDepth)) return false; // Behind horizon or invalid

        // Weapon effect customization with perspective
        let weaponEffect = safeCustomization.equipped.effects || 'standard';

        // Demo mode override
        if (gameRef.current.demoMode) {
          const effectsKeys = Object.keys(WEAPON_EFFECTS);
          weaponEffect = effectsKeys[gameRef.current.demoIndex % effectsKeys.length];
        }

        const baseGlowSize = bullet.isMutated ? bullet.size * 3 : 
                        weaponEffect === 'neon' ? bullet.size * 2.5 :
                        weaponEffect === 'glow' ? bullet.size * 2.2 : bullet.size * 2;
        const glowSize = baseGlowSize * bulletDepth;
        const scaledBulletSize = bullet.size * bulletDepth;

        const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, glowSize);

        const wc = { 'laser': ['#00ffff', '#88ffff'], 'plasma': ['#ff00ff', '#ff88ff'], 'rocket': ['#ff8800', '#ffcc00'], 'pulse': ['#0088ff', '#00ffff'], 'spread': ['#ff0000', '#ff8888'], 'wave': ['#44ff44', '#88ffcc'], 'railgun': ['#ccffff', '#ffffff'], 'orb': ['#aa00ff', '#ff88ff'], 'seeker': ['#ffff00', '#ffff88'], 'chain': ['#aaddff', '#ffffff'], 'boomerang': ['#ffaa44', '#ffdd88'], 'flamethrower': ['#ff4400', '#ffaa00'], 'sonic': ['#cc00ff', '#ee88ff'], 'prism': ['#ddffff', '#ffffff'], 'swarm': ['#ffff00', '#ffff88'], 'vortex': ['#8800ff', '#aa00ff'], 'neutron': ['#ffff00', '#ffff88'], 'helix': ['#00ff88', '#00ffaa'], 'starfall': ['#ffffff', '#aaffff'] };
        const sc = { 'beam': '#00aaff', 'cannon': '#888888', 'grenade': '#00ff00', 'missile': '#ff4400', 'torpedo': '#000044', 'dart': '#ffff00', 'rail_pulse': '#00ffff', 'energy_ball': '#ff00ff', 'plasma_burst': '#aa00ff', 'ion_cannon': '#0088ff', 'shockwave': '#ffffff', 'laser_turret': '#ff0000', 'rail_boomerang': '#ffaa00', 'sonic_wave': '#00ff00', 'prism_beam': '#ff88ff', 'swarm_drone': '#ffffaa', 'vortex_trap': '#440088', 'neutron_pulse': '#00ff88', 'helix_shot': '#ff0088', 'starfall_missile': '#ffff00', 'void': '#000000', 'cluster': '#ff0000' };
        if (wc[bullet.weapon]) gradient.addColorStop(0, bullet.isMutated ? wc[bullet.weapon][1] : wc[bullet.weapon][0]);
        else gradient.addColorStop(0, sc[bullet.weapon] || '#00ff88');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Weapon effect extras
        if (weaponEffect === 'spark') {
          // Electric sparks
          for (let i = 0; i < 3; i++) {
            const sparkX = bullet.x + (Math.random() - 0.5) * 10;
            const sparkY = bullet.y + (Math.random() - 0.5) * 10;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bullet.x, bullet.y);
            ctx.lineTo(sparkX, sparkY);
            ctx.stroke();
          }
        } else if (weaponEffect === 'neon') {
          // Neon trail
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bullet.x, bullet.y);
          ctx.lineTo(bullet.x, bullet.y + 15);
          ctx.stroke();
        }

        // Extra glow for mutated
        if (bullet.isMutated) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, bullet.size / 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, scaledBulletSize / 2, 0, Math.PI * 2);
        ctx.fill();

        return bullet.y > HORIZON_Y;
      });
      if (visualMode === 1) ctx.globalCompositeOperation = 'source-over'; // Reset blending

      // Update and draw boss
      if (game.boss) {
        const boss = game.boss;
        
        // Self-Correction: Fix NaN Position
        if (!Number.isFinite(boss.x)) {
           console.error("Boss X is NaN, resetting to center");
           boss.x = GAME_WIDTH / 2;
        }
        if (!Number.isFinite(boss.y)) {
           console.error("Boss Y is NaN, resetting to horizon");
           boss.y = HORIZON_Y - 100;
        }
        if (!Number.isFinite(boss.health)) {
           boss.health = boss.maxHealth || 10000;
        }

        // Initialize AI State
        boss.aiState = boss.aiState || 'idle'; // idle, charging, recovering, shielded
        boss.aiTimer = (boss.aiTimer || 0) + 1;

        // Boss AI Behavior
        if (boss.aiState === 'charging') {
            // Charge Attack Behavior
            if (boss.aiTimer < 40) {
                // Warning Phase - Shake and flash
                boss.x += (Math.random() - 0.5) * 10;
                ctx.save();
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                ctx.setLineDash([10, 10]);
                ctx.beginPath();
                ctx.moveTo(boss.x, boss.y);
                ctx.lineTo(boss.x, GAME_HEIGHT);
                ctx.stroke();
                ctx.restore();
            } else if (boss.aiTimer < 60) {
                // Dash
                boss.y += Math.max(35, GAME_HEIGHT / 15); // Fast dive relative to screen height
            } else {
                // Recovery
                boss.aiState = 'recovering';
                boss.aiTimer = 0;
            }
        } else if (boss.aiState === 'recovering') {
            // Return to position
            const targetY = HORIZON_Y + 50;
            const dy = targetY - boss.y;
            boss.y += dy * 0.05;
            if (Math.abs(dy) < 5) {
                boss.aiState = 'idle';
                boss.aiTimer = 0;
            }
        } else if (boss.aiState === 'shielded') {
            // Invulnerable - hover in place
            boss.y = HORIZON_Y + 50 + Math.sin(boss.moveTimer * 0.05) * 20;
            
            // Visual Shield
            ctx.save();
            if (!Number.isFinite(boss.x) || !Number.isFinite(boss.y) || !Number.isFinite(boss.size)) {
               console.error("Invalid boss coordinates/size during shield render", boss);
            }
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(boss.x, boss.y, boss.size * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Check if generators are dead
            const generators = game.enemies.filter(e => e.type === 'shield_generator');
            if (generators.length === 0) {
                boss.aiState = 'idle';
                boss.shieldBroken = true; // Flag for vulnerability bonus?
                game.screenShake = 20;
                game.soundPlayer?.playExplosion();
            }
        } else {
            // Standard Idle/Hover Movement
            const safeSpeed = Number.isFinite(boss.speed) ? boss.speed : 1;
            if (boss.y < HORIZON_Y + 50) {
               boss.y += safeSpeed * 2;
            } else {
               boss.y = HORIZON_Y + 50 + Math.sin(boss.moveTimer * 0.03) * 50;
            }
            boss.moveTimer++;
            boss.attackTimer++;

            // Boss horizontal movement pattern
            boss.x += Math.sin(boss.moveTimer * 0.02) * 3;
            boss.x = Math.max(80, Math.min(GAME_WIDTH - 80, boss.x));
            
            // Randomly trigger special behaviors (Spiced up: Active in Phase 1 too!)
            // Phase 1 now has a small chance to Charge or Shield, keeping players on toes.
            const specialChance = boss.phase >= 2 ? 0.008 : 0.003; 
            if (Math.random() < specialChance && boss.aiTimer > 150) {
                const rand = Math.random();
                if (rand < 0.5) { // Increased charge chance
                    boss.aiState = 'charging';
                    boss.aiTimer = 0;
                    game.soundPlayer?.playBossTaunt();
                } else if (rand < 0.7 && !boss.hasShielded) {
                     // Spawn Shield Generators
                     boss.aiState = 'shielded';
                     boss.hasShielded = true; // Once per fight? or reset in phase 3?
                     // Spawn 2 generators
                     for(let i=0; i<2; i++) {
                         game.enemies.push({
                             x: i === 0 ? 50 : GAME_WIDTH - 50,
                             y: HORIZON_Y + 100,
                             type: 'shield_generator',
                             health: 500,
                             maxHealth: 500,
                             speed: 0,
                             size: 30,
                             fixed: true,
                             color: '#00ffff'
                         });
                     }
                }
            }
        }

        // Phase transitions
        const healthPercent = boss.health / boss.maxHealth;

        if (healthPercent <= 0.75 && !boss.persistenceTauntPlayed) {
           boss.persistenceTauntPlayed = true;
           game.soundPlayer?.playPersistenceTaunt();
        }

        if (healthPercent <= 0.50 && !boss.neverStopTauntPlayed) {
           boss.neverStopTauntPlayed = true;
           try {
             game.soundPlayer?.playNeverStopTaunt();
           } catch (e) {
             console.warn("Taunt failed safely", e);
           }
        }

        if (healthPercent <= 0.25 && !boss.mercyTauntPlayed) {
           boss.mercyTauntPlayed = true;
           game.soundPlayer?.playMercyTaunt();
        }

        if (healthPercent <= 0.66 && boss.phase === 1) {
          boss.phase = 2;
          boss.phaseTransition = true;
          game.screenShake = 20; // Trigger screen shake
          game.phaseTransitionTimer = 30; // Flash timer
          createParticles(boss.x, boss.y, 40, '#ff00ff', 8, 50);
          game.soundPlayer?.playExplosion();
          
          // SPAWN CLONE for Phase 2
          game.bossClone = {
             x: GAME_WIDTH - boss.x,
             y: boss.y,
             health: boss.maxHealth * 0.4,
             maxHealth: boss.maxHealth * 0.4,
             size: boss.size * 0.8,
             moveTimer: 0,
             attackTimer: 0,
             speed: boss.speed * 1.2
          };
          createParticles(GAME_WIDTH - boss.x, boss.y, 30, '#00ffff', 6, 40);

        } else if (healthPercent <= 0.33 && boss.phase === 2) {
          boss.phase = 3;
          boss.phaseTransition = true;
          game.screenShake = 30; // Intense screen shake
          game.phaseTransitionTimer = 40; // Longer flash
          createParticles(boss.x, boss.y, 60, '#ff0000', 10, 60);
          game.soundPlayer?.playExplosion();
          
          // Sacrifice/Destroy Clone in Phase 3
          if (game.bossClone) {
             createParticles(game.bossClone.x, game.bossClone.y, 50, '#ff00ff', 8, 50);
             game.explosions.push({ x: game.bossClone.x, y: game.bossClone.y, frame: 0, maxFrame: 30 });
             game.bossClone = null; // Clone consumed/destroyed
          }
        }

        // Handle flash decay
        if (game.phaseTransitionTimer > 0) game.phaseTransitionTimer--;

        // Update Boss Clone (Phase 2)
        if (game.bossClone) {
           const clone = game.bossClone;
           clone.moveTimer++;
           clone.attackTimer++;
           
           // Mirror movement (Safe check)
           const safeBossX = Number.isFinite(boss.x) ? boss.x : GAME_WIDTH / 2;
           const safeBossY = Number.isFinite(boss.y) ? boss.y : HORIZON_Y + 100;
           
           clone.x = GAME_WIDTH - safeBossX;
           clone.y = safeBossY + Math.sin(clone.moveTimer * 0.05) * 20;
           
           // Clone attacks
           if (clone.attackTimer > 50) {
           clone.attackTimer = 0;

           if (Math.random() < 0.3) {
              // Clone Homing Attack
              game.enemies.push({
                 x: Number.isFinite(clone.x) ? clone.x : GAME_WIDTH / 2,
                 y: (Number.isFinite(clone.y) ? clone.y : safeBossY) + 40,
                 type: 'boss_homing',
                 health: 1,
                 maxHealth: 1,
                 speed: 3,
                 size: 10,
                 moveDir: 0,
                 moveTimer: 0,
                 isBossProjectile: true,
                 homingTarget: true
              });
           } else {
              // Clone Spread
              const cX = Number.isFinite(clone.x) ? clone.x : GAME_WIDTH / 2;
              const cY = Number.isFinite(clone.y) ? clone.y : safeBossY;
              
              for(let i=-1; i<=1; i++) {
                 game.enemies.push({
                     x: cX + i * 20,
                     y: cY + 40,
                     type: 'boss_projectile',
                     health: 1,
                     maxHealth: 1,
                     speed: 5, // Fast
                     size: 8,
                     moveDir: 0,
                     moveTimer: 0,
                     isBossProjectile: true
                 });
              }
           }
           }
           
           // Check collisions for clone
           game.bullets = game.bullets.filter(bullet => {
              const dist = Math.hypot(bullet.x - clone.x, bullet.y - clone.y);
              if (dist < clone.size + bullet.size) {
                 clone.health -= bullet.damage;
                 createParticles(bullet.x, bullet.y, 5, '#00ffff', 3, 15);
                 return false;
              }
              return true;
           });
           
           if (clone.health <= 0) {
              createParticles(clone.x, clone.y, 40, '#00ffff', 8, 40);
              game.explosions.push({ x: clone.x, y: clone.y, frame: 0, maxFrame: 30 });
              game.soundPlayer?.playExplosion();
              game.bossClone = null;
              // Optional: Damage main boss when clone dies?
              onStateUpdate(prev => ({ ...prev, coins: prev.coins + 50 }));
           }
        }

        // Boss attacks - Only if not recovering/shielded
        // Adaptive: Attacks get faster as player performs better
        // SPICE: Reduced base intervals for Phase 1 & 2 (Was 60/45/30)
        const baseAttackInterval = boss.phase === 3 ? 25 : boss.phase === 2 ? 35 : 45;
        const adaptiveInterval = Math.max(15, baseAttackInterval * bossAggressionMult);
        
        if (boss.aiState === 'idle' && boss.attackTimer > adaptiveInterval) {
         boss.attackTimer = 0;

         let attackStyle = boss.data?.attackType || 'fast';
         if (boss.phase === 2 && Math.random() < 0.35) attackStyle = 'bullet_hell_1';
         if (boss.phase === 3 && Math.random() < 0.55) attackStyle = 'bullet_hell_2';

          const bColor = boss.data?.accent || '#ff0000';
          
          // Helper to spawn projectile
          const spawnProj = (props) => {
             if (!Number.isFinite(boss.x) || !Number.isFinite(boss.y)) {
                console.error("Attempting to spawn projectile from invalid boss position", boss);
                return;
             }
             game.enemies.push({
                 x: boss.x,
                 y: boss.y + 40,
                 type: 'boss_projectile',
                 health: 1,
                 maxHealth: 1,
                 speed: 4,
                 size: 10,
                 moveDir: 0,
                 moveTimer: 0,
                 isBossProjectile: true,
                 color: bColor,
                 ...props
             });
          };

          // Weapon implementations based on Type
          switch(attackStyle) {
            case 'bullet_hell_1':
               boss.spiralAngle = (boss.spiralAngle || 0) + 0.4;
               for(let i=0; i<8; i++) {
                   const angle = boss.spiralAngle + (Math.PI * 2 * i) / 8;
                   spawnProj({ vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5 + 3, size: 8, color: '#ff00ff' });
               }
               break;

            case 'bullet_hell_2':
               for(let i=0; i<16; i++) {
                   const angle = (Math.PI * 2 * i) / 16;
                   spawnProj({ vx: Math.cos(angle) * 6, vy: Math.abs(Math.sin(angle)) * 6 + 2, size: 6, color: '#ff0000' });
               }
               spawnProj({ speed: 3, size: 16, homingTarget: true, color: '#ffffff' });
               break;

            case 'magic': // CEREBRAL DRONE
               // Homing Orbs - Nerfed count and speed
               const count = boss.phase + 1; // Was phase * 2 + 1 (3/5/7 -> 2/3/4)
               for(let i=0; i<count; i++) {
                   spawnProj({
                       type: 'boss_homing',
                       speed: 1.5 + boss.phase * 0.5, // Slower projectiles
                       size: 12,
                       homingTarget: true,
                       color: '#aa00aa'
                   });
               }
               break;

            case 'tech': // VOID WALKER / CYBER LICH
               if (boss.phase === 1 || Math.random() < 0.5) {
                   // Laser Grid
                   const lanes = Array.from({length: LANE_COUNT}, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, boss.phase + 1);
                   lanes.forEach(lane => {
                      game.enemies.push({
                        x: 20 + (lane + 0.5) * LANE_WIDTH,
                        y: 0,
                        type: 'orbital_laser',
                        health: 1000,
                        maxHealth: 1000,
                        speed: 0,
                        size: LANE_WIDTH * 0.6,
                        isBossProjectile: true,
                        isLaser: true,
                        laserState: 'warning',
                        laserTimer: 0,
                        color: bColor
                      });
                   });
               } else {
                   // Shield Breakers
                   spawnProj({
                       type: 'boss_shield_breaker',
                       speed: 5,
                       size: 20,
                       isShieldBreaker: true,
                       homingTarget: true,
                       color: '#00ffff'
                   });
               }
               break;

            case 'heavy': // HIVE COMMANDER
               if (Math.random() < 0.4) {
                   // Mines
                   for(let i=-1; i<=1; i+=0.5) {
                       spawnProj({
                           type: 'boss_mine',
                           vx: i * 2,
                           speed: 2,
                           isMine: true,
                           size: 15
                       });
                   }
               } else {
                   // Big Shot
                   spawnProj({
                       size: 40,
                       speed: 4,
                       damage: 50 // Needs custom damage logic or hit mult
                   });
               }
               break;

            case 'orbital': // NEURAL OVERMIND
               // Rotating Lasers
               game.enemies.push({
                   x: boss.x,
                   y: boss.y + 20,
                   type: 'boss_rotating_laser',
                   health: 1000,
                   maxHealth: 1000,
                   speed: 0,
                   size: 5,
                   isBossProjectile: true,
                   isRotatingLaser: true,
                   angle: Math.random() * Math.PI,
                   color: '#00ff00'
               });
               break;

            case 'fire': // SOLAR GUARDIAN
               // Fire spread
               for(let i=-2; i<=2; i++) {
                   spawnProj({
                       vx: i * 1.5,
                       speed: 5,
                       color: '#ff4400',
                       size: 15
                   });
               }
               // Beam chance
               if (boss.phase >= 2 && Math.random() < 0.3) {
                   game.enemies.push({
                      x: boss.x,
                      y: boss.y + 20,
                      type: 'boss_beam_charge',
                      health: 1000,
                      maxHealth: 1000,
                      speed: 0,
                      size: 10,
                      isBossProjectile: true,
                      isBeam: true,
                      beamState: 'charging',
                      beamTimer: 0,
                      color: '#ffaa00'
                   });
               }
               break;

            case 'void': // NEBULA STALKER
               // Gravity/Void shots
               for(let i=0; i<3; i++) {
                   spawnProj({
                       x: boss.x + (Math.random()-0.5)*100,
                       speed: 3,
                       size: 25,
                       color: '#440088',
                       homingTarget: true // Void seeks
                   });
               }
               break;
            
            case 'quantum': // QUANTUM BRAIN
               // Teleporting shots (implemented visually as fast erratic shots for now)
               for(let i=0; i<5; i++) {
                   spawnProj({
                       vx: (Math.random()-0.5) * 10,
                       speed: 4 + Math.random() * 4,
                       color: '#00ffff',
                       size: 8
                   });
               }
               break;

            case 'chaos': // THE OMNISCIENT
               // Random mix
               const r = Math.random();
               if (r < 0.33) {
                   // Energy Wave
                   game.enemies.push({
                       x: GAME_WIDTH/2,
                       y: boss.y + 40,
                       type: 'energy_wave',
                       health: 1000,
                       maxHealth: 1000,
                       speed: 6,
                       size: GAME_WIDTH, // Full width wave
                       isBossProjectile: true,
                       isEnergyWave: true,
                       color: '#ff00ff'
                   });
               } else if (r < 0.66) {
                   // Beam
                    game.enemies.push({
                      x: boss.x,
                      y: boss.y + 20,
                      type: 'boss_beam_charge',
                      health: 1000,
                      maxHealth: 1000,
                      speed: 0,
                      size: 10,
                      isBossProjectile: true,
                      isBeam: true,
                      beamState: 'charging',
                      beamTimer: 0,
                      color: '#ffffff'
                   });
               } else {
                   // Spam projectiles
                   for(let i=-3; i<=3; i++) {
                       spawnProj({ vx: i, speed: 5, color: '#ff0000' });
                   }
               }
               break;

            default: // FAST / XENO SCOUT
                // Rapid fire spread - SPICE: Occasional bursts in Phase 1
                const spread = boss.phase === 1 ? (Math.random() < 0.2 ? 3 : 1) : boss.phase === 2 ? 3 : 5;
                for(let i=0; i<spread; i++) {
                    const offset = i - Math.floor(spread/2);
                    spawnProj({
                        vx: offset * 1.5,
                        speed: 6, // Fast
                        size: 8,
                        color: bColor
                    });
                }
          }
        }

        // Check bullet collisions with boss
        game.bullets = game.bullets.filter(bullet => {
          const dist = Math.hypot(bullet.x - boss.x, bullet.y - boss.y);
          if (dist < boss.size + bullet.size) {
            if (boss.aiState === 'shielded') {
                // Deflect bullets
                createParticles(bullet.x, bullet.y, 5, '#00ffff', 5, 10);
                return false;
            }
            boss.health -= bullet.damage;
            createParticles(bullet.x, bullet.y, 8, '#ffaa00', 4, 20);
            return false;
          }
          return true;
        });

        // Check player collision with boss body
        const playerDist = Math.hypot(game.player.x - boss.x, (GAME_HEIGHT - 60) - boss.y);
        const p2Dist = game.player2 && !game.player2.isDead ? Math.hypot(game.player2.x - boss.x, (GAME_HEIGHT - 60) - boss.y) : Infinity;
        
        // Charge Attack Collision (Deadlier)
        if (boss.aiState === 'charging' && (playerDist < PLAYER_SIZE / 2 + boss.size + 20 || p2Dist < PLAYER_SIZE / 2 + boss.size + 20)) {
           const now = Date.now();
           if (!boss.lastPlayerHit || now - boss.lastPlayerHit > 500) {
              boss.lastPlayerHit = now;
              const defPwr = (gameState.activePowerups || []).find(p => p.type === 'invincibility' || p.type === 'shield_overcharge' || p.type === 'orbital_guard');
              if (defPwr) {
                  onStateUpdate(prev => ({ ...prev, activePowerups: prev.activePowerups.filter(p => p.type !== defPwr.type) }));
                  createParticles(game.player.x, GAME_HEIGHT - 60, 40, '#00ffff', 8, 40); game.screenShake = 10;
              } else {
                  onStateUpdate(prev => ({ ...prev, health: prev.health - Math.floor(40 * playerDamageTakenMult) }));
                  game.soundPlayer?.playExplosion(); createParticles(game.player.x, GAME_HEIGHT - 60, 40, '#ff0000', 8, 40); game.screenShake = 30;
              }
           }
        } else if (playerDist < PLAYER_SIZE / 2 + boss.size || p2Dist < PLAYER_SIZE / 2 + boss.size) {
           const now = Date.now();
           if (!boss.lastPlayerHit || now - boss.lastPlayerHit > 1000) {
              boss.lastPlayerHit = now;
              const defPwr = (gameState.activePowerups || []).find(p => p.type === 'invincibility' || p.type === 'shield_overcharge' || p.type === 'orbital_guard');
              if (defPwr) {
                  onStateUpdate(prev => ({ ...prev, activePowerups: prev.activePowerups.filter(p => p.type !== defPwr.type) }));
                  createParticles(game.player.x, GAME_HEIGHT - 60, 20, '#00ffff', 5, 30); game.screenShake = 5;
              } else {
                  onStateUpdate(prev => ({ ...prev, health: prev.health - Math.floor(Math.floor((100 + upgrades.health * 25) * 0.1) * playerDamageTakenMult) }));
                  game.soundPlayer?.playExplosion(); createParticles(game.player.x, GAME_HEIGHT - 60, 20, '#ff0000', 5, 30); game.screenShake = 10;
              }
           }
        }

        // Boss defeated
        if (boss.health <= 0) {
          game.explosions.push({
            x: boss.x,
            y: boss.y,
            frame: 0,
            maxFrame: 40
          });

          // Epic explosion
          createParticles(boss.x, boss.y, 60, '#ff0000', 10, 60);
          createParticles(boss.x, boss.y, 50, '#ffaa00', 9, 55);
          createParticles(boss.x, boss.y, 40, '#ffff00', 8, 50);
          createParticles(boss.x, boss.y, 30, '#ffffff', 7, 45);

          game.soundPlayer?.playExplosion();
          game.soundPlayer?.playDefeatTaunt();

          // Boss rewards
          const coinReward = 200 + (boss.milestone * 100);

          // 30% chance for rare customization unlock
          const customizationDrop = Math.random() < 0.3;

          // Alien Boss Revenge: Zap weapon to default
          const isAlienBoss = boss.imageUrl || (boss.milestone >= 3 && boss.milestone <= 9); // Levels 3-9 generally have faces now

          if (isAlienBoss) {
             game.soundPlayer?.playExplosion(); // Extra boom for zap
             createParticles(game.player.x, GAME_HEIGHT - 60, 100, '#ff0000', 10, 60); // Shock effect on player
             game.screenShake = 40;
             if (game.localPower !== undefined) game.localPower = 100;
             console.log("BOSS REVENGE: Weapon Zapped!");
          }

          onStateUpdate(prev => ({
            ...prev,
            coins: prev.coins + coinReward,
            enemiesDestroyed: prev.enemiesDestroyed + 1,
            customizationDrop: customizationDrop ? boss.milestone : null,
            // Revenge mechanic: Reset weapon
            currentWeapon: isAlienBoss ? 'blaster' : prev.currentWeapon,
            weaponLevel: isAlienBoss ? 1 : prev.weaponLevel,
            powerLevel: isAlienBoss ? 100 : prev.powerLevel // Full power but default gun
          }));

          game.boss = null;
          game.bossClone = null; 
          
          // Trigger Level Complete Timer
          game.bossDeathTimer = 1; 
        }

        // Draw Boss Clone
        if (game.bossClone) {
           ctx.save();
           const clone = game.bossClone;
           const cPulse = 1 + Math.sin(Date.now() * 0.015) * 0.1;
           
           // Clone Aura
           try {
             const cAuraGrad = ctx.createRadialGradient(clone.x, clone.y, 0, clone.x, clone.y, clone.size * 2 * cPulse);
             cAuraGrad.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
             cAuraGrad.addColorStop(1, 'transparent');
             ctx.fillStyle = cAuraGrad;
             ctx.beginPath();
             ctx.arc(clone.x, clone.y, clone.size * 2 * cPulse, 0, Math.PI * 2);
             ctx.fill();
           } catch(e) {}
           
           // Clone Body
           try {
             const cGrad = ctx.createRadialGradient(clone.x, clone.y, 0, clone.x, clone.y, clone.size);
             cGrad.addColorStop(0, '#00ffff');
             cGrad.addColorStop(0.5, '#008888');
             cGrad.addColorStop(1, '#004444');
             ctx.fillStyle = cGrad;
           } catch(e) { ctx.fillStyle = '#00ffff'; }
           ctx.beginPath();
           for(let i=0; i<6; i++) { // Hexagon
              const ang = (Math.PI*2*i)/6;
              const cx = clone.x + Math.cos(ang)*clone.size;
              const cy = clone.y + Math.sin(ang)*clone.size;
              if (i===0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
           }
           ctx.closePath();
           ctx.fill();
           
           // Clone Core
           ctx.fillStyle = '#fff';
           ctx.beginPath();
           ctx.arc(clone.x, clone.y, clone.size * 0.3, 0, Math.PI * 2);
           ctx.fill();
           
           // Clone HP Bar (Small)
           const cHealth = clone.health / clone.maxHealth;
           ctx.fillStyle = '#333';
           ctx.fillRect(clone.x - 30, clone.y - clone.size - 15, 60, 5);
           ctx.fillStyle = '#00ffff';
           ctx.fillRect(clone.x - 30, clone.y - clone.size - 15, 60 * cHealth, 5);
           
           ctx.restore();
        }

            // Draw boss
        ctx.save();

        // Boss Visuals based on data
        const bData = boss.data || { color: '#ff6600', accent: '#ffaa00', shape: 'hexagon' };

        if (boss.imageLoaded && boss.image) {
           // Draw Image Boss
           const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.05;
           const size = boss.size * 3.5 * pulse;

           // Glow/Aura behind image
           try {
               const auraGrad = ctx.createRadialGradient(boss.x, boss.y, size * 0.1, boss.x, boss.y, size * 0.8);
               auraGrad.addColorStop(0, bData.accent);
               auraGrad.addColorStop(0.5, bData.color);
               auraGrad.addColorStop(1, 'transparent');
               ctx.fillStyle = auraGrad;
               ctx.beginPath();
               ctx.arc(boss.x, boss.y, size, 0, Math.PI * 2);
               ctx.fill();
           } catch(e) {}

           ctx.drawImage(boss.image, boss.x - size/2, boss.y - size/2, size, size);
        } else {

        // Aura
        const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
        const auraColor = boss.phase === 3 ? 'rgba(255, 0, 0, 0.6)' : 
                          bData.accent.replace(')', ', 0.4)').replace('rgb', 'rgba') || 'rgba(255, 255, 255, 0.4)';
        
        // Convert hex to rgba helper roughly
        const hexToRgba = (hex, alpha) => {
            if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length < 7) return `rgba(255, 255, 255, ${alpha})`;
            let r = parseInt(hex.slice(1, 3), 16),
                g = parseInt(hex.slice(3, 5), 16),
                b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        
        const finalAura = auraColor && auraColor.startsWith('#') ? hexToRgba(auraColor, 0.4) : (auraColor || 'rgba(255,255,255,0.4)');

        try {
            const bossAuraGradient = ctx.createRadialGradient(boss.x, boss.y, 0, boss.x, boss.y, boss.size * 2 * pulse);
            bossAuraGradient.addColorStop(0, finalAura);
            bossAuraGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = bossAuraGradient;
            ctx.beginPath();
            ctx.arc(boss.x, boss.y, boss.size * 2 * pulse, 0, Math.PI * 2);
            ctx.fill();
        } catch(e) {}

        // Boss Body Gradient
        try {
            const bossGradient = ctx.createRadialGradient(boss.x, boss.y, 0, boss.x, boss.y, boss.size);
            bossGradient.addColorStop(0, bData.accent);
            bossGradient.addColorStop(0.6, bData.color);
            bossGradient.addColorStop(1, '#000');
            ctx.fillStyle = bossGradient;
        } catch(e) {
            ctx.fillStyle = bData.color;
        }
        
        // Draw Shape
        ctx.beginPath();
        if (bData.shape === 'square') {
            const s = boss.size * 1.2;
            ctx.rect(boss.x - s/2, boss.y - s/2, s, s);
        } else if (bData.shape === 'triangle') {
            const s = boss.size * 1.3;
            ctx.moveTo(boss.x, boss.y + s);
            ctx.lineTo(boss.x + s, boss.y - s);
            ctx.lineTo(boss.x - s, boss.y - s);
            ctx.closePath();
        } else if (bData.shape === 'star') {
            const spikes = 5;
            const outerRadius = boss.size * 1.2;
            const innerRadius = boss.size * 0.6;
            let rot = Math.PI / 2 * 3;
            let x = boss.x;
            let y = boss.y;
            let step = Math.PI / spikes;

            ctx.moveTo(boss.x, boss.y - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = boss.x + Math.cos(rot) * outerRadius;
                y = boss.y + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = boss.x + Math.cos(rot) * innerRadius;
                y = boss.y + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(boss.x, boss.y - outerRadius);
            ctx.closePath();
        } else if (bData.shape === 'circle') {
            ctx.arc(boss.x, boss.y, boss.size, 0, Math.PI * 2);
        } else if (bData.shape === 'chaos') {
            // Chaos shape - shifting
            const time = Date.now() * 0.005;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const r = boss.size * (0.8 + Math.sin(time + i) * 0.4);
                const x = boss.x + Math.cos(angle) * r;
                const y = boss.y + Math.sin(angle) * r;
                if (i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
        } else {
            // Default Hexagon
            for (let i = 0; i < 6; i++) {
               const angle = (Math.PI * 2 * i) / 6;
               const x = boss.x + Math.cos(angle) * boss.size;
               const y = boss.y + Math.sin(angle) * boss.size;
               if (i === 0) ctx.moveTo(x, y);
               else ctx.lineTo(x, y);
            }
            ctx.closePath();
        }
        ctx.fill();
        
        // Border
        ctx.strokeStyle = bData.accent;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Boss Core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Attachments / Spikes based on shape
        const rotation = Date.now() * (boss.phase === 3 ? 0.005 : 0.002);
        if (bData.shape !== 'circle') {
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI * 2 * i) / 8 + rotation;
              const spikeX = boss.x + Math.cos(angle) * boss.size;
              const spikeY = boss.y + Math.sin(angle) * boss.size;
              const tipX = boss.x + Math.cos(angle) * (boss.size + 20);
              const tipY = boss.y + Math.sin(angle) * (boss.size + 20);

              ctx.strokeStyle = bData.accent;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(spikeX, spikeY);
              ctx.lineTo(tipX, tipY);
              ctx.stroke();
            }
        } else {
            // Orbital rings for circular boss
            ctx.strokeStyle = bData.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(boss.x, boss.y, boss.size * 1.5, boss.size * 0.2, rotation, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(boss.x, boss.y, boss.size * 1.5, boss.size * 0.2, -rotation, 0, Math.PI * 2);
            ctx.stroke();
        }

        }
        // Health bar
        let bossHealthPercent = boss.health / boss.maxHealth;
        if (!Number.isFinite(bossHealthPercent)) bossHealthPercent = 0;
        
        const barWidth = Math.max(0, GAME_WIDTH - 200);
        const barX = 100;
        const barY = 50;
        
        // Bar Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX, barY, barWidth, 20);
        
        // Bar Fill with Glint
        const healthColor = bossHealthPercent > 0.66 ? '#00ff00' : bossHealthPercent > 0.33 ? '#ffaa00' : '#ff0000';
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * bossHealthPercent, 20);
        
        // Bar Glint
        const glintGrad = ctx.createLinearGradient(barX, barY, barX, barY + 20);
        glintGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
        glintGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glintGrad;
        ctx.fillRect(barX, barY, barWidth * bossHealthPercent, 10);

        // Bar Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, 20);

        // Boss name
        ctx.fillStyle = '#fff';
        ctx.font = '900 24px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'red';
        ctx.fillText(`${boss.name || 'BOSS'}`, GAME_WIDTH / 2, 40);
        ctx.font = 'bold 16px Arial';
        ctx.shadowBlur = 0;
        ctx.fillText(`PHASE ${boss.phase}`, GAME_WIDTH / 2, 90);

        ctx.restore();
      }
      
      // Update and draw enemies
      game.enemies = game.enemies.filter(enemy => {
        if (!Number.isFinite(enemy.x) || !Number.isFinite(enemy.y)) return false;
        if (!Number.isFinite(enemy.size) || enemy.size <= 0) enemy.size = 10;
        let tP = game.player;
        if (game.player2 && !game.player2.isDead && Math.hypot(game.player2.x-enemy.x, GAME_HEIGHT-60-enemy.y) < Math.hypot(game.player.x-enemy.x, GAME_HEIGHT-60-enemy.y)) tP = game.player2;
        const hasTimeSlow = gameState.activePowerups?.some(p => p.type === 'time_slow');
        const timeSlowFactor = (hasTimeSlow ? 0.5 : 1) * timeScale;

        // Boss projectile homing
        if (enemy.homingTarget) {
          const angle = Math.atan2(GAME_HEIGHT - 60 - enemy.y, tP.x - enemy.x);
          enemy.x += Math.cos(angle) * enemy.speed * 0.5 * timeSlowFactor;
          enemy.y += Math.sin(angle) * enemy.speed * 0.5 * timeSlowFactor;
        } else if (enemy.isBossProjectile) {
          // Enhanced boss projectile movement
          if (Number.isFinite(enemy.vx)) enemy.x += enemy.vx * timeSlowFactor;
          if (Number.isFinite(enemy.vy)) enemy.y += enemy.vy * timeSlowFactor;
          else if (Number.isFinite(enemy.speed)) enemy.y += enemy.speed * timeSlowFactor;
        } else {
          // Perspective movement
          if (Number.isFinite(enemy.vx)) enemy.x += (enemy.vx || 0) * timeSlowFactor;
          if (Number.isFinite(enemy.speed)) enemy.y += enemy.speed * timeSlowFactor;
        }

        // Re-validate coordinates after movement to prevent cascading NaNs
        if (!Number.isFinite(enemy.x)) enemy.x = GAME_WIDTH / 2;
        if (!Number.isFinite(enemy.y)) enemy.y = -100;

        // Calculate perspective scale
        const horizonDist = Math.max(1, GAME_HEIGHT - HORIZON_Y);
        const perspectiveScale = enemy.isBossProjectile ? 1 : Math.max(0.2, Math.min(1, (enemy.y - HORIZON_Y) / horizonDist));
        const currentSize = (Number.isFinite(enemy.size) ? enemy.size : 30) * perspectiveScale;

        // Enhanced AI behavior
        enemy.moveTimer++;
        enemy.attackTimer++;
        enemy.retreatTimer++;
        enemy.coordTimer++;

        // AI Decision making
        if (!enemy.isBossProjectile && !enemy.isEnemyProjectile) {
          const healthPercent = enemy.health / enemy.maxHealth;

          // Retreat when low health
          if (healthPercent < 0.3 && enemy.aiState !== 'retreating') {
            enemy.aiState = 'retreating';
            enemy.retreatTimer = 0;
          }

          // Return to aggressive after retreating for a while
          if (enemy.aiState === 'retreating' && enemy.retreatTimer > 120) {
            enemy.aiState = 'aggressive';
          }

          // Coordinate with nearby enemies
          const nearbyEnemies = game.enemies.filter(e => 
            e !== enemy && 
            Math.abs(e.y - enemy.y) < 100 && 
            !e.isBossProjectile && 
            !e.isEnemyProjectile
          );

          if (nearbyEnemies.length >= 2 && enemy.coordTimer > 60) {
            enemy.aiState = 'coordinating';
            enemy.coordTimer = 0;
          }

          // Flanking behavior - move to sides to surround player
          if (Math.abs(enemy.x - tP.x) > 150 && enemy.y > 100 && enemy.y < 400) {
            if (Math.random() < 0.02) {
              enemy.aiState = 'flanking';
            }
          }
        }

        // Teleporter enemy
        if (enemy.teleports && !enemy.isBossProjectile) {
          enemy.teleportTimer = (enemy.teleportTimer || 0) + 1;
          if (enemy.teleportTimer > 120) {
            enemy.teleportTimer = 0;
            createParticles(enemy.x, enemy.y, 15, '#00ffff', 4, 25);
            const newLane = Math.floor(Math.random() * LANE_COUNT);
            enemy.x = 20 + (newLane + 0.5) * LANE_WIDTH;
            createParticles(enemy.x, enemy.y, 15, '#00ffff', 4, 25);
          }
        }

        // Flying enemy - hover and weave
        if (enemy.flies && !enemy.isBossProjectile) {
          enemy.flyTimer = (enemy.flyTimer || 0) + 1;
          enemy.y += enemy.speed * 0.5; // Slower vertical movement
          enemy.x += Math.sin(enemy.flyTimer * 0.08) * 2;
        }

        // Dive bomber - hovers then dives at player
        if (enemy.diveBombs && !enemy.isBossProjectile) {
          enemy.diveTimer = (enemy.diveTimer || 0) + 1;
          if (enemy.diveState === 'hover') {
            enemy.y += enemy.speed * 0.3;
            if (enemy.diveTimer > 100 && enemy.y > 100) {
              enemy.diveState = 'dive';
              enemy.diveTimer = 0;
              createParticles(enemy.x, enemy.y, 10, '#ff6600', 3, 20);
            }
          } else if (enemy.diveState === 'dive') {
            const angle = Math.atan2(GAME_HEIGHT - 60 - enemy.y, tP.x - enemy.x);
            enemy.x += Math.cos(angle) * enemy.speed * 2;
            enemy.y += Math.sin(angle) * enemy.speed * 2;
            if (enemy.diveTimer > 80) {
              enemy.diveState = 'hover';
              enemy.diveTimer = 0;
            }
          }
        }

        // Kamikaze - rushes at player
        if (enemy.kamikaze && !enemy.isBossProjectile) {
          const angle = Math.atan2(GAME_HEIGHT - 60 - enemy.y, tP.x - enemy.x);
          enemy.x += Math.cos(angle) * enemy.speed * 0.3;
          enemy.y += Math.sin(angle) * enemy.speed * 1.2;
        }

        // Summoner - spawns minions
        if (enemy.summons && !enemy.isBossProjectile) {
          enemy.summonTimer = (enemy.summonTimer || 0) + 1;
          if (enemy.summonTimer > 180) {
            enemy.summonTimer = 0;
            for (let i = 0; i < 2; i++) {
              game.enemies.push({
                x: enemy.x + (i === 0 ? -30 : 30),
                y: enemy.y + 20,
                type: 'fast',
                health: 20,
                maxHealth: 20,
                speed: 5,
                size: 15,
                moveDir: i === 0 ? -1 : 1,
                moveTimer: 0,
                isSummoned: true
              });
            }
            createParticles(enemy.x, enemy.y, 20, '#9900ff', 4, 30);
          }
        }

        // Healer - restores nearby enemy health
        if (enemy.heals && !enemy.isBossProjectile) {
          enemy.healTimer = (enemy.healTimer || 0) + 1;
          if (enemy.healTimer > 150) {
            enemy.healTimer = 0;
            const nearbyEnemies = game.enemies.filter(e => 
              e !== enemy && 
              Math.hypot(e.x - enemy.x, e.y - enemy.y) < 150 && // Increased range
              !e.isBossProjectile && 
              !e.isEnemyProjectile &&
              e.health < e.maxHealth
            );
            nearbyEnemies.forEach(e => {
              e.health = Math.min(e.maxHealth, e.health + 20);
              createParticles(e.x, e.y, 8, '#00ff00', 2, 20);
              
              // Heal Beam Visual
              ctx.save();
              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 2;
              ctx.shadowBlur = 10;
              ctx.shadowColor = '#00ff00';
              ctx.beginPath();
              ctx.moveTo(enemy.x, enemy.y);
              ctx.lineTo(e.x, e.y);
              ctx.stroke();
              ctx.restore();
            });
            if (nearbyEnemies.length > 0) {
              createParticles(enemy.x, enemy.y, 15, '#00ff00', 3, 25);
            }
          }
        }
        
        // Shooting logic (Sniper & Turrets)
        if (enemy.canShoot && !enemy.isBossProjectile) {
           const fireRate = enemy.rapidFire ? 60 : 180;
           
           if (enemy.type.includes('sniper') || enemy.type.includes('turret')) {
              if (enemy.attackTimer > fireRate - 60) {
                 ctx.save(); ctx.strokeStyle = `rgba(255,0,0,${(enemy.attackTimer - (fireRate - 60))/60})`;
                 ctx.lineWidth=1; ctx.setLineDash([5,5]); ctx.beginPath();
                 ctx.moveTo(enemy.x, enemy.y); ctx.lineTo(tP.x, GAME_HEIGHT - 60); ctx.stroke(); ctx.restore();
              }
           }
           if (enemy.attackTimer > fireRate) {
              enemy.attackTimer = 0;
              let aimVx = 0;
              if (enemy.fixed || enemy.type.includes('sniper')) aimVx = (tP.x - enemy.x) / ((GAME_HEIGHT - 60 - enemy.y) / (7 * enemyProjectileSpeedMult));

              game.enemies.push({
                x: enemy.x,
                y: enemy.y + 20,
                type: 'enemy_bullet',
                health: 1,
                maxHealth: 1,
                speed: 7 * enemyProjectileSpeedMult,
                vx: aimVx,
                size: 7,
                moveDir: 0,
                moveTimer: 0,
                isEnemyProjectile: true
              });
              
              game.soundPlayer?.playShoot('plasma');
           }
        }

        // Orbital behavior
        if (enemy.orbital && !enemy.isBossProjectile) {
        enemy.orbitalAngle = (enemy.orbitalAngle || 0) + 0.1;
        enemy.x += Math.cos(enemy.orbitalAngle) * 5; 
        }

        if (enemy.pulls && !enemy.isBossProjectile) {
        const dx = enemy.x - tP.x;
        if (Math.hypot(dx, enemy.y - (GAME_HEIGHT - 60)) < 300) {
        tP.x += dx * 0.02 * ((300 - Math.hypot(dx, enemy.y - (GAME_HEIGHT - 60))) / 300 * 2);
        if (Math.random() < 0.3) createParticles(tP.x, GAME_HEIGHT - 60, 1, '#8800ff', 5, 20);
        }

        // Rotation effect
        enemy.orbitalAngle = (enemy.orbitalAngle || 0) + 0.2;
        }

        // Advanced movement patterns with AI behaviors
        if (!enemy.isBossProjectile && !enemy.isEnemyProjectile) {
          // AI behavior overrides
          switch(enemy.aiState) {
            case 'retreating':
              // Move backwards and side to side
              enemy.y -= enemy.speed * 0.3;
              enemy.x += Math.sin(enemy.retreatTimer * 0.1) * 2;
              break;

            case 'flanking':
              // Move to the sides aggressively then swoop
              const targetX = enemy.flankDirection > 0 ? GAME_WIDTH - 50 : 50;
              const dx = targetX - enemy.x;
              enemy.x += Math.sign(dx) * Math.min(Math.abs(dx), 4);
              
              // Swoop down faster when at edge
              if (Math.abs(dx) < 20) {
                 enemy.y += 2; 
              }
              break;

            case 'formation':
              // Formation flying - Follow leader
              const leader = game.enemies.find(e => e.squadId === enemy.squadId && e.isLeader);
              if (leader && leader !== enemy) {
                 // Lerp X to formation position
                 const tx = leader.x + (enemy.squadOffset?.x || 0);
                 enemy.x += (tx - enemy.x) * 0.1;
                 
                 // Sync Y relatively (keep vertical formation)
                 const ty = leader.y + (enemy.squadOffset?.y || 0);
                 // If falling behind, speed up
                 if (enemy.y < ty - 10) enemy.y += 1;
                 if (enemy.y > ty + 10) enemy.y -= 1;
              } else if (!leader && !enemy.isLeader) {
                 // Leader dead -> Break formation and attack/flee
                 enemy.aiState = Math.random() < 0.5 ? 'aggressive' : 'retreating';
              }
              break;

            case 'coordinating':
              // Synchronized movement with nearby enemies
              const syncX = Math.sin(enemy.coordTimer * 0.05) * 40;
              enemy.x += syncX * 0.05;
              break;

            default: // aggressive
              // Normal movement patterns
              switch(enemy.movePattern) {
                case 'zigzag':
                  if (enemy.moveTimer > 30) {
                    enemy.moveDir *= -1;
                    enemy.moveTimer = 0;
                  }
                  enemy.x += enemy.moveDir * 1.5;
                  break;

                case 'wave':
                  const waveAmplitude = 30;
                  const waveSpeed = 0.05;
                  enemy.x += Math.sin(enemy.y * waveSpeed) * waveAmplitude * 0.02;
                  break;

                default:
                  if (enemy.moveTimer > 60) {
                    enemy.moveDir *= -1;
                    enemy.moveTimer = 0;
                  }
                  enemy.x += enemy.moveDir * 0.5;
              }
          }
        }
        
        enemy.x = Math.max(40, Math.min(GAME_WIDTH - 40, enemy.x));
        
        // Check bullet collisions
        game.bullets = game.bullets.filter(bullet => {
          const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
          if (dist < currentSize + bullet.size) {
            // Reflector logic
            if (enemy.reflects) {
               // Reflect bullet back as enemy projectile
               game.enemies.push({
                  x: bullet.x,
                  y: bullet.y,
                  type: 'reflected_shot',
                  health: 1,
                  maxHealth: 1,
                  speed: 8,
                  size: bullet.size,
                  moveDir: 0,
                  moveTimer: 0,
                  isEnemyProjectile: true
               });
               createParticles(bullet.x, bullet.y, 10, '#00ffff', 5, 20);
               game.soundPlayer?.playShoot('plasma'); // Sound effect
               return false; // Destroy player bullet
            }

            // Shield enemies absorb first hit and can recharge
            if (enemy.shield && enemy.shieldActive) {
              enemy.shieldActive = false;
              enemy.shieldRechargeTimer = 0;
              createParticles(enemy.x, enemy.y, 10, '#00ffff', 3, 20);
              return false;
            }

            // Apply damage with elite resistance
            const finalDamage = enemy.resistance ? bullet.damage * (1 - enemy.resistance) : bullet.damage;
            enemy.health -= finalDamage;

            // Show resistance visual for elites
            if (enemy.isElite && enemy.resistance) {
              createParticles(enemy.x, enemy.y, 5, '#ffaa00', 2, 15);
            }

            // Chain Lightning Effect
            const hasChainLightning = gameState.activePowerups?.some(p => p.type === 'chain_lightning');
            if (hasChainLightning) {
               const range = 200;
               const nearby = game.enemies.filter(e => 
                  e !== enemy && 
                  !e.isBossProjectile && !e.isEnemyProjectile &&
                  Math.hypot(e.x - enemy.x, e.y - enemy.y) < range
               );

               if (nearby.length > 0) {
                  // Chain to up to 3 enemies
                  const targets = nearby.sort(() => Math.random() - 0.5).slice(0, 3);
                  targets.forEach(target => {
                     target.health -= finalDamage * 0.5;

                     // Draw lightning arc
                     ctx.save();
                     ctx.strokeStyle = '#00ffff';
                     ctx.lineWidth = 2;
                     ctx.shadowBlur = 10;
                     ctx.shadowColor = '#00ffff';
                     ctx.beginPath();
                     ctx.moveTo(enemy.x, enemy.y);
                     // Jagged line
                     const midX = (enemy.x + target.x) / 2 + (Math.random() - 0.5) * 20;
                     const midY = (enemy.y + target.y) / 2 + (Math.random() - 0.5) * 20;
                     ctx.lineTo(midX, midY);
                     ctx.lineTo(target.x, target.y);
                     ctx.stroke();
                     ctx.restore();

                     createParticles(target.x, target.y, 5, '#00ffff', 2, 10);
                  });
               }
            }

            return false;
          }
          return true;
        });
        
        // Shield recharge for shielded enemies
        if (enemy.shield && !enemy.shieldActive && enemy.shieldRecharge && !enemy.isBossProjectile) {
          enemy.shieldRechargeTimer = (enemy.shieldRechargeTimer || 0) + 1;
          if (enemy.shieldRechargeTimer > 200) {
            enemy.shieldActive = true;
            enemy.shieldRechargeTimer = 0;
            createParticles(enemy.x, enemy.y, 15, '#00ffff', 4, 25);
          }
        }

        // Enemy destroyed
        if (enemy.health <= 0) {
          // Splitter enemies split into smaller ones
          if (enemy.splits && !enemy.isSplit) {
            const splitCount = enemy.splitCount || 2;
            for (let i = 0; i < splitCount; i++) {
              const angle = (Math.PI * 2 * i) / splitCount;
              game.enemies.push({
                x: enemy.x + Math.cos(angle) * 25,
                y: enemy.y + Math.sin(angle) * 25,
                type: 'fast',
                health: 15,
                maxHealth: 15,
                speed: 5,
                size: 12,
                moveDir: Math.cos(angle) > 0 ? 1 : -1,
                moveTimer: 0,
                isSplit: true
              });
            }
            createParticles(enemy.x, enemy.y, 25, '#ffff00', 6, 35);
          }

          game.explosions.push({
            x: enemy.x,
            y: enemy.y,
            frame: 0,
            maxFrame: 20
          });

          // Explosion particles
          createParticles(enemy.x, enemy.y, 20, '#ff8800', 5, 40);
          createParticles(enemy.x, enemy.y, 15, '#ffff00', 4, 35);
          createParticles(enemy.x, enemy.y, 10, '#ff0000', 3, 30);

          game.soundPlayer?.playExplosion();

          // Coin rewards based on enemy type
          let coinDrop = 6;
          if (enemy.type === 'tank') coinDrop = 10;
          else if (enemy.type === 'sniper') coinDrop = 8;
          else if (enemy.type === 'splitter') coinDrop = 12;
          else if (enemy.type === 'teleporter') coinDrop = 10;
          else if (enemy.type === 'shield') coinDrop = 8;
          else if (enemy.type === 'fast') coinDrop = 4;

          // Apply score multipliers if active
          const hasMultiplier50 = gameState.activePowerups?.some(p => p.type === 'multiplier_50');
          const hasMultiplier500 = gameState.activePowerups?.some(p => p.type === 'multiplier_500');
          const hasMultiplier1000 = gameState.activePowerups?.some(p => p.type === 'multiplier_1000');
          const hasWeaponOverdrive = gameState.activePowerups?.some(p => p.type === 'weapon_overdrive');
          const hasVampirism = gameState.activePowerups?.some(p => p.type === 'vampirism');

          if (hasMultiplier50) coinDrop *= 50;
          if (hasMultiplier500) coinDrop *= 500;
          if (hasMultiplier1000) coinDrop *= 1000;
          if (hasWeaponOverdrive) coinDrop = Math.floor(coinDrop * 1.5); // Bonus coins for overdrive kills

          onStateUpdate(prev => ({
            ...prev,
            coins: prev.coins + coinDrop,
            enemiesDestroyed: prev.enemiesDestroyed + 1,
            health: hasVampirism ? Math.min(prev.maxHealth || 100, prev.health + 2) : prev.health
          }));

          if (hasVampirism) {
             createParticles(game.player.x, GAME_HEIGHT - 60, 5, '#ff0000', 2, 20); // Heal visual
          }
          return false;
        }
        
        // Draw enemy
        ctx.save();
        // Apply perspective scaling to drawing
        ctx.translate(enemy.x, enemy.y);
        ctx.scale(perspectiveScale, perspectiveScale);
        ctx.translate(-enemy.x, -enemy.y);

        // Elite aura
        if (enemy.isElite && !enemy.isBossProjectile && !enemy.isEnemyProjectile) {
          try {
              const eliteAuraGradient = ctx.createRadialGradient(enemy.x, enemy.y, enemy.size, enemy.x, enemy.y, enemy.size * 1.8);
              eliteAuraGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
              eliteAuraGradient.addColorStop(1, 'transparent');
              ctx.fillStyle = eliteAuraGradient;
              ctx.beginPath();
              ctx.arc(enemy.x, enemy.y, enemy.size * 1.8, 0, Math.PI * 2);
              ctx.fill();
          } catch(e) {}

          // Elite crown
          ctx.fillStyle = '#ffd700';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('👑', enemy.x, enemy.y - enemy.size - 5);
        }

        // Shield effect
        if (enemy.shield && enemy.shieldActive) {
          const shieldGradient = ctx.createRadialGradient(enemy.x, enemy.y, enemy.size, enemy.x, enemy.y, enemy.size + 8);
          shieldGradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
          shieldGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
          ctx.fillStyle = shieldGradient;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.size + 8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Elite aura
        if (enemy.isElite && !enemy.isBossProjectile && !enemy.isEnemyProjectile) {
          try {
              const eliteAuraGradient = ctx.createRadialGradient(enemy.x, enemy.y, enemy.size, enemy.x, enemy.y, enemy.size * 1.8);
              eliteAuraGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
              eliteAuraGradient.addColorStop(1, 'transparent');
              ctx.fillStyle = eliteAuraGradient;
              ctx.beginPath();
              ctx.arc(enemy.x, enemy.y, enemy.size * 1.8, 0, Math.PI * 2);
              ctx.fill();
          } catch(e) {}

          // Elite crown
          ctx.fillStyle = '#ffd700';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('👑', enemy.x, enemy.y - enemy.size - 5);
        }

        // Boss projectiles (Standard, Homing, Mines, Shield Breakers)
        if (enemy.isBossProjectile) {
            // Adaptive Speed for Boss Projectiles
            if (enemy.speed && !enemy.adaptedSpeed) {
                enemy.speed *= enemyProjectileSpeedMult;
                if (enemy.vx) enemy.vx *= enemyProjectileSpeedMult;
                if (enemy.vy) enemy.vy *= enemyProjectileSpeedMult;
                enemy.adaptedSpeed = true;
            }
          if (enemy.isLaserGrid) {
             if (enemy.vertical) {
                // Vertical Laser Grid
                ctx.fillStyle = '#ff0044';
                ctx.fillRect(enemy.x - 5, enemy.y - 20, 10, 40);
                // Vertical Laser Grid
                if (!Number.isFinite(enemy.x)) console.error('Invalid enemy.x in Vertical Laser Grid', enemy);
                const laserGrad = ctx.createLinearGradient(enemy.x, HORIZON_Y, enemy.x, GAME_HEIGHT);
                laserGrad.addColorStop(0, 'rgba(255,0,0,0)');
                laserGrad.addColorStop(0.5, '#ff0000');
                laserGrad.addColorStop(1, 'rgba(255,0,0,0)');
                ctx.fillStyle = laserGrad;
                ctx.fillRect(enemy.x - 2, HORIZON_Y, 4, GAME_HEIGHT - HORIZON_Y);
             } else {
                // Horizontal Laser Grid
                ctx.fillStyle = '#ff0044';
                ctx.fillRect(enemy.x - 20, enemy.y - 5, 40, 10);
                // Horizontal Laser Grid
                if (!Number.isFinite(enemy.y)) console.error('Invalid enemy.y in Horizontal Laser Grid', enemy);
                const laserGrad = ctx.createLinearGradient(0, enemy.y, GAME_WIDTH, enemy.y);
                laserGrad.addColorStop(0, 'rgba(255,0,0,0)');
                laserGrad.addColorStop(0.5, '#ff0000');
                laserGrad.addColorStop(1, 'rgba(255,0,0,0)');
                ctx.fillStyle = laserGrad;
                ctx.fillRect(0, enemy.y - 2, GAME_WIDTH, 4);
             }
          } else if (enemy.isMine) {
            // Mine Visuals
            const mColor = enemy.color || '#ff3300';
            const minePulse = 1 + Math.sin(Date.now() * 0.01) * 0.2;
            try {
                const mineGrad = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.size);
                mineGrad.addColorStop(0, mColor);
                mineGrad.addColorStop(0.5, '#220000'); // Darker core
                mineGrad.addColorStop(1, '#000000');
                ctx.fillStyle = mineGrad;
            } catch (e) { ctx.fillStyle = mColor; }
            
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size * minePulse, 0, Math.PI * 2);
            ctx.fill();
            
            // Spikes
            ctx.strokeStyle = mColor;
            ctx.lineWidth = 2;
            for(let i=0; i<4; i++) {
               const angle = (Math.PI/2 * i) + (Date.now() * 0.002);
               ctx.beginPath();
               ctx.moveTo(enemy.x + Math.cos(angle)*enemy.size, enemy.y + Math.sin(angle)*enemy.size);
               ctx.lineTo(enemy.x + Math.cos(angle)*enemy.size*1.5, enemy.y + Math.sin(angle)*enemy.size*1.5);
               ctx.stroke();
            }
            
            // Blinking light
            if (Math.floor(Date.now() / 200) % 2 === 0) {
               ctx.fillStyle = '#ff0000';
               ctx.beginPath();
               ctx.arc(enemy.x, enemy.y, 4, 0, Math.PI * 2);
               ctx.fill();
            }
          } else if (enemy.isEnergyWave) {
             // Energy Wave Visuals
             const wColor = enemy.color || '#ff0000';
             const waveGrad = ctx.createLinearGradient(enemy.x - enemy.size, enemy.y, enemy.x + enemy.size, enemy.y);
             waveGrad.addColorStop(0, wColor);
             waveGrad.addColorStop(0.5, '#ffffff');
             waveGrad.addColorStop(1, wColor);
             ctx.fillStyle = waveGrad;
             ctx.beginPath();
             // Draw a wide crescent shape
             ctx.ellipse(enemy.x, enemy.y, enemy.size, 10, 0, 0, Math.PI * 2);
             ctx.fill();

             // Trailing energy
             // Convert hex to semi-transparent logic simplified:
             ctx.fillStyle = wColor.startsWith('#') ? wColor + '80' : 'rgba(255, 50, 0, 0.5)';
             ctx.beginPath();
             ctx.moveTo(enemy.x - enemy.size, enemy.y);
             ctx.lineTo(enemy.x, enemy.y - 40);
             ctx.lineTo(enemy.x + enemy.size, enemy.y);
             ctx.fill();
          } else if (enemy.isRotatingLaser) {
             // Rotating Laser Visuals
             enemy.angle += 0.05;
             const laserLen = Math.max(GAME_WIDTH, GAME_HEIGHT) * 1.5;
             const lColor = enemy.color || '#ff00ff';

             for(let i=0; i<4; i++) {
                const a = enemy.angle + (Math.PI/2 * i);
                const lx = enemy.x + Math.cos(a) * laserLen;
                const ly = enemy.y + Math.sin(a) * laserLen;

                ctx.strokeStyle = lColor;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y);
                ctx.lineTo(lx, ly);
                ctx.stroke();

                const abx = lx - enemy.x, aby = ly - enemy.y;
                const chk = (p) => Math.hypot(p.x - (enemy.x + Math.max(0, Math.min(1, ((p.x-enemy.x)*abx + (GAME_HEIGHT-60-enemy.y)*aby) / (abx*abx + aby*aby)))*abx), GAME_HEIGHT-60 - (enemy.y + Math.max(0, Math.min(1, ((p.x-enemy.x)*abx + (GAME_HEIGHT-60-enemy.y)*aby) / (abx*abx + aby*aby)))*aby)) < 20;
                if (chk(game.player) || (game.player2 && !game.player2.isDead && chk(game.player2))) {
                    // Debounce hit to avoid performance issues and instant death
                    if (!enemy.lastHit || Date.now() - enemy.lastHit > 500) {
                        enemy.lastHit = Date.now();
                        onStateUpdate(prev => ({ ...prev, health: prev.health - 15 }));
                        game.soundPlayer?.playExplosion();
                        game.screenShake = 5;
                    }
                }
             }

             if (enemy.moveTimer > 300) { // 5 seconds duration
                enemy.y = GAME_HEIGHT + 200; // Remove
             }
          } else if (enemy.isBeam) {
             // Directed Energy Beam Logic
             enemy.beamTimer++;
             
             if (enemy.beamState === 'charging') {
                enemy.x += (tP.x - enemy.x) * 0.05;
                
                if (enemy.beamTimer > 90) { // 1.5s charge
                   enemy.beamState = 'firing';
                   enemy.beamTimer = 0;
                   game.soundPlayer?.playShoot('railgun'); // Big sound
                   game.screenShake = 10;
                }
             } else if (enemy.beamState === 'firing') {
                if (enemy.beamTimer > 60) { // 1s duration
                   enemy.y = GAME_HEIGHT + 200; // End
                }
             }
          } else if (enemy.isLaser) {
             // Orbital Laser Visuals
             enemy.laserTimer++;
             
             if (enemy.laserState === 'warning') {
                // Warning Line - Draw oversized to cover shake
                ctx.fillStyle = `rgba(255, 0, 0, ${0.2 + Math.sin(Date.now() * 0.02) * 0.1})`;
                ctx.fillRect(enemy.x - enemy.size/2, -100, enemy.size, GAME_HEIGHT + 200);
                
                // Warning Symbol
                ctx.fillStyle = '#ff0000';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('!', enemy.x, 50);
                
                if (enemy.laserTimer > 60) { // 1 second warning
                   enemy.laserState = 'firing';
                   enemy.laserTimer = 0;
                   game.screenShake = 5;
                   game.soundPlayer?.playExplosion();
                }
             } else {
                // Firing Beam
                if (!Number.isFinite(enemy.x) || !Number.isFinite(enemy.size)) console.error("Invalid enemy params in Laser Beam", enemy);
                const beamWidth = enemy.size * (0.8 + Math.sin(Date.now() * 0.1) * 0.2);
                const beamGrad = ctx.createLinearGradient(enemy.x - beamWidth/2, 0, enemy.x + beamWidth/2, 0);
                beamGrad.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
                beamGrad.addColorStop(0.5, '#ffffff');
                beamGrad.addColorStop(1, 'rgba(255, 0, 0, 0.8)');
                
                ctx.fillStyle = beamGrad;
                // Draw beam oversized to cover shake
                ctx.fillRect(enemy.x - beamWidth/2, -100, beamWidth, GAME_HEIGHT + 200);
                
                // Ground burn
                createParticles(enemy.x, GAME_HEIGHT - 20, 2, '#ff4400', 4, 10);
                
                if (enemy.laserTimer > 40) { // Fire duration
                   // Remove laser by moving it off screen logic or just marking as dead
                   // Since we use y check for removal, let's just move it way down
                   enemy.y = GAME_HEIGHT + 200; 
                }
             }
          } else if (enemy.isShieldBreaker) {
            // Shield Breaker Visuals (Purple/Black Void)
            try {
                const sbGrad = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.size * 1.5);
                sbGrad.addColorStop(0, '#000000');
                sbGrad.addColorStop(0.5, '#8800ff');
                sbGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = sbGrad;
            } catch (e) { ctx.fillStyle = '#8800ff'; }
            
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // Standard/Homing Projectile Visuals
            const projColor = enemy.color || (enemy.homingTarget ? '#ff00ff' : '#ff0000');
            try {
                const projGradient = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.size * 2);
                projGradient.addColorStop(0, projColor);
                projGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = projGradient;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.size * 2, 0, Math.PI * 2);
                ctx.fill();
            } catch(e) {
                // Fallback if gradient fails
                ctx.fillStyle = projColor;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          
          // Check player collision
          let hit = false;
          
          if (enemy.isBeam && enemy.beamState === 'firing') {
             if (Math.abs(game.player.x - enemy.x) < 30 + PLAYER_SIZE / 2 || (game.player2 && !game.player2.isDead && Math.abs(game.player2.x - enemy.x) < 30 + PLAYER_SIZE / 2)) hit = true;
          } else if (enemy.isLaser && enemy.laserState === 'firing') {
             if (Math.abs(game.player.x - enemy.x) < enemy.size / 2 + PLAYER_SIZE / 2 || (game.player2 && !game.player2.isDead && Math.abs(game.player2.x - enemy.x) < enemy.size / 2 + PLAYER_SIZE / 2)) hit = true;
          } else {
             const playerDist = Math.hypot(game.player.x - enemy.x, (GAME_HEIGHT - 60) - enemy.y);
             if (playerDist < PLAYER_SIZE / 2 + currentSize) {
                hit = true;
             }
          }

          if (hit) {
            const pUps = gameState.activePowerups || [];
            const defPwr = pUps.find(p => p.type === 'invincibility' || p.type === 'shield_overcharge' || p.type === 'orbital_guard');
            
            if (defPwr && !enemy.isShieldBreaker && !enemy.isLaser && !enemy.isBeam) {
               onStateUpdate(prev => ({ ...prev, activePowerups: prev.activePowerups.filter(p => p.type !== defPwr.type) }));
               createParticles(game.player.x, GAME_HEIGHT-60, 20, '#00ffff', 5, 30);
               return false;
            }

            if (enemy.isShieldBreaker) {
               onStateUpdate(prev => ({ ...prev, health: prev.health - 40, activePowerups: prev.activePowerups.filter(p => !['shield_overcharge', 'invincibility', 'orbital_guard'].includes(p.type)) }));
               createParticles(game.player.x, GAME_HEIGHT-60, 30, '#8800ff', 6, 40);
            } else if (enemy.isMine) {
               onStateUpdate(prev => ({ ...prev, health: prev.health - 35 }));
               createParticles(enemy.x, enemy.y, 20, '#ff3300', 5, 30);
               game.soundPlayer?.playExplosion();
            } else if (enemy.isLaser) {
               onStateUpdate(prev => ({ ...prev, health: prev.health - 2 }));
               return true;
            } else if (enemy.isEnergyWave) {
               onStateUpdate(prev => ({ ...prev, health: prev.health - 50 }));
               createParticles(enemy.x, enemy.y, 30, '#ff0000', 5, 40);
               game.soundPlayer?.playExplosion();
            } else if (enemy.isBeam) {
               if (enemy.beamState === 'firing') {
                  onStateUpdate(prev => ({ ...prev, health: prev.health - 2 })); 
                  game.screenShake = 2;
                  return true;
               }
               return false;
            } else {
               onStateUpdate(prev => ({ ...prev, health: prev.health - 15 }));
            }
            return false;
          }
          return enemy.y < GAME_HEIGHT + 50;
        }
        
        // Enemy projectiles
        if (enemy.isEnemyProjectile) {
          const projGradient = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.size * 1.5);
          projGradient.addColorStop(0, '#ffaa00');
          projGradient.addColorStop(1, 'transparent');
          ctx.fillStyle = projGradient;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.size * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          
          // Check player collision
          const p1Dist = Math.hypot(game.player.x - enemy.x, (GAME_HEIGHT - 60) - enemy.y);
          const p2Dist = game.player2 && !game.player2.isDead ? Math.hypot(game.player2.x - enemy.x, (GAME_HEIGHT - 60) - enemy.y) : Infinity;
          
          if (p1Dist < PLAYER_SIZE / 2 + currentSize || p2Dist < PLAYER_SIZE / 2 + currentSize) {
            const pUps = gameState.activePowerups || [];
            const defPwr = pUps.find(p => p.type === 'invincibility' || p.type === 'shield_overcharge' || p.type === 'orbital_guard');
            if (defPwr) {
                onStateUpdate(prev => ({ ...prev, activePowerups: prev.activePowerups.filter(p => p.type !== defPwr.type) }));
                createParticles(enemy.x, enemy.y, 20, '#00ffff', 5, 30);
            } else onStateUpdate(prev => ({ ...prev, health: prev.health - Math.floor(15 * playerDamageTakenMult) }));
            return false;
          }
          return enemy.y < GAME_HEIGHT + 50;
        }
        
        // Shield effect
        if (enemy.shield && enemy.shieldActive) {
          try {
              const shieldGradient = ctx.createRadialGradient(enemy.x, enemy.y, enemy.size, enemy.x, enemy.y, enemy.size + 8);
              shieldGradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
              shieldGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
              ctx.fillStyle = shieldGradient;
              ctx.beginPath();
              ctx.arc(enemy.x, enemy.y, enemy.size + 8, 0, Math.PI * 2);
              ctx.fill();
          } catch(e) {}
        }

        // Safely create enemy gradient
        let enemyGradient;
        try {
            enemyGradient = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.size);
        } catch(e) {
            // Fallback for gradient error
            enemyGradient = null; 
            ctx.fillStyle = '#ff8844';
        }

        const baseType = enemy.type.replace('elite_', '');

        // Elite variants have golden tint
        const eliteTint = enemy.isElite ? 0.3 : 0;

        if (enemyGradient) {
            const eMap = { 'tank': enemy.isElite ? ['#ffaa44', '#aa4400'] : ['#ff4444', '#880000'], 'fast': ['#44ff44', '#008800'], 'shield': ['#00ffff', '#008888'], 'sniper': ['#ff00ff', '#880088'], 'splitter': ['#ffff00', '#888800'], 'teleporter': ['#00ffff', '#0088ff'], 'flyer': ['#88ffff', '#4488ff'], 'divebomber': ['#ff9944', '#cc4400'], 'kamikaze': ['#ff4488', '#aa0044'], 'summoner': ['#cc44ff', '#660088'], 'healer': ['#44ff88', '#008844'], 'stealth': ['#aaaaaa', '#444444'], 'orbital': ['#00ffaa', '#004433'], 'turret': ['#555555', '#222222'], 'heavy_turret': ['#555555', '#222222'], 'shield_generator': ['#00ffff', '#004444'], 'afk_rocket': ['#ff0000', '#000000', '#ff0000'], 'asteroid': ['#aaaaaa', '#444444'] };
            const eCols = eMap[baseType] || ['#ff8844', '#884400'];
            enemyGradient.addColorStop(0, eCols[0]);
            enemyGradient.addColorStop(eCols.length === 3 ? 0.5 : 1, eCols[1]);
            if (eCols.length === 3) enemyGradient.addColorStop(1, eCols[2]);
            ctx.fillStyle = enemyGradient;
        }
        
        // Stealth effect - fluctuating opacity
        if (enemy.stealth) {
           const stealthAlpha = 0.2 + Math.abs(Math.sin(Date.now() * 0.002)) * 0.4; // 0.2 to 0.6
           ctx.globalAlpha = stealthAlpha;
        }
        ctx.beginPath();

        // Different shapes for different enemy types
        if (enemy.flies) {
          // Triangle for flyers
          ctx.moveTo(enemy.x, enemy.y - enemy.size);
          ctx.lineTo(enemy.x + enemy.size, enemy.y + enemy.size);
          ctx.lineTo(enemy.x - enemy.size, enemy.y + enemy.size);
          ctx.closePath();
        } else if (enemy.diveBombs) {
          // Diamond for dive bombers
          ctx.moveTo(enemy.x, enemy.y - enemy.size);
          ctx.lineTo(enemy.x + enemy.size, enemy.y);
          ctx.lineTo(enemy.x, enemy.y + enemy.size);
          ctx.lineTo(enemy.x - enemy.size, enemy.y);
          ctx.closePath();
        } else if (enemy.kamikaze) {
          // Star for kamikaze
          const spikes = 5;
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? enemy.size : enemy.size * 0.5;
            const angle = (Math.PI * i) / spikes;
            const x = enemy.x + Math.cos(angle) * radius;
            const y = enemy.y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        } else if (enemy.summons) {
          // Pentagon for summoners
          for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const x = enemy.x + Math.cos(angle) * enemy.size;
            const y = enemy.y + Math.sin(angle) * enemy.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        } else if (enemy.heals) {
          // Cross for healers
          const s = enemy.size;
          ctx.moveTo(enemy.x - s * 0.3, enemy.y - s);
          ctx.lineTo(enemy.x + s * 0.3, enemy.y - s);
          ctx.lineTo(enemy.x + s * 0.3, enemy.y - s * 0.3);
          ctx.lineTo(enemy.x + s, enemy.y - s * 0.3);
          ctx.lineTo(enemy.x + s, enemy.y + s * 0.3);
          ctx.lineTo(enemy.x + s * 0.3, enemy.y + s * 0.3);
          ctx.lineTo(enemy.x + s * 0.3, enemy.y + s);
          ctx.lineTo(enemy.x - s * 0.3, enemy.y + s);
          ctx.lineTo(enemy.x - s * 0.3, enemy.y + s * 0.3);
          ctx.lineTo(enemy.x - s, enemy.y + s * 0.3);
          ctx.lineTo(enemy.x - s, enemy.y - s * 0.3);
          ctx.lineTo(enemy.x - s * 0.3, enemy.y - s * 0.3);
          ctx.closePath();
        } else if (enemy.stealth) {
           // Triangle pointing down for stealth
           ctx.moveTo(enemy.x - enemy.size, enemy.y - enemy.size);
           ctx.lineTo(enemy.x + enemy.size, enemy.y - enemy.size);
           ctx.lineTo(enemy.x, enemy.y + enemy.size);
           ctx.closePath();
        } else if (enemy.orbital) {
           // Ring shape for orbital
           ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
           ctx.moveTo(enemy.x + enemy.size/2, enemy.y);
           ctx.arc(enemy.x, enemy.y, enemy.size/2, 0, Math.PI * 2, true);
        } else if (enemy.type === 'shield_generator') {
          // Shield Generator Shape
          const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.2;
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.size * pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          // Connection line to boss
          if (game.boss) {
             ctx.save();
             ctx.strokeStyle = '#00ffff';
             ctx.globalAlpha = 0.5;
             ctx.setLineDash([5, 5]);
             ctx.beginPath();
             ctx.moveTo(enemy.x, enemy.y);
             ctx.lineTo(game.boss.x, game.boss.y);
             ctx.stroke();
             ctx.restore();
          }
        } else if (enemy.isAsteroid) {
           for (let i = 0; i < 8; i++) {
              const a = (Math.PI * 2 * i) / 8, r = enemy.size * (0.8 + Math.sin(i * 123) * 0.3);
              const px = enemy.x + Math.cos(a) * r, py = enemy.y + Math.sin(a) * r;
              if (i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
           }
           ctx.closePath();
        } else if (enemy.isAFK) {
           ctx.moveTo(enemy.x, enemy.y + enemy.size); ctx.lineTo(enemy.x + enemy.size/2, enemy.y - enemy.size); ctx.lineTo(enemy.x - enemy.size/2, enemy.y - enemy.size); ctx.closePath(); ctx.fill();
           ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(enemy.x - 5, enemy.y, 4, 0, Math.PI*2); ctx.arc(enemy.x + 5, enemy.y, 4, 0, Math.PI*2); ctx.fill();
           ctx.beginPath(); ctx.moveTo(enemy.x - 3, enemy.y + 10); ctx.lineTo(enemy.x + 3, enemy.y + 10); ctx.stroke();
        } else if (enemy.fixed) {
          // Turret shape (Square base + rotating cannon)
          const baseSize = enemy.size;
          // Base
          ctx.fillRect(enemy.x - baseSize/2, enemy.y - baseSize/2, baseSize, baseSize);

          // Cannon aimed at player
          const angle = Math.atan2(GAME_HEIGHT - 60 - enemy.y, tP.x - enemy.x);

          ctx.save();
          ctx.translate(enemy.x, enemy.y);
          ctx.rotate(angle);
          ctx.fillStyle = enemy.rapidFire ? '#ff0000' : '#ffff00';
          ctx.fillRect(0, -5, baseSize * 0.8, 10); // Barrel
          ctx.restore();

          // Tech details
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(enemy.x - baseSize/2, enemy.y - baseSize/2, baseSize, baseSize);
        } else if (enemy.reflects) {
          // Mirror/Crystal shape
          ctx.moveTo(enemy.x, enemy.y - enemy.size);
          ctx.lineTo(enemy.x + enemy.size * 0.8, enemy.y);
          ctx.lineTo(enemy.x, enemy.y + enemy.size);
          ctx.lineTo(enemy.x - enemy.size * 0.8, enemy.y);
          ctx.closePath();

          // Shine effect
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        } else if (enemy.pulls) {
          // Black hole swirl
          const swirl = (enemy.orbitalAngle || 0);
          for(let i=0; i<3; i++) {
             ctx.beginPath();
             ctx.arc(enemy.x, enemy.y, enemy.size * (1 - i*0.3), swirl + i, swirl + i + Math.PI);
             ctx.stroke();
          }
          ctx.fillStyle = '#000000'; // Dark core
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.size * 0.3, 0, Math.PI * 2);
        } else if (enemy.isLaserGrid) {
        // Laser bar
        ctx.fillStyle = '#ff0044';
        ctx.fillRect(enemy.x - 20, enemy.y - 5, 40, 10);
        // The laser itself is drawn by collision logic usually, but here we can add a glow
        const laserGrad = ctx.createLinearGradient(0, enemy.y, GAME_WIDTH, enemy.y);
        laserGrad.addColorStop(0, 'rgba(255,0,0,0)');
        laserGrad.addColorStop(0.5, '#ff0000');
        laserGrad.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = laserGrad;
        ctx.fillRect(0, enemy.y - 2, GAME_WIDTH, 4);
        } else if (enemy.isBeam) {
         // Boss Directed Energy Beam
         if (enemy.beamState === 'charging') {
            // Charge Effect
            const beamColor = enemy.color || '#00ffff';
            const chargeSize = enemy.beamTimer * 0.5;
            const chargeGrad = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, chargeSize);
            chargeGrad.addColorStop(0, '#ffffff');
            chargeGrad.addColorStop(0.5, beamColor);
            chargeGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = chargeGrad;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, chargeSize, 0, Math.PI * 2);
            ctx.fill();

            // Converging particles
            for(let i=0; i<3; i++) {
               const angle = Math.random() * Math.PI * 2;
               const dist = 30 + Math.random() * 20;
               const px = enemy.x + Math.cos(angle) * dist;
               const py = enemy.y + Math.sin(angle) * dist;
               ctx.strokeStyle = beamColor;
               ctx.beginPath();
               ctx.moveTo(px, py);
               ctx.lineTo(enemy.x, enemy.y);
               ctx.stroke();
            }
            } else if (enemy.beamState === 'firing') {
            // Main Beam
            if (!Number.isFinite(enemy.x)) console.error('Invalid enemy.x in Beam Firing', enemy);
            const beamColor = enemy.color || '#00ffff';
            // Convert to rgba for transparency stops
            const beamColorTransparent = beamColor.startsWith('#') ? beamColor + '00' : 'rgba(0, 255, 255, 0)'; 
            const beamColorOpaque = beamColor.startsWith('#') ? beamColor + 'cc' : 'rgba(0, 255, 255, 0.8)';

            const beamWidth = 40 + Math.sin(Date.now() * 0.5) * 10;
            const beamGrad = ctx.createLinearGradient(enemy.x - beamWidth/2, 0, enemy.x + beamWidth/2, 0);
            beamGrad.addColorStop(0, 'transparent');
            beamGrad.addColorStop(0.2, beamColorOpaque);
            beamGrad.addColorStop(0.5, '#ffffff');
            beamGrad.addColorStop(0.8, beamColorOpaque);
            beamGrad.addColorStop(1, 'transparent');

            ctx.fillStyle = beamGrad;
            ctx.fillRect(enemy.x - beamWidth/2, enemy.y, beamWidth, GAME_HEIGHT - enemy.y);

            // Core
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(enemy.x - 5, enemy.y, 10, GAME_HEIGHT - enemy.y);

            // Impact point at bottom (or player Y if tracking, but this is straight down usually)
            // Beam logic handles tracking below
         }
        } else {
         // Circle for default
         ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        }
        ctx.fill();
        
        // Health bar (only for non-projectiles)
        if (!enemy.isBossProjectile && !enemy.isEnemyProjectile) {
          const healthPercent = enemy.health / enemy.maxHealth;
          ctx.fillStyle = '#333';
          ctx.fillRect(enemy.x - 20, enemy.y - enemy.size - 10, 40, 5);
          ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
          ctx.fillRect(enemy.x - 20, enemy.y - enemy.size - 10, 40 * healthPercent, 5);
        }
        ctx.restore();
        
        // Check player collision (only for non-projectiles)
        if (!enemy.isBossProjectile && !enemy.isEnemyProjectile) {
          const p1Dist = Math.hypot(game.player.x - enemy.x, (GAME_HEIGHT - 60) - enemy.y);
          const p2Dist = game.player2 && !game.player2.isDead ? Math.hypot(game.player2.x - enemy.x, (GAME_HEIGHT - 60) - enemy.y) : Infinity;

          if (p1Dist < PLAYER_SIZE / 2 + currentSize || p2Dist < PLAYER_SIZE / 2 + currentSize) {
            
            // AFK Rocket - Deadly at all times (ignores invincibility)
            if (enemy.isAFK) {
                onStateUpdate(prev => ({ ...prev, health: -9999 })); // Ensure instant game over
                createParticles(enemy.x, enemy.y, 100, '#ff0000', 10, 60);
                game.soundPlayer?.playExplosion();
                return false;
            }

            const pUps = gameState.activePowerups || [];
            const defPwr = pUps.find(p => p.type === 'invincibility' || p.type === 'shield_overcharge' || p.type === 'orbital_guard');
            const hasGhostMode = pUps.some(p => p.type === 'ghost_mode');

            if (defPwr || hasGhostMode) {
              if (defPwr && !hasGhostMode) {
                  onStateUpdate(prev => ({ ...prev, activePowerups: prev.activePowerups.filter(p => p.type !== defPwr.type) }));
              }
              createParticles(enemy.x, enemy.y, 20, '#00ffff', 5, 30); game.soundPlayer?.playExplosion();
              game.explosions.push({ x: enemy.x, y: enemy.y, frame: 0, maxFrame: 20 });
              return false;
            } else {
              onStateUpdate(prev => ({ ...prev, health: prev.health - Math.floor(25 * playerDamageTakenMult) }));
              createParticles(enemy.x, enemy.y, 15, '#ff0000', 4, 30); game.soundPlayer?.playExplosion();
              game.explosions.push({ x: enemy.x, y: enemy.y, frame: 0, maxFrame: 20 });
              return false;
            }
          }
        }
        
        return enemy.y < GAME_HEIGHT + 50;
      });

      game.coins = game.coins.filter(coin => {
        const hasTimeSlow = gameState.activePowerups?.some(p => p.type === 'time_slow');
        const coinSpeed = (hasTimeSlow ? 2 : 4) * timeScale;
        coin.y += coinSpeed;
        
        const dist = Math.hypot(game.player.x - coin.x, (GAME_HEIGHT - 60) - coin.y);
        if (dist < PLAYER_SIZE / 2 + 15) {
          // Coin collection particles
          createParticles(coin.x, coin.y, 10, '#ffee00', 3, 25);
          
          game.soundPlayer?.playCoin();
          
          // Check multipliers
          const hasMultiplier50 = gameState.activePowerups?.some(p => p.type === 'multiplier_50');
          const hasMultiplier500 = gameState.activePowerups?.some(p => p.type === 'multiplier_500');
          const hasMultiplier1000 = gameState.activePowerups?.some(p => p.type === 'multiplier_1000');

          let val = 2;
          if (hasMultiplier50) val *= 50;
          if (hasMultiplier500) val *= 500;
          if (hasMultiplier1000) val *= 1000;

          onStateUpdate(prev => ({ ...prev, coins: prev.coins + val }));
          return false;
        }
        
        // Draw coin
        ctx.save();
        const coinGradient = ctx.createRadialGradient(coin.x, coin.y, 0, coin.x, coin.y, 12);
        coinGradient.addColorStop(0, '#ffee00');
        coinGradient.addColorStop(0.7, '#ffaa00');
        coinGradient.addColorStop(1, '#886600');
        ctx.fillStyle = coinGradient;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', coin.x, coin.y);
        ctx.restore();
        
        return coin.y < GAME_HEIGHT + 20;
      });

      // Update and draw Alien Babies
      game.babies = game.babies.filter(baby => {
        // Babies float down slowly
        baby.y += 3;
        
        // Bobbing motion
        const floatX = Math.sin(Date.now() * 0.005 + baby.floatOffset) * 20;
        const currentX = baby.x + floatX;

        // Check collision
        const dist = Math.hypot(game.player.x - currentX, (GAME_HEIGHT - 60) - baby.y);
        if (dist < PLAYER_SIZE / 2 + 20) {
           // Collected!
           createParticles(currentX, baby.y, 15, '#00ff00', 3, 30);
           game.soundPlayer?.playCoin(); // Use coin sound for now or add specific one
           // gameEventBus.emit('message', "RESCUED!");
           onStateUpdate(prev => ({ ...prev, babiesRescued: (prev.babiesRescued || 0) + 1 }));
           return false;
        }

        // Draw Baby
        ctx.save();
        
        // Bubble
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(0, 255, 100, 0.3)';
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(currentX, baby.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Alien
        ctx.fillStyle = '#ccffcc';
        ctx.beginPath();
        ctx.ellipse(currentX, baby.y - 3, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(currentX - 3, baby.y - 2, 2, 3, 0.2, 0, Math.PI * 2);
        ctx.ellipse(currentX + 3, baby.y - 2, 2, 3, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        return baby.y < GAME_HEIGHT + 30;
      });

      // Update and draw power-ups
      game.powerups = game.powerups.filter(powerup => {
        powerup.y += 3;
        powerup.pulseTimer += 0.1;
        
        const distP1 = Math.hypot(game.player.x - powerup.x, game.player.y - powerup.y);
        const distP2 = game.player2 ? Math.hypot(game.player2.x - powerup.x, game.player2.y - powerup.y) : Infinity;
        
        if (distP1 < PLAYER_SIZE / 2 + 20 || distP2 < PLAYER_SIZE / 2 + 20) {
          // Custom Powerup Logic
          if (powerup.type.startsWith('custom_') && powerup.customData) {
             const effect = powerup.customData.effect_config;
             createParticles(powerup.x, powerup.y, 30, '#ffffff', 6, 40);
             game.soundPlayer?.playPowerup();
             
             // Apply generic effects based on config
             // This is a simplified implementation as full dynamic effects require complex scripting
             // We'll support basic stats modifications
             if (effect) {
                onStateUpdate(prev => {
                   let updates = {};
                   if (effect.value) {
                      // Heuristic: if value > 0 and < 5, maybe multiplier or speed? 
                      // If value > 10, maybe score or health?
                      // We can rely on effectType if we added it, but let's be generic for now or assume structure
                      // Or just map specific keys if they existed. 
                      // Let's assume generic "score" boost if undefined or "health" if large
                      updates.coins = prev.coins + (effect.value || 100);
                   }
                   return { ...prev, ...updates };
                });
             }
             return false;
          }

          // Activate power-up with type-specific effects
          let particleColor = '#ffff00';
          switch(powerup.type) {
            case 'shield_overcharge': particleColor = '#00ffff'; break;
            case 'weapon_overdrive': particleColor = '#ff00ff'; break;
            case 'coin_magnet': particleColor = '#ffd700'; break;
            case 'ghost_mode': particleColor = '#9999ff'; break;
            case 'time_slow': particleColor = '#00ff00'; break;
            case 'chain_lightning': particleColor = '#88aaff'; break;
            case 'vampirism': particleColor = '#ff0000'; break;
            case 'orbital_guard': particleColor = '#ff8800'; break;
            case 'nuke': particleColor = '#ffffff'; break;
          }

          createParticles(powerup.x, powerup.y, 30, particleColor, 6, 40);
          game.soundPlayer?.playPowerup();

          // Floating Text Indicator
          let pText = 'POWERUP';
          switch(powerup.type) {
             case 'weapon_overdrive': pText = 'WEAPON OVERDRIVE'; break;
             case 'rapidfire': pText = 'RAPID FIRE'; break;
             case 'invincibility': pText = 'INVINCIBLE'; break;
             case 'coin_magnet': pText = 'MAGNET'; break;
             case 'multiplier_50': pText = '50X COINS'; break;
             case 'multiplier_500': pText = '500X COINS'; break;
             case 'multiplier_1000': pText = '1000X COINS'; break;
             case 'shield_overcharge': pText = 'SHIELD+'; break;
             case 'time_slow': pText = 'TIME SLOW'; break;
             case 'nuke': pText = 'NUKE'; break;
             default: pText = powerup.type.toUpperCase().replace('_', ' ');
          }
          
          // gameEventBus.emit('message', pText);

          // Instant Effect: Nuke
          if (powerup.type === 'nuke') {
             game.screenShake = 60;
             game.soundPlayer?.playExplosion();
             // Flash screen
             game.flashTimer = 20; // Need to handle drawing this if not existing, but particles help
             createParticles(GAME_WIDTH/2, GAME_HEIGHT/2, 100, '#ffffff', 20, 60);

             // Kill all regular enemies
             game.enemies.forEach(e => {
                if (!e.isBoss && !e.type.includes('boss')) {
                   e.health = 0;
                   createParticles(e.x, e.y, 20, '#ff8800', 5, 30);
                   game.explosions.push({ x: e.x, y: e.y, frame: 0, maxFrame: 20 });
                } else {
                   // Damage boss
                   e.health -= 5000;
                   createParticles(e.x, e.y, 30, '#ff0000', 8, 40);
                }
             });
             // Clear enemy bullets
             game.enemies = game.enemies.filter(e => !e.isEnemyProjectile && !e.isBossProjectile);

             return false; // Remove powerup without adding to active list
          }

          onStateUpdate(prev => {
            const newPowerups = [...(prev.activePowerups || [])];
            const existingIndex = newPowerups.findIndex(p => p.type === powerup.type);

            const durations = { multiplier_50: 10000, multiplier_500: 10000, multiplier_1000: 8000, invincibility: 999999999, rapidfire: 10000, shield_overcharge: 999999999, weapon_overdrive: 8000, coin_magnet: 15000, ghost_mode: 6000, time_slow: 10000, chain_lightning: 12000, vampirism: 15000, orbital_guard: 999999999 };

            if (existingIndex >= 0) {
              // Extend duration if same type
              newPowerups[existingIndex].duration = durations[powerup.type] || 10000;
              newPowerups[existingIndex].startTime = Date.now();
            } else {
              // Add new power-up
              newPowerups.push({
                type: powerup.type,
                duration: durations[powerup.type] || 10000,
                startTime: Date.now()
              });
            }

            return {
              ...prev,
              activePowerups: newPowerups
            };
          });

          return false;
        }
        
        // Draw power-up
        ctx.save();
        
        if (powerup.type.startsWith('custom_') && powerup.image && powerup.image.complete) {
           const pulse = Math.sin(powerup.pulseTimer) * 0.3 + 1;
           const size = 20 * pulse;
           try {
             ctx.drawImage(powerup.image, powerup.x - size, powerup.y - size, size * 2, size * 2);
           } catch(e) { console.error("Error drawing custom powerup", e); }
           ctx.restore();
           return powerup.y < GAME_HEIGHT + 30;
        }

        const pulse = Math.sin(powerup.pulseTimer) * 0.3 + 1;
        const size = 18 * pulse;
        
        const pMap = { 'multiplier_50': ['#ffff00', 'x50'], 'multiplier_500': ['#ffaa00', 'x500'], 'multiplier_1000': ['#ff0000', 'x1K'], 'invincibility': ['#00ffff', '🛡️'], 'rapidfire': ['#ff00ff', '⚡'], 'shield_overcharge': ['#00ffff', '🔰'], 'weapon_overdrive': ['#ff00ff', '💥'], 'coin_magnet': ['#ffd700', '🧲'], 'ghost_mode': ['#9999ff', '👻'], 'time_slow': ['#00ff00', '⏱️'], 'chain_lightning': ['#88aaff', '⚡'], 'vampirism': ['#ff0000', '🧛'], 'orbital_guard': ['#ff8800', '🛡️'], 'nuke': ['#ffffff', '☢️'] };
        const [color, icon] = pMap[powerup.type] || ['#ffffff', '✨'];
        
        // Glow
        const powerupGlow = ctx.createRadialGradient(powerup.x, powerup.y, 0, powerup.x, powerup.y, size * 2);
        powerupGlow.addColorStop(0, color);
        powerupGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = powerupGlow;
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Icon
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, powerup.x, powerup.y);
        
        ctx.restore();
        
        return powerup.y < GAME_HEIGHT + 30;
      });

      // Update and draw weapon pickups
      game.weapons = game.weapons.filter(weapon => {
        weapon.y += 3;
        
        const dist = Math.hypot(game.player.x - weapon.x, (GAME_HEIGHT - 60) - weapon.y);
        if (dist < PLAYER_SIZE / 2 + 20) {
          // 30% chance for mutation
          const isMutated = Math.random() < 0.3;
          
          // Power-up collection particles
          let particleColor = '#00ffff';
          switch(weapon.type) {
            case 'laser': particleColor = isMutated ? '#ffff00' : '#00ffff'; break;
            case 'plasma': particleColor = isMutated ? '#ffff00' : '#ff00ff'; break;
            case 'rocket': particleColor = isMutated ? '#ffff00' : '#ff8800'; break;
          }
          createParticles(weapon.x, weapon.y, isMutated ? 30 : 15, particleColor, isMutated ? 6 : 4, 30);
          
          if (isMutated) {
            // Extra golden explosion for mutation
            createParticles(weapon.x, weapon.y, 20, '#ffd700', 5, 40);
          }
          
          game.soundPlayer?.playPowerup();

          let newWeaponType = weapon.type;
          if (newWeaponType === 'random') {
             const realWeapons = ['laser', 'plasma', 'rocket', 'pulse', 'spread', 'wave', 'railgun', 'orb', 'seeker', 'chain', 'boomerang', 'flamethrower', 'sonic', 'prism', 'swarm', 'vortex'];
             // Filter out current weapon if possible to ensure something new, or just pure random
             const pool = realWeapons.filter(w => w !== gameState.currentWeapon);
             newWeaponType = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : realWeapons[Math.floor(Math.random() * realWeapons.length)];
          } else {
             // For non-random pickup, ensure we use the weapon's actual type even if we picked it from a pool elsewhere
             // (No change needed here, just context for reference)
          }

          if (game.localPower !== undefined) game.localPower = 100;

          onStateUpdate(prev => ({
            ...prev,
            currentWeapon: newWeaponType,
            powerLevel: 100,
            weaponLevel: Math.max(prev.weaponLevel, 1),
            weaponXP: prev.weaponXP,
            isMutated
          }));

          // If hybrid weapon is picked up, reset its internal cycle
          if (newWeaponType === 'hybrid') {
              gameRef.current.hybridWeaponState.activeWeapon = gameRef.current.hybridWeaponState.weapons[0];
              gameRef.current.hybridWeaponState.lastSwitchTime = Date.now(); // Reset timer on pickup
              gameRef.current.hybridWeaponState.cycleIndex = 0;
          }
          return false;
        }
        
        // Draw weapon
        ctx.save();
        const wm = { 'laser': ['#00ffff', 'L'], 'plasma': ['#ff00ff', 'P'], 'rocket': ['#ff8800', 'R'], 'pulse': ['#0088ff', 'PU'], 'spread': ['#ff0000', 'S'], 'wave': ['#00ff88', 'W'], 'railgun': ['#ffffff', 'RG'], 'orb': ['#aa00ff', 'O'], 'seeker': ['#ffff00', 'SK'], 'chain': ['#aaddff', '⚡'], 'boomerang': ['#ffaa44', '🪃'], 'flamethrower': ['#ff4400', '🔥'], 'sonic': ['#cc00ff', '🔊'], 'prism': ['#ffffff', '💎'], 'swarm': ['#ffff00', '🐝'], 'vortex': ['#8800ff', '🌀'], 'neutron': ['#ffff00', '☢️'], 'helix': ['#00ff88', '🧬'], 'starfall': ['#ffffff', '🌠'], 'beam': ['#00aaff', 'B'], 'cannon': ['#888888', 'CN'], 'grenade': ['#00ff00', 'G'], 'missile': ['#ff4400', 'M'], 'torpedo': ['#000044', 'T'], 'dart': ['#ffff00', 'D'], 'rail_pulse': ['#00ffff', 'RP'], 'energy_ball': ['#ff00ff', 'E'], 'plasma_burst': ['#aa00ff', 'PB'], 'ion_cannon': ['#0088ff', 'I'], 'shockwave': ['#ffffff', 'SW'], 'laser_turret': ['#ff0000', 'LT'], 'rail_boomerang': ['#ffaa00', 'RB'], 'sonic_wave': ['#00ff00', 'SN'], 'prism_beam': ['#ff88ff', 'PR'], 'swarm_drone': ['#ffffaa', 'SD'], 'vortex_trap': ['#440088', 'VT'], 'neutron_pulse': ['#00ff88', 'NP'], 'helix_shot': ['#ff0088', 'HX'], 'starfall_missile': ['#ffff00', 'SF'], 'void': ['#000000', 'V'], 'cluster': ['#ff0000', 'C'], 'random': [`hsl(${Date.now() % 360}, 100%, 50%)`, '?'] };
        const [color, symbol] = wm[weapon.type] || ['#fff', ''];
          ctx.fillStyle = color;
          ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(weapon.x, weapon.y - 15);
        ctx.lineTo(weapon.x + 15, weapon.y + 10);
        ctx.lineTo(weapon.x - 15, weapon.y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (symbol) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(symbol, weapon.x, weapon.y);
        }

        ctx.restore();

        return weapon.y < GAME_HEIGHT + 30;
        });

      // Update and draw particles
      game.particles = game.particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.life--;
        
        const lifePercent = particle.life / particle.maxLife;
        const alpha = lifePercent;
        
        ctx.fillStyle = particle.color.includes('rgba') 
          ? particle.color 
          : particle.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        
        if (!particle.color.includes('rgb')) {
          // Hex color - add alpha
          ctx.globalAlpha = alpha;
          ctx.fillStyle = particle.color;
        }
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * lifePercent, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
        
        return particle.life > 0;
      });

      // Floating texts have been removed and replaced by the HUD system message.

      // Draw explosions
      if (visualMode === 1) ctx.globalCompositeOperation = 'lighter';
      game.explosions = game.explosions.filter(exp => {
        exp.frame++;
        const progress = exp.frame / exp.maxFrame;
        const radius = 30 + progress * 30;
        const opacity = 1 - progress;
        
        const explosionGradient = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, radius);
        explosionGradient.addColorStop(0, `rgba(255, 255, 200, ${opacity})`);
        explosionGradient.addColorStop(0.2, `rgba(255, 200, 50, ${opacity * 0.9})`);
        explosionGradient.addColorStop(0.5, `rgba(255, 50, 0, ${opacity * 0.6})`);
        explosionGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = explosionGradient;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Extra bloom flash at start
        if (progress < 0.2 && visualMode === 1) {
           ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - progress*4})`;
           ctx.beginPath();
           ctx.arc(exp.x, exp.y, radius * 0.5, 0, Math.PI * 2);
           ctx.fill();
        }
        
        return exp.frame < exp.maxFrame;
      });
      if (visualMode === 1) ctx.globalCompositeOperation = 'source-over';

      // Orbital Guard Effect
      const hasOrbitalGuard = gameState.activePowerups?.some(p => p.type === 'orbital_guard');
      if (hasOrbitalGuard) {
         game.orbitalAngle = (game.orbitalAngle || 0) + 0.05;
         const orbitRadius = PLAYER_SIZE * 2;
         let guardConsumed = false;

         for(let i=0; i<2; i++) {
            const angle = game.orbitalAngle + (i * Math.PI);
            const ox = game.player.x + Math.cos(angle) * orbitRadius;
            const oy = (GAME_HEIGHT - 60) + Math.sin(angle) * orbitRadius;

            const orbGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, 15);
            orbGrad.addColorStop(0, '#ffaa00'); orbGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = orbGrad; ctx.beginPath(); ctx.arc(ox, oy, 15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fill();

            game.enemies.forEach(e => {
               if (!guardConsumed && !e.isEnemyProjectile && !e.isBossProjectile && Math.hypot(e.x - ox, e.y - oy) < e.size + 15) {
                  e.health -= 50; createParticles(e.x, e.y, 20, '#ffaa00', 4, 20); guardConsumed = true;
               }
            });

            game.enemies = game.enemies.filter(e => {
               if (!guardConsumed && (e.isEnemyProjectile || e.isBossProjectile) && Math.hypot(e.x - ox, e.y - oy) < e.size + 15) {
                  createParticles(e.x, e.y, 15, '#ffaa00', 4, 20); guardConsumed = true; return false;
               }
               return true;
            });
         }
         
         if (guardConsumed) {
            onStateUpdate(prev => ({ ...prev, activePowerups: prev.activePowerups.filter(p => p.type !== 'orbital_guard') }));
         }
      }

      // Draw shields (invincibility and shield overcharge)
      const isInvincible = gameState.activePowerups?.some(p => p.type === 'invincibility');
      const hasShieldOvercharge = gameState.activePowerups?.some(p => p.type === 'shield_overcharge');

      if (isInvincible || hasShieldOvercharge) {
        const shieldPulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        const shieldSize = hasShieldOvercharge ? PLAYER_SIZE * 1.6 : PLAYER_SIZE * 1.3;
        const shieldColor = hasShieldOvercharge ? [0, 255, 255] : [0, 200, 255];
        const intensity = hasShieldOvercharge ? 0.6 : 0.3;

        const shieldGradient = ctx.createRadialGradient(
          game.player.x, GAME_HEIGHT - 60, PLAYER_SIZE * 0.5,
          game.player.x, GAME_HEIGHT - 60, shieldSize
        );
        shieldGradient.addColorStop(0, `rgba(${shieldColor[0]}, ${shieldColor[1]}, ${shieldColor[2]}, ${intensity * shieldPulse})`);
        shieldGradient.addColorStop(0.7, `rgba(${shieldColor[0]}, ${shieldColor[1]}, ${shieldColor[2]}, ${(intensity + 0.2) * shieldPulse})`);
        shieldGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = shieldGradient;
        ctx.beginPath();
        ctx.arc(game.player.x, GAME_HEIGHT - 60, shieldSize, 0, Math.PI * 2);
        ctx.fill();

        // Extra shield layer for overcharge
        if (hasShieldOvercharge) {
          ctx.strokeStyle = `rgba(0, 255, 255, ${shieldPulse * 0.8})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(game.player.x, GAME_HEIGHT - 60, PLAYER_SIZE * 1.4, 0, Math.PI * 2);
          ctx.stroke();

          // Hexagon pattern
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6 + game.time * 0.001;
            const x1 = game.player.x + Math.cos(angle) * PLAYER_SIZE * 1.3;
            const y1 = GAME_HEIGHT - 60 + Math.sin(angle) * PLAYER_SIZE * 1.3;
            ctx.fillStyle = `rgba(0, 255, 255, ${0.4 * shieldPulse})`;
            ctx.beginPath();
            ctx.arc(x1, y1, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.strokeStyle = `rgba(${shieldColor[0]}, ${shieldColor[1]}, ${shieldColor[2]}, ${shieldPulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(game.player.x, GAME_HEIGHT - 60, shieldSize * 0.85, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Ghost mode effect
      const hasGhostMode = gameState.activePowerups?.some(p => p.type === 'ghost_mode');
      if (hasGhostMode) {
        ctx.globalAlpha = 0.5;
      }

      // Weapon Overdrive glow (reuse variable from above)
      if (hasWeaponOverdrive) {
        const overdriveGlow = ctx.createRadialGradient(
          game.player.x, GAME_HEIGHT - 60, 0,
          game.player.x, GAME_HEIGHT - 60, PLAYER_SIZE * 2
        );
        overdriveGlow.addColorStop(0, 'rgba(255, 0, 255, 0.4)');
        overdriveGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = overdriveGlow;
        ctx.beginPath();
        ctx.arc(game.player.x, GAME_HEIGHT - 60, PLAYER_SIZE * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw player ship trail
      let trailType = safeCustomization.equipped.trails || 'none';
      
      // Demo mode override
      if (gameRef.current.demoMode) {
        // Update demo timer
        game.demoTimer++;
        if (game.demoTimer > 60) { // Rotate every ~1 second (60 frames)
          game.demoTimer = 0;
          game.demoIndex++;
        }
        
        const trailsKeys = Object.keys(TRAILS);
        trailType = trailsKeys[gameRef.current.demoIndex % trailsKeys.length];
      }

      if (trailType !== 'none') {
        const trailLength = 8;
        for (let i = 0; i < trailLength; i++) {
          const alpha = (trailLength - i) / trailLength * 0.5;
          const yOffset = i * 8;

          let trailColor;
          switch(trailType) {
            case 'fire':
              trailColor = i % 2 === 0 ? `rgba(255, 102, 0, ${alpha})` : `rgba(255, 204, 0, ${alpha})`;
              break;
            case 'plasma':
              trailColor = `rgba(0, 255, 255, ${alpha})`;
              break;
            case 'rainbow':
              const hue = (Date.now() / 10 + i * 30) % 360;
              trailColor = `hsla(${hue}, 100%, 60%, ${alpha})`;
              break;
          }

          ctx.fillStyle = trailColor;
          ctx.beginPath();
          ctx.ellipse(game.player.x, GAME_HEIGHT - 35 + yOffset, 6 - i * 0.5, 12 - i, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (game.activeEvent === 'nebula_cloud') {
         ctx.fillStyle = `rgba(30, 0, 80, ${0.6 + Math.sin(now * 0.001) * 0.2})`;
         ctx.fillRect(-100, -100, GAME_WIDTH + 200, GAME_HEIGHT + 200);
         const cY = (now * 0.2) % GAME_HEIGHT;
         const cloudGrad = ctx.createRadialGradient(GAME_WIDTH/2, cY, 0, GAME_WIDTH/2, cY, GAME_WIDTH/1.5);
         cloudGrad.addColorStop(0, 'rgba(150, 50, 255, 0.3)');
         cloudGrad.addColorStop(1, 'transparent');
         ctx.fillStyle = cloudGrad;
         ctx.fillRect(-100, -100, GAME_WIDTH + 200, GAME_HEIGHT + 200);
      }

      // Draw Drone
      if (game.drone) {
        ctx.save();
        ctx.translate(game.drone.x, game.drone.y);
        
        // Drone Glow
        const dGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        dGlow.addColorStop(0, game.drone.type === 'attack' ? 'rgba(255, 50, 50, 0.6)' : 'rgba(50, 255, 255, 0.6)');
        dGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = dGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Drone Body
        ctx.fillStyle = '#fff';
        if (game.drone.type === 'attack') {
           // Triangle
           ctx.beginPath();
           ctx.moveTo(0, -8);
           ctx.lineTo(6, 6);
           ctx.lineTo(-6, 6);
           ctx.fill();
        } else {
           // Shield/Square
           ctx.fillRect(-6, -6, 12, 12);
        }
        
        ctx.restore();
      }

      // Helper to draw a ship (P1 or P2)
      renderPlayerShip(ctx, game.player, false, safeCustomization, game, PLAYER_SIZE);
      if (game.player2) renderPlayerShip(ctx, game.player2, true, safeCustomization, game, PLAYER_SIZE);

      // Reset alpha after ghost mode
      if (hasGhostMode) {
        ctx.globalAlpha = 1;
      }

      // Coin magnet effect
      const hasCoinMagnet = gameState.activePowerups?.some(p => p.type === 'coin_magnet');
      if (hasCoinMagnet) {
        game.coins.forEach(coin => {
          // Magnetize to nearest player
          const p1Dist = Math.hypot(game.player.x - coin.x, (GAME_HEIGHT - 60) - coin.y);
          const p2Dist = game.player2 ? Math.hypot(game.player2.x - coin.x, (GAME_HEIGHT - 60) - coin.y) : Infinity;
          
          let target = game.player;
          let dist = p1Dist;
          
          if (game.player2 && p2Dist < p1Dist) {
             target = game.player2;
             dist = p2Dist;
          }

          // Magnet Skill increases range
          const magnetRange = unlockedSkills.includes('utility_2') ? 300 : 200;
          if (dist < magnetRange) {
            const pullStrength = 0.15;
            const dx = target.x - coin.x;
            const dy = target.y - coin.y;
            coin.x += dx * pullStrength;
            coin.y += dy * pullStrength;
          }
        });
      }

      // Time slow effect (reduce enemy speed) - reuse variable from above
      if (hasTimeSlow) {
        // Visual effect for time slow
        ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      // Check Level Complete Timer
      if (game.bossDeathTimer > 0) {
         game.bossDeathTimer++;
         // Wait for ~3 seconds (180 frames) after boss death before triggering level complete
         if (game.bossDeathTimer > 180) {
            game.bossDeathTimer = 0;
            if (gameMode === 'boss_rush') {
               // In Boss Rush, we don't trigger level complete, we just let the spawner continue
               // This prevents the game from kicking back to story mode
            } else {
               if (onLevelComplete) onLevelComplete();
            }
         }
      }

      // Power regeneration and mutation state management
      if (game.localPower === undefined) game.localPower = gameState.powerLevel || 100;
      if (game.localTimeRemaining === undefined) game.localTimeRemaining = gameState.timeRemaining;

      game.localPower = Math.min(100, game.localPower + (0.05 * timeScale));
      
      if (game.localTimeRemaining !== null && game.localTimeRemaining !== undefined) {
         game.localTimeRemaining = Math.max(0, game.localTimeRemaining - (deltaTime / 1000));
      }

      game.stateSyncTimer = (game.stateSyncTimer || 0) + deltaTime;
      if (game.stateSyncTimer > 100) {
         game.stateSyncTimer = 0;
         const syncDist = game.localDistance;
         const syncPower = game.localPower;
         const syncTime = game.localTimeRemaining;

         onStateUpdate(prev => {
           const nextBossDist = (Math.floor(syncDist / BOSS_INTERVAL) + 1) * BOSS_INTERVAL;
           const distToBoss = nextBossDist - syncDist;
           const bossWarning = !game.boss && distToBoss <= WARNING_DISTANCE && distToBoss > 0;

           const stillMutated = prev.isMutated && syncPower > 0;
           const nowTime = Date.now();
           const updatedPowerups = (prev.activePowerups || []).filter(powerup => {
             return (nowTime - powerup.startTime) < powerup.duration;
           });

           return {
             ...prev,
             distance: syncDist,
             powerLevel: syncPower,
             timeRemaining: syncTime,
             bossWarning,
             isMutated: stillMutated,
             activePowerups: updatedPowerups
           };
         });
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    }, [isPlaying, isPaused, shoot, onStateUpdate, createParticles, safeCustomization, GAME_WIDTH, GAME_HEIGHT, HORIZON_Y]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="w-full h-full transition-all duration-300"
      style={{ touchAction: 'none', imageRendering: 'auto', filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.3)) brightness(1.1) contrast(1.1)' }}
    />
  );
}
