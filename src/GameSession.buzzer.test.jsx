import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameSession } from './App';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    getFirestore: vi.fn(),
    initializeFirestore: vi.fn(),
    doc: vi.fn(),
    updateDoc: vi.fn(),
    onSnapshot: vi.fn(),
    persistentLocalCache: vi.fn(),
    persistentMultipleTabManager: vi.fn()
  };
});

describe('GameSession buzzer timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    firestore.updateDoc.mockClear();
    firestore.doc.mockImplementation(() => ({}));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not auto-advance to leaderboard when buzzer is active', async () => {
    const pin = '999999';
    const now = Date.now();
    const snap = {
      pin,
      status: 'QUESTION',
      currentQuestionIndex: 0,
      roundId: 1,
      endTime: now + 2000,
      buzzedPlayer: { uid: 'p1' },
      lockedPlayers: [],
      quizSnapshot: { questions: [{ type: 'BUZZER', duration: 2 }] },
      players: { p1: { uid: 'p1', nickname: 'P1', score: 0 } }
    };

    firestore.onSnapshot.mockImplementation((docRef, cb) => {
      cb({ exists: () => true, data: () => snap });
      return () => {};
    });

    const mockUser = { uid: 'host' };
    render(<GameSession user={mockUser} sessionData={{ pin }} onExit={() => {}} />);

    // Advance beyond endTime
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Ensure we did not auto-advance to LEADERBOARD
    expect(firestore.updateDoc).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'LEADERBOARD' }));
  });
});
