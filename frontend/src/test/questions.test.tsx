import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import {
  useContestQuestions,
  QUESTIONS_STORAGE_KEY,
  loadQuestionsFromStorage,
} from '../hooks/useContestQuestions';
import { ContestCard } from '../components/ContestCard';
import { Contest } from '../types/contest';

describe('Questions Solved Tracker & useContestQuestions Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockContest: Contest = {
    id: 'cf_2289',
    platform: 'codeforces',
    external_id: '2289',
    name: 'Codeforces Round 1137 (Div. 2)',
    start_time: '2026-11-22T14:35:00Z',
    end_time: '2026-11-22T16:35:00Z',
    duration_seconds: 7200,
    contest_url: 'https://codeforces.com/contest/2289',
    status: 'completed',
    source_updated_at: '2026-11-22T14:35:00Z',
    created_at: '2026-11-22T14:35:00Z',
    updated_at: '2026-11-22T14:35:00Z',
  };

  it('loads empty map when localStorage is empty', () => {
    expect(loadQuestionsFromStorage()).toEqual({});
  });

  it('handles corrupted localStorage JSON gracefully', () => {
    localStorage.setItem(QUESTIONS_STORAGE_KEY, 'invalid-json');
    expect(loadQuestionsFromStorage()).toEqual({});
  });

  it('loads valid questions map from storage', () => {
    localStorage.setItem(
      QUESTIONS_STORAGE_KEY,
      JSON.stringify({ cf_2289: 3, lc_529: 4 })
    );
    expect(loadQuestionsFromStorage()).toEqual({ cf_2289: 3, lc_529: 4 });
  });

  it('increments, decrements, and updates questions solved correctly', () => {
    const { result } = renderHook(() => useContestQuestions());

    expect(result.current.getQuestionsSolved('cf_2289')).toBe(0);
    expect(result.current.totalQuestionsSolved).toBe(0);

    // Increment
    act(() => {
      result.current.incrementQuestions('cf_2289');
    });
    expect(result.current.getQuestionsSolved('cf_2289')).toBe(1);
    expect(result.current.totalQuestionsSolved).toBe(1);

    act(() => {
      result.current.incrementQuestions('cf_2289');
      result.current.incrementQuestions('cf_2289');
    });
    expect(result.current.getQuestionsSolved('cf_2289')).toBe(3);
    expect(result.current.totalQuestionsSolved).toBe(3);

    // Decrement
    act(() => {
      result.current.decrementQuestions('cf_2289');
    });
    expect(result.current.getQuestionsSolved('cf_2289')).toBe(2);
    expect(result.current.totalQuestionsSolved).toBe(2);

    // Add for another contest
    act(() => {
      result.current.setQuestionsSolved('lc_529', 4);
    });
    expect(result.current.getQuestionsSolved('lc_529')).toBe(4);
    expect(result.current.totalQuestionsSolved).toBe(6);

    // Decrement to zero removes from map
    act(() => {
      result.current.setQuestionsSolved('cf_2289', 0);
    });
    expect(result.current.getQuestionsSolved('cf_2289')).toBe(0);
    expect(result.current.totalQuestionsSolved).toBe(4);

    // Clear all
    act(() => {
      result.current.clearAllQuestions();
    });
    expect(result.current.totalQuestionsSolved).toBe(0);
    expect(result.current.getQuestionsSolved('lc_529')).toBe(0);
  });

  it('renders questions solved stepper in ContestCard and allows increment/decrement', () => {
    const onUpdateQuestions = vi.fn();

    const { rerender } = render(
      <ContestCard
        contest={mockContest}
        timezone="UTC"
        questionsSolved={0}
        onUpdateQuestions={onUpdateQuestions}
      />
    );

    expect(screen.getByTestId('questions-ctrl-cf_2289')).toBeInTheDocument();
    const input = screen.getByTestId('questions-input-cf_2289') as HTMLInputElement;
    expect(input.value).toBe('0');

    // Click increment
    const plusBtn = screen.getByTestId('questions-inc-cf_2289');
    fireEvent.click(plusBtn);
    expect(onUpdateQuestions).toHaveBeenCalledWith('cf_2289', 1);

    // Minus button is disabled when 0
    const minusBtn = screen.getByTestId('questions-dec-cf_2289');
    expect(minusBtn).toBeDisabled();

    // Rerender with 3 questions
    rerender(
      <ContestCard
        contest={mockContest}
        timezone="UTC"
        questionsSolved={3}
        onUpdateQuestions={onUpdateQuestions}
      />
    );
    expect((screen.getByTestId('questions-input-cf_2289') as HTMLInputElement).value).toBe('3');
    expect(screen.getByTestId('questions-dec-cf_2289')).not.toBeDisabled();

    // Click decrement
    fireEvent.click(screen.getByTestId('questions-dec-cf_2289'));
    expect(onUpdateQuestions).toHaveBeenCalledWith('cf_2289', 2);

    // Type into input
    fireEvent.change(screen.getByTestId('questions-input-cf_2289'), {
      target: { value: '5' },
    });
    expect(onUpdateQuestions).toHaveBeenCalledWith('cf_2289', 5);
  });
});
