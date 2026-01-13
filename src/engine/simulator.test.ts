import { describe, it, expect } from 'vitest';
import { simulateMatch } from './simulator';
import { TeamRatings } from './types';

describe('Simulator Engine', () => {
  const strongTeam: TeamRatings = {
    midfield: 18,
    attackLeft: 18,
    attackCenter: 18,
    attackRight: 18,
    defenseLeft: 18,
    defenseCenter: 18,
    defenseRight: 18,
    setPieces: 15,
    tacticSkill: 15,
    tacticType: 'NORMAL',
  };

  const weakTeam: TeamRatings = {
    midfield: 3,
    attackLeft: 3,
    attackCenter: 3,
    attackRight: 3,
    defenseLeft: 3,
    defenseCenter: 3,
    defenseRight: 3,
    setPieces: 5,
    tacticSkill: 5,
    tacticType: 'NORMAL',
  };

  const mockPlayers = (teamId: number) =>
    Array(11)
      .fill(0)
      .map((_, i) => ({
        id: teamId * 100 + i,
        saveId: 1,
        teamId,
        firstName: 'Player',
        lastName: `Name${i}`,
        position: i < 2 ? 'FWD' : i < 6 ? 'MID' : 'DEF',
        energy: 100,
        talent: 5,
        skills: {},
        age: 25,
        value: 1000,
        salary: 100,
        dna: '1-1-1',
      })) as any;

  it('should favor stronger midfield for possession', async () => {
    const result = await simulateMatch(
      strongTeam,
      weakTeam,
      1,
      2,
      mockPlayers(1),
      mockPlayers(2),
    );
    expect(result.homePossession).toBeGreaterThan(70);
  });

  it('should generate higher score for strong team vs weak team over many simulations', async () => {
    let homeWins = 0;
    const SIMULATIONS = 50;

    for (let i = 0; i < SIMULATIONS; i++) {
      const result = await simulateMatch(
        strongTeam,
        weakTeam,
        1,
        2,
        mockPlayers(1),
        mockPlayers(2),
      );
      if (result.homeScore > result.awayScore) homeWins++;
    }

    // Une équipe de niveau 18 contre niveau 3 devrait gagner la grande majorité du temps
    expect(homeWins).toBeGreaterThan(SIMULATIONS * 0.8);
  });

  it('should have 50% possession for equal teams', async () => {
    const result = await simulateMatch(
      strongTeam,
      strongTeam,
      1,
      2,
      mockPlayers(1),
      mockPlayers(2),
    );
    expect(result.homePossession).toBe(50);
  });

  it('should sort events by minute', async () => {
    const result = await simulateMatch(
      strongTeam,
      weakTeam,
      1,
      2,
      mockPlayers(1),
      mockPlayers(2),
    );
    
    for (let i = 0; i < result.events.length - 1; i++) {
      expect(result.events[i].minute).toBeLessThanOrEqual(result.events[i+1].minute);
    }
  });
});
