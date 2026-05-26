import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Monitor, 
  Smartphone, 
  Home, 
  Trash2, 
  Search,
  Calendar
} from 'lucide-react';
import { synth } from '../audio/SynthManager';
import { supabase } from '../lib/supabaseClient';

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  kills: number;
  waves: number;
  platform: 'web' | 'mobile';
  timestamp: number;
  email?: string;
  walletAddress?: string;
  country?: string;
}

const COUNTRY_MAP: Record<string, { flag: string; label: string }> = {
  US: { flag: '🇺🇸', label: 'USA' },
  GB: { flag: '🇬🇧', label: 'UK' },
  CA: { flag: '🇨🇦', label: 'CAN' },
  AU: { flag: '🇦🇺', label: 'AUS' },
  DE: { flag: '🇩🇪', label: 'GER' },
  FR: { flag: '🇫🇷', label: 'FRA' },
  JP: { flag: '🇯🇵', label: 'JPN' },
  IN: { flag: '🇮🇳', label: 'IND' },
  CN: { flag: '🇨🇳', label: 'CHN' },
  BR: { flag: '🇧🇷', label: 'BRA' },
  ZA: { flag: '🇿🇦', label: 'RSA' },
  NG: { flag: '🇳🇬', label: 'NGA' },
  ES: { flag: '🇪🇸', label: 'ESP' },
  IT: { flag: '🇮🇹', label: 'ITA' },
  NL: { flag: '🇳🇱', label: 'NED' },
  SG: { flag: '🇸🇬', label: 'SGP' },
  CH: { flag: '🇨🇭', label: 'SUI' },
  SE: { flag: '🇸🇪', label: 'SWE' },
  MX: { flag: '🇲🇽', label: 'MEX' },
  RU: { flag: '🇷🇺', label: 'RUS' },
  KR: { flag: '🇰🇷', label: 'KOR' },
  OTHER: { flag: '🌍', label: 'GLO' }
};

function formatCountry(code: string | undefined): string {
  if (!code) return '🌍 GLO';
  const match = COUNTRY_MAP[code.toUpperCase()];
  return match ? `${match.flag} ${match.label}` : `🌍 ${code}`;
}

function obfuscateEmail(email: string | undefined): string {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) return `***@${domain}`;
  return `${local.substring(0, 2)}***@${domain}`;
}

function formatWallet(address: string | undefined): string {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

interface LeaderboardViewProps {
  onExit: () => void;
}

export function LeaderboardView({ onExit }: LeaderboardViewProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'web' | 'mobile'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load entries from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from('leaderboard')
          .select('*')
          .order('score', { ascending: false })
          .limit(100);

        if (error) throw error;

        if (data && data.length > 0) {
          // Map database snake_case columns to camelCase properties
          const mapped: LeaderboardEntry[] = data.map(item => ({
            id: item.id,
            name: item.name,
            score: item.score,
            kills: item.kills,
            waves: item.waves,
            platform: item.platform as 'web' | 'mobile',
            timestamp: new Date(item.created_at).getTime(),
            email: item.email,
            walletAddress: item.wallet_address,
            country: item.country
          }));
          setEntries(mapped);
          localStorage.setItem('orochimaru_leaderboard', JSON.stringify(mapped));
        } else {
          // Populate default mock data if database is empty
          const mockData: LeaderboardEntry[] = [
            { id: '1', name: 'Kabuto_Yakushi', score: 75000, kills: 142, waves: 6, platform: 'web', timestamp: Date.now() - 3600000 * 2, email: 'kabuto@orochimaru.org', walletAddress: '0x71C229712aB297a7e8e50bB41A284E29037c89E1', country: 'JP' },
            { id: '2', name: 'Kimimaro_K', score: 62000, kills: 118, waves: 5, platform: 'mobile', timestamp: Date.now() - 3600000 * 5, email: 'kimimaro@kaguya.net', walletAddress: '0x3aC9e28e8e89E197a7e8e50bB41A284E29037c89e5', country: 'CN' },
            { id: '3', name: 'Sasuke_Uchiha', score: 58000, kills: 105, waves: 5, platform: 'web', timestamp: Date.now() - 3600000 * 12, email: 'sasuke@uchiha.com', walletAddress: '0x8bD15A412aB297a7e8e50bB41A284E29037c89E1', country: 'JP' },
            { id: '4', name: 'Tayuya_Flute', score: 32000, kills: 64, waves: 3, platform: 'mobile', timestamp: Date.now() - 3600000 * 24, email: 'tayuya@sound4.org', walletAddress: '0xF6b46Cd12aB297a7e8e50bB41A284E29037c89E1', country: 'DE' },
            { id: '5', name: 'Sakon_Ukon', score: 28000, kills: 58, waves: 3, platform: 'web', timestamp: Date.now() - 3600000 * 48, email: 'sakon@sound4.org', walletAddress: '0x9e2079512aB297a7e8e50bB41A284E29037c89E1', country: 'IT' }
          ];

          // Asynchronously attempt to seed database so it is ready
          for (const item of mockData) {
            await supabase.from('leaderboard').insert({
              name: item.name,
              score: item.score,
              kills: item.kills,
              waves: item.waves,
              platform: item.platform,
              email: item.email || '',
              wallet_address: item.walletAddress || '',
              country: item.country || 'US'
            });
          }

          setEntries(mockData);
          localStorage.setItem('orochimaru_leaderboard', JSON.stringify(mockData));
        }
      } catch (err) {
        console.warn('Failed to load from Supabase, loading localStorage cache:', err);
        const saved = localStorage.getItem('orochimaru_leaderboard');
        if (saved) {
          setEntries(JSON.parse(saved));
        }
      }
    }
    loadData();
  }, []);

  const handleClearLeaderboard = () => {
    if (window.confirm("Are you sure you want to clear your local scroll view? (Note: Global database records are protected and cannot be deleted by public clients).")) {
      synth.playSnake();
      localStorage.removeItem('orochimaru_leaderboard');
      setEntries([]);
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'web' | 'mobile') => {
    synth.playClick();
    setFilter(newFilter);
  };

  const handleExit = () => {
    synth.playClick();
    onExit();
  };

  // Filter & sort entries
  const filteredEntries = entries
    .filter(e => {
      const matchesPlatform = filter === 'all' || e.platform === filter;
      
      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchesPlatform;

      const nameMatch = e.name.toLowerCase().includes(term);
      const emailMatch = e.email ? e.email.toLowerCase().includes(term) : false;
      const walletMatch = e.walletAddress ? e.walletAddress.toLowerCase().includes(term) : false;
      const countryMatch = e.country ? e.country.toLowerCase().includes(term) : false;

      return matchesPlatform && (nameMatch || emailMatch || walletMatch || countryMatch);
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 50); // limit to top 50

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="leaderboard-container">
      {/* Header bar */}
      <header className="leaderboard-header">
        <button onClick={handleExit} className="nav-home-btn" title="Back to Hub">
          <Home size={18} />
        </button>
        <div className="leaderboard-title-area">
          <span className="leaderboard-subtitle">SHARED DATABASE</span>
          <h2 className="leaderboard-title">SHINOBI RANKINGS</h2>
        </div>
        <button 
          onClick={handleClearLeaderboard} 
          className="clear-leaderboard-btn text-muted"
          title="Clear Scroll"
        >
          <Trash2 size={16} />
        </button>
      </header>

      {/* Stats Summary Area */}
      <div className="leaderboard-meta">
        <div className="meta-card">
          <Trophy size={16} className="text-gold" />
          <div className="meta-info">
            <span>Scroll Champion</span>
            <strong>{entries.length > 0 ? [...entries].sort((a, b) => b.score - a.score)[0].name : 'None'}</strong>
          </div>
        </div>
        <div className="meta-card">
          <Monitor size={16} className="text-green" />
          <div className="meta-info">
            <span>Total Simulated Runs</span>
            <strong>{entries.length}</strong>
          </div>
        </div>
      </div>

      {/* Filter and search controls */}
      <div className="leaderboard-controls">
        <div className="search-box">
          <Search size={14} className="search-icon text-muted" />
          <input
            type="text"
            placeholder="Search name, country, wallet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button
            onClick={() => handleFilterChange('all')}
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          >
            ALL
          </button>
          <button
            onClick={() => handleFilterChange('web')}
            className={`filter-tab ${filter === 'web' ? 'active' : ''}`}
          >
            🖥️ WEB
          </button>
          <button
            onClick={() => handleFilterChange('mobile')}
            className={`filter-tab ${filter === 'mobile' ? 'active' : ''}`}
          >
            📱 MOBILE
          </button>
        </div>
      </div>

      {/* Rankings List */}
      <div className="leaderboard-scroll-area">
        {filteredEntries.length === 0 ? (
          <div className="empty-leaderboard">
            <Trophy size={36} className="text-muted mb-2 opacity-50" />
            <p>No records found matching search or filter criteria.</p>
          </div>
        ) : (
          <div className="leaderboard-table">
            <div className="table-header-row">
              <span className="col-rank">RK</span>
              <span className="col-player">SHINOBI</span>
              <span className="col-country">COUNTRY</span>
              <span className="col-wallet">ETH WALLET</span>
              <span className="col-score">SCORE</span>
              <span className="col-kills">KILLS</span>
              <span className="col-waves">WAVES</span>
              <span className="col-platform">PLAT</span>
              <span className="col-date">DATE</span>
            </div>

            <div className="table-body">
              {filteredEntries.map((entry, index) => {
                const isTop3 = index < 3;
                const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
                const displayEmail = obfuscateEmail(entry.email);
                
                return (
                  <div key={entry.id || index} className={`table-row ${rankClass}`}>
                    <span className="col-rank">
                      {isTop3 ? '🏆' : index + 1}
                    </span>
                    <span className="col-player font-heading">
                      <div className="player-name-text">{entry.name}</div>
                      {displayEmail && <div className="col-email-sub">{displayEmail}</div>}
                    </span>
                    <span className="col-country font-heading">
                      {formatCountry(entry.country)}
                    </span>
                    <span className="col-wallet">
                      {entry.walletAddress ? (
                        <span className="wallet-badge" title={entry.walletAddress}>
                          {formatWallet(entry.walletAddress)}
                        </span>
                      ) : (
                        <span className="text-muted opacity-50">—</span>
                      )}
                    </span>
                    <span className="col-score text-gold">
                      {entry.score.toLocaleString()}
                    </span>
                    <span className="col-kills text-red">
                      {entry.kills}
                    </span>
                    <span className="col-waves text-purple">
                      W{entry.waves}
                    </span>
                    <span className="col-platform">
                      {entry.platform === 'web' ? (
                        <span className="platform-icon-badge web" title="Web / Desktop">
                          <Monitor size={10} />
                          <span>WEB</span>
                        </span>
                      ) : (
                        <span className="platform-icon-badge mobile" title="Mobile / Touch">
                          <Smartphone size={10} />
                          <span>MOB</span>
                        </span>
                      )}
                    </span>
                    <span className="col-date text-muted">
                      <Calendar size={10} />
                      <span>{formatDate(entry.timestamp)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <footer className="leaderboard-footer">
        <button onClick={handleExit} className="back-hub-btn">
          RETURN TO MAIN HUB
        </button>
      </footer>
    </div>
  );
}

export default LeaderboardView;
