export interface LivescoreResponse {
  livescore: Livescore;
} 

export interface Livescore {
  idLiveScore: string; // Unique ID for the live score
  idEvent: string; // Event ID
  strSport: string; // Sport type (e.g., "Ice Hockey")
  idLeague: string; // League ID
  strLeague: string; // League name
  idHomeTeam: string; // Home team ID
  idAwayTeam: string; // Away team ID
  strHomeTeam: string; // Home team name
  strAwayTeam: string; // Away team name
  strHomeTeamBadge: string; // URL to home team badge
  strAwayTeamBadge: string; // URL to away team badge
  intHomeScore: string | null; // Home team score (null if unavailable)
  intAwayScore: string | null; // Away team score (null if unavailable)
  intEventScore: string | null; // Event score (optional, usually null)
  intEventScoreTotal: string | null; // Total event score (optional, usually null)
  strStatus: string; // Match status (e.g., "FT" for Full Time, "AP" for After Penalties)
  strProgress: string; // Progress or match phase (e.g., "1H", "2H", or empty for completed matches)
  strEventTime: string; // Event start time
  dateEvent: string; // Event date
  updated: string; // Timestamp of the last update
}
