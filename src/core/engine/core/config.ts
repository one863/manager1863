export const ENGINE_TUNING = {
    // On réduit la zone neutre pour avoir plus d'activité
    NEUTRAL_ZONE_THRESHOLD: 3.5,      
    INITIATIVE_LOG_FACTOR: 100,    

    // Volume d'occasions (Porte C : 14 de base)
    BASE_TRANSITION_CHANCE: 14,    
    COHESION_WEIGHT: 0.20,          

    // Efficacité 
    FINISHING_MULTIPLIER: 1.1,     
    GK_POSITION_BOOST: 1.05,       
    XG_VARIANCE_FLOOR: 0.08,       
    
    // Saturation Défensive
    DENSITY_IMPACT: 0.12,          
    MAX_GOALS_PER_MATCH: 10         
};
