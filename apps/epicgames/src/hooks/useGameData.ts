import { useState, useEffect } from "react";
import type { EpicGame, HltbInfo, SteamInfo, SteamRating, MetacriticInfo, EpicInfo } from "../types";

interface GameDataEntry {
  steam?: { found?: boolean; appid?: number; rating?: SteamRating; pct?: number; total?: number; image?: string };
  hltb?: { found?: boolean; hltb_id?: number; main?: number; extra?: number; complete?: number; coop?: number; pvp?: number; speed?: number; all_styles?: number };
  metacritic?: { found?: boolean; score?: number; user_score?: number; slug?: string };
  epic?: { slug: string; free_dates: { start: string; end: string }[] };
}

interface GameData {
  games: EpicGame[];
  hltb: Record<string, HltbInfo>;
  steam: Record<string, SteamInfo>;
  metacritic: Record<string, MetacriticInfo>;
  epic: Record<string, EpicInfo>;
  images: Record<string, string>;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useGameData(): GameData {
  const [games, setGames] = useState<EpicGame[]>([]);
  const [hltb, setHltb] = useState<Record<string, HltbInfo>>({});
  const [steam, setSteam] = useState<Record<string, SteamInfo>>({});
  const [metacritic, setMetacritic] = useState<Record<string, MetacriticInfo>>({});
  const [epic, setEpic] = useState<Record<string, EpicInfo>>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const base = import.meta.env.BASE_URL;
    fetch(`${base}game_data.json`, { signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load game_data.json`);
        return r.json() as Promise<Record<string, GameDataEntry>>;
      })
      .then((raw) => {
        if (signal.aborted) return;

        const gameList: EpicGame[] = [];
        const steamData: Record<string, SteamInfo> = {};
        const hltbData: Record<string, HltbInfo> = {};
        const metacriticData: Record<string, MetacriticInfo> = {};
        const epicData: Record<string, EpicInfo> = {};
        const imageData: Record<string, string> = {};

        for (const [name, entry] of Object.entries(raw)) {
          const slug = entry.epic?.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          gameList.push({ name, slug });

          if (entry.steam?.found) {
            steamData[name] = entry.steam as SteamInfo;
            if (entry.steam.image) imageData[name] = entry.steam.image;
          }
          if (entry.hltb?.found) hltbData[name] = entry.hltb as HltbInfo;
          if (entry.metacritic?.found) metacriticData[name] = entry.metacritic as MetacriticInfo;
          if (entry.epic) {
            if (entry.epic.free_dates) {
              entry.epic.free_dates.sort((a: { start: string }, b: { start: string }) => a.start.localeCompare(b.start));
            }
            epicData[name] = entry.epic;
          }
        }

        setGames(gameList);
        setSteam(steamData);
        setHltb(hltbData);
        setMetacritic(metacriticData);
        setEpic(epicData);
        setImages(imageData);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [retryCount]);

  const retry = () => { setError(null); setLoading(true); setRetryCount((c) => c + 1); };

  return { games, hltb, steam, metacritic, epic, images, loading, error, retry };
}
