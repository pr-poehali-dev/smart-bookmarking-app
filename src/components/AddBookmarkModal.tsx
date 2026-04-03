import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/d3363e0f-d684-40b4-9fb3-05c6abb7bc12";

interface Board {
  id: number;
  name: string;
  color: string;
}

interface AddBookmarkModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (bookmark: Record<string, unknown>) => void;
}

const CONTENT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  article: { label: "Статья", icon: "FileText" },
  video: { label: "Видео", icon: "Video" },
  product: { label: "Товар", icon: "ShoppingBag" },
  tool: { label: "Инструмент", icon: "Wrench" },
  site: { label: "Сайт", icon: "Globe" },
};

export default function AddBookmarkModal({ open, onClose, onSaved }: AddBookmarkModalProps) {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [boardId, setBoardId] = useState<number | null>(null);
  const [newBoardName, setNewBoardName] = useState("");
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // AI preview state
  const [aiPreview, setAiPreview] = useState<{
    title: string;
    tags: string[];
    content_type: string;
    suggested_board_id: number | null;
    description: string;
  } | null>(null);
  const [selectedType, setSelectedType] = useState("article");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (open) {
      fetch(`${API_URL}?route=boards`)
        .then((r) => r.json())
        .then((d) => setBoards(d.boards || []))
        .catch(() => {});
    }
  }, [open]);

  const resetForm = () => {
    setUrl("");
    setNote("");
    setBoardId(null);
    setNewBoardName("");
    setShowNewBoard(false);
    setAiPreview(null);
    setSelectedType("article");
    setSelectedTags([]);
    setError("");
    setAnalyzing(false);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    setError("");
    setAiPreview(null);
    try {
      const fullUrl = url.startsWith("http") ? url : "https://" + url;
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fullUrl, note: "", analyze_only: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiPreview({
          title: data.title || fullUrl,
          tags: data.tags || [],
          content_type: data.content_type || "article",
          suggested_board_id: data.ai_suggested_board_id,
          description: data.description || "",
        });
        setSelectedType(data.content_type || "article");
        setSelectedTags(data.tags || []);
        if (data.ai_suggested_board_id && !boardId) {
          setBoardId(data.ai_suggested_board_id);
        }
      }
    } catch {
      setError("Не удалось проанализировать URL");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim()) {
      setError("Введите URL");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fullUrl = url.startsWith("http") ? url : "https://" + url;
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: fullUrl,
          note: note.trim() || null,
          board_id: boardId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка сохранения");
        return;
      }
      onSaved(data);
      handleClose();
    } catch {
      setError("Сетевая ошибка, попробуйте ещё раз");
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
              <Icon name="Plus" size={15} className="text-white" />
            </div>
            <h2 className="text-[15px] font-semibold text-foreground">Добавить закладку</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* URL input */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              URL *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Icon
                  name="Link"
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setAiPreview(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-muted border border-transparent rounded-xl focus:outline-none focus:border-border focus:bg-white transition-all placeholder:text-muted-foreground"
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={!url.trim() || analyzing}
                className="px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 text-[12.5px] font-semibold hover:bg-indigo-100 transition-all disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
              >
                {analyzing ? (
                  <Icon name="Loader2" size={13} className="animate-spin" />
                ) : (
                  <Icon name="Sparkles" size={13} />
                )}
                {analyzing ? "Анализ..." : "AI-анализ"}
              </button>
            </div>
          </div>

          {/* AI preview */}
          {aiPreview && (
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 space-y-3 animate-fade-in">
              <div className="flex items-start gap-2">
                <Icon name="Sparkles" size={13} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] font-semibold text-indigo-600">AI определил:</p>
              </div>

              {/* Title */}
              <p className="text-[13px] font-semibold text-foreground leading-snug">{aiPreview.title}</p>
              {aiPreview.description && (
                <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                  {aiPreview.description}
                </p>
              )}

              {/* Content type selector */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Тип контента:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CONTENT_TYPE_LABELS).map(([type, { label, icon }]) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-all
                        ${selectedType === type
                          ? "bg-indigo-500 text-white"
                          : "bg-white text-muted-foreground hover:text-foreground border border-border"
                        }`}
                    >
                      <Icon name={icon} size={11} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {aiPreview.tags.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Теги (нажми чтобы убрать):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiPreview.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-all
                          ${selectedTags.includes(tag)
                            ? "bg-foreground text-white"
                            : "bg-white text-muted-foreground border border-border line-through opacity-50"
                          }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Заметка <span className="font-normal normal-case opacity-60">(необязательно)</span>
            </label>
            <textarea
              placeholder="Почему сохранил, что важно запомнить..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 text-[13px] bg-muted border border-transparent rounded-xl focus:outline-none focus:border-border focus:bg-white transition-all placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Board selector */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Доска
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setBoardId(null)}
                className={`px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-all border
                  ${boardId === null
                    ? "bg-foreground text-white border-foreground"
                    : "bg-muted text-muted-foreground border-transparent hover:text-foreground"
                  }`}
              >
                Входящие
              </button>
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => setBoardId(board.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-all border
                    ${boardId === board.id
                      ? "bg-foreground text-white border-foreground"
                      : "bg-muted text-muted-foreground border-transparent hover:text-foreground"
                    }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: board.color }}
                  />
                  {board.name}
                </button>
              ))}
              <button
                onClick={() => setShowNewBoard(!showNewBoard)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12.5px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all border border-transparent"
              >
                <Icon name="Plus" size={12} />
                Новая доска
              </button>
            </div>
            {showNewBoard && (
              <div className="flex gap-2 mt-2 animate-fade-in">
                <input
                  type="text"
                  placeholder="Название доски..."
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="flex-1 px-3 py-2 text-[13px] bg-muted border border-transparent rounded-xl focus:outline-none focus:border-border focus:bg-white transition-all placeholder:text-muted-foreground"
                />
                <button
                  onClick={async () => {
                    if (!newBoardName.trim()) return;
                    // Пока просто добавляем локально — в следующей версии добавим API
                    const fakeId = Date.now();
                    const newBoard = { id: fakeId, name: newBoardName.trim(), color: "#6366f1" };
                    setBoards((prev) => [...prev, newBoard]);
                    setBoardId(fakeId);
                    setNewBoardName("");
                    setShowNewBoard(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-foreground text-white text-[12.5px] font-semibold hover:bg-foreground/90 transition-all"
                >
                  Создать
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 rounded-xl border border-red-100">
              <Icon name="AlertCircle" size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-[12.5px] text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <p className="text-[11.5px] text-muted-foreground">
            Сохранится во Входящие и будет AI-обработан
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !url.trim()}
              className="px-5 py-2.5 rounded-xl bg-foreground text-white text-[13px] font-semibold hover:bg-foreground/90 transition-all disabled:opacity-40 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Icon name="Loader2" size={14} className="animate-spin" />
                  Сохраняю...
                </>
              ) : (
                <>
                  <Icon name="BookmarkPlus" size={14} />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
