import { useState, useEffect, useRef, useMemo } from "react";
import Icon from "@/components/ui/icon";
import AddBookmarkModal from "@/components/AddBookmarkModal";

const API_URL =
  "https://functions.poehali.dev/d3363e0f-d684-40b4-9fb3-05c6abb7bc12";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "inbox", label: "Входящие", icon: "Inbox" },
  { id: "boards", label: "Доски", icon: "SquareKanban" },
  { id: "add", label: "Добавить", icon: "Plus", accent: true },
];

const ALL_TAGS = [
  "Все",
  "Дизайн",
  "Разработка",
  "Маркетинг",
  "Статьи",
  "Видео",
  "Инструменты",
];

interface Bookmark {
  id: number;
  url: string;
  title: string;
  description: string;
  note: string;
  source: string;
  content_type: string;
  topic: string | null;
  tags: string[];
  board_id: number | null;
  board_name: string | null;
  board_color: string | null;
  preview_url: string | null;
  favicon_url: string | null;
  embed_url: string | null;
  is_inbox: boolean;
  created_at: string;
}

interface Board {
  id: number;
  name: string;
  color: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "Только что";
  if (m < 60) return `${m} мин. назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч. назад`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} дн. назад`;
  return `${Math.floor(d / 7)} нед. назад`;
}

function getYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/shorts/")[1]?.split("/")[0] || null;
      }

      const videoId = u.searchParams.get("v");
      if (videoId) return videoId;
    }

    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "") || null;
    }

    return null;
  } catch {
    return null;
  }
}

function buildEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) {
        const videoId = u.pathname.split("/shorts/")[1]?.split("/")[0];
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        }
      }

      const videoId = u.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      }
    }

    if (u.hostname.includes("youtu.be")) {
      const videoId = u.pathname.replace("/", "");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      }
    }

    if (u.hostname.includes("tiktok.com")) {
      return `https://www.tiktok.com/embed${u.pathname}`;
    }

    if (u.hostname.includes("instagram.com")) {
      if (u.pathname.startsWith("/reel/") || u.pathname.startsWith("/p/")) {
        const cleanPath = u.pathname.endsWith("/")
          ? u.pathname
          : `${u.pathname}/`;
        return `https://www.instagram.com${cleanPath}embed`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function resolvePlayableEmbed(item: Bookmark): string | null {
  return item.embed_url || buildEmbedUrl(item.url);
}

function getPlatformMeta(item: Bookmark) {
  const source = `${item.source || ""} ${item.url || ""}`.toLowerCase();

  if (source.includes("instagram")) {
    return {
      label: "Instagram",
      icon: "Instagram",
      chip: "Reels",
      gradient: "from-pink-500 via-fuchsia-500 to-orange-400",
      softBg: "bg-pink-50",
      platform: "instagram" as const,
    };
  }

  if (source.includes("tiktok")) {
    return {
      label: "TikTok",
      icon: "Music2",
      chip: "TikTok",
      gradient: "from-neutral-950 via-neutral-900 to-cyan-500",
      softBg: "bg-neutral-100",
      platform: "tiktok" as const,
    };
  }

  if (source.includes("vk")) {
    return {
      label: "VK",
      icon: "PlaySquare",
      chip: "Клипы",
      gradient: "from-blue-600 via-sky-500 to-cyan-400",
      softBg: "bg-blue-50",
      platform: "vk" as const,
    };
  }

  if (source.includes("youtube") || source.includes("youtu.be")) {
    return {
      label: "YouTube",
      icon: "PlayCircle",
      chip: "Видео",
      gradient: "from-red-600 via-rose-500 to-orange-400",
      softBg: "bg-red-50",
      platform: "youtube" as const,
    };
  }

  return {
    label: item.source || "Ссылка",
    icon: "Globe",
    chip: item.content_type === "video" ? "Видео" : "Контент",
    gradient: "from-slate-700 via-slate-600 to-slate-400",
    softBg: "bg-slate-100",
    platform: "other" as const,
  };
}

function getReadableTitle(
  item: Bookmark,
  meta: ReturnType<typeof getPlatformMeta>,
) {
  return item.title || item.source || meta.label || item.url;
}

function getPreviewAspectClass(item: Bookmark) {
  const source = `${item.source || ""} ${item.url || ""}`.toLowerCase();

  const isVertical =
    source.includes("tiktok") ||
    source.includes("instagram.com/reel") ||
    source.includes("youtube.com/shorts") ||
    source.includes("vk.com/clip") ||
    source.includes("vk clips") ||
    source.includes("клипы");

  if (isVertical) return "aspect-[9/16]";

  const isHorizontal =
    source.includes("youtube") ||
    source.includes("youtu.be") ||
    source.includes("vimeo");

  if (isHorizontal) return "aspect-video";

  if (item.content_type === "video") return "aspect-[9/14]";

  return "aspect-[9/14]";
}

function getPlayerLayout(item: Bookmark) {
  const source = `${item.source || ""} ${item.url || ""}`.toLowerCase();

  const isVertical =
    source.includes("tiktok") ||
    source.includes("instagram.com/reel") ||
    source.includes("youtube.com/shorts") ||
    source.includes("vk.com/clip") ||
    source.includes("vk clips") ||
    source.includes("клипы");

  return {
    isVertical,
    frameClass: isVertical ? "w-full max-w-[430px]" : "w-full max-w-5xl",
    aspectRatio: isVertical ? "9 / 16" : "16 / 9",
  };
}

function getBestPreviewUrl(item: Bookmark): string | null {
  if (item.preview_url) return item.preview_url;

  const ytId = getYouTubeVideoId(item.url);
  if (ytId) {
    return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  }

  return null;
}

export default function Index() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [activeTag, setActiveTag] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searching, setSearching] = useState(false);
  const [savedItems, setSavedItems] = useState<Set<number>>(new Set());
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBookmarks = (q = "") => {
    const url = q ? `${API_URL}?q=${encodeURIComponent(q)}` : API_URL;
    setSearching(true);

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setBookmarks(data.bookmarks || []);
        setSavedItems(
          new Set((data.bookmarks || []).map((b: Bookmark) => b.id)),
        );
      })
      .catch(() => {})
      .finally(() => setSearching(false));
  };

  useEffect(() => {
    Promise.all([
      fetch(API_URL).then((r) => r.json()),
      fetch(`${API_URL}?route=boards`).then((r) => r.json()),
    ])
      .then(([bData, brData]) => {
        setBookmarks(bData.bookmarks || []);
        setBoards(brData.boards || []);
        setSavedItems(
          new Set((bData.bookmarks || []).map((b: Bookmark) => b.id)),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
      loadBookmarks(value);
    }, 400);
  };

  const handleSaved = (newBookmark: Record<string, unknown>) => {
    setBookmarks((prev) => [newBookmark as Bookmark, ...prev]);
    setSavedItems((prev) => new Set([...prev, newBookmark.id as number]));
  };

  const toggleSaved = (id: number) => {
    setSavedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async (id: number) => {
    const prevBookmarks = bookmarks;
    const prevSaved = savedItems;

    setDeletingIds((prev) => new Set(prev).add(id));
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    setSavedItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      // Если API умеет удалять, раскомментируй:
      // await fetch(`${API_URL}?id=${id}`, { method: "DELETE" });
      await Promise.resolve();
    } catch {
      setBookmarks(prevBookmarks);
      setSavedItems(prevSaved);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const inboxCount = bookmarks.filter((b) => b.is_inbox).length;

  const filtered = useMemo(() => {
    return bookmarks.filter((b) => {
      const matchNav =
        activeNav === "inbox"
          ? b.is_inbox
          : activeNav === "boards"
            ? !b.is_inbox
            : true;

      const matchTag =
        activeTag === "Все" ||
        (b.tags || []).some((t) =>
          t.toLowerCase().includes(activeTag.toLowerCase()),
        ) ||
        b.content_type === activeTag.toLowerCase();

      return matchNav && matchTag;
    });
  }, [bookmarks, activeNav, activeTag]);

  const navItemsWithBadge = NAV_ITEMS.map((item) =>
    item.id === "inbox" ? { ...item, badge: inboxCount || undefined } : item,
  );

  const currentPlayerItem =
    playerIndex !== null ? filtered[playerIndex] || null : null;

  const playerLayout = currentPlayerItem
    ? getPlayerLayout(currentPlayerItem)
    : null;

  const openBookmark = (item: Bookmark) => {
    const index = filtered.findIndex((b) => b.id === item.id);
    if (index >= 0) {
      setPlayerIndex(index);
      return;
    }

    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const closePlayer = () => setPlayerIndex(null);

  const goPrev = () => {
    if (playerIndex === null || filtered.length <= 1) return;
    setPlayerIndex((prev) =>
      prev === null ? 0 : (prev - 1 + filtered.length) % filtered.length,
    );
  };

  const goNext = () => {
    if (playerIndex === null || filtered.length <= 1) return;
    setPlayerIndex((prev) =>
      prev === null ? 0 : (prev + 1) % filtered.length,
    );
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (playerIndex === null) return;

      if (e.key === "Escape") closePlayer();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playerIndex, filtered.length]);

  useEffect(() => {
    if (playerIndex === null) return;
    if (filtered.length === 0) {
      setPlayerIndex(null);
      return;
    }
    if (playerIndex > filtered.length - 1) {
      setPlayerIndex(filtered.length - 1);
    }
  }, [filtered.length, playerIndex]);

  return (
    <div className="flex h-screen bg-[#f6f6f7] overflow-hidden font-sans text-foreground">
      <aside className="hidden xl:flex w-64 flex-shrink-0 bg-white border-r border-black/5 flex-col h-full">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center shadow-sm">
              <Icon name="BookMarked" size={17} className="text-white" />
            </div>
            <div>
              <span className="block text-[15px] font-semibold tracking-tight text-foreground">
                НаПолке
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Reels / Clips / TikTok
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItemsWithBadge.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "add") {
                  setModalOpen(true);
                } else {
                  setActiveNav(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-[13.5px] font-medium transition-all duration-200
                ${
                  item.accent
                    ? "bg-black text-white hover:bg-black/90 shadow-sm"
                    : activeNav === item.id
                      ? "bg-black/[0.05] text-foreground"
                      : "text-muted-foreground hover:bg-black/[0.035] hover:text-foreground"
                }`}
            >
              <Icon name={item.icon} size={16} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span className="text-[11px] font-semibold bg-black text-white rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}

          <div className="pt-5 pb-2 px-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Мои доски
            </span>
          </div>

          <div className="space-y-1">
            {boards.map((board) => (
              <button
                key={board.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] font-medium text-muted-foreground hover:bg-black/[0.035] hover:text-foreground transition-all duration-150"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: board.color }}
                />
                <span className="flex-1 text-left truncate">{board.name}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="px-3 pb-5 border-t border-black/5 pt-3">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13.5px] font-medium text-muted-foreground hover:bg-black/[0.035] hover:text-foreground transition-all duration-150">
            <Icon name="Settings" size={16} />
            <span>Настройки</span>
          </button>

          <div className="flex items-center gap-3 px-3 py-3 mt-1 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-[12px] font-semibold text-foreground">
              А
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">
                Алексей
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Pro план
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <header className="bg-[#f6f6f7]/95 backdrop-blur border-b border-black/5 px-4 md:px-6 xl:px-8 py-4 flex flex-col gap-4 flex-shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-[24px] font-semibold tracking-tight leading-tight">
                {searchQuery
                  ? `Поиск: «${searchQuery}»`
                  : activeNav === "inbox"
                    ? "Входящие"
                    : activeNav === "boards"
                      ? "Доски"
                      : "Лента клипов"}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                {filtered.length} {searchQuery ? "результатов" : "материалов"} ·
                визуальная лента short-form контента
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full lg:w-[430px]">
                <Icon
                  name="Search"
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Найди reels, клипы, tiktok, видео..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 text-[13px] bg-white border border-black/8 rounded-2xl focus:outline-none focus:ring-4 focus:ring-black/[0.04] focus:border-black/10 transition-all placeholder:text-muted-foreground shadow-sm"
                />
                {searching && (
                  <Icon
                    name="Loader"
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
                  />
                )}
                {!searching && searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      handleSearchChange("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name="X" size={14} />
                  </button>
                )}
              </div>

              <button
                onClick={() => setModalOpen(true)}
                className="hidden md:flex items-center gap-2 px-4 py-3 rounded-2xl bg-black text-white text-[13px] font-semibold hover:bg-black/90 transition-all shadow-sm"
              >
                <Icon name="Plus" size={14} />
                Добавить
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[12.5px] font-medium transition-all duration-150 border
                  ${
                    activeTag === tag
                      ? "bg-black text-white border-black"
                      : "bg-white text-muted-foreground border-black/8 hover:text-foreground hover:bg-black/[0.03]"
                  }`}
              >
                {tag}
              </button>
            ))}

            <div className="ml-auto hidden md:flex items-center gap-1.5 px-3 py-2 rounded-full bg-indigo-50 border border-indigo-100">
              <Icon name="Sparkles" size={13} className="text-indigo-500" />
              <span className="text-[12px] font-semibold text-indigo-600">
                AI-сортировка
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 xl:px-8 py-6">
          {loadingData ? (
            <div className="columns-2 md:columns-3 xl:columns-4 2xl:columns-5 gap-5 [column-fill:_balance]">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="mb-5 break-inside-avoid rounded-[28px] overflow-hidden bg-white border border-black/6 animate-pulse shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
                >
                  <div className="aspect-[9/14] bg-black/[0.06]" />
                  <div className="p-3">
                    <div className="h-4 bg-black/[0.05] rounded-lg mb-2 w-3/4" />
                    <div className="h-3 bg-black/[0.05] rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-black/[0.04] flex items-center justify-center mb-4">
                <Icon name="Film" size={28} className="opacity-40" />
              </div>
              <p className="text-[16px] font-medium text-foreground">
                Нет клипов
              </p>
              <p className="text-[13px] opacity-70 mt-1 mb-5">
                Добавьте первую карточку с обложкой в свою ленту
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black text-white text-[13px] font-semibold hover:bg-black/90 transition-all shadow-sm"
              >
                <Icon name="Plus" size={14} />
                Добавить закладку
              </button>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 xl:columns-4 2xl:columns-5 gap-5 [column-fill:_balance]">
              {filtered.map((item, i) => {
                const meta = getPlatformMeta(item);
                const bestPreviewUrl = getBestPreviewUrl(item);
                const hasPlayableEmbed = Boolean(resolvePlayableEmbed(item));
                const title = getReadableTitle(item, meta);

                return (
                  <article
                    key={item.id}
                    className="group mb-5 break-inside-avoid cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${i * 20}ms` }}
                    onClick={() => openBookmark(item)}
                  >
                    <div className="overflow-hidden rounded-[28px] bg-white border border-black/6 shadow-[0_10px_28px_rgba(0,0,0,0.06)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_18px_44px_rgba(0,0,0,0.10)]">
                      <div
                        className={`relative ${getPreviewAspectClass(item)} overflow-hidden bg-black`}
                      >
                        {bestPreviewUrl ? (
                          <img
                            src={bestPreviewUrl}
                            alt={title}
                            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`}
                          />
                        )}

                        {!bestPreviewUrl && (
                          <>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.30),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_24%)]" />
                            <div className="absolute inset-0 flex flex-col justify-between p-4">
                              <div className="flex items-start justify-between gap-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold text-white bg-white/20 backdrop-blur-md border border-white/20">
                                  <Icon name={meta.icon} size={11} />
                                  {meta.chip}
                                </span>

                                <div className="w-9 h-9 rounded-full bg-white/18 backdrop-blur-md border border-white/20 flex items-center justify-center">
                                  <Icon
                                    name={meta.icon}
                                    size={16}
                                    className="text-white"
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="w-14 h-14 rounded-[18px] bg-white/16 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-sm">
                                  <Icon
                                    name={meta.icon}
                                    size={24}
                                    className="text-white"
                                  />
                                </div>

                                <p className="text-[20px] font-semibold text-white leading-tight tracking-tight">
                                  {meta.label}
                                </p>
                                <p className="text-[12px] text-white/75 mt-1 line-clamp-2">
                                  {item.title ||
                                    item.description ||
                                    item.source ||
                                    "Короткое видео"}
                                </p>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                        <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold text-white bg-black/40 backdrop-blur-md">
                            <Icon name={meta.icon} size={10} />
                            {meta.chip}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id);
                              }}
                              disabled={deletingIds.has(item.id)}
                              className="p-2 rounded-full bg-red-500/85 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all duration-200 disabled:opacity-60"
                              title="Удалить"
                            >
                              <Icon name="Trash2" size={14} />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaved(item.id);
                              }}
                              className={`p-2 rounded-full backdrop-blur-md transition-all duration-200
                                ${
                                  savedItems.has(item.id)
                                    ? "bg-white text-black opacity-100"
                                    : "bg-black/35 text-white opacity-0 group-hover:opacity-100 hover:bg-black/55"
                                }`}
                              title="Сохранить"
                            >
                              <Icon
                                name={
                                  savedItems.has(item.id)
                                    ? "Bookmark"
                                    : "BookmarkPlus"
                                }
                                size={14}
                              />
                            </button>
                          </div>
                        </div>

                        {hasPlayableEmbed && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-14 h-14 rounded-full bg-black/35 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100 border border-white/15">
                              <Icon
                                name="Play"
                                size={20}
                                className="text-white ml-0.5"
                              />
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-white/18 backdrop-blur-md border border-white/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {item.favicon_url ? (
                                <img
                                  src={item.favicon_url}
                                  alt=""
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Icon
                                  name={meta.icon}
                                  size={12}
                                  className="text-white"
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-[11.5px] font-medium text-white truncate">
                                {meta.label}
                              </p>
                              <p className="text-[10.5px] text-white/70 truncate">
                                {item.source || item.url}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-[14.5px] font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
                            {title}
                          </h3>

                          <span className="text-[10.5px] text-muted-foreground flex-shrink-0 pt-0.5">
                            {item.created_at ? timeAgo(item.created_at) : ""}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-[12px] text-muted-foreground leading-relaxed mt-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {item.topic && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchInput(item.topic!);
                              setSearchQuery(item.topic!);
                              loadBookmarks(item.topic!);
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                          >
                            <Icon name="Hash" size={11} />
                            {item.topic}
                          </button>
                        )}

                        {item.note && (
                          <div
                            className={`mt-3 rounded-2xl px-3 py-2 ${meta.softBg}`}
                          >
                            <div className="flex items-start gap-2">
                              <Icon
                                name="StickyNote"
                                size={12}
                                className="text-foreground/50 mt-0.5 flex-shrink-0"
                              />
                              <p className="text-[11.5px] text-foreground/70 line-clamp-2">
                                {item.note}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5 min-w-0">
                            {(item.tags || []).slice(0, 2).map((tag) => (
                              <button
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchInput(tag);
                                  setSearchQuery(tag);
                                  loadBookmarks(tag);
                                }}
                                className="text-[10.5px] font-medium px-2.5 py-1 rounded-full bg-black/[0.04] text-muted-foreground truncate max-w-[100px] hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                              >
                                {tag}
                              </button>
                            ))}

                            {item.board_name && (
                              <span
                                className="text-[10.5px] font-medium px-2.5 py-1 rounded-full text-white"
                                style={{
                                  backgroundColor:
                                    item.board_color || "#6366f1",
                                }}
                              >
                                {item.board_name}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openBookmark(item);
                            }}
                            className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-black/90 transition-colors flex-shrink-0"
                          >
                            <Icon name="Play" size={14} className="ml-0.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <AddBookmarkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />

      {currentPlayerItem && playerLayout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4"
          onClick={closePlayer}
        >
          <div
            className="absolute inset-y-0 left-2 md:left-5 flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={goPrev}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-colors"
              title="Предыдущее"
            >
              <div className="flex items-center justify-center">
                <Icon name="ChevronLeft" size={20} />
              </div>
            </button>
          </div>

          <div
            className="absolute inset-y-0 right-2 md:right-5 flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={goNext}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-colors"
              title="Следующее"
            >
              <div className="flex items-center justify-center">
                <Icon name="ChevronRight" size={20} />
              </div>
            </button>
          </div>

          <div
            className={`relative ${playerLayout.frameClass} bg-black rounded-[28px] overflow-hidden shadow-2xl flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative w-full bg-black"
              style={{ aspectRatio: playerLayout.aspectRatio }}
            >
              <iframe
                key={currentPlayerItem.id}
                src={resolvePlayableEmbed(currentPlayerItem) || undefined}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            <div className="bg-[#111] px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                    {playerIndex !== null
                      ? `${playerIndex + 1} / ${filtered.length}`
                      : ""}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                    {getPlatformMeta(currentPlayerItem).label}
                  </span>
                </div>

                <h2 className="text-[15px] font-semibold text-white leading-snug line-clamp-2">
                  {currentPlayerItem.title ||
                    getPlatformMeta(currentPlayerItem).label}
                </h2>

                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[12px] text-white/50">
                    <Icon name="Globe" size={11} />
                    {currentPlayerItem.source}
                  </span>

                  {currentPlayerItem.topic && (
                    <span className="flex items-center gap-1 text-[12px] text-indigo-400">
                      <Icon name="Tag" size={11} />
                      {currentPlayerItem.topic}
                    </span>
                  )}

                  {(currentPlayerItem.tags || []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {currentPlayerItem.description && (
                  <p className="text-[12px] text-white/40 mt-1.5 line-clamp-2">
                    {currentPlayerItem.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={currentPlayerItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon name="ExternalLink" size={13} />
                  Открыть
                </a>

                <button
                  onClick={closePlayer}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                >
                  <Icon name="X" size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
