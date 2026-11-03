import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Header } from './components/Header';
import { FreshnessBanner } from './components/FreshnessBanner';
import { HeroNextContest } from './components/HeroNextContest';
import { FilterBar } from './components/FilterBar';
import { ContestCard } from './components/ContestCard';
import { ContestCalendar } from './components/ContestCalendar';
import { EmptyState } from './components/EmptyState';
import { useTheme } from './hooks/useTheme';
import { useTimezone } from './hooks/useTimezone';
import { useCompletedContests } from './hooks/useCompletedContests';
import { fetchContests, fetchNextContest, fetchPlatformStatuses, triggerAdminRefresh } from './services/api';
import { Contest, PlatformId, ContestStatus, PlatformStatus } from './types/contest';

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { timezone, setTimezone, commonTimezones } = useTimezone();
  const { isCompleted, toggleComplete, clearAllCompleted } = useCompletedContests();

  const [contests, setContests] = useState<Contest[]>([]);
  const [nextContest, setNextContest] = useState<Contest | null>(null);
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ContestStatus | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');

  // Load contest and status data
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [contestsRes, nextRes, statusesRes] = await Promise.all([
        fetchContests({ limit: 150, status: 'all', sort: 'start_time_asc' }),
        fetchNextContest().catch(() => null),
        fetchPlatformStatuses().catch(() => []),
      ]);

      setContests(contestsRes.items || []);
      setNextContest(nextRes);
      setPlatformStatuses(statusesRes || []);
    } catch (err: any) {
      console.error('Error fetching calendar data:', err);
      setError(err?.message || 'Failed to load contest schedule from backend.');
    } finally {
      setIsLoading(false);
      (window as any).__DATA_LOADED__ = true;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle manual refresh
  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      await triggerAdminRefresh();
      await loadData();
    } catch (err: any) {
      console.error('Manual refresh failed:', err);
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Unique contest completion statistics
  const completionStats = useMemo(() => {
    const uniqueContestMap = new Map<string, Contest>();
    contests.forEach((c) => {
      if (!uniqueContestMap.has(c.id)) {
        uniqueContestMap.set(c.id, c);
      }
    });

    const uniqueList = Array.from(uniqueContestMap.values());
    const total = uniqueList.length;
    const completed = uniqueList.filter((c) => isCompleted(c.id)).length;
    return { completed, total };
  }, [contests, isCompleted]);

  // Effective next upcoming contest (skips user-completed contests)
  const effectiveNextContest = useMemo(() => {
    if (nextContest && !isCompleted(nextContest.id)) {
      return nextContest;
    }
    const candidate = contests
      .filter((c) => (c.status === 'upcoming' || c.status === 'ongoing') && !isCompleted(c.id))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
    return candidate || null;
  }, [nextContest, contests, isCompleted]);

  // Platform contest counts for filters based on selected status and completions
  const counts = useMemo(() => {
    let all = 0;
    let leetcode = 0;
    let codechef = 0;
    let codeforces = 0;

    contests.forEach((c) => {
      let statusMatches = false;
      if (selectedStatus === 'all') {
        statusMatches = true;
      } else if (selectedStatus === 'completed') {
        statusMatches = isCompleted(c.id) || c.status === 'completed';
      } else if (selectedStatus === 'upcoming') {
        statusMatches = (c.status === 'upcoming' || c.status === 'ongoing') && !isCompleted(c.id);
      } else {
        statusMatches = c.status === selectedStatus && !isCompleted(c.id);
      }

      if (statusMatches) {
        all++;
        if (c.platform === 'leetcode') leetcode++;
        if (c.platform === 'codechef') codechef++;
        if (c.platform === 'codeforces') codeforces++;
      }
    });

    return { all, leetcode, codechef, codeforces };
  }, [contests, selectedStatus, isCompleted]);

  // Filtered contests based on platform, status, and search query
  const filteredContests = useMemo(() => {
    return contests.filter((c) => {
      if (selectedPlatform !== 'all' && c.platform !== selectedPlatform) {
        return false;
      }

      if (selectedStatus === 'upcoming') {
        if (isCompleted(c.id) || c.status === 'completed') {
          return false;
        }
      } else if (selectedStatus === 'completed') {
        if (!isCompleted(c.id) && c.status !== 'completed') {
          return false;
        }
      } else if (selectedStatus !== 'all') {
        if (c.status !== selectedStatus) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesPlatform = c.platform.toLowerCase().includes(query);
        if (!matchesName && !matchesPlatform) {
          return false;
        }
      }
      return true;
    });
  }, [contests, selectedPlatform, selectedStatus, searchQuery, isCompleted]);

  const completionPercent = completionStats.total > 0
    ? Math.round((completionStats.completed / completionStats.total) * 100)
    : 0;

  // Total contests accessible under Completed filter (user-completed OR naturally concluded)
  const completedFilterCount = useMemo(() => {
    return contests.filter((c) => isCompleted(c.id) || c.status === 'completed').length;
  }, [contests, isCompleted]);

  return (
    <div className="app-root">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        timezone={timezone}
        onTimezoneChange={setTimezone}
        timezones={commonTimezones}
      />

      <main className="container main-content-wrap">
        {/* Page Introduction & Schedule Summary */}
        <section className="editorial-intro">
          <div className="intro-main">
            <h1 className="page-title">Contest Schedule</h1>
            <p className="page-subtitle">
              Unified competitive programming calendar tracking <span className="highlight mono">{contests.length}</span> contests across LeetCode, CodeChef, and Codeforces.
            </p>
          </div>
          {/* Compact Synchronization Status Line */}
          <FreshnessBanner
            statuses={platformStatuses}
            isRefreshing={isRefreshing}
            onRefresh={handleManualRefresh}
            timezone={timezone}
          />
        </section>

        {/* Hero: Next Upcoming Contest Focal Area */}
        {effectiveNextContest && selectedStatus !== 'completed' && (
          <HeroNextContest contest={effectiveNextContest} timezone={timezone} />
        )}

        {/* Filter Toolbar */}
        <FilterBar
          selectedPlatform={selectedPlatform}
          onSelectPlatform={setSelectedPlatform}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeView={activeView}
          onViewChange={setActiveView}
          counts={counts}
          completedCount={completedFilterCount}
        />

        {/* Compact Completion Progress Element */}
        <div className="completion-progress-line" role="status" aria-label="Contest completion progress">
          <div className="progress-info-group">
            <CheckCircle2 size={13} className="progress-status-icon" aria-hidden="true" />
            <span className="progress-counter-text" data-testid="completion-counter">
              Completed: <span className="mono">{completionStats.completed}</span> of <span className="mono">{completionStats.total}</span> contests
            </span>
            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-fill"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="progress-percentage mono">{completionPercent}%</span>
          </div>

          {completionStats.completed > 0 && (
            <button
              type="button"
              className="progress-reset-btn"
              onClick={clearAllCompleted}
              title="Reset all completed marks"
              data-testid="completion-clear-btn"
            >
              Reset completions
            </button>
          )}
        </div>

        {/* Content View: List or Calendar */}
        {isLoading ? (
          <div className="contest-table-feed">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="feed-skeleton-row" />
            ))}
          </div>
        ) : error && contests.length === 0 ? (
          <EmptyState type="error" message={error} onRetry={loadData} />
        ) : filteredContests.length === 0 ? (
          <EmptyState
            type={searchQuery.trim() ? 'no-results' : 'no-contests'}
            message={
              searchQuery.trim()
                ? `No contests matching "${searchQuery}".`
                : `No ${selectedStatus} contests found for ${selectedPlatform === 'all' ? 'any platform' : selectedPlatform}.`
            }
          />
        ) : activeView === 'calendar' ? (
          <ContestCalendar
            contests={filteredContests}
            timezone={timezone}
            isCompleted={isCompleted}
            onToggleComplete={toggleComplete}
          />
        ) : (
          <div className="contest-table-feed" role="feed" aria-label="Contest schedule list">
            {filteredContests.map((c) => (
              <ContestCard
                key={c.id}
                contest={c}
                timezone={timezone}
                isCompleted={isCompleted(c.id)}
                onToggleComplete={toggleComplete}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="container footer-content">
          <p>
            ContestCal &bull; Developer Competitive Programming Calendar &bull; Automated Real-time Schedule Ingestion
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
