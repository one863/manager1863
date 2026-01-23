import { Player, StaffMember } from "../../core/types";
import { TokenPlayer } from "./token-player";
import { TACTIC_TEMPLATES } from "./tactics-data";
import { TokenPlayerState, StaffModifiers } from "./types";

function getStaffModifiers(staff: StaffMember[]): StaffModifiers {
    const modifiers: StaffModifiers = { technicalBonus: 0, tacticalBonus: 0, disciplineBonus: 0, staminaBonus: 0 };
    staff.forEach(m => {
        if (m.role === "COACH") {
            // Utilisation des stats de staff si disponibles
            modifiers.technicalBonus = Math.max(modifiers.technicalBonus, m.stats?.coaching || 0);
            modifiers.tacticalBonus = Math.max(modifiers.tacticalBonus, m.stats?.management || 0);
        } else if (m.role === "PHYSICAL_TRAINER") {
            modifiers.staminaBonus = Math.max(modifiers.staminaBonus, m.stats?.medical || 0);
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
            stats: p.stats,
            staffModifiers: staffModifiers
        };

        const tokenPlayer = new TokenPlayer(state);
        
        // --- INITIALISATION DYNAMIQUE DEPUIS LA DB ---
        // On inverse la condition (0-100) pour obtenir la fatigue initiale (ex: 90% condition -> 10 fatigue)
        tokenPlayer.fatigue = 100 - p.condition;
        // On synchronise la confiance initiale avec le moral de la DB
        tokenPlayer.confidence = p.morale;

        tokenPlayer.setBaseInfluence(roleData.zones);
        tokenPlayer.updateInfluence(2, isHome); 
        return tokenPlayer;
    });
}
