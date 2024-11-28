import { Country } from "./Countries";
import { League } from "./League";
import { Sport } from "./Sports";

export interface AllResponse<T> {
  all: T[];
}

export type AllEntities = {
  countries: Country;
  sports: Sport;
  leagues: League;   
}
