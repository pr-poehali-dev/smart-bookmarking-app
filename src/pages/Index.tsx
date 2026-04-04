import React, { useMemo, useRef, useState } from "react";

type VideoItem = {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  orientation?: "vertical" | "horizontal";
};

const initialVideos: VideoItem[] = [
  {
    id: "1",
    title: "Vertical reel",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80",
    orientation: "vertical",
  },
  {
    id: "2",
    title: "Horizontal video",
    videoUrl:
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    orientation: "horizontal",
  },
  {
    id: "3",
    title: "Another reel",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    orientation: "vertical",
  },
];

type PlayerCardProps = {
  item: VideoItem;
  onDelete: (id: string) => void;
};

function PlayerCard({ item, onDelete }: PlayerCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const aspectRatioClass =
    item.orientation === "vertical" ? "aspect-[9/16]" : "aspect-video";

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Video play error:", error);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    <article className="group rounded-2xl overflow-hidden bg-zinc-900 text-white shadow-lg border border-zinc-800">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm sm:text-base font-medium truncate">
          {item.title}
        </h3>

        <button
          onClick={() => onDelete(item.id)}
          className="shrink-0 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 px-3 py-1.5 text-sm transition"
          aria-label={`Delete ${item.title}`}
        >
          Delete
        </button>
      </div>

      <div className="p-3">
        <div
          className={`relative w-full ${aspectRatioClass} rounded-xl overflow-hidden bg-black`}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-contain bg-black"
            controls
            preload="metadata"
            playsInline
            poster={item.thumbnailUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
          >
            <source src={item.videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition"
              aria-label={`Play ${item.title}`}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black text-xl shadow-xl">
                ▶
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Index() {
  const [videos, setVideos] = useState<VideoItem[]>(initialVideos);

  const hasVideos = useMemo(() => videos.length > 0, [videos]);

  const handleDelete = (id: string) => {
    setVideos((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">Bookmarks Feed</h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-400">
            Лента закладок в стиле reels / tiktok
          </p>
        </header>

        {!hasVideos ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-10 text-center text-zinc-400">
            Нет карточек
          </div>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {videos.map((item) => (
              <PlayerCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
