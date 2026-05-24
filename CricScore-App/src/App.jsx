import { useState, useEffect, useCallback } from "react";
import { 
  Trophy, Calendar, MapPin, Undo2, FileText, Share2, 
  ArrowLeft, Plus, Check, Moon, Sun, ArrowRight, 
  Users, Play, RotateCcw, Award, Shield, Timer,
  HelpCircle, BookOpen, Sparkles, ChevronDown, ChevronUp, Info,
  Edit2
} from "lucide-react";

// ─── Utility ────────────────────────────────────────────────────────────────
const LS_KEY = "cricket_app_v2";
const save = (data) => localStorage.setItem(LS_KEY, JSON.stringify(data));
const load = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } };

const rr = (runs, balls) => balls === 0 ? "0.00" : ((runs / balls) * 6).toFixed(2);
const overStr = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
const nowDate = () => new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const takeSnapshot = (inn) => {
  if (!inn) return null;
  const { stateHistory, ...rest } = inn;
  return JSON.parse(JSON.stringify(rest));
};

// ─── PDF Generator ───────────────────────────────────────────────────────────
function generatePDF(match) {
  const { teamA, teamB, innings1, innings2, venue, motm, date, toss, overs, playersPerTeam } = match;
  
  const winner = (() => {
    if (!innings2 || !innings2.completed) return null;
    if (innings2.runs > innings1.runs) {
      const limit = playersPerTeam || 11;
      const remainingWkts = (limit - 1) - innings2.wickets;
      return `${teamB} won by ${remainingWkts} wickets`;
    }
    if (innings1.runs > innings2.runs) return `${teamA} won by ${innings1.runs - innings2.runs} runs`;
    return "Match Tied";
  })();

  const batTable = (inn, team) => {
    const rows = (inn.batsmen || []).map(b => {
      const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0";
      const outText = b.out ? (b.howOut ? `out (${b.howOut})` : "out") : "not out";
      return `<tr>
        <td style="font-weight: 700; padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${b.name}${b.out ? "" : "*"}</td>
        <td style="color: #64748b; font-style: italic; padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${outText}</td>
        <td style="font-weight: 800; text-align: right; padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${b.runs}</td>
        <td style="text-align: right; padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${b.balls}</td>
        <td style="text-align: right; padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${b.fours}</td>
        <td style="text-align: right; padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${b.sixes}</td>
        <td style="text-align: right; color: #475569; padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${sr}</td>
      </tr>`;
    }).join("");

    return `
    <h3 style="color: #f97316; margin: 24px 0 8px; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${team} Batting</h3>
    <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom: 12px; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <thead>
        <tr style="background: #f1f5f9; color: #475569;">
          <th style="padding: 10px 12px; text-align: left; font-weight: 700;">Batsman</th>
          <th style="padding: 10px 12px; text-align: left; font-weight: 700;">Status</th>
          <th style="padding: 10px 12px; text-align: right; font-weight: 700;">R</th>
          <th style="padding: 10px 12px; text-align: right; font-weight: 700;">B</th>
          <th style="padding: 10px 12px; text-align: right; font-weight: 700;">4s</th>
          <th style="padding: 10px 12px; text-align: right; font-weight: 700;">6s</th>
          <th style="padding: 10px 12px; text-align: right; font-weight: 700;">SR</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="background: #f8fafc; border-left: 4px solid #f97316; padding: 12px; border-radius: 4px; font-size: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
      <span><strong>Extras:</strong> ${inn.extras?.total || 0} (wd: ${inn.extras?.wides||0}, nb: ${inn.extras?.noballs||0})</span>
      <span style="font-size: 14px; font-weight: 800; color: #0f172a;">TOTAL: ${inn.runs}/${inn.wickets} (${overStr(inn.balls)} ov)</span>
    </div>
    ${inn.fow && inn.fow.length > 0 ? `
    <div style="background: #f8fafc; padding: 10px 12px; border-radius: 6px; font-size: 11px; color: #64748b; margin-bottom: 24px;">
      <strong style="color: #475569; display: block; margin-bottom: 4px; font-size: 12px;">Fall of Wickets:</strong>
      ${inn.fow.join(", ")}
    </div>
    ` : ""}`;
  };

  const bowlTable = (inn) => {
    const rows = (inn.bowlers || []).filter(b => b.balls > 0).map(b => {
      const econ = b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : "0.00";
      return `<tr>
        <td style="font-weight: 700; padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${b.name}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${overStr(b.balls)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${b.maidens || 0}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${b.runs}</td>
        <td style="font-weight: 800; color: #ef4444; padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${b.wickets}</td>
        <td style="color: #475569; padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${econ}</td>
      </tr>`;
    }).join("");

    return `
    <h3 style="color: #06b6d4; margin: 16px 0 8px; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Bowling</h3>
    <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom: 24px; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <thead>
        <tr style="background: #f1f5f9; color: #475569;">
          <th style="padding: 10px 12px; text-align: left; font-weight: 700;">Bowler</th>
          <th style="padding: 10px 12px; text-align: left; font-weight: 700;">O</th>
          <th style="padding: 10px 12px; text-align: left; font-weight: 700;">M</th>
          <th style="padding: 10px 12px; text-align: right; font-weight: 700;">R</th>
          <th style="padding: 10px 12px; text-align: right; font-weight: 700;">W</th>
          <th style="padding: 10px 12px; text-align: right; font-weight: 700;">Econ</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  };

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Scorecard - ${teamA} vs ${teamB}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Outfit', sans-serif;
        background: #f8fafc;
        color: #1e293b;
        padding: 40px;
        max-width: 800px;
        margin: auto;
        line-height: 1.5;
      }
      .card {
        background: #ffffff;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        border: 1px solid #e2e8f0;
        margin-bottom: 24px;
      }
      .match-header {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: #ffffff;
        border-radius: 16px;
        padding: 28px;
        margin-bottom: 28px;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1);
      }
      .title {
        font-size: 26px;
        font-weight: 800;
        margin: 0 0 12px 0;
        color: #f97316;
        text-transform: uppercase;
        letter-spacing: -0.5px;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 16px;
        margin-top: 16px;
        font-size: 13px;
      }
      .meta-val {
        font-weight: 600;
        color: #e2e8f0;
      }
      .winner-banner {
        background: #f97316;
        color: #0f172a;
        padding: 10px 18px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 800;
        text-align: center;
        margin: 20px 0;
        text-transform: uppercase;
      }
      .innings-title {
        font-size: 20px;
        font-weight: 800;
        color: #0f172a;
        border-bottom: 3px solid #e2e8f0;
        padding-bottom: 8px;
        margin-top: 36px;
      }
      @media print {
        body { padding: 15px; background: #fff; }
        .card { box-shadow: none; border: none; padding: 0; }
        .page-break { page-break-before: always; }
      }
    </style>
  </head>
  <body>
    <div class="match-header">
      <div class="title">🏏 Cricket Scorecard</div>
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 6px;">${teamA} vs ${teamB}</div>
      <div style="font-size: 13px; color: #94a3b8;">${toss || "No Toss Details Specified"}</div>
      
      <div class="meta-grid">
        <div>
          <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">DATE</div>
          <div class="meta-val">${date || nowDate()}</div>
        </div>
        <div>
          <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">VENUE</div>
          <div class="meta-val">${venue || "Local Ground"}</div>
        </div>
        <div>
          <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">OVERS LIMIT</div>
          <div class="meta-val">T${overs || 20} (Max ${playersPerTeam || 11} Players)</div>
        </div>
      </div>
    </div>

    ${winner ? `<div class="winner-banner">${winner}</div>` : ""}
    ${motm ? `<div style="background: #fef3c7; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 8px; font-size: 14px; font-weight: 700; margin-bottom: 24px; color: #b45309; display: flex; align-items: center; gap: 8px;">🏆 Man of the Match: ${motm}</div>` : ""}

    <div class="innings-title">1st Innings — ${innings1?.battingTeam || teamA}</div>
    <div class="card">
      ${innings1 ? batTable(innings1, innings1.battingTeam) : "<p style='color: #64748b; font-style: italic;'>Innings not played</p>"}
      ${innings1 ? bowlTable(innings1) : ""}
    </div>

    ${innings2 ? `
    <div class="page-break"></div>
    <div class="innings-title" style="margin-top: 20px;">2nd Innings — ${innings2.battingTeam}</div>
    <div class="card">
      ${batTable(innings2, innings2.battingTeam)}
      ${bowlTable(innings2)}
    </div>` : ""}

    <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
      Generated by CricScore App - The Professional Sports Scorer
    </div>
  </body>
  </html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

// ─── Screens ─────────────────────────────────────────────────────────────────
const SCREENS = { HOME: "home", SETUP: "setup", TOSS: "toss", SCORING: "scoring", INNINGS_BREAK: "innings_break", SUMMARY: "summary", HISTORY: "history" };

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [dark, setDark] = useState(true);
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [match, setMatch] = useState(null);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const d = load();
    if (d.history) setHistory(d.history);
    if (d.activeMatch) { setMatch(d.activeMatch); setScreen(SCREENS.SCORING); }
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const saveMatch = useCallback((m) => {
    setMatch(m);
    const d = load();
    d.activeMatch = m;
    save(d);
  }, []);

  const finishMatch = useCallback((m) => {
    const d = load();
    const finished = { ...m, finishedAt: Date.now() };
    d.activeMatch = null;
    d.history = [finished, ...(d.history || []).slice(0, 19)];
    save(d);
    setHistory(d.history);
    setMatch(finished);
    setScreen(SCREENS.SUMMARY);
  }, []);

  const bg = dark ? "bg-gradient-to-b from-[#030712] via-[#0b1524] to-[#030712]" : "bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200";
  const text = dark ? "text-slate-100" : "text-slate-900";

  return (
    <div className={`min-h-screen ${bg} ${text} transition-colors duration-300 antialiased pb-16 relative overflow-hidden`} style={{ fontFamily: "'Outfit', 'Segoe UI', system-ui, sans-serif" }}>
      {/* Stadium Grid and Neon Orbs Backing */}
      <div className="stadium-grid"></div>
      <div className="stadium-light-reflection"></div>
      
      {/* Absolutely positioned glowing decorative circles */}
      <div className="neon-orb-orange" style={{ top: "-100px", right: "-100px" }}></div>
      <div className="neon-orb-cyan" style={{ bottom: "10%", left: "-150px" }}></div>

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-white font-semibold shadow-2xl flex items-center gap-2 border transition-all duration-300 animate-fade-in-up ${toast.type === "error" ? "bg-red-500/90 border-red-500" : "bg-emerald-500/90 border-emerald-500"}`}>
          {toast.type === "error" ? "⚠️" : "✨"} {toast.msg}
        </div>
      )}

      {/* Main Screen Container */}
      <div className="relative z-10">
        {screen === SCREENS.HOME && <HomeScreen dark={dark} setDark={setDark} setScreen={setScreen} history={history} setMatch={setMatch} showToast={showToast} />}
        {screen === SCREENS.SETUP && <SetupScreen dark={dark} setScreen={setScreen} setMatch={saveMatch} showToast={showToast} />}
        {screen === SCREENS.TOSS && <TossScreen dark={dark} match={match} setMatch={saveMatch} setScreen={setScreen} />}
        {screen === SCREENS.SCORING && match && <ScoringScreen dark={dark} match={match} setMatch={saveMatch} setScreen={setScreen} finishMatch={finishMatch} showToast={showToast} />}
        {screen === SCREENS.INNINGS_BREAK && match && <InningsBreak dark={dark} match={match} setMatch={saveMatch} setScreen={setScreen} showToast={showToast} />}
        {screen === SCREENS.SUMMARY && match && <SummaryScreen dark={dark} match={match} setScreen={setScreen} showToast={showToast} />}
        {screen === SCREENS.HISTORY && <HistoryScreen dark={dark} history={history} setScreen={setScreen} setMatch={setMatch} />}
      </div>
    </div>
  );
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────
function HomeScreen({ dark, setDark, setScreen, history, setMatch, showToast }) {
  const card = dark ? "glass-panel p-6 rounded-3xl" : "bg-white border border-slate-200 p-6 rounded-3xl shadow-lg";
  const [openGuide, setOpenGuide] = useState(null);

  const toggleGuide = (index) => {
    setOpenGuide(openGuide === index ? null : index);
  };

  const guides = [
    {
      q: "🚀 1. Setup a Quick Match in 10 Seconds",
      a: "Click on 'Start Match' and fill in your team names, ground venue, and number of overs. You can also pick from presets like Gully T10 or Street Cricket which automatically configures standard rules!"
    },
    {
      q: "👥 2. Street Cricket & Variable Player counts",
      a: "Our app is designed with dynamic street cricket rules! There are no pre-match player rosters. You can have 6 players, 8 players, or 15 players per team. Set the player limit during setup, and the app auto-calculates when a team is All Out."
    },
    {
      q: "🏏 3. Entering Players On-The-Fly",
      a: "When you start, you'll be prompted to enter the Striker, Non-Striker, and Bowler. When a wicket falls, a quick text entry allows entering the next batsman. Bowlers can be selected or newly introduced at the end of each over!"
    },
    {
      q: "✏️ 4. Typo correction & Rename active players",
      a: "Made a spelling error when typing bowler/batsman names on-the-fly? Click the '✏️ Edit Player Names' button directly under the active players card in the scoring screen to fix typos instantly without losing statistics!"
    },
    {
      q: "⚡ 5. No Balls with Sixes / Wides with Byes",
      a: "No more math headaches! Clicking No Ball or Wide Ball opens a dynamic 'Extras Assistant' panel. You can easily record complex runs like 'No-Ball + 6 runs' (credited to the batsman) or 'Wide + 3 runs' (credited to wides extras) with correct strike rotation!"
    },
    {
      q: "✨ 6. Mistakes? Revert instantly with Undo!",
      a: "Never stress about misclicks! The 'Undo Last Ball' button deep-reverts all stats, runs, extras, and wickets instantly so you can continue scoring smoothly."
    },
    {
      q: "📄 7. Download and Share scorecard",
      a: "Once the match wraps up, you can input a Man of the Match, share an automated summary via WhatsApp, or download a gorgeous print-ready HTML/PDF scorecard."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8 max-w-md mx-auto animate-fade-in-up">
      {/* Header and Branding Banner */}
      <div className="w-full flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-xl">🏏</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              CricScore
            </h1>
            <p className="text-[9px] font-extrabold tracking-widest text-orange-400 uppercase">PRO EDITION</p>
          </div>
        </div>
        <button onClick={() => setDark(d => !d)} className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 ${dark ? "border-slate-800 bg-[#0d1929] text-yellow-300 hover:border-yellow-400" : "border-slate-200 bg-white text-slate-700 shadow-md hover:border-orange-500"}`}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Modern Live Score Mockup Graphic Hero Card */}
      <div className={`w-full border p-5 mb-5 relative overflow-hidden group ${card} shadow-2xl pulse-border-orange`}>
        {/* Dynamic score illustration badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/35 text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> LIVE SCORE MOCKUP
        </div>

        <div className="text-left mb-6">
          <div className="text-[10px] font-extrabold text-cyan-400 tracking-wider mb-1 uppercase">GULLY T20 PREMIER</div>
          <div className="text-lg font-black tracking-tight uppercase">IND-XI <span className="text-slate-500 text-xs">VS</span> PAK-XI</div>
          
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-extrabold text-white score-value-glow">184/3</span>
            <span className="text-slate-400 text-sm font-semibold">(18.4 Overs)</span>
          </div>

          <div className="flex gap-4 mt-3 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
            <span>Runs Need: <span className="text-orange-400">12 (8b)</span></span>
            <span>CRR: <span className="text-cyan-400">9.86</span></span>
          </div>
        </div>

        <button onClick={() => setScreen(SCREENS.SETUP)} className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-black text-lg rounded-2xl transition-all duration-200 active:scale-95 shadow-lg neon-btn-orange flex items-center justify-center gap-2">
          <Play size={20} fill="currentColor" /> START MATCH SCORING
        </button>
      </div>

      {/* Visual App Features Grid */}
      <div className="w-full grid grid-cols-3 gap-2.5 mb-5">
        <div className={`p-3.5 border rounded-2xl flex flex-col items-center text-center ${card} hover:border-orange-500/40 transition-all`}>
          <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl mb-1.5">
            <Sparkles size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-tight">On-The-Fly</span>
          <span className="text-[8px] text-slate-400 font-semibold mt-0.5">Quick setup</span>
        </div>
        
        <div className={`p-3.5 border rounded-2xl flex flex-col items-center text-center ${card} hover:border-cyan-500/40 transition-all`}>
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl mb-1.5">
            <Undo2 size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-tight">Undo Ball</span>
          <span className="text-[8px] text-slate-400 font-semibold mt-0.5">Perfect history</span>
        </div>

        <div className={`p-3.5 border rounded-2xl flex flex-col items-center text-center ${card} hover:border-emerald-500/40 transition-all`}>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl mb-1.5">
            <FileText size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-tight">Print PDF</span>
          <span className="text-[8px] text-slate-400 font-semibold mt-0.5">Official card</span>
        </div>
      </div>

      {/* Quick Access Actions */}
      <div className="w-full grid grid-cols-2 gap-3 mb-5">
        <button onClick={() => setScreen(SCREENS.HISTORY)} className={`py-4 rounded-2xl border font-bold flex items-center justify-center gap-2 glass-panel-hover ${card}`}>
          <Users size={16} className="text-orange-400" />
          <span className="text-xs tracking-wider font-extrabold uppercase">Match History</span>
        </button>
        
        <button onClick={() => {
          const d = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
          if (d.activeMatch) { setMatch(d.activeMatch); setScreen(SCREENS.SCORING); }
          else { showToast("No active match in progress.", "error"); }
        }} className={`py-4 rounded-2xl border font-bold flex items-center justify-center gap-2 glass-panel-cyan-hover ${card}`}>
          <RotateCcw size={16} className="text-cyan-400" />
          <span className="text-xs tracking-wider font-extrabold uppercase">Resume Live</span>
        </button>
      </div>

      {/* Help Guide Accordion */}
      <div className="w-full mb-5">
        <div className={`border p-4 rounded-3xl ${card}`}>
          <h3 className="text-xs font-black tracking-wider flex items-center gap-2 mb-3 text-orange-400">
            <BookOpen size={14} /> SCORER QUICK REFERENCE CENTER
          </h3>
          
          <div className="space-y-2">
            {guides.map((g, i) => (
              <div key={i} className={`rounded-2xl border transition-all ${dark ? "border-slate-800 bg-[#0b1524]/40" : "border-slate-100 bg-slate-50/50"}`}>
                <button onClick={() => toggleGuide(i)} className="w-full p-3 text-left font-bold text-xs uppercase tracking-wider flex justify-between items-center text-slate-300">
                  <span className={openGuide === i ? "text-orange-400" : ""}>{g.q}</span>
                  {openGuide === i ? <ChevronUp size={14} className="text-orange-400" /> : <ChevronDown size={14} />}
                </button>
                {openGuide === i && (
                  <div className={`p-3 pt-0 text-xs font-semibold leading-relaxed border-t ${dark ? "border-slate-800/50 text-slate-400" : "border-slate-100 text-slate-600"}`}>
                    {g.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Match Center completed logs */}
      {history.length > 0 && (
        <div className="w-full">
          <h3 className="text-[10px] font-black tracking-widest mb-3 text-slate-400 uppercase">📈 COMPLETED MATCH TICKER</h3>
          <div className="space-y-3">
            {history.slice(0, 3).map((m, i) => (
              <div key={i} onClick={() => { setMatch(m); setScreen(SCREENS.SUMMARY); }} className={`p-4 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${card} hover:border-orange-500`}>
                <div className="flex-1">
                  <div className="font-extrabold text-xs uppercase tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> {m.teamA} <span className="text-orange-400 font-bold">vs</span> {m.teamB}
                  </div>
                  <div className="text-[9px] mt-1 flex items-center gap-1 font-semibold text-slate-400">
                    <Calendar size={10} /> {m.date || ""} {m.venue ? `• ${m.venue}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-orange-400">
                    {m.innings1?.runs}/{m.innings1?.wickets}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    {m.innings2 ? `${m.innings2.runs}/${m.innings2.wickets}` : `DNP`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SetupScreen ─────────────────────────────────────────────────────────────
function SetupScreen({ dark, setScreen, setMatch }) {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [overs, setOvers] = useState("20");
  const [playersPerTeam, setPlayersPerTeam] = useState("11");
  const [venue, setVenue] = useState("");
  
  const card = dark ? "glass-panel p-6 rounded-3xl" : "bg-white border border-slate-200 p-6 rounded-3xl shadow-xl";
  const inp = `w-full px-4 py-3 rounded-xl border font-semibold text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 ${dark ? "bg-[#111c2d] border-[#1e3a5f] text-white placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-900"}`;

  const selectPreset = (type) => {
    if (type === "street") {
      setOvers("5");
      setPlayersPerTeam("6");
    } else if (type === "gully") {
      setOvers("10");
      setPlayersPerTeam("8");
    } else if (type === "t20") {
      setOvers("20");
      setPlayersPerTeam("11");
    } else if (type === "odi") {
      setOvers("50");
      setPlayersPerTeam("11");
    }
  };

  const proceed = () => {
    if (!teamA.trim() || !teamB.trim()) { alert("Enter both team names."); return; }
    const m = {
      teamA: teamA.trim(), teamB: teamB.trim(),
      overs: parseInt(overs) || 20, 
      playersPerTeam: parseInt(playersPerTeam) || 11,
      venue: venue.trim(), date: nowDate(),
      state: "toss", playersA: [], playersB: [], innings1: null, innings2: null,
    };
    setMatch(m);
    setScreen(SCREENS.TOSS);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto animate-fade-in-up">
      <div className={`w-full shadow-2xl ${card}`}>
        <button onClick={() => setScreen(SCREENS.HOME)} className="text-orange-400 font-semibold text-sm mb-5 flex items-center gap-1 hover:text-orange-300">
          <ArrowLeft size={16} /> Back to Home
        </button>
        
        <h2 className="text-2xl font-black tracking-tight mb-4 flex items-center gap-2">
          ⚙️ Match Setup
        </h2>

        {/* Quick Rule Presets */}
        <div className="mb-6">
          <label className={`text-[10px] font-extrabold tracking-widest mb-2.5 block uppercase ${dark ? "text-slate-400" : "text-slate-500"}`}>⚡ SELECT QUICK RULE PRESET</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => selectPreset("street")} className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${dark ? "bg-slate-800/40 border-slate-700 text-slate-200 hover:border-orange-500" : "bg-slate-50 border-slate-200 hover:border-orange-500"}`}>
              <span>📦 Street Match</span>
              <span className="text-[9px] text-slate-400 mt-1 font-semibold">6 Players • 5 Overs</span>
            </button>
            <button onClick={() => selectPreset("gully")} className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${dark ? "bg-slate-800/40 border-slate-700 text-slate-200 hover:border-orange-500" : "bg-slate-50 border-slate-200 hover:border-orange-500"}`}>
              <span>⚡ Gully T10</span>
              <span className="text-[9px] text-slate-400 mt-1 font-semibold">8 Players • 10 Overs</span>
            </button>
            <button onClick={() => selectPreset("t20")} className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${dark ? "bg-slate-800/40 border-slate-700 text-slate-200 hover:border-orange-500" : "bg-slate-50 border-slate-200 hover:border-orange-500"}`}>
              <span>🏏 Standard T20</span>
              <span className="text-[9px] text-slate-400 mt-1 font-semibold">11 Players • 20 Overs</span>
            </button>
            <button onClick={() => selectPreset("odi")} className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${dark ? "bg-slate-800/40 border-slate-700 text-slate-200 hover:border-orange-500" : "bg-slate-50 border-slate-200 hover:border-orange-500"}`}>
              <span>🏆 One Day (ODI)</span>
              <span className="text-[9px] text-slate-400 mt-1 font-semibold">11 Players • 50 Overs</span>
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className={`text-[10px] font-extrabold tracking-widest mb-1.5 block ${dark ? "text-slate-400" : "text-slate-500"}`}>TEAM A (BATTING 1ST OPTION)</label>
            <input className={inp} placeholder="e.g. Mumbai Indians" value={teamA} onChange={e => setTeamA(e.target.value)} />
          </div>
          
          <div>
            <label className={`text-[10px] font-extrabold tracking-widest mb-1.5 block ${dark ? "text-slate-400" : "text-slate-500"}`}>TEAM B (BOWLING 1ST OPTION)</label>
            <input className={inp} placeholder="e.g. Chennai Super Kings" value={teamB} onChange={e => setTeamB(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-[10px] font-extrabold tracking-widest mb-1.5 block ${dark ? "text-slate-400" : "text-slate-500"}`}>OVERS LIMIT</label>
              <input className={inp} type="number" min="1" max="100" placeholder="e.g. 20" value={overs} onChange={e => setOvers(e.target.value)} />
            </div>
            <div>
              <label className={`text-[10px] font-extrabold tracking-widest mb-1.5 block ${dark ? "text-slate-400" : "text-slate-500"}`}>PLAYERS PER TEAM</label>
              <input className={inp} type="number" min="2" max="25" placeholder="e.g. 11" value={playersPerTeam} onChange={e => setPlayersPerTeam(e.target.value)} />
            </div>
          </div>
          
          <div>
            <label className={`text-[10px] font-extrabold tracking-widest mb-1.5 block ${dark ? "text-slate-400" : "text-slate-500"}`}>VENUE (OPTIONAL)</label>
            <input className={inp} placeholder="e.g. Wankhede Stadium" value={venue} onChange={e => setVenue(e.target.value)} />
          </div>
        </div>

        <button onClick={proceed} className="w-full mt-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-black text-lg rounded-2xl transition-all active:scale-95 shadow-lg neon-btn-orange flex items-center justify-center gap-2">
          Start Toss <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

// ─── TossScreen ───────────────────────────────────────────────────────────────
function TossScreen({ dark, match, setMatch, setScreen }) {
  const [tossWinner, setTossWinner] = useState(null);
  const [choice, setChoice] = useState(null);
  const card = dark ? "glass-panel p-6 rounded-3xl" : "bg-white border border-slate-200 p-6 rounded-3xl shadow-xl";

  const startMatch = () => {
    if (!tossWinner || !choice) { alert("Complete toss details."); return; }
    const batting1st = choice === "bat" ? tossWinner : (tossWinner === match.teamA ? match.teamB : match.teamA);
    const bowling1st = batting1st === match.teamA ? match.teamB : match.teamA;
    const tossStr = `${tossWinner} won toss, elected to ${choice}`;
    
    const innings1 = {
      battingTeam: batting1st, bowlingTeam: bowling1st,
      runs: 0, wickets: 0, balls: 0, extras: { wides: 0, noballs: 0, byes: 0, total: 0 },
      batsmen: [], bowlers: [],
      currentBat1: -1, currentBat2: -1, currentBowler: -1,
      ballLog: [], completed: false, fow: [],
      stateHistory: []
    };
    const updated = { ...match, toss: tossStr, innings1, state: "innings1" };
    setMatch(updated);
    setScreen(SCREENS.SCORING);
  };

  const Btn = ({ label, val, active, setActive }) => (
    <button onClick={() => setActive(val)} className={`flex-1 py-3.5 rounded-xl font-bold transition-all text-xs shadow-md border ${active === val ? "bg-orange-500 border-orange-500 text-black font-extrabold" : dark ? "bg-[#111c2d] border-[#1e3a5f] text-slate-300 hover:border-orange-500/50" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-orange-500"}`}>{label}</button>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 max-w-md mx-auto animate-fade-in-up">
      <div className={`w-full shadow-2xl ${card}`}>
        <button onClick={() => setScreen(SCREENS.SETUP)} className="text-orange-400 font-semibold text-sm mb-5 flex items-center gap-1 hover:text-orange-300">
          <ArrowLeft size={16} /> Edit Match Setup
        </button>
        
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">🪙</div>
          <h2 className="text-2xl font-black tracking-tight">Match Toss</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className={`text-[10px] font-extrabold tracking-widest mb-3 block text-center ${dark ? "text-slate-400" : "text-slate-500"}`}>WHO WON THE TOSS?</label>
            <div className="flex gap-3">
              <Btn label={match.teamA} val={match.teamA} active={tossWinner} setActive={setTossWinner} />
              <Btn label={match.teamB} val={match.teamB} active={tossWinner} setActive={setTossWinner} />
            </div>
          </div>
          
          {tossWinner && (
            <div>
              <label className={`text-[10px] font-extrabold tracking-widest mb-3 block text-center ${dark ? "text-slate-400" : "text-slate-500"}`}>DECISION ELECTED</label>
              <div className="flex gap-3">
                <Btn label="🏏 BATTING FIRST" val="bat" active={choice} setActive={setChoice} />
                <Btn label="🎯 BOWLING FIRST" val="bowl" active={choice} setActive={setChoice} />
              </div>
            </div>
          )}
        </div>

        {tossWinner && choice && (
          <div className={`mt-6 p-4 rounded-2xl text-center text-xs font-semibold border animate-fade-in-up ${dark ? "bg-[#0d1929]/50 border-orange-500/20" : "bg-orange-50 border-orange-100"}`}>
            🔥 <span className="text-orange-400 font-black">{choice === "bat" ? tossWinner : (tossWinner === match.teamA ? match.teamB : match.teamA)}</span> will take strike first!
          </div>
        )}

        <button onClick={startMatch} className="w-full mt-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-black text-lg rounded-2xl transition-all active:scale-95 shadow-lg neon-btn-orange flex items-center justify-center gap-2">
          🏏 Begin Match
        </button>
      </div>
    </div>
  );
}

// ─── ScoringScreen ────────────────────────────────────────────────────────────
function ScoringScreen({ dark, match, setMatch, setScreen, finishMatch, showToast }) {
  const [showLog, setShowLog] = useState(false);
  const [showChangeBowler, setShowChangeBowler] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showEditNames, setShowEditNames] = useState(false);
  
  // Extras Assistant States
  const [showExtraBallModal, setShowExtraBallModal] = useState(false);
  const [extraType, setExtraType] = useState("wide"); // "wide" or "noball"

  // Dynamic Player Entries
  const [startStriker, setStartStriker] = useState("");
  const [startNonStriker, setStartNonStriker] = useState("");
  const [startBowler, setStartBowler] = useState("");
  const [showNewBatModal, setShowNewBatModal] = useState(false);
  const [newBatsmanName, setNewBatsmanName] = useState("");
  const [newBowlerName, setNewBowlerName] = useState("");

  // Edit Names Inputs
  const [editStrikerName, setEditStrikerName] = useState("");
  const [editNonStrikerName, setEditNonStrikerName] = useState("");
  const [editBowlerName, setEditBowlerName] = useState("");

  const [wicketModal, setWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState("caught");

  const innings = match.state === "innings1" ? match.innings1 : match.innings2;
  if (!innings) return null;

  const { runs, wickets, balls, extras, batsmen, bowlers, currentBat1, currentBat2, currentBowler, ballLog } = innings;
  const maxBalls = match.overs * 6;
  const isInn1 = match.state === "innings1";
  const target = isInn1 ? null : (match.innings1.runs + 1);
  const runRate = rr(runs, balls);
  const reqRate = !isInn1 && balls < maxBalls ? rr((target - runs), maxBalls - balls) : null;

  const updateInnings = (patch) => {
    const inn = match.state === "innings1" ? "innings1" : "innings2";
    const updated = { ...match, [inn]: { ...(match[inn]), ...patch } };
    setMatch(updated);
    return updated;
  };

  const endOfOver = (updated) => {
    const inn = updated.state === "innings1" ? updated.innings1 : updated.innings2;
    if (inn.balls % 6 === 0 && inn.balls > 0) {
      setShowChangeBowler(true);
    }
  };

  const startInningsWithPlayers = () => {
    if (!startStriker.trim() || !startNonStriker.trim() || !startBowler.trim()) {
      alert("Please fill in striker, non-striker and bowler names to start scoring.");
      return;
    }
    const newBatsmen = [
      { name: startStriker.trim(), runs: 0, balls: 0, fours: 0, sixes: 0, out: false, howOut: null },
      { name: startNonStriker.trim(), runs: 0, balls: 0, fours: 0, sixes: 0, out: false, howOut: null }
    ];
    const newBowlers = [
      { name: startBowler.trim(), balls: 0, runs: 0, wickets: 0, maidens: 0 }
    ];
    updateInnings({
      batsmen: newBatsmen,
      bowlers: newBowlers,
      currentBat1: 0,
      currentBat2: 1,
      currentBowler: 0,
      stateHistory: []
    });
    setStartStriker("");
    setStartNonStriker("");
    setStartBowler("");
    showToast("Innings initialized!");
  };

  const score = (type, val = 0) => {
    const snapshot = takeSnapshot(innings);
    const newHistory = [...(innings.stateHistory || []), snapshot];

    let inn = { ...innings };
    let newBalls = inn.balls;
    let newRuns = inn.runs;
    let newExtras = { ...inn.extras };
    let newBatsmen = inn.batsmen.map(b => ({ ...b }));
    let newBowlers = inn.bowlers.map(b => ({ ...b }));
    let logEntry = "";

    if (type === "wicket") {
      setWicketModal(true); 
      return;
    }

    newBalls += 1;
    newRuns += val;
    newBatsmen[currentBat1].runs += val;
    newBatsmen[currentBat1].balls += 1;
    if (val === 4) newBatsmen[currentBat1].fours += 1;
    if (val === 6) newBatsmen[currentBat1].sixes += 1;
    newBowlers[currentBowler].runs += val;
    newBowlers[currentBowler].balls += 1;
    logEntry = val === 0 ? "•" : String(val);

    // Rotate strike standard rules
    let cb1 = currentBat1, cb2 = currentBat2;
    if (val % 2 !== 0) {
      const temp = cb1;
      cb1 = cb2;
      cb2 = temp;
    }
    // End of over: rotate strike
    if (newBalls % 6 === 0) {
      const temp = cb1;
      cb1 = cb2;
      cb2 = temp;
    }
    inn = { ...inn, currentBat1: cb1, currentBat2: cb2 };

    const newLog = [...(inn.ballLog || []), logEntry];
    
    // Check win/end conditions
    const limit = match.playersPerTeam || 11;
    const allOut = newWicketsCount(newBatsmen) >= (limit - 1);
    const oversUp = newBalls >= maxBalls;
    const chaseComplete = !isInn1 && newRuns >= target;

    const patch = { 
      runs: newRuns, 
      balls: newBalls, 
      extras: newExtras, 
      batsmen: newBatsmen, 
      bowlers: newBowlers, 
      ballLog: newLog, 
      currentBat1: inn.currentBat1, 
      currentBat2: inn.currentBat2,
      stateHistory: newHistory 
    };

    if (chaseComplete || allOut || oversUp) {
      const finalPatch = { ...patch, completed: true };
      const updated = updateInnings(finalPatch);
      if (isInn1) {
        setScreen(SCREENS.INNINGS_BREAK);
      } else {
        finishMatch(updated);
      }
      return;
    }

    const updated = updateInnings(patch);
    endOfOver(updated);
  };

  const newWicketsCount = (bList) => bList.filter(b => b.out).length;

  const applyWicket = () => {
    const snapshot = takeSnapshot(innings);
    const newHistory = [...(innings.stateHistory || []), snapshot];

    let inn = { ...innings };
    let newBatsmen = inn.batsmen.map(b => ({ ...b }));
    let newBowlers = inn.bowlers.map(b => ({ ...b }));
    const newBalls = inn.balls + 1;
    newBatsmen[currentBat1].out = true;
    newBatsmen[currentBat1].howOut = wicketType;
    newBatsmen[currentBat1].balls += 1;
    newBowlers[currentBowler].wickets += 1;
    newBowlers[currentBowler].balls += 1;
    
    const newWkts = newWicketsCount(newBatsmen);
    const newLog = [...(inn.ballLog || []), "W"];
    
    // Add Fall of Wicket (FOW) record
    const fowStr = `${newWkts}-${inn.runs} (${newBatsmen[currentBat1].name}, ${overStr(newBalls)} ov)`;
    const newFow = [...(inn.fow || []), fowStr];

    const limit = match.playersPerTeam || 11;
    const allOut = newWkts >= (limit - 1);
    const oversUp = newBalls >= maxBalls;

    if (allOut || oversUp) {
      const patch = { 
        wickets: newWkts, 
        balls: newBalls, 
        batsmen: newBatsmen, 
        bowlers: newBowlers, 
        ballLog: newLog, 
        fow: newFow,
        completed: true,
        stateHistory: newHistory 
      };
      const updated = updateInnings(patch);
      setWicketModal(false);
      if (isInn1) setScreen(SCREENS.INNINGS_BREAK);
      else finishMatch(updated);
      return;
    }

    setWicketModal(false);
    setShowNewBatModal(true);
    const patch = { 
      wickets: newWkts, 
      balls: newBalls, 
      batsmen: newBatsmen, 
      bowlers: newBowlers, 
      ballLog: newLog, 
      fow: newFow,
      stateHistory: newHistory
    };
    updateInnings(patch);
  };

  const handleAddNewBatsman = () => {
    if (!newBatsmanName.trim()) {
      alert("Please enter the incoming batsman's name.");
      return;
    }
    const name = newBatsmanName.trim();
    const updatedBatsmen = [...innings.batsmen, { name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, howOut: null }];
    const nextIdx = updatedBatsmen.length - 1;
    updateInnings({
      batsmen: updatedBatsmen,
      currentBat1: nextIdx
    });
    setNewBatsmanName("");
    setShowNewBatModal(false);
    showToast(`${name} is taking strike!`);
  };

  const handleAddNewBowler = () => {
    if (!newBowlerName.trim()) {
      alert("Please enter the bowler's name.");
      return;
    }
    const name = newBowlerName.trim();
    const existingIdx = innings.bowlers.findIndex(b => b.name.toLowerCase() === name.toLowerCase());
    
    if (existingIdx !== -1) {
      updateInnings({ currentBowler: existingIdx });
      showToast(`${name} returns to bowling!`);
    } else {
      const updatedBowlers = [...innings.bowlers, { name, balls: 0, runs: 0, wickets: 0, maidens: 0 }];
      const nextIdx = updatedBowlers.length - 1;
      updateInnings({
        bowlers: updatedBowlers,
        currentBowler: nextIdx
      });
      showToast(`${name} introduced into the attack!`);
    }
    setNewBowlerName("");
    setShowChangeBowler(false);
  };

  const handleSelectBowler = (idx) => {
    updateInnings({ currentBowler: idx });
    setShowChangeBowler(false);
    showToast(`${innings.bowlers[idx].name} to bowl next!`);
  };

  const saveEditedNames = () => {
    if (!editStrikerName.trim() || !editNonStrikerName.trim() || !editBowlerName.trim()) {
      alert("Active players must have valid names.");
      return;
    }
    
    const newBatsmen = batsmen.map((b, idx) => {
      if (idx === currentBat1) return { ...b, name: editStrikerName.trim() };
      if (idx === currentBat2) return { ...b, name: editNonStrikerName.trim() };
      return b;
    });

    const newBowlers = bowlers.map((b, idx) => {
      if (idx === currentBowler) return { ...b, name: editBowlerName.trim() };
      return b;
    });

    updateInnings({ batsmen: newBatsmen, bowlers: newBowlers });
    setShowEditNames(false);
    showToast("Player names corrected successfully!");
  };

  // Dynamic Complex Extras scoring logic
  const applyExtraBall = (type, val) => {
    const snapshot = takeSnapshot(innings);
    const newHistory = [...(innings.stateHistory || []), snapshot];

    let inn = { ...innings };
    let newRuns = inn.runs;
    let newExtras = { ...inn.extras };
    let newBatsmen = inn.batsmen.map(b => ({ ...b }));
    let newBowlers = inn.bowlers.map(b => ({ ...b }));
    let logEntry = "";

    if (type === "wide") {
      const totalWideRuns = 1 + val; // 1 wide extra + run byes
      newRuns += totalWideRuns;
      newExtras.wides += totalWideRuns;
      newExtras.total += totalWideRuns;
      newBowlers[currentBowler].runs += totalWideRuns;
      logEntry = val === 0 ? "Wd" : `Wd+${val}`;

      // Wide Strike rotation if run byes are odd
      let cb1 = currentBat1, cb2 = currentBat2;
      if (val % 2 !== 0) {
        const temp = cb1;
        cb1 = cb2;
        cb2 = temp;
      }
      inn = { ...inn, currentBat1: cb1, currentBat2: cb2 };
    } 
    
    else if (type === "noball") {
      const totalNoBallRuns = 1 + val; // 1 noball extra + batsman runs
      newRuns += totalNoBallRuns;
      newExtras.noballs += 1;
      newExtras.total += 1;
      newBowlers[currentBowler].runs += totalNoBallRuns;
      
      // Credit runs to batsman
      newBatsmen[currentBat1].runs += val;
      newBatsmen[currentBat1].balls += 1; // Striker faced a No Ball
      if (val === 4) newBatsmen[currentBat1].fours += 1;
      if (val === 6) newBatsmen[currentBat1].sixes += 1;
      logEntry = val === 0 ? "Nb" : `Nb+${val}`;

      // No ball Strike rotation if runs scored are odd
      let cb1 = currentBat1, cb2 = currentBat2;
      if (val % 2 !== 0) {
        const temp = cb1;
        cb1 = cb2;
        cb2 = temp;
      }
      inn = { ...inn, currentBat1: cb1, currentBat2: cb2 };
    }

    const newLog = [...(inn.ballLog || []), logEntry];
    
    const limit = match.playersPerTeam || 11;
    const allOut = newWicketsCount(newBatsmen) >= (limit - 1);
    const chaseComplete = !isInn1 && newRuns >= target;

    const patch = {
      runs: newRuns,
      extras: newExtras,
      batsmen: newBatsmen,
      bowlers: newBowlers,
      ballLog: newLog,
      currentBat1: inn.currentBat1,
      currentBat2: inn.currentBat2,
      stateHistory: newHistory
    };

    setShowExtraBallModal(false);

    if (chaseComplete || allOut) {
      const finalPatch = { ...patch, completed: true };
      const updated = updateInnings(finalPatch);
      if (isInn1) {
        setScreen(SCREENS.INNINGS_BREAK);
      } else {
        finishMatch(updated);
      }
      return;
    }

    updateInnings(patch);
    showToast(`${type === "wide" ? "Wide ball" : "No-ball"} recorded!`);
  };

  const undoLast = () => {
    if (!innings.stateHistory || innings.stateHistory.length === 0) {
      showToast("No scoring history to undo.", "error");
      return;
    }
    const hist = [...innings.stateHistory];
    const prevState = hist.pop();
    const restored = { ...prevState, stateHistory: hist };
    updateInnings(restored);
    showToast("Reverted last ball!", "success");
  };

  const card = dark ? "glass-panel p-5 rounded-2xl" : "bg-white border border-slate-200 p-5 rounded-2xl shadow-lg";

  const isSetupNeeded = currentBat1 === -1 || currentBat2 === -1 || currentBowler === -1;
  const bat1 = batsmen[currentBat1];
  const bat2 = batsmen[currentBat2];
  const bowler = bowlers[currentBowler];

  const oversList = [];
  for (let i = 0; i < ballLog.length; i += 6) { 
    oversList.push(ballLog.slice(i, i + 6)); 
  }

  // Calculate overs progress percentage
  const oversProgress = Math.min(((balls / maxBalls) * 100), 100);

  if (isSetupNeeded) {
    const box = dark ? "bg-[#0d1929] border-[#1e3a5f] text-white" : "bg-white border-slate-200 text-slate-800";
    const inpClass = `w-full px-4 py-3 rounded-xl border font-bold text-base focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 ${dark ? "bg-[#111c2d] border-[#1e3a5f]" : "bg-slate-50 border-slate-300"}`;
    return (
      <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 animate-fade-in-up">
        <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl relative ${box}`}>
          <h3 className="text-2xl font-black mb-1 bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent uppercase tracking-tight">🏏 Setup Innings</h3>
          <p className="text-xs text-slate-400 mb-6 font-semibold uppercase tracking-wider">BAT: {innings.battingTeam} | BOWL: {innings.bowlingTeam}</p>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-extrabold tracking-widest mb-1.5 block text-slate-400 uppercase">STRIKER BATSMAN</label>
              <input className={inpClass} placeholder="Striker name" value={startStriker} onChange={e => setStartStriker(e.target.value)} />
            </div>
            
            <div>
              <label className="text-[10px] font-extrabold tracking-widest mb-1.5 block text-slate-400 uppercase">NON-STRIKER BATSMAN</label>
              <input className={inpClass} placeholder="Non-striker name" value={startNonStriker} onChange={e => setStartNonStriker(e.target.value)} />
            </div>
            
            <div>
              <label className="text-[10px] font-extrabold tracking-widest mb-1.5 block text-slate-400 uppercase">OPENING BOWLER</label>
              <input className={inpClass} placeholder="Bowler name" value={startBowler} onChange={e => setStartBowler(e.target.value)} />
            </div>
          </div>

          <button onClick={startInningsWithPlayers} className="w-full mt-6 py-4 bg-orange-500 hover:bg-orange-400 text-black font-black text-base rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-500/20">
            Start Live Scoring ⚡
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-3 py-4 max-w-md mx-auto animate-fade-in-up relative">
      
      {/* Floating help button */}
      <button 
        onClick={() => setShowHelpModal(true)} 
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-90`}
      >
        <HelpCircle size={22} fill="none" />
      </button>

      {/* Header Match info & big score board */}
      <div className={`border mb-4 relative overflow-hidden ${card}`}>
        
        {/* Progress bar under scoreboard */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-700/20">
          <div className="h-full bg-gradient-to-r from-orange-500 to-cyan-400 transition-all duration-500" style={{ width: `${oversProgress}%` }}></div>
        </div>

        <div className="flex justify-between items-center mb-1">
          <span className="font-extrabold text-lg text-orange-400 uppercase tracking-tight">{innings.battingTeam}</span>
          <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full ${dark ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-orange-50 text-orange-600 border border-orange-100"}`}>{isInn1 ? "1ST INNINGS" : "2ND INNINGS"}</span>
        </div>
        
        <div className="flex items-baseline gap-3">
          <span className="text-6xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent score-badge score-value-glow">{runs}/{wickets}</span>
          <span className={`text-2xl font-bold ${dark ? "text-slate-400" : "text-slate-500"}`}>({overStr(balls)})</span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-3 pb-2 border-t border-slate-700/30 text-xs font-semibold">
          <span className={dark ? "text-slate-400" : "text-slate-500"}>RUN RATE: <span className="text-cyan-400 font-extrabold">{runRate}</span></span>
          {reqRate && <span className={dark ? "text-slate-400" : "text-slate-500"}>REQUIRED: <span className="text-rose-400 font-extrabold">{reqRate}</span></span>}
          {target && <span className={dark ? "text-slate-400" : "text-slate-500"}>TARGET: <span className="text-amber-400 font-extrabold">{target}</span></span>}
          <span className={dark ? "text-slate-400" : "text-slate-500"}>OVERS LIMIT: <span className="text-emerald-400 font-extrabold">T{match.overs}</span></span>
        </div>
      </div>

      {/* Active Batsmen Duo */}
      <div className={`border p-4 mb-4 ${card}`}>
        <div className="grid grid-cols-2 gap-3">
          {[{ b: bat1, strike: true }, { b: bat2, strike: false }].map(({ b, strike }) => (
            <div key={b.name} className={`p-3 rounded-2xl border transition-all duration-200 ${strike ? dark ? "bg-orange-500/10 border-orange-500/30 ring-1 ring-orange-500/20" : "bg-orange-50/70 border-orange-200 ring-1 ring-orange-200" : dark ? "bg-[#111c2d]/40 border-slate-800" : "bg-slate-50/80 border-slate-200"}`}>
              <div className="flex items-center gap-1.5 mb-1 truncate">
                {strike ? <span className="text-orange-400 animate-pulse text-xs">🏏</span> : <span className="text-transparent text-xs">🏏</span>}
                <span className="text-xs font-black truncate uppercase tracking-tight">{b.name}</span>
              </div>
              <div className="font-extrabold text-2xl tracking-tight">{b.runs} <span className="text-xs font-medium text-slate-400">({b.balls})</span></div>
              
              {/* Custom facing helpers */}
              <div className="text-[8px] font-extrabold tracking-wider mt-1 text-slate-500 uppercase flex items-center gap-1">
                <Info size={8} /> {strike ? "FACING STRIKER" : "NON-STRIKER END"}
              </div>

              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex justify-between mt-2 pt-1 border-t border-slate-700/10">
                <span>4s:{b.fours}</span>
                <span>6s:{b.sixes}</span>
                <span>SR:{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : 0}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Player Typo Edit Trigger Button */}
        <button 
          onClick={() => {
            setEditStrikerName(bat1.name);
            setEditNonStrikerName(bat2.name);
            setEditBowlerName(bowler.name);
            setShowEditNames(true);
          }} 
          className={`w-full mt-3 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            dark ? "border-slate-800 bg-[#0d1929] text-slate-300 hover:text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 shadow-sm"
          }`}
        >
          <Edit2 size={12} /> Correct Player Names / Typos
        </button>
      </div>

      {/* Current Active Bowler Info Card */}
      <div className={`border p-4 mb-4 flex justify-between items-center ${card}`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl">
            <Timer size={20} />
          </div>
          <div>
            <div className="text-[10px] font-extrabold tracking-widest text-cyan-400 uppercase">BOWLING ATTACK</div>
            <div className="text-base font-extrabold uppercase tracking-tight">{bowler.name}</div>
            <div className="text-xs font-bold text-slate-400 mt-0.5">{overStr(bowler.balls)} Ov • {bowler.runs} Runs • {bowler.wickets} Wkts</div>
          </div>
        </div>
        
        <button onClick={() => setShowChangeBowler(true)} className={`text-xs px-4 py-2 font-bold rounded-xl border transition-all ${dark ? "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-cyan-500/40" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-orange-500"}`}>
          Switch
        </button>
      </div>

      {/* Tactile Score Buttons */}
      <div className="grid grid-cols-4 gap-2.5 mb-3">
        {["0", "1", "2", "3"].map(val => (
          <button key={val} onClick={() => score("run", parseInt(val))} className={`py-4 rounded-2xl font-black text-2xl transition-all hover:scale-105 active:scale-95 border ${dark ? "bg-[#0d1929] border-[#1e3a5f] text-slate-200 hover:border-orange-500/40" : "bg-white border-slate-300 text-slate-800"}`}>
            {val}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-3">
        <button onClick={() => score("run", 4)} className="py-4.5 rounded-2xl font-extrabold text-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95 flex flex-col items-center">
          <span className="text-xs tracking-widest font-extrabold uppercase mb-0.5">BOUNDARY</span> 4️⃣
        </button>
        
        <button onClick={() => score("run", 6)} className="py-4.5 rounded-2xl font-extrabold text-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all hover:scale-105 active:scale-95 flex flex-col items-center">
          <span className="text-xs tracking-widest font-extrabold uppercase mb-0.5">SIXER</span> 6️⃣
        </button>
        
        <button onClick={() => score("wicket")} className="py-4.5 rounded-2xl font-extrabold text-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 transition-all hover:scale-105 active:scale-95 flex flex-col items-center">
          <span className="text-xs tracking-widest font-extrabold uppercase mb-0.5">DISMISS</span> 🏏 W
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <button onClick={() => { setExtraType("wide"); setShowExtraBallModal(true); }} className={`py-3.5 rounded-2xl font-black text-base border transition-all active:scale-95 ${dark ? "border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10" : "border-amber-300 text-amber-600 bg-amber-50"}`}>
          + WIDE BALL ASSIST
        </button>
        <button onClick={() => { setExtraType("noball"); setShowExtraBallModal(true); }} className={`py-3.5 rounded-2xl font-black text-base border transition-all active:scale-95 ${dark ? "border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10" : "border-purple-300 text-purple-600 bg-purple-50"}`}>
          + NO BALL ASSIST
        </button>
      </div>

      {/* Ball Log by Overs */}
      <div className={`border p-4 mb-4 ${card}`}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">BALL BY BALL ANALYSIS</span>
          <button onClick={() => setShowLog(s => !s)} className="text-xs font-black text-orange-400 uppercase hover:text-orange-300">
            {showLog ? "Collapse" : "View All"}
          </button>
        </div>
        
        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
          {(showLog ? oversList : oversList.slice(-2)).map((ov, oi) => (
            <div key={oi} className="flex items-center gap-2 border-b border-slate-700/10 pb-2">
              <span className="text-xs font-black text-slate-500 w-10">OVER {showLog ? oi + 1 : oversList.length - 2 + oi + 1}</span>
              <div className="flex flex-wrap gap-1.5">
                {ov.map((b, bi) => (
                  <span key={bi} className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-extrabold shadow-sm ${
                    b === "W" ? "bg-rose-600 text-white animate-bounce" : 
                    b.startsWith("Wd") ? "bg-amber-500 text-black" : 
                    b.startsWith("Nb") ? "bg-purple-600 text-white" : 
                    b === "4" ? "bg-emerald-600 text-white" : 
                    b === "6" ? "bg-blue-600 text-white" : 
                    dark ? "bg-[#1e3a5f] text-slate-200" : "bg-slate-200 text-slate-800"
                  }`}>{b}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Undo and End Innings Row */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button onClick={undoLast} className={`py-4 rounded-2xl font-extrabold text-sm border flex items-center justify-center gap-2 transition-all active:scale-95 ${
          dark ? "border-orange-500/30 text-orange-400 bg-orange-500/5 hover:bg-orange-500/10" : "border-orange-200 text-orange-600 bg-orange-50"
        }`}>
          <Undo2 size={16} /> UNDO LAST BALL
        </button>
        
        <button onClick={() => {
          if (window.confirm("Are you sure you want to end the innings now?")) {
            const inn = match.state === "innings1" ? "innings1" : "innings2";
            const updated = { ...match, [inn]: { ...innings, completed: true } };
            if (match.state === "innings1") setScreen(SCREENS.INNINGS_BREAK);
            else finishMatch(updated);
          }
        }} className={`py-4 rounded-2xl font-extrabold text-sm border flex items-center justify-center gap-2 transition-all active:scale-95 ${
          dark ? "border-rose-500/30 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10" : "border-rose-200 text-rose-600 bg-rose-50"
        }`}>
          END INNINGS 🛑
        </button>
      </div>

      {/* EXTRAS DYNAMIC ASSISTANT MODAL */}
      {showExtraBallModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${card}`}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-700/20 pb-3">
              <h3 className="text-lg font-black uppercase text-orange-400 flex items-center gap-1.5">
                ⚡ Extras Assistant
              </h3>
              <button onClick={() => setShowExtraBallModal(false)} className="text-slate-400 font-extrabold text-lg hover:text-white">✕</button>
            </div>
            
            <p className="text-xs text-slate-400 mb-5 font-semibold uppercase tracking-wider">
              {extraType === "wide" ? "WIDE BALL: Enter additional bye runs scored (if any):" : "NO BALL: Select batsman runs scored off this delivery:"}
            </p>

            {extraType === "wide" ? (
              <div className="grid grid-cols-2 gap-3.5 mb-6">
                {[
                  { label: "Just Wide (1 Run)", val: 0 },
                  { label: "Wide + 1 Run (2 Runs)", val: 1 },
                  { label: "Wide + 2 Runs (3 Runs)", val: 2 },
                  { label: "Wide + 3 Runs (4 Runs)", val: 3 },
                  { label: "Wide + 4 (Boundary) (5 Runs)", val: 4 }
                ].map(opt => (
                  <button key={opt.val} onClick={() => applyExtraBall("wide", opt.val)} className={`py-4 rounded-2xl font-black text-xs transition-all border ${dark ? "bg-[#111c2d] border-[#1e3a5f] text-slate-200 hover:border-amber-500/50" : "bg-slate-50 border-slate-300 text-slate-800"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 mb-6">
                {[
                  { label: "No Ball + Dot (1 Run)", val: 0 },
                  { label: "No Ball + 1 Run (2 Runs)", val: 1 },
                  { label: "No Ball + 2 Runs (3 Runs)", val: 2 },
                  { label: "No Ball + 3 Runs (4 Runs)", val: 3 },
                  { label: "No Ball + 4 (Boundary) (5 Runs)", val: 4 },
                  { label: "No Ball + 6 (Sixer!) (7 Runs)", val: 7 }
                ].map(opt => (
                  <button key={opt.val} onClick={() => applyExtraBall("noball", opt.val)} className={`py-4 rounded-2xl font-black text-xs transition-all border ${dark ? "bg-[#111c2d] border-[#1e3a5f] text-slate-200 hover:border-purple-500/50" : "bg-slate-50 border-slate-300 text-slate-800"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            
            <button onClick={() => setShowExtraBallModal(false)} className={`w-full py-3 rounded-xl border font-bold text-xs uppercase ${dark ? "border-slate-800 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500"}`}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE PLAYERS TYPO RENAME MODAL */}
      {showEditNames && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${card}`}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-700/20 pb-3">
              <h3 className="text-lg font-black uppercase text-orange-400 flex items-center gap-2">
                ✏️ Correct Typo / Rename
              </h3>
              <button onClick={() => setShowEditNames(false)} className="text-slate-400 font-extrabold text-lg hover:text-white">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold tracking-widest mb-1.5 block text-slate-400 uppercase">✏️ STRIKER BATSMAN NAME</label>
                <input 
                  className={`w-full px-4 py-3 rounded-xl border font-bold text-sm focus:outline-none focus:border-orange-500 ${dark ? "bg-[#111c2d] border-[#1e3a5f]" : "bg-slate-50 border-slate-300"}`} 
                  placeholder="Striker" 
                  value={editStrikerName} 
                  onChange={e => setEditStrikerName(e.target.value)} 
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold tracking-widest mb-1.5 block text-slate-400 uppercase">✏️ NON-STRIKER BATSMAN NAME</label>
                <input 
                  className={`w-full px-4 py-3 rounded-xl border font-bold text-sm focus:outline-none focus:border-orange-500 ${dark ? "bg-[#111c2d] border-[#1e3a5f]" : "bg-slate-50 border-slate-300"}`} 
                  placeholder="Non-Striker" 
                  value={editNonStrikerName} 
                  onChange={e => setEditNonStrikerName(e.target.value)} 
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold tracking-widest mb-1.5 block text-slate-400 uppercase">✏️ CURRENT BOWLER NAME</label>
                <input 
                  className={`w-full px-4 py-3 rounded-xl border font-bold text-sm focus:outline-none focus:border-orange-500 ${dark ? "bg-[#111c2d] border-[#1e3a5f]" : "bg-slate-50 border-slate-300"}`} 
                  placeholder="Current Bowler" 
                  value={editBowlerName} 
                  onChange={e => setEditBowlerName(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="flex gap-3 border-t border-slate-700/10 pt-5 mt-5">
              <button onClick={() => setShowEditNames(false)} className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase ${dark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                Cancel
              </button>
              <button onClick={saveEditedNames} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md">
                Save Corrections
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING QUICK HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${card}`}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-700/20 pb-3">
              <h3 className="text-lg font-black uppercase text-orange-400 flex items-center gap-2">
                <HelpCircle size={20} /> LIVE SCORING GUIDE
              </h3>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 font-extrabold text-lg hover:text-white">✕</button>
            </div>
            
            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1 text-xs">
              <div className={`p-3 rounded-xl border ${dark ? "bg-slate-800/30 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <strong className="text-orange-400 block mb-1">🏏 STRIKER ROTATION RULES</strong>
                Strike automatically rotates on **odd runs (1, 3, 5)** and at the **end of each over (6th ball)**. The facing batsman has a bat icon (🏏) next to their name.
              </div>

              <div className={`p-3 rounded-xl border ${dark ? "bg-slate-800/30 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <strong className="text-amber-400 block mb-1">✨ EXTRAS HANDLING (WIDE / NO BALL)</strong>
                Clicking **Wide** or **No Ball** automatically adds **1 Run** to the total score and bowlers' runs, but does NOT count as a legitimate ball in the over. Strike does not rotate.
              </div>

              <div className={`p-3 rounded-xl border ${dark ? "bg-slate-800/30 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <strong className="text-rose-500 block mb-1">🛑 WICKET & DISMISSAL</strong>
                Click **🏏 W** to trigger a wicket. Pick the dismissal type (caught, bowled, run out, etc.) then enter the **incoming batsman's name** dynamically!
              </div>

              <div className={`p-3 rounded-xl border ${dark ? "bg-slate-800/30 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <strong className="text-cyan-400 block mb-1">🔄 SWITCHING BOWLER</strong>
                Click **Switch** in the Bowler section to change the bowler manually anytime. An over ends automatically after 6 valid balls, prompting a bowler switch.
              </div>

              <div className={`p-3 rounded-xl border ${dark ? "bg-slate-800/30 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <strong className="text-emerald-400 block mb-1">✨ UNDO LAST BALL</strong>
                Made a mistake? Click **UNDO LAST BALL** to completely revert the last ball, runs, wickets, and strike rotation instantly.
              </div>
            </div>
            
            <button onClick={() => setShowHelpModal(false)} className="w-full mt-5 py-3.5 bg-orange-500 hover:bg-orange-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md">
              Got it, continue!
            </button>
          </div>
        </div>
      )}

      {/* Wicket Dismissal Mode Selector Modal */}
      {wicketModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 px-4 pb-8 animate-fade-in-up">
          <div className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl ${card}`}>
            <h3 className="text-xl font-black mb-4 text-rose-500 uppercase tracking-tight">🏏 How did dismissal happen?</h3>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {["caught", "bowled", "lbw", "run out", "stumped", "hit wicket"].map(t => (
                <button key={t} onClick={() => setWicketType(t)} className={`py-3.5 rounded-xl font-bold text-xs capitalize transition-all border ${wicketType === t ? "bg-rose-600 border-rose-600 text-white font-black shadow-md shadow-rose-600/25" : dark ? "bg-[#111c2d] border-[#1e3a5f] text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}>{t}</button>
              ))}
            </div>
            <div className="flex gap-3 border-t border-slate-700/10 pt-4">
              <button onClick={() => setWicketModal(false)} className={`flex-1 py-3 rounded-xl border font-bold text-sm ${dark ? "border-slate-700 text-slate-300" : "border-slate-300 text-slate-700"}`}>Abort</button>
              <button onClick={applyWicket} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-extrabold text-sm shadow-md">Confirm Wicket</button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Batsman Text Input Modal */}
      {showNewBatModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${card}`}>
            <h3 className="text-2xl font-black mb-1 text-orange-400 uppercase tracking-tight">🏏 Incoming Batsman</h3>
            <p className="text-xs text-slate-400 mb-5 font-semibold uppercase tracking-wider">A wicket has fallen! Enter the next batsman name.</p>
            
            <input 
              className={`w-full px-4 py-3 rounded-xl border font-bold text-base focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 mb-5 ${dark ? "bg-[#111c2d] border-[#1e3a5f]" : "bg-slate-50 border-slate-300"}`} 
              placeholder="e.g. MS Dhoni" 
              value={newBatsmanName} 
              onChange={e => setNewBatsmanName(e.target.value)} 
              onKeyDown={e => e.key === "Enter" && handleAddNewBatsman()}
            />
            
            <button onClick={handleAddNewBatsman} className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black font-black text-base rounded-2xl transition-all active:scale-95 shadow-lg">
              Send Batsman In 🚀
            </button>
          </div>
        </div>
      )}

      {/* Switch Bowler Modal */}
      {showChangeBowler && (
        <div className="fixed inset-0 bg-black/85 flex items-end justify-center z-50 px-4 pb-8 animate-fade-in-up">
          <div className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl ${card}`}>
            <h3 className="text-xl font-black mb-1 text-cyan-400 uppercase tracking-tight">🎯 Set Bowler</h3>
            <p className="text-xs text-slate-400 mb-4 font-semibold uppercase tracking-wider">Select previous bowler or add a new one.</p>
            
            {/* List existing bowlers */}
            <div className="space-y-2 max-h-52 overflow-y-auto mb-4 border-b border-slate-700/20 pb-4">
              {innings.bowlers.map((b, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSelectBowler(i)} 
                  disabled={i === currentBowler} 
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-left flex justify-between items-center transition-all ${
                    i === currentBowler ? "opacity-35 cursor-not-allowed " + (dark ? "bg-[#111c2d]" : "bg-slate-100") : 
                    dark ? "bg-[#111c2d] border border-[#1e3a5f] text-slate-200 hover:border-cyan-500/50" : "bg-slate-50 border border-slate-200 text-slate-800"
                  }`}
                >
                  <span className="uppercase">{b.name}</span>
                  <span className="text-[10px] font-extrabold bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full">{overStr(b.balls)} Ov • {b.runs} R • {b.wickets} W</span>
                </button>
              ))}
            </div>

            {/* Quick add text entry */}
            <div className="space-y-3">
              <label className="text-[10px] font-extrabold tracking-widest text-slate-400 block uppercase">OR ADD NEW BOWLER NAME</label>
              <div className="flex gap-2">
                <input 
                  className={`flex-1 px-4 py-3 rounded-xl border font-bold text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${dark ? "bg-[#111c2d] border-[#1e3a5f]" : "bg-slate-50 border-slate-300"}`} 
                  placeholder="New bowler name" 
                  value={newBowlerName} 
                  onChange={e => setNewBowlerName(e.target.value)} 
                  onKeyDown={e => e.key === "Enter" && handleAddNewBowler()}
                />
                <button onClick={handleAddNewBowler} className="px-5 py-3 rounded-xl bg-cyan-500 text-black font-extrabold text-sm hover:bg-cyan-400 shadow-md">
                  Add Bowler
                </button>
              </div>
            </div>

            <button onClick={() => setShowChangeBowler(false)} className={`w-full mt-4 py-3 rounded-xl border font-bold text-xs uppercase ${dark ? "border-slate-800 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500"}`}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── InningsBreak ─────────────────────────────────────────────────────────────
function InningsBreak({ dark, match, setMatch, setScreen, showToast }) {
  const inn1 = match.innings1;
  const target = inn1.runs + 1;
  const card = dark ? "glass-panel p-6 rounded-3xl" : "bg-white border border-slate-200 p-6 rounded-3xl shadow-xl";

  const startInn2 = () => {
    const batting2 = match.teamB === inn1.battingTeam ? match.teamA : match.teamB;
    const bowling2 = batting2 === match.teamA ? match.teamB : match.teamB === match.teamA ? match.teamB : match.teamA;
    const innings2 = {
      battingTeam: batting2, bowlingTeam: bowling2,
      runs: 0, wickets: 0, balls: 0,
      extras: { wides: 0, noballs: 0, byes: 0, total: 0 },
      batsmen: [],
      bowlers: [],
      currentBat1: -1, currentBat2: -1, currentBowler: -1,
      ballLog: [], completed: false, fow: [],
      stateHistory: []
    };
    const updated = { ...match, innings2, state: "innings2" };
    setMatch(updated);
    setScreen(SCREENS.SCORING);
  };

  const batting2 = match.teamB === inn1.battingTeam ? match.teamA : match.teamB;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto animate-fade-in-up">
      <div className={`w-full shadow-2xl ${card}`}>
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">⏸️</div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-orange-400">Innings Break</h2>
        </div>
        
        <div className={`rounded-2xl p-5 mb-6 border ${dark ? "bg-[#0d1929]/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
          <div className="text-center">
            <div className="text-3xl font-extrabold uppercase tracking-tight text-orange-400">{inn1.battingTeam}</div>
            <div className="text-5xl font-black my-2 tracking-tight text-white">{inn1.runs}/{inn1.wickets}</div>
            <div className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-slate-400" : "text-slate-500"}`}>{overStr(inn1.balls)} Overs Completed</div>
          </div>
          
          <div className="mt-5 p-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl text-center shadow-lg shadow-orange-500/20">
            <span className="font-black text-black text-base uppercase tracking-wider">🎯 {batting2} needs {target} runs to win!</span>
          </div>
        </div>
        
        <button onClick={startInn2} className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black font-black text-lg rounded-2xl transition-all active:scale-95 neon-btn-orange flex items-center justify-center gap-2">
          🏏 Start 2nd Innings <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

// ─── SummaryScreen ────────────────────────────────────────────────────────────
function SummaryScreen({ dark, match, setScreen, showToast }) {
  const [motm, setMotm] = useState(match.motm || "");
  const [motmSaved, setMotmSaved] = useState(!!match.motm);
  const card = dark ? "glass-panel p-5 rounded-3xl" : "bg-white border border-slate-200 p-5 rounded-3xl shadow-xl";
  const inp = `flex-1 px-4 py-2.5 rounded-xl border font-bold text-sm focus:outline-none focus:border-orange-500 ${dark ? "bg-[#111c2d] border-[#1e3a5f] text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`;

  const inn1 = match.innings1;
  const inn2 = match.innings2;

  const winner = (() => {
    if (!inn2 || !inn2.completed) return inn1 ? `${inn1.battingTeam} scored ${inn1.runs}/${inn1.wickets}` : null;
    if (inn2.runs > inn1.runs) {
      const limit = match.playersPerTeam || 11;
      const remainingWkts = (limit - 1) - inn2.wickets;
      return `🏆 ${inn2.battingTeam} won by ${remainingWkts} wickets`;
    }
    if (inn1.runs > inn2.runs) return `🏆 ${inn1.battingTeam} won by ${inn1.runs - inn2.runs} runs`;
    return "🤝 Match Tied!";
  })();

  const BatCard = ({ inn, team }) => (
    <div className={`border p-4 mb-4 ${card}`}>
      <h3 className="font-extrabold text-sm text-orange-400 mb-3 uppercase tracking-wider">{team} Batting</h3>
      
      <div className={`text-[10px] font-extrabold mb-1.5 grid grid-cols-7 gap-1 uppercase tracking-widest text-slate-400 pb-1.5 border-b border-slate-700/15`}>
        <span className="col-span-2">Player</span>
        <span className="text-right">R</span>
        <span className="text-right">B</span>
        <span className="text-right">4s</span>
        <span className="text-right">6s</span>
        <span className="text-right">SR</span>
      </div>
      
      <div className="space-y-1">
        {(inn.batsmen || []).map((b, i) => (
          <div key={i} className={`grid grid-cols-7 gap-1 py-2 text-xs border-b border-slate-700/5 items-center`}>
            <span className="col-span-2 font-black truncate uppercase text-[11px]">
              {b.name}{b.out ? <span className="text-rose-500 font-bold"> (o)</span> : <span className="text-emerald-400 font-extrabold"> *</span>}
            </span>
            <span className="font-black text-right">{b.runs}</span>
            <span className="text-right text-slate-400 font-bold">{b.balls}</span>
            <span className="text-emerald-400 text-right font-bold">{b.fours}</span>
            <span className="text-blue-400 text-right font-bold">{b.sixes}</span>
            <span className="text-right text-slate-400 font-bold">{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : 0}</span>
          </div>
        ))}
      </div>
      
      <div className={`mt-3 pt-3 border-t border-slate-700/10 flex justify-between text-xs font-bold ${dark ? "text-slate-400" : "text-slate-500"}`}>
        <span>EXTRAS: {inn.extras?.total || 0} (wd:{inn.extras?.wides||0} nb:{inn.extras?.noballs||0})</span>
        <span className="text-orange-400 font-extrabold text-sm">{inn.runs}/{inn.wickets} ({overStr(inn.balls)} ov)</span>
      </div>
    </div>
  );

  const BowlCard = ({ inn }) => (
    <div className={`border p-4 mb-4 ${card}`}>
      <h3 className="font-extrabold text-sm text-cyan-400 mb-3 uppercase tracking-wider">{inn.bowlingTeam} Bowling</h3>
      
      <div className={`text-[10px] font-extrabold mb-1.5 grid grid-cols-5 gap-1 uppercase tracking-widest text-slate-400 pb-1.5 border-b border-slate-700/15`}>
        <span className="col-span-2">Bowler</span>
        <span className="text-right">O</span>
        <span className="text-right">R</span>
        <span className="text-right">W</span>
      </div>
      
      <div className="space-y-1">
        {(inn.bowlers || []).filter(b => b.balls > 0).map((b, i) => (
          <div key={i} className={`grid grid-cols-5 gap-1 py-2 text-xs border-b border-slate-700/5 items-center`}>
            <span className="col-span-2 font-black truncate uppercase text-[11px]">{b.name}</span>
            <span className="text-right text-slate-400 font-bold">{overStr(b.balls)}</span>
            <span className="text-right font-bold">{b.runs}</span>
            <span className="font-black text-right text-rose-500">{b.wickets}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const shareWA = () => {
    const txt = `🏏 *${match.teamA} vs ${match.teamB}*\n\n1st Innings: ${inn1?.battingTeam} ${inn1?.runs}/${inn1?.wickets} (${overStr(inn1?.balls||0)} ov)\n${inn2 ? `2nd Innings: ${inn2.battingTeam} ${inn2.runs}/${inn2.wickets} (${overStr(inn2.balls||0)} ov)\n` : ""}\nRESULT: ${winner || ""}\n\nScored with CricScore Live Scorer App`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`);
  };

  return (
    <div className="min-h-screen px-3 py-6 max-w-md mx-auto animate-fade-in-up">
      {/* Winner Summary Banner */}
      <div className={`border p-6 mb-5 text-center relative overflow-hidden group ${card}`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
        <div className="text-5xl mb-2">🏆</div>
        <h2 className="text-xl font-black uppercase tracking-tight text-orange-400">{match.teamA} vs {match.teamB}</h2>
        <p className={`text-xs font-semibold mt-1 mb-4 ${dark ? "text-slate-400" : "text-slate-500"}`}>{match.date} • {match.venue || "Local Ground"}</p>
        <div className="text-lg font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent uppercase tracking-wide">{winner}</div>
        {match.toss && <p className={`text-[10px] mt-2.5 font-extrabold uppercase tracking-widest ${dark ? "text-slate-500" : "text-slate-400"}`}>{match.toss}</p>}
      </div>

      {/* Premium Man of the match block */}
      <div className={`border p-4 mb-5 ${card}`}>
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl">
            <Award size={22} />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-extrabold text-amber-400 tracking-widest block uppercase">🏅 MATCH DECORATION</label>
            <div className="flex gap-2 mt-2">
              <input className={inp} placeholder="Man of the Match name" value={motm} onChange={e => setMotm(e.target.value)} disabled={motmSaved} />
              {!motmSaved ? (
                <button onClick={() => { 
                  setMotmSaved(true); 
                  const d = load(); 
                  if (d.history) { 
                    const idx = d.history.findIndex(h => h.date === match.date && h.teamA === match.teamA); 
                    if (idx !== -1) d.history[idx].motm = motm; 
                    save(d); 
                  } 
                  showToast("MOTM saved successfully!"); 
                }} className="px-5 py-2.5 bg-amber-500 text-black font-black rounded-xl text-sm hover:bg-amber-400 shadow-md">Save</button>
              ) : (
                <button onClick={() => setMotmSaved(false)} className={`px-4 py-2.5 rounded-xl border font-bold text-xs uppercase ${dark ? "border-slate-300" : "border-slate-600"}`}>Edit</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scorecards */}
      {inn1 && (
        <div className="space-y-1">
          <BatCard inn={inn1} team={inn1.battingTeam} />
          <BowlCard inn={inn1} />
        </div>
      )}
      
      {inn2 && (
        <div className="space-y-1 mt-5">
          <BatCard inn={inn2} team={inn2.battingTeam} />
          <BowlCard inn={inn2} />
        </div>
      )}

      {/* Professional Actions Layout */}
      <div className="space-y-3 mt-6">
        <button onClick={() => generatePDF({ ...match, motm })} className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-black text-lg rounded-2xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 neon-btn-orange">
          <FileText size={20} /> DOWNLOAD SCORECARD PDF
        </button>
        
        <button onClick={shareWA} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
          <Share2 size={20} /> SHARE ON WHATSAPP
        </button>
        
        <button onClick={() => setScreen(SCREENS.HOME)} className={`w-full py-4 rounded-2xl font-bold border text-base flex items-center justify-center gap-2 transition-all ${dark ? "border-slate-800 text-slate-300 hover:text-white" : "border-slate-300 text-slate-700"}`}>
          🏠 BACK TO HOME SCREEN
        </button>
      </div>
    </div>
  );
}

// ─── HistoryScreen ────────────────────────────────────────────────────────────
function HistoryScreen({ dark, history, setScreen, setMatch }) {
  const card = dark ? "glass-panel p-5 rounded-3xl" : "bg-white border border-slate-200 p-5 rounded-3xl shadow-xl";
  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto animate-fade-in-up">
      <button onClick={() => setScreen(SCREENS.HOME)} className="text-orange-400 font-semibold text-sm mb-5 flex items-center gap-1 hover:text-orange-300">
        <ArrowLeft size={16} /> Back to Home
      </button>
      
      <h2 className="text-3xl font-black tracking-tight mb-6">📋 Match Records</h2>
      
      {history.length === 0 ? (
        <div className="text-center mt-20 text-slate-500 font-bold uppercase tracking-widest">No past matches found.</div>
      ) : (
        <div className="space-y-4">
          {history.map((m, i) => {
            const inn1 = m.innings1;
            const inn2 = m.innings2;
            const winnerStr = inn2?.completed ? (inn2.runs > inn1.runs ? inn2.battingTeam : inn1.runs > inn2.runs ? inn1.battingTeam : "Tie") : null;
            return (
              <div key={i} onClick={() => { setMatch(m); setScreen(SCREENS.SUMMARY); }} className={`p-5 rounded-2xl border cursor-pointer transition-all hover:border-orange-500 ${card}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-extrabold text-base uppercase tracking-tight">{m.teamA} <span className="text-orange-400">vs</span> {m.teamB}</div>
                    <div className={`text-xs mt-1 flex items-center gap-1 font-semibold ${dark ? "text-slate-400" : "text-slate-500"}`}>
                      <Calendar size={12} /> {m.date} • {m.venue || "Local Ground"}
                    </div>
                  </div>
                  {winnerStr && (
                    <span className="text-[9px] font-extrabold bg-orange-500 text-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      {winnerStr} Wins
                    </span>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-700/10 flex justify-between items-center text-sm">
                  <div className="flex gap-4 font-black text-orange-400">
                    {inn1 && <span>{inn1.runs}/{inn1.wickets} <span className="text-xs font-semibold text-slate-400">({overStr(inn1.balls)})</span></span>}
                    {inn2 && <span>| {inn2.runs}/{inn2.wickets} <span className="text-xs font-semibold text-slate-400">({overStr(inn2.balls)})</span></span>}
                  </div>
                  <span className="text-xs text-orange-400 font-extrabold flex items-center gap-0.5">Details <ArrowRight size={12} /></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
