import React from 'react';
import { List, Calendar as CalendarIcon, Search } from 'lucide-react';
import { PlatformId, StatusFilter } from '../types/contest';

interface FilterBarProps {
  selectedPlatform: PlatformId | 'all';
  onSelectPlatform: (platform: PlatformId | 'all') => void;
  selectedStatus: StatusFilter;
  onSelectStatus: (status: StatusFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeView: 'list' | 'calendar';
  onViewChange: (view: 'list' | 'calendar') => void;
  counts: {
    all: number;
    leetcode: number;
    codechef: number;
    codeforces: number;
  };
  recentCount?: number;
  completedCount?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedPlatform,
  onSelectPlatform,
  selectedStatus,
  onSelectStatus,
  searchQuery,
  onSearchChange,
  activeView,
  onViewChange,
  counts,
  recentCount,
  completedCount,
}) => {
  return (
    <div className="filter-toolbar" role="toolbar" aria-label="Contest filters and views">
      <div className="filter-row-primary">
        {/* Platform Selection Tabs */}
        <div className="platform-tab-group" role="group" aria-label="Filter by contest platform">
          <button
            type="button"
            className={`platform-tab-btn ${selectedPlatform === 'all' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('all')}
          >
            <span>All Platforms</span>
            <span className="tab-count mono">({counts.all})</span>
          </button>
          <button
            type="button"
            className={`platform-tab-btn ${selectedPlatform === 'leetcode' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('leetcode')}
          >
            <span>LeetCode</span>
            <span className="tab-count mono">({counts.leetcode})</span>
          </button>
          <button
            type="button"
            className={`platform-tab-btn ${selectedPlatform === 'codechef' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('codechef')}
          >
            <span>CodeChef</span>
            <span className="tab-count mono">({counts.codechef})</span>
          </button>
          <button
            type="button"
            className={`platform-tab-btn ${selectedPlatform === 'codeforces' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('codeforces')}
          >
            <span>Codeforces</span>
            <span className="tab-count mono">({counts.codeforces})</span>
          </button>
        </div>
      </div>

      <div className="filter-row-secondary">
        {/* Status Filter Segmented Control */}
        <div className="status-segmented-control" role="group" aria-label="Status selection">
          <button
            type="button"
            className={`status-segment-btn ${selectedStatus === 'all' ? 'active' : ''}`}
            onClick={() => onSelectStatus('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`status-segment-btn ${selectedStatus === 'upcoming' ? 'active' : ''}`}
            onClick={() => onSelectStatus('upcoming')}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={`status-segment-btn ${selectedStatus === 'recent' ? 'active' : ''}`}
            onClick={() => onSelectStatus('recent')}
            title="Finished in past 7 days • Auto-removes after 7 days if uncompleted"
          >
            <span>Recently Finished</span>
            {recentCount !== undefined && recentCount > 0 && (
              <span className="segment-count mono">({recentCount})</span>
            )}
          </button>
          <button
            type="button"
            className={`status-segment-btn ${selectedStatus === 'completed' ? 'active' : ''}`}
            onClick={() => onSelectStatus('completed')}
          >
            <span>Completed</span>
            {completedCount !== undefined && (
              <span className="segment-count mono">({completedCount})</span>
            )}
          </button>
        </div>

        {/* Search Field & View Switcher */}
        <div className="toolbar-aux-group">
          <div className="search-field-wrap">
            <Search size={12} className="search-field-icon" aria-hidden="true" />
            <input
              type="text"
              className="search-field-input"
              placeholder="Search contests..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Filter contests by keyword"
            />
          </div>

          <div className="view-switcher" role="radiogroup" aria-label="View toggle">
            <button
              type="button"
              className={`view-switch-btn ${activeView === 'list' ? 'active' : ''}`}
              onClick={() => onViewChange('list')}
              aria-label="List view"
              aria-checked={activeView === 'list'}
              role="radio"
            >
              <List size={12} />
              <span>List</span>
            </button>
            <button
              type="button"
              className={`view-switch-btn ${activeView === 'calendar' ? 'active' : ''}`}
              onClick={() => onViewChange('calendar')}
              aria-label="Calendar view"
              aria-checked={activeView === 'calendar'}
              role="radio"
            >
              <CalendarIcon size={12} />
              <span>Calendar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
