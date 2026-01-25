import { Player, StaffMember } from "../../core/types";
import { TokenPlayer } from "./token-player";
import { ROLE_ZONES, FORMATION_ROLES } from "./config/formations-config";
import { TokenPlayerState, StaffModifiers } from "./types";

function getStaffModifiers(staff: StaffMember[]): StaffModifiers {
    const modifiers: StaffModifiers = { technicalBonus: 0, tacticalBonus: 0, disciplineBonus: 0, staminaBonus: 0 };
    if (!staff) return modifiers;
    staff.forEach(m => {
        if (m && m.role === "COACH") {
            modifiers.technicalBonus = Math.max(modifiers.technicalBonus, m.stats?.coaching || 0);
            modifiers.tacticalBonus = Math.max(modifiers.tacticalBonus, m.stats?.management || 0);
        } else if (m && m.role === "PHYSICAL_TRAINER") {
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
    const formationRoles = FORMATION_ROLES[tacticKey] || FORMATION_ROLES["4-4-2"];
    // On s'assure que players existe et on filtre les potentiels undefined
    const validPlayers = (players || []).filter(p => p && p.isStarter);
    const starters = validPlayers.slice(0, 11);
    const staffModifiers = getStaffModifiers(staff);
    
    return starters.map((p, index) => {
        const roleKey = formationRoles[index] || "MC";
        const zones = ROLE_ZONES[roleKey] || ROLE_ZONES["MC"];
        
        const state: TokenPlayerState = {
            id: p.id!,
            name: `${p.firstName.charAt(0)}. ${p.lastName}`,
            teamId: teamId,
            role: roleKey,
            stats: p.stats || { technical: 10, finishing: 10, defense: 10 },
            staffModifiers: staffModifiers
        };

        const tokenPlayer = new TokenPlayer(state);
        
        // Sécurité sur les zones
        const active = zones?.active || [];
        const reach = zones?.reach || [];
        
        tokenPlayer.setTacticalZones(active, reach);
        tokenPlayer.setBaseInfluence(p.stats?.technical || 10, p.stats?.defense || 10);
        tokenPlayer.updateInfluence(2, 2, isHome); 
        
        return tokenPlayer;
    });
}
