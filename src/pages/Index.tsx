import { useState, useEffect, useRef } from "react";
import L from "leaflet";

type RecycleType = "paper" | "cardboard" | "all";

interface RecyclePoint {
  id: number;
  name: string;
  address: string;
  type: RecycleType[];
  lat: number;
  lng: number;
  hours: string;
  collected: number;
}

const POINTS: RecyclePoint[] = [
  { id: 1, name: "ПАО «Экосервис» — пункт приёма", address: "ул. Дружбы, 8А", type: ["all"], lat: 54.8835, lng: 52.3190, hours: "Пн–Пт 09:00–18:00", collected: 520 },
  { id: 2, name: "Пункт приёма вторсырья", address: "ул. Индустриальная, 10/3", type: ["paper", "cardboard"], lat: 54.8780, lng: 52.3280, hours: "Пн–Пт 08:00–17:00", collected: 310 },
  { id: 3, name: "Экосервис — пункт приёма батареек", address: "ул. 70 лет Октября, 3", type: ["all"], lat: 54.9060, lng: 52.3030, hours: "Круглосуточно", collected: 185 },
  { id: 4, name: "Экосервис — контейнер раздельного сбора", address: "ул. Гафиатуллина, 47/1", type: ["paper", "cardboard"], lat: 54.9010, lng: 52.2960, hours: "Пн–Пт 08:00–17:00", collected: 270 },
  { id: 5, name: "Городской парк 60-летия нефти Татарстана", address: "ул. Радищева, 22Б", type: ["all"], lat: 54.9021, lng: 52.3015, hours: "Круглосуточно", collected: 420 },
  { id: 6, name: "Пункт приёма макулатуры", address: "пр-т Габдуллы Тукая, 9А ст4", type: ["paper", "cardboard"], lat: 54.8950, lng: 52.2870, hours: "Пн–Пт 08:00–17:00", collected: 290 },
  { id: 7, name: "Экосервис — контейнер для пластика и стекла", address: "ул. Геофизическая, 1В", type: ["all"], lat: 54.8870, lng: 52.3100, hours: "Круглосуточно", collected: 375 },
];

const TYPE_LABELS: Record<string, string> = {
  all: "Все типы",
  paper: "Бумага/Листовки",
  cardboard: "Картон",
};

const TYPE_COLORS: Record<string, string> = {
  all: "#1a4d2e",
  paper: "#2d7a45",
  cardboard: "#4a9e6b",
};

function createEcoIcon(type: RecycleType[]) {
  const color = type.includes("all") ? "#1a4d2e" : type.includes("paper") ? "#2d7a45" : "#4a9e6b";
  const emoji = type.includes("all") ? "♻️" : type.includes("paper") ? "📄" : "📦";
  return L.divIcon({
    className: "",
    html: `<div style="width:42px;height:42px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.3);border:2px solid rgba(255,255,255,0.5)"><span style="transform:rotate(45deg);font-size:18px;line-height:1">${emoji}</span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -44],
  });
}

// Animated counter
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCurrent(target); clearInterval(timer); }
          else setCurrent(start);
        }, 25);
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{current.toLocaleString("ru-RU")}{suffix}</span>;
}

// Map component using raw Leaflet
function LeafletMap({ points, userPos }: { points: RecyclePoint[]; userPos: [number, number] | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { center: [54.9000, 52.3000], zoom: 14, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update point markers when points change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    points.forEach(point => {
      const marker = L.marker([point.lat, point.lng], { icon: createEcoIcon(point.type) });
      const typeBadges = point.type.map(t =>
        `<span style="background:${TYPE_COLORS[t]};color:white;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600;display:inline-block;margin:2px">${TYPE_LABELS[t]}</span>`
      ).join("");
      marker.bindPopup(`
        <div style="font-family:'Golos Text',sans-serif;min-width:200px">
          <div style="font-weight:700;font-size:15px;color:#1a4d2e;margin-bottom:4px">${point.name}</div>
          <div style="font-size:13px;color:#5a7a65;margin-bottom:4px">📍 ${point.address}</div>
          <div style="font-size:12px;color:#4a9e6b;margin-bottom:6px">⏰ ${point.hours}</div>
          <div style="margin-bottom:8px">${typeBadges}</div>
          <div style="background:#f4f8f0;border-radius:8px;padding:6px 10px;font-size:12px;color:#1a4d2e;font-weight:600">♻️ Собрано: ${point.collected} кг</div>
        </div>
      `);
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [points]);

  // Update user marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (userPos) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;background:#2d7a45;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(45,122,69,0.25)"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker(userPos, { icon }).addTo(map).bindPopup("<b>Вы здесь</b>");
    }
  }, [userPos]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      {userPos && mapInstanceRef.current && (
        <button
          onClick={() => mapInstanceRef.current?.flyTo(userPos, 15, { duration: 1.2 })}
          style={{
            position: "absolute", bottom: 80, right: 10, zIndex: 1000,
            background: "#1a4d2e", color: "white", width: 34, height: 34,
            borderRadius: 6, border: "none", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)", fontSize: 18,
          }}
          title="Моё местоположение"
        >📍</button>
      )}
    </div>
  );
}

export default function Index() {
  const [activeSection, setActiveSection] = useState<"map" | "stats" | "contacts">("map");
  const [activeFilter, setActiveFilter] = useState<string>("all_points");
  const [maxDistance, setMaxDistance] = useState<number>(5);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [formSent, setFormSent] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const filteredPoints = POINTS.filter((p) => {
    const typeOk = activeFilter === "all_points" || p.type.includes(activeFilter as RecycleType);
    const distOk = !userPos || getDistance(userPos[0], userPos[1], p.lat, p.lng) <= maxDistance;
    return typeOk && distOk;
  });

  const totalCollected = POINTS.reduce((s, p) => s + p.collected, 0);

  const navItems = [
    { id: "map" as const, label: "Карта", emoji: "🗺️" },
    { id: "stats" as const, label: "Статистика", emoji: "📊" },
    { id: "contacts" as const, label: "Контакты", emoji: "✉️" },
  ];

  return (
    <div className="min-h-screen texture-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-[var(--color-mist)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-leaf">🌿</span>
            <div>
              <div className="font-display text-xl font-bold tracking-wide text-[var(--color-forest)]">ЭкоЛист</div>
              <div className="text-[10px] text-[var(--color-moss)] font-medium leading-none tracking-widest uppercase">Альметьевск</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`nav-link text-sm font-semibold transition-colors ${activeSection === s.id ? "text-[var(--color-leaf)]" : "text-[var(--color-forest)] hover:text-[var(--color-leaf)]"}`}>
                {s.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 bg-[var(--color-forest)] text-white px-4 py-2 rounded-full text-sm font-semibold">
            <span>♻️</span><span>{filteredPoints.length} точек</span>
          </div>
        </div>
        <div className="md:hidden flex border-t border-[var(--color-mist)]">
          {navItems.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeSection === s.id ? "bg-[var(--color-forest)] text-white" : "text-[var(--color-forest)]"}`}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </header>

      {/* ===== MAP ===== */}
      {activeSection === "map" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="animate-fade-up mb-6">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--color-forest)] leading-tight">
              Карта переработки<br /><span className="text-[var(--color-moss)]">листовок в городе</span>
            </h1>
            <p className="mt-2 text-[var(--color-moss)] text-lg">Найди ближайший пункт приёма рекламных материалов</p>
          </div>

          {/* Filters */}
          <div className="animate-fade-up-1 glass-card rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
            <span className="text-sm font-semibold text-[var(--color-forest)] mr-1">Тип:</span>
            {[
              { id: "all_points", label: "Все точки", emoji: "🗺️" },
              { id: "paper", label: "Листовки/Бумага", emoji: "📄" },
              { id: "cardboard", label: "Картон", emoji: "📦" },
              { id: "all", label: "Все типы сразу", emoji: "♻️" },
            ].map((f) => (
              <button key={f.id} onClick={() => setActiveFilter(f.id)} className={`filter-chip ${activeFilter === f.id ? "active" : ""}`}>
                <span>{f.emoji}</span><span>{f.label}</span>
              </button>
            ))}
            {userPos && (
              <>
                <div className="h-6 w-px bg-[var(--color-mist)] mx-2 hidden sm:block" />
                <span className="text-sm font-semibold text-[var(--color-forest)]">📍 До {maxDistance} км</span>
                <input type="range" min={1} max={10} value={maxDistance}
                  onChange={(e) => setMaxDistance(+e.target.value)}
                  className="accent-[var(--color-forest)] w-28" />
              </>
            )}
            {!userPos && (
              <button onClick={() => navigator.geolocation?.getCurrentPosition((p) => setUserPos([p.coords.latitude, p.coords.longitude]))}
                className="filter-chip ml-auto">
                <span>📍</span><span>Моё местоположение</span>
              </button>
            )}
          </div>

          {/* Map */}
          <div className="animate-fade-up-2 rounded-2xl overflow-hidden shadow-xl border border-[var(--color-mist)]" style={{ height: 520 }}>
            <LeafletMap points={filteredPoints} userPos={userPos} />
          </div>

          {/* Point list */}
          <div className="animate-fade-up-3 mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPoints.map((p) => (
              <div key={p.id} className="glass-card rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{p.type.includes("all") ? "♻️" : p.type.includes("paper") ? "📄" : "📦"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[var(--color-forest)] text-sm truncate">{p.name}</div>
                    <div className="text-xs text-[var(--color-moss)] mt-0.5">{p.address}</div>
                    <div className="text-xs text-[var(--color-moss)]">{p.hours}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-[var(--color-leaf)]">{p.collected}</div>
                    <div className="text-[10px] text-[var(--color-moss)] font-medium">кг</div>
                  </div>
                </div>
              </div>
            ))}
            {filteredPoints.length === 0 && (
              <div className="col-span-full text-center py-12 text-[var(--color-moss)]">
                <span className="text-5xl block mb-3">🌿</span>
                Нет точек по выбранным фильтрам. Попробуй увеличить расстояние.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== STATS ===== */}
      {activeSection === "stats" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="animate-fade-up mb-10">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[var(--color-forest)]">
              Статистика<br /><span className="text-[var(--color-moss)]">переработки</span>
            </h2>
            <p className="mt-2 text-[var(--color-moss)] text-lg">Альметьевск становится чище вместе с нами</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { emoji: "♻️", label: "Собрано листовок", value: totalCollected, suffix: " кг", delay: "animate-fade-up" },
              { emoji: "📍", label: "Точек приёма", value: POINTS.length, suffix: "", delay: "animate-fade-up-1" },
              { emoji: "🌳", label: "Деревьев сохранено", value: Math.round(totalCollected / 15), suffix: "", delay: "animate-fade-up-2" },
              { emoji: "🏙️", label: "Районов охвачено", value: 4, suffix: "", delay: "animate-fade-up-3" },
            ].map((s) => (
              <div key={s.label} className={`${s.delay} stat-card glass-card rounded-2xl p-6 text-center`}>
                <div className="text-4xl mb-3">{s.emoji}</div>
                <div className="font-display text-4xl font-bold text-[var(--color-forest)]">
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-sm text-[var(--color-moss)] font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="animate-fade-up-2 glass-card rounded-2xl p-6 mb-6">
            <h3 className="font-display text-xl font-bold text-[var(--color-forest)] mb-5">Сбор по точкам (кг)</h3>
            <div className="space-y-3">
              {[...POINTS].sort((a, b) => b.collected - a.collected).map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-36 text-sm text-[var(--color-forest)] font-medium truncate shrink-0">{p.name}</div>
                  <div className="flex-1 bg-[var(--color-mist)] rounded-full h-5 overflow-hidden">
                    <div className="h-full rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(p.collected / 420) * 100}%`, background: "linear-gradient(90deg, var(--color-moss), var(--color-leaf))", transition: "width 1s ease-out" }}>
                      <span className="text-[11px] text-white font-bold">{p.collected}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up-3 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { label: "Листовки и бумага", emoji: "📄", count: POINTS.filter(p => p.type.includes("paper") || p.type.includes("all")).length, color: "#2d7a45" },
              { label: "Картон", emoji: "📦", count: POINTS.filter(p => p.type.includes("cardboard") || p.type.includes("all")).length, color: "#4a9e6b" },
              { label: "Все типы сразу", emoji: "♻️", count: POINTS.filter(p => p.type.includes("all")).length, color: "#1a4d2e" },
            ].map((t) => (
              <div key={t.label} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ background: `${t.color}22` }}>{t.emoji}</div>
                <div>
                  <div className="font-display text-3xl font-bold" style={{ color: t.color }}>{t.count}</div>
                  <div className="text-sm text-[var(--color-moss)] font-medium">{t.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="animate-fade-up-4 mt-6 rounded-2xl p-6 text-white"
            style={{ background: "linear-gradient(135deg, var(--color-forest), var(--color-leaf))" }}>
            <div className="text-2xl mb-2">🌍</div>
            <div className="font-display text-xl font-bold mb-1">Знаете ли вы?</div>
            <p className="text-[var(--color-mist)] text-sm leading-relaxed">
              Из <strong className="text-white">1 тонны</strong> переработанной бумаги можно сохранить до{" "}
              <strong className="text-white">17 деревьев</strong> и сэкономить 26 000 литров воды.
              Каждая сданная листовка — вклад в природу Альметьевска.
            </p>
          </div>
        </div>
      )}

      {/* ===== CONTACTS ===== */}
      {activeSection === "contacts" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="animate-fade-up mb-10">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[var(--color-forest)]">Контакты</h2>
            <p className="mt-2 text-[var(--color-moss)] text-lg">Стань частью зелёного движения</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 animate-fade-up-1">
              {[
                { emoji: "📧", label: "Email", value: "ecolist@almet.ru" },
                { emoji: "📞", label: "Телефон", value: "+7 (8553) 25-00-00" },
                { emoji: "📍", label: "Адрес", value: "г. Альметьевск, ул. Ленина, 26" },
                { emoji: "⏰", label: "Часы работы", value: "Пн–Пт 9:00–18:00" },
              ].map((c) => (
                <div key={c.label} className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-forest)] flex items-center justify-center text-2xl shrink-0">{c.emoji}</div>
                  <div>
                    <div className="text-xs text-[var(--color-moss)] font-semibold uppercase tracking-wider">{c.label}</div>
                    <div className="text-[var(--color-forest)] font-semibold mt-0.5">{c.value}</div>
                  </div>
                </div>
              ))}
              <div className="glass-card rounded-2xl p-5">
                <div className="text-xs text-[var(--color-moss)] font-semibold uppercase tracking-wider mb-3">Мы в сети</div>
                <div className="flex gap-3">
                  {["ВКонтакте", "Telegram", "WhatsApp"].map((soc) => (
                    <button key={soc} className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 border-[var(--color-mist)] text-[var(--color-forest)] hover:bg-[var(--color-forest)] hover:text-white hover:border-[var(--color-forest)] transition-all">
                      {soc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="animate-fade-up-2">
              {formSent ? (
                <div className="glass-card rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4">🌿</div>
                  <div className="font-display text-2xl font-bold text-[var(--color-forest)] mb-2">Спасибо!</div>
                  <p className="text-[var(--color-moss)]">Мы ответим в ближайшее время.</p>
                  <button onClick={() => setFormSent(false)} className="mt-5 text-sm text-[var(--color-leaf)] underline">Отправить ещё раз</button>
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="font-display text-xl font-bold text-[var(--color-forest)] mb-5">Напишите нам</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-moss)] uppercase tracking-wider mb-1.5">Ваше имя</label>
                      <input type="text" placeholder="Иван Петров"
                        className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-mist)] bg-white/60 text-[var(--color-forest)] placeholder:text-[var(--color-sage)] focus:outline-none focus:border-[var(--color-leaf)] transition-colors text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-moss)] uppercase tracking-wider mb-1.5">Email или телефон</label>
                      <input type="text" placeholder="email@mail.ru"
                        className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-mist)] bg-white/60 text-[var(--color-forest)] placeholder:text-[var(--color-sage)] focus:outline-none focus:border-[var(--color-leaf)] transition-colors text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-moss)] uppercase tracking-wider mb-1.5">Тема</label>
                      <select className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-mist)] bg-white/60 text-[var(--color-forest)] focus:outline-none focus:border-[var(--color-leaf)] transition-colors text-sm">
                        <option>Добавить новую точку приёма</option>
                        <option>Сотрудничество</option>
                        <option>Вопрос по переработке</option>
                        <option>Другое</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-moss)] uppercase tracking-wider mb-1.5">Сообщение</label>
                      <textarea rows={4} placeholder="Расскажите подробнее..."
                        className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-mist)] bg-white/60 text-[var(--color-forest)] placeholder:text-[var(--color-sage)] focus:outline-none focus:border-[var(--color-leaf)] transition-colors text-sm resize-none" />
                    </div>
                    <button onClick={() => setFormSent(true)}
                      className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg, var(--color-forest), var(--color-leaf))" }}>
                      🌿 Отправить сообщение
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="animate-fade-up-3 mt-8 rounded-2xl p-6 border-2 border-dashed border-[var(--color-sage)] text-center">
            <div className="text-3xl mb-2">🤝</div>
            <div className="font-display text-lg font-bold text-[var(--color-forest)]">Хочешь стать партнёром?</div>
            <p className="text-sm text-[var(--color-moss)] mt-1 mb-4">Организации, школы и торговые центры — присоединяйтесь к экопрограмме Альметьевска</p>
            <button className="px-6 py-2.5 rounded-full text-sm font-bold bg-[var(--color-forest)] text-white hover:bg-[var(--color-leaf)] transition-colors">
              Стать партнёром
            </button>
          </div>
        </div>
      )}

      <footer className="mt-12 border-t border-[var(--color-mist)] py-6 text-center text-sm text-[var(--color-moss)]">
        <span className="text-xl mr-2">🌿</span>
        <span className="font-semibold text-[var(--color-forest)]">ЭкоЛист Альметьевск</span>
        {" · "}Переработка рекламных листовок{" · "}2026
      </footer>
    </div>
  );
}