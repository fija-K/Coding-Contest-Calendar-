import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterBar } from '../components/FilterBar';

describe('FilterBar Component', () => {
  it('calls onSelectPlatform and onSelectStatus when buttons are clicked', () => {
    const onSelectPlatform = vi.fn();
    const onSelectStatus = vi.fn();
    const onSearchChange = vi.fn();
    const onViewChange = vi.fn();

    render(
      <FilterBar
        selectedPlatform="all"
        onSelectPlatform={onSelectPlatform}
        selectedStatus="upcoming"
        onSelectStatus={onSelectStatus}
        searchQuery=""
        onSearchChange={onSearchChange}
        activeView="list"
        onViewChange={onViewChange}
        counts={{ all: 10, leetcode: 4, codechef: 3, codeforces: 3 }}
        recentCount={2}
        completedCount={4}
      />
    );

    const leetcodeBtn = screen.getByRole('button', { name: /LeetCode/i });
    fireEvent.click(leetcodeBtn);
    expect(onSelectPlatform).toHaveBeenCalledWith('leetcode');

    const codeforcesBtn = screen.getByRole('button', { name: /Codeforces/i });
    fireEvent.click(codeforcesBtn);
    expect(onSelectPlatform).toHaveBeenCalledWith('codeforces');

    const recentBtn = screen.getByRole('button', { name: /Recently Finished/i });
    fireEvent.click(recentBtn);
    expect(onSelectStatus).toHaveBeenCalledWith('recent');

    const completedBtn = screen.getByRole('button', { name: /Completed/i });
    fireEvent.click(completedBtn);
    expect(onSelectStatus).toHaveBeenCalledWith('completed');

    const allBtn = screen.getByRole('button', { name: /^All$/i });
    fireEvent.click(allBtn);
    expect(onSelectStatus).toHaveBeenCalledWith('all');

    const upcomingBtn = screen.getByRole('button', { name: /^Upcoming$/i });
    fireEvent.click(upcomingBtn);
    expect(onSelectStatus).toHaveBeenCalledWith('upcoming');
  });
});
