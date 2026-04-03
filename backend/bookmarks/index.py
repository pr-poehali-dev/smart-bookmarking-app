"""
Обработка закладок: сохранение, AI-анализ URL, получение списка.
"""
import json
import os
import re
import urllib.request
import urllib.parse
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p23581474_smart_bookmarking_ap")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def extract_domain(url: str) -> str:
    try:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc or parsed.path
        return domain.replace("www.", "")
    except Exception:
        return url


def fetch_youtube_meta(url: str) -> dict:
    """Получаем мета видео YouTube через oEmbed API."""
    try:
        oembed_url = "https://www.youtube.com/oembed?url=" + urllib.parse.quote(url) + "&format=json"
        req = urllib.request.Request(
            oembed_url,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
        title = data.get("title", "").strip()
        author = data.get("author_name", "").strip()
        description = f"Видео от канала «{author}»" if author else ""
        preview_url = data.get("thumbnail_url")
        return {"title": title, "description": description, "preview_url": preview_url}
    except Exception:
        return {"title": "", "description": "", "preview_url": None}


def fetch_habr_meta(article_id: str) -> dict:
    """Получаем мета статьи Хабра через публичный API."""
    try:
        api_url = f"https://habr.com/kek/v2/articles/{article_id}/?fl=ru"
        req = urllib.request.Request(
            api_url,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
        title = data.get("titleHtml", "") or data.get("title", "")
        title = re.sub(r"<[^>]+>", "", title).strip()
        lead = data.get("leadData", {}) or {}
        description = lead.get("textHtml", "") or ""
        description = re.sub(r"<[^>]+>", "", description).strip()[:500]
        preview_url = (data.get("leadData") or {}).get("imageUrl")
        return {"title": title, "description": description, "preview_url": preview_url}
    except Exception:
        return {"title": "", "description": "", "preview_url": None}


def fetch_page_meta(url: str) -> dict:
    """Пытаемся получить title и description страницы."""
    # YouTube — через oEmbed
    if re.search(r"(youtube\.com/watch|youtu\.be/)", url):
        result = fetch_youtube_meta(url)
        if result["title"]:
            return result

    # Хабр — через публичный API
    habr_match = re.search(r"habr\.com/[^/]+/articles/(\d+)", url)
    if habr_match:
        result = fetch_habr_meta(habr_match.group(1))
        if result["title"]:
            return result

    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                              "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
            },
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw = resp.read(65536).decode("utf-8", errors="ignore")

        title_match = re.search(r"<title[^>]*>(.*?)</title>", raw, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else ""
        title = re.sub(r"\s+", " ", title)[:255]
        # Убираем суффиксы типа "| Habr", "— YouTube", "- VK"
        title = re.sub(r"\s*[|—\-–]\s*(Habr|Хабр|YouTube|VK|ВКонтакте|Telegram).*$", "", title, flags=re.IGNORECASE).strip()

        # og:description или name=description — пробуем оба варианта
        desc_match = re.search(
            r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']{10,})',
            raw, re.IGNORECASE
        ) or re.search(
            r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']{10,})',
            raw, re.IGNORECASE
        ) or re.search(
            r'<meta[^>]+content=["\']([^"\']{10,})["\'][^>]+name=["\']description["\']',
            raw, re.IGNORECASE
        )
        description = desc_match.group(1).strip()[:512] if desc_match else ""

        preview_match = re.search(
            r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
            raw, re.IGNORECASE
        ) or re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
            raw, re.IGNORECASE
        )
        preview_url = preview_match.group(1).strip() if preview_match else None

        return {"title": title, "description": description, "preview_url": preview_url}
    except Exception:
        return {"title": "", "description": "", "preview_url": None}


def get_gigachat_token() -> str:
    """Получаем Bearer-токен GigaChat через OAuth."""
    import uuid
    import ssl
    auth_key = os.environ.get("GIGACHAT_AUTH_KEY", "")
    if not auth_key:
        return ""

    payload = urllib.parse.urlencode({"scope": "GIGACHAT_API_PERS"}).encode("utf-8")
    req = urllib.request.Request(
        "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
        data=payload,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "RqUID": str(uuid.uuid4()),
            "Authorization": f"Basic {auth_key}",
        },
        method="POST",
    )
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
        data = json.loads(resp.read().decode())
    return data.get("access_token", "")


def parse_ai_json(raw: str) -> dict:
    """Надёжный парсинг JSON из ответа GigaChat — вырезаем первый валидный объект."""
    # убираем markdown-блоки
    raw = re.sub(r"```json|```", "", raw).strip()
    # пробуем весь текст целиком
    try:
        return json.loads(raw)
    except Exception:
        pass
    # ищем первый {...} блок в тексте
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return {}


def ai_analyze(url: str, title: str, description: str, boards: list) -> dict:
    """Отправляем запрос в GigaChat для анализа закладки."""
    import ssl
    token = get_gigachat_token()
    if not token:
        return _fallback_analyze(url, title, description)

    boards_info = ", ".join([f"{b['id']}: {b['name']}" for b in boards]) if boards else "нет досок"

    # Подсказка GigaChat когда описание пустое — попросим угадать тему по URL
    hint = ""
    if not description and title in ("", url):
        hint = (
            "Описание недоступно. Определи тему по структуре URL и домену: "
            "slugи, path-сегменты и параметры часто раскрывают содержание.\n"
        )

    prompt = (
        "Ты — система классификации закладок. "
        "Ответь ТОЛЬКО валидным JSON-объектом без пояснений и без markdown-блоков.\n\n"
        f"URL: {url}\n"
        f"Заголовок: {title}\n"
        f"Описание: {description[:400] if description else '(недоступно)'}\n"
        f"Доски пользователя: {boards_info}\n"
        f"{hint}\n"
        "Пример ответа:\n"
        '{"content_type":"article","tags":["Python","программирование","обучение"],'
        '"suggested_board_id":2,"title_improved":""}\n\n'
        "Требования к тегам:\n"
        "- 3–5 тегов, отражающих ТЕМУ материала (не источник, не домен)\n"
        "- на русском языке, конкретные: технология, область знаний, концепция, индустрия\n"
        "- НЕЛЬЗЯ использовать: 'закладка', 'ссылка', 'статья', 'видео', название сайта\n"
        "- Примеры хороших тегов: 'TypeScript', 'продуктовый дизайн', 'SEO', 'стартапы', 'UX-исследования'\n\n"
        "Остальные поля:\n"
        "- content_type: article / video / product / tool / site\n"
        "- suggested_board_id: id подходящей доски или null\n"
        "- title_improved: читаемый заголовок если оригинал — это просто домен или мусор, иначе пустая строка"
    )

    payload = json.dumps({
        "model": "GigaChat",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.25,
        "max_tokens": 400,
    }).encode("utf-8")

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=25, context=ctx) as resp:
        result = json.loads(resp.read().decode())

    content = result["choices"][0]["message"]["content"].strip()
    parsed = parse_ai_json(content)

    # Фильтруем мусорные теги
    bad_tags = {
        "закладка", "ссылка", "url", "link", "bookmark", "статья", "видео",
        "сайт", "страница", "material", "content",
    }
    tags = parsed.get("tags", [])
    tags = [t for t in tags if t.lower() not in bad_tags and len(t) > 1]

    # Если GigaChat вернул пустые теги — берём умный fallback
    if not tags:
        tags = _extract_keywords(url, title, description)
    parsed["tags"] = tags[:5]

    return parsed


def _extract_keywords(url: str, title: str, description: str = "") -> list:
    """Извлекаем значимые слова из заголовка и URL для тегов."""
    stop_words = {
        "и", "в", "на", "с", "по", "для", "от", "к", "из", "о", "об", "как",
        "что", "это", "или", "а", "но", "не", "при", "за", "до", "со",
        "the", "a", "an", "of", "in", "on", "for", "to", "and", "or", "is",
        "are", "be", "by", "at", "from", "with", "that", "this",
        "com", "ru", "org", "net", "www", "http", "https",
    }
    text = f"{title} {description[:150]}"
    words = re.findall(r"[а-яёА-ЯЁa-zA-Z]{4,}", text)
    seen = set()
    tags = []
    for w in words:
        w_low = w.lower()
        if w_low not in stop_words and w_low not in seen:
            seen.add(w_low)
            tags.append(w.capitalize() if w[0].isupper() else w_low)
        if len(tags) == 4:
            break

    # добавляем домен как тег если тегов мало
    domain = re.sub(r"www\.", "", urllib.parse.urlparse(url).netloc or "")
    domain = re.sub(r"\.(com|ru|org|net|io)$", "", domain)
    if domain and domain not in seen and len(tags) < 3:
        tags.append(domain)

    return tags or ["контент"]


def _fallback_analyze(url: str, title: str, description: str = "") -> dict:
    """Анализ без AI — по URL и заголовку."""
    url_lower = url.lower()
    if any(x in url_lower for x in ["youtube", "youtu.be", "vimeo", "rutube", "vkvideo", "kinescope"]):
        content_type = "video"
    elif any(x in url_lower for x in ["ozon", "wildberries", "aliexpress", "shop", "store", "market", "product"]):
        content_type = "product"
    elif any(x in url_lower for x in ["github", "gitlab", "npm", "pypi", "figma", "notion", "trello"]):
        content_type = "tool"
    elif any(x in url_lower for x in ["habr", "medium", "vc.ru", "tjournal", "blog", "post", "article"]):
        content_type = "article"
    else:
        content_type = "site"

    tags = _extract_keywords(url, title, description)

    return {
        "content_type": content_type,
        "tags": tags,
        "suggested_board_id": None,
        "title_improved": "",
    }


def handler(event: dict, context) -> dict:
    """Управление закладками: GET /bookmarks, POST /bookmarks, GET /boards"""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    path = event.get("path", "/")
    method = event.get("httpMethod", "GET")
    query = event.get("queryStringParameters") or {}
    route = query.get("route", "")

    # GET /boards или ?route=boards — список досок
    if (("/boards" in path) or route == "boards") and method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id, name, color FROM {SCHEMA}.boards ORDER BY id")
        rows = cur.fetchall()
        conn.close()
        boards = [{"id": r[0], "name": r[1], "color": r[2]} for r in rows]
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"boards": boards}),
        }

    # GET /bookmarks — список закладок
    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            SELECT b.id, b.url, b.title, b.description, b.note, b.source,
                   b.content_type, b.tags, b.board_id, b.preview_url,
                   b.favicon_url, b.is_inbox, b.created_at,
                   bo.name as board_name, bo.color as board_color
            FROM {SCHEMA}.bookmarks b
            LEFT JOIN {SCHEMA}.boards bo ON b.board_id = bo.id
            ORDER BY b.created_at DESC
        """)
        rows = cur.fetchall()
        conn.close()
        bookmarks = []
        for r in rows:
            bookmarks.append({
                "id": r[0], "url": r[1], "title": r[2], "description": r[3],
                "note": r[4], "source": r[5], "content_type": r[6],
                "tags": r[7] or [], "board_id": r[8], "preview_url": r[9],
                "favicon_url": r[10], "is_inbox": r[11],
                "created_at": r[12].isoformat() if r[12] else None,
                "board_name": r[13], "board_color": r[14],
            })
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"bookmarks": bookmarks}),
        }

    # POST /bookmarks — добавить закладку
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        url = body.get("url", "").strip()
        note = (body.get("note") or "").strip()
        board_id = body.get("board_id")  # None или int

        if not url:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "URL обязателен"}),
            }

        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        source = extract_domain(url)
        favicon_url = f"https://www.google.com/s2/favicons?domain={source}&sz=64"

        # Получаем мета-данные страницы
        meta = fetch_page_meta(url)
        title = meta["title"] or source
        description = meta["description"] or ""
        preview_url = meta["preview_url"]

        # Загружаем доски для AI
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id, name FROM {SCHEMA}.boards ORDER BY id")
        boards = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]

        # AI-анализ
        ai_result = {}
        try:
            ai_result = ai_analyze(url, title, description, boards)
        except Exception:
            ai_result = _fallback_analyze(url, title, description)

        content_type = ai_result.get("content_type", "article")
        tags = ai_result.get("tags", [])
        suggested_board_id = ai_result.get("suggested_board_id")
        improved_title = ai_result.get("title_improved", "")
        if improved_title:
            title = improved_title

        # Если пользователь не выбрал доску — берём AI-предложение
        final_board_id = board_id if board_id else suggested_board_id

        cur.execute(
            f"""INSERT INTO {SCHEMA}.bookmarks
                (url, title, description, note, source, content_type, tags,
                 board_id, preview_url, favicon_url, is_inbox, ai_suggested_board_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at""",
            (url, title, description, note or None, source, content_type,
             tags, final_board_id, preview_url, favicon_url, True, suggested_board_id),
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()

        return {
            "statusCode": 201,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "id": row[0],
                "url": url,
                "title": title,
                "description": description,
                "note": note,
                "source": source,
                "content_type": content_type,
                "tags": tags,
                "board_id": final_board_id,
                "preview_url": preview_url,
                "favicon_url": favicon_url,
                "is_inbox": True,
                "ai_suggested_board_id": suggested_board_id,
                "created_at": row[1].isoformat() if row[1] else None,
            }),
        }

    return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "Not found"})}