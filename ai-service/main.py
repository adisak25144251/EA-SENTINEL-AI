from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import json
import urllib.parse
import urllib.request
from fastapi import HTTPException
from pydantic import BaseModel

from pydantic import BaseModel
from typing import Optional


class UTF8JSONResponse(JSONResponse):
    media_type = "application/json; charset=utf-8"


# -----------------------------
# Pydantic Models (match frontend types)
# -----------------------------
class AnalyzeEaTradePayload(BaseModel):
    open_time: str
    close_time: str
    symbol: str
    direction: str
    lot: float
    open_price: float
    close_price: float
    pips: float
    profit: float


class AnalyzeEaPayload(BaseModel):
    ea_name: str
    account_id: int
    symbol: str
    timeframe: str
    trades: List[AnalyzeEaTradePayload] = Field(default_factory=list)


class SummaryMetrics(BaseModel):
    total_trades: int
    win_rate: float
    loss_rate: float
    expectancy: float
    profit_factor: Optional[float] = None
    max_drawdown: float
    max_drawdown_pct: Optional[float] = None


class RiskFlag(BaseModel):
    type: str
    level: str
    message: str


class Anomaly(BaseModel):
    index: int
    type: str
    message: str


class Suggestion(BaseModel):
    type: str
    priority: str
    text: str


class AnalyzeEaResponse(BaseModel):
    summaryMetrics: SummaryMetrics
    riskFlags: List[RiskFlag]
    regimeStats: Dict[str, Any]
    anomalies: List[Anomaly]
    suggestions: List[Suggestion]
    regime_breakdown: Optional[Dict[str, int]] = None


# -----------------------------
# FastAPI App
# -----------------------------
app = FastAPI(
    title="EA Sentinel AI",
    version="0.1.0",
    default_response_class=UTF8JSONResponse,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"name": "EA Sentinel AI", "ok": True}


@app.get("/health")
def health():
    return {"ok": True}


def _compute_max_drawdown(profits: List[float]) -> tuple[float, Optional[float]]:
    if not profits:
        return 0.0, None
    equity = 0.0
    peak = 0.0
    max_dd = 0.0
    max_dd_pct: Optional[float] = None
    for p in profits:
        equity += float(p)
        if equity > peak:
            peak = equity
        dd = peak - equity
        if dd > max_dd:
            max_dd = dd
            max_dd_pct = (dd / peak) if peak > 0 else None
    return float(max_dd), max_dd_pct


@app.post("/analyze-ea", response_model=AnalyzeEaResponse)
def analyze_ea(payload: AnalyzeEaPayload):
    trades = payload.trades or []
    n = len(trades)

    profits = [float(t.profit) for t in trades]
    wins = [p for p in profits if p > 0]
    losses = [p for p in profits if p < 0]

    total_trades = n
    win_rate = (len(wins) / n) if n else 0.0
    loss_rate = (len(losses) / n) if n else 0.0
    expectancy = (sum(profits) / n) if n else 0.0

    profit_factor: Optional[float] = None
    if losses:
        loss_abs = abs(sum(losses))
        profit_factor = (sum(wins) / loss_abs) if loss_abs > 0 else None

    max_dd, max_dd_pct = _compute_max_drawdown(profits)

    risk_flags: List[RiskFlag] = []
    anomalies: List[Anomaly] = []
    suggestions: List[Suggestion] = []

    if total_trades < 30:
        risk_flags.append(
            RiskFlag(
                type="sample_size",
                level="medium",
                message="จำนวนเทรดน้อย อาจสรุปผลคลาดเคลื่อน",
            )
        )
    if profit_factor is not None and profit_factor < 1.0:
        risk_flags.append(
            RiskFlag(
                type="profit_factor",
                level="high",
                message="Profit Factor < 1.0 (ระบบขาดทุนเชิงสถิติ)",
            )
        )
    if max_dd_pct is not None and max_dd_pct > 0.25:
        risk_flags.append(
            RiskFlag(
                type="drawdown",
                level="high",
                message="Max Drawdown สูง (>25%) ควรทบทวนการจัดการความเสี่ยง",
            )
        )

    if total_trades == 0:
        suggestions.append(
            Suggestion(
                type="data",
                priority="high",
                text="ยังไม่มีรายการเทรด ส่ง trades เข้ามาเพื่อวิเคราะห์",
            )
        )
    else:
        suggestions.append(
            Suggestion(
                type="risk",
                priority="medium",
                text="พิจารณาใช้ position sizing ตามความเสี่ยงคงที่ต่อไม้ (เช่น 0.5–1%/trade)",
            )
        )
        suggestions.append(
            Suggestion(
                type="validation",
                priority="medium",
                text="แนะนำทำ walk-forward / out-of-sample เพื่อเช็คความเสถียรก่อนใช้เงินจริง",
            )
        )

    return AnalyzeEaResponse(
        summaryMetrics=SummaryMetrics(
            total_trades=total_trades,
            win_rate=win_rate,
            loss_rate=loss_rate,
            expectancy=expectancy,
            profit_factor=profit_factor,
            max_drawdown=max_dd,
            max_drawdown_pct=max_dd_pct,
        ),
        riskFlags=risk_flags,
        regimeStats={"regime": "unknown"},
        anomalies=anomalies,
        suggestions=suggestions,
        regime_breakdown={"unknown": total_trades},
    )


# -----------------------------
# MYFXBOOK PROXY (SECURE: POST only)
# -----------------------------
MYFXBOOK_API_BASE = "https://www.myfxbook.com/api"


class MyfxbookLoginIn(BaseModel):
    email: str
    password: str


class MyfxbookSessionIn(BaseModel):
    session: str


def _myfxbook_call(endpoint: str, params: dict) -> dict:
    """
    Call Myfxbook API via GET (their API style) but our proxy accepts POST body to avoid leaking creds in URL.
    We always urlencode params here safely.
    """
    qs = urllib.parse.urlencode(params, doseq=True)
    url = f"{MYFXBOOK_API_BASE}/{endpoint}?{qs}"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "ea-sentinel-ai/0.1",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Myfxbook upstream error: {e}")


# ✅ BLOCK GET เพื่อกันรหัสผ่านหลุดใน log/url
@app.get("/myfxbook-proxy/login.json")
def myfxbook_login_get_blocked():
    raise HTTPException(
        status_code=405,
        detail="Use POST /myfxbook-proxy/login.json with JSON body {email,password}. GET is blocked for security.",
    )


@app.get("/myfxbook-proxy/get-my-accounts.json")
def myfxbook_accounts_get_blocked():
    raise HTTPException(
        status_code=405,
        detail="Use POST /myfxbook-proxy/get-my-accounts.json with JSON body {session}. GET is blocked for security.",
    )


# ✅ SECURE ENDPOINTS (POST)
@app.post("/myfxbook-proxy/login.json")
def myfxbook_login(body: MyfxbookLoginIn):
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="email/password required")

    r = _myfxbook_call("login.json", {"email": body.email, "password": body.password})
    # เติม field ช่วย frontend: sessionEncoded
    sess = r.get("session")
    if isinstance(sess, str) and sess:
        r["sessionEncoded"] = urllib.parse.quote(sess, safe="")
    return r


@app.post("/myfxbook-proxy/get-my-accounts.json")
def myfxbook_get_my_accounts(body: MyfxbookSessionIn):
    if not body.session:
        raise HTTPException(status_code=400, detail="session required")

    # ส่ง raw session เข้ามาได้เลย (มี + / ==) เราจะ urlencode ให้เองตอน call upstream
    r = _myfxbook_call("get-my-accounts.json", {"session": body.session})
    return r


class MyfxbookHistoryBody(BaseModel):
    session: str
    id: int  # Myfxbook "id" ของ account (แนะนำใช้ acc.id จาก get-my-accounts)
    start: Optional[str] = None  # optional: "2024-01-01"
    end: Optional[str] = None  # optional: "2024-12-31"


@app.get("/myfxbook-proxy/get-history.json")
def _block_get_history():
    raise HTTPException(
        status_code=405,
        detail="Use POST /myfxbook-proxy/get-history.json with JSON body {session,id,start?,end?}. GET is blocked for security.",
    )


@app.post("/myfxbook-proxy/get-history.json")
def myfxbook_get_history(body: MyfxbookHistoryBody):
    payload = {"session": body.session, "id": body.id}
    if body.start:
        payload["start"] = body.start
    if body.end:
        payload["end"] = body.end

    r = _myfxbook_call("get-history.json", payload)
    return r
