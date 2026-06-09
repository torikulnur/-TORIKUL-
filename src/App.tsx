/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, MouseEvent } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Tv2, 
  Search, 
  Globe, 
  User, 
  ExternalLink, 
  Facebook, 
  Instagram, 
  RefreshCw, 
  Sparkles, 
  ChevronRight, 
  Info, 
  Star, 
  Heart, 
  Wifi, 
  SlidersHorizontal,
  Tv,
  Radio,
  Share2,
  History,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Hls from 'hls.js';

// Define TS Interface for IPTV channels
interface Channel {
  name: string;
  logo: string;
  url: string;
  category: string;
  country: string;
}
// Robust, fail-safe high-quality default streams that load instantly
const STABLE_DEFAULT_CHANNELS: Channel[] = [
  {
    name: "T Sports HD Live",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/b4/T_Sports_logo.svg", // এটি ব্যাকআপ লোগো, চাইলে তরিকুল ভাইয়ের আসল লোগো দিতে পারেন
    url: "https://bdiptv.streamway.top/tsports/index.m3u8", // এখানে তরিকুল ভাইয়ের সচল T Sports m3u8 লিংকটি বসিয়ে দেবেন
    category: "Sports",
    country: "BD"
  },
  {
    name: "NASA HD Live Space Stream",
    logo: "https://www.nasa.gov/wp-content/themes/nasa/assets/images/nasa-logo.svg",
    url: "https://ntv1.nasatv.live/nasatv/nasatv_hd/playlist.m3u8",
    category: "News",
    country: "US"
  },
  {
    name: "Deutsche Welle (DW) English",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Deutsche_Welle_logo.svg",
    url: "https://dwamdstream102.akamaized.net/hls/live/2014190/dwstream102/index.m3u8",
    category: "News",
    country: "Global"
  },
  {
    name: "France 24 HD International News",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/ee/France_24_logo.svg",
    url: "https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8",
    category: "News",
    country: "Global"
  },
  {
    name: "Al Jazeera English Channel",
    logo: "https://upload.wikimedia.org/wikipedia/en/f/f2/Al_jazeera_logo.svg",
    url: "https://live-hls-web-aje.getaj.net/AJE/index.m3u8",
    category: "News",
    country: "Global"
  },
  {
    name: "Red Bull TV Live Extreme Sports",
    logo: "https://upload.wikimedia.org/wikipedia/en/f/f5/Red_Bull_TV_logo.svg",
    url: "https://rbmn-live.akamaized.net/hls/live/590945/bo-live-01/master.m3u8",
    category: "Sports",
    country: "Global"
  }
];

;

export default function App() {
  // Navigation Screens Tabs state
  const [activeTab, setActiveTab] = useState<'streams' | 'favorites' | 'profile'>('streams');

  // Channel Lists States
  const [channels, setChannels] = useState<Channel[]>(STABLE_DEFAULT_CHANNELS);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>(STABLE_DEFAULT_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState<Channel>(STABLE_DEFAULT_CHANNELS[0]);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [recentlyWatched, setRecentlyWatched] = useState<Channel[]>([]);
  
  // Filtering & Query States
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Status & Fetching states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [latencyText, setLatencyText] = useState<string>("24ms");
  const [activeBitrate, setActiveBitrate] = useState<string>("Auto-1080p");

  // Video Custom Controls state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [fitMode, setFitMode] = useState<'contain' | 'fill' | 'cover'>('contain');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const bioCardRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastTapRef = useRef<number>(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load favorites and recently watched from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ttech_favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to parse favorites", e);
    }
    try {
      const savedRecent = localStorage.getItem('ttech_recently_watched');
      if (savedRecent) {
        setRecentlyWatched(JSON.parse(savedRecent));
      }
    } catch (e) {
      console.error("Failed to parse recently watched", e);
    }
    
    // Simulate real-time cyber status latency alterations
    const interval = setInterval(() => {
      const ping = Math.floor(Math.random() * 15) + 12;
      setLatencyText(`${ping}ms`);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Sync selectedChannel changes to recently watched list (stores at most 3 items unique)
  useEffect(() => {
    if (!selectedChannel) return;
    setRecentlyWatched((prev) => {
      const filtered = prev.filter(chan => chan.url !== selectedChannel.url);
      const updated = [selectedChannel, ...filtered].slice(0, 3);
      localStorage.setItem('ttech_recently_watched', JSON.stringify(updated));
      return updated;
    });
  }, [selectedChannel]);

  // Save favorites to storage
  const toggleFavorite = (channel: Channel, e: MouseEvent) => {
    e.stopPropagation();
    let updated: Channel[];
    const exists = favorites.some(fav => fav.url === channel.url);
    if (exists) {
      updated = favorites.filter(fav => fav.url !== channel.url);
      showToast(`Removed ${channel.name} from Favourites`);
    } else {
      updated = [...favorites, channel];
      showToast(`Added ${channel.name} to Favourites`);
    }
    setFavorites(updated);
    localStorage.setItem('ttech_favorites', JSON.stringify(updated));
  };

  // Helper to trigger cyber styled temporary on-screen notification overlays
  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // HLS.js streaming configuration and lifecycle logic
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    setIsBuffering(true);

    // Release ongoing instances
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Playback logic based on browser capabilities: native HLS vs Hls.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });
      hlsRef.current = hls;
      hls.loadSource(selectedChannel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        if (isPlaying) {
          video.play().catch(() => setIsPlaying(false));
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const height = hls.levels[data.level]?.height || '1080';
        setActiveBitrate(`${height}p Video`);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn("HLS playback issue:", data.type, data.details);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setIsBuffering(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Direct Apple device native safari stream binding
      video.src = selectedChannel.url;
      video.addEventListener('loadedmetadata', () => {
        setIsBuffering(false);
        if (isPlaying) {
          video.play().catch(() => setIsPlaying(false));
        }
      });
    } else {
      setIsBuffering(false);
      showToast("HLS format streaming unsupported by this web engine.");
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedChannel]);

  // Sync isPlaying controls state with actual DOM video trigger
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Sync Volume level state with actual DOM video level
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  // Multilevel Fetching System (with proxy support, Github parsing, and local fallback)
  const fetchIPTVDatabase = useCallback(async (countryCode: string) => {
    setIsLoading(true);
    setFetchError(null);

    // Clear and reset list to focus loading feedback
    let targetEndpoints: string[] = [];

    // Formulate endpoints prioritized by user selection
    if (countryCode === 'bd') {
      targetEndpoints = [
        "https://raw.githubusercontent.com/foridul422/IPTV-/main/bd.json",
        "https://api.allorigins.win/get?url=" + encodeURIComponent("https://raw.githubusercontent.com/foridul422/IPTV-/main/bd.json")
      ];
    } else if (countryCode === 'in') {
      targetEndpoints = [
        "https://raw.githubusercontent.com/foridul422/IPTV-/main/in.json",
        "https://api.allorigins.win/get?url=" + encodeURIComponent("https://raw.githubusercontent.com/foridul422/IPTV-/main/in.json")
      ];
    } else if (countryCode === 'us') {
      targetEndpoints = [
        "https://raw.githubusercontent.com/foridul422/IPTV-/main/us.json",
        "https://api.allorigins.win/get?url=" + encodeURIComponent("https://raw.githubusercontent.com/foridul422/IPTV-/main/us.json")
      ];
    } else {
      // Global / Master list requests
      targetEndpoints = [
        "https://raw.githubusercontent.com/foridul422/IPTV-/main/channels.json",
        "https://api.allorigins.win/get?url=" + encodeURIComponent("https://raw.githubusercontent.com/foridul422/IPTV-/main/channels.json")
      ];
    }

    // Try endpoints in sequence
    let fetchedData: any = null;
    let success = false;

    for (const url of targetEndpoints) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!response.ok) throw new Error("HTTP error " + response.status);
        const json = await response.json();
        
        // Handle AllOrigins structure which embeds content string
        if (json && typeof json.contents === 'string') {
          fetchedData = JSON.parse(json.contents);
        } else {
          fetchedData = json;
        }

        if (Array.isArray(fetchedData) && fetchedData.length > 0) {
          success = true;
          break; // Successfully got array of channels
        }
      } catch (err) {
        console.warn(`Attempt failed for URL: ${url}`, err);
      }
    }

    // Ultimate Fail-safe Fallback Routine (if custom country fetches fail, switch instantly to Foridul's main master db)
    if (!success) {
      console.log("Triggering fail-safe master fallback fetched repository...");
      showToast("Loading Fallback Database System...");
      try {
        const masterFallbackUrl = "https://raw.githubusercontent.com/foridul422/IPTV-/main/channels.json";
        const response = await fetch(masterFallbackUrl, { signal: AbortSignal.timeout(8000) });
        if (response.ok) {
          const json = await response.json();
          if (Array.isArray(json) && json.length > 0) {
            fetchedData = json;
            success = true;
          }
        }
      } catch (masterErr) {
        console.error("Master fallback failed completely:", masterErr);
      }
    }

    if (success && Array.isArray(fetchedData)) {
      // Clean and normalize incoming database attributes to prevent crashes
      const cleaned = fetchedData.map((item: any, idx: number) => {
        // Unify properties to match Channel schema robustness
        const name = item.name || item.title || item.channel || item.tvg_name || `Stream Channel #${idx + 1}`;
        const logo = item.logo || item.tvg_logo || item.image || item.icon || "https://images.unsplash.com/photo-1540747737956-37872404f80a?w=120&auto=format&fit=crop&q=60";
        const url = item.url || item.stream_url || item.link || item.stream || "";
        
        // Auto categorize if missing or blank
        let category = item.category || item.genre || item.group || "Other";
        // Smart keyword matcher to group neatly into our 5 categorical horizontal pills
        const lowerName = name.toLowerCase();
        const lowerCategory = category.toLowerCase();
        
        if (lowerName.includes("sport") || lowerCategory.includes("sport") || lowerCategory.includes("cricket") || lowerName.includes("tensity")) {
          category = "Sports";
        } else if (lowerName.includes("movie") || lowerCategory.includes("movie") || lowerName.includes("cinema") || lowerCategory.includes("cinema") || lowerCategory.includes("entertainment")) {
          category = "Movies";
        } else if (lowerName.includes("news") || lowerCategory.includes("news")) {
          category = "News";
        } else if (lowerName.includes("music") || lowerCategory.includes("music") || lowerCategory.includes("song") || lowerName.includes("radio")) {
          category = "Music";
        } else {
          category = "All"; // Place standard default fallback
        }

        // Determine country representation
        const itemCountry = item.country || item.lang || (countryCode !== 'all' ? countryCode.toUpperCase() : "Global");

        return { name, logo, url, category, country: itemCountry };
      }).filter((chan: Channel) => chan.url.trim() !== "");

      // Merge with stable local fallback streaming nodes to ensure user is never met with blank channel listings!
      setChannels([...STABLE_DEFAULT_CHANNELS, ...cleaned]);
      showToast(`Loaded ${cleaned.length} Cyber Channel Feeds`);
    } else {
      // If network is completely offline, maintain default channels and inform cleanly
      setFetchError("System Offline. Running Offline-Proof Secure Feeds.");
      setChannels(STABLE_DEFAULT_CHANNELS);
      showToast("Running secure fallback stream nodes");
    }
    setIsLoading(false);
  }, []);

  // Fetch directory based on selected country
  useEffect(() => {
    fetchIPTVDatabase(selectedCountry);
  }, [selectedCountry, fetchIPTVDatabase]);

  // Combine Search and Dual Filters dynamically
  useEffect(() => {
    let result = channels;

    // Apply country selection filter if not 'all'
    if (selectedCountry !== 'all') {
      result = result.filter(chan => 
        chan.country.toLowerCase() === selectedCountry.toLowerCase() ||
        (selectedCountry === 'bd' && chan.country.toUpperCase() === 'BD') ||
        (selectedCountry === 'in' && chan.country.toUpperCase() === 'IN') ||
        (selectedCountry === 'us' && chan.country.toUpperCase() === 'US')
      );
    }

    // Apply categorical filters matching standard pills
    if (selectedCategory !== 'All') {
      result = result.filter(chan => 
        chan.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Apply live character search query filters
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(chan => 
        chan.name.toLowerCase().includes(q) || 
        chan.category.toLowerCase().includes(q) ||
        chan.country.toLowerCase().includes(q)
      );
    }

    setFilteredChannels(result);
  }, [channels, selectedCountry, selectedCategory, searchQuery]);

  // Fullscreen API implementation representing native experience
  const toggleFullscreenNative = () => {
    const container = videoContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
        // Attempt to lock screen orientation to landscape
        try {
          const orientation = (screen as any).orientation || (window.screen as any).orientation;
          if (orientation && typeof orientation.lock === 'function') {
            orientation.lock('landscape').catch((err: any) => {
              console.warn("Screen orientation lock rejected:", err);
            });
          }
        } catch (e) {
          console.warn("Screen orientation lock failed to execute:", e);
        }
      }).catch(err => {
        // Try Safari-specific presentation mode fallbacks if regular requests throw errors
        const v = videoRef.current as any;
        if (v && v.webkitEnterFullscreen) {
          v.webkitEnterFullscreen();
        } else {
          console.warn("Fullscreen toggle failed:", err);
          showToast("Fullscreen configuration restricted by sandbox.");
        }
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        // Unlock screen orientation on normal exit
        try {
          const orientation = (screen as any).orientation || (window.screen as any).orientation;
          if (orientation && typeof orientation.unlock === 'function') {
            orientation.unlock();
          }
        } catch (e) {
          console.warn("Screen orientation unlock failed:", e);
        }
      }).catch(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Keep internal state updated on native escape keypress / exit fullscreen events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      // If the user exited fullscreen (e.g. via back key, gesture, esc), ensure orientation is unlocked
      if (!isCurrentlyFullscreen) {
        try {
          const orientation = (screen as any).orientation || (window.screen as any).orientation;
          if (orientation && typeof orientation.unlock === 'function') {
            orientation.unlock();
          }
        } catch (e) {
          console.warn("Auto-unlock of screen orientation failed:", e);
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Aspect-ratio layout Sizing: Cycle fitting mode seamlessly
  const cycleAspectFitting = () => {
    let nextMode: 'contain' | 'fill' | 'cover' = 'contain';
    if (fitMode === 'contain') {
      nextMode = 'fill';
      showToast("Ratio: FIT / STRETCH (fill)");
    } else if (fitMode === 'fill') {
      nextMode = 'cover';
      showToast("Ratio: ZOOM STRETCH (cover)");
    } else {
      nextMode = 'contain';
      showToast("Ratio: ORIGINAL RETAINED (contain)");
    }
    setFitMode(nextMode);
  };

  // Video Double Tap Handler (triggers true fullscreen)
  const handleVideoTouch = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      toggleFullscreenNative();
    }
    lastTapRef.current = now;
  };

  // Floating Corner Profile Avatar Handler (Sticky Header Widget Response)
  const handleFloatingAvatarClick = () => {
    setActiveTab('profile');
    showToast("Opening Creative Engineer Profile...");
    
    // Slight delay to allow tab render, then perform premium smooth scroll to bio card
    setTimeout(() => {
      if (bioCardRef.current) {
        bioCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Trigger a temporary cyan neon visual highlight border animation on the bio card
        bioCardRef.current.classList.add('neon-active');
        setTimeout(() => {
          bioCardRef.current?.classList.remove('neon-active');
        }, 3000);
      }
    }, 350);
  };

  // Format country code into aesthetic flag emojis or labels
  const getCountryLabel = (code: string) => {
    switch (code.toLowerCase()) {
      case 'bd': return "🇧🇩 Bangladesh";
      case 'in': return "🇮🇳 India";
      case 'us': return "🇺🇸 USA Network";
      case 'global': return "🌐 Global Feeds";
      default: return `🌐 ${code.toUpperCase()}`;
    }
  };

  return (
    <div className="min-h-screen bg-cyber-dark text-slate-100 flex flex-col font-sans scanlines max-w-md mx-auto relative shadow-2xl border-x border-slate-900/80">
      
      {/* 1. STICKY MOUNTED STREAMING PANEL */}
      <section className="sticky top-0 z-[100] bg-black shadow-lg">
        
        {/* GLOBAL SYSTEM HEADER STATUS BAR */}
        <div className="bg-slate-950/95 border-b border-slate-900/40 px-3.5 py-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-400 select-none z-[110]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse"></span>
            <span className="text-slate-300 font-bold tracking-wider text-[9px] uppercase">T-Tech Cyber Link</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] text-zinc-500">SECURE CONTEXT</span>
          </div>
        </div>

        <div 
          ref={videoContainerRef} 
          className="relative bg-neutral-950 aspect-video w-full group overflow-hidden"
          onClick={handleVideoTouch}
        >
          {/* Active Player Stream Rendering Element */}
          <video
            ref={videoRef}
            aria-label="IPTV Stream Live Feed Video"
            className={`w-full h-full transition-all duration-300 pointer-events-none`}
            style={{ objectFit: fitMode }}
            playsInline
          />

          {/* Buffering Cyber Pulse Overlay */}
          {(isBuffering || isLoading) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 backdrop-blur-sm">
              <span className="relative flex h-10 w-10">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-10 w-10 bg-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.6)]"></span>
              </span>
              <p className="mt-4 text-xs font-mono font-bold tracking-wider text-cyan-400 text-glow-cyan animate-pulse">
                DECRYPTING SIGNAL FEED...
              </p>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                {selectedChannel.name}
              </p>
            </div>
          )}

          {/* Sizing Fitting Toast Notifications */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-cyan-500/50 backdrop-blur-md px-3 py-1.5 rounded-full z-30 text-xs font-mono text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                {toastMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Standard controller panel overlays (Visible on Hover/Tap/Controls) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 z-10">
            
            {/* Top-bar Information details */}
            <div className="flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse uppercase">
                  <span className="w-1 h-1 rounded-full bg-white inline-block animate-ping"></span>
                  Live
                </span>
                <p className="text-xs font-bold text-white tracking-wide truncate max-w-[200px]" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                  {selectedChannel.name}
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[9px] text-cyan-400 bg-slate-950/70 border border-cyan-500/30 px-1.5 py-0.5 rounded backdrop-blur-sm">
                <Wifi className="w-2.5 h-2.5 text-cyan-500 animate-pulse" />
                <span>LATENCY: {latencyText}</span>
              </div>
            </div>

            {/* Middle Quick Assist Action HUD */}
            <div className="flex justify-center items-center pointer-events-auto">
              {!isPlaying && (
                <button 
                  onClick={() => setIsPlaying(true)}
                  aria-label="Start Stream Playback"
                  className="w-12 h-12 flex items-center justify-center bg-cyan-500 text-slate-950 rounded-full cursor-pointer hover:scale-115 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.8)] border border-cyan-300/40"
                >
                  <Play className="w-6 h-6 fill-slate-950 text-slate-950 ml-0.5" />
                </button>
              )}
            </div>

            {/* Bottom-bar precise controller buttons */}
            <div className="flex flex-col gap-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              
              {/* Virtual Position Scrubber (Neon Styled static element representing constant live feed buffering) */}
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden relative border border-slate-900">
                <div className="absolute top-0 left-0 bottom-0 w-full bg-cyan-500/25 animate-pulse"></div>
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              </div>

              {/* Interaction Row representing the user requested Fullscreen trigger and Aspect Fit button */}
              <div className="flex items-center justify-between">
                
                {/* Volume, Play controls */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    aria-label={isPlaying ? "Pause Stream" : "Play Stream"}
                    className="text-white hover:text-cyan-400 active:scale-90 transition-all cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5" />}
                  </button>

                  <div className="flex items-center gap-1.5 group/volume">
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      aria-label={isMuted ? "Unmute Volume" : "Mute Volume"}
                      className="text-white hover:text-cyan-400 cursor-pointer"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </button>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05"
                      aria-label="Set Volume Level"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        setIsMuted(false);
                      }}
                      className="w-12 md:w-16 h-1 rounded-lg accent-cyan-400 bg-neutral-700 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Sizing ratio mode & True Fullscreen controls */}
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  {/* Bitrate node */}
                  <span className="hidden sm:inline text-neutral-400">{activeBitrate}</span>

                  {/* SIZING BUTTON: stretch, fill, zoom */}
                  <button 
                    onClick={cycleAspectFitting}
                    aria-label="Adjust Object Fit Stretch Mode"
                    className="bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 text-cyan-400 border border-cyan-500/40 px-2.5 py-1 rounded text-[10px] font-bold tracking-wider hover:shadow-[0_0_8px_rgba(6,182,212,0.4)] cursor-pointer transition-all"
                  >
                    SIZING: {fitMode.toUpperCase()}
                  </button>

                  {/* TRUE FULLSCREEN API TOGGLE */}
                  <button 
                    onClick={toggleFullscreenNative}
                    aria-label="Toggle Fullscreen API Viewport Mode"
                    className="text-white hover:text-cyan-400 active:scale-80 transition-all cursor-pointer border border-neutral-700 p-1.5 rounded-md bg-neutral-900/50"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4 text-cyan-300" /> : <Maximize className="w-4 h-4 text-cyan-400" />}
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. FLOATING CORNER PROFILE AVATAR (Sticky Header Widget Layer) */}
      <div className="absolute top-[215px] sm:top-[260px] right-4 z-[90] pointer-events-auto">
        <button 
          onClick={handleFloatingAvatarClick}
          aria-label="Switch navigation to developer creators profile"
          className="relative bg-cyber-deep hover:bg-cyan-950 p-[3px] rounded-full active:scale-90 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-500 cursor-pointer avatar-border-pulse group"
        >
          {/* Embedding hardcoded core profile avatar image path */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden">
            <img 
              src="https://i.ibb.co.com/0RcPrCbv/IMG-20260608-012226.jpg" 
              alt="Torikul" 
              referrerPolicy="no-referrer"
              className="corner-avatar-img w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            {/* Pulsing state visual ring */}
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent"></div>
          </div>
          {/* Mini Tech Badge */}
          <div className="absolute -bottom-1 -right-1 bg-cyan-400 text-slate-950 font-bold text-[8px] px-1 rounded shadow-md uppercase tracking-tighter">
            PRO
          </div>
        </button>
      </div>

      {/* 3. SCROLLABLE FEED AND MAIN INTERACTIVE AREAS */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        
        {/* Dynamic Navigation Page Render */}
        <AnimatePresence mode="wait">
          {activeTab === 'streams' && (
            <motion.div
              key="streams-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              
              {/* BRANDING HUB & LIVE STATS BAR */}
              <div className="flex justify-between items-center bg-cyber-deep/60 backdrop-blur-md border border-slate-800/80 p-3 rounded-xl shadow-md">
                <div>
                  <h1 className="text-xl font-display font-extrabold text-white tracking-wider flex items-center gap-1">
                    T-TECH <span className="text-cyan-400 text-glow-cyan">IPTV</span>
                  </h1>
                  <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                    System Hub V2.9
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-cyan-400 flex items-center justify-end gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    ONLINE
                  </div>
                  <div className="text-[9px] text-zinc-500 font-mono">
                    Uptime: 99.98%
                  </div>
                </div>
              </div>

              {/* DUAL FILTER DIRECTORY MODULE: A. COUNTRY SELECTOR DROP-DOWN */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    Secure Location Node
                  </label>
                  <span className="text-[10px] font-mono text-cyan-400/80">
                    Auto-Proxy Enabled
                  </span>
                </div>
                
                {/* Cybersecurity styled drop-down dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full text-left bg-cyber-deep/80 backdrop-blur-md border border-slate-800 focus:border-cyan-500 px-4 py-3 rounded-lg text-sm text-whites select-none transition-all flex items-center justify-between cursor-pointer group shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                  >
                    <span className="font-medium text-slate-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse"></span>
                      {getCountryLabel(selectedCountry === 'all' ? 'All Origins Feed' : selectedCountry)}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-90 text-cyan-400' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.ul
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute w-full mt-1.5 bg-slate-950/95 border border-slate-800 rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.8)] overflow-hidden z-50 divide-y divide-slate-900"
                      >
                        {[
                          { id: 'all', label: '🌐 All Origins (Global Master)' },
                          { id: 'bd', label: '🇧🇩 Bangladesh Network' },
                          { id: 'in', label: '🇮🇳 India Hot-Streams' },
                          { id: 'us', label: '🇺🇸 United States Feeds' }
                        ].map((option) => (
                          <li key={option.id}>
                            <button
                              onClick={() => {
                                setSelectedCountry(option.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${selectedCountry === option.id ? 'bg-cyan-950/40 text-cyan-400 font-bold border-l-2 border-cyan-500' : 'text-slate-300 hover:bg-slate-900'}`}
                            >
                              {option.label}
                              {selectedCountry === option.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>}
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* DUAL FILTER DIRECTORY MODULE: B. HORIZONTAL SCROLLING CATEGORY PILLS */}
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-1">
                  Category Streamway
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1.5 pt-1 scrollbar-none scroll-smooth">
                  {["All", "Sports", "Movies", "News", "Music"].map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer uppercase tracking-wider shrink-0 transition-all duration-300 ${selectedCategory === category ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.5)] font-bold scale-102 border-cyan-400 border' : 'bg-slate-900/80 hover:bg-slate-800 border border-slate-800/60 text-slate-400'}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* LIVE SEARCH & CHANNELS SUMMARY COUNT */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search premium network streams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 px-9 py-2.5 rounded-lg text-xs font-mono placeholder-zinc-500 text-white outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 hover:text-cyan-400 cursor-pointer"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
                <div className="bg-slate-950/80 border border-slate-800 py-2.5 px-3 rounded-lg text-center min-w-[70px]">
                  <p className="text-[9px] text-zinc-500 font-mono leading-none">TOTAL</p>
                  <p className="text-sm font-mono font-bold text-cyan-400 mt-1">{filteredChannels.length}</p>
                </div>
              </div>

              {/* RECENTLY WATCHED CARDS PORTABLE HUD */}
              {recentlyWatched.length > 0 && (
                <div className="space-y-2 bg-cyber-deep/40 border border-slate-850 p-3 rounded-xl shadow-inner-glow">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-zinc-400 font-mono flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                      <History className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      Recently Watched
                    </span>
                    <button 
                      onClick={() => {
                        setRecentlyWatched([]);
                        localStorage.removeItem('ttech_recently_watched');
                        showToast("Cleared play history successfully");
                      }}
                      className="text-zinc-500 hover:text-zinc-400 font-mono text-[9px] uppercase cursor-pointer"
                    >
                      Clear Memory
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {recentlyWatched.map((chan, idx) => {
                      const isCurrent = selectedChannel.url === chan.url;
                      return (
                        <div
                          key={`recent-${chan.url}-${idx}`}
                          onClick={() => {
                            setSelectedChannel(chan);
                            setIsPlaying(true);
                            showToast(`Tuning into: ${chan.name}`);
                          }}
                          className={`group relative bg-slate-950/75 border rounded-lg p-2 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:bg-slate-900/90 overflow-hidden ${
                            isCurrent 
                              ? 'border-cyan-500 bg-cyan-950/20 shadow-[0_0_8px_rgba(6,182,212,0.25)] scale-[1.02]' 
                              : 'border-slate-800/60 hover:border-slate-700'
                          }`}
                        >
                          {/* Mini logo rounded frame */}
                          <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-800/80 shrink-0 mb-1.5 relative">
                            <img
                              src={chan.logo}
                              alt=""
                              className="w-full h-full object-contain p-0.5"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const span = document.createElement('span');
                                  span.className = 'text-cyan-400 font-mono text-[9px] font-bold';
                                  span.innerText = chan.name.slice(0, 2).toUpperCase();
                                  parent.appendChild(span);
                                }
                              }}
                            />
                            {isCurrent && (
                              <div className="absolute inset-0 bg-cyan-950/40 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                              </div>
                            )}
                          </div>
                          
                          {/* Station Name */}
                          <p className={`text-[10px] font-bold leading-tight truncate w-full transition-colors ${isCurrent ? 'text-cyan-400 font-extrabold' : 'text-slate-300 group-hover:text-white'}`}>
                            {chan.name}
                          </p>
                          
                          {/* Category Tag */}
                          <span className="text-[7.5px] font-mono text-zinc-500 uppercase mt-0.5 max-w-full truncate">
                            {chan.category}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STREAM SELECTIONS MAIN LIST & GRID */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-zinc-400 font-mono flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    Available Transmitters
                  </span>
                  <button 
                    onClick={() => {
                      fetchIPTVDatabase(selectedCountry);
                      showToast("Refreshing dynamic channels list...");
                    }} 
                    className="text-cyan-400/80 hover:text-cyan-400 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    RE-SYNC
                  </button>
                </div>

                {fetchError && (
                  <div className="bg-amber-600/10 border border-amber-500/30 text-amber-400 px-3 py-2 rounded-lg text-xs font-mono text-center">
                    {fetchError}
                  </div>
                )}

                {/* Staggered Channel Bento-Grid List Container */}
                {isLoading ? (
                  <div className="space-y-2 py-6">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="bg-slate-900/40 border border-slate-800/40 h-16 w-full rounded-xl animate-pulse flex items-center px-4 justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-800 rounded-lg"></div>
                          <div className="space-y-2">
                            <div className="w-28 h-3.5 bg-slate-800 rounded"></div>
                            <div className="w-16 h-2 bg-slate-800 rounded"></div>
                          </div>
                        </div>
                        <div className="w-6 h-6 bg-slate-800 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredChannels.length === 0 ? (
                  <div className="text-center py-12 border border-slate-900 rounded-2xl bg-neutral-900/20">
                    <Tv2 className="w-10 h-10 text-slate-700 mx-auto mb-2 animate-bounce" />
                    <p className="text-xs font-mono text-zinc-500">NO SIGNAL FREQUENCIES DETECTED</p>
                    <button 
                      onClick={() => {
                        setSelectedCountry('all');
                        setSelectedCategory('All');
                        setSearchQuery('');
                      }} 
                      className="mt-3 bg-cyan-950/80 border border-cyan-500/40 hover:bg-cyan-950 px-3 py-1 bg-cyan-950/50 rounded-md text-[10px] text-cyan-400 font-mono"
                    >
                      RESET FILTERS
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredChannels.map((chan, idx) => {
                      const isCurrent = selectedChannel.url === chan.url;
                      const isFav = favorites.some(fav => fav.url === chan.url);

                      return (
                        <div
                          key={`${chan.url}-${idx}`}
                          onClick={() => {
                            setSelectedChannel(chan);
                            setIsPlaying(true);
                          }}
                          className={`group relative bg-cyber-deep/80 border rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all duration-300 hover:bg-slate-900/90 ${isCurrent ? 'border-cyan-500 bg-cyan-950/15 shadow-[0_0_12px_rgba(6,182,212,0.15)] scale-101' : 'border-slate-800/80 hover:border-slate-700'}`}
                        >
                          {/* Channel Logo and Info */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Logo Frame with Initial Fallback */}
                            <div className="w-12 h-12 rounded-lg bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800 shrink-0 relative">
                              <img
                                src={chan.logo}
                                alt={chan.name}
                                className="w-full h-full object-contain p-1"
                                loading="lazy"
                                onError={(e) => {
                                  // Beautiful local typographic text initials placeholder on broken imagery
                                  const target = e.currentTarget;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    const span = document.createElement('span');
                                    span.className = 'text-cyan-400 font-mono text-xs font-bold';
                                    span.innerText = chan.name.slice(0, 2).toUpperCase();
                                    parent.appendChild(span);
                                  }
                                }}
                              />
                            </div>

                            {/* Details meta */}
                            <div className="min-w-0 pr-2">
                              <p className={`text-xs font-bold truncate transition-colors ${isCurrent ? 'text-cyan-400' : 'text-slate-200 group-hover:text-white'}`}>
                                {chan.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="bg-slate-950 text-slate-400 text-[8px] font-mono px-1.5 py-0.5 rounded uppercase border border-slate-800">
                                  {chan.category}
                                </span>
                                <span className="text-zinc-600">|</span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {isCurrent ? "1420kb/s" : "Stable Sync"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Items side controls */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Favorite toggle bookmark */}
                            <button
                              onClick={(e) => toggleFavorite(chan, e)}
                              aria-label="Add to bookmark favourites collection"
                              className={`p-1.5 rounded-md border transition-all cursor-pointer ${isFav ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-transparent border-transparent text-zinc-500 hover:text-white hover:bg-slate-800'}`}
                            >
                              <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                            </button>

                            {/* Static cyber active stream indicator */}
                            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-950/80 border border-slate-800">
                              {isCurrent ? (
                                <span className="relative flex h-20 w-2 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                </span>
                              ) : (
                                <Play className="w-2.5 h-2.5 text-zinc-600 group-hover:text-cyan-400 group-hover:scale-110 transition-all fill-zinc-600 group-hover:fill-cyan-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
              
            </motion.div>
          )}

          {/* 4. BOOKMARKED FAVORITES BOARD TAB VIEW */}
          {activeTab === 'favorites' && (
            <motion.div
              key="favorites-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-display font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                    VAULT STATS
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    YOUR SYNCHRONIZED STORAGE FEEDS
                  </p>
                </div>
                <div className="bg-pink-950/20 border border-pink-500/20 px-3 py-1 rounded-md text-xs font-mono text-pink-400 font-semibold">
                  {favorites.length} CHANNELS
                </div>
              </div>

              {favorites.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-neutral-900/10 p-6">
                  <Star className="w-10 h-10 text-slate-700 mx-auto mb-3 animate-pulse" />
                  <p className="text-sm font-semibold text-slate-400">Vault Currently Empty</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[280px] mx-auto">
                    Click the star key next to any live channel stream inside the grid to lock it here for instant loading!
                  </p>
                  <button 
                    onClick={() => setActiveTab('streams')}
                    className="mt-4 bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-full text-xs hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] cursor-pointer"
                  >
                    DISCOVER NOW
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {favorites.map((chan, idx) => {
                    const isCurrent = selectedChannel.url === chan.url;
                    return (
                      <div
                        key={`fav-${chan.url}-${idx}`}
                        onClick={() => {
                          setSelectedChannel(chan);
                          setIsPlaying(true);
                          setActiveTab('streams');
                          showToast(`Tuning into Fav: ${chan.name}`);
                        }}
                        className={`group bg-cyber-deep/85 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all ${isCurrent ? 'border-pink-500 bg-pink-950/10' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800 shrink-0">
                            <img src={chan.logo} alt="" className="w-full h-full object-contain p-1" />
                          </div>
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                              {chan.name}
                            </p>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">
                              {chan.category} • {chan.country}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => toggleFavorite(chan, e)}
                            className="p-1.5 rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-400 cursor-pointer text-xs"
                          >
                            DISMISS
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* 5. CREATOR PROFILE SCREEN VIEW */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              
              {/* Creator Bio Card Mount Pinned Hook */}
              <div 
                ref={bioCardRef}
                className="bg-cyber-deep border border-slate-800/80 rounded-2xl p-5 shadow-2xl relative overflow-hidden transition-all duration-500"
                id="creator-bio-card"
              >
                {/* Cyberpunk circuit vector decorative layouts */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-pink-500/10 to-transparent rounded-tr-full pointer-events-none"></div>

                {/* Main Avatar Centerpiece with specified exact image requirement links */}
                <div className="flex flex-col items-center text-center mt-3 relative">
                  <div className="relative p-1.5 rounded-full bg-slate-950 border border-slate-800 shadow-md">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] bg-slate-900">
                      {/* Hardcoded profile interactive component anchor */}
                      <a 
                        href="https://ibb.co.com/0RcPrCbv" 
                        target="_blank" 
                        rel="noreferrer"
                        className="block w-full h-full cursor-pointer"
                        title="Torikul Islam - Founder of T-Tech"
                      >
                        <img 
                          src="https://i.ibb.co.com/0RcPrCbv/IMG-20260608-012226.jpg" 
                          alt="Torikul" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-full hover:scale-108 transition-transform duration-300"
                        />
                      </a>
                    </div>
                    {/* Live Developer Badge */}
                    <span className="absolute bottom-1 right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-slate-950"></span>
                    </span>
                  </div>

                  {/* Creator Text Information Metadata */}
                  <h2 className="text-xl font-display font-extrabold text-white mt-4 tracking-wider">
                    Torikul Islam
                  </h2>
                  <p className="text-cyan-400 font-mono text-xs mt-1 font-semibold tracking-wide text-glow-cyan">
                    Founder & Lead Developer of T-Tech
                  </p>
                  
                  {/* Glowing thin separator line */}
                  <div className="w-16 h-0.5 bg-gradient-to-r from-cyan-500 to-pink-500 my-4 rounded-full"></div>

                  {/* Custom tech bio */}
                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm px-2 text-justify">
                    Torikul Islam is a highly motivated system software engineer specialized in real-time media transport, ultra-low latency IPTV distribution architectures, and interactive client-side browser playback workflows.
                    With a sharp focus on mobile-first cyberpunk layout experiences and high-fidelity video processing, he crafts state-of-the-art Web IPTV apps utilizing custom decoders, custom responsive HTML5 video overlays, and intelligent third-party caching network engines.
                  </p>

                  {/* Meta Details List */}
                  <div className="w-full grid grid-cols-2 gap-2 mt-5">
                    <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-left">
                      <span className="text-[10px] text-zinc-500 font-mono block">SPECIALIZATION</span>
                      <span className="text-xs font-semibold text-slate-200 mt-1 block">HLS & IPTV Systems</span>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-left">
                      <span className="text-[10px] text-zinc-500 font-mono block">DEVELOPMENT CORE</span>
                      <span className="text-xs font-semibold text-slate-200 mt-1 block">T-Tech Streaming Engine</span>
                    </div>
                  </div>

                  {/* SOCIAL BUTTONS row: Facebook and Instagram */}
                  <div className="w-full flex items-center justify-center gap-3 mt-5">
                    <a 
                      href="https://facebook.com" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="w-10 h-10 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/30 hover:bg-[#1877F2]/20 text-[#1877F2] hover:text-white flex items-center justify-center transition-all shadow-md cursor-pointer"
                      title="Follow on Facebook"
                    >
                      <Facebook className="w-5 h-5 fill-current" />
                    </a>
                    <a 
                      href="https://instagram.com" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="w-10 h-10 rounded-xl bg-[#E1306C]/10 border border-[#E1306C]/30 hover:bg-[#E1306C]/20 text-[#E1306C] hover:text-white flex items-center justify-center transition-all shadow-md cursor-pointer"
                      title="Follow on Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                    <a 
                      href="mailto:toirkulislamnur@gmail.com" 
                      className="w-10 h-10 rounded-xl bg-[#EA4335]/10 border border-[#EA4335]/30 hover:bg-[#EA4335]/20 text-[#EA4335] hover:text-white flex items-center justify-center transition-all shadow-md cursor-pointer"
                      title="Contact Torikul via Email (toirkulislamnur@gmail.com)"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  </div>

                  {/* Copyright status display signature */}
                  <p className="text-[9px] font-mono text-zinc-500 mt-6 tracking-widest">
                    SYSTEM DESIGN CERTIFIED BY T-TECH GLOBAL
                  </p>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* 6. SYSTEM STICKY NAVIGATION TABS BOTTOM-BAR */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-950/90 border-t border-slate-900 backdrop-blur-lg px-6 py-3.5 z-90 flex justify-around items-center rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.8)]">
        
        {/* Navigation Tab: Streams Directory */}
        <button
          onClick={() => {
            setActiveTab('streams');
            showToast("Syncing Live Stations Grid...");
          }}
          className={`flex flex-col items-center justify-center p-1.5 transition-all text-xs cursor-pointer relative ${activeTab === 'streams' ? 'text-cyan-400 scale-105' : 'text-zinc-500 hover:text-slate-300'}`}
        >
          <Radio className="w-5 h-5" />
          <span className="text-[10px] uppercase font-bold tracking-wider mt-1 font-mono">
            Stations
          </span>
          {activeTab === 'streams' && (
            <motion.div layoutId="nav-line" className="absolute -bottom-1 w-5 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          )}
        </button>

        {/* Navigation Tab: Bookmarked Favorites */}
        <button
          onClick={() => {
            setActiveTab('favorites');
            showToast("Opening Secure Local Vault...");
          }}
          className={`flex flex-col items-center justify-center p-1.5 transition-all text-xs cursor-pointer relative ${activeTab === 'favorites' ? 'text-cyan-400 scale-105' : 'text-zinc-500 hover:text-slate-300'}`}
        >
          <Star className="w-5 h-5" />
          <span className="text-[10px] uppercase font-bold tracking-wider mt-1 font-mono">
            Vault
          </span>
          {activeTab === 'favorites' && (
            <motion.div layoutId="nav-line" className="absolute -bottom-1 w-5 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          )}
        </button>

        {/* Navigation Tab: Developer Bio Info Card */}
        <button
          onClick={() => {
            setActiveTab('profile');
            showToast("Opening Developer Portfolio...");
          }}
          className={`flex flex-col items-center justify-center p-1.5 transition-all text-xs cursor-pointer relative ${activeTab === 'profile' ? 'text-cyan-400 scale-105' : 'text-zinc-500 hover:text-slate-300'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] uppercase font-bold tracking-wider mt-1 font-mono">
            Creator
          </span>
          {activeTab === 'profile' && (
            <motion.div layoutId="nav-line" className="absolute -bottom-1 w-5 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          )}
        </button>

      </nav>

    </div>
  );
}
