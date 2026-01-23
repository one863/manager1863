export interface StaffImpact {
    bonusType: 'QUALITATIVE' | 'QUANTITATIVE';
    targetToken: string;
    value: number; // ex: 0.1 pour 10%
}

export interface StaffConfig {
    impacts: Record<string, StaffImpact>;
}

export const STAFF_CONFIG: Record<string, StaffConfig> = {
    "TECHNICAL": {
        impacts: {
            "passing": { bonusType: 'QUALITATIVE', targetToken: 'PASS', value: 0.05 },
            "dribbling": { bonusType: 'QUALITATIVE', targetToken: 'DRIBBLE', value: 0.05 }
        }
    },
    "TACTICAL": {
        impacts: {
            "positioning": { bonusType: 'QUANTITATIVE', targetToken: 'INTERCEPT', value: 2 },
            "tackling": { bonusType: 'QUANTITATIVE', targetToken: 'TACKLE', value: 2 }
        }
    },
    "PHYSIO": {
        impacts: {
            "stamina": { bonusType: 'QUANTITATIVE', targetToken: 'FATIGUE', value: -3 } // Moins de jetons fatigue
        }
    }
};
