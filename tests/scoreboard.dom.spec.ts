import { describe, it, expect, afterEach } from 'vitest';
import { render, h } from 'preact';
import { signal } from '@preact/signals';
import Scoreboard from '../src/competition/match/components/Scoreboard';

describe('Scoreboard DOM', () => {
  let container: HTMLDivElement;

  afterEach(() => {
    if (container) {
      render(null, container);
      container.remove();
    }
  });

  it('affiche les scores, les buteurs et la barre de possession', () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const homeTeam = { id: 1, name: 'Home FC' } as any;
    const awayTeam = { id: 2, name: 'Away FC' } as any;

    const homeScore = signal(2);
    const awayScore = signal(1);
    const minute = signal(12);
    const homeScorers = signal([{ name: 'A. Player', minute: 5 }]);
    const awayScorers = signal([{ name: 'B. Player', minute: 9 }]);
    const possession = signal([63, 37]);
    const stoppageTime = signal(0);

    render(
      h(Scoreboard, {
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        minute,
        homeScorers,
        awayScorers,
        possession,
        isFinished: false,
        stoppageTime
      }),
      container
    );

    // Scores visibles
    const nums = container.querySelectorAll('.text-3xl');
    expect(nums.length).toBeGreaterThanOrEqual(2);
    expect(nums[0].textContent?.trim()).toBe(String(homeScore.value));
    expect(nums[1].textContent?.trim()).toBe(String(awayScore.value));

    // Buteurs affichés
    expect(container.textContent).toContain('A. Player');
    expect(container.textContent).toContain("B. Player");

    // Possession: style width doit contenir la valeur
    expect(container.innerHTML).toMatch(/width:\s*63%|width="63%|width:63%/);
  });
});

