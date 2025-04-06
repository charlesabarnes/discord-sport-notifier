import { Player } from "./Player";
import { Season } from "./Season";
import { Team } from "./Team";

export interface ListResponse<T> {
  list: T[];
}

export type ListEntities = {
  seasons: Season;
  teams: Team;
  players: Player;  
}
