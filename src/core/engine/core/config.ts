export const ENGINE_TUNING = {
    // Équilibre Possession / Initiative
    NEUTRAL_ZONE_THRESHOLD: 6,      
    INITIATIVE_LOG_FACTOR: 100,    

    // Équilibre Transition (Porte B)
    BASE_TRANSITION_CHANCE: 15,    // Polissage final : Volume idéal pour ~2.5 buts
    COHESION_WEIGHT: 0.25,          

    // Équilibre Résolution (Porte D - V4.6 Probabiliste)
    FINISHING_MULTIPLIER: 1.0,     
    GK_POSITION_BOOST: 1.05,       
    XG_VARIANCE_FLOOR: 0.10,       
    
    // Saturation Défensive
    DENSITY_IMPACT: 0.25,          
    MAX_GOALS_PER_MATCH: 12         
};