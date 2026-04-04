import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import AddBookmarkModal from "@/components/AddBookmarkModal";

const API_URL =
  "https://functions.poehali.dev/d3363e0f-d684-40b4-9fb3-05c6abb7bc12";

// Шаг 1. Удаление закладки
const deleteBookmark = (id: number) => {
  fetch(`${API_URL}/${id}`, { method: "DELETE" })
    .then(() => {
      setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id));
      setSavedItems((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    })
    .catch((error) => console.error("Ошибка при удалении:", error));
};

// Функция для проверки ориентации видео
function getVideoOrientation(src: string): Promise<"vertical" | "horizontal"> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = src;
    video.onloadedmetadata = () => {
      resolve(video.videoWidth < video.videoHeight ? "vertical" : "horizontal");
    };
  });
}

// Шаг 2. Логика для плеера
export default function Index() {
  const [playerItem, setPlayerItem] = useState<Bookmark | null>(null);
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">(
    "horizontal",
  );

  useEffect(() => {
    if (playerItem && playerItem.embed_url) {
      getVideoOrientation(playerItem.embed_url).then(setOrientation);
    }
  }, [playerItem]);

  const playerClass =
    orientation === "vertical" ? "aspect-[9/16]" : "aspect-video";

  return (
    <div className="flex h-screen bg-[#f6f6f7] overflow-hidden font-sans text-foreground">
      <aside className="hidden xl:flex w-64 flex-shrink-0 bg-white border-r border-black/5 flex-col h-full">
        {/* Sidebar */}
      </aside>

      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 xl:px-8 py-6">
          {/* Контент */}
          {bookmarks.map((item) => (
            <div key={item.id} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBookmark(item.id);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg text-white bg-red-500 hover:bg-red-600"
              >
                <Icon name="Trash" size={14} />
              </button>

              <div className="overflow-hidden rounded-[28px] bg-white border border-black/6 shadow-[0_10px_28px_rgba(0,0,0,0.06)] transition-all duration-300">
                <div className={playerClass}>
                  {item.preview_url ? (
                    <img
                      src={item.preview_url}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-black/10" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Модалка добавления закладки */}
      <AddBookmarkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
