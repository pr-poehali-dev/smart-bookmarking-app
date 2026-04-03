ALTER TABLE t_p23581474_smart_bookmarking_ap.bookmarks
    ADD COLUMN IF NOT EXISTS topic character varying(100) NULL;

CREATE INDEX IF NOT EXISTS idx_bookmarks_topic
    ON t_p23581474_smart_bookmarking_ap.bookmarks (topic);

CREATE INDEX IF NOT EXISTS idx_bookmarks_title_search
    ON t_p23581474_smart_bookmarking_ap.bookmarks
    USING gin(to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(description, '')));
