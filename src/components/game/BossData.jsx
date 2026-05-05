export const getBossData = (milestone) => {
  const bosses = [
    { 
      id: "xeno_scout",
      name: "XENO SCOUT", 
      color: "#888888", 
      accent: "#00ff00", 
      shape: "chaos", 
      speedMult: 0.8, 
      healthMult: 1.0, 
      attackType: "fast", 
      imageUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/apiClient-prod/public/694dcf52424442d80ec772f0/6b9394efa_boss-001.png" 
    },
    { 
      id: "cerebral_drone",
      name: "CEREBRAL DRONE", 
      color: "#aa00aa", 
      accent: "#ff00ff", 
      shape: "circle", 
      speedMult: 0.9, 
      healthMult: 1.0, 
      attackType: "magic", 
      imageUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/apiClient-prod/public/694dcf52424442d80ec772f0/e0c99bed4_boss-002.png" 
    },
    { 
      id: "void_walker",
      name: "VOID WALKER", 
      color: "#004444", 
      accent: "#00ffff", 
      shape: "triangle", 
      speedMult: 1.2, 
      healthMult: 1.5, 
      attackType: "tech", 
      imageUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/apiClient-prod/public/694dcf52424442d80ec772f0/558b49c76_boss-003.png" 
    },
    { 
      id: "hive_commander",
      name: "HIVE COMMANDER", 
      color: "#444444", 
      accent: "#ffaa00", 
      shape: "square", 
      speedMult: 0.9, 
      healthMult: 1.8, 
      attackType: "heavy", 
      imageUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/apiClient-prod/public/694dcf52424442d80ec772f0/563505357_end-boss-01.png" 
    },
    { 
      id: "neural_overmind",
      name: "NEURAL OVERMIND", 
      color: "#00ff00", 
      accent: "#ffffff", 
      shape: "circle", 
      speedMult: 1.1, 
      healthMult: 2.2, 
      attackType: "orbital", 
      imageUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/apiClient-prod/public/694dcf52424442d80ec772f0/8f338e235_end-boss-02.png" 
    },
    { 
      id: "cyber_lich",
      name: "CYBER LICH", 
      color: "#004400", 
      accent: "#00ff00", 
      shape: "square", 
      speedMult: 1.3, 
      healthMult: 2.6, 
      attackType: "tech", 
      imageUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/apiClient-prod/public/694dcf52424442d80ec772f0/boss-006-cyber-lich.png" 
    },
    { 
      id: "solar_guardian",
      name: "SOLAR GUARDIAN", 
      color: "#aa6600", 
      accent: "#ffd700", 
      shape: "circle", 
      speedMult: 1.2, 
      healthMult: 3.0, 
      attackType: "fire", 
      imageUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/apiClient-prod/public/694dcf52424442d80ec772f0/boss-007-solar-guardian.png" 
    },
    { 
      id: "nebula_stalker",
      name: "NEBULA STALKER", 
      color: "#2e004f", 
      accent: "#8a2be2", 
      shape: "star", 
      speedMult: 1.4, 
      healthMult: 3.5, 
      attackType: "void", 
      imageUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/apiClient-prod/public/694dcf52424442d80ec772f0/boss-008-nebula-stalker.png" 
    },
    { 
      id: "quantum_brain",
      name: "QUANTUM BRAIN", 
      color: "#004488", 
      accent: "#00ffff", 
      shape: "chaos", 
      speedMult: 1.0, 
      healthMult: 4.0, 
      attackType: "quantum", 
      imageUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/apiClient-prod/public/694dcf52424442d80ec772f0/boss-009-quantum-brain.png" 
    },
    { 
      id: "the_omniscient",
      name: "THE OMNISCIENT", 
      color: "#aaff00", 
      accent: "#ff00ff", 
      shape: "chaos", 
      speedMult: 1.5, 
      healthMult: 5.0, 
      attackType: "chaos", 
      imageUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/apiClient-prod/public/694dcf52424442d80ec772f0/899e99b26_end-boss-03.png" 
    }
  ];
  // ID Lookup override
  if (typeof milestone === 'string') {
     if (!isNaN(Number(milestone))) {
         milestone = Number(milestone);
     } else {
         // Legacy mapping
         const map = {
           'mothership': 'hive_commander',
           'dreadnought': 'void_walker',
           'swarm_queen': 'cerebral_drone',
           'void_titan': 'neural_overmind'
         };
         const searchId = map[milestone] || milestone;
         const found = bosses.find(b => b.id === searchId);
         if (found) return { ...found, level: 1 };
         
         // Fallback if string ID not found - default to first boss
         console.warn(`Boss ID "${milestone}" not found, defaulting to Xeno Scout`);
         return { ...bosses[0], level: 1 };
     }
  }

  // Cycle through bosses (ensure milestone is a number)
  const numericMilestone = typeof milestone === 'number' ? milestone : 1;
  const index = Math.max(0, (numericMilestone - 1)) % bosses.length;
  return { ...bosses[index] || bosses[0], level: Math.ceil(numericMilestone / 10) };
};
