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

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  kills: number;
  waves: number;
  platform: 'web' | 'mobile';
  timestamp: number;
}

interface LeaderboardViewProps {
  onExit: () => void;
}

export function LeaderboardView({ onExit }: LeaderboardViewProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'web' | 'mobile'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load entries from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('orochimaru_leaderboard');
      if (saved) {
        setEntries(JSON.parse(saved));
      } else {
        // Populate default mock data if empty to show styling
        const mockData: LeaderboardEntry[] = [
          { id: '1', name: 'Kabuto_Yakushi', score: 75000, kills: 142, waves: 6, platform: 'web', timestamp: Date.now() - 3600000 * 2 },
          { id: '2', name: 'Kimimaro_K', score: 62000, kills: 118, waves: 5, platform: 'mobile', timestamp: Date.now() - 3600000 * 5 },
          { id: '3', name: 'Sasuke_Uchiha', score: 58000, kills: 105, waves: 5, platform: 'web', timestamp: Date.now() - 3600000 * 12 },
          { id: '4', name: 'Tayuya_Flute', score: 32000, kills: 64, waves: 3, platform: 'mobile', timestamp: Date.now() - 3600000 * 24 },
          { id: '5', name: 'Sakon_Ukon', score: 28000, kills: 58, waves: 3, platform: 'web', timestamp: Date.now() - 3600000 * 48 }
        ];
        localStorage.setItem('orochimaru_leaderboard', JSON.stringify(mockData));
        setEntries(mockData);
      }
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    }
  }, []);

  const handleClearLeaderboard = () => {
    if (window.confirm("Are you sure you want to clear all rankings in the scroll? This cannot be undone.")) {
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
      const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesPlatform && matchesSearch;
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
            placeholder="Search shinobi name..."
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
                
                return (
                  <div key={entry.id || index} className={`table-row ${rankClass}`}>
                    <span className="col-rank">
                      {isTop3 ? '🏆' : index + 1}
                    </span>
                    <span className="col-player font-heading">
                      {entry.name}
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
