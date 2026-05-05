export const ALL_SHOOTER_WEAPONS = [
  'laser', 'plasma', 'rocket', 'pulse', 'spread', 'wave', 'railgun', 'orb', 'seeker', 'chain', 'boomerang', 'flamethrower', 'sonic', 'prism', 'swarm', 'vortex', 'neutron', 'helix', 'starfall',
  'beam', 'cannon', 'grenade', 'missile', 'torpedo', 'dart', 'rail_pulse', 'energy_ball', 'plasma_burst', 'ion_cannon', 'shockwave', 'laser_turret', 'rail_boomerang', 'sonic_wave', 'prism_beam', 'swarm_drone', 'vortex_trap', 'neutron_pulse', 'helix_shot', 'starfall_missile', 'void', 'cluster'
];

export function getWeaponStats(weaponType, isMutated, weaponLevel) {
    let bulletCount = 1;
    let bulletSpeed = 12;
    let bulletSize = 6;
    let damage = 25;
    let bulletColor = '#00ff88';
    let isHoming = false;
    let spreadFactor = 25;
    let isWave = false;

    if (isMutated) {
      switch(weaponType) {
        case 'laser': bulletCount = 4; bulletSpeed = 25; bulletSize = 6; damage = 35; bulletColor = '#00ffff'; break;
        case 'plasma': bulletCount = 8; bulletSpeed = 15; bulletSize = 10; damage = 30; bulletColor = '#ff00ff'; break;
        case 'rocket': bulletCount = 2; bulletSpeed = 12; bulletSize = 14; damage = 100; bulletColor = '#ffaa00'; isHoming = true; break;
        case 'pulse': bulletCount = 3; bulletSpeed = 30; bulletSize = 5; damage = 15; bulletColor = '#0088ff'; break;
        case 'spread': bulletCount = 9; bulletSpeed = 18; bulletSize = 7; damage = 25; bulletColor = '#ff0000'; spreadFactor = 35; break;
        case 'wave': bulletCount = 3; bulletSpeed = 16; bulletSize = 12; damage = 45; bulletColor = '#00ff88'; isWave = true; break;
        case 'railgun': bulletCount = 2; bulletSpeed = 50; bulletSize = 10; damage = 300; bulletColor = '#ffffff'; break;
        case 'orb': bulletCount = 1; bulletSpeed = 4; bulletSize = 50; damage = 200; bulletColor = '#aa00ff'; break;
        case 'seeker': bulletCount = 8; bulletSpeed = 20; bulletSize = 6; damage = 35; bulletColor = '#ffff00'; isHoming = true; break;
        case 'chain': bulletCount = 4; bulletSpeed = 25; bulletSize = 5; damage = 45; bulletColor = '#aaddff'; isHoming = true; break;
        case 'boomerang': bulletCount = 3; bulletSpeed = 20; bulletSize = 10; damage = 60; bulletColor = '#ffaa44'; break;
        case 'flamethrower': bulletCount = 10; bulletSpeed = 15; bulletSize = 15; damage = 15; bulletColor = '#ff4400'; break;
        case 'sonic': bulletCount = 3; bulletSpeed = 20; bulletSize = 40; damage = 50; bulletColor = '#cc00ff'; break;
        case 'prism': bulletCount = 6; bulletSpeed = 25; bulletSize = 8; damage = 40; bulletColor = '#ffffff'; break;
        case 'swarm': bulletCount = 12; bulletSpeed = 15; bulletSize = 4; damage = 20; bulletColor = '#ffff00'; isHoming = true; break;
        case 'vortex': bulletCount = 1; bulletSpeed = 3; bulletSize = 80; damage = 150; bulletColor = '#8800ff'; break;
        case 'neutron': bulletCount = 3; bulletSpeed = 15; bulletSize = 25; damage = 120; bulletColor = '#ffffaa'; break;
        case 'helix': bulletCount = 4; bulletSpeed = 20; bulletSize = 10; damage = 45; bulletColor = '#00ff44'; break;
        case 'starfall': bulletCount = 10; bulletSpeed = 25; bulletSize = 8; damage = 35; bulletColor = '#ffffff'; spreadFactor = 40; break;
        
        case 'beam': bulletCount = 2; bulletSpeed = 45; bulletSize = 12; damage = 150; bulletColor = '#00aaff'; break;
        case 'cannon': bulletCount = 1; bulletSpeed = 12; bulletSize = 60; damage = 800; bulletColor = '#444444'; break;
        case 'grenade': bulletCount = 6; bulletSpeed = 14; bulletSize = 15; damage = 120; bulletColor = '#00ff00'; spreadFactor = 30; break;
        case 'missile': bulletCount = 8; bulletSpeed = 20; bulletSize = 12; damage = 90; bulletColor = '#ff4400'; isHoming = true; break;
        case 'torpedo': bulletCount = 3; bulletSpeed = 6; bulletSize = 40; damage = 600; bulletColor = '#000044'; isHoming = true; break;
        case 'dart': bulletCount = 20; bulletSpeed = 40; bulletSize = 4; damage = 25; bulletColor = '#ffff00'; spreadFactor = 15; break;
        case 'rail_pulse': bulletCount = 1; bulletSpeed = 60; bulletSize = 20; damage = 500; bulletColor = '#00ffff'; break;
        case 'energy_ball': bulletCount = 3; bulletSpeed = 8; bulletSize = 45; damage = 300; bulletColor = '#ff00ff'; break;
        case 'plasma_burst': bulletCount = 15; bulletSpeed = 22; bulletSize = 9; damage = 45; bulletColor = '#aa00ff'; spreadFactor = 45; break;
        case 'ion_cannon': bulletCount = 1; bulletSpeed = 15; bulletSize = 50; damage = 750; bulletColor = '#0088ff'; break;
        case 'shockwave': bulletCount = 1; bulletSpeed = 10; bulletSize = 150; damage = 400; bulletColor = '#ffffff'; isWave = true; break;
        case 'laser_turret': bulletCount = 8; bulletSpeed = 35; bulletSize = 6; damage = 40; bulletColor = '#ff0000'; break;
        case 'rail_boomerang': bulletCount = 2; bulletSpeed = 30; bulletSize = 15; damage = 250; bulletColor = '#ffaa00'; break;
        case 'sonic_wave': bulletCount = 3; bulletSpeed = 20; bulletSize = 60; damage = 200; bulletColor = '#00ff00'; isWave = true; break;
        case 'prism_beam': bulletCount = 10; bulletSpeed = 28; bulletSize = 7; damage = 45; bulletColor = '#ff88ff'; break;
        case 'swarm_drone': bulletCount = 15; bulletSpeed = 18; bulletSize = 6; damage = 30; bulletColor = '#ffffaa'; isHoming = true; break;
        case 'vortex_trap': bulletCount = 1; bulletSpeed = 3; bulletSize = 100; damage = 1000; bulletColor = '#440088'; break;
        case 'neutron_pulse': bulletCount = 2; bulletSpeed = 18; bulletSize = 30; damage = 350; bulletColor = '#00ff88'; break;
        case 'helix_shot': bulletCount = 4; bulletSpeed = 22; bulletSize = 15; damage = 150; bulletColor = '#ff0088'; break;
        case 'starfall_missile': bulletCount = 5; bulletSpeed = 25; bulletSize = 20; damage = 300; bulletColor = '#ffff00'; isHoming = true; break;

        case 'void': bulletCount = 1; bulletSpeed = 3; bulletSize = 60; damage = 300; bulletColor = '#000000'; break;
        case 'cluster': bulletCount = 2; bulletSpeed = 12; bulletSize = 15; damage = 80; bulletColor = '#ff0000'; break;

        default: bulletCount = 5; bulletSpeed = 18; bulletSize = 8; damage = 40;
      }
    } else {
      switch(weaponType) {
        case 'laser': bulletSpeed = 18 + weaponLevel; bulletSize = 4 + Math.floor(weaponLevel/3); damage = 20; bulletColor = '#00ffff'; break;
        case 'plasma': bulletCount = 3 + Math.floor(weaponLevel/5); bulletSpeed = 10; bulletSize = 8; damage = 15; bulletColor = '#ff00ff'; break;
        case 'rocket': bulletSpeed = 8; bulletSize = 12; damage = 50; bulletColor = '#ff8800'; break;
        case 'pulse': bulletSpeed = 25; bulletSize = 3; damage = 10; bulletColor = '#0088ff'; break;
        case 'spread': bulletCount = 5; bulletSpeed = 15; bulletSize = 6; damage = 18; bulletColor = '#ff3333'; break;
        case 'wave': bulletCount = 1; bulletSpeed = 12; bulletSize = 8; damage = 35; bulletColor = '#44ff44'; isWave = true; break;
        case 'railgun': bulletSpeed = 40; bulletSize = 5; damage = 120; bulletColor = '#ffffff'; break;
        case 'orb': bulletSpeed = 5; bulletSize = 25; damage = 80; bulletColor = '#aa00ff'; break;
        case 'seeker': bulletCount = 2; bulletSpeed = 15; bulletSize = 5; damage = 25; bulletColor = '#ffff00'; isHoming = true; break;
        case 'chain': bulletCount = 2; bulletSpeed = 20; bulletSize = 4; damage = 30; bulletColor = '#aaddff'; isHoming = true; break;
        case 'boomerang': bulletCount = 1; bulletSpeed = 15; bulletSize = 8; damage = 45; bulletColor = '#ffaa44'; break;
        case 'flamethrower': bulletCount = 5; bulletSpeed = 12; bulletSize = 10; damage = 8; bulletColor = '#ff4400'; break;
        case 'sonic': bulletCount = 1; bulletSpeed = 15; bulletSize = 30; damage = 30; bulletColor = '#cc00ff'; break;
        case 'prism': bulletCount = 3; bulletSpeed = 20; bulletSize = 6; damage = 25; bulletColor = '#ffffff'; break;
        case 'swarm': bulletCount = 5; bulletSpeed = 12; bulletSize = 3; damage = 12; bulletColor = '#ffff00'; isHoming = true; break;
        case 'vortex': bulletCount = 1; bulletSpeed = 2; bulletSize = 40; damage = 80; bulletColor = '#8800ff'; break;
        case 'neutron': bulletCount = 1; bulletSpeed = 12; bulletSize = 18; damage = 90; bulletColor = '#ffff00'; break;
        case 'helix': bulletCount = 2; bulletSpeed = 18; bulletSize = 8; damage = 35; bulletColor = '#00ff88'; break;
        case 'starfall': bulletCount = 6; bulletSpeed = 22; bulletSize = 6; damage = 25; bulletColor = '#ffffff'; spreadFactor = 20; break;
        
        case 'beam': bulletSpeed = 35; bulletSize = 6; damage = 60; bulletColor = '#00aaff'; break;
        case 'cannon': bulletSpeed = 8; bulletSize = 35; damage = 250; bulletColor = '#444444'; break;
        case 'grenade': bulletSpeed = 10; bulletSize = 10; damage = 70; bulletColor = '#00ff00'; break;
        case 'missile': bulletCount = 3; bulletSpeed = 14; bulletSize = 10; damage = 50; bulletColor = '#ff4400'; isHoming = true; break;
        case 'torpedo': bulletSpeed = 5; bulletSize = 25; damage = 300; bulletColor = '#000044'; isHoming = true; break;
        case 'dart': bulletCount = 6; bulletSpeed = 30; bulletSize = 3; damage = 15; bulletColor = '#ffff00'; break;
        case 'rail_pulse': bulletSpeed = 45; bulletSize = 8; damage = 150; bulletColor = '#00ffff'; break;
        case 'energy_ball': bulletSpeed = 6; bulletSize = 25; damage = 120; bulletColor = '#ff00ff'; break;
        case 'plasma_burst': bulletCount = 8; bulletSpeed = 18; bulletSize = 7; damage = 25; bulletColor = '#aa00ff'; spreadFactor = 30; break;
        case 'ion_cannon': bulletSpeed = 12; bulletSize = 30; damage = 200; bulletColor = '#0088ff'; break;
        case 'shockwave': bulletCount = 1; bulletSpeed = 10; bulletSize = 80; damage = 150; bulletColor = '#ffffff'; isWave = true; break;
        case 'laser_turret': bulletCount = 4; bulletSpeed = 28; bulletSize = 5; damage = 20; bulletColor = '#ff0000'; break;
        case 'rail_boomerang': bulletCount = 1; bulletSpeed = 22; bulletSize = 10; damage = 90; bulletColor = '#ffaa00'; break;
        case 'sonic_wave': bulletCount = 1; bulletSpeed = 15; bulletSize = 40; damage = 100; bulletColor = '#00ff00'; isWave = true; break;
        case 'prism_beam': bulletCount = 5; bulletSpeed = 22; bulletSize = 6; damage = 25; bulletColor = '#ff88ff'; break;
        case 'swarm_drone': bulletCount = 6; bulletSpeed = 12; bulletSize = 5; damage = 18; bulletColor = '#ffffaa'; isHoming = true; break;
        case 'vortex_trap': bulletSpeed = 3; bulletSize = 50; damage = 350; bulletColor = '#440088'; break;
        case 'neutron_pulse': bulletCount = 1; bulletSpeed = 10; bulletSize = 25; damage = 180; bulletColor = '#00ff88'; break;
        case 'helix_shot': bulletCount = 2; bulletSpeed = 20; bulletSize = 10; damage = 60; bulletColor = '#ff0088'; break;
        case 'starfall_missile': bulletCount = 3; bulletSpeed = 22; bulletSize = 12; damage = 80; bulletColor = '#ffff00'; isHoming = true; break;

        case 'void': bulletSpeed = 2; bulletSize = 40; damage = 150; bulletColor = '#000000'; break;
        case 'cluster': bulletSpeed = 10; bulletSize = 10; damage = 50; bulletColor = '#ff0000'; break;

        default: bulletSpeed = 12; bulletSize = 6; damage = 25;
      }
    }
    
    return { bulletCount, bulletSpeed, bulletSize, damage, bulletColor, isHoming, spreadFactor, isWave };
}