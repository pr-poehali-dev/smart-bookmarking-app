import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import AddBookmarkModal from "@/components/AddBookmarkModal";

const API_URL = "https://functions.poehali.dev/d3363e0f-d684-40b4-9fb3-05c6abb7bc12";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "inbox", label: "Входящие", icon: "Inbox" },
  { id: "boards", label: "Доски", icon: "SquareKanban" },
  { id: "add", label: "Добавить", icon: "Plus", accent: true },
];

const ALL_TAGS = ["Все", "Дизайн", "Разработка", "Маркетинг", "Статьи", "Видео", "Инструменты"];

const CONTENT_TYPE_COLORS: Record<string, string> = {
  article: "#f0f4ff",
  video: "#fdf4ff",
  product: "#fff7ed",
  tool: "#f0fdf4",
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
        setSavedItems(new Set((data.bookmarks || []).map((b: Bookmark) => b.id)));
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
        setSavedItems(new Set((bData.bookmarks || []).map((b: Bookmark) => b.id)));
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
      loadBookmarks(value);
    }, 400);
  };

  const handleSaved = (newBookmark: Record<string, unknown>) => {
    setBookmarks((prev) => [newBookmark as unknown as Bookmark, ...prev]);
    setSavedItems((prev) => new Set([...prev, newBookmark.id as number]));
  };

  const toggleSaved = (id: number) => {
    setSavedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const inboxCount = bookmarks.filter((b) => b.is_inbox).length;

  const filtered = bookmarks.filter((b) => {
    const matchNav =
      activeNav === "inbox" ? b.is_inbox :
      activeNav === "boards" ? !b.is_inbox :
      true;
    const matchTag =
      activeTag === "Все" ||
      (b.tags || []).some((t) => t.toLowerCase().includes(activeTag.toLowerCase())) ||
      b.content_type === activeTag.toLowerCase();
    return matchNav && matchTag;
  });

  const navItemsWithBadge = NAV_ITEMS.map((item) =>
    item.id === "inbox" ? { ...item, badge: inboxCount || undefined } : item
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-border flex flex-col h-full">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
              <Icon name="BookMarked" size={15} className="text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">НаПолке</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150
                ${item.accent
                  ? "bg-foreground text-white hover:bg-foreground/90"
                  : activeNav === item.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <Icon name={item.icon} size={16} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span className="text-[11px] font-semibold bg-foreground text-white rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}

          <div className="pt-5 pb-1 px-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Мои доски
            </span>
          </div>
          {boards.map((board) => (
            <button
              key={board.id}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: board.color }} />
              <span className="flex-1 text-left truncate">{board.name}</span>
            </button>
          ))}
        </nav>

        <div className="px-3 pb-5 border-t border-border pt-3">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
            <Icon name="Settings" size={16} />
            <span>Настройки</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[12px] font-semibold text-foreground">А</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">Алексей</p>
              <p className="text-[11px] text-muted-foreground truncate">Pro план</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-border px-8 py-4 flex items-center gap-4 flex-shrink-0">
          <div className="flex-1">
            <h1 className="text-[18px] font-semibold text-foreground leading-tight">
              {searchQuery
                ? `Поиск: «${searchQuery}»`
                : activeNav === "inbox" ? "Входящие"
                : activeNav === "boards" ? "Доски"
                : "Все закладки"}
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {filtered.length} {searchQuery ? "результатов" : "материалов"}
            </p>
          </div>

          <div className="relative w-80">
            <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Найди рецепт, маркетинг, дизайн..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-[13px] bg-muted border border-transparent rounded-xl focus:outline-none focus:border-border focus:bg-white transition-all placeholder:text-muted-foreground"
            />
            {searching && (
              <Icon name="Loader" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
            {!searching && searchInput && (
              <button
                onClick={() => { setSearchInput(""); handleSearchChange(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="X" size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-white text-[13px] font-semibold hover:bg-foreground/90 transition-all"
          >
            <Icon name="Plus" size={14} />
            Добавить
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100">
            <Icon name="Sparkles" size={13} className="text-indigo-500" />
            <span className="text-[12px] font-semibold text-indigo-600">AI-сортировка</span>
          </div>
        </header>

        <div className="bg-white border-b border-border px-8 py-3 flex items-center gap-2 flex-shrink-0 overflow-x-auto">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-all duration-150
                ${activeTag === tag
                  ? "bg-foreground text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-border"
                }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loadingData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-border rounded-2xl p-5 animate-pulse">
                  <div className="w-10 h-10 bg-muted rounded-xl mb-3" />
                  <div className="h-4 bg-muted rounded-lg mb-2 w-3/4" />
                  <div className="h-3 bg-muted rounded-lg mb-1 w-full" />
                  <div className="h-3 bg-muted rounded-lg w-2/3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-fade-in">
              <Icon name="BookmarkPlus" size={36} className="mb-3 opacity-30" />
              <p className="text-[14px] font-medium">Нет закладок</p>
              <p className="text-[12px] opacity-60 mt-1 mb-4">Добавьте первую закладку</p>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-white text-[13px] font-semibold hover:bg-foreground/90 transition-all"
              >
                <Icon name="Plus" size={14} />
                Добавить закладку
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item, i) => {
                const bgColor = CONTENT_TYPE_COLORS[item.content_type] || "#f8fafc";
                const iconName = CONTENT_TYPE_ICONS[item.content_type] || "FileText";
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-border rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group animate-fade-in flex flex-col"
                    style={{ animationDelay: `${i * 35}ms` }}
                    onClick={() => {
                      if (item.embed_url) {
                        setPlayerItem(item);
                      } else {
                        window.open(item.url, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    {/* Превью — если есть thumbnail */}
                    {item.preview_url ? (
                      <div className="relative w-full aspect-video overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={item.preview_url}
                          alt={item.title || ""}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).closest(".preview-wrap")?.classList.add("hidden");
                          }}
                        />
                        {/* Кнопка Play по центру для видео с embed */}
                        {item.embed_url && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                              <Icon name="Play" size={20} className="text-white ml-0.5" />
                            </div>
                          </div>
                        )}
                        {/* Иконка типа контента поверх превью */}
                        <div className="absolute bottom-2 left-2">
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
                          >
                            <Icon name={iconName} size={10} />
                            {item.content_type === "video" ? "Видео" : item.content_type === "article" ? "Статья" : item.content_type}
                          </span>
                        </div>
                        {/* Кнопка сохранить */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSaved(item.id); }}
                          className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100
                            ${savedItems.has(item.id) ? "!opacity-100 text-white bg-indigo-500" : "text-white bg-black/40 hover:bg-black/60"}`}
                        >
                          <Icon name={savedItems.has(item.id) ? "Bookmark" : "BookmarkPlus"} size={14} />
                        </button>
                      </div>
                    ) : (
                      /* Без превью — компактная шапка с иконкой */
                      <div
                        className="w-full h-16 flex-shrink-0 flex items-center px-4 gap-3 relative"
                        style={{ backgroundColor: bgColor }}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/60 flex-shrink-0">
                          {item.favicon_url ? (
                            <img
                              src={item.favicon_url}
                              alt=""
                              className="w-6 h-6 object-contain rounded"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <Icon name={iconName} size={16} className="text-foreground/60" />
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-foreground/50 truncate">{item.source}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSaved(item.id); }}
                          className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100
                            ${savedItems.has(item.id) ? "!opacity-100 text-indigo-500" : "text-foreground/40 hover:text-foreground"}`}
                        >
                          <Icon name={savedItems.has(item.id) ? "Bookmark" : "BookmarkPlus"} size={14} />
                        </button>
                      </div>
                    )}

                    {/* Контент карточки */}
                    <div className="flex flex-col gap-2 p-4 flex-1">
                      <div>
                        <h3 className="text-[13.5px] font-semibold text-foreground leading-snug line-clamp-2">
                          {item.title || item.source || item.url}
                        </h3>
                        {item.preview_url && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Icon name="Globe" size={9} />
                            {item.source}
                          </p>
                        )}
                      </div>

                      {item.topic && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchInput(item.topic!);
                            setSearchQuery(item.topic!);
                            loadBookmarks(item.topic!);
                          }}
                          className="flex items-center gap-1 group/topic hover:opacity-80 transition-opacity text-left w-fit"
                        >
                          <Icon name="Tag" size={10} className="text-indigo-400 flex-shrink-0" />
                          <span className="text-[11px] font-medium text-indigo-500 truncate underline-offset-2 group-hover/topic:underline">{item.topic}</span>
                        </button>
                      )}

                      {item.description && !item.preview_url && (
                        <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {item.note && (
                        <div className="flex items-start gap-1.5 bg-amber-50 rounded-lg px-2.5 py-1.5">
                          <Icon name="StickyNote" size={10} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-amber-700 line-clamp-1">{item.note}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/60">
                        <div className="flex gap-1.5 flex-wrap min-w-0">
                          {(item.tags || []).slice(0, 2).map((tag) => (
                            <button
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchInput(tag);
                                setSearchQuery(tag);
                                loadBookmarks(tag);
                              }}
                              className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[80px] hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                          {item.board_name && (
                            <span
                              className="text-[10.5px] font-medium px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: item.board_color || "#6366f1" }}
                            >
                              {item.board_name}
                            </span>
                          )}
                        </div>
                        <span className="text-[10.5px] text-muted-foreground/50 flex-shrink-0 ml-1">
                          {item.created_at ? timeAgo(item.created_at) : ""}
                        </span>
                      </div>
                    </div>
                  </div>
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

      {/* Медиаплеер */}
      {playerItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setPlayerItem(null)}
        >
          <div
            className="relative w-full max-w-3xl mx-4 bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Плеер */}
            <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={playerItem.embed_url!}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            {/* Мета под плеером */}
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
                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                      {tag}
                    </span>
                  ))}
                </div>
                {playerItem.description && (
                  <p className="text-[12px] text-white/40 mt-1.5 line-clamp-2">{playerItem.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={playerItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[12px] font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon name="ExternalLink" size={13} />
                  Открыть
                </a>
                <button
                  onClick={() => setPlayerItem(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
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