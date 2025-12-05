/**
 * ESPN API Helper
 *
 * ESPN provides free, public API endpoints for sports data.
 * No authentication required.
 *
 * Base URL: https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/
 */

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports';

// Supported sports and their leagues
export const ESPN_SPORTS = {
  football: {
    name: 'Football',
    leagues: {
      nfl: { name: 'NFL', slug: 'nfl' },
      'college-football': { name: 'NCAA Football', slug: 'college-football' },
      xfl: { name: 'XFL', slug: 'xfl' },
      ufl: { name: 'UFL', slug: 'ufl' },
      cfl: { name: 'CFL (Canadian)', slug: 'cfl' },
    }
  },
  basketball: {
    name: 'Basketball',
    leagues: {
      nba: { name: 'NBA', slug: 'nba' },
      wnba: { name: 'WNBA', slug: 'wnba' },
      'mens-college-basketball': { name: 'NCAA Men\'s Basketball', slug: 'mens-college-basketball' },
      'womens-college-basketball': { name: 'NCAA Women\'s Basketball', slug: 'womens-college-basketball' },
    }
  },
  baseball: {
    name: 'Baseball',
    leagues: {
      mlb: { name: 'MLB', slug: 'mlb' },
    }
  },
  hockey: {
    name: 'Hockey',
    leagues: {
      nhl: { name: 'NHL', slug: 'nhl' },
    }
  },
  soccer: {
    name: 'Soccer',
    leagues: {
      'usa.1': { name: 'MLS', slug: 'usa.1' },
      'eng.1': { name: 'Premier League', slug: 'eng.1' },
      'esp.1': { name: 'La Liga', slug: 'esp.1' },
      'ger.1': { name: 'Bundesliga', slug: 'ger.1' },
      'ita.1': { name: 'Serie A', slug: 'ita.1' },
      'fra.1': { name: 'Ligue 1', slug: 'fra.1' },
      'uefa.champions': { name: 'UEFA Champions League', slug: 'uefa.champions' },
      'uefa.europa': { name: 'UEFA Europa League', slug: 'uefa.europa' },
      'fifa.world': { name: 'FIFA World Cup', slug: 'fifa.world' },
    }
  },
  racing: {
    name: 'Racing',
    leagues: {
      f1: { name: 'Formula 1', slug: 'f1' },
      irl: { name: 'IndyCar', slug: 'irl' },
      'nascar-premier': { name: 'NASCAR Cup Series', slug: 'nascar-premier' },
      'nascar-secondary': { name: 'NASCAR Xfinity Series', slug: 'nascar-secondary' },
      'nascar-truck': { name: 'NASCAR Truck Series', slug: 'nascar-truck' },
    }
  },
  mma: {
    name: 'MMA',
    leagues: {
      ufc: { name: 'UFC', slug: 'ufc' },
    }
  },
  golf: {
    name: 'Golf',
    leagues: {
      pga: { name: 'PGA Tour', slug: 'pga' },
    }
  },
  tennis: {
    name: 'Tennis',
    leagues: {
      atp: { name: 'ATP', slug: 'atp' },
      wta: { name: 'WTA', slug: 'wta' },
    }
  }
} as const;

// Type definitions for ESPN API responses
export interface ESPNEvent {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  season?: {
    year: number;
    type: number;
  };
  competitions?: ESPNCompetition[];
  status?: {
    type: {
      id: string;
      name: string;
      state: string;
      completed: boolean;
    };
  };
  links?: { href: string; text: string }[];
}

export interface ESPNCompetition {
  id: string;
  date: string;
  venue?: {
    id: string;
    fullName: string;
    address?: {
      city: string;
      state?: string;
      country?: string;
    };
  };
  competitors: ESPNCompetitor[];
  broadcasts?: { names: string[] }[];
}

export interface ESPNCompetitor {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: 'home' | 'away';
  winner?: boolean;
  team?: ESPNTeam;
  score?: string;
}

export interface ESPNTeam {
  id: string;
  uid?: string;
  location?: string;
  name?: string;
  abbreviation?: string;
  displayName: string;
  shortDisplayName?: string;
  color?: string;
  alternateColor?: string;
  logo?: string;
  logos?: { href: string; width: number; height: number }[];
}

export interface ESPNScoreboardResponse {
  leagues?: {
    id: string;
    name: string;
    abbreviation: string;
    calendar?: string[];
  }[];
  events: ESPNEvent[];
}

export interface ESPNTeamsResponse {
  sports: {
    leagues: {
      teams: { team: ESPNTeam }[];
    }[];
  }[];
}

/**
 * Fetch scoreboard/schedule for a league
 */
export async function getScoreboard(sport: string, league: string, date?: string): Promise<ESPNScoreboardResponse> {
  let url = `${ESPN_BASE_URL}/${sport}/${league}/scoreboard`;
  if (date) {
    url += `?dates=${date}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch all teams for a league
 */
export async function getTeams(sport: string, league: string): Promise<ESPNTeam[]> {
  const url = `${ESPN_BASE_URL}/${sport}/${league}/teams`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
  }

  const data: ESPNTeamsResponse = await response.json();

  // Extract teams from nested structure
  const teams: ESPNTeam[] = [];
  for (const sportData of data.sports || []) {
    for (const leagueData of sportData.leagues || []) {
      for (const teamEntry of leagueData.teams || []) {
        if (teamEntry.team) {
          teams.push(teamEntry.team);
        }
      }
    }
  }

  return teams;
}

/**
 * Fetch schedule for a specific team
 */
export async function getTeamSchedule(sport: string, league: string, teamId: string): Promise<ESPNEvent[]> {
  const url = `${ESPN_BASE_URL}/${sport}/${league}/teams/${teamId}/schedule`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.events || [];
}

/**
 * Search teams by name within a league
 */
export async function searchTeams(sport: string, league: string, query: string): Promise<ESPNTeam[]> {
  const teams = await getTeams(sport, league);
  const queryLower = query.toLowerCase();

  return teams.filter(team =>
    team.displayName.toLowerCase().includes(queryLower) ||
    team.name?.toLowerCase().includes(queryLower) ||
    team.abbreviation?.toLowerCase().includes(queryLower) ||
    team.location?.toLowerCase().includes(queryLower)
  );
}

/**
 * Get upcoming events for a league (next 7 days)
 */
export async function getUpcomingEvents(sport: string, league: string): Promise<ESPNEvent[]> {
  const scoreboard = await getScoreboard(sport, league);
  const now = new Date();

  return scoreboard.events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= now;
  });
}

/**
 * Get upcoming events for a specific team
 */
export async function getUpcomingTeamEvents(sport: string, league: string, teamId: string): Promise<ESPNEvent[]> {
  const events = await getTeamSchedule(sport, league, teamId);
  const now = new Date();

  return events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= now;
  });
}

/**
 * Get list of available sports
 */
export function getSports(): { id: string; name: string }[] {
  return Object.entries(ESPN_SPORTS).map(([id, data]) => ({
    id,
    name: data.name
  }));
}

/**
 * Get leagues for a sport
 */
export function getLeagues(sport: string): { id: string; name: string; slug: string }[] {
  const sportData = ESPN_SPORTS[sport as keyof typeof ESPN_SPORTS];
  if (!sportData) return [];

  return Object.entries(sportData.leagues).map(([id, data]) => ({
    id,
    name: data.name,
    slug: data.slug
  }));
}

/**
 * Check if a sport/league combination is valid
 */
export function isValidSportLeague(sport: string, league: string): boolean {
  const sportData = ESPN_SPORTS[sport as keyof typeof ESPN_SPORTS];
  if (!sportData) return false;
  return league in sportData.leagues;
}
