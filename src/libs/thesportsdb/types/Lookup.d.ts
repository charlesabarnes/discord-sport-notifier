import { League } from "./League";
import { Player } from "./Player";
import { Team } from "./Team";
import { Venue } from "./Venue";

export interface LookupResponse<T> {
  lookup: T[];
}

export interface LookupEntities {
  league: League;
  team: Team;
  player: Player;
  venue: Venue;
}