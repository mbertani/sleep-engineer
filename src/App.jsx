import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// ─── STORAGE (localStorage) ──────────────────────────────────────────────────
const store = {
  get: (key) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  },
};

// ─── TIME HELPERS ─────────────────────────────────────────────────────────────
const toMins = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (m) => {
  const n = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
};
const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
const nowStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const todayKey = () => new Date().toISOString().slice(0, 10);
const minsUntil = (target, now) => {
  let d = toMins(target) - toMins(now);
  if (d < 0) d += 1440;
  return d;
};
const dayName = (key) => new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
const dateLabel = (key) => {
  const [, m, d] = key.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
};

// ─── EVENT TYPES ──────────────────────────────────────────────────────────────
const EV = {
  wake: { label: "Woke up", icon: "⏰", color: "#F59E0B" },
  morning_light: { label: "Morning sunlight", icon: "🌅", color: "#FCD34D" },
  coffee: { label: "Caffeine", icon: "☕", color: "#D97706" },
  meal: { label: "Meal", icon: "🍽️", color: "#10B981" },
  alcohol: { label: "Alcohol", icon: "🍷", color: "#EF4444" },
  exercise: { label: "Exercise", icon: "🏃", color: "#06B6D4" },
  afternoon_light: { label: "Afternoon sunlight", icon: "🌤️", color: "#F59E0B" },
  screens_off: { label: "Screens off", icon: "📵", color: "#8B5CF6" },
  wind_down: { label: "Wind-down", icon: "📖", color: "#A78BFA" },
  bath: { label: "Warm bath", icon: "🛁", color: "#60A5FA" },
  todo_list: { label: "Wrote to-do list", icon: "✍️", color: "#F472B6" },
  sleep: { label: "Went to sleep", icon: "😴", color: "#6EE7B7" },
  nap: { label: "Nap", icon: "💤", color: "#A78BFA" },
};

// ─── 29 RULES ─────────────────────────────────────────────────────────────────
const RULES = [
  {
    num: 1,
    cat: "Circadian",
    auto: true,
    title: "The ±30-minute rail",
    short: "Keep sleep & wake times within ±30 min, 7 days a week. Regularity beats duration.",
    tip: "Set both a 'go to bed' AND a wake alarm. Defend the window even on weekends.",
  },
  {
    num: 2,
    cat: "Circadian",
    auto: true,
    title: "The 16-hour melatonin timer",
    short: "Get outdoor sunlight within the first hour of waking. Starts a 16-hr melatonin countdown.",
    tip: "Go outside — no sunglasses. Clear day: 5–10 min. Overcast: 15–20 min.",
  },
  {
    num: 3,
    cat: "Circadian",
    auto: true,
    title: "The sunset vaccination",
    short: "Get 10–20 min of outdoor light in the late afternoon. Reduces melatonin suppression from screens.",
    tip: "A 15–20 min outdoor walk between 4–6 PM. Even cloudy days exceed 1,000 lux.",
  },
  {
    num: 4,
    cat: "Circadian",
    auto: false,
    title: "The circadian dead zone",
    short: "Light between 10 AM–2 PM has minimal clock-setting power. Morning and evening light matter most.",
    tip: "Prioritise morning and late-afternoon light windows for circadian anchoring.",
  },
  {
    num: 5,
    cat: "Circadian",
    auto: false,
    title: "The 11% social jet lag tax",
    short: "Each hour of weekend-to-weekday sleep midpoint shift = 11% higher cardiovascular disease risk.",
    tip: "Keep weekend sleep midpoint within 1 hour of weekday midpoint.",
  },
  {
    num: 6,
    cat: "Circadian",
    auto: false,
    title: "Respect the chronotype",
    short: "Chronotype is ~50% genetic. Forcing an evening type into a 5 AM schedule creates chronic misalignment.",
    tip: "Take the MEQ. Schedule hardest cognitive work during your peak alertness window.",
  },
  {
    num: 7,
    cat: "Pressure",
    auto: true,
    title: "The 16-hour reboot cycle",
    short: "Stay awake 16 hours, sleep 8. After 20 hours awake, cognitive impairment equals legal intoxication.",
    tip: "Fix wake time first (e.g., 6:00 AM), then count back 8 hours for bedtime.",
  },
  {
    num: 8,
    cat: "Pressure",
    auto: false,
    title: "The two-process alignment rule",
    short: "Fall asleep fastest when sleep pressure (S) is high and circadian alertness (C) is low.",
    tip: "Go to bed at the first sign of sleepiness — don't fight through it waiting for a second wind.",
  },
  {
    num: 9,
    cat: "Pressure",
    auto: true,
    title: "The 3 PM nap curfew",
    short: "No naps after 3 PM. Naps bleed off sleep pressure needed at bedtime.",
    tip: "Optimal nap window: 1:00–3:00 PM. Keep to 20–26 minutes to avoid sleep inertia.",
  },
  {
    num: 10,
    cat: "Pressure",
    auto: false,
    title: "Mental work accelerates sleep",
    short: "Hard cognitive tasks burn more brain ATP and produce adenosine faster. Hard thinking makes you genuinely sleepier.",
    tip: "Front-load demanding cognitive work to the first 8–10 hours after waking.",
  },
  {
    num: 11,
    cat: "Pressure",
    auto: false,
    title: "Sleep debt can't be fully repaid",
    short: "You recover less than 50% of lost sleep even with unlimited recovery time. Prevention beats cure.",
    tip: "After a bad night: early-afternoon nap (≤30 min), go to bed 30–60 min earlier next night.",
  },
  {
    num: 12,
    cat: "Environment",
    auto: false,
    title: "The 10-lux evening ceiling",
    short: "After sunset, keep ambient light below 10 lux. Melatonin suppression threshold is far lower than most think.",
    tip: "Switch to tabletop/floor lamps after sunset. Use amber bulbs (2700K) from 9 PM.",
  },
  {
    num: 13,
    cat: "Environment",
    auto: false,
    title: "Overhead off, candles on",
    short: "After dark, eliminate overhead lighting and use only dim light sources at or below eye level.",
    tip: "Turn off all ceiling lights after sunset. Use warm-spectrum bulbs 2700K or lower.",
  },
  {
    num: 14,
    cat: "Environment",
    auto: false,
    title: "Total darkness during sleep",
    short: "Your bedroom during sleep should be below 1 lux. Even dim light degrades metabolic health in a single night.",
    tip: "Install true blackout curtains. Cover all standby lights and LED indicators.",
  },
  {
    num: 15,
    cat: "Environment",
    auto: false,
    title: "Blue light is often exaggerated",
    short: "Total brightness of all evening light matters far more than whether your phone has Night Mode on.",
    tip: "Priority #1: Reduce total light intensity. #2: Eliminate overhead lights. #3: Dim screens.",
  },
  {
    num: 16,
    cat: "Environment",
    auto: false,
    title: "The 65°F (18.3°C) bedroom",
    short: "Target bedroom temperature of 65°F (18.3°C). Temperatures above 70°F (21.1°C) promote insomnia.",
    tip: "Set thermostat to 65°F before bed. Socks promote vasodilation and faster sleep onset.",
  },
  {
    num: 17,
    cat: "Environment",
    auto: false,
    title: "The 90-min warm bath paradox",
    short: "A warm bath 90 minutes before bed cools you down — cutting sleep onset latency by ~36%.",
    tip: "Bath for 10–15 min at 104–108°F, finishing ~90 minutes before target sleep time.",
  },
  {
    num: 18,
    cat: "Environment",
    auto: false,
    title: "Noise: earplugs (below 30 dB)",
    short: "Keep bedroom noise below 30 dB. Intermittent noise is far more disruptive than continuous noise.",
    tip: "First: reduce noise at source. Second: earplugs rated NRR 25–33 dB.",
  },
  {
    num: 19,
    cat: "Behavioral",
    auto: true,
    title: "The caffeine quarter-life rule",
    short: "A noon coffee means 25% of that caffeine is still in your brain at midnight. Stop caffeine 10–14 hrs before bed.",
    tip: "Also delay morning caffeine 90–120 min after waking to allow natural cortisol to clear.",
  },
  {
    num: 20,
    cat: "Behavioral",
    auto: true,
    title: "The nightcap myth",
    short: "Alcohol may make you feel sleepy but it suppresses REM and fragments the second half of the night.",
    tip: "Stop drinking at least 3–4 hours before bed. Zero alcohol on days of heavy learning.",
  },
  {
    num: 21,
    cat: "Behavioral",
    auto: true,
    title: "The 2.5–3 hour dinner cutoff",
    short: "Finish your last substantial meal 2.5–4 hours before bed. Eating within 1 hour doubles nighttime awakenings.",
    tip: "A light, protein-rich snack is acceptable if hungry.",
  },
  {
    num: 22,
    cat: "Behavioral",
    auto: true,
    title: "Evening exercise timing",
    short: "Moderate exercise in the evening helps sleep. Vigorous exercise needs ≥2 hours (ideally 4) before bed.",
    tip: "HIIT/heavy lifting: finish ≥2 hours before bed minimum, ideally ≥4 hours.",
  },
  {
    num: 23,
    cat: "Behavioral",
    auto: true,
    title: "The 10-3-2-1-0 countdown",
    short: "10 hrs before bed: no caffeine. 3 hrs: no food or alcohol. 2 hrs: no work. 1 hr: no screens. 0: snooze.",
    tip: "For a 10:30 PM bedtime: caffeine by 12:30 PM, food/drink by 7:30 PM, screens off 9:30 PM.",
  },
  {
    num: 24,
    cat: "Psychological",
    auto: true,
    title: "The 30–60 min wind-down buffer",
    short: "Build a consistent pre-sleep ritual of 30–60 minutes. Same activities, same order, every night.",
    tip: "Choose 3–4 calming activities: PMR, breathing, reading a physical book, journaling, stretching.",
  },
  {
    num: 25,
    cat: "Psychological",
    auto: false,
    title: "Sleep is involuntary: stop trying",
    short: "The harder you try to sleep, the less you'll sleep. Sleep is a process of letting go, not doing.",
    tip: "Reframe: 'My only job is to lie down so the body can rest. Sleep will come on its own.'",
  },
  {
    num: 26,
    cat: "Psychological",
    auto: false,
    title: "Stay awake to fall asleep",
    short: "Apply paradoxical intention: if anxious about sleep, deliberately try to stay awake. Eyes open, lights off.",
    tip: "Lie in bed with lights off, eyes open. Give up any effort to fall asleep.",
  },
  {
    num: 27,
    cat: "Psychological",
    auto: true,
    title: "Bed is for sleep only",
    short: "Ruthlessly protect the bed-sleep association. No phone, no TV, no worrying in bed.",
    tip: "Get out of bed if not asleep in ~20 min. Return only when genuinely sleepy.",
  },
  {
    num: 28,
    cat: "Psychological",
    auto: false,
    title: "The 20-minute rule",
    short: "If not asleep in ~20 minutes, get out of bed. Do something boring. Return only when sleepy.",
    tip: "Go to a different room. Read a dull book under dim light. No decisions at 3 AM.",
  },
  {
    num: 29,
    cat: "Psychological",
    auto: true,
    title: "Write it down to shut it down",
    short: "Spend 5 minutes before bed writing a specific to-do list for tomorrow. Offloads unfinished-task anxiety.",
    tip: "A specific to-do list (not just worries) is what reduces sleep onset time.",
  },
];

const CATS = ["Circadian", "Pressure", "Environment", "Behavioral", "Psychological"];
const CAT_META = {
  Circadian: { label: "I. Circadian Rhythm", color: "#F59E0B", icon: "🌅" },
  Pressure: { label: "II. Sleep Pressure", color: "#8B5CF6", icon: "⏱️" },
  Environment: { label: "III. Light & Environment", color: "#06B6D4", icon: "🌑" },
  Behavioral: { label: "IV. Behavioral Timing", color: "#10B981", icon: "⚡" },
  Psychological: { label: "V. Cognitive & Psych", color: "#F472B6", icon: "🧠" },
};

const PASS = "pass",
  FAIL = "fail",
  PENDING = "pending";
const AUTO_RULE_IDS = RULES.filter((r) => r.auto).map((r) => r.num);
const MANUAL_RULE_IDS = RULES.filter((r) => !r.auto).map((r) => r.num);
const MANUAL_RULE_KEYS = MANUAL_RULE_IDS.map((n) => `r${n}`);

const countStatus = (R, status) => Object.values(R).filter((v) => v === status).length;

const LOG_RETENTION_DAYS = 90;
function pruneLogs(logs) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOG_RETENTION_DAYS);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const pruned = {};
  for (const key in logs) {
    if (key >= cutoffKey) pruned[key] = logs[key];
  }
  return pruned;
}

function deriveSchedule(plan) {
  const bed = toMins(plan.bedTime),
    wake = toMins(plan.wakeTime);
  return {
    caffeineCutoff: toTime(bed - 10 * 60),
    alcoholCutoff: toTime(bed - 3 * 60),
    mealCutoff: toTime(bed - 150),
    exerciseCutoff: toTime(bed - 2 * 60),
    screensCutoff: toTime(bed - 60),
    windDownStart: toTime(bed - 45),
    bathTarget: toTime(bed - 90),
    morningLightEnd: toTime(wake + 60),
  };
}

// ─── COMPLIANCE ───────────────────────────────────────────────────────────────
function computeAutoCompliance(plan, events) {
  const s = deriveSchedule(plan);
  const bed = toMins(plan.bedTime),
    wake = toMins(plan.wakeTime);
  const byType = (t) => events.filter((e) => e.type === t);
  const last = (t) => {
    const es = byType(t);
    return es.length ? es[es.length - 1] : null;
  };

  const wakeEv = last("wake"),
    sleepEv = last("sleep"),
    mLight = last("morning_light");
  const aLight = last("afternoon_light"),
    coffee = last("coffee"),
    meal = last("meal");
  const alcohol = last("alcohol"),
    exercise = last("exercise");
  const wind = last("wind_down"),
    screens = last("screens_off"),
    todo = last("todo_list");

  const R = {};
  R.r1 = wakeEv ? (Math.abs(toMins(wakeEv.time) - wake) <= 30 ? PASS : FAIL) : PENDING;
  R.r2 = mLight ? (toMins(mLight.time) <= (wakeEv ? toMins(wakeEv.time) : wake) + 60 ? PASS : FAIL) : PENDING;
  R.r3 = aLight ? (toMins(aLight.time) >= 15 * 60 && toMins(aLight.time) <= 18 * 60 ? PASS : FAIL) : PENDING;
  if (sleepEv && wakeEv) {
    const sv = toMins(sleepEv.time),
      wv = toMins(wakeEv.time);
    const dur = sv > wv ? 1440 - sv + wv : wv - sv;
    R.r7 = dur >= 6.5 * 60 && dur <= 9.5 * 60 ? PASS : FAIL;
  } else R.r7 = PENDING;
  R.r9 = byType("nap").some((n) => toMins(n.time) > 15 * 60) ? FAIL : PASS;
  R.r19 = coffee ? (toMins(coffee.time) <= toMins(s.caffeineCutoff) ? PASS : FAIL) : PASS;
  R.r20 = alcohol ? (toMins(alcohol.time) <= toMins(s.alcoholCutoff) ? PASS : FAIL) : PASS;
  R.r21 = meal ? (toMins(meal.time) <= toMins(s.mealCutoff) ? PASS : FAIL) : PENDING;
  if (exercise) {
    const exEnd = toMins(exercise.time) + (exercise.duration || 60);
    R.r22 = exEnd <= (exercise.intensity === "vigorous" ? toMins(s.exerciseCutoff) : bed - 90) ? PASS : FAIL;
  } else R.r22 = PASS;
  const c1 = !coffee || toMins(coffee.time) <= bed - 10 * 60;
  const c2 = !meal || toMins(meal.time) <= bed - 3 * 60;
  const c3 = !alcohol || toMins(alcohol.time) <= bed - 3 * 60;
  R.r23 = c1 && c2 && c3 ? PASS : FAIL;
  R.r24 = wind ? (toMins(wind.time) <= bed - 30 ? PASS : FAIL) : PENDING;
  R.r27 = screens ? (toMins(screens.time) <= bed - 60 ? PASS : FAIL) : PENDING;
  R.r29 = todo ? PASS : PENDING;

  return { R, passed: countStatus(R, PASS), failed: countStatus(R, FAIL) };
}

function computeCompliance(plan, events, manual) {
  const { R } = computeAutoCompliance(plan, events);
  MANUAL_RULE_KEYS.forEach((k) => {
    R[k] = manual[k] ? PASS : PENDING;
  });
  return {
    R,
    passed: countStatus(R, PASS),
    failed: countStatus(R, FAIL),
    pending: countStatus(R, PENDING),
  };
}

// ─── CURRENT STATUS ───────────────────────────────────────────────────────────
function getCurrentStatus(plan, now) {
  const s = deriveSchedule(plan);
  const n = toMins(now),
    bed = toMins(plan.bedTime),
    wake = toMins(plan.wakeTime);
  const items = [
    { icon: "☕", label: "Caffeine", ok: n < toMins(s.caffeineCutoff), cutoff: fmt12(s.caffeineCutoff) },
    { icon: "🍷", label: "Alcohol", ok: n < toMins(s.alcoholCutoff), cutoff: fmt12(s.alcoholCutoff) },
    { icon: "🍽️", label: "Food", ok: n < toMins(s.mealCutoff), cutoff: fmt12(s.mealCutoff) },
    { icon: "📱", label: "Screens", ok: n < toMins(s.screensCutoff), cutoff: fmt12(s.screensCutoff) },
  ];
  const alerts = [];
  if (n >= wake && n <= toMins(s.morningLightEnd)) alerts.push({ icon: "🌅", text: `Morning light window open — go outside! (until ${fmt12(s.morningLightEnd)})`, urgent: true });
  if (n >= 15 * 60 && n <= 18 * 60) alerts.push({ icon: "🌤️", text: "Afternoon light window open (until 6:00 PM)", urgent: false });
  const bT = toMins(s.bathTarget);
  if (n >= bT - 20 && n <= bT + 20) alerts.push({ icon: "🛁", text: "Ideal time for a warm bath — 90 min before bedtime", urgent: true });
  if (n >= toMins(s.windDownStart) && n <= bed) alerts.push({ icon: "📖", text: "Wind-down time — dim lights, put the phone down", urgent: true });
  if (n >= bed - 30 && n <= bed + 60) {
    const mins = Math.max(0, bed - n);
    alerts.push({ icon: "😴", text: mins > 0 ? `Bedtime in ${mins} min — ${fmt12(plan.bedTime)}` : `It's bedtime! ${fmt12(plan.bedTime)}`, urgent: true });
  }
  return { items, alerts };
}

const DEFAULT_PLAN = { wakeTime: "06:30", bedTime: "22:30" };
const DEFAULT_PREFS = { theme: "dark", fontSize: "medium" };
const FONT_SCALES = { small: 0.85, medium: 1, large: 1.35 };
const S = { background: "var(--bg)", minHeight: "100vh", color: "var(--text)", fontFamily: "Georgia, serif", paddingBottom: 72 };

// ════════════════════════════════════════════════════════════════════════════
// APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("home");
  const [plan, setPlan] = useState(() => store.get("slp_plan") || DEFAULT_PLAN);
  const [logs, setLogs] = useState(() => {
    const raw = store.get("slp_logs") || {};
    const pruned = pruneLogs(raw);
    if (Object.keys(pruned).length !== Object.keys(raw).length) store.set("slp_logs", pruned);
    return pruned;
  });
  const [manual, setManual] = useState(() => store.get("slp_manual") || {});
  const [now, setNow] = useState(nowStr());
  const [modal, setModal] = useState(null); // { type, time, extra }
  const [notifGranted, setNotifGranted] = useState(false);
  const [prefs, setPrefs] = useState(() => store.get("slp_prefs") || DEFAULT_PREFS);
  const notifTimers = useRef([]);

  const today = todayKey();
  const todayEvents = logs[today] || [];

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") setNotifGranted(true);
    const tick = setInterval(() => setNow(nowStr()), 30_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", prefs.theme === "light");
    root.style.setProperty("--font-scale", String(FONT_SCALES[prefs.fontSize] || 1));
    const themeColor = prefs.theme === "light" ? "#FAF7F2" : "#070B14";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  }, [prefs.theme, prefs.fontSize]);

  async function requestNotifs() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setNotifGranted(p === "granted");
    if (p === "granted") scheduleNotifications(plan);
  }

  function scheduleNotifications(p) {
    notifTimers.current.forEach(clearTimeout);
    notifTimers.current = [];
    const sched = deriveSchedule(p);
    const upcoming = [
      { time: sched.caffeineCutoff, msg: "☕ Last caffeine of the day — sleep starts here" },
      { time: sched.alcoholCutoff, msg: "🍷 No more alcohol from now — protect your REM" },
      { time: sched.mealCutoff, msg: "🍽️ Kitchen closed — last meal window ending" },
      { time: sched.bathTarget, msg: "🛁 Perfect time for a warm bath (90 min before bed)" },
      { time: sched.screensCutoff, msg: "📵 Screens off — wind down begins" },
      { time: p.bedTime, msg: "😴 Bedtime — time to sleep!" },
    ];
    upcoming.forEach(({ time, msg }) => {
      const msUntil = minsUntil(time, nowStr()) * 60 * 1000;
      if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
        notifTimers.current.push(
          setTimeout(() => {
            if (Notification.permission === "granted") new Notification("Sleep Engineer", { body: msg, icon: "/icon-192.png" });
          }, msUntil),
        );
      }
    });
  }

  function saveLogs(l) {
    store.set("slp_logs", l);
  }

  function addEvent(type, time, extra = {}) {
    const ev = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, time, ...extra };
    const upd = { ...logs, [today]: [...todayEvents, ev].sort((a, b) => a.time.localeCompare(b.time)) };
    setLogs(upd);
    saveLogs(upd);
  }
  function removeEvent(id) {
    const upd = { ...logs, [today]: todayEvents.filter((e) => e.id !== id) };
    setLogs(upd);
    saveLogs(upd);
  }
  function updatePlan(field, value) {
    const np = { ...plan, [field]: value };
    setPlan(np);
    store.set("slp_plan", np);
  }
  function toggleManual(key) {
    const nm = { ...manual, [key]: !manual[key] };
    setManual(nm);
    store.set("slp_manual", nm);
  }
  function updatePrefs(field, value) {
    const np = { ...prefs, [field]: value };
    setPrefs(np);
    store.set("slp_prefs", np);
  }

  const sched = useMemo(() => deriveSchedule(plan), [plan]);
  const compliance = useMemo(() => computeCompliance(plan, todayEvents, manual), [plan, todayEvents, manual]);
  const { R, passed, failed, pending } = compliance;
  const { items: statusItems, alerts } = useMemo(() => getCurrentStatus(plan, now), [plan, now]);

  function openLog(type) {
    setModal({ type, time: nowStr(), extra: type === "exercise" ? { intensity: "moderate", duration: 60 } : type === "nap" ? { duration: 20 } : {} });
  }
  function confirmLog() {
    if (!modal) return;
    addEvent(modal.type, modal.time, modal.extra);
    setModal(null);
  }

  const TABS = [
    { id: "home", icon: "🌙", label: "Home" },
    { id: "log", icon: "📝", label: "Log" },
    { id: "progress", icon: "📈", label: "Progress" },
    { id: "score", icon: "📊", label: "Score" },
    { id: "plan", icon: "⚙️", label: "Plan" },
    { id: "rules", icon: "📚", label: "Rules" },
  ];

  return (
    <div style={S}>
      {tab === "home" && (
        <HomeTab
          plan={plan}
          sched={sched}
          now={now}
          statusItems={statusItems}
          alerts={alerts}
          todayEvents={todayEvents}
          openLog={openLog}
          passed={passed}
          notifGranted={notifGranted}
          requestNotifs={requestNotifs}
        />
      )}
      {tab === "log" && <LogTab todayEvents={todayEvents} openLog={openLog} removeEvent={removeEvent} />}
      {tab === "progress" && <ProgressTab logs={logs} plan={plan} today={today} />}
      {tab === "score" && <ScoreTab R={R} passed={passed} failed={failed} pending={pending} manual={manual} toggleManual={toggleManual} />}
      {tab === "plan" && (
        <PlanTab plan={plan} updatePlan={updatePlan} sched={sched} notifGranted={notifGranted} scheduleNotifications={scheduleNotifications} prefs={prefs} updatePrefs={updatePrefs} />
      )}
      {tab === "rules" && <RulesTab />}

      {/* LOG MODAL */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 200, display: "flex", alignItems: "flex-end" }}
          onClick={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <div style={{ background: "var(--bg-surface)", width: "100%", borderRadius: "20px 20px 0 0", padding: "24px 20px 36px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: "1.125rem" }}>
                {EV[modal.type]?.icon} {EV[modal.type]?.label}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: "var(--text-subtle)", fontSize: "1.5rem", cursor: "pointer", lineHeight: 1 }}>
                ×
              </button>
            </div>
            <label style={{ display: "block", fontSize: "0.6875rem", color: "var(--text-subtle)", letterSpacing: "0.1em", marginBottom: 6 }}>TIME</label>
            <input
              type="time"
              value={modal.time}
              onChange={(e) => setModal((m) => ({ ...m, time: e.target.value }))}
              style={{
                width: "100%",
                background: "var(--bg-input)",
                border: "1px solid var(--border-input)",
                borderRadius: 10,
                padding: "12px 14px",
                color: "var(--text)",
                fontSize: "1.25rem",
                fontFamily: "Georgia, serif",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            />
            {modal.type === "exercise" && (
              <>
                <label style={{ display: "block", fontSize: "0.6875rem", color: "var(--text-subtle)", letterSpacing: "0.1em", marginBottom: 6 }}>INTENSITY</label>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  {["moderate", "vigorous"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setModal((m) => ({ ...m, extra: { ...m.extra, intensity: v } }))}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 10,
                        border: `2px solid ${modal.extra.intensity === v ? "#06B6D4" : "var(--border-input)"}`,
                        background: modal.extra.intensity === v ? "#06B6D422" : "transparent",
                        color: modal.extra.intensity === v ? "#06B6D4" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontFamily: "Georgia, serif",
                        fontSize: "0.875rem",
                        textTransform: "capitalize",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <label style={{ display: "block", fontSize: "0.6875rem", color: "var(--text-subtle)", letterSpacing: "0.1em", marginBottom: 6 }}>DURATION (MIN)</label>
                <input
                  type="number"
                  min="10"
                  max="180"
                  value={modal.extra.duration || 60}
                  onChange={(e) => setModal((m) => ({ ...m, extra: { ...m.extra, duration: Number(e.target.value) } }))}
                  style={{
                    width: "100%",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-input)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: "var(--text)",
                    fontSize: "1.125rem",
                    fontFamily: "Georgia, serif",
                    marginBottom: 16,
                    boxSizing: "border-box",
                  }}
                />
              </>
            )}
            {modal.type === "nap" && (
              <>
                <label style={{ display: "block", fontSize: "0.6875rem", color: "var(--text-subtle)", letterSpacing: "0.1em", marginBottom: 6 }}>DURATION (MIN)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={modal.extra.duration || 20}
                  onChange={(e) => setModal((m) => ({ ...m, extra: { ...m.extra, duration: Number(e.target.value) } }))}
                  style={{
                    width: "100%",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-input)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: "var(--text)",
                    fontSize: "1.125rem",
                    fontFamily: "Georgia, serif",
                    marginBottom: 16,
                    boxSizing: "border-box",
                  }}
                />
              </>
            )}
            <button
              onClick={confirmLog}
              style={{
                width: "100%",
                padding: "14px",
                background: EV[modal.type]?.color || "#6EE7B7",
                color: "var(--text-on-accent)",
                borderRadius: 12,
                border: "none",
                fontSize: "1rem",
                fontWeight: "bold",
                fontFamily: "Georgia, serif",
                cursor: "pointer",
              }}
            >
              Log It
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--bg-card)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          zIndex: 100,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              padding: "8px 0 12px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              color: tab === t.id ? "#6EE7B7" : "var(--text-dim)",
              fontFamily: "Georgia, serif",
            }}
          >
            <span style={{ fontSize: "1.0625rem" }}>{t.icon}</span>
            <span style={{ fontSize: "0.5rem", letterSpacing: "0.04em" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HOME
// ════════════════════════════════════════════════════════════════════════════
function HomeTab({ plan, sched, now, statusItems, alerts, todayEvents, openLog, passed, notifGranted, requestNotifs }) {
  const [hh, mm] = now.split(":").map(Number);
  const h12 = hh % 12 || 12,
    ampm = hh >= 12 ? "PM" : "AM";
  const QUICK = ["wake", "morning_light", "coffee", "meal", "alcohol", "exercise", "afternoon_light", "screens_off", "wind_down", "bath", "todo_list", "sleep"];
  const cutoffs = [
    { label: "Caffeine cutoff", time: sched.caffeineCutoff, icon: "☕" },
    { label: "Alcohol cutoff", time: sched.alcoholCutoff, icon: "🍷" },
    { label: "Last meal", time: sched.mealCutoff, icon: "🍽️" },
    { label: "Screens off", time: sched.screensCutoff, icon: "📵" },
    { label: "Bedtime", time: plan.bedTime, icon: "😴" },
  ]
    .map((c) => ({ ...c, mins: minsUntil(c.time, now) }))
    .filter((c) => c.mins <= 180 && c.mins > 0)
    .sort((a, b) => a.mins - b.mins);

  return (
    <div>
      <div style={{ background: "linear-gradient(180deg, var(--bg-gradient) 0%, var(--bg) 100%)", padding: "32px 20px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "3.5rem", fontWeight: "bold", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {h12}:{String(mm).padStart(2, "0")} <span style={{ fontSize: "1.375rem", color: "var(--text-subtle)" }}>{ampm}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: "0.75rem", color: "var(--text-subtle)", letterSpacing: "0.08em" }}>
          WAKE {fmt12(plan.wakeTime)} · BED {fmt12(plan.bedTime)}
        </div>
        <div style={{ marginTop: 10, display: "inline-flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ background: "var(--border)", borderRadius: 20, padding: "4px 14px", fontSize: "0.75rem", color: "#6EE7B7" }}>{passed}/29 rules today</span>
          {!notifGranted && (
            <button
              onClick={requestNotifs}
              style={{ background: "var(--border)", border: "none", borderRadius: 20, padding: "4px 14px", fontSize: "0.75rem", color: "#FCD34D", cursor: "pointer", fontFamily: "Georgia, serif" }}
            >
              🔔 Enable reminders
            </button>
          )}
        </div>
      </div>
      {cutoffs.length > 0 && (
        <div style={{ padding: "12px 16px 0" }}>
          <Sec label="Coming up" />
          {cutoffs.map((c, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-card)", borderRadius: 10, padding: "10px 14px", marginBottom: 6, border: "1px solid var(--border)" }}
            >
              <span style={{ fontSize: "1.125rem" }}>{c.icon}</span>
              <span style={{ flex: 1, fontSize: "0.8125rem", color: "var(--text-light)" }}>{c.label}</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: "bold", color: c.mins <= 30 ? "#F87171" : c.mins <= 60 ? "#FCD34D" : "#6EE7B7" }}>
                {c.mins < 60 ? `${c.mins}m` : `${Math.floor(c.mins / 60)}h ${c.mins % 60}m`} · {fmt12(c.time)}
              </span>
            </div>
          ))}
        </div>
      )}
      {alerts.length > 0 && (
        <div style={{ padding: "12px 16px 0" }}>
          {alerts.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: a.urgent ? "var(--bg-alert)" : "var(--bg-card)",
                borderRadius: 10,
                padding: "11px 14px",
                marginBottom: 6,
                border: `1px solid ${a.urgent ? "#22C55E33" : "var(--border)"}`,
              }}
            >
              <span style={{ fontSize: "1.125rem" }}>{a.icon}</span>
              <span style={{ fontSize: "0.8125rem", color: a.urgent ? "#86EFAC" : "var(--text-secondary)", lineHeight: 1.4 }}>{a.text}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: "12px 16px 0" }}>
        <Sec label="Right now" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {statusItems.map((item, i) => (
            <div key={i} style={{ background: "var(--bg-card)", borderRadius: 12, padding: "12px 14px", border: `1px solid ${item.ok ? "var(--border-ok)" : "var(--border-bad)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                <span style={{ fontSize: "0.625rem", fontWeight: "bold", color: item.ok ? "#6EE7B7" : "#F87171" }}>{item.ok ? "✓ OK" : "✗ STOP"}</span>
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>{item.ok ? `OK until ${item.cutoff}` : `Cutoff: ${item.cutoff}`}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "14px 16px 0" }}>
        <Sec label="Quick log" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {QUICK.map((type) => {
            const info = EV[type],
              done = todayEvents.some((e) => e.type === type);
            return (
              <button
                key={type}
                onClick={() => openLog(type)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 11px",
                  borderRadius: 20,
                  border: `1px solid ${done ? `${info.color}55` : "var(--border)"}`,
                  background: done ? `${info.color}15` : "var(--bg-card)",
                  cursor: "pointer",
                  color: done ? info.color : "var(--text-secondary)",
                  fontFamily: "Georgia, serif",
                  fontSize: "0.75rem",
                }}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
                {done && <span style={{ fontSize: "0.5625rem" }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LOG
// ════════════════════════════════════════════════════════════════════════════
function LogTab({ todayEvents, openLog, removeEvent }) {
  return (
    <div style={{ padding: "20px 16px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: "1.25rem", fontWeight: "normal" }}>Today's Log</h2>
      <p style={{ color: "var(--text-subtle)", fontSize: "0.75rem", margin: "0 0 16px" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      {todayEvents.length === 0 ? (
        <p style={{ color: "var(--text-dim)", textAlign: "center", marginTop: 40, fontStyle: "italic" }}>Nothing logged yet.</p>
      ) : (
        todayEvents.map((ev) => {
          const info = EV[ev.type] || {};
          return (
            <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${info.color || "var(--text-muted)"}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.125rem",
                  flexShrink: 0,
                }}
              >
                {info.icon || "•"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.875rem" }}>{info.label || ev.type}</div>
                {ev.intensity && (
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                    {ev.intensity}
                    {ev.duration ? `, ${ev.duration} min` : ""}
                  </div>
                )}
                {ev.duration && !ev.intensity && <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>{ev.duration} min</div>}
              </div>
              <span style={{ fontSize: "0.875rem", color: info.color || "var(--text-secondary)", fontWeight: "bold" }}>{fmt12(ev.time)}</span>
              <button onClick={() => removeEvent(ev.id)} style={{ background: "none", border: "none", color: "var(--border-input)", cursor: "pointer", fontSize: "1.25rem", padding: "0 2px", lineHeight: 1 }}>
                ×
              </button>
            </div>
          );
        })
      )}
      <div style={{ marginTop: 20 }}>
        <Sec label="Add event" />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {Object.entries(EV).map(([type, info]) => (
          <button
            key={type}
            onClick={() => openLog(type)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 12px",
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontFamily: "Georgia, serif",
              fontSize: "0.75rem",
            }}
          >
            {info.icon} {info.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROGRESS
// ════════════════════════════════════════════════════════════════════════════
function ProgressTab({ logs, plan, today }) {
  const [range, setRange] = useState(14);

  const days = useMemo(
    () =>
      Array.from({ length: range }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (range - 1 - i));
        const key = d.toISOString().slice(0, 10);
        const events = logs[key] || [];
        const autoCompliance = computeAutoCompliance(plan, events);
        const { passed, failed, R } = autoCompliance;
        const pct = Math.round((passed / 13) * 100);
        const wakeEv = events.find((e) => e.type === "wake");
        const sleepEv = events.find((e) => e.type === "sleep");
        let sleepDuration = null;
        if (wakeEv && sleepEv) {
          const sv = toMins(sleepEv.time),
            wv = toMins(wakeEv.time);
          const dur = sv > wv ? 1440 - sv + wv : wv - sv;
          if (dur > 2 * 60 && dur < 12 * 60) sleepDuration = +(dur / 60).toFixed(1);
        }
        return {
          key,
          label: dayName(key),
          dateLabel: dateLabel(key),
          events,
          passed,
          failed,
          pct,
          R,
          coffeeCount: events.filter((e) => e.type === "coffee").length,
          alcoholCount: events.filter((e) => e.type === "alcohol").length,
          hasLight: events.some((e) => e.type === "morning_light"),
          hasAftLight: events.some((e) => e.type === "afternoon_light"),
          hasExercise: events.some((e) => e.type === "exercise"),
          sleepDuration,
          isToday: key === today,
        };
      }),
    [range, logs, plan, today],
  );

  let streak = 0;
  for (let i = days.length - 2; i >= 0; i--) {
    if (days[i].passed >= 8) streak++;
    else break;
  }
  if (days[days.length - 1].passed >= 8) streak++;

  const daysLogged = days.filter((d) => d.events.length > 0).length;
  const avgPct = daysLogged ? days.filter((d) => d.events.length > 0).reduce((s, d) => s + d.pct, 0) / daysLogged : 0;
  const coffeeTotal = days.reduce((s, d) => s + d.coffeeCount, 0);
  const alcoholTotal = days.reduce((s, d) => s + d.alcoholCount, 0);
  const lightDays = days.filter((d) => d.hasLight).length;
  const aftLightDays = days.filter((d) => d.hasAftLight).length;
  const exerciseDays = days.filter((d) => d.hasExercise).length;
  const hasSleepData = days.some((d) => d.sleepDuration !== null);

  const ruleStats = AUTO_RULE_IDS.map((num) => {
    const key = `r${num}`;
    const dwd = days.filter((d) => d.events.length > 0);
    let pass = 0,
      fail = 0;
    dwd.forEach((d) => {
      if (d.R[key] === PASS) pass++;
      else if (d.R[key] === FAIL) fail++;
    });
    return { num, pass, fail, rate: Math.round((pass / (pass + fail || 1)) * 100), title: RULES.find((r) => r.num === num)?.title || "" };
  })
    .filter((r) => r.pass + r.fail > 0)
    .sort((a, b) => b.rate - a.rate);

  const barColor = (pct) => (pct >= 80 ? "#6EE7B7" : pct >= 60 ? "#FCD34D" : "#F87171");
  const ttStyle = { background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: "0.75rem", fontFamily: "Georgia, serif" };

  return (
    <div style={{ padding: "20px 16px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 2px", fontSize: "1.25rem", fontWeight: "normal" }}>Progress</h2>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-subtle)" }}>Based on auto-tracked rules</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 14, 30].map((n) => (
            <button
              key={n}
              onClick={() => setRange(n)}
              style={{
                padding: "5px 10px",
                borderRadius: 8,
                border: `1px solid ${range === n ? "#6EE7B7" : "var(--border)"}`,
                background: range === n ? "#6EE7B722" : "transparent",
                color: range === n ? "#6EE7B7" : "var(--text-muted)",
                cursor: "pointer",
                fontFamily: "Georgia, serif",
                fontSize: "0.75rem",
              }}
            >
              {n}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Avg score", value: `${Math.round(avgPct)}%`, color: "#6EE7B7" },
          { label: "Days logged", value: `${daysLogged}/${range}`, color: "#93C5FD" },
          { label: "Streak", value: `${streak}d`, color: "#FCD34D" },
        ].map((s, i) => (
          <div key={i} style={{ background: "var(--bg-card)", borderRadius: 12, padding: "12px", textAlign: "center", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "1.375rem", fontWeight: "bold", color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", marginTop: 4, letterSpacing: "0.05em" }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Compliance bar chart */}
      <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "16px", marginBottom: 14, border: "1px solid var(--border)" }}>
        <Sec label="Daily compliance score" />
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={days} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={range <= 7 ? 28 : range <= 14 ? 18 : 10}>
            <XAxis dataKey="label" tick={{ fontSize: "0.625rem", fill: "var(--text-muted)", fontFamily: "Georgia, serif" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: "0.625rem", fill: "var(--text-dim)", fontFamily: "Georgia, serif" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={ttStyle} formatter={(v, _n, p) => [`${p.payload.passed}/13 rules (${v}%)`, ""]} labelStyle={{ color: "var(--text-secondary)", marginBottom: 4 }} />
            <ReferenceLine y={80} stroke="#6EE7B744" strokeDasharray="4 4" />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {days.map((d, i) => (
                <Cell key={i} fill={d.events.length === 0 ? "var(--border)" : barColor(d.pct)} opacity={d.isToday ? 1 : 0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 6, fontSize: "0.625rem", color: "var(--text-muted)" }}>
          {[
            ["#6EE7B7", "≥80%"],
            ["#FCD34D", "60–79%"],
            ["#F87171", "<60%"],
          ].map(([c, l], i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: "inline-block" }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Sleep duration line */}
      {hasSleepData && (
        <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "16px", marginBottom: 14, border: "1px solid var(--border)" }}>
          <Sec label="Sleep duration (hours)" />
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={days} margin={{ top: 4, right: 16, left: -28, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: "0.625rem", fill: "var(--text-muted)", fontFamily: "Georgia, serif" }} axisLine={false} tickLine={false} />
              <YAxis domain={[4, 10]} tick={{ fontSize: "0.625rem", fill: "var(--text-dim)", fontFamily: "Georgia, serif" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
              <Tooltip contentStyle={ttStyle} formatter={(v) => [v ? `${v} hrs` : "—", ""]} />
              <ReferenceLine y={8} stroke="#6EE7B744" strokeDasharray="4 4" label={{ value: "8h", position: "right", fontSize: "0.5625rem", fill: "#6EE7B766", fontFamily: "Georgia, serif" }} />
              <Line type="monotone" dataKey="sleepDuration" stroke="#93C5FD" strokeWidth={2} dot={{ fill: "#93C5FD", r: 3 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Habit heatmap */}
      <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "16px", marginBottom: 14, border: "1px solid var(--border)" }}>
        <Sec label="Daily habits" />
        {[
          { label: "Morning light", color: "#FCD34D", vals: days.map((d) => d.hasLight) },
          { label: "Afternoon light", color: "#F59E0B", vals: days.map((d) => d.hasAftLight) },
          { label: "Exercise", color: "#06B6D4", vals: days.map((d) => d.hasExercise) },
          { label: "No alcohol", color: "#6EE7B7", vals: days.map((d) => d.events.length > 0 && d.alcoholCount === 0) },
          { label: "Caffeine on time", color: "#A78BFA", vals: days.map((d) => d.events.length > 0 && d.R.r19 === PASS) },
        ].map((h, hi) => (
          <div key={hi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", minWidth: 110, flexShrink: 0 }}>{h.label}</span>
            <div style={{ display: "flex", gap: 3, flex: 1, justifyContent: "flex-end" }}>
              {h.vals.map((v, i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: v ? h.color : days[i].events.length > 0 ? "var(--bg-input)" : "var(--bg-surface)", flexShrink: 0 }} />
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 3, marginTop: 6 }}>
          {days.map((d, i) => (
            <div key={i} style={{ width: 14, fontSize: "0.4375rem", color: "var(--text-dim)", textAlign: "center", flexShrink: 0 }}>
              {d.label[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Best / worst rules */}
      {ruleStats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { title: "🏆 Strongest", color: "#6EE7B7", borderColor: "var(--border-ok)", data: ruleStats.slice(0, 3) },
            {
              title: "⚠️ Needs work",
              color: "#F87171",
              borderColor: "var(--border-bad)",
              data: ruleStats
                .filter((r) => r.fail > 0)
                .sort((a, b) => a.rate - b.rate)
                .slice(0, 3),
            },
          ].map((panel, pi) => (
            <div key={pi} style={{ background: "var(--bg-card)", borderRadius: 14, padding: "14px", border: `1px solid ${panel.borderColor}` }}>
              <div style={{ fontSize: "0.625rem", color: panel.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{panel.title}</div>
              {panel.data.length === 0 ? (
                <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic", margin: 0 }}>None yet</p>
              ) : (
                panel.data.map((r, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-light)", marginBottom: 3, lineHeight: 1.3 }}>
                      #{r.num} {r.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${r.rate}%`, background: panel.color, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: "0.625rem", color: panel.color, minWidth: 28 }}>{r.rate}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Habit totals */}
      <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "16px", border: "1px solid var(--border)" }}>
        <Sec label={`Habit summary · last ${range} days`} />
        {[
          { icon: "🌅", label: "Morning light", value: `${lightDays}/${range} days` },
          { icon: "🌤️", label: "Afternoon light", value: `${aftLightDays}/${range} days` },
          { icon: "🏃", label: "Exercise", value: `${exerciseDays}/${range} days` },
          { icon: "☕", label: "Caffeine sessions", value: coffeeTotal === 0 ? "None logged" : `${coffeeTotal} (avg ${(coffeeTotal / (daysLogged || 1)).toFixed(1)}/day)` },
          { icon: "🍷", label: "Alcohol sessions", value: alcoholTotal === 0 ? "None logged" : `${alcoholTotal} (avg ${(alcoholTotal / (daysLogged || 1)).toFixed(1)}/day)` },
        ].map((h, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
            <span style={{ fontSize: "1rem" }}>{h.icon}</span>
            <span style={{ flex: 1, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{h.label}</span>
            <span style={{ fontSize: "0.8125rem", color: "var(--text)", fontWeight: "bold" }}>{h.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SCORE
// ════════════════════════════════════════════════════════════════════════════
function ScoreTab({ R, passed, failed, pending, manual, toggleManual }) {
  const pct = Math.round((passed / 29) * 100);
  const grade = pct >= 85 ? { l: "Elite", c: "#6EE7B7" } : pct >= 65 ? { l: "Great", c: "#93C5FD" } : pct >= 40 ? { l: "Good", c: "#FDE68A" } : { l: "Building", c: "#FCA5A5" };
  const AUTO_IDS = AUTO_RULE_IDS;
  const MANUAL_IDS = MANUAL_RULE_IDS;
  const rInfo = (n) => RULES.find((r) => r.num === n);

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: "20px", marginBottom: 20, textAlign: "center", border: `1px solid ${grade.c}33` }}>
        <div style={{ fontSize: "3.25rem", fontWeight: "bold", color: grade.c, lineHeight: 1 }}>{passed}</div>
        <div style={{ fontSize: "0.8125rem", color: "var(--text-subtle)", marginTop: 4 }}>
          of 29 rules · <span style={{ color: grade.c }}>{grade.l}</span>
        </div>
        <div style={{ margin: "14px 0 6px", height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: grade.c, borderRadius: 3, transition: "width 0.5s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: "0.75rem" }}>
          <span style={{ color: "#6EE7B7" }}>✓ {passed}</span>
          <span style={{ color: "#F87171" }}>✗ {failed}</span>
          <span style={{ color: "var(--text-dim)" }}>· {pending} pending</span>
        </div>
      </div>
      <Sec label="Auto-tracked from your log" />
      {AUTO_IDS.map((n) => {
        const s = R[`r${n}`] || PENDING;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: "bold",
                background: s === PASS ? "#6EE7B722" : s === FAIL ? "#EF444422" : "var(--border)",
                color: s === PASS ? "#6EE7B7" : s === FAIL ? "#F87171" : "var(--text-dim)",
              }}
            >
              {s === PASS ? "✓" : s === FAIL ? "✗" : "·"}
            </div>
            <span style={{ fontSize: "0.8125rem", color: s === FAIL ? "#F87171" : s === PASS ? "var(--text-secondary)" : "var(--text-muted)", flex: 1 }}>
              <span style={{ color: "var(--text-dim)", fontSize: "0.6875rem" }}>#{n}</span> {rInfo(n)?.title}
            </span>
          </div>
        );
      })}
      <div style={{ marginTop: 20 }}>
        <Sec label="Tap to confirm manually" />
      </div>
      {MANUAL_IDS.map((n) => {
        const checked = manual[`r${n}`];
        return (
          <div key={n} onClick={() => toggleManual(`r${n}`)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: `2px solid ${checked ? "#6EE7B7" : "var(--border-input)"}`,
                background: checked ? "#6EE7B722" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                color: "#6EE7B7",
                flexShrink: 0,
              }}
            >
              {checked ? "✓" : ""}
            </div>
            <span style={{ fontSize: "0.8125rem", color: checked ? "var(--text-secondary)" : "var(--text-muted)", flex: 1 }}>
              <span style={{ color: "var(--text-dim)", fontSize: "0.6875rem" }}>#{n}</span> {rInfo(n)?.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PLAN
// ════════════════════════════════════════════════════════════════════════════
function PlanTab({ plan, updatePlan, sched, notifGranted, scheduleNotifications, prefs, updatePrefs }) {
  const CUTOFFS = [
    { label: "Last caffeine", time: sched.caffeineCutoff, icon: "☕", rule: "Rule 19 — 10 hrs before bed" },
    { label: "Last alcohol", time: sched.alcoholCutoff, icon: "🍷", rule: "Rule 20 — 3 hrs before bed" },
    { label: "Last meal", time: sched.mealCutoff, icon: "🍽️", rule: "Rule 21 — 2.5 hrs before bed" },
    { label: "Warm bath", time: sched.bathTarget, icon: "🛁", rule: "Rule 17 — 90 min before bed" },
    { label: "Vigorous exercise done", time: sched.exerciseCutoff, icon: "🏃", rule: "Rule 22 — 2 hrs before bed" },
    { label: "Screens off", time: sched.screensCutoff, icon: "📵", rule: "Rule 27 — 1 hr before bed" },
    { label: "Wind-down starts", time: sched.windDownStart, icon: "📖", rule: "Rule 24 — 45 min before bed" },
    { label: "Morning light by", time: sched.morningLightEnd, icon: "🌅", rule: "Rule 2 — 1 hr after wake" },
  ];
  return (
    <div style={{ padding: "20px 16px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: "1.25rem", fontWeight: "normal" }}>Your Sleep Plan</h2>
      <p style={{ color: "var(--text-subtle)", fontSize: "0.75rem", margin: "0 0 20px", lineHeight: 1.5 }}>All cutoffs and reminders derive from these two numbers.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "16px", border: "1px solid var(--border)" }}>
          <label style={{ display: "block", fontSize: "0.6875rem", color: "var(--text-subtle)", letterSpacing: "0.1em", marginBottom: 8 }}>WAKE TIME</label>
          <input
            type="time"
            value={plan.wakeTime}
            onChange={(e) => updatePlan("wakeTime", e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-input)",
              border: "1px solid var(--border-input)",
              borderRadius: 8,
              padding: "10px",
              color: "#F59E0B",
              fontSize: "1.25rem",
              fontFamily: "Georgia, serif",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "16px", border: "1px solid var(--border)" }}>
          <label style={{ display: "block", fontSize: "0.6875rem", color: "var(--text-subtle)", letterSpacing: "0.1em", marginBottom: 8 }}>BED TIME</label>
          <input
            type="time"
            value={plan.bedTime}
            onChange={(e) => updatePlan("bedTime", e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-input)",
              border: "1px solid var(--border-input)",
              borderRadius: 8,
              padding: "10px",
              color: "#6EE7B7",
              fontSize: "1.25rem",
              fontFamily: "Georgia, serif",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>
      {notifGranted && (
        <button
          onClick={() => scheduleNotifications(plan)}
          style={{
            width: "100%",
            padding: "12px",
            background: "var(--border)",
            border: "1px solid #6EE7B744",
            borderRadius: 12,
            color: "#6EE7B7",
            fontFamily: "Georgia, serif",
            fontSize: "0.875rem",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          🔔 Reschedule today's reminders
        </button>
      )}
      <Sec label="Display" />
      <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "16px", border: "1px solid var(--border)", marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: "0.6875rem", color: "var(--text-subtle)", letterSpacing: "0.1em", marginBottom: 8 }}>FONT SIZE</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["small", "medium", "large"].map((size) => (
              <button
                key={size}
                onClick={() => updatePrefs("fontSize", size)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: `2px solid ${prefs.fontSize === size ? "#6EE7B7" : "var(--border-input)"}`,
                  background: prefs.fontSize === size ? "#6EE7B722" : "transparent",
                  color: prefs.fontSize === size ? "#6EE7B7" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontFamily: "Georgia, serif",
                  fontSize: size === "small" ? 12 : size === "medium" ? 14 : 16,
                  textTransform: "capitalize",
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.6875rem", color: "var(--text-subtle)", letterSpacing: "0.1em", marginBottom: 8 }}>THEME</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "dark", label: "Dark", icon: "🌙" },
              { id: "light", label: "Light", icon: "☀️" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => updatePrefs("theme", t.id)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: `2px solid ${prefs.theme === t.id ? "#6EE7B7" : "var(--border-input)"}`,
                  background: prefs.theme === t.id ? "#6EE7B722" : "transparent",
                  color: prefs.theme === t.id ? "#6EE7B7" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontFamily: "Georgia, serif",
                  fontSize: "0.875rem",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Sec label="Auto-calculated cutoffs" />
      {CUTOFFS.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: "1.25rem", width: 28, textAlign: "center", flexShrink: 0 }}>{c.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.875rem" }}>{c.label}</div>
            <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>{c.rule}</div>
          </div>
          <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#6EE7B7", flexShrink: 0 }}>{fmt12(c.time)}</div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// RULES
// ════════════════════════════════════════════════════════════════════════════
function RulesTab() {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ padding: "20px 16px" }}>
      <h2 style={{ margin: "0 0 2px", fontSize: "1.25rem", fontWeight: "normal" }}>The 29 Rules</h2>
      <p style={{ color: "var(--text-subtle)", fontSize: "0.6875rem", margin: "0 0 20px" }}>How to Engineer Perfect Sleep · polymathinvestor.com</p>
      {CATS.map((cat) => {
        const { label, color, icon } = CAT_META[cat];
        return (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 10, marginBottom: 8 }}>
              <div style={{ fontSize: "0.6875rem", color, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {icon} {label}
              </div>
            </div>
            {RULES.filter((r) => r.cat === cat).map((r) => {
              const isOpen = open === r.num;
              return (
                <div key={r.num} style={{ marginBottom: 5, borderRadius: 10, overflow: "hidden", border: isOpen ? `1px solid ${color}44` : "1px solid var(--border)", background: "var(--bg-card)" }}>
                  <button
                    onClick={() => setOpen(isOpen ? null : r.num)}
                    style={{
                      width: "100%",
                      background: "none",
                      border: "none",
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    <span style={{ fontSize: "0.6875rem", color, fontWeight: "bold", minWidth: 20 }}>#{r.num}</span>
                    <span style={{ flex: 1, fontSize: "0.875rem", color: "var(--text)" }}>{r.title}</span>
                    {r.auto && <span style={{ fontSize: "0.5625rem", color: "var(--text-dim)", background: "var(--border)", borderRadius: 4, padding: "2px 5px", flexShrink: 0 }}>AUTO</span>}
                    <span style={{ fontSize: "0.625rem", color: "var(--text-dim)" }}>{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${color}22` }}>
                      <p style={{ margin: "10px 0 8px", fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>{r.short}</p>
                      <div style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: "0.5625rem", color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Application</div>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.65 }}>{r.tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function Sec({ label }) {
  return <div style={{ fontSize: "0.6875rem", color: "var(--text-subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>;
}

export { AUTO_RULE_IDS, computeAutoCompliance, computeCompliance, deriveSchedule, FAIL, fmt12, MANUAL_RULE_IDS, minsUntil, PASS, PENDING, pruneLogs, RULES, toMins, toTime };
