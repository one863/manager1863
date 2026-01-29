import { describe, it, expect } from 'vitest';
import { TokenMatchEngine } from './token-engine/match-engine';

describe('TokenMatchEngine smoke tests', () => {
  it('génère des logs contenant ballPosition, drawnToken et possessionTeamId et calcule les scores', () => {
    const engine = new TokenMatchEngine();
    const res = engine.simulateMatch(200, { homeTeamId: 1, awayTeamId: 2, homeName: 'Home', awayName: 'Away' });
    expect(res).toHaveProperty('events');
    expect(typeof res.homeScore).toBe('number');
    expect(typeof res.awayScore).toBe('number');
    const events = res.events || [];
    expect(events.length).toBeGreaterThan(0);
    const sample = events[Math.floor(events.length / 2)];
    expect(sample).toHaveProperty('ballPosition');
    expect(sample).toHaveProperty('drawnToken');
    expect(sample).toHaveProperty('possessionTeamId');
  });
});

