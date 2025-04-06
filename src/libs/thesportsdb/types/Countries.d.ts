
export interface Country {
  idAPIfootball: string | null; // ID for API Football (null if not available)
  code: string; // Country code (e.g., "AD" for Andorra)
  name_en: string; // Country name in English
  name_fr: string; // Country name in French
  flag_url_16: string; // URL to 16x16 flag icon
  flag_url_32: string; // URL to 32x32 flag icon
  flag_url_64: string; // URL to 64x64 flag icon
}
