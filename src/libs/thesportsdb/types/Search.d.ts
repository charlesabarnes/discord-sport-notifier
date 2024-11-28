import { League } from "./League";
import { Player } from "./Player";
import { Team } from "./Team";
import { Venue } from "./Venue";
import { Event } from "./Event";

export interface SearchResponse<T> {
  search: T[];
}
  
export type SearchEntities = {
  league: League;
  team: Team;
  player: Player;
  venue: Venue;
  event: Event;
}