// Type pour le résultat d'une action TOKEN_LOGIC
export interface TokenActionResult {
  moveX?: number;
  moveY?: number;
  logMessage?: string;
  turnover?: boolean;
  stats?: Record<string, number>;
  customDuration?: number;
  isGoal?: boolean;
  isOut?: boolean;
  nextBallPosition?: { x: number; y: number };
  [key: string]: unknown;
}
