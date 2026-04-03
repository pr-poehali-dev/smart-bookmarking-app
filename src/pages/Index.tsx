import { useState, useEffect, useRef } from "react";
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

const CONTENT_TYPE_COLORS: Record<string, string> = {
  article: "#eef4ff",
  video: "#fdf2ff",
  product: "#fff7ed",
  tool: "#ecfdf3",
  site: "#f8fafc",
};

const CONTENT_TYPE_ICONS: Record<string, string> = {
  article: "FileText",
  video: "Video",
  product: "ShoppingBag",
  tool: "Wrench",
  site: "Globe",
};

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

function buildEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtube.com")) {
      const videoId = u.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }

    if (u.hostname.includes("youtu.be")) {
      const videoId = u.pathname.replace("/", "");
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
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

function prettyType(type: string) {
  if (type === "video") return "Видео";
  if (type === "article") return "Статья";
  if (type === "product") return "Продукт";
  if (type === "tool") return "Инструмент";
  if (type === "site") return "Сайт";
  return type;
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
  const [playerItem, setPlayerItem] = useState<Bookmark | null>(null);
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

  const openBookmark = (item: Bookmark) => {
    const embed = resolvePlayableEmbed(item);

    if (embed) {
      setPlayerItem({
        ...item,
        embed_url: embed,
      });
      return;
    }

    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const inboxCount = bookmarks.filter((b) => b.is_inbox).length;

  const filtered = bookmarks.filter((b) => {
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

  const navItemsWithBadge = NAV_ITEMS.map((item) =>
    item.id === "inbox" ? { ...item, badge: inboxCount || undefined } : item,
  );

  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden font-sans text-foreground">
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-white/95 border-r border-black/5 flex-col h-full backdrop-blur">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black flex items-center justify-center shadow-sm">
              <Icon name="BookMarked" size={16} className="text-white" />
            </div>
            <div>
              <span className="block text-[15px] font-semibold tracking-tight text-foreground">
                НаПолке
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Visual bookmarks
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
                      ? "bg-black/[0.04] text-foreground"
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
        <header className="bg-[#fafafa]/95 backdrop-blur border-b border-black/5 px-4 md:px-6 xl:px-8 py-4 flex flex-col gap-4 flex-shrink-0">
          <div className="flex flex-col xl:flex-row xl:items-center gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-semibold tracking-tight leading-tight">
                {searchQuery
                  ? `Поиск: «${searchQuery}»`
                  : activeNav === "inbox"
                    ? "Входящие"
                    : activeNav === "boards"
                      ? "Доски"
                      : "Лента закладок"}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                {filtered.length} {searchQuery ? "результатов" : "материалов"} ·
                визуальная галерея
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full xl:w-96">
                <Icon
                  name="Search"
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Найди рецепт, маркетинг, дизайн..."
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

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
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
            <div className="columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-5 [column-fill:_balance]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="mb-5 break-inside-avoid rounded-[24px] border border-black/6 bg-white overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] animate-pulse"
                >
                  <div className="h-52 bg-black/[0.05]" />
                  <div className="p-4">
                    <div className="h-4 bg-black/[0.05] rounded-lg mb-3 w-3/4" />
                    <div className="h-3 bg-black/[0.05] rounded-lg mb-2 w-full" />
                    <div className="h-3 bg-black/[0.05] rounded-lg w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-black/[0.04] flex items-center justify-center mb-4">
                <Icon name="BookmarkPlus" size={28} className="opacity-40" />
              </div>
              <p className="text-[16px] font-medium text-foreground">
                Нет закладок
              </p>
              <p className="text-[13px] opacity-70 mt-1 mb-5">
                Добавьте первую карточку в свою ленту
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
            <div className="columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-5 [column-fill:_balance]">
              {filtered.map((item, i) => {
                const bgColor =
                  CONTENT_TYPE_COLORS[item.content_type] || "#f8fafc";
                const iconName =
                  CONTENT_TYPE_ICONS[item.content_type] || "FileText";
                const hasPlayableEmbed = Boolean(resolvePlayableEmbed(item));

                return (
                  <article
                    key={item.id}
                    className="group mb-5 break-inside-avoid cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${i * 25}ms` }}
                    onClick={() => openBookmark(item)}
                  >
                    <div className="overflow-hidden rounded-[26px] border border-black/6 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)]">
                      {item.preview_url ? (
                        <div className="relative overflow-hidden bg-black/[0.03]">
                          <img
                            src={item.preview_url}
                            alt={item.title || ""}
                            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />

                          <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold text-white bg-black/55 backdrop-blur-md">
                              <Icon name={iconName} size={10} />
                              {prettyType(item.content_type)}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaved(item.id);
                              }}
                              className={`p-2 rounded-full backdrop-blur-md transition-all duration-200
                                ${
                                  savedItems.has(item.id)
                                    ? "bg-white text-black"
                                    : "bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60"
                                }`}
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

                          {hasPlayableEmbed && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-14 h-14 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100">
                                <Icon
                                  name="Play"
                                  size={20}
                                  className="text-white ml-0.5"
                                />
                              </div>
                            </div>
                          )}

                          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/55 via-black/20 to-transparent">
                            <div className="flex items-center gap-2">
                              {item.favicon_url ? (
                                <img
                                  src={item.favicon_url}
                                  alt=""
                                  className="w-5 h-5 rounded bg-white/90 object-contain p-0.5"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-5 h-5 rounded bg-white/90 flex items-center justify-center">
                                  <Icon
                                    name="Globe"
                                    size={11}
                                    className="text-black/60"
                                  />
                                </div>
                              )}

                              <span className="text-[11px] text-white/90 truncate">
                                {item.source}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="relative px-4 pt-4 pb-3 border-b border-black/5"
                          style={{ backgroundColor: bgColor }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-2xl bg-white/75 flex items-center justify-center shadow-sm flex-shrink-0">
                                {item.favicon_url ? (
                                  <img
                                    src={item.favicon_url}
                                    alt=""
                                    className="w-6 h-6 object-contain rounded"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <Icon
                                    name={iconName}
                                    size={16}
                                    className="text-foreground/60"
                                  />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/45 font-semibold">
                                  {prettyType(item.content_type)}
                                </p>
                                <p className="text-[12px] text-foreground/60 truncate mt-1">
                                  {item.source}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaved(item.id);
                              }}
                              className={`p-2 rounded-full transition-all duration-200
                                ${
                                  savedItems.has(item.id)
                                    ? "bg-black text-white"
                                    : "text-foreground/50 hover:text-foreground hover:bg-white/70"
                                }`}
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
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-[15px] font-semibold leading-snug tracking-tight line-clamp-3 text-foreground">
                            {item.title || item.source || item.url}
                          </h3>

                          {!item.preview_url && (
                            <span className="text-[10.5px] text-muted-foreground flex-shrink-0 pt-0.5">
                              {item.created_at ? timeAgo(item.created_at) : ""}
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-[12.5px] text-muted-foreground leading-relaxed mt-2 line-clamp-3">
                            {item.description}
                          </p>
                        )}

                        {item.note && (
                          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2">
                            <Icon
                              name="StickyNote"
                              size={12}
                              className="text-amber-500 mt-0.5 flex-shrink-0"
                            />
                            <p className="text-[11.5px] text-amber-700 line-clamp-2">
                              {item.note}
                            </p>
                          </div>
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
                            <Icon name="Tag" size={11} />
                            {item.topic}
                          </button>
                        )}

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div className="flex flex-wrap gap-1.5 min-w-0">
                            {(item.tags || []).slice(0, 3).map((tag) => (
                              <button
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchInput(tag);
                                  setSearchQuery(tag);
                                  loadBookmarks(tag);
                                }}
                                className="text-[10.5px] font-medium px-2.5 py-1 rounded-full bg-black/[0.04] text-muted-foreground truncate max-w-[110px] hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
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

                          {item.preview_url && (
                            <span className="text-[10.5px] text-muted-foreground/70 flex-shrink-0">
                              {item.created_at ? timeAgo(item.created_at) : ""}
                            </span>
                          )}
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

      {playerItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setPlayerItem(null)}
        >
          <div
            className="relative w-full max-w-4xl mx-4 bg-black rounded-[28px] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={playerItem.embed_url || undefined}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            <div className="bg-[#111] px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold text-white leading-snug line-clamp-2">
                  {playerItem.title}
                </h2>

                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[12px] text-white/50">
                    <Icon name="Globe" size={11} />
                    {playerItem.source}
                  </span>

                  {playerItem.topic && (
                    <span className="flex items-center gap-1 text-[12px] text-indigo-400">
                      <Icon name="Tag" size={11} />
                      {playerItem.topic}
                    </span>
                  )}

                  {(playerItem.tags || []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {playerItem.description && (
                  <p className="text-[12px] text-white/40 mt-1.5 line-clamp-2">
                    {playerItem.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={playerItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon name="ExternalLink" size={13} />
                  Открыть
                </a>

                <button
                  onClick={() => setPlayerItem(null)}
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
