export function initBackground(width, height, level) {
  // Initialize stars
  const stars = Array.from({ length: 200 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() < 0.9 ? Math.random() * 1.5 + 0.5 : Math.random() * 2 + 2,
    speed: Math.random() * 3 + 0.5,
    opacity: Math.random() * 0.5 + 0.3,
    twinkle: Math.random() * Math.PI * 2,
    color: Math.random() > 0.8 ? (Math.random() > 0.5 ? '#aaddff' : '#ffddaa') : '#ffffff'
  }));

  // Initialize nebulae
  const nebulae = Array.from({ length: 8 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 300 + 150,
    speed: Math.random() * 0.4 + 0.1,
    hue: Math.random() * 360,
    opacity: Math.random() * 0.1 + 0.05
  }));

  // Initialize layered planets
  const levelColors = [
    { main: '#3388ff', glow: '#0044ff', rings: false, crater: false },
    { main: '#ff4422', glow: '#aa1100', rings: true, crater: true },
    { main: '#ffdd55', glow: '#ff8800', rings: false, crater: false },
    { main: '#22ff88', glow: '#00aa44', rings: true, crater: false },
    { main: '#aa22ff', glow: '#4400aa', rings: false, crater: true },
  ];
  const planetConf = levelColors[(level - 1) % levelColors.length] || levelColors[0];
  
  const planets = [
    { x: width * 0.5, y: height * 0.28, size: Math.min(150, width * 0.25), speed: 0, isHorizon: true, type: 'planet', color: planetConf.main, glow: planetConf.glow, rings: planetConf.rings, crater: planetConf.crater },
    { x: width * 0.2, y: height * 0.15, size: Math.min(40, width * 0.06), speed: 0.05, type: 'moon', color: '#aaaaaa', glow: '#555555', rings: false, crater: true },
    { x: width * 0.8, y: height * 0.1, size: Math.min(25, width * 0.04), speed: 0.02, type: 'moon', color: '#888888', glow: '#333333', rings: false, crater: true }
  ];

  return { stars, nebulae, planets };
}

export function drawBackground(ctx, game, config) {
  const { width, height, horizonY, visualMode, theme, timeScale, activeEvent } = config;
  
  // Draw nebulae
  if (visualMode === 1) ctx.globalCompositeOperation = 'screen';
  game.nebulae.forEach(nebula => {
    nebula.y += nebula.speed;
    if (nebula.y > height + nebula.size) {
      nebula.y = -nebula.size;
      nebula.x = Math.random() * width;
    }
    const pulse = 1 + Math.sin(Date.now() * 0.001 + nebula.x) * 0.1;
    const currentSize = nebula.size * pulse;
    const gradient = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, currentSize);
    const hue = (theme.nebula || 200) + nebula.hue * 0.2; 
    gradient.addColorStop(0, `hsla(${hue}, 80%, 60%, ${nebula.opacity})`);
    gradient.addColorStop(0.4, `hsla(${hue + 20}, 70%, 40%, ${nebula.opacity * 0.5})`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(nebula.x, nebula.y, currentSize, 0, Math.PI * 2);
    ctx.fill();
  });
  if (visualMode === 1) ctx.globalCompositeOperation = 'source-over';

  // Draw Planets
  if (!game.customHorizonLoaded && visualMode !== 2 && game.planets) {
     game.planets.forEach(planet => {
        let currentSize = planet.size;
        let currentY = planet.y;
        
        if (planet.isHorizon && config.bossInterval) {
           const progress = config.boss ? 1 : Math.min(1, (config.distance % config.bossInterval) / config.bossInterval);
           currentSize = planet.size * (0.8 + Math.pow(progress, 2) * 1.5); // Grows exponentially larger
           currentY = planet.y - (currentSize - planet.size) * 0.3; // Move up slightly as it grows
        }

        if (!planet.isHorizon) {
           planet.y += planet.speed * timeScale * (activeEvent === 'hyper_speed' ? 3 : 1);
           if (planet.y > height + planet.size * 2) {
              planet.y = -planet.size * 2;
              planet.x = Math.random() * width;
           }
           currentY = planet.y;
        }

        if (currentY < horizonY + currentSize || planet.isHorizon) {
           ctx.save();
           ctx.globalAlpha = 0.4;
           const glowGrad = ctx.createRadialGradient(planet.x, currentY, currentSize * 0.8, planet.x, currentY, currentSize * 1.8);
           glowGrad.addColorStop(0, planet.glow);
           glowGrad.addColorStop(1, 'transparent');
           ctx.fillStyle = glowGrad;
           ctx.beginPath();
           ctx.arc(planet.x, currentY, currentSize * 1.8, 0, Math.PI * 2);
           ctx.fill();
           ctx.globalAlpha = 1.0;
           
           const bodyGrad = ctx.createRadialGradient(planet.x - currentSize * 0.3, currentY - currentSize * 0.3, 0, planet.x, currentY, currentSize);
           bodyGrad.addColorStop(0, '#ffffff');
           bodyGrad.addColorStop(0.3, planet.color);
           bodyGrad.addColorStop(1, '#000000');
           ctx.fillStyle = bodyGrad;
           ctx.beginPath();
           ctx.arc(planet.x, currentY, currentSize, 0, Math.PI * 2);
           ctx.fill();

           if (planet.crater) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
              ctx.beginPath(); ctx.arc(planet.x - currentSize * 0.2, currentY + currentSize * 0.2, currentSize * 0.25, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.arc(planet.x + currentSize * 0.3, currentY - currentSize * 0.1, currentSize * 0.15, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.arc(planet.x - currentSize * 0.1, currentY - currentSize * 0.4, currentSize * 0.1, 0, Math.PI * 2); ctx.fill();
           }

           if (planet.rings) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.lineWidth = currentSize * 0.15;
              ctx.beginPath(); ctx.ellipse(planet.x, currentY, currentSize * 1.6, currentSize * 0.3, Math.PI / 8, 0, Math.PI * 2); ctx.stroke();
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
              ctx.lineWidth = currentSize * 0.05;
              ctx.beginPath(); ctx.ellipse(planet.x, currentY, currentSize * 1.5, currentSize * 0.25, Math.PI / 8, 0, Math.PI * 2); ctx.stroke();
           }
           ctx.restore();
        }
     });
  }

  // Draw Stars
  game.stars.forEach(star => {
    const parallaxSpeed = star.speed * (star.size * 0.5) * timeScale * (activeEvent === 'hyper_speed' ? 3 : 1);
    star.y += parallaxSpeed;
    if (star.y > height) {
      star.y = -10;
      star.x = Math.random() * width;
    }
    if (star.y < horizonY || visualMode === 2) {
      star.twinkle += 0.05;
      const twinkleOpacity = Math.max(0.1, star.opacity + Math.sin(star.twinkle) * 0.3);
      ctx.fillStyle = star.color || '#ffffff';
      ctx.globalAlpha = twinkleOpacity;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      if (star.size > 2.5 && visualMode === 1) {
         ctx.globalAlpha = twinkleOpacity * 0.4;
         ctx.beginPath();
         ctx.moveTo(star.x - star.size * 2, star.y); ctx.lineTo(star.x + star.size * 2, star.y);
         ctx.moveTo(star.x, star.y - star.size * 2); ctx.lineTo(star.x, star.y + star.size * 2);
         ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  });
}