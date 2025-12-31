import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { QuestionView } from './App';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    getFirestore: vi.fn(),
    initializeFirestore: vi.fn(),
    doc: vi.fn(),
    updateDoc: vi.fn(),
    persistentLocalCache: vi.fn(),
    persistentMultipleTabManager: vi.fn()
  };
});

vi.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="sparkles-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
}));

describe('QuestionView', () => {
  const mockUpdateDoc = vi.fn();
  const mockDoc = vi.fn();

  beforeEach(() => {
    firestore.updateDoc.mockImplementation(mockUpdateDoc);
    firestore.doc.mockImplementation(mockDoc);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const baseSnap = {
    pin: '123456',
    roundId: 100,
    currentQuestionIndex: 0,
    quizSnapshot: {
      questions: [
        { text: 'Test Question?', answers: ['A', 'B', 'C', 'D'], correct: 0, duration: 20 }
      ]
    }
  };

  it('triggers auto-advance and shows snackbar with name when single player answers', async () => {
    const player1 = { uid: 'p1', nickname: 'Player 1', lastAnsweredRoundId: null };
    
    const { rerender, debug } = render(
      <QuestionView 
        snap={baseSnap} 
        players={[player1]} 
        timeLeft={20} 
        onSkip={() => {}} 
        onClose={() => {}} 
      />
    );

    expect(screen.queryByText(/answered!/i)).not.toBeInTheDocument();
    
    const player1Answered = { ...player1, lastAnsweredRoundId: 100 };

    // Update with answered player
    rerender(
      <QuestionView 
        snap={baseSnap} 
        players={[player1Answered]} 
        timeLeft={19} 
        onSkip={() => {}} 
        onClose={() => {}} 
      />
    );

    // Should be immediate
    const snackbar = screen.queryByText('Player 1 answered!');
    
    if (!snackbar) {
      debug(); // Print DOM if failed
    }
    
    expect(snackbar).toBeInTheDocument();

    // Advance timer for auto-advance logic (1.5s delay)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
      endTime: expect.any(Number)
    }));
  });
});
