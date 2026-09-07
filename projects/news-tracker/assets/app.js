/* News tracker dashboard logic. Shared by every dashboard page.
   The page tells us which data file to load via <body data-feed="../data/x.json">.
   Read / bookmark / last-visit state lives in this browser's localStorage only. */

(function () {
  "use strict";

  var body = document.body;
  var FEED = body.getAttribute("data-feed");
  var KEY = body.getAttribute("data-key") || "news";
  var PAGE_SIZE = 40;

  var state = {
    data: null,
    items: [],
    query: "",
    range: "all",         // "1" | "3" | "7" | "all" (days)
    source: null,         // selected source name
    topic: null,          // selected topic name
    category: null,       // selected category (section)
    unreadOnly: false,
    bookmarksOnly: false,
    shown: PAGE_SIZE,
    read: loadSet("read"),
    bookmarks: loadSet("bookmarks"),
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
  function loadValue(name) {
    try { return localStorage.getItem(KEY + ":" + name); } catch (e) { return null; }
  }
  function saveValue(name, v) {
    try { localStorage.setItem(KEY + ":" + name, v); } catch (e) {}
  }

  // ---------- formatting ----------
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
  function matches(item) {
    if (!withinRange(item)) return false;
    if (state.source && item.source !== state.source) return false;
    if (state.topic && (item.topics || []).indexOf(state.topic) === -1) return false;
    if (state.category && item.category !== state.category) return false;
    if (state.unreadOnly && state.read.has(item.id)) return false;
    if (state.bookmarksOnly && !state.bookmarks.has(item.id)) return false;
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
  function renderTiles(all) {
    var day = Date.now() - 86400000;
    var last24 = all.filter(function (i) { return new Date(i.published).getTime() >= day; }).length;
    var fresh = all.filter(isNew).length;
    var unread = all.filter(function (i) { return !state.read.has(i.id); }).length;
    var srcOk = (state.data.sources || []).filter(function (s) { return s.ok; }).length;
    var srcAll = (state.data.sources || []).length;
    $("t-total").textContent = all.length.toLocaleString("en-IN");
    $("t-24h").textContent = last24.toLocaleString("en-IN");
    $("t-new").textContent = fresh.toLocaleString("en-IN");
    $("t-new-hint").textContent = state.lastVisit ? "since " + ago(state.lastVisit) : "first visit";
    $("t-unread").textContent = unread.toLocaleString("en-IN");
    $("t-unread-hint").textContent = srcOk + "/" + srcAll + " sources OK";
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
    var srcCounts = {}, topicCounts = {}, catCounts = {};
    all.forEach(function (i) {
      srcCounts[i.source] = (srcCounts[i.source] || 0) + 1;
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
    $("chips-category").innerHTML = chips(catCounts, state.category, "category", "All sections");
    $("chips-category").hidden = Object.keys(catCounts).length < 2;
    $("chips-source").innerHTML = chips(srcCounts, state.source, "source");
    $("chips-topic").innerHTML = chips(topicCounts, state.topic, "topic");
  }

  function storyHTML(item) {
    var read = state.read.has(item.id);
    var marked = state.bookmarks.has(item.id);
    var tags = (item.topics || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
    var section = item.category || null;
    var byline = section && item.source.indexOf(section) !== -1 ? null : (item.publisher || item.source);
    return '<li class="story' + (read ? " read" : "") + (isNew(item) ? " new" : "") + '" data-id="' + esc(item.id) + '">' +
      '<div class="kicker">' +
      (section ? '<span class="sec">' + esc(section) + "</span><span>·</span>" : "") +
      (byline ? "<span>" + esc(byline) + "</span><span>·</span>" : "") +
      '<span title="' + esc(fullDate(item.published)) + '">' + esc(ago(item.published)) + "</span>" +
      (isNew(item) ? '<span class="new">New</span>' : "") +
      "</div>" +
      '<h2><a href="' + esc(item.link) + '" target="_blank" rel="noopener" data-act="open">' + esc(item.title) + "</a></h2>" +
      (item.summary ? "<p>" + esc(item.summary) + "</p>" : "") +
      (tags ? '<div class="tags">' + tags + "</div>" : "") +
      '<div class="actions">' +
      '<button data-act="read" aria-pressed="' + read + '">' + (read ? "✓ Read" : "Mark read") + "</button>" +
      '<button data-act="bookmark" aria-pressed="' + marked + '">' + (marked ? "★ Saved" : "☆ Save") + "</button>" +
      '<button data-act="share">Share</button>' +
      '<a class="open" href="' + esc(item.link) + '" target="_blank" rel="noopener" data-act="open">Read ↗</a>' +
      "</div></li>";
  }

  function renderList() {
    var filtered = state.items.filter(matches);
    var slice = filtered.slice(0, state.shown);
    $("count").textContent = filtered.length === state.items.length
      ? filtered.length + " stories"
      : filtered.length + " of " + state.items.length + " stories";
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
    $("status-summary").textContent = "Source status (" + (srcs.length - failed) + " OK" + (failed ? ", " + failed + " failing" : "") + ")";
  }

  function renderAll() {
    renderTiles(state.items);
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
    $("range").addEventListener("change", function (e) {
      state.range = e.target.value; state.shown = PAGE_SIZE; renderList();
    });
    $("unread").addEventListener("click", function () {
      state.unreadOnly = !state.unreadOnly; this.setAttribute("aria-pressed", state.unreadOnly);
      state.shown = PAGE_SIZE; renderList();
    });
    $("saved").addEventListener("click", function () {
      state.bookmarksOnly = !state.bookmarksOnly; this.setAttribute("aria-pressed", state.bookmarksOnly);
      state.shown = PAGE_SIZE; renderList();
    });
    $("mark-all").addEventListener("click", function () {
      state.items.filter(matches).forEach(function (i) { state.read.add(i.id); });
      saveSet("read", state.read); renderTiles(state.items); renderList();
    });
    $("refresh").addEventListener("click", function () { load(true); });
    $("more").addEventListener("click", function () { state.shown += PAGE_SIZE; renderList(); });

    document.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (chip) {
        var kind = chip.getAttribute("data-kind"), val = chip.getAttribute("data-val") || null;
        state[kind] = (state[kind] === val) ? null : val;
        state.shown = PAGE_SIZE; renderChips(state.items); renderList();
        return;
      }
      var act = e.target.closest("[data-act]");
      if (!act) return;
      var li = act.closest(".story");
      var id = li && li.getAttribute("data-id");
      var item = state.items.find(function (i) { return i.id === id; });
      if (!item) return;
      var action = act.getAttribute("data-act");
      if (action === "open") {
        state.read.add(id); saveSet("read", state.read);
        li.classList.add("read"); return; // let the link open
      }
      if (action === "read") {
        if (state.read.has(id)) state.read.delete(id); else state.read.add(id);
        saveSet("read", state.read); renderTiles(state.items); renderList();
      } else if (action === "bookmark") {
        if (state.bookmarks.has(id)) state.bookmarks.delete(id); else state.bookmarks.add(id);
        saveSet("bookmarks", state.bookmarks); renderList();
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
