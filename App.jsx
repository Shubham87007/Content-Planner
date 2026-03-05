import { useState, useEffect, useRef } from "react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const POST_TYPES = ["Reel","Carousel","Static Post","Story","TikTok Video","Collab Post","UGC Repost"];
const PLATFORMS = ["Instagram","TikTok","Both"];
const PILLARS = ["Brand Awareness","Product Promo","Educational","Entertainment","Community","Behind the Scenes","Testimonial"];

const today = new Date();
const START_MONTH = today.getMonth();
const START_YEAR = today.getFullYear();

function getThreeMonths() {
  return [0, 1, 2].map(i => {
    const m = (START_MONTH + i) % 12;
    const y = START_YEAR + Math.floor((START_MONTH + i) / 12);
    return { month: m, year: y, label: `${MONTHS[m]} ${y}` };
  });
}

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

const PILLAR_COLORS = {
  "Brand Awareness": "#6366f1",
  "Product Promo": "#f59e0b",
  "Educational": "#10b981",
  "Entertainment": "#ec4899",
  "Community": "#3b82f6",
  "Behind the Scenes": "#8b5cf6",
  "Testimonial": "#14b8a6",
};

const PLATFORM_ICONS = {
  Instagram: "📸",
  TikTok: "🎵",
  Both: "✨",
};

let postIdCounter = 1;

function generateId() {
  return `post_${postIdCounter++}_${Math.random().toString(36).slice(2,7)}`;
}

async function callClaude(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  return data.content?.map(b => b.text || "").join("") || "";
}

export default function App() {
  const [view, setView] = useState("calendar"); // calendar | list | analytics
  const [posts, setPosts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [activeMonth, setActiveMonth] = useState(0);
  const [clientName, setClientName] = useState("Client Name");
  const [editingClient, setEditingClient] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiField, setAiField] = useState(null);
  const [filterPlatform, setFilterPlatform] = useState("All");
  const [filterPillar, setFilterPillar] = useState("All");
  const months = getThreeMonths();

  const openNew = (day, monthIdx) => {
    const m = months[monthIdx];
    setEditingPost({
      id: generateId(),
      date: `${m.year}-${String(m.month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`,
      platform: "Instagram",
      postType: "Reel",
      pillar: "Brand Awareness",
      idea: "",
      caption: "",
      hashtags: "",
      notes: "",
      status: "Planned",
      isNew: true,
    });
    setModalOpen(true);
  };

  const openEdit = (post) => {
    setEditingPost({ ...post, isNew: false });
    setModalOpen(true);
  };

  const savePost = () => {
    if (!editingPost.idea.trim()) return;
    setPosts(prev =>
      editingPost.isNew
        ? [...prev, { ...editingPost }]
        : prev.map(p => p.id === editingPost.id ? { ...editingPost } : p)
    );
    setModalOpen(false);
    setEditingPost(null);
  };

  const deletePost = (id) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    setModalOpen(false);
    setEditingPost(null);
  };

  const generateAI = async (field) => {
    setAiLoading(true);
    setAiField(field);
    try {
      let prompt = "";
      if (field === "idea") {
        prompt = `Generate a creative and engaging ${editingPost.postType} idea for ${editingPost.platform} in the content pillar: "${editingPost.pillar}" for a US-based brand. The post is for ${editingPost.date}. Give just a 2-3 sentence post concept/idea, no preamble.`;
      } else if (field === "caption") {
        prompt = `Write a compelling ${editingPost.platform} caption for this post idea: "${editingPost.idea}". Keep it punchy, US audience, ${editingPost.postType} format. Include 1-2 emojis. No preamble, just the caption.`;
      } else if (field === "hashtags") {
        prompt = `Generate 10-15 relevant Instagram/TikTok hashtags for this post: "${editingPost.idea}" in the "${editingPost.pillar}" content pillar for a US brand. Return only the hashtags separated by spaces, no explanation.`;
      }
      const result = await callClaude(prompt);
      setEditingPost(prev => ({ ...prev, [field]: result.trim() }));
    } catch (e) {
      console.error(e);
    }
    setAiLoading(false);
    setAiField(null);
  };

  const generateBulkIdeas = async () => {
    setAiLoading(true);
    setAiField("bulk");
    try {
      const m = months[activeMonth];
      const prompt = `You are a PR content strategist for a US-based brand. Generate a 4-week content plan for ${m.label} for Instagram and TikTok. Create exactly 8 post ideas spread across the month. Return ONLY a valid JSON array, no markdown, no backticks, no explanation. Format: [{"day": <number>, "platform": "Instagram" or "TikTok" or "Both", "postType": <one of: Reel, Carousel, Static Post, Story, TikTok Video>, "pillar": <one of: Brand Awareness, Product Promo, Educational, Entertainment, Community, Behind the Scenes, Testimonial>, "idea": "<2-sentence idea>", "caption": "<short punchy caption>", "hashtags": "<10 hashtags>"}]`;
      const result = await callClaude(prompt);
      const clean = result.replace(/```json|```/g, "").trim();
      const ideas = JSON.parse(clean);
      const newPosts = ideas.map(idea => ({
        id: generateId(),
        date: `${m.year}-${String(m.month + 1).padStart(2,"0")}-${String(idea.day).padStart(2,"0")}`,
        platform: idea.platform,
        postType: idea.postType,
        pillar: idea.pillar,
        idea: idea.idea,
        caption: idea.caption,
        hashtags: idea.hashtags,
        notes: "",
        status: "Planned",
      }));
      setPosts(prev => [...prev, ...newPosts]);
    } catch (e) {
      console.error(e);
    }
    setAiLoading(false);
    setAiField(null);
  };

  const filteredPosts = posts.filter(p => {
    if (filterPlatform !== "All" && p.platform !== filterPlatform) return false;
    if (filterPillar !== "All" && p.pillar !== filterPillar) return false;
    return true;
  });

  const postsForMonth = (monthIdx) => {
    const m = months[monthIdx];
    const prefix = `${m.year}-${String(m.month + 1).padStart(2,"0")}`;
    return filteredPosts.filter(p => p.date.startsWith(prefix));
  };

  const postsForDay = (day, monthIdx) => {
    const m = months[monthIdx];
    const dateStr = `${m.year}-${String(m.month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return filteredPosts.filter(p => p.date === dateStr);
  };

  // Analytics
  const totalPosts = posts.length;
  const byPlatform = PLATFORMS.reduce((acc, p) => { acc[p] = posts.filter(x => x.platform === p).length; return acc; }, {});
  const byPillar = PILLARS.reduce((acc, p) => { acc[p] = posts.filter(x => x.pillar === p).length; return acc; }, {});
  const byStatus = ["Planned","In Progress","Ready","Published"].reduce((acc, s) => { acc[s] = posts.filter(x => x.status === s).length; return acc; }, {});

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: "#f8f7f4", minHeight: "100vh", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e4df", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "#1a1a1a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 14 }}>✦</span>
            </div>
            {editingClient ? (
              <input
                autoFocus
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                onBlur={() => setEditingClient(false)}
                onKeyDown={e => e.key === "Enter" && setEditingClient(false)}
                style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, border: "none", borderBottom: "2px solid #1a1a1a", outline: "none", background: "transparent", width: 180 }}
              />
            ) : (
              <span
                onClick={() => setEditingClient(true)}
                style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, cursor: "pointer", borderBottom: "2px solid transparent" }}
                title="Click to edit client name"
              >
                {clientName}
              </span>
            )}
          </div>
          <span style={{ color: "#aaa", fontSize: 12 }}>|</span>
          <span style={{ fontSize: 12, color: "#888", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {months[0].label} — {months[2].label}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["calendar", "list", "analytics"].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                background: view === v ? "#1a1a1a" : "transparent",
                color: view === v ? "#fff" : "#888",
                transition: "all 0.15s",
              }}
            >
              {v === "calendar" ? "📅 Calendar" : v === "list" ? "📋 List" : "📊 Analytics"}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e4df", padding: "10px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Filter:</span>
        {["All", ...PLATFORMS].map(p => (
          <button key={p} onClick={() => setFilterPlatform(p)} style={{ padding: "4px 12px", borderRadius: 20, border: "1.5px solid", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, transition: "all 0.15s", borderColor: filterPlatform === p ? "#1a1a1a" : "#e8e4df", background: filterPlatform === p ? "#1a1a1a" : "#fff", color: filterPlatform === p ? "#fff" : "#555" }}>
            {p === "All" ? "All Platforms" : `${PLATFORM_ICONS[p]} ${p}`}
          </button>
        ))}
        <div style={{ width: 1, height: 18, background: "#e8e4df", margin: "0 4px" }} />
        {["All", ...PILLARS].map(p => (
          <button key={p} onClick={() => setFilterPillar(p)} style={{ padding: "4px 12px", borderRadius: 20, border: "1.5px solid", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, transition: "all 0.15s", borderColor: filterPillar === p ? (PILLAR_COLORS[p] || "#1a1a1a") : "#e8e4df", background: filterPillar === p ? (PILLAR_COLORS[p] || "#1a1a1a") : "#fff", color: filterPillar === p ? "#fff" : "#555" }}>
            {p === "All" ? "All Pillars" : p}
          </button>
        ))}
      </div>

      <div style={{ padding: 32 }}>

        {/* CALENDAR VIEW */}
        {view === "calendar" && (
          <div>
            {/* Month Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {months.map((m, i) => (
                <button key={i} onClick={() => setActiveMonth(i)} style={{ padding: "10px 24px", borderRadius: 8, border: "1.5px solid", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, transition: "all 0.15s", borderColor: activeMonth === i ? "#1a1a1a" : "#e8e4df", background: activeMonth === i ? "#1a1a1a" : "#fff", color: activeMonth === i ? "#fff" : "#555" }}>
                  {m.label}
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, opacity: 0.7 }}>
                    {postsForMonth(i).length} posts
                  </span>
                </button>
              ))}
              <button
                onClick={generateBulkIdeas}
                disabled={aiLoading}
                style={{ marginLeft: "auto", padding: "10px 20px", borderRadius: 8, border: "none", cursor: aiLoading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: aiLoading && aiField === "bulk" ? "#ddd" : "#f0f0f0", color: "#1a1a1a", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
              >
                {aiLoading && aiField === "bulk" ? "✦ Generating..." : "✦ AI Fill Month"}
              </button>
              <button
                onClick={() => openNew(1, activeMonth)}
                style={{ padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: "#1a1a1a", color: "#fff" }}
              >
                + Add Post
              </button>
            </div>

            {/* Calendar Grid */}
            {(() => {
              const m = months[activeMonth];
              const days = getDaysInMonth(m.month, m.year);
              const firstDay = new Date(m.year, m.month, 1).getDay();
              const cells = [];
              for (let i = 0; i < firstDay; i++) cells.push(null);
              for (let d = 1; d <= days; d++) cells.push(d);

              return (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                      <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#aaa", padding: "8px 0", letterSpacing: "0.08em", textTransform: "uppercase" }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                    {cells.map((day, idx) => {
                      const dayPosts = day ? postsForDay(day, activeMonth) : [];
                      const isToday = day && m.month === today.getMonth() && m.year === today.getFullYear() && day === today.getDate();
                      return (
                        <div
                          key={idx}
                          onClick={() => day && openNew(day, activeMonth)}
                          style={{
                            minHeight: 110, background: day ? "#fff" : "#f8f7f4", border: `1.5px solid ${isToday ? "#1a1a1a" : "#e8e4df"}`, borderRadius: 8, padding: 8, cursor: day ? "pointer" : "default", transition: "border-color 0.15s", position: "relative",
                          }}
                          onMouseEnter={e => day && (e.currentTarget.style.borderColor = "#aaa")}
                          onMouseLeave={e => day && (e.currentTarget.style.borderColor = isToday ? "#1a1a1a" : "#e8e4df")}
                        >
                          {day && (
                            <>
                              <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? "#fff" : "#555", background: isToday ? "#1a1a1a" : "transparent", width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>{day}</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {dayPosts.slice(0, 3).map(post => (
                                  <div
                                    key={post.id}
                                    onClick={e => { e.stopPropagation(); openEdit(post); }}
                                    style={{ fontSize: 10, padding: "3px 6px", borderRadius: 4, background: PILLAR_COLORS[post.pillar] + "18", borderLeft: `3px solid ${PILLAR_COLORS[post.pillar]}`, color: "#333", cursor: "pointer", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontWeight: 500 }}
                                    title={post.idea}
                                  >
                                    {PLATFORM_ICONS[post.platform]} {post.idea.slice(0, 30)}…
                                  </div>
                                ))}
                                {dayPosts.length > 3 && <div style={{ fontSize: 10, color: "#aaa", paddingLeft: 4 }}>+{dayPosts.length - 3} more</div>}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* LIST VIEW */}
        {view === "list" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, fontWeight: 400, margin: 0 }}>All Posts <span style={{ fontSize: 14, fontWeight: 400, color: "#aaa", fontFamily: "inherit" }}>({filteredPosts.length})</span></h2>
              <button onClick={() => openNew(today.getDate(), 0)} style={{ padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: "#1a1a1a", color: "#fff" }}>+ Add Post</button>
            </div>

            {months.map((m, mi) => {
              const mp = postsForMonth(mi).sort((a, b) => a.date.localeCompare(b.date));
              if (!mp.length) return null;
              return (
                <div key={mi} style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>{m.label}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {mp.map(post => (
                      <div
                        key={post.id}
                        onClick={() => openEdit(post)}
                        style={{ background: "#fff", border: "1.5px solid #e8e4df", borderRadius: 10, padding: "14px 18px", cursor: "pointer", display: "grid", gridTemplateColumns: "90px 80px 1fr 120px 100px", alignItems: "center", gap: 16, transition: "border-color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "#aaa"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "#e8e4df"}
                      >
                        <div style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>{new Date(post.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{PLATFORM_ICONS[post.platform]} {post.platform}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{post.idea.slice(0, 80)}{post.idea.length > 80 ? "…" : ""}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{post.postType}</div>
                        </div>
                        <div style={{ display: "inline-flex", alignItems: "center" }}>
                          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: PILLAR_COLORS[post.pillar] + "18", color: PILLAR_COLORS[post.pillar], fontWeight: 600, whiteSpace: "nowrap" }}>{post.pillar}</span>
                        </div>
                        <div>
                          <StatusBadge status={post.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredPosts.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
                <div style={{ fontSize: 15 }}>No posts yet. Add your first post or use AI Fill Month.</div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS VIEW */}
        {view === "analytics" && (
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, fontWeight: 400, marginBottom: 24, marginTop: 0 }}>Content Overview</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Total Posts", value: totalPosts },
                { label: "Instagram", value: byPlatform["Instagram"] },
                { label: "TikTok", value: byPlatform["TikTok"] },
                { label: "Both Platforms", value: byPlatform["Both"] },
              ].map(stat => (
                <div key={stat.label} style={{ background: "#fff", border: "1.5px solid #e8e4df", borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ fontSize: 32, fontFamily: "'DM Serif Display', serif", fontWeight: 400, marginBottom: 4 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* By Pillar */}
              <div style={{ background: "#fff", border: "1.5px solid #e8e4df", borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>By Content Pillar</div>
                {PILLARS.map(p => (
                  <div key={p} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{p}</span>
                      <span style={{ fontSize: 13, color: "#888" }}>{byPillar[p]}</span>
                    </div>
                    <div style={{ height: 6, background: "#f0ede8", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: totalPosts ? `${(byPillar[p] / totalPosts) * 100}%` : "0%", background: PILLAR_COLORS[p], borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* By Status */}
              <div style={{ background: "#fff", border: "1.5px solid #e8e4df", borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>By Status</div>
                {["Planned","In Progress","Ready","Published"].map(s => {
                  const colors = { "Planned": "#94a3b8", "In Progress": "#f59e0b", "Ready": "#6366f1", "Published": "#10b981" };
                  return (
                    <div key={s} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{s}</span>
                        <span style={{ fontSize: 13, color: "#888" }}>{byStatus[s]}</span>
                      </div>
                      <div style={{ height: 6, background: "#f0ede8", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: totalPosts ? `${(byStatus[s] / totalPosts) * 100}%` : "0%", background: colors[s], borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f0ede8" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>By Month</div>
                  {months.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13 }}>{m.label}</span>
                      <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>{postsForMonth(i).length} posts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {modalOpen && editingPost && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #e8e4df", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 400 }}>{editingPost.isNew ? "New Post" : "Edit Post"}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#aaa", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="Date">
                  <input type="date" value={editingPost.date} onChange={e => setEditingPost(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Platform">
                  <select value={editingPost.platform} onChange={e => setEditingPost(p => ({ ...p, platform: e.target.value }))} style={inputStyle}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Post Type">
                  <select value={editingPost.postType} onChange={e => setEditingPost(p => ({ ...p, postType: e.target.value }))} style={inputStyle}>
                    {POST_TYPES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </Field>
              </div>

              {/* Row 2 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Content Pillar">
                  <select value={editingPost.pillar} onChange={e => setEditingPost(p => ({ ...p, pillar: e.target.value }))} style={{ ...inputStyle, borderLeftColor: PILLAR_COLORS[editingPost.pillar], borderLeftWidth: 3 }}>
                    {PILLARS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={editingPost.status} onChange={e => setEditingPost(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                    {["Planned","In Progress","Ready","Published"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              {/* Idea */}
              <Field label="Post Idea">
                <div style={{ position: "relative" }}>
                  <textarea value={editingPost.idea} onChange={e => setEditingPost(p => ({ ...p, idea: e.target.value }))} rows={3} placeholder="Describe the post concept..." style={{ ...inputStyle, resize: "vertical", paddingRight: 110 }} />
                  <AIButton onClick={() => generateAI("idea")} loading={aiLoading && aiField === "idea"} style={{ position: "absolute", top: 8, right: 8 }} />
                </div>
              </Field>

              {/* Caption */}
              <Field label="Caption">
                <div style={{ position: "relative" }}>
                  <textarea value={editingPost.caption} onChange={e => setEditingPost(p => ({ ...p, caption: e.target.value }))} rows={3} placeholder="Write the caption..." style={{ ...inputStyle, resize: "vertical", paddingRight: 110 }} />
                  <AIButton onClick={() => generateAI("caption")} loading={aiLoading && aiField === "caption"} style={{ position: "absolute", top: 8, right: 8 }} />
                </div>
              </Field>

              {/* Hashtags */}
              <Field label="Hashtags">
                <div style={{ position: "relative" }}>
                  <input value={editingPost.hashtags} onChange={e => setEditingPost(p => ({ ...p, hashtags: e.target.value }))} placeholder="#brand #content..." style={{ ...inputStyle, paddingRight: 110 }} />
                  <AIButton onClick={() => generateAI("hashtags")} loading={aiLoading && aiField === "hashtags"} style={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)" }} />
                </div>
              </Field>

              {/* Notes */}
              <Field label="Notes">
                <textarea value={editingPost.notes} onChange={e => setEditingPost(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Internal notes, references, assets needed..." style={{ ...inputStyle, resize: "vertical" }} />
              </Field>
            </div>

            <div style={{ padding: "16px 28px", borderTop: "1px solid #e8e4df", display: "flex", justifyContent: "space-between", gap: 12 }}>
              {!editingPost.isNew && (
                <button onClick={() => deletePost(editingPost.id)} style={{ padding: "10px 18px", borderRadius: 8, border: "1.5px solid #fecaca", background: "#fff5f5", color: "#ef4444", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}>Delete</button>
              )}
              <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                <button onClick={() => setModalOpen(false)} style={{ padding: "10px 18px", borderRadius: 8, border: "1.5px solid #e8e4df", background: "#fff", color: "#555", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}>Cancel</button>
                <button onClick={savePost} disabled={!editingPost.idea.trim()} style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: editingPost.idea.trim() ? "#1a1a1a" : "#ccc", color: "#fff", cursor: editingPost.idea.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>Save Post</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function AIButton({ onClick, loading, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{ padding: "5px 10px", borderRadius: 6, border: "1.5px solid #e8e4df", background: loading ? "#f5f5f5" : "#fafafa", color: loading ? "#aaa" : "#555", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", ...style }}
    >
      {loading ? "✦ …" : "✦ AI"}
    </button>
  );
}

function StatusBadge({ status }) {
  const colors = { "Planned": "#94a3b8", "In Progress": "#f59e0b", "Ready": "#6366f1", "Published": "#10b981" };
  return (
    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: colors[status] + "18", color: colors[status], fontWeight: 600 }}>{status}</span>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e8e4df", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", background: "#fff", color: "#1a1a1a",
};
