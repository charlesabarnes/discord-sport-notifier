import axios, { AxiosInstance } from 'axios';

class SportsDBClient {
  private apiKey: string;
  private baseUrl: string;
  private httpClient: AxiosInstance;

  constructor(apiKey: string, baseUrl = 'https://www.thesportsdb.com/api/v2/json') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-API-KEY': this.apiKey,
      },
    });
  }

  async get<T>(path: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const response = await this.httpClient.get<T>(path, { params });
      return response.data;
    } catch (error) {
      throw new Error(`SportsDB API error: ${error}`);
    }
  }
}

export default SportsDBClient;
