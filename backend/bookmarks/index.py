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


def fetch_page_meta(url: str) -> dict:
    """Пытаемся получить title и description страницы."""
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; NaPolkeBot/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw = resp.read(32768).decode("utf-8", errors="ignore")

        title_match = re.search(r"<title[^>]*>(.*?)</title>", raw, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else ""
        title = re.sub(r"\s+", " ", title)[:255]

        desc_match = re.search(
            r'<meta[^>]+(?:name=["\']description["\']|property=["\']og:description["\'])[^>]+content=["\']([^"\']+)',
            raw, re.IGNORECASE
        )
        description = desc_match.group(1).strip()[:512] if desc_match else ""

        preview_match = re.search(
            r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
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


def ai_analyze(url: str, title: str, description: str, boards: list) -> dict:
    """Отправляем запрос в GigaChat для анализа закладки."""
    import ssl
    token = get_gigachat_token()
    if not token:
        return _fallback_analyze(url, title)

    boards_info = ", ".join([f"{b['id']}: {b['name']}" for b in boards])
    prompt = f"""Проанализируй закладку и верни JSON.

URL: {url}
Заголовок: {title}
Описание: {description}

Доступные доски: {boards_info}

Верни ТОЛЬКО JSON без пояснений:
{{
  "content_type": "article|video|product|tool|site",
  "tags": ["тег1", "тег2", "тег3", "тег4", "тег5"],
  "suggested_board_id": <id одной из досок или null>,
  "title_improved": "<улучшенный заголовок если оригинал плохой, иначе пустая строка>"
}}

Правила:
- content_type: article (статья/пост), video (youtube/vimeo), product (магазин/товар), tool (сервис/инструмент), site (другое)
- tags: 3-5 тегов на русском языке, коротко
- suggested_board_id: выбери наиболее подходящую доску или null
"""

    payload = json.dumps({
        "model": "GigaChat",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 300,
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

    with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
        result = json.loads(resp.read().decode())

    content = result["choices"][0]["message"]["content"].strip()
    content = re.sub(r"```json|```", "", content).strip()
    return json.loads(content)


def _fallback_analyze(url: str, title: str) -> dict:
    """Простой анализ без AI."""
    url_lower = url.lower()
    if any(x in url_lower for x in ["youtube", "vimeo", "rutube"]):
        content_type = "video"
    elif any(x in url_lower for x in ["shop", "store", "ozon", "wildberries", "market"]):
        content_type = "product"
    elif any(x in url_lower for x in ["github", "npm", "pypi"]):
        content_type = "tool"
    else:
        content_type = "article"

    return {
        "content_type": content_type,
        "tags": ["закладка"],
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
            ai_result = _fallback_analyze(url, title)

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