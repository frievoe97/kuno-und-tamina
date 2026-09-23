import lyricsData from "../kumina_lyrics.json";

/** Zeiten sind Sekunden ab Songanfang. */
export type LyricWord = {
  text: string;
  start: number;
  end: number;
};

export type LyricLine = {
  text: string;
  start: number;
  end: number;
  words: LyricWord[];
};

export const LYRICS: LyricLine[] = lyricsData.lines;
