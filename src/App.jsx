import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronRight,
  CircleDollarSign,
  Filter,
  LayoutDashboard,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  Flame,
  Layers3,
  LineChart as LineChartIcon,
  Printer,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import "./App.css";

const RISK_COLORS = {
  High: "#fb7185",
  Medium: "#f59e0b",
  Low: "#34d399",
};

const DEMAND_COLORS = {
  High: "#22c55e",
  Medium: "#60a5fa",
  Low: "#a78bfa",
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#fb7185"];

function formatMoney(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(num);
}

function normalizeRisk(value) {
  const v = String(value || "").toLowerCase();
  if (v.includes("high")) return "High";
  if (v.includes("medium")) return "Medium";
  if (v.includes("low")) return "Low";
  return "Low";
}

function normalizeDemand(value) {
  const v = String(value || "").toLowerCase();
  if (v.includes("high")) return "High";
  if (v.includes("medium")) return "Medium";
  if (v.includes("low")) return "Low";
  return "Low";
}

function App() {
  const [view, setView] = useState("overview");
  const [data, setData] = useState([]);
  const [query, setQuery] = useState("");
  const [activeCity, setActiveCity] = useState("All Cities");
  const [riskFilter, setRiskFilter] = useState("All");
  const [demandFilter, setDemandFilter] = useState("All");
  const [sortMode, setSortMode] = useState("profit");
  const [live, setLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("Waiting...");
  const [selectedInsight, setSelectedInsight] = useState("best");


  const fetchData = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/data");
      const json = await res.json();
      setData(prev => {
        const newData = Array.isArray(json) ? json : [];

        return newData.map((item, i) => {
          const old = prev[i] || item;

          return {
            ...item,
            temp: old.temp + (item.temp - old.temp) * 0.3,
            humidity: old.humidity + (item.humidity - old.humidity) * 0.3
          };
        });
      });
      
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    if (!live) return undefined;

    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [live]);

  const cityOptions = useMemo(() => {
    const cities = [...new Set(data.map((d) => d.city).filter(Boolean))].sort();
    return ["All Cities", ...cities];
  }, [data]);

  const filteredData = useMemo(() => {
    const q = query.trim().toLowerCase();

    return data.filter((row) => {
      const city = String(row.city || "").toLowerCase();
      const crop = String(row.prediction || "").toLowerCase();
      const alert = String(row.alert || "").toLowerCase();
      const risk = normalizeRisk(row.risk);
      const demand = normalizeDemand(row.demand);

      const matchesQuery =
        !q || city.includes(q) || crop.includes(q) || alert.includes(q);

      const matchesCity =
        activeCity === "All Cities" || row.city === activeCity;

      const matchesRisk =
        riskFilter === "All" || risk === riskFilter;

      const matchesDemand =
        demandFilter === "All" || demand === demandFilter;

      return matchesQuery && matchesCity && matchesRisk && matchesDemand;
    });
  }, [data, query, activeCity, riskFilter, demandFilter]);

  const sortedData = useMemo(() => {
    const arr = [...filteredData];

    arr.sort((a, b) => {
      if (sortMode === "profit") return Number(b.profit || 0) - Number(a.profit || 0);
      if (sortMode === "confidence") return Number(b.confidence || 0) - Number(a.confidence || 0);
      if (sortMode === "temperature") return Number(b.temp || 0) - Number(a.temp || 0);
      if (sortMode === "humidity") return Number(b.humidity || 0) - Number(a.humidity || 0);
      return 0;
    });

    return arr;
  }, [filteredData, sortMode]);

  const citySummary = useMemo(() => {
    const map = new Map();

    data.forEach((row) => {
      const city = row.city || "Unknown";
      const current = map.get(city) || {
        city,
        count: 0,
        totalTemp: 0,
        totalHumidity: 0,
        totalProfit: 0,
        totalConfidence: 0,
        latestCrop: row.prediction || "—",
        latestRisk: row.risk || "—",
        latestDemand: row.demand || "—",
      };

      current.count += 1;
      current.totalTemp += Number(row.temp || 0);
      current.totalHumidity += Number(row.humidity || 0);
      current.totalProfit += Number(row.profit || 0);
      current.totalConfidence += Number(row.confidence || 0);
      current.latestCrop = row.prediction || current.latestCrop;
      current.latestRisk = row.risk || current.latestRisk;
      current.latestDemand = row.demand || current.latestDemand;

      map.set(city, current);
    });

    return [...map.values()]
      .map((item) => ({
        ...item,
        avgTemp: item.count ? item.totalTemp / item.count : 0,
        avgHumidity: item.count ? item.totalHumidity / item.count : 0,
        avgProfit: item.count ? item.totalProfit / item.count : 0,
        avgConfidence: item.count ? item.totalConfidence / item.count : 0,
      }))
      .sort((a, b) => b.avgProfit - a.avgProfit);
  }, [data]);

  const bestOpportunity = sortedData[0] || data[0] || null;
  const bestCity = citySummary[0] || null;

  const totalProfit = filteredData.reduce((sum, row) => sum + Number(row.profit || 0), 0);
  const avgConfidence = filteredData.length
    ? Math.round(
        filteredData.reduce((sum, row) => sum + Number(row.confidence || 0), 0) /
          filteredData.length
      )
    : 0;

  const highRiskCount = filteredData.filter(
    (row) => normalizeRisk(row.risk) === "High"
  ).length;

  const liveCount = new Set(data.map((row) => row.city)).size;

  const alertCount = data.filter((row) => {
    const a = String(row.alert || "").toLowerCase();
    return a && !a.includes("normal");
  }).length;

  const riskDistribution = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    filteredData.forEach((row) => {
      counts[normalizeRisk(row.risk)] += 1;
    });

    return [
      { name: "Low", value: counts.Low },
      { name: "Medium", value: counts.Medium },
      { name: "High", value: counts.High },
    ];
  }, [filteredData]);

  const profitChartData = useMemo(() => {
    return citySummary.slice(0, 6).map((row) => ({
      city: row.city,
      profit: Math.round(row.avgProfit),
    }));
  }, [citySummary]);

  const activeCityRows = useMemo(() => {
    const base =
      activeCity === "All Cities"
        ? sortedData
        : sortedData.filter((row) => row.city === activeCity);

    return base.slice(-8);
  }, [sortedData, activeCity]);

  const trendData = useMemo(() => {
    return activeCityRows.map((row, index) => ({
      label: activeCity === "All Cities" ? row.city || `P${index + 1}` : `T${index + 1}`,
      temp: Number(row.temp || 0),
      humidity: Number(row.humidity || 0),
      profit: Number(row.profit || 0),
      confidence: Number(row.confidence || 0),
    }));
  }, [activeCityRows, activeCity]);

  const alertFeed = useMemo(() => {
    return sortedData
      .filter((row) => normalizeRisk(row.risk) === "High" || String(row.alert || "").includes("Risk"))
      .slice(0, 5);
  }, [sortedData]);

  const insightText = useMemo(() => {
    if (!bestOpportunity) return "Waiting for live data...";
    return `Focus on ${bestOpportunity.city}. The model recommends ${bestOpportunity.prediction} with ${bestOpportunity.confidence}% confidence and estimated profit of $${formatMoney(bestOpportunity.profit)}.`;
  }, [bestOpportunity]);

  const recommendationReasons = useMemo(() => {
    if (!bestOpportunity) return [];
    const reasons = [];
    if (Number(bestOpportunity.temp || 0) >= 28) reasons.push("Temperature is in a profitable farming range.");
    if (Number(bestOpportunity.humidity || 0) >= 60) reasons.push("Humidity supports stronger crop growth.");
    if (Number(bestOpportunity.confidence || 0) >= 80) reasons.push("Model confidence is strong.");
    if (normalizeRisk(bestOpportunity.risk) !== "High") reasons.push("Weather risk is manageable.");
    return reasons;
  }, [bestOpportunity]);

  const insights = useMemo(() => {
  if (!data || data.length === 0) return {};

  const highestRisk = data.find(d => d.risk === "High");
  const bestProfit = [...data].sort((a, b) => b.profit - a.profit)[0];
  const hottest = [...data].sort((a, b) => b.temp - a.temp)[0];

  return {
    risk: highestRisk?.city || "None",
    profit: bestProfit?.city || "N/A",
    temp: hottest?.city || "N/A"
  };
  }, [data]);

  const renderOverview = () => (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.24 }}
      className="page-stack"
    >
      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-chip">
            <Sparkles size={16} />
            AI Decision Support Studio
          </div>

          <h1>Know what to grow, where to invest, and when to act.</h1>

          <p className="hero-text">
            Your live agricultural intelligence system turns weather, crop prediction,
            and business risk into clear decisions that anyone can understand in seconds.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => setView("decisions")}>
              Explore decisions <ChevronRight size={16} />
            </button>
            <button className="btn btn-secondary" onClick={() => setView("analytics")}>
              Open analytics <LineChartIcon size={16} />
            </button>
          </div>

          <div className="hero-steps">
            <StepCard
              index="01"
              title="Watch the live signal"
              text="Weather updates, alerts, and city-level values refresh automatically."
            />
            <StepCard
              index="02"
              title="Read the AI recommendation"
              text="See the best crop, confidence score, profit, demand, and risk in one place."
            />
            <StepCard
              index="03"
              title="Take the best action"
              text="Use filters and charts to compare regions before making a decision."
            />
          </div>
        </div>

        <div className="hero-side">
          <div className="status-card">
            <div className="status-row">
              <span className={`status-pill ${live ? "live" : "paused"}`}>
                {live ? <Activity size={14} /> : <Pause size={14} />}
                {live ? "Live streaming" : "Paused"}
              </span>
              <span className="status-time">Updated {lastUpdated}</span>
            </div>

            <div className="status-grid">
              <MiniInfo label="Live cities" value={liveCount} icon={<MapPin size={16} />} />
              <MiniInfo label="Alerts" value={alertCount} icon={<AlertTriangle size={16} />} />
              <MiniInfo label="Best city" value={bestCity?.city || "—"} icon={<Target size={16} />} />
              <MiniInfo label="Top crop" value={bestOpportunity?.prediction || "—"} icon={<Brain size={16} />} />
            </div>

            <div className="status-highlight">
              <div className="status-highlight-icon">
                <Zap size={18} />
              </div>
              <div>
                <p className="status-highlight-title">Decision snapshot</p>
                <p className="status-highlight-text">
                  {insights.risk !== "None" && `⚠️ ${insights.risk} shows high risk conditions. `}
                  {insights.profit !== "N/A" && `💰 ${insights.profit} offers the best return. `}
                  {insights.temp !== "N/A" && `🌡️ ${insights.temp} is currently the hottest region.`}
                </p>
              </div>
            </div>
          </div>

          <div className="quick-scan">
            <div className="quick-scan-head">
              <h3>Why this matters</h3>
              <span>Auto summary</span>
            </div>
            <ul>
              <li>{bestCity ? `${bestCity.city} currently leads in projected return.` : "Waiting for live data."}</li>
              <li>{bestOpportunity ? `${bestOpportunity.prediction} is the highest opportunity crop right now.` : "No recommendation yet."}</li>
              <li>{highRiskCount} cities need caution based on the current filter.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        <MetricCard
          icon={<CircleDollarSign size={18} />}
          title="Projected Profit"
          value={`$${formatMoney(totalProfit)}`}
          helper="Current filtered set"
          accent="accent"
        />
        <MetricCard
          icon={<TrendingUp size={18} />}
          title="Average Confidence"
          value={`${avgConfidence}%`}
          helper="Model certainty"
          accent="success"
        />
        <MetricCard
          icon={<ShieldAlert size={18} />}
          title="High-Risk Areas"
          value={highRiskCount}
          helper="Need attention"
          accent="danger"
        />
        <MetricCard
          icon={<Layers3 size={18} />}
          title="Active Records"
          value={filteredData.length}
          helper="Visible after filters"
          accent="info"
        />
      </section>

      <section className="panel-grid">
        <div className="panel panel-large">
          <SectionTitle
            icon={<Brain size={18} />}
            title="AI Insight Engine"
            subtitle="The system explains what you should do next"
          />

          {bestOpportunity ? (
            <div className="insight-block">
              <div className="insight-hero">
                <div>
                  <p className="insight-label">Best opportunity right now</p>
                  <h3>
                    Grow <span>{bestOpportunity.prediction || "—"}</span> in{" "}
                    <span>{bestOpportunity.city || "—"}</span>
                  </h3>
                </div>
                <div className="insight-score">
                  <strong>{Number(bestOpportunity.confidence || 0)}%</strong>
                  <span>confidence</span>
                </div>
              </div>

              <div className="insight-points">
                {recommendationReasons.length > 0 ? (
                  recommendationReasons.map((reason, idx) => (
                    <div key={idx} className="insight-point">
                      <Sparkles size={14} />
                      <span>{reason}</span>
                    </div>
                  ))
                ) : (
                  <div className="insight-point">
                    <Sparkles size={14} />
                    <span>Waiting for enough live records to generate deeper reasoning.</span>
                  </div>
                )}
              </div>

              <div className="decision-pill-row">
                <span className="decision-pill success">
                  Profit: ${formatMoney(bestOpportunity.profit)}
                </span>
                <span className="decision-pill">
                  Demand: {bestOpportunity.demand || "—"}
                </span>
                <span className={`decision-pill ${normalizeRisk(bestOpportunity.risk) === "High" ? "danger" : "success"}`}>
                  Risk: {bestOpportunity.risk || "—"}
                </span>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Brain size={20} />}
              title="Waiting for live data"
              text="Start the producer so the dashboard can analyze cities, crops, profit, and risk."
            />
          )}
        </div>

        <div className="panel panel-side">
          <SectionTitle
            icon={<ShieldAlert size={18} />}
            title="Alert Center"
            subtitle="Important items that need attention"
          />

          {alertFeed.length ? (
            <div className="alert-list">
              {alertFeed.map((item, idx) => (
                <div key={`${item.city}-${idx}`} className="alert-item">
                  <div className="alert-top">
                    <strong>{item.city}</strong>
                    <span className={`risk-dot ${normalizeRisk(item.risk).toLowerCase()}`} />
                  </div>
                  <p>{item.alert || "Alert pending"}</p>
                  <small>
                    {item.prediction || "—"} • {normalizeRisk(item.risk)} risk
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ShieldAlert size={20} />}
              title="No critical alerts"
              text="High-risk cities will appear here automatically."
            />
          )}
        </div>
      </section>
    </motion.div>
  );

  const renderAnalytics = () => (
    <motion.div
      key="analytics"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.24 }}
      className="page-stack"
    >
      <section className="panel">
        <SectionTitle
          icon={<SlidersHorizontal size={18} />}
          title="Analytics Controls"
          subtitle="Use filters to explore the business and weather side by side"
        />

        <div className="control-grid">
          <div className="control-item">
            <label>Search</label>
            <div className="input-wrap">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city, crop, or alert..."
              />
            </div>
          </div>

          <div className="control-item">
            <label>City</label>
            <select value={activeCity} onChange={(e) => setActiveCity(e.target.value)}>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className="control-item">
            <label>Risk</label>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="control-item">
            <label>Demand</label>
            <select value={demandFilter} onChange={(e) => setDemandFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="control-item">
            <label>Sort</label>
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
              <option value="profit">Profit</option>
              <option value="confidence">Confidence</option>
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
            </select>
          </div>

          <div className="control-actions">
            <button className="btn btn-secondary" onClick={fetchData}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()}>
              <Printer size={16} /> Save / Print
            </button>
          </div>
        </div>
      </section>

      <section className="chart-grid">
        <div className="panel chart-panel">
          <SectionTitle
            icon={<BarChart3 size={18} />}
            title="Profit by city"
            subtitle="Average profit from the current live sample"
          />
          {profitChartData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={profitChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="city" stroke="#a5b4fc" />
                <YAxis stroke="#a5b4fc" />
                <Tooltip />
                <Bar dataKey="profit" radius={[12, 12, 0, 0]}>
                  {profitChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index % 2 === 0 ? "#7c3aed" : "#06b6d4"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={<BarChart3 size={20} />}
              title="No chart data yet"
              text="Send more records through Kafka to build analytics."
            />
          )}
        </div>

        <div className="panel chart-panel">
          <SectionTitle
            icon={<LineChartIcon size={18} />}
            title={`Temp & humidity trend${activeCity !== "All Cities" ? ` for ${activeCity}` : ""}`}
            subtitle="Most recent records from the live stream"
          />
          {trendData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" stroke="#a5b4fc" />
                <YAxis stroke="#a5b4fc" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#f59e0b"
                  isAnimationActive={true}
                  animationDuration={800}
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={<LineChartIcon size={20} />}
              title="Trend chart will appear here"
              text="Filter a city or wait for a few live messages."
            />
          )}
        </div>

        <div className="panel chart-panel">
          <SectionTitle
            icon={<Layers3 size={18} />}
            title="Risk distribution"
            subtitle="How risk is spread across the filtered dataset"
          />
          {riskDistribution.some((item) => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={4}
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`slice-${index}`} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={<Layers3 size={20} />}
              title="No risk data"
              text="Once records arrive, the risk split will be shown here."
            />
          )}
        </div>
      </section>
    </motion.div>
  );

  const renderDecisions = () => (
    <motion.div
      key="decisions"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.24 }}
      className="page-stack"
    >
      <section className="panel-grid">
        <div className="panel panel-large">
          <SectionTitle
            icon={<Target size={18} />}
            title="Decision panel"
            subtitle="Pick a city and see the best action instantly"
          />

          <div className="decision-top">
            <div className="control-item">
              <label>Choose city</label>
              <select value={activeCity} onChange={(e) => setActiveCity(e.target.value)}>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-item">
              <label>Budget focus</label>
              <select defaultValue="Medium">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            <div className="control-item">
              <label>Risk appetite</label>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                <option value="All">All</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          {bestOpportunity ? (
            <div className="decision-card">
              <div className="decision-head">
                <div>
                  <p className="decision-kicker">Recommended action</p>
                  <h3>
                    Grow <span>{bestOpportunity.prediction || "—"}</span> in{" "}
                    <span>{bestOpportunity.city || "—"}</span>
                  </h3>
                </div>
                <div className="decision-score">
                  <strong>{Number(bestOpportunity.confidence || 0)}%</strong>
                  <span>confidence</span>
                </div>
              </div>

              <div className="decision-meta">
                <span className="decision-pill success">
                  <CircleDollarSign size={14} /> Profit ${formatMoney(bestOpportunity.profit)}
                </span>
                <span className="decision-pill">
                  <TrendingUp size={14} /> Demand {bestOpportunity.demand || "—"}
                </span>
                <span className={`decision-pill ${normalizeRisk(bestOpportunity.risk) === "High" ? "danger" : "success"}`}>
                  <ShieldAlert size={14} /> {bestOpportunity.risk || "—"} risk
                </span>
              </div>

              <div className="recommendation-why">
                <h4>Why this is the current winner</h4>
                <ul>
                  {recommendationReasons.map((reason, idx) => (
                    <li key={idx}>
                      <Zap size={14} />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Target size={20} />}
              title="No recommendation yet"
              text="Start Kafka and keep the producer running so the system can decide."
            />
          )}
        </div>

        <div className="panel panel-side">
          <SectionTitle
            icon={<Flame size={18} />}
            title="Executive summary"
            subtitle="A plain-English answer for non-technical users"
          />

          <div className="executive-card">
            <p className="executive-label">What should I do now?</p>
            <h3>{insightText}</h3>
          </div>

          <div className="mini-report">
            <div className="mini-report-item">
              <strong>{bestCity?.city || "—"}</strong>
              <span>Best city</span>
            </div>
            <div className="mini-report-item">
              <strong>{bestOpportunity?.prediction || "—"}</strong>
              <span>Best crop</span>
            </div>
            <div className="mini-report-item">
              <strong>{formatMoney(bestOpportunity?.profit || 0)}</strong>
              <span>Profit estimate</span>
            </div>
            <div className="mini-report-item">
              <strong>{normalizeRisk(bestOpportunity?.risk)}</strong>
              <span>Risk level</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionTitle
          icon={<LayoutDashboard size={18} />}
          title="Live record table"
          subtitle="Search, sort, and compare every city in one view"
        />

        {sortedData.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>City</th>
                  <th>Temp</th>
                  <th>Humidity</th>
                  <th>Crop</th>
                  <th>Confidence</th>
                  <th>Profit</th>
                  <th>Demand</th>
                  <th>Risk</th>
                  <th>Alert</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, idx) => (
                  <tr key={`${row.city}-${idx}`}>
                    <td>
                      <div className="city-cell">
                        <MapPin size={14} />
                        <span>{row.city || "Unknown"}</span>
                      </div>
                    </td>
                    <td>{Number(row.temp || 0)}°C</td>
                    <td>{Number(row.humidity || 0)}%</td>
                    <td>{row.prediction || "—"}</td>
                    <td>{Number(row.confidence || 0)}%</td>
                    <td>${formatMoney(row.profit)}</td>
                    <td>
                      <span className={`tiny-badge demand-${normalizeDemand(row.demand).toLowerCase()}`}>
                        {row.demand || "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`tiny-badge risk-${normalizeRisk(row.risk).toLowerCase()}`}>
                        {row.risk || "—"}
                      </span>
                    </td>
                    <td className="alert-cell">{row.alert || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<LayoutDashboard size={20} />}
            title="No rows match the current filters"
            text="Clear filters to reveal the live records again."
          />
        )}
      </section>
    </motion.div>
  );

  const content = () => {
    if (view === "analytics") return renderAnalytics();
    if (view === "decisions") return renderDecisions();
    return renderOverview();
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <h2>Agri AI</h2>
            <p>Decision Intelligence</p>
          </div>
        </div>

        <div className="sidebar-nav">
          <button className={`nav-btn ${view === "overview" ? "active" : ""}`} onClick={() => setView("overview")}>
            <LayoutDashboard size={16} />
            Overview
          </button>
          <button className={`nav-btn ${view === "analytics" ? "active" : ""}`} onClick={() => setView("analytics")}>
            <BarChart3 size={16} />
            Analytics
          </button>
          <button className={`nav-btn ${view === "decisions" ? "active" : ""}`} onClick={() => setView("decisions")}>
            <Target size={16} />
            Decisions
          </button>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-label">System status</p>
          <div className={`sidebar-status ${live ? "live" : "paused"}`}>
            {live ? <Activity size={14} /> : <Pause size={14} />}
            {live ? "Live" : "Paused"}
          </div>
          <p className="sidebar-note">Updates every 3 seconds when live mode is enabled.</p>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-label">Quick stats</p>
          <div className="sidebar-mini">
            <span>Records</span>
            <strong>{data.length}</strong>
          </div>
          <div className="sidebar-mini">
            <span>Alerts</span>
            <strong>{alertCount}</strong>
          </div>
          <div className="sidebar-mini">
            <span>Updated</span>
            <strong>{lastUpdated}</strong>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-title">
              <h1>Agri Intelligence Dashboard</h1>
              <p>Weather → AI prediction → business decisions</p>
            </div>

            <div className="topbar-badges">
              <span className={`top-chip ${live ? "live" : "paused"}`}>
                {live ? <Activity size={14} /> : <Pause size={14} />}
                {live ? "Streaming" : "Paused"}
              </span>
              <span className="top-chip">
                <MapPin size={14} />
                {liveCount} cities
              </span>
              <span className="top-chip">
                <AlertTriangle size={14} />
                {alertCount} alerts
              </span>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="search-wrap">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city, crop, alert..."
              />
            </div>

            <button className="btn btn-secondary" onClick={() => setLive((prev) => !prev)}>
              {live ? <Pause size={16} /> : <Play size={16} />}
              {live ? "Pause" : "Resume"}
            </button>

            <button className="btn btn-secondary" onClick={fetchData}>
              <RefreshCw size={16} />
              Refresh
            </button>

            <button className="btn btn-ghost" onClick={() => window.print()}>
              <Printer size={16} />
              Export
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">{content()}</AnimatePresence>
      </main>
    </div>
  );
}

function MetricCard({ icon, title, value, helper, accent }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className={`metric-card metric-${accent}`}
    >
      <div className="metric-icon">{icon}</div>
      <div>
        <p className="metric-title">{title}</p>
        <h3 className="metric-value">{value}</h3>
        <span className="metric-helper">{helper}</span>
      </div>
    </motion.div>
  );
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="section-title">
      <div className="section-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function StepCard({ index, title, text }) {
  return (
    <div className="step-card">
      <div className="step-index">{index}</div>
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}

function MiniInfo({ label, value, icon }) {
  return (
    <div className="mini-info">
      <div className="mini-info-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}

export default App;