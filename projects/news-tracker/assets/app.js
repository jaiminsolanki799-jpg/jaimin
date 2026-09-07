/* News tracker dashboard logic. Shared by every dashboard page.
   The page tells us which data file to load via <body data-feed="../data/x.json">.
   Read / bookmark / last-visit state lives in this browser's localStorage only. */

(function () {
  "use strict";

  var body = document.body;
  var FEED = body.getAttribute("data-feed");
  var KEY = body.getAttribute("data-key") || "news";
  var PAGE_SIZE = 25;

  var state = {
    data: null,
    items: [],
    query: "",
    range: "3",           // "1" | "3" | "7" | "all" (days)
    group: null,          // selected publication (source group)
    desk: false,          // Valuation desk tab: only stories with a valuation score
    source: null,         // selected source name
    topic: null,          // selected topic name
    category: null,       // selected category (section)
    unreadOnly: false,
    bookmarksOnly: false,
    shown: PAGE_SIZE,
    read: loadSet("read"),
    expanded: new Set(),
    bookmarks: loadSet("bookmarks"),
    savedItems: loadObject("savedItems"),   // id -> story snapshot, so saved stories outlive the feed
    savedTab: false,
    lastVisit: loadValue("lastVisit"),
  };

  // ---------- localStorage helpers (always wrapped: iOS private mode throws) ----------
  function loadSet(name) {
    try { return new Set(JSON.parse(localStorage.getItem(KEY + ":" + name) || "[]")); }
    catch (e) { return new Set(); }
  }
  function saveSet(name, set) {
    try { localStorage.setItem(KEY + ":" + name, JSON.stringify(Array.from(set))); } catch (e) {}
  }
  function loadObject(name) {
    try { return JSON.parse(localStorage.getItem(KEY + ":" + name) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveObject(name, obj) {
    try { localStorage.setItem(KEY + ":" + name, JSON.stringify(obj)); } catch (e) {}
  }
  function snapshot(item) {
    return { id: item.id, title: item.title, link: item.link, summary: item.summary || "", published: item.published,
             source: item.source, group: item.group || item.source, category: item.category, publisher: item.publisher || null,
             topics: item.topics || [], valuation_score: item.valuation_score || 0, valuation_signals: item.valuation_signals || [],
             first_seen: item.first_seen, saved_at: new Date().toISOString() };
  }
  function toggleSaved(item) {
    if (state.bookmarks.has(item.id)) {
      state.bookmarks.delete(item.id); delete state.savedItems[item.id];
    } else {
      state.bookmarks.add(item.id); state.savedItems[item.id] = snapshot(item);
    }
    saveSet("bookmarks", state.bookmarks); saveObject("savedItems", state.savedItems);
    toast(state.bookmarks.has(item.id) ? "★ Saved to read later" : "Removed from saved");
  }
  function toast(text) {
    var el = $("toast"); if (!el) return;
    el.textContent = text; el.hidden = false; el.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove("show"); el.hidden = true; }, 1400);
  }
  // ---------- Ask AI ----------
  var AI_TASKS = {
    summary: { label: "Summarise", text: "Summarise this news story in 5 short bullet points for a chartered accountant. Then list the key numbers mentioned (amounts, percentages, dates) exactly as reported, without rounding." },
    valuation: { label: "Valuation angle", text: "You are assisting a valuation analyst at a chartered accountancy firm in India. Explain what this news means for valuation: which companies or sectors are affected, the implied valuation or deal multiples if any, effects on DCF inputs (growth, margins, discount rate), and comparable transactions to look at. Be precise with numbers and flag anything that needs verification." },
    research: { label: "Research further", text: "Research this news story further. Find the primary sources (regulatory filings, press releases, exchange disclosures, court or NCLT orders), the background of the companies involved, related recent developments, and what to watch next. Cite each source with a link. Note clearly where information is unverified." }
  };
  var AI_ASSISTANTS = {
    claude:     { label: "Claude",     open: function (p) { window.open("https://claude.ai/new?q=" + encodeURIComponent(p), "_blank", "noopener"); } },
    gemini:     { label: "Gemini",     open: function (p) { copyText(p); window.open("https://gemini.google.com/app", "_blank", "noopener"); toast("Prompt copied — paste it into Gemini"); } },
    chatgpt:    { label: "ChatGPT",    open: function (p) { window.open("https://chatgpt.com/?q=" + encodeURIComponent(p), "_blank", "noopener"); } },
    perplexity: { label: "Perplexity", open: function (p) { window.open("https://www.perplexity.ai/search?q=" + encodeURIComponent(p), "_blank", "noopener"); } }
  };
  var ai = { item: null, task: "summary" };
  function copyText(text) {
    try { if (navigator.clipboard) navigator.clipboard.writeText(text); } catch (e) {}
  }
  function aiPrompt(item, task) {
    var lines = [AI_TASKS[task].text, "", "Headline: " + item.title,
      "Source: " + (item.publisher || item.source) + (item.published ? " (" + fullDate(item.published) + ")" : ""),
      "Link: " + item.link];
    if (item.summary) lines.push("Summary from the feed: " + item.summary);
    lines.push("", "If you can open the link, read the full article first.");
    return lines.join("\n");
  }
  function openAiSheet(item) {
    ai.item = item;
    $("ai-title").textContent = item.title;
    renderAiSheet();
    $("ai-sheet").hidden = false;
    document.body.classList.add("sheet-open");
  }
  function closeAiSheet() {
    $("ai-sheet").hidden = true;
    document.body.classList.remove("sheet-open");
  }
  function renderAiSheet() {
    $("ai-tasks").innerHTML = Object.keys(AI_TASKS).map(function (k) {
      return '<button class="chip" data-ai-task="' + k + '" aria-pressed="' + (ai.task === k) + '">' + AI_TASKS[k].label + "</button>";
    }).join("");
    $("ai-preview").textContent = aiPrompt(ai.item, ai.task);
  }
  function loadValue(name) {
    try { return localStorage.getItem(KEY + ":" + name); } catch (e) { return null; }
  }
  function saveValue(name, v) {
    try { localStorage.setItem(KEY + ":" + name, v); } catch (e) {}
  }

  // ---------- formatting ----------
  function highlight(text) {
    var safe = esc(text);
    if (!state.query) return safe;
    var terms = state.query.split(/\s+/).filter(Boolean).map(function (t) {
      return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
    if (!terms.length) return safe;
    return safe.replace(new RegExp("(" + terms.join("|") + ")", "ig"), "<mark>$1</mark>");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function ago(iso) {
    if (!iso) return "";
    var ms = Date.now() - new Date(iso).getTime();
    if (isNaN(ms)) return "";
    var m = Math.round(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    var h = Math.round(m / 60);
    if (h < 24) return h + " hr ago";
    var d = Math.round(h / 24);
    if (d < 8) return d + " day" + (d === 1 ? "" : "s") + " ago";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  function fullDate(iso) {
    try {
      return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return iso; }
  }
  function $(id) { return document.getElementById(id); }

  // ---------- filtering ----------
  function withinRange(item) {
    if (state.range === "all") return true;
    var days = Number(state.range);
    return Date.now() - new Date(item.published).getTime() <= days * 86400000;
  }
  function pool() {
    var seen = {};
    state.items.forEach(function (i) { seen[i.id] = true; });
    var extra = Object.keys(state.savedItems).filter(function (id) { return !seen[id]; })
      .map(function (id) { return state.savedItems[id]; });
    return extra.length ? state.items.concat(extra) : state.items;
  }
  function matches(item) {
    if (state.savedTab) {
      if (!state.bookmarks.has(item.id)) return false;   // saved stories ignore the time range
    } else if (!withinRange(item)) return false;
    if (state.desk && (item.valuation_score || 0) < 3) return false;
    if (state.group && (item.group || item.source) !== state.group) return false;
    if (state.source && item.source !== state.source) return false;
    if (state.topic && (item.topics || []).indexOf(state.topic) === -1) return false;
    if (state.category && item.category !== state.category) return false;
    if (state.unreadOnly && state.read.has(item.id)) return false;
    if (state.bookmarksOnly && !state.bookmarks.has(item.id)) return false;
    if (state.savedTab && state.desk && (item.valuation_score || 0) < 3) return false;
    if (state.query) {
      var hay = (item.title + " " + (item.summary || "") + " " + item.source).toLowerCase();
      var terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) === -1) return false;
    }
    return true;
  }
  function isNew(item) {
    return state.lastVisit && item.first_seen && item.first_seen > state.lastVisit;
  }

  // ---------- rendering ----------
  function summaryLine(filtered) {
    var fresh = filtered.filter(isNew).length;
    var unread = filtered.filter(function (i) { return !state.read.has(i.id); }).length;
    var rangeLabel = state.savedTab ? "saved to read later" : { "1": "today", "3": "last 3 days", "7": "last 7 days", "all": "all kept" }[state.range];
    var parts = [filtered.length + (filtered.length === 1 ? " story" : " stories") + (state.desk ? " for valuation" : "") + " · " + rangeLabel];
    if (fresh) parts.push(fresh + " new for you");
    if (unread && unread !== filtered.length) parts.push(unread + " unread");
    return parts.join(" · ");
  }

  function renderBars(all) {
    var counts = {};
    all.forEach(function (i) { counts[i.source] = (counts[i.source] || 0) + 1; });
    var statusByName = {};
    (state.data.sources || []).forEach(function (s) { statusByName[s.name] = s; });
    var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    (state.data.sources || []).forEach(function (s) { if (!(s.name in counts)) names.push(s.name); });
    var max = Math.max.apply(null, names.map(function (n) { return counts[n] || 0; }).concat([1]));
    var html = "";
    names.forEach(function (n) {
      var c = counts[n] || 0;
      var st = statusByName[n];
      var err = st && !st.ok;
      var w = Math.max(0, Math.round((c / max) * 100));
      html += '<div class="name' + (err ? " err" : "") + '" title="' + esc(n) + (err ? " (feed failing, see Source status)" : "") + '">' + esc(n) + "</div>" +
        '<div class="track" title="' + esc(n) + ": " + c + ' stories"><div class="bar" style="width:' + w + '%"></div></div>' +
        '<div class="num">' + c + "</div>";
    });
    $("bars").innerHTML = html || '<div class="name">No data yet</div>';
  }

  function renderChips(all) {
    var srcCounts = {}, topicCounts = {}, catCounts = {}, groupCounts = {};
    all.forEach(function (i) {
      srcCounts[i.source] = (srcCounts[i.source] || 0) + 1;
      var g = i.group || i.source;
      groupCounts[g] = (groupCounts[g] || 0) + 1;
      if (i.category) catCounts[i.category] = (catCounts[i.category] || 0) + 1;
      (i.topics || []).forEach(function (t) { topicCounts[t] = (topicCounts[t] || 0) + 1; });
    });
    function chips(counts, selected, kind, allLabel) {
      var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
      var h = '<button class="chip" data-kind="' + kind + '" data-val="" aria-pressed="' + (!selected) + '">' + (allLabel || "All") + "</button>";
      names.forEach(function (n) {
        h += '<button class="chip" data-kind="' + kind + '" data-val="' + esc(n) + '" aria-pressed="' + (selected === n) + '">' +
          esc(n) + '<span class="n">' + counts[n] + "</span></button>";
      });
      return h;
    }
    var deskCount = all.filter(function (i) { return (i.valuation_score || 0) >= 3; }).length;
    var deskChip = '<button class="chip desk" data-kind="desk" data-val="desk" aria-pressed="' + state.desk + '">★ Valuation desk<span class="n">' + deskCount + "</span></button>";
    var groupHtml = chips(groupCounts, state.group, "group", "All").replace(
      'aria-pressed="' + (!state.group) + '">All', 'aria-pressed="' + (!state.group && !state.desk) + '">All');
    var savedChip = '<button class="chip saved" data-kind="savedTab" data-val="saved" aria-pressed="' + state.savedTab + '">★ Saved<span class="n">' + state.bookmarks.size + "</span></button>";
    var allEnd = groupHtml.indexOf("</button>") + "</button>".length;
    $("chips-group").innerHTML = groupHtml.slice(0, allEnd) + deskChip + savedChip + groupHtml.slice(allEnd);
    $("chips-group").hidden = false;
    $("chips-category").innerHTML = chips(catCounts, state.category, "category", "All sections");
    $("chips-category").hidden = Object.keys(catCounts).length < 2;
    $("chips-source").innerHTML = chips(srcCounts, state.source, "source");
    $("chips-topic").innerHTML = chips(topicCounts, state.topic, "topic");
  }

  function storyHTML(item) {
    var read = state.read.has(item.id);
    var marked = state.bookmarks.has(item.id);
    var tags = (item.valuation_signals || []).map(function (t) { return '<span class="tag sig">★ ' + esc(t) + "</span>"; }).join("") +
      (item.topics || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
    var why = state.desk && (item.valuation_signals || []).length ? item.valuation_signals.slice(0, 2).join(" · ") : null;
    var section = item.category || null;
    var byline = state.desk || (section && item.source.indexOf(section) !== -1) ? null : (item.publisher || item.source);
    var open = state.expanded.has(item.id);
    return '<li class="story' + (read ? " read" : "") + (isNew(item) ? " new" : "") + (open ? " open" : "") + '" data-id="' + esc(item.id) + '">' +
      '<div class="kicker">' +
      (section ? '<span class="sec">' + esc(section) + "</span><span>·</span>" : "") +
      (byline ? "<span>" + esc(byline) + "</span><span>·</span>" : "") +
      '<span title="' + esc(fullDate(item.published)) + '">' + esc(ago(item.published)) + "</span>" +
      (isNew(item) ? '<span class="new">New</span>' : "") +
      (why ? '<span class="why">★ ' + esc(why) + "</span>" : "") +
      '<button class="star" data-act="bookmark" aria-pressed="' + marked + '" aria-label="' + (marked ? "Remove from saved" : "Save to read later") + '" title="' + (marked ? "Saved" : "Save to read later") + '">' + (marked ? "★" : "☆") + "</button>" +
      "</div>" +
      '<h2><a href="' + esc(item.link) + '" target="_blank" rel="noopener" data-act="open">' + highlight(item.title) + "</a></h2>" +
      '<div class="detail">' +
      (item.summary ? "<p>" + highlight(item.summary) + "</p>" : "") +
      (tags ? '<div class="tags">' + tags + "</div>" : "") +
      '<div class="actions">' +
      '<button data-act="share">Share</button>' +
      '<button data-act="ai">✦ Ask AI</button>' +
      '<a class="open" href="' + esc(item.link) + '" target="_blank" rel="noopener" data-act="open">Read ↗</a>' +
      "</div></div></li>";
  }

  function renderList() {
    var filtered = pool().filter(matches);
    if (state.savedTab) {
      filtered.sort(function (a, b) {
        var sa = (state.savedItems[a.id] || {}).saved_at || "", sb = (state.savedItems[b.id] || {}).saved_at || "";
        return sa < sb ? 1 : sa > sb ? -1 : 0;
      });
    } else if (state.desk) {
      filtered.sort(function (a, b) {
        return (b.valuation_score || 0) - (a.valuation_score || 0) || (a.published < b.published ? 1 : -1);
      });
    }
    var slice = filtered.slice(0, state.shown);
    if (slice.length) state.expanded.add(slice[0].id);  // the lead story opens by default
    $("count").textContent = summaryLine(filtered);
    if (!filtered.length) {
      $("list").innerHTML = '<li class="empty">Nothing matches. ' +
        (state.items.length ? "Try clearing a filter." : "The data file is empty — run the fetcher once (see README).") + "</li>";
    } else {
      $("list").innerHTML = slice.map(storyHTML).join("");
    }
    $("more").hidden = filtered.length <= state.shown;
    $("more").textContent = "Show more (" + (filtered.length - state.shown) + " left)";
  }

  function renderStatus() {
    var srcs = state.data.sources || [];
    $("status").innerHTML = srcs.map(function (s) {
      return "<li><span class=\"dot " + (s.ok ? "ok" : "err") + '"></span><span>' + esc(s.name) +
        (s.ok ? "" : ' <span class="e">' + esc(s.error || "failed") + "</span>") +
        '</span><span class="n">' + (s.ok ? s.items + " kept / " + (s.fetched == null ? "?" : s.fetched) + " fetched" : "—") + "</span></li>";
    }).join("") || "<li>No source information yet.</li>";
    var failed = srcs.filter(function (s) { return !s.ok; }).length;
    $("status-summary").textContent = "About this edition · " + (srcs.length - failed) + " of " + srcs.length + " sources OK";
  }

  function renderAll() {
    renderBars(state.items);
    renderChips(state.items);
    renderList();
    renderStatus();
    $("updated").textContent = state.data.generated_at
      ? "Updated " + ago(state.data.generated_at)
      : "No data yet";
  }

  // ---------- events ----------
  function bind() {
    $("search").addEventListener("input", function (e) {
      state.query = e.target.value.trim(); state.shown = PAGE_SIZE; renderList();
    });
    $("range").value = state.range;
    $("range").addEventListener("change", function (e) {
      state.range = e.target.value; state.shown = PAGE_SIZE; renderList();
    });
    $("unread").addEventListener("click", function () {
      state.unreadOnly = !state.unreadOnly; this.setAttribute("aria-pressed", state.unreadOnly);
      state.shown = PAGE_SIZE; renderList();
    });
    $("mark-all").addEventListener("click", function () {
      state.items.filter(matches).forEach(function (i) { state.read.add(i.id); });
      saveSet("read", state.read); renderList();
    });
    $("refresh").addEventListener("click", function () { load(true); });
    if ($("theme")) {
      var saved = loadValue("theme");
      if (saved) document.documentElement.setAttribute("data-theme", saved);
      $("theme").addEventListener("click", function () {
        var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        var current = document.documentElement.getAttribute("data-theme") || (dark ? "dark" : "light");
        var next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        saveValue("theme", next);
      });
    }
    if ($("ai-sheet")) {
      $("ai-sheet").addEventListener("click", function (e) {
        if (e.target.closest("[data-ai-close]") || e.target === $("ai-sheet")) { closeAiSheet(); return; }
        var t = e.target.closest("[data-ai-task]");
        if (t) { ai.task = t.getAttribute("data-ai-task"); renderAiSheet(); return; }
        var a = e.target.closest("[data-ai-open]");
        if (a) { AI_ASSISTANTS[a.getAttribute("data-ai-open")].open(aiPrompt(ai.item, ai.task)); return; }
        if (e.target.closest("[data-ai-copy]")) { copyText(aiPrompt(ai.item, ai.task)); toast("Prompt copied"); }
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAiSheet(); });
    }
    if ($("top")) {
      window.addEventListener("scroll", function () { $("top").hidden = window.scrollY < 600; }, { passive: true });
      $("top").addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    }
    $("more").addEventListener("click", function () { state.shown += PAGE_SIZE; renderList(); });

    document.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (chip) {
        var kind = chip.getAttribute("data-kind"), val = chip.getAttribute("data-val") || null;
        if (kind === "desk") {
          state.desk = !state.desk;
        } else if (kind === "savedTab") {
          state.savedTab = !state.savedTab;
        } else {
          if (kind === "group" && !val) { state.desk = false; state.savedTab = false; }   // "All" clears the special tabs
          state[kind] = (state[kind] === val) ? null : val;
        }
        state.shown = PAGE_SIZE; renderChips(state.items); renderList();
        return;
      }
      var act = e.target.closest("[data-act]");
      if (!act) {
        var card = e.target.closest(".story");
        if (card && !e.target.closest("a, button, mark")) {
          var cid = card.getAttribute("data-id");
          if (state.expanded.has(cid)) state.expanded.delete(cid); else state.expanded.add(cid);
          card.classList.toggle("open", state.expanded.has(cid));
        }
        return;
      }
      var li = act.closest(".story");
      var id = li && li.getAttribute("data-id");
      var item = pool().find(function (i) { return i.id === id; });
      if (!item) return;
      var action = act.getAttribute("data-act");
      if (action === "open") {
        state.read.add(id); saveSet("read", state.read);
        li.classList.add("read"); return; // let the link open
      }
      if (action === "read") {
        if (state.read.has(id)) state.read.delete(id); else state.read.add(id);
        saveSet("read", state.read); renderList();
      } else if (action === "ai") {
        openAiSheet(item);
      } else if (action === "bookmark") {
        toggleSaved(item); renderChips(state.items); renderList();
      } else if (action === "share") {
        var payload = { title: item.title, text: item.title + " — " + item.source, url: item.link };
        if (navigator.share) { navigator.share(payload).catch(function () {}); }
        else if (navigator.clipboard) {
          navigator.clipboard.writeText(item.title + "\n" + item.link).then(function () {
            act.textContent = "Copied"; setTimeout(function () { act.textContent = "Share"; }, 1500);
          });
        }
      }
    });
  }

  // ---------- loading ----------
  function load(force) {
    $("updated").textContent = "Loading…";
    var url = FEED + (force ? "?t=" + Date.now() : "");
    fetch(url, { cache: force ? "reload" : "default" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        state.data = data;
        state.items = (data.items || []).slice().sort(function (a, b) { return a.published < b.published ? 1 : -1; });
        var changed = false;
        state.items.forEach(function (i) {
          if (state.bookmarks.has(i.id) && !state.savedItems[i.id]) { state.savedItems[i.id] = snapshot(i); changed = true; }
        });
        if (changed) saveObject("savedItems", state.savedItems);
        $("notice").hidden = true;
        renderAll();
      })
      .catch(function (err) {
        state.data = state.data || { sources: [], items: [] };
        $("updated").textContent = "Could not load data";
        $("notice").hidden = false;
        $("notice").textContent = "Could not load " + FEED + " (" + err.message + "). " +
          "If you opened this file directly from disk, serve the folder with a local web server instead — see the README.";
        renderAll();
      });
  }

  bind();
  if ($("today")) {
    $("today").textContent = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }
  load(false);
  // Record this visit once the page has rendered, so "new since last visit" works next time.
  window.addEventListener("pagehide", function () { saveValue("lastVisit", new Date().toISOString()); });
  setTimeout(function () { saveValue("lastVisit", new Date().toISOString()); }, 15000);
})();
