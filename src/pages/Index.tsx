import { useState } from "react";
import Icon from "@/components/ui/icon";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "inbox", label: "Входящие", icon: "Inbox", badge: 3 },
  { id: "boards", label: "Доски", icon: "SquareKanban" },
  { id: "add", label: "Добавить", icon: "Plus", accent: true },
];

const TAGS = ["Все", "Дизайн", "Разработка", "Маркетинг", "Статьи", "Видео", "Инструменты"];

const BOOKMARKS = [
  {
    id: 1,
    title: "Principles of Beautiful UI",
    url: "nngroup.com",
    description: "Ключевые принципы визуального дизайна от Nielsen Norman Group — иерархия, контраст и пространство.",
    tags: ["Дизайн"],
    category: "Статьи",
    color: "#f0f4ff",
    icon: "Palette",
    time: "2 часа назад",
    saved: true,
  },
  {
    id: 2,
    title: "Shadcn UI Components",
    url: "ui.shadcn.com",
    description: "Библиотека переиспользуемых компонентов для React, построенная на Radix UI и Tailwind CSS.",
    tags: ["Разработка"],
    category: "Инструменты",
    color: "#f0fdf4",
    icon: "Code2",
    time: "Вчера",
    saved: true,
  },
  {
    id: 3,
    title: "Копирайтинг для SaaS",
    url: "copyhackers.com",
    description: "Как писать тексты для продуктовых лендингов и онбординга, которые конвертируют.",
    tags: ["Маркетинг"],
    category: "Статьи",
    color: "#fff7ed",
    icon: "FileText",
    time: "3 дня назад",
    saved: false,
  },
  {
    id: 4,
    title: "Figma Auto Layout 2024",
    url: "figma.com/learn",
    description: "Полное руководство по Auto Layout — создавай адаптивные компоненты без лишнего кода.",
    tags: ["Дизайн"],
    category: "Видео",
    color: "#fdf4ff",
    icon: "Video",
    time: "Неделю назад",
    saved: true,
  },
  {
    id: 5,
    title: "TypeScript Cheat Sheet",
    url: "typescriptlang.org",
    description: "Быстрый справочник по типам, утилитам и паттернам TypeScript для ежедневной работы.",
    tags: ["Разработка"],
    category: "Инструменты",
    color: "#eff6ff",
    icon: "Terminal",
    time: "2 недели назад",
    saved: false,
  },
  {
    id: 6,
    title: "Growth Loops vs Funnels",
    url: "reforge.com",
    description: "Почему продуктовые петли роста эффективнее классических воронок — разбор на примерах.",
    tags: ["Маркетинг"],
    category: "Статьи",
    color: "#fefce8",
    icon: "TrendingUp",
    time: "Месяц назад",
    saved: true,
  },
];

const BOARDS = [
  { id: 1, name: "Дизайн-ресурсы", count: 24, color: "#6366f1" },
  { id: 2, name: "Стартап-инсайты", count: 18, color: "#10b981" },
  { id: 3, name: "Dev инструменты", count: 31, color: "#f59e0b" },
];

export default function Index() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [activeTag, setActiveTag] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedItems, setSavedItems] = useState<Set<number>>(
    new Set(BOOKMARKS.filter((b) => b.saved).map((b) => b.id))
  );

  const toggleSaved = (id: number) => {
    setSavedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const filtered = BOOKMARKS.filter((b) => {
    const matchTag = activeTag === "Все" || b.tags.includes(activeTag);
    const matchSearch =
      !searchQuery ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTag && matchSearch;
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-border flex flex-col h-full">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
              <Icon name="BookMarked" size={15} className="text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">НаПолке</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 group
                ${item.accent
                  ? "bg-foreground text-white hover:bg-foreground/90"
                  : activeNav === item.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <Icon name={item.icon} size={16} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="text-[11px] font-semibold bg-foreground text-white rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Boards */}
          <div className="pt-5 pb-1 px-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Мои доски
            </span>
          </div>
          {BOARDS.map((board) => (
            <button
              key={board.id}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: board.color }}
              />
              <span className="flex-1 text-left truncate">{board.name}</span>
              <span className="text-[11px] text-muted-foreground/60">{board.count}</span>
            </button>
          ))}
        </nav>

        {/* Settings */}
        <div className="px-3 pb-5 border-t border-border pt-3">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
            <Icon name="Settings" size={16} />
            <span>Настройки</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[12px] font-semibold text-foreground">
              А
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">Алексей</p>
              <p className="text-[11px] text-muted-foreground truncate">Pro план</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-border px-8 py-4 flex items-center gap-4 flex-shrink-0">
          <div className="flex-1">
            <h1 className="text-[18px] font-semibold text-foreground leading-tight">Все закладки</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">{filtered.length} материалов</p>
          </div>

          {/* Search */}
          <div className="relative w-72">
            <Icon
              name="Search"
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Поиск закладок..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-[13px] bg-muted border border-transparent rounded-xl focus:outline-none focus:border-border focus:bg-white transition-all placeholder:text-muted-foreground"
            />
          </div>

          {/* AI badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100">
            <Icon name="Sparkles" size={13} className="text-indigo-500" />
            <span className="text-[12px] font-semibold text-indigo-600">AI-сортировка</span>
          </div>
        </header>

        {/* Tags row */}
        <div className="bg-white border-b border-border px-8 py-3 flex items-center gap-2 flex-shrink-0 overflow-x-auto">
          {TAGS.map((tag) => (
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

        {/* Cards grid */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-fade-in">
              <Icon name="SearchX" size={36} className="mb-3 opacity-40" />
              <p className="text-[14px] font-medium">Ничего не найдено</p>
              <p className="text-[12px] opacity-60 mt-1">Попробуйте изменить запрос или тег</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item, i) => (
                <div
                  key={item.id}
                  className="bg-white border border-border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group animate-fade-in flex flex-col gap-3"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon name={item.icon} size={18} className="text-foreground/70" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaved(item.id);
                      }}
                      className={`p-1.5 rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100
                        ${savedItems.has(item.id) ? "!opacity-100 text-indigo-500" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Icon
                        name={savedItems.has(item.id) ? "Bookmark" : "BookmarkPlus"}
                        size={15}
                      />
                    </button>
                  </div>

                  {/* Title & url */}
                  <div>
                    <h3 className="text-[14px] font-semibold text-foreground leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Icon name="Globe" size={10} />
                      {item.url}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-[12.5px] text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                    {item.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/60">
                    <div className="flex gap-1.5 flex-wrap">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/60 flex-shrink-0">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}