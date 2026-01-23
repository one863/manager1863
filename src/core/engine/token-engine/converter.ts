import { TokenPlayer } from "./token-player";
import { TokenPlayerState, GridPosition } from "./types";

export function convertToTokenPlayers(
    homePlayers: any[], 
    awayPlayers: any[], 
    homeTeamId: number, 
    awayTeamId: number
): TokenPlayer[] {
    const players: TokenPlayer[] = [];

    // Helper pour placer les joueurs
    const placeTeam = (teamPlayers: any[], teamId: number, isHome: boolean) => {
        let defCount = 0, midCount = 0, attCount = 0;
        
        teamPlayers.forEach(p => {
            // Si le joueur n'est pas titulaire, on l'ignore pour le moteur (pour l'instant)
            if (!p.isStarter) return;

            let pos: GridPosition = { x: 0, y: 2 }; // Default GK Home

            const role = p.position || "MID"; // Fallback

            if (isHome) {
                if (role === "GK") pos = { x: 0, y: 2 };
                else if (role.includes("DEF") || role === "CB" || role === "LB" || role === "RB") {
                    pos = { x: 1, y: defCount % 5 };
                    defCount++;
                }
                else if (role.includes("MID") || role === "CM" || role === "CDM" || role === "CAM") {
                    pos = { x: 2, y: midCount % 5 };
                    midCount++;
                }
                else { // ATT
                    pos = { x: 3, y: attCount % 5 };
                    attCount++;
                }
            } else {
                // Away Team (Mirrored X)
                if (role === "GK") pos = { x: 5, y: 2 };
                else if (role.includes("DEF") || role === "CB" || role === "LB" || role === "RB") {
                    pos = { x: 4, y: defCount % 5 };
                    defCount++;
                }
                else if (role.includes("MID") || role === "CM" || role === "CDM" || role === "CAM") {
                    pos = { x: 3, y: midCount % 5 };
                    midCount++;
                }
                else { // ATT
                    pos = { x: 2, y: attCount % 5 };
                    attCount++;
                }
            }

            const state: TokenPlayerState = {
                id: p.id,
                teamId: teamId,
                position: pos,
                fatigue: 0,
                role: role,
                stats: {
                    passing: p.passing || 10,
                    shooting: p.shooting || 10,
                    tackling: p.tackling || 10,
                    dribbling: p.dribbling || 10,
                    positioning: p.positioning || 10,
                    stamina: p.stamina || 15,
                    reflexes: role === "GK" ? (p.reflexes || 12) : undefined
                }
            };

            players.push(new TokenPlayer(state));
        });
    };

    placeTeam(homePlayers, homeTeamId, true);
    placeTeam(awayPlayers, awayTeamId, false);

    return players;
}
