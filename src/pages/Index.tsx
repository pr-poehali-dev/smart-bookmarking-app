import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import AddBookmarkModal from "@/components/AddBookmarkModal";

// URL API для загрузки данных
const API_URL =
  "https://functions.poehali.dev/d3363e0f-d684-40b4-9fb3-05c6abb7bc12";

// Константы для навигации и тегов
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

// Интерфейсы для закладок и досок
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

// Хелпер для расчета времени
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

// Инициализация состояния для закладок
const [bookmarks, setBookmarks] = useState<Bookmark[]>([]); // <-- Состояние для закладок
const [modalOpen, setModalOpen] = useState(false); // Состояние модалки для добавления
const [loadingData, setLoadingData] = useState(true); // Состояние для загрузки данных
const [searchQuery, setSearchQuery] = useState(""); // Состояние для поискового запроса
const [searchInput, setSearchInput] = useState(""); // Состояние для ввода в поле поиска
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// useEffect для загрузки данных с API
useEffect(() => {
  fetch(API_URL)
    .then((response) => response.json())
    .then((data) => {
      setBookmarks(data.bookmarks || []); // Загружаем закладки в состояние
    })
    .catch((error) => console.error("Ошибка загрузки:", error))
    .finally(() => setLoadingData(false)); // Завершаем загрузку
}, []);

// Функция для поиска
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

// Функция для загрузки закладок с параметром поиска
const loadBookmarks = (q = "") => {
  const url = q ? `${API_URL}?q=${encodeURIComponent(q)}` : API_URL;

  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      setBookmarks(data.bookmarks || []);
    })
    .catch(() => {});
};

// Фильтрация закладок по тегам и типу контента
const filtered = bookmarks.filter((b) => {
  const matchTag =
    searchQuery === "Все" ||
    (b.tags || []).some((t) =>
      t.toLowerCase().includes(searchQuery.toLowerCase()),
    ) ||
    b.content_type === searchQuery.toLowerCase();

  return matchTag;
});

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
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "add") {
                setModalOpen(true);
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-[13.5px] font-medium transition-all duration-200
              ${item.accent ? "bg-black text-white hover:bg-black/90 shadow-sm" : "text-muted-foreground hover:bg-black/[0.035] hover:text-foreground"}
            `}
          >
            <Icon name={item.icon} size={16} />
            <span className="flex-1 text-left">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>

    <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
      <header className="bg-[#f6f6f7]/95 backdrop-blur border-b border-black/5 px-4 md:px-6 xl:px-8 py-4 flex flex-col gap-4 flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-semibold tracking-tight leading-tight">
              {searchQuery ? `Поиск: «${searchQuery}»` : "Лента клипов"}
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
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 xl:px-8 py-6">
        {loadingData ? (
          <div>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div>Нет клипов</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-md">
                <img
                  src={item.preview_url || "/fallback-image.png"}
                  alt={item.title}
                  className="w-full h-40 object-cover rounded-lg"
                />
                <h3 className="text-lg font-semibold mt-4">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>

    <AddBookmarkModal open={modalOpen} onClose={() => setModalOpen(false)} />
  </div>
);
