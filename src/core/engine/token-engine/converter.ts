import { Player, StaffMember } from "../../db/db";
import { TokenPlayer } from "./token-player";
import { TACTIC_TEMPLATES } from "./tactics-data";
import { TokenPlayerState, StaffModifiers } from "./types";

function getStaffModifiers(staff: StaffMember[]): StaffModifiers {
    const modifiers: StaffModifiers = { technicalBonus: 0, tacticalBonus: 0, disciplineBonus: 0, staminaBonus: 0 };
    staff.forEach(m => {
        if (m.role === "COACH") {
            modifiers.technicalBonus = Math.max(modifiers.technicalBonus, m.stats.coaching);
            modifiers.tacticalBonus = Math.max(modifiers.tacticalBonus, m.stats.tactical);
            modifiers.disciplineBonus = Math.max(modifiers.disciplineBonus, m.stats.discipline);
        } else if (m.role === "PHYSICAL_TRAINER") {
            modifiers.staminaBonus = Math.max(modifiers.staminaBonus, m.stats.conditioning);
        }
    });
    return modifiers;
}

export function createTokenPlayers(
    players: Player[], 
    staff: StaffMember[],
    teamId: number, 
    tacticKey: string, 
    isHome: boolean
): TokenPlayer[] {
    const tactic = TACTIC_TEMPLATES[tacticKey] || TACTIC_TEMPLATES["4-4-2"];
    const starters = players.filter(p => p.isStarter).slice(0, 11);
    const staffModifiers = getStaffModifiers(staff);
    
    return starters.map((p, index) => {
        const roleData = tactic.roles[index] || tactic.roles[0];
        const state: TokenPlayerState = {
            id: p.id!,
            name: `${p.firstName.charAt(0)}. ${p.lastName}`,
            teamId: teamId,
            role: roleData.label,
            stats: {
                technical: (p.stats.passing + p.stats.dribbling) / 2,
                finishing: p.stats.shooting,
                defense: p.stats.tackling,
                physical: (p.stats.stamina + 20) / 2, 
                mental: p.stats.positioning,
                goalkeeping: p.stats.reflexes
            },
            staffModifiers: staffModifiers
        };

        const tokenPlayer = new TokenPlayer(state);
        tokenPlayer.setBaseInfluence(roleData.zones);
        tokenPlayer.updateInfluence(2, isHome); // Initialisation au centre
        return tokenPlayer;
    });
}
