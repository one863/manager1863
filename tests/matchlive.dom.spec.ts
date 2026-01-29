import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { render, h } from 'preact';
import { signal } from '@preact/signals';
import PitchView from '../src/competition/match/components/PitchView';

describe('PitchView DOM interactions', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('affiche KICKOFF quand la situation est un coup d\'envoi et positionne le ballon', () => {
    const displayPos = signal({ x: 2, y: 2 });
    const currentLog = signal<any>({ ballPosition: { x: 2, y: 2 }, situation: 'KICK_OFF', drawnToken: null, text: "Coup d'envoi" });
    const previousLog = signal(null);
    const possession = signal([50, 50]);

    render(
      h(PitchView, {
        displayPos,
        effectiveTeamId: signal(undefined),
        homeTeamId: 1,
        awayTeamId: 2,
        currentLog,
        previousLog,
        possession
      }),
      container
    );

    // Badge KICKOFF présent
    expect(container.textContent).toContain('KICKOFF');
    // Ballon rendu (élément avec classe w-5 h-5)
    const ball = container.querySelector('.w-5.h-5');
    expect(ball).toBeTruthy();
  });

  it('met à jour le badge et la couleur du ballon quand drawnToken change', async () => {
    const displayPos = signal({ x: 2, y: 2 });
    const currentLog = signal<any>({ ballPosition: { x: 2, y: 2 }, situation: undefined, drawnToken: null, text: 'Action' });
    const previousLog = signal({ bag: [{ id: 't1', type: 'PASS_SHORT', teamId: 1 }] });
    const possession = signal([60, 40]);

    render(
      h(PitchView, {
        displayPos,
        effectiveTeamId: signal(undefined),
        homeTeamId: 1,
        awayTeamId: 2,
        currentLog,
        previousLog,
        possession
      }),
      container
    );

    // initialement pas de badge (drawnToken null)
    expect(container.textContent).not.toContain('PASS_SHORT');

    // Simuler tirage (drawnToken dans currentLog)
    currentLog.value = { ...currentLog.value, drawnToken: { id: 't1', type: 'PASS_SHORT', teamId: 1 } };
    displayPos.value = { x: 3, y: 1 };

    // attendre la microtask pour que les signals se propagent
    await Promise.resolve();

    // badge doit apparaître
    expect(container.textContent).toContain('PASS_SHORT');

    // couleur du halo / ballon doit être bleu (home) -> on vérifie la présence d'une classe bg-blue- ou inline style
    expect(container.innerHTML).toMatch(/bg-blue-|bg-blue-500|bg-blue-600/);
  });
});
