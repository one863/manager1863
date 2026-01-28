import { Player } from "../../domain/player/types";
import { Staff as StaffMember } from "../../domain/staff/types";
import { TokenPlayer } from "./token-player";
import { getZonesForRole, getFormationRoles, DEFAULT_FORMATION } from "./config/formations-config";
import { TokenPlayerState, StaffModifiers, PlayerStats } from "./types";

function getStaffModifiers(staff: StaffMember[]): StaffModifiers {
    const modifiers: StaffModifiers = { technicalBonus: 0, tacticalBonus: 0, disciplineBonus: 0, staminaBonus: 0 };
    if (!staff) return modifiers;
    staff.forEach(m => {
        if (m && m.role === "COACH") {
            modifiers.technicalBonus = Math.max(modifiers.technicalBonus, (m.stats as any)?.coaching || 0);
            modifiers.tacticalBonus = Math.max(modifiers.tacticalBonus, (m.stats as any)?.tactical || 0);
        } else if (m && m.role === "PHYSICAL_TRAINER") {
            modifiers.staminaBonus = Math.max(modifiers.staminaBonus, (m.stats as any)?.conditioning || 0);
        }
    });
    return modifiers;
}

/**
 * Convertit les stats simplifiées du domaine Player vers les stats complètes du moteur
 * Le domaine utilise: technical, finishing, defense, physical, mental, goalkeeping
 * Le moteur utilise: ~25 stats détaillées
 */
function convertToEngineStats(domainStats: any, position: string): PlayerStats {
    const technical = domainStats?.technical || 10;
    const finishing = domainStats?.finishing || 10;
    const defense = domainStats?.defense || 10;
    const physical = domainStats?.physical || 10;
    const mental = domainStats?.mental || 10;
    const goalkeeping = domainStats?.goalkeeping || 5;
    
    const isGK = position === "GK";
    const isDEF = ["DEF", "DC", "DL", "DR", "DCL", "DCR", "LWB", "RWB"].includes(position);
    const isMID = ["MID", "MC", "ML", "MR", "MCL", "MCR", "DM", "AMC", "AML", "AMR"].includes(position);
    const isFWD = ["FWD", "ST", "STL", "STR", "CF", "LW", "RW"].includes(position);
    
    return {
        // Technique - basé sur technical + finishing
        finishing: finishing + (isFWD ? 2 : isDEF ? -3 : 0),
        passing: technical + (isMID ? 2 : 0),
        dribbling: technical + (isFWD ? 1 : isDEF ? -2 : 0),
        crossing: technical + (["ML", "MR", "LW", "RW", "DL", "DR", "LWB", "RWB", "AML", "AMR"].includes(position) ? 3 : -2),
        vision: technical + (isMID ? 2 : isFWD ? 1 : -2),
        longShots: finishing + (isMID ? 1 : isFWD ? 0 : -3),
        heading: physical + (isDEF ? 2 : isFWD ? 1 : -1),
        
        // Défense - basé sur defense
        tackling: defense + (isDEF ? 2 : isMID ? 0 : -3),
        marking: defense + (isDEF ? 2 : isMID ? 0 : -3),
        positioning: defense + mental / 4,
        
        // Physique - basé sur physical
        pace: physical + (["LW", "RW", "DL", "DR", "LWB", "RWB"].includes(position) ? 2 : 0),
        strength: physical + (isDEF || isFWD ? 1 : 0),
        endurance: physical,
        jumping: physical + (isDEF ? 1 : isFWD ? 1 : 0),
        
        // Mental - basé sur mental
        composure: mental + (isFWD ? 1 : 0),
        concentration: mental + (isDEF ? 1 : 0),
        aggression: mental - 2 + (isDEF ? 2 : 0),
        workRate: mental,
        
        // Gardien - basé sur goalkeeping
        reflexes: isGK ? goalkeeping + 2 : 1,
        handling: isGK ? goalkeeping + 1 : 1,
        kicking: isGK ? goalkeeping : 1,
        oneOnOnes: isGK ? goalkeeping + 1 : 1
    };
}

export function createTokenPlayers(
    players: Player[], 
    staff: StaffMember[],
    teamId: number, 
    tacticKey: string, 
    isHome: boolean
): TokenPlayer[] {
    // Utilise la formation passée ou 4-4-2 par défaut
    const formationRoles = getFormationRoles(tacticKey);
    
    // On s'assure que players existe et on filtre les potentiels undefined
    const validPlayers = (players || []).filter(p => p && p.isStarter);
    const starters = validPlayers.slice(0, 11);
    const staffModifiers = getStaffModifiers(staff);
    
    return starters.map((p, index) => {
        const roleKey = formationRoles[index] || "MC";
        // Les zones sont automatiquement inversées pour AWAY
        const zones = getZonesForRole(roleKey, isHome);

        // Convertit les stats du domaine vers les stats du moteur
        const engineStats = convertToEngineStats(p.stats, p.position || roleKey);

        // Construction du nom complet du joueur
        const playerName = [p.firstName, p.lastName].filter(Boolean).join(' ');

        const state: TokenPlayerState & { name: string; role: string } = {
            id: String(p.id!),
            name: playerName || `Joueur #${p.id}`,
            teamId: teamId,
            position: p.position,
            role: p.role || roleKey,
            stats: engineStats,
            injured: false,
            suspended: false
        };

        const tokenPlayer = new TokenPlayer(state);

        // Les zones incluent active et reach (déjà inversées si AWAY)
        tokenPlayer.setTacticalZones(zones.active, zones.reach);
        tokenPlayer.setBaseInfluence(p.stats?.technical || 10, p.stats?.defense || 10);
        tokenPlayer.updateInfluence(2, 2, isHome);

        return tokenPlayer;
    });
}
