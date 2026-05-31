import { useState, useEffect } from "react";
import type { DlssGame, DlssData, HltbInfo, SteamInfo, SteamRating, MetacriticInfo, UpscalingInfo } from "../types";

// Raw shape of each entry in game_data.json
interface GameDataEntry {
  steam?:      { found?: boolean; appid?: number; rating?: SteamRating; pct?: number; total?: number; image?: string; release_date?: string; tags?: string[] };
  hltb?:       { found?: boolean; hltb_id?: number; main?: number; extra?: number; complete?: number; coop?: number; pvp?: number; speed?: number; all_styles?: number };
  metacritic?: { found?: boolean; score?: number };
  pcgw?:       { found?: boolean; fsr_version?: string; xess_version?: string };
  image?:      string; // Fallback cover image for non-Steam games (e.g. IGDB)
}

interface GameData {
  games: DlssGame[];
  hltb: Record<string, HltbInfo>;
  steam: Record<string, SteamInfo>;
  metacritic: Record<string, MetacriticInfo>;
  upscaling: Record<string, UpscalingInfo>;
  images: Record<string, string>;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useGameData(): GameData {
  const [games, setGames] = useState<DlssGame[]>([]);
  const [hltb, setHltb] = useState<Record<string, HltbInfo>>({});
  const [steam, setSteam] = useState<Record<string, SteamInfo>>({});
  const [metacritic, setMetacritic] = useState<Record<string, MetacriticInfo>>({});
  const [upscaling, setUpscaling] = useState<Record<string, UpscalingInfo>>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchJson = <T,>(url: string): Promise<T> =>
      fetch(url, { signal }).then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${url}`);
        return r.json() as Promise<T>;
      });

    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetchJson<DlssData>(`${base}dlss-rt-games-apps-overrides.json`),
      fetchJson<Record<string, GameDataEntry>>(`${base}game_data.json`),
    ])
      .then(([dlss, raw]) => {
        if (signal.aborted) return;
        const filtered = dlss.data
          .filter((e) => e.type === "Game")
          .map((e) => ({ ...e, name: String(e.name) }));

        // Extract per-source records from unified game_data.json
        const steamData: Record<string, SteamInfo> = {};
        const hltbData: Record<string, HltbInfo> = {};
        const metacriticData: Record<string, MetacriticInfo> = {};
        const upscalingData: Record<string, UpscalingInfo> = {};
        const imageData: Record<string, string> = {};

        for (const [name, entry] of Object.entries(raw)) {
          if (entry.steam?.found)      steamData[name]      = entry.steam as SteamInfo;
          if (entry.hltb?.found)       hltbData[name]       = entry.hltb as HltbInfo;
          if (entry.metacritic?.found && entry.metacritic.score != null)
                                       metacriticData[name] = entry.metacritic as MetacriticInfo;
          if (entry.pcgw?.found)       upscalingData[name]  = entry.pcgw as UpscalingInfo;
          if (entry.image)             imageData[name]      = entry.image.startsWith("http") ? entry.image : `${base}${entry.image}`;
        }

        setGames(filtered);
        setSteam(steamData);
        setHltb(hltbData);
        setMetacritic(metacriticData);
        setUpscaling(upscalingData);
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

  return { games, hltb, steam, metacritic, upscaling, images, loading, error, retry };
}
