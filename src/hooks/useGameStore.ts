import { useState, useEffect, useRef } from 'react';

export interface Upgrade {
  id: string;
  name: string;
  cost: number;
  baseCost: number;
  count: number;
  multiplier: number;
  description: string;
  type: 'click' | 'idle' | 'percent';
}

export interface Reanimation {
  id: string;
  name: string;
  cost: number;
  baseCost: number;
  count: number;
  rate: number; // cells per second generated
  description: string;
  lore: string;
  ptsThreshold?: number; // Minimum Shinobi Points required to reanimate
}

export interface GameState {
  forbiddenCells: number;
  orochimaruTokens: number;
  totalTokensClaimed: number;
  combatHighScore: number;
  muteAudio: boolean;
  upgrades: Record<string, Upgrade>;
  reanimations: Record<string, Reanimation>;
  unlockedItems?: string[];
  // Daily PTS cap tracking
  dailyPtsEarned: number;
  dailyPtsDate: string; // ISO date string (YYYY-MM-DD UTC)
}

const DAILY_PTS_CAP = 200;

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

const DEFAULT_UPGRADES: Record<string, Upgrade> = {
  ryuchiCaveScroll: {
    id: 'ryuchiCaveScroll',
    name: 'Ryuchi Cave Scroll',
    cost: 15,
    baseCost: 15,
    count: 0,
    multiplier: 1,
    description: 'Increases click power by +1 cell per click.',
    type: 'click'
  },
  venomCentrifuge: {
    id: 'venomCentrifuge',
    name: 'Venom Centrifuge',
    cost: 100,
    baseCost: 100,
    count: 0,
    multiplier: 1, // cells/sec
    description: 'Automates cell extraction. Generates +1 cell/sec.',
    type: 'idle'
  },
  regenerationPod: {
    id: 'regenerationPod',
    name: 'Regeneration Pod',
    cost: 1100,
    baseCost: 1100,
    count: 0,
    multiplier: 8, // cells/sec
    description: 'Exponential DNA regeneration. Generates +8 cells/sec.',
    type: 'idle'
  },
  sharinganSpecimen: {
    id: 'sharinganSpecimen',
    name: 'Sharingan Specimen',
    cost: 12000,
    baseCost: 12000,
    count: 0,
    multiplier: 0.1, // +10% overall boost
    description: 'Forbidden study that boosts overall cell production by +10%.',
    type: 'percent'
  }
};

const DEFAULT_REANIMATIONS: Record<string, Reanimation> = {
  soundFour: {
    id: 'soundFour',
    name: 'Tayuya & Sound Four',
    cost: 5000,
    baseCost: 5000,
    count: 0,
    rate: 50,
    description: 'Summons Sound Four barrier and genjutsu experts.',
    lore: 'Four elite guards specializing in barriers and defensive seals.'
  },
  kimimaro: {
    id: 'kimimaro',
    name: 'Kimimaro Kaguya',
    cost: 45000,
    baseCost: 45000,
    count: 0,
    rate: 450,
    description: 'Awakens the Shikotsumyaku bone technique.',
    lore: 'Loyal user of the Curse Mark of Earth, wielding lethal bone spears.'
  },
  tobirama: {
    id: 'tobirama',
    name: 'Second Hokage (Tobirama)',
    cost: 350000,
    baseCost: 350000,
    count: 0,
    rate: 4000,
    description: 'Edo Tensei reanimation of the Water Style master.',
    lore: 'Inventor of Edo Tensei, utilizing sweeping tidal waves.',
    ptsThreshold: 500 // Requires 500 PTS minimum balance
  },
  hashirama: {
    id: 'hashirama',
    name: 'First Hokage (Hashirama)',
    cost: 3000000,
    baseCost: 3000000,
    count: 0,
    rate: 35000,
    description: 'Edo Tensei reanimation of the God of Shinobi.',
    lore: 'Wielder of Wood Release, generating endless natural energy.',
    ptsThreshold: 2000 // Requires 2,000 PTS minimum balance
  }
};

const SAVE_KEY = 'orochimaru_game_save_v1';

export function useGameStore() {
  const [state, setState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const today = getTodayUTC();
        // Reset daily cap if it's a new day
        const savedDate = parsed.dailyPtsDate ?? '';
        const dailyPtsEarned = savedDate === today ? (parsed.dailyPtsEarned ?? 0) : 0;
        return {
          forbiddenCells: parsed.forbiddenCells ?? 0,
          orochimaruTokens: parsed.orochimaruTokens ?? 0,
          totalTokensClaimed: parsed.totalTokensClaimed ?? 0,
          combatHighScore: parsed.combatHighScore ?? 0,
          muteAudio: parsed.muteAudio ?? false,
          upgrades: { ...DEFAULT_UPGRADES, ...parsed.upgrades },
          reanimations: {
            ...DEFAULT_REANIMATIONS,
            ...parsed.reanimations,
            // Always ensure ptsThreshold is set from defaults
            tobirama: { ...DEFAULT_REANIMATIONS.tobirama, ...(parsed.reanimations?.tobirama ?? {}), ptsThreshold: 500 },
            hashirama: { ...DEFAULT_REANIMATIONS.hashirama, ...(parsed.reanimations?.hashirama ?? {}), ptsThreshold: 2000 }
          },
          unlockedItems: parsed.unlockedItems ?? [],
          dailyPtsEarned,
          dailyPtsDate: today
        };
      }
    } catch (e) {
      console.error('Failed to load save state:', e);
    }
    return {
      forbiddenCells: 0,
      orochimaruTokens: 0,
      totalTokensClaimed: 0,
      combatHighScore: 0,
      muteAudio: false,
      upgrades: DEFAULT_UPGRADES,
      reanimations: DEFAULT_REANIMATIONS,
      unlockedItems: [],
      dailyPtsEarned: 0,
      dailyPtsDate: getTodayUTC()
    };
  });

  const [currentView, setCurrentView] = useState<'hub' | 'game1' | 'game2_mobile' | 'game2_web' | 'leaderboard' | 'cave_trials'>('hub');
  const [activeTab, setActiveTab] = useState<'lab' | 'altar' | 'combat'>('lab');

  // Keep a ref to bypass stale state in timer callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }, [state]);

  // Midnight UTC reset: check if day has rolled over
  useEffect(() => {
    const checkDayReset = () => {
      const today = getTodayUTC();
      setState(prev => {
        if (prev.dailyPtsDate !== today) {
          return { ...prev, dailyPtsDate: today, dailyPtsEarned: 0 };
        }
        return prev;
      });
    };
    // Check every minute
    const interval = setInterval(checkDayReset, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Clicker Action: Gain cells
  const clickCurseMark = (multiplier: number = 1) => {
    const clickPower = getClickPower();
    setState(prev => ({
      ...prev,
      forbiddenCells: prev.forbiddenCells + clickPower * multiplier
    }));
    return clickPower * multiplier;
  };

  // Convert Cells to Tokens (Shinobi Points)
  // Rate: 1 PTS = 10,000 cells. Enforces 200 PTS/day cap.
  const convertCellsToTokens = (): number | false => {
    const rate = 10000;
    const cells = state.forbiddenCells;
    if (cells < rate) return false;

    const today = getTodayUTC();
    const currentDailyEarned = state.dailyPtsDate === today ? state.dailyPtsEarned : 0;
    const remainingToday = DAILY_PTS_CAP - currentDailyEarned;

    if (remainingToday <= 0) return false; // Daily cap already hit

    const maxTokens = Math.floor(cells / rate);
    const tokensToGain = Math.min(maxTokens, remainingToday);
    if (tokensToGain <= 0) return false;

    const cellsToDeduct = tokensToGain * rate;

    setState(prev => ({
      ...prev,
      forbiddenCells: prev.forbiddenCells - cellsToDeduct,
      orochimaruTokens: prev.orochimaruTokens + tokensToGain,
      totalTokensClaimed: prev.totalTokensClaimed + tokensToGain,
      dailyPtsEarned: (prev.dailyPtsDate === today ? prev.dailyPtsEarned : 0) + tokensToGain,
      dailyPtsDate: today
    }));
    return tokensToGain;
  };

  const getClickPower = () => {
    const scrollCount = state.upgrades.ryuchiCaveScroll.count;
    return 1 + scrollCount * 1;
  };

  const getPassiveRate = () => {
    let baseRate = 0;
    // Upgrade passive income
    baseRate += state.upgrades.venomCentrifuge.count * state.upgrades.venomCentrifuge.multiplier;
    baseRate += state.upgrades.regenerationPod.count * state.upgrades.regenerationPod.multiplier;

    // Reanimation passive income
    Object.values(state.reanimations).forEach(re => {
      baseRate += re.count * re.rate;
    });

    // Sharingan boost (+10% per sharingan specimen)
    const sharinganCount = state.upgrades.sharinganSpecimen.count;
    const multiplier = 1 + sharinganCount * 0.1;

    return Math.round(baseRate * multiplier * 100) / 100;
  };

  // Upgrades buying logic
  const buyUpgrade = (id: string) => {
    const upgrade = state.upgrades[id];
    if (!upgrade) return false;

    if (state.forbiddenCells >= upgrade.cost) {
      setState(prev => {
        const nextUpgrades = { ...prev.upgrades };
        const u = { ...nextUpgrades[id] };
        
        const costPaid = u.cost;
        u.count += 1;
        // Exponential price scaling: 1.15x per level
        u.cost = Math.ceil(u.baseCost * Math.pow(1.15, u.count));
        nextUpgrades[id] = u;

        return {
          ...prev,
          forbiddenCells: prev.forbiddenCells - costPaid,
          upgrades: nextUpgrades
        };
      });
      return true;
    }
    return false;
  };

  // Reanimations buying logic — with DNA cost AND optional PTS threshold
  const buyReanimation = (id: string): boolean | 'pts_locked' => {
    const reanim = state.reanimations[id];
    if (!reanim) return false;

    // Check PTS threshold gate first
    if (reanim.ptsThreshold && state.orochimaruTokens < reanim.ptsThreshold) {
      return 'pts_locked';
    }

    if (state.forbiddenCells >= reanim.cost) {
      setState(prev => {
        const nextReanim = { ...prev.reanimations };
        const r = { ...nextReanim[id] };

        const costPaid = r.cost;
        r.count += 1;
        // Exponential price scaling: 1.25x per reanimation
        r.cost = Math.ceil(r.baseCost * Math.pow(1.25, r.count));
        nextReanim[id] = r;

        return {
          ...prev,
          forbiddenCells: prev.forbiddenCells - costPaid,
          reanimations: nextReanim
        };
      });
      return true;
    }
    return false;
  };

  // Add Shinobi Points directly (e.g. from Ryuchi Cave) — enforces daily cap
  const addTokens = (amount: number) => {
    if (amount <= 0) return;
    const today = getTodayUTC();
    setState(prev => {
      const currentDailyEarned = prev.dailyPtsDate === today ? prev.dailyPtsEarned : 0;
      const remainingToday = DAILY_PTS_CAP - currentDailyEarned;
      const cappedAmount = Math.min(amount, Math.max(remainingToday, 0));
      if (cappedAmount <= 0) return prev;
      return {
        ...prev,
        orochimaruTokens: prev.orochimaruTokens + cappedAmount,
        totalTokensClaimed: prev.totalTokensClaimed + cappedAmount,
        dailyPtsEarned: currentDailyEarned + cappedAmount,
        dailyPtsDate: today
      };
    });
  };

  // Update combat highscore
  const updateCombatHighScore = (wave: number) => {
    if (wave > state.combatHighScore) {
      setState(prev => ({
        ...prev,
        combatHighScore: wave
      }));
      return true;
    }
    return false;
  };

  // Toggle Mute state
  const toggleMute = () => {
    setState(prev => ({
      ...prev,
      muteAudio: !prev.muteAudio
    }));
  };

  // Reset Game progress
  const resetGame = () => {
    if (window.confirm("Reset your forbidden research? This clears all DNA, Upgrades, Reanimations, and Shinobi Points (including daily cap counter).")) {
      const today = getTodayUTC();
      setState({
        forbiddenCells: 0,
        orochimaruTokens: 0,
        totalTokensClaimed: 0,
        combatHighScore: 0,
        muteAudio: false,
        upgrades: DEFAULT_UPGRADES,
        reanimations: DEFAULT_REANIMATIONS,
        unlockedItems: [],
        dailyPtsEarned: 0,
        dailyPtsDate: today
      });
      setCurrentView('hub');
      setActiveTab('lab');
    }
  };

  const unlockItem = (itemId: string, cost: number): boolean => {
    if (state.orochimaruTokens >= cost) {
      const currentUnlocked = state.unlockedItems ?? [];
      if (currentUnlocked.includes(itemId)) return true;

      setState(prev => ({
        ...prev,
        orochimaruTokens: prev.orochimaruTokens - cost,
        unlockedItems: [...(prev.unlockedItems ?? []), itemId]
      }));
      return true;
    }
    return false;
  };

  // Idle income game loop (runs every 100ms)
  useEffect(() => {
    const timer = setInterval(() => {
      const rate = getPassiveRate();
      if (rate > 0) {
        // Since we update every 100ms, add 0.1 of rate
        setState(prev => ({
          ...prev,
          forbiddenCells: prev.forbiddenCells + rate / 10
        }));
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  // Computed daily cap values
  const today = getTodayUTC();
  const dailyPtsEarned = state.dailyPtsDate === today ? state.dailyPtsEarned : 0;
  const dailyPtsRemaining = Math.max(DAILY_PTS_CAP - dailyPtsEarned, 0);

  return {
    forbiddenCells: state.forbiddenCells,
    orochimaruTokens: state.orochimaruTokens,
    totalTokensClaimed: state.totalTokensClaimed,
    combatHighScore: state.combatHighScore,
    muteAudio: state.muteAudio,
    upgrades: state.upgrades,
    reanimations: state.reanimations,
    currentView,
    activeTab,
    setCurrentView,
    setActiveTab,
    clickCurseMark,
    buyUpgrade,
    buyReanimation,
    convertCellsToTokens,
    addTokens,
    updateCombatHighScore,
    toggleMute,
    resetGame,
    clickPower: getClickPower(),
    passiveRate: getPassiveRate(),
    unlockedItems: state.unlockedItems ?? [],
    unlockItem,
    dailyPtsEarned,
    dailyPtsRemaining,
    dailyPtsCap: DAILY_PTS_CAP
  };
}
