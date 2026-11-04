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
import { getContestLiveStatus, LiveStatus } from './utils/date';

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

  // Real-time ticking clock for dynamic live/upcoming/expired transitions
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const handleVisibility = () => {
      if (!document.hidden) {
        setCurrentTime(new Date());
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

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

  // Contests currently LIVE (ongoing) and not user-completed
  const liveContests = useMemo(() => {
    return contests
      .filter((c) => {
        const liveStatus = getContestLiveStatus(c.start_time, c.end_time, currentTime, c.duration_seconds);
        return liveStatus === 'live' && !isCompleted(c.id);
      })
      .sort((a, b) => {
        const endA = a.end_time ? new Date(a.end_time).getTime() : new Date(a.start_time).getTime() + a.duration_seconds * 1000;
        const endB = b.end_time ? new Date(b.end_time).getTime() : new Date(b.start_time).getTime() + b.duration_seconds * 1000;
        return endA - endB;
      });
  }, [contests, isCompleted, currentTime]);

  // Immediate next upcoming future contest (start_time > now, not user-completed)
  // Expired contests are strictly rejected here.
  const upNextContest = useMemo(() => {
    const upcomingCandidates = contests
      .filter((c) => {
        const liveStatus = getContestLiveStatus(c.start_time, c.end_time, currentTime, c.duration_seconds);
        return liveStatus === 'upcoming' && !isCompleted(c.id);
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (upcomingCandidates.length > 0) {
      return upcomingCandidates[0];
    }

    // Fallback to backend nextContest only if verified upcoming
    if (nextContest && !isCompleted(nextContest.id)) {
      const liveStatus = getContestLiveStatus(
        nextContest.start_time,
        nextContest.end_time,
        currentTime,
        nextContest.duration_seconds
      );
      if (liveStatus === 'upcoming') {
        return nextContest;
      }
    }

    return null;
  }, [contests, nextContest, isCompleted, currentTime]);

  // Platform contest counts for filters based on selected status and completions
  const counts = useMemo(() => {
    let all = 0;
    let leetcode = 0;
    let codechef = 0;
    let codeforces = 0;

    contests.forEach((c) => {
      const userDone = isCompleted(c.id);
      let statusMatches = false;

      if (selectedStatus === 'all') {
        statusMatches = true;
      } else if (selectedStatus === 'completed') {
        statusMatches = userDone;
      } else if (selectedStatus === 'upcoming') {
        // Active view: all contests not marked completed
        statusMatches = !userDone;
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

  // Filtered and sorted contests:
  // - Upcoming view: live + future upcoming + expired uncompleted. Completed contests move to Completed tab!
  // - Completed view: only contests marked completed by the user.
  // - All view: all contests, with active first and completed last.
  const filteredContests = useMemo(() => {
    const matched = contests.filter((c) => {
      if (selectedPlatform !== 'all' && c.platform !== selectedPlatform) {
        return false;
      }

      const userDone = isCompleted(c.id);
      if (selectedStatus === 'upcoming') {
        // Once marked completed, contest leaves upcoming and moves to Completed tab!
        if (userDone) {
          return false;
        }
        // Uncompleted expired contests remain visible here so user can mark them!
        return true;
      } else if (selectedStatus === 'completed') {
        // Only contests marked completed by user
        return userDone;
      }

      // 'all' view shows all
      return true;
    }).filter((c) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const matchesName = c.name.toLowerCase().includes(query);
      const matchesPlatform = c.platform.toLowerCase().includes(query);
      return matchesName || matchesPlatform;
    });

    // Priority ordering:
    // 1. LIVE contests (ending soonest first)
    // 2. UPCOMING future contests (starting soonest first)
    // 3. EXPIRED uncompleted contests (ended most recently first)
    // 4. COMPLETED contests (ended most recently first)
    return matched.sort((a, b) => {
      const aDone = isCompleted(a.id);
      const bDone = isCompleted(b.id);
      const aLiveStatus = getContestLiveStatus(a.start_time, a.end_time, currentTime, a.duration_seconds);
      const bLiveStatus = getContestLiveStatus(b.start_time, b.end_time, currentTime, b.duration_seconds);

      // Completed contests come last in 'all' view
      if (aDone !== bDone) {
        return aDone ? 1 : -1;
      }

      const rank = (status: LiveStatus) => {
        if (status === 'live') return 1;
        if (status === 'upcoming') return 2;
        return 3;
      };

      const rankA = rank(aLiveStatus);
      const rankB = rank(bLiveStatus);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      const getEnd = (c: Contest) =>
        c.end_time ? new Date(c.end_time).getTime() : new Date(c.start_time).getTime() + c.duration_seconds * 1000;

      if (aLiveStatus === 'live') {
        return getEnd(a) - getEnd(b);
      } else if (aLiveStatus === 'upcoming') {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      } else {
        return getEnd(b) - getEnd(a);
      }
    });
  }, [contests, selectedPlatform, selectedStatus, searchQuery, isCompleted, currentTime]);

  const completionPercent = completionStats.total > 0
    ? Math.round((completionStats.completed / completionStats.total) * 100)
    : 0;

  // Total user-completed contests for Completed filter tab count
  const completedFilterCount = useMemo(() => {
    return contests.filter((c) => isCompleted(c.id)).length;
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

        {/* Hero: Live Contest (shows BEFORE UP NEXT) and Next Upcoming Contest */}
        {selectedStatus !== 'completed' && (
          <HeroNextContest
            liveContest={liveContests[0] || null}
            upNextContest={upNextContest}
            timezone={timezone}
          />
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
                : selectedStatus === 'completed'
                ? 'No completed contests yet. Mark contests as completed to track your achievements.'
                : `No active contests found for ${selectedPlatform === 'all' ? 'any platform' : selectedPlatform}.`
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
            {filteredContests.map((c, index) => {
              const liveStatus = getContestLiveStatus(c.start_time, c.end_time, currentTime, c.duration_seconds);
              const isCurrentExpired = liveStatus === 'expired' && !isCompleted(c.id);
              const prevContest = index > 0 ? filteredContests[index - 1] : null;
              const isPrevNonExpired =
                prevContest &&
                getContestLiveStatus(prevContest.start_time, prevContest.end_time, currentTime, prevContest.duration_seconds) !== 'expired' &&
                !isCompleted(prevContest.id);
              const showDivider = isCurrentExpired && isPrevNonExpired;

              return (
                <React.Fragment key={c.id}>
                  {showDivider && (
                    <div className="feed-section-divider" role="separator" aria-label="Ended contests awaiting completion">
                      <span className="feed-section-divider-text">
                        Ended Contests &bull; Action Required (Mark completed to move to Completed tab)
                      </span>
                    </div>
                  )}
                  <ContestCard
                    contest={c}
                    timezone={timezone}
                    isCompleted={isCompleted(c.id)}
                    onToggleComplete={toggleComplete}
                  />
                </React.Fragment>
              );
            })}
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
