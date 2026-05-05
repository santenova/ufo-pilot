import { drawShip, drawEngineGlow } from './ShipRenderer';

export const renderPlayerShip = (ctx, player, isP2, safeCustomization, game, PLAYER_SIZE) => {
  if (!player || player.isDead) return;
  
  ctx.save();
  
  const shipModel = safeCustomization.equipped.models || 'basic';
  // For P2, maybe slightly different color or just same
  let shipColors = { primary: '#00f0ff', secondary: '#0088ff', accent: '#004488', aura: 'rgba(0, 240, 255, 0.3)' };
  if (isP2) {
    shipColors = { primary: '#ff0055', secondary: '#ff5500', accent: '#aa0000', aura: 'rgba(255, 0, 55, 0.3)' };
  } else if (typeof safeCustomization.equipped.colors === 'object' && safeCustomization.equipped.colors !== null) {
    const c = safeCustomization.equipped.colors;
    shipColors = { 
      primary: c.primary || '#00f0ff', 
      secondary: c.secondary || '#0088ff', 
      accent: c.accent || '#004488', 
      aura: (c.primary || '#00f0ff').replace(')', ', 0.3)').replace('rgb', 'rgba') 
    };
  }

  // Aura
  const auraGradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, PLAYER_SIZE * 1.5);
  auraGradient.addColorStop(0, shipColors.aura);
  auraGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = auraGradient;
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_SIZE * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Ship
  const STANDARD_MODELS = ['basic', 'delta', 'arrow', 'falcon', 'viper', 'guardian', 'stealth'];
  const isCustomShip = !STANDARD_MODELS.includes(shipModel) || (safeCustomization.customShipImageUrl && safeCustomization.customShipImageUrl.length > 0);

  if (isCustomShip && game.customShipLoaded && game.customShipImage) {
    const imgWidth = PLAYER_SIZE * 2;
    const imgHeight = PLAYER_SIZE * 2;

    // Backing glow for semi-transparent custom/admin ships
    ctx.save();
    const backingGrad = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, imgWidth * 0.5);
    backingGrad.addColorStop(0, shipColors.primary || '#ffffff');
    backingGrad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = backingGrad;
    ctx.beginPath();
    ctx.arc(player.x, player.y, imgWidth * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(game.customShipImage, player.x - imgWidth/2, player.y - imgHeight/2, imgWidth, imgHeight);
  } else {
    ctx.translate(player.x, player.y);
    drawShip(ctx, shipModel, PLAYER_SIZE, shipColors, isP2 ? [] : safeCustomization.equipped.decal); // No decals for P2 for now
    ctx.translate(-player.x, -player.y);
  }

  // Engine
  drawEngineGlow(ctx, player.x, player.y + 15, 20);
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 15, 8, 15 + Math.random() * 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Particles
  if (Math.random() > 0.7) {
    game.particles.push({
      x: player.x + (Math.random() - 0.5) * 10,
      y: player.y + 15,
      vx: (Math.random() - 0.5) * 2,
      vy: 3 + Math.random() * 2,
      life: 20,
      maxLife: 20,
      size: Math.random() * 3 + 1,
      color: '#ff6600'
    });
  }

  ctx.restore();
};