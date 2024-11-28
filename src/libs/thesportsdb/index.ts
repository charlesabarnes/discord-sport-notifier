import SportsDBClient from './client';
import { LookupResponse } from './types/Lookup';
import { LivescoreResponse } from './types/Livescore';
import { LookupEntities } from './types/Lookup';
import { SearchEntities } from './types/Search';
import { SearchResponse } from './types/Search';
import { ListResponse } from './types/List';
import { ListEntities } from './types/List';
import { FilterResponse } from './types/Filter';
import { Event } from './types/Event';
import { AllResponse } from './types/All';
import { AllEntities } from './types/All';

class SportsDBSDK {

  public client: SportsDBClient;

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new SportsDBClient(apiKey, baseUrl);

  }
  
  public async search<T extends keyof SearchEntities>(entity: T, identifier: string): Promise<SearchResponse<SearchEntities[T]>> {
    return this.client.get(`/search/${entity}/${identifier}`);
  }
  
  async lookup<T extends keyof LookupEntities>(entity: T, identifier: string): Promise<LookupResponse<LookupEntities[T]>> {
    return this.client.get(`/lookup/${entity}/${identifier}`);
  }

  async getLivescore(identifier: string | number): Promise<LivescoreResponse> {
    return this.client.get(`/livescore/${identifier}`);
  }

  async getLivescoreAll(): Promise<LivescoreResponse> {
    return this.client.get('/livescore/all');
  }

  async list<T extends keyof ListEntities>(entity: T, identifier: string): Promise<ListResponse<ListEntities[T]>> {
    return this.client.get(`/list/${entity}/${identifier}`);
  }

  async filterEvents(leagueId: string, season: string): Promise<FilterResponse<Event>> {
    return this.client.get(`/filter/events/${leagueId}/${season}`);
  }

  async filterByChannel(channelName: string): Promise<FilterResponse<Event>> {
    return this.client.get(`/filter/tv/channel/${channelName}`);
  }

  async filterByCountry(countryName: string): Promise<FilterResponse<Event>> {
    return this.client.get(`/filter/tv/country/${countryName}`);
  }

  async filterBySport(sportName: string): Promise<FilterResponse<Event>> {
    return this.client.get(`/filter/tv/sport/${sportName}`);
  }

  async all<T extends keyof AllEntities>(entity: T): Promise<AllResponse<AllEntities[T]>> {
    return this.client.get(`/all/${entity}`);
  } 

}

export default SportsDBSDK;
