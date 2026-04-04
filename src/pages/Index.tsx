import { useState, useEffect, useRef, useMemo } from "react";
import Icon from "@/components/ui/icon";
import AddBookmarkModal from "@/components/AddBookmarkModal";

const API_URL =
  "https://functions.poehali.dev/d3363e0f-d684-40b4-9fb3-05c6abb7bc12";

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
  preview_url: string | null;
  favicon_url: string | null;
  embed_url: string | null;
  is_inbox: boolean;
  created_at: string;
}

function getYouTubeId(url: string) {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "");
    }

    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v");
    }

    return null;
  } catch {
    return null;
  }
}

function buildEmbed(url: string) {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtube")) {
      const id = getYouTubeId(url);
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }

    if (u.hostname.includes("instagram")) {
      return `https://www.instagram.com${u.pathname}embed`;
    }

    if (u.hostname.includes("tiktok")) {
      return `https://www.tiktok.com/embed${u.pathname}`;
    }

    return null;
  } catch {
    return null;
  }
}

function getAspect(item: Bookmark) {
  const url = item.url.toLowerCase();

  if (
    url.includes("tiktok") ||
    url.includes("instagram.com/reel") ||
    url.includes("youtube.com/shorts") ||
    url.includes("vk.com/clip")
  ) {
    return "aspect-[9/16]";
  }

  return "aspect-video";
}

function getPlayerAspect(item: Bookmark) {
  const url = item.url.toLowerCase();

  const vertical =
    url.includes("tiktok") ||
    url.includes("instagram.com/reel") ||
    url.includes("youtube.com/shorts") ||
    url.includes("vk.com/clip");

  return {
    frame: vertical ? "max-w-[420px]" : "max-w-5xl",
    ratio: vertical ? "9/16" : "16/9",
  };
}

export default function Index() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState(false);

  useEffect(() => {
    fetch(API_URL)
      .then((r) => r.json())
      .then((d) => {
        setBookmarks(d.bookmarks || []);
        setSaved(new Set((d.bookmarks || []).map((b: Bookmark) => b.id)));
      });
  }, []);

  const current = playerIndex !== null ? bookmarks[playerIndex] || null : null;

  const layout = current ? getPlayerAspect(current) : null;

  function open(item: Bookmark) {
    const i = bookmarks.findIndex((b) => b.id === item.id);
    setPlayerIndex(i);
  }

  function next() {
    if (playerIndex === null) return;
    setPlayerIndex((playerIndex + 1) % bookmarks.length);
  }

  function prev() {
    if (playerIndex === null) return;
    setPlayerIndex((playerIndex - 1 + bookmarks.length) % bookmarks.length);
  }

  function del(id: number) {
    setBookmarks((p) => p.filter((b) => b.id !== id));
    setSaved((p) => {
      const n = new Set(p);
      n.delete(id);
      return n;
    });
  }

  function toggle(id: number) {
    setSaved((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (playerIndex === null) return;

      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") setPlayerIndex(null);
    }

    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return (
    <div className="min-h-screen bg-[#f6f6f7] p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-semibold">Bookmarks Feed</h1>

        <button
          onClick={() => setModal(true)}
          className="bg-black text-white px-4 py-2 rounded-xl"
        >
          Добавить
        </button>
      </div>

      <div className="columns-2 md:columns-3 xl:columns-4 gap-5">
        {bookmarks.map((item) => {
          const preview =
            item.preview_url ||
            (getYouTubeId(item.url)
              ? `https://i.ytimg.com/vi/${getYouTubeId(item.url)}/hqdefault.jpg`
              : null);

          return (
            <div
              key={item.id}
              onClick={() => open(item)}
              className="mb-5 break-inside-avoid cursor-pointer group"
            >
              <div className="bg-white rounded-3xl overflow-hidden shadow hover:-translate-y-1 transition">
                <div className={`${getAspect(item)} bg-black relative`}>
                  {preview ? (
                    <img
                      src={preview}
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-orange-400" />
                  )}

                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        del(item.id);
                      }}
                      className="bg-red-500 text-white p-2 rounded-full"
                    >
                      <Icon name="Trash2" size={14} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(item.id);
                      }}
                      className="bg-black/60 text-white p-2 rounded-full"
                    >
                      <Icon
                        name={saved.has(item.id) ? "Bookmark" : "BookmarkPlus"}
                        size={14}
                      />
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <p className="font-semibold text-sm line-clamp-2">
                    {item.title || item.source}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AddBookmarkModal
        open={modal}
        onClose={() => setModal(false)}
        onSaved={(b) => setBookmarks((p) => [b, ...p])}
      />

      {current && layout && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center"
          onClick={() => setPlayerIndex(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-6 text-white"
          >
            <Icon name="ChevronLeft" size={40} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-6 text-white"
          >
            <Icon name="ChevronRight" size={40} />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-black rounded-3xl overflow-hidden w-full ${layout.frame}`}
          >
            <div style={{ aspectRatio: layout.ratio }} className="relative">
              <iframe
                src={current.embed_url || buildEmbed(current.url) || undefined}
                className="absolute inset-0 w-full h-full"
                allow="autoplay;fullscreen"
                allowFullScreen
              />
            </div>

            <div className="bg-[#111] p-4 text-white flex justify-between">
              <div>
                <p className="text-sm font-semibold">{current.title}</p>

                <p className="text-xs opacity-60">
                  {playerIndex! + 1} / {bookmarks.length}
                </p>
              </div>

              <div className="flex gap-2">
                <a
                  href={current.url}
                  target="_blank"
                  className="bg-white/10 px-3 py-1 rounded"
                >
                  Открыть
                </a>

                <button
                  onClick={() => setPlayerIndex(null)}
                  className="bg-white/10 px-3 py-1 rounded"
                >
                  X
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
