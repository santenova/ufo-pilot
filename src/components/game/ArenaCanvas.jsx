import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient } from '../../apis/client';

export default function ArenaCanvas({ 
  onClose,
  customization,
  onGameOver,
  currentUserEmail,
  playerName
}) {
  const canvasRef = useRef(null);
  const uiCanvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [theme, setTheme] = useState('cyber');
  const [randomThemeColors, setRandomThemeColors] = useState(null);
  const [gameMode, setGameMode] = useState('DEATHMATCH'); // DEATHMATCH, KOTH, CTF
  const [opponentShipImg, setOpponentShipImg] = useState(null);
  const [playerShipImg, setPlayerShipImg] = useState(null);

  // Load Player Ship
  useEffect(() => {
    if (customization?.customShipImageUrl) {
      const img = new Image();
      img.src = customization.customShipImageUrl;
      img.onload = () => setPlayerShipImg(img);
    }
  }, [customization]);

  // Fetch random opponent ship
  useEffect(() => {
    const fetchOpponent = async () => {
      try {
        const ships = await apiClient.entities.Ship.list();
        // Filter for ships that have an image URL
        const validShips = ships.filter(s => s.image_url);
        
        if (validShips.length > 0) {
          const randomShip = validShips[Math.floor(Math.random() * validShips.length)];
          const img = new Image();
          img.src = randomShip.image_url;
          img.onload = () => setOpponentShipImg(img);
        }
      } catch (e) {
        console.error("Failed to load opponent ship", e);
      }
    };
    fetchOpponent();
  }, []);

  const THEMES = {
    cyber: {
      bg: '#050510',
      grid: 'rgba(0, 255, 255, 0.1)',
      border: '#ff00ff',
      player: '#00ffff',
      opponent: '#ff0000',
      bulletPlayer: '#00ff00',
      bulletEnemy: '#ffaa00'
    },
    void: {
      bg: '#0a001a',
      grid: 'rgba(138, 43, 226, 0.1)',
      border: '#00ff00',
      player: '#e0b0ff',
      opponent: '#ff4500',
      bulletPlayer: '#00fa9a',
      bulletEnemy: '#ff1493'
    },
    mars: {
      bg: '#1a0a05',
      grid: 'rgba(255, 69, 0, 0.1)',
      border: '#ffd700',
      player: '#ffffff',
      opponent: '#8b0000',
      bulletPlayer: '#00bfff',
      bulletEnemy: '#ff4500'
    },
    random: randomThemeColors || {
      bg: '#000000', grid: 'rgba(255,255,255,0.1)', border: '#ffffff', player: '#ffffff', opponent: '#ffffff', bulletPlayer: '#ffffff', bulletEnemy: '#ffffff'
    }
  };

  // Arena State
  const gameState = useRef({
    player: { x: 0, y: 0, hp: 100, maxHp: 100, energy: 100, vx: 0, vy: 0, activeEffects: {} },
    opponent: { x: 0, y: 0, hp: 100, maxHp: 100, vx: 0, vy: 0, targetX: 0, activeEffects: {} },
    bullets: [],
    particles: [],
    powerups: [],
    camera: { y: 0 },
    keys: {},
    lastTime: 0,
    babies: [],
    babiesRescued: 0,
    // Mode State
    scores: { player: 0, opponent: 0 },
    koth: { x: 0, y: 0, radius: 150, owner: null, progress: 0 },
    ctf: { 
      playerFlag: { x: 0, y: 0, carrier: null, home: { x: 0, y: 0 } },
      enemyFlag: { x: 0, y: 0, carrier: null, home: { x: 0, y: 0 } }
    }
  });

  const POWERUPS = {
  shield: { color: '#00ffff', duration: 5000, label: 'SHIELD' },
  speed: { color: '#ffff00', duration: 4000, label: 'SPEED' },
  rapid_fire: { color: '#ff00ff', duration: 3000, label: 'RAPID' },
  multishot: { color: '#00ff00', duration: 4000, label: 'MULTI' },
  stealth: { color: '#cccccc', duration: 6000, label: 'GHOST' }, // Invisibility
  nova: { color: '#ff4500', duration: 0, label: 'NOVA' } // Instant AOE
  };

  const MODES = {
  DEATHMATCH: { label: 'DEATHMATCH', desc: 'Eliminate the enemy' },
  KOTH: { label: 'KING OF THE HILL', desc: 'Control the center zone' },
  CTF: { label: 'CAPTURE THE FLAG', desc: 'Steal the enemy flag' }
  };

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Touch Controls
  const touchState = useRef({ startX: 0, startY: 0, playerStartX: 0, playerStartY: 0, isDragging: false });
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchState.current = { startX: t.clientX, startY: t.clientY, playerStartX: gameState.current.player.x, playerStartY: gameState.current.player.y, isDragging: true };
  };
  const handleTouchMove = (e) => {
    if (!touchState.current.isDragging) return;
    const t = e.touches[0];
    const dx = t.clientX - touchState.current.startX;
    const dy = t.clientY - touchState.current.startY;
    gameState.current.player.x = touchState.current.playerStartX + (dx * 3);
    gameState.current.player.y = touchState.current.playerStartY + (dy * 3);
  };
  const handleTouchEnd = () => touchState.current.isDragging = false;

  // Controls
  useEffect(() => {
    const handleKeyDown = (e) => { gameState.current.keys[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e) => { gameState.current.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const uiCanvas = uiCanvasRef.current;
    if (!canvas || !uiCanvas) return;

    const ctx = canvas.getContext('2d');
    const uiCtx = uiCanvas.getContext('2d');
    let animationId;

    // Arena Config
    const ARENA_WIDTH = 2000; // Wider than screen
    const ARENA_HEIGHT = 4000; // Long corridor
    const VIEW_WIDTH = dimensions.width;
    const VIEW_HEIGHT = dimensions.height;

    // Init positions
    const state = gameState.current;
    if (state.player.x === 0) {
      state.player.x = ARENA_WIDTH / 2;
      state.player.y = ARENA_HEIGHT - 200;
      state.opponent.x = ARENA_WIDTH / 2;
      state.opponent.y = 200;
      
      // Init Mode Objects
      state.koth.x = ARENA_WIDTH / 2;
      state.koth.y = ARENA_HEIGHT / 2;
      
      state.ctf.playerFlag.home = { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - 100 };
      state.ctf.playerFlag.x = ARENA_WIDTH / 2;
      state.ctf.playerFlag.y = ARENA_HEIGHT - 100;
      
      state.ctf.enemyFlag.home = { x: ARENA_WIDTH / 2, y: 100 };
      state.ctf.enemyFlag.x = ARENA_WIDTH / 2;
      state.ctf.enemyFlag.y = 100;
    }

    const render = (time) => {
      const dt = time - state.lastTime;
      state.lastTime = time;

      // --- UPDATE ---
      
      // Cleanup Expired Effects
      ['player', 'opponent'].forEach(entityKey => {
        const entity = state[entityKey];
        Object.keys(entity.activeEffects).forEach(effect => {
          if (time > entity.activeEffects[effect]) {
            delete entity.activeEffects[effect];
          }
        });
      });

      // Player Movement
      let speed = 8;
      if (state.player.activeEffects.speed) speed = 14;

      if (state.keys['a'] || state.keys['arrowleft']) state.player.x -= speed;
      if (state.keys['d'] || state.keys['arrowright']) state.player.x += speed;
      if (state.keys['w'] || state.keys['arrowup']) state.player.y -= speed;
      if (state.keys['s'] || state.keys['arrowdown']) state.player.y += speed;

      // Wrap Player X
      if (state.player.x < 0) state.player.x = ARENA_WIDTH - 10;
      else if (state.player.x > ARENA_WIDTH) state.player.x = 10;
      
      // Wrap Player Y (Infinite Holes)
      if (state.player.y < 0) {
        state.player.y = ARENA_HEIGHT - 10;
        state.camera.y = ARENA_HEIGHT - VIEW_HEIGHT; // Snap camera
      } else if (state.player.y > ARENA_HEIGHT) {
        state.player.y = 10;
        state.camera.y = 0; // Snap camera
      }

      // Bot AI (Opponent)
      let targetX = state.player.x;
      let targetY = state.player.y;

      // AI Objectives based on Mode
      if (gameMode === 'KOTH') {
        targetX = state.koth.x;
        targetY = state.koth.y;
      } else if (gameMode === 'CTF') {
        if (state.ctf.enemyFlag.carrier === 'opponent') {
          // Returning home with flag
          targetX = state.ctf.enemyFlag.home.x;
          targetY = state.ctf.enemyFlag.home.y;
        } else {
          // Go for player flag
          targetX = state.ctf.playerFlag.x;
          targetY = state.ctf.playerFlag.y;
        }
      } else if (state.player.activeEffects.stealth) {
        // Player invisible - AI wanders randomly or stays put
        targetX = state.opponent.x + (Math.sin(time / 500) * 200);
        targetY = state.opponent.y + (Math.cos(time / 500) * 200);
      }

      const dist = Math.hypot(targetX - state.opponent.x, targetY - state.opponent.y);
      
      // Move Logic
      const dx = targetX - state.opponent.x;
      const dy = targetY - state.opponent.y;

      // X Movement
      if (Math.abs(dx) > 20) {
         state.opponent.x += Math.sign(dx) * 5; // AI Speed
      }

      // Y Movement
      if (gameMode === 'DEATHMATCH') {
         // Maintain distance logic for DM
         const combatDist = Math.hypot(state.player.x - state.opponent.x, state.player.y - state.opponent.y);
         if (combatDist > 800) state.opponent.y += 4;
         else if (combatDist < 400) state.opponent.y -= 4;
      } else {
         // Go to objective logic
         if (Math.abs(dy) > 20) {
            state.opponent.y += Math.sign(dy) * 5;
         }
      }

      // Wrap Opponent X
      if (state.opponent.x < 0) state.opponent.x = ARENA_WIDTH - 10;
      else if (state.opponent.x > ARENA_WIDTH) state.opponent.x = 10;
      
      // Wrap Opponent Y
      if (state.opponent.y < 0) state.opponent.y = ARENA_HEIGHT - 10;
      else if (state.opponent.y > ARENA_HEIGHT) state.opponent.y = 10;

      // Spawn Powerups
      if (Math.random() < 0.005 && state.powerups.length < 5) {
        const types = Object.keys(POWERUPS);
        const type = types[Math.floor(Math.random() * types.length)];
        state.powerups.push({
          x: Math.random() * (ARENA_WIDTH - 100) + 50,
          y: Math.random() * (ARENA_HEIGHT - 100) + 50,
          type,
          id: Math.random()
        });
      }

      // Spawn Alien Hybrid Babies
      if (Math.random() < 0.01 && state.babies.length < 5) {
        state.babies.push({
          x: Math.random() * (ARENA_WIDTH - 100) + 50,
          y: Math.random() * (ARENA_HEIGHT - 100) + 50,
          id: Math.random(),
          floatOffset: Math.random() * Math.PI * 2
        });
      }

      // Powerup Collision
      state.powerups = state.powerups.filter(p => {
        const pDist = Math.hypot(state.player.x - p.x, state.player.y - p.y);
        const oDist = Math.hypot(state.opponent.x - p.x, state.opponent.y - p.y);
        
        if (pDist < 40) {
          // Player collected
          state.player.activeEffects[p.type] = time + POWERUPS[p.type].duration;
          return false;
        }
        if (oDist < 40) {
          // Opponent collected
          state.opponent.activeEffects[p.type] = time + POWERUPS[p.type].duration;
          return false;
        }
        return true;
      });

      // Baby Collection
      state.babies = state.babies.filter(baby => {
        const pDist = Math.hypot(state.player.x - baby.x, state.player.y - baby.y);
        
        if (pDist < 50) {
          // Player collected
          state.babiesRescued++;
          // Spawn particle effect
          for (let i = 0; i < 10; i++) {
             state.particles.push({
               x: baby.x,
               y: baby.y,
               vx: (Math.random() - 0.5) * 5,
               vy: (Math.random() - 0.5) * 5,
               life: 1.0,
               color: '#00ff00'
             });
          }
          return false;
        }
        return true;
      });

      // Shooting (Auto-fire for now for prototype)
      const playerFireRate = state.player.activeEffects.rapid_fire ? 100 : 200;
      const enemyFireRate = state.opponent.activeEffects.rapid_fire ? 150 : 300;

      if (time % playerFireRate < 16) {
        // Player Shoot
        if (state.player.activeEffects.multishot) {
           state.bullets.push({ x: state.player.x, y: state.player.y, vx: -5, vy: -15, owner: 'player' });
           state.bullets.push({ x: state.player.x, y: state.player.y, vx: 0, vy: -15, owner: 'player' });
           state.bullets.push({ x: state.player.x, y: state.player.y, vx: 5, vy: -15, owner: 'player' });
        } else {
           state.bullets.push({ x: state.player.x, y: state.player.y, vx: 0, vy: -15, owner: 'player' });
        }
      }
      if (time % enemyFireRate < 16) {
        // Enemy Shoot
        if (state.opponent.activeEffects.multishot) {
           state.bullets.push({ x: state.opponent.x, y: state.opponent.y, vx: -5, vy: 15, owner: 'enemy' });
           state.bullets.push({ x: state.opponent.x, y: state.opponent.y, vx: 0, vy: 15, owner: 'enemy' });
           state.bullets.push({ x: state.opponent.x, y: state.opponent.y, vx: 5, vy: 15, owner: 'enemy' });
        } else {
           state.bullets.push({ x: state.opponent.x, y: state.opponent.y, vx: 0, vy: 15, owner: 'enemy' });
        }
      }

      // Update Bullets & Collision
      state.bullets.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
      });
      
      state.bullets = state.bullets.filter(b => {
        // Out of bounds
        if (b.x <= 0 || b.x >= ARENA_WIDTH || b.y <= 0 || b.y >= ARENA_HEIGHT) return false;
        
        // Hit Player
        if (b.owner === 'enemy') {
          const dist = Math.hypot(b.x - state.player.x, b.y - state.player.y);
          if (dist < 20) {
            if (!state.player.activeEffects.shield) {
              state.player.hp = Math.max(0, state.player.hp - 5);
              if (state.player.hp <= 0 && onGameOver) {
                  // Save baby rescue progress before ending
                  const saveProgress = async () => {
                      if (state.babiesRescued > 0 && currentUserEmail) {
                          try {
                              // Update PlayerRank
                              const ranks = await apiClient.entities.PlayerRank.filter({ created_by: currentUserEmail });
                              if (ranks.length > 0) {
                                  const rank = ranks[0];
                                  await apiClient.entities.PlayerRank.update(rank.id, {
                                      total_babies_rescued: (rank.total_babies_rescued || 0) + state.babiesRescued
                                  });
                              } else {
                                  await apiClient.entities.PlayerRank.create({
                                      total_babies_rescued: state.babiesRescued
                                  });
                              }

                              // Update Leaderboard
                              await apiClient.entities.Leaderboard.create({
                                  player_name: playerName,
                                  distance: 0, // Arena doesn't have distance yet
                                  babies_rescued: state.babiesRescued,
                                  coins_collected: 0,
                                  enemies_destroyed: 0 // Track kills later
                              });
                          } catch (e) {
                              console.error("Failed to save baby rescue progress", e);
                          }
                      }
                      onGameOver({ babiesRescued: state.babiesRescued });
                  };
                  saveProgress();
              }
            }
            return false; // Destroy bullet
          }
        }
        
        // Hit Opponent
        if (b.owner === 'player') {
          const dist = Math.hypot(b.x - state.opponent.x, b.y - state.opponent.y);
          if (dist < 20) {
            if (!state.opponent.activeEffects.shield) {
              state.opponent.hp = Math.max(0, state.opponent.hp - 5);
              // Opponent Death
              if (state.opponent.hp <= 0) {
                // Spawn Explosion
                for (let i = 0; i < 30; i++) {
                  state.particles.push({
                    x: state.opponent.x,
                    y: state.opponent.y,
                    vx: (Math.random() - 0.5) * 15,
                    vy: (Math.random() - 0.5) * 15,
                    life: 1.0,
                    color: '#ff0000'
                  });
                }
                // Respawn Opponent (New Challenger)
                state.opponent.hp = 100;
                state.opponent.x = Math.random() * ARENA_WIDTH;
                state.opponent.y = 200;
                // Optional: Trigger fetch of new ship image logic here if we moved it to a ref or function
              }
            }
            return false; // Destroy bullet
          }
        }
        
        return true;
      });

      // Update Particles
      state.particles.forEach(p => {
        if (p.type === 'nova') {
           p.radius += 10;
           p.life -= 0.05;
        } else {
           p.x += p.vx;
           p.y += p.vy;
           p.life -= 0.02;
        }
      });
      state.particles = state.particles.filter(p => p.life > 0);

      // Camera Follow Player (with smooth lerp)
      const targetCamY = state.player.y - VIEW_HEIGHT * 0.7;
      state.camera.y += (targetCamY - state.camera.y) * 0.1;
      
      // Clamp Camera
      state.camera.y = Math.max(0, Math.min(ARENA_HEIGHT - VIEW_HEIGHT, state.camera.y));

      // --- DRAW GAME WORLD (Tilted Canvas) ---
      
      const colors = THEMES[theme];

      // Clear Background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

      // Draw Grid (World Space)
      ctx.save();
      ctx.translate(-state.player.x + VIEW_WIDTH/2, -state.camera.y); // Center X on player, Y on camera

      // Draw Floor Grid
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 2;
      const gridSize = 100;
      
      // Vertical lines
      for(let x = 0; x <= ARENA_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ARENA_HEIGHT);
        ctx.stroke();
      }
      // Horizontal lines
      for(let y = 0; y <= ARENA_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ARENA_WIDTH, y);
        ctx.stroke();
      }

      // Draw Borders (All sides are portals now)
      ctx.strokeStyle = colors.border;
      ctx.setLineDash([20, 20]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Left
      ctx.moveTo(0, 0);
      ctx.lineTo(0, ARENA_HEIGHT);
      // Right
      ctx.moveTo(ARENA_WIDTH, 0);
      ctx.lineTo(ARENA_WIDTH, ARENA_HEIGHT);
      ctx.stroke();

      // Draw Warp Portals (Top/Bottom)
      ctx.strokeStyle = colors.border;
      ctx.setLineDash([20, 20]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ARENA_WIDTH, 0);
      ctx.moveTo(0, ARENA_HEIGHT);
      ctx.lineTo(ARENA_WIDTH, ARENA_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // --- DRAW MODE ELEMENTS ---
      if (gameMode === 'KOTH') {
         ctx.save();
         const k = state.koth;
         const kColor = k.owner === 'player' ? colors.player : k.owner === 'opponent' ? colors.opponent : '#888';
         ctx.strokeStyle = kColor;
         ctx.fillStyle = kColor;
         ctx.lineWidth = 5;
         ctx.beginPath();
         ctx.arc(k.x, k.y, k.radius, 0, Math.PI*2);
         ctx.stroke();
         ctx.globalAlpha = 0.2;
         ctx.fill();
         ctx.globalAlpha = 1.0;
         
         // Progress Bar inside
         ctx.fillStyle = '#fff';
         ctx.fillRect(k.x - 50, k.y - 10, 100, 20);
         ctx.fillStyle = k.progress > 0 ? colors.player : colors.opponent;
         ctx.fillRect(k.x - 50, k.y - 10, 50 + k.progress/2, 20); // Visualize -100 to 100 range
         ctx.restore();
      }

      if (gameMode === 'CTF') {
         // Draw Bases
         ctx.fillStyle = colors.player + '44'; // Alpha hex
         ctx.fillRect(state.ctf.playerFlag.home.x - 50, state.ctf.playerFlag.home.y - 50, 100, 100);
         ctx.fillStyle = colors.opponent + '44';
         ctx.fillRect(state.ctf.enemyFlag.home.x - 50, state.ctf.enemyFlag.home.y - 50, 100, 100);

         // Draw Flags
         const drawFlag = (flag, color) => {
            ctx.save();
            ctx.translate(flag.x, flag.y);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -40);
            ctx.lineTo(30, -30);
            ctx.lineTo(0, -20);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -40);
            ctx.stroke();
            ctx.restore();
         };
         
         if (!state.ctf.playerFlag.carrier || state.ctf.playerFlag.carrier !== 'player') 
            drawFlag(state.ctf.playerFlag, colors.player);
         if (!state.ctf.enemyFlag.carrier || state.ctf.enemyFlag.carrier !== 'opponent')
            drawFlag(state.ctf.enemyFlag, colors.opponent);
      }

      // Draw Player
      ctx.save();
      if (state.player.activeEffects.stealth) ctx.globalAlpha = 0.3;
      if (playerShipImg) {
        ctx.translate(state.player.x, state.player.y);
        ctx.drawImage(playerShipImg, -25, -25, 50, 50);
      } else {
        ctx.fillStyle = colors.player;
        ctx.beginPath();
        ctx.moveTo(state.player.x, state.player.y - 20);
        ctx.lineTo(state.player.x + 15, state.player.y + 20);
        ctx.lineTo(state.player.x - 15, state.player.y + 20);
        ctx.fill();
      }
      // Flag carrier indicator
      if (gameMode === 'CTF' && state.ctf.enemyFlag.carrier === 'player') {
         ctx.fillStyle = colors.opponent;
         ctx.beginPath();
         ctx.arc(state.player.x, state.player.y - 30, 8, 0, Math.PI*2);
         ctx.fill();
      }
      ctx.restore();

      // Draw Opponent
      if (opponentShipImg) {
        ctx.save();
        ctx.translate(state.opponent.x, state.opponent.y);
        ctx.rotate(Math.PI); // Face down
        ctx.drawImage(opponentShipImg, -25, -25, 50, 50);
        ctx.restore();
      } else {
        ctx.fillStyle = colors.opponent;
        ctx.beginPath();
        ctx.moveTo(state.opponent.x, state.opponent.y + 20);
        ctx.lineTo(state.opponent.x + 15, state.opponent.y - 20);
        ctx.lineTo(state.opponent.x - 15, state.opponent.y - 20);
        ctx.fill();
      }

      // Helper: Draw Segmented HP
      const drawHpList = (entity, color) => {
        const segments = 10;
        const segWidth = 4;
        const gap = 1;
        const totalWidth = (segWidth + gap) * segments;
        const startX = entity.x - totalWidth / 2;
        const y = entity.y - 35;
        const hpPerSeg = entity.maxHp / segments;

        for (let i = 0; i < segments; i++) {
          ctx.fillStyle = (entity.hp >= (i + 1) * hpPerSeg) ? color : 'rgba(50,50,50,0.5)';
          ctx.fillRect(startX + i * (segWidth + gap), y, segWidth, 4);
        }
      };

      drawHpList(state.player, colors.player);
      drawHpList(state.opponent, colors.opponent);

      // Draw Shields
      if (state.player.activeEffects.shield) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, 30, 0, Math.PI*2);
        ctx.stroke();
      }
      if (state.opponent.activeEffects.shield) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(state.opponent.x, state.opponent.y, 30, 0, Math.PI*2);
        ctx.stroke();
      }

      // Draw Powerups
      state.powerups.forEach(p => {
        const info = POWERUPS[p.type];
        ctx.shadowColor = info.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = info.color;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI*2);
        ctx.fill();
        
        // Inner text
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(info.label[0], p.x, p.y);
        
        ctx.shadowBlur = 0;
      });

      // Draw Alien Babies
      state.babies.forEach(baby => {
        const floatY = Math.sin(time / 200 + baby.floatOffset) * 5;
        const x = baby.x;
        const y = baby.y + floatY;

        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 15;
        
        // Body (Bubble)
        ctx.fillStyle = 'rgba(0, 255, 100, 0.4)';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Baby Alien
        ctx.fillStyle = '#ccffcc';
        ctx.beginPath();
        // Head
        ctx.ellipse(x, y - 5, 10, 8, 0, 0, Math.PI*2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(x - 4, y - 4, 3, 4, 0.2, 0, Math.PI*2);
        ctx.ellipse(x + 4, y - 4, 3, 4, -0.2, 0, Math.PI*2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
      });

      // Draw Bullets
      state.bullets.forEach(b => {
        ctx.fillStyle = b.owner === 'player' ? colors.bulletPlayer : colors.bulletEnemy;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI*2);
        ctx.fill();
      });

      // Draw Particles
      state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.type === 'nova') {
           ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        } else {
           ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
        }
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      ctx.restore();

      // --- DRAW UI / EAGLE EYE (Flat UI Canvas) ---
      
      uiCtx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      
      // Top Right Corner
      const mapW = 200;
      const mapH = 300;
      const mapX = VIEW_WIDTH - mapW - 20;
      const mapY = 20;
      const scaleX = mapW / ARENA_WIDTH;
      const scaleY = mapH / ARENA_HEIGHT;

      // Minimap BG
      uiCtx.fillStyle = 'rgba(0, 20, 40, 0.8)';
      uiCtx.fillRect(mapX, mapY, mapW, mapH);
      uiCtx.strokeStyle = '#00ffff';
      uiCtx.lineWidth = 2;
      uiCtx.strokeRect(mapX, mapY, mapW, mapH);

      // Minimap Content
      // Player Dot
      uiCtx.fillStyle = '#00ffff';
      uiCtx.beginPath();
      uiCtx.arc(mapX + state.player.x * scaleX, mapY + state.player.y * scaleY, 4, 0, Math.PI*2);
      uiCtx.fill();

      // Opponent Dot
      uiCtx.fillStyle = '#ff0000';
      uiCtx.beginPath();
      uiCtx.arc(mapX + state.opponent.x * scaleX, mapY + state.opponent.y * scaleY, 4, 0, Math.PI*2);
      uiCtx.fill();

      // Powerups on Minimap
      state.powerups.forEach(p => {
        uiCtx.fillStyle = POWERUPS[p.type].color;
        uiCtx.beginPath();
        uiCtx.arc(mapX + p.x * scaleX, mapY + p.y * scaleY, 3, 0, Math.PI*2);
        uiCtx.fill();
      });

      // Babies on Minimap
      state.babies.forEach(baby => {
        uiCtx.fillStyle = '#00ff00';
        uiCtx.beginPath();
        uiCtx.arc(mapX + baby.x * scaleX, mapY + baby.y * scaleY, 4, 0, Math.PI*2);
        uiCtx.fill();
      });

      // Viewport Rectangle on Minimap
      uiCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      uiCtx.lineWidth = 1;
      uiCtx.strokeRect(
        mapX + (state.player.x - VIEW_WIDTH/2) * scaleX,
        mapY + state.camera.y * scaleY,
        VIEW_WIDTH * scaleX,
        VIEW_HEIGHT * scaleY
      );

      // Minimap Label
      uiCtx.fillStyle = '#00ffff';
      uiCtx.font = '10px Arial';
      uiCtx.fillText('EAGLE EYE', mapX + 5, mapY + 15);

      // BABY COUNT
      uiCtx.font = 'bold 16px Arial';
      uiCtx.fillStyle = '#00ff00';
      uiCtx.textAlign = 'left';
      uiCtx.fillText(`BABIES: ${state.babiesRescued}`, 20, VIEW_HEIGHT - 60);

      // SCOREBOARD
      if (gameMode !== 'DEATHMATCH') {
      uiCtx.font = 'bold 20px Arial';
      uiCtx.textAlign = 'center';
      uiCtx.fillStyle = colors.player;
      uiCtx.fillText(Math.floor(state.scores.player), VIEW_WIDTH / 2 - 50, 50);
      uiCtx.fillStyle = colors.opponent;
      uiCtx.fillText(Math.floor(state.scores.opponent), VIEW_WIDTH / 2 + 50, 50);
      uiCtx.fillStyle = '#fff';
      uiCtx.font = '12px Arial';
      uiCtx.fillText(gameMode, VIEW_WIDTH / 2, 30);
      }

      animationId = requestAnimationFrame(render);
    };

    render(0);
    return () => cancelAnimationFrame(animationId);
  }, [dimensions, theme, opponentShipImg, playerShipImg, gameMode]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden perspective-[1000px]"
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
         onTouchCancel={handleTouchEnd}
         style={{ touchAction: 'none' }}>
      {/* Game World (Tilted) */}
      <canvas 
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block absolute inset-0"
        style={{
          transform: 'perspective(1000px) rotateX(25deg) scale(1.2)',
          transformOrigin: 'center 80%'
        }}
      />
      
      {/* UI Overlay (Flat) */}
      <canvas 
        ref={uiCanvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block absolute inset-0 pointer-events-none"
      />
      
      {/* HTML UI Overlay */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <Button onClick={onClose} variant="outline" className="border-red-500 text-red-500 hover:bg-red-900/20">
          EXIT ARENA
        </Button>
        <Button 
          onClick={() => {
            const keys = Object.keys(THEMES);
            const idx = keys.indexOf(theme);
            const nextTheme = keys[(idx + 1) % keys.length];
            if (nextTheme === 'random') {
              const h1 = Math.floor(Math.random() * 360);
              const h2 = (h1 + 180) % 360;
              setRandomThemeColors({
                bg: `hsl(${h1}, 30%, 5%)`,
                grid: `hsla(${h1}, 100%, 50%, 0.2)`,
                border: `hsl(${h2}, 100%, 50%)`,
                player: `hsl(${h1}, 100%, 70%)`,
                opponent: `hsl(${h2}, 100%, 60%)`,
                bulletPlayer: `hsl(${h1}, 100%, 80%)`,
                bulletEnemy: `hsl(${h2}, 100%, 70%)`
              });
            }
            setTheme(nextTheme);
          }} 
          variant="outline" 
          className="border-cyan-500 text-cyan-500 hover:bg-cyan-900/20"
        >
          THEME: {theme.toUpperCase()}
        </Button>
        <Button 
          onClick={() => setGameMode(prev => {
            const keys = Object.keys(MODES);
            const idx = keys.indexOf(prev);
            return keys[(idx + 1) % keys.length];
          })} 
          variant="outline" 
          className="border-yellow-500 text-yellow-500 hover:bg-yellow-900/20"
        >
          MODE: {gameMode}
        </Button>
        </div>
      
      <div className="absolute bottom-4 left-4 text-cyan-400 font-mono text-sm z-50">
        ARENA PROTOTYPE v0.3 - POWERUPS
      </div>
    </div>
  );
}
