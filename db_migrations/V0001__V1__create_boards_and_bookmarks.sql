
CREATE TABLE IF NOT EXISTS t_p23581474_smart_bookmarking_ap.boards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p23581474_smart_bookmarking_ap.bookmarks (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    title VARCHAR(512),
    description TEXT,
    note TEXT,
    source VARCHAR(255),
    content_type VARCHAR(50) DEFAULT 'article',
    tags TEXT[] DEFAULT '{}',
    board_id INTEGER,
    preview_url TEXT,
    favicon_url TEXT,
    is_inbox BOOLEAN DEFAULT TRUE,
    ai_suggested_board_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
