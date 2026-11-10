// Practice mode for the test pages: each problem's answer and steps stay hidden until you ask,
// then you mark it right or wrong and the score at the bottom keeps count. Progress stays in this
// browser only. The page's script tag says where problems, steps and answers are.
(function () {
  "use strict";
  var me = document.currentScript, cfg = me ? me.dataset : {};
  var KEY = "qa:" + location.pathname;

  var css =
    ".qa-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}" +
    ".qa-bar button{font:600 14px/1 system-ui,-apple-system,'Segoe UI',sans-serif;color:inherit;background:transparent;" +
    "border:1.5px solid currentColor;border-radius:999px;padding:9px 15px;cursor:pointer;opacity:.85}" +
    ".qa-bar button:hover{opacity:1}" +
    ".qa-bar button:focus-visible,.qa-panel button:focus-visible{outline:2px solid #2f6bff;outline-offset:2px}" +
    ".qa-bar .qa-got{color:#14864f;border-color:#14864f}" +
    ".qa-bar .qa-miss{color:#c42323;border-color:#c42323}" +
    ".qa-chip{font:700 13px/1 system-ui,-apple-system,'Segoe UI',sans-serif;border-radius:999px;padding:7px 12px}" +
    ".qa-chip.ok{background:#e1f3e9;color:#14864f}.qa-chip.no{background:#fdecec;color:#c42323}" +
    ".qa-hide{display:none!important}" +
    ".qa-ans{margin-top:8px;font-weight:600}" +
    ".qa-panel{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:50;" +
    "display:flex;gap:6px;align-items:center;max-width:calc(100% - 24px);background:#141a28;color:#fff;border-radius:999px;" +
    "padding:6px 6px 6px 16px;box-shadow:0 6px 24px rgba(0,0,0,.25);font:600 14px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif}" +
    ".qa-panel span{white-space:nowrap;margin-right:4px}" +
    ".qa-panel button{font:inherit;color:#fff;background:rgba(255,255,255,.12);border:0;border-radius:999px;padding:9px 13px;cursor:pointer;white-space:nowrap}" +
    ".qa-panel button:hover{background:rgba(255,255,255,.22)}" +
    "@media (max-width:520px){.qa-panel{left:12px;right:12px;transform:none;max-width:none;flex-wrap:wrap;justify-content:center;" +
    "border-radius:16px;padding:8px;font-size:13px}.qa-panel span{flex-basis:100%;text-align:center;margin:2px 0 4px}" +
    ".qa-panel button{padding:8px 12px}}" +
    "body{padding-bottom:110px}";

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function all(root, sel) { return sel ? Array.prototype.slice.call(root.querySelectorAll(sel)) : []; }
  function btn(text, cls) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = text; if (cls) b.className = cls;
    return b;
  }

  // The 2.6–2.7 quiz keeps its answers on a separate key sheet. Move each answer under its problem
  // (same part, same number) and hide the key sheet.
  function buildFromKey() {
    var sheets = document.querySelectorAll("article.sheet");
    if (sheets.length < 2) return;
    var parts = sheets[0].querySelectorAll(".part"), keys = sheets[1].querySelectorAll(".key section");
    for (var k = 0; k < parts.length && k < keys.length; k++) {
      var map = {};
      all(keys[k], "li").forEach(function (li) {
        var b = li.querySelector("b"), s = li.querySelector("span");
        if (b && s) map[b.textContent.trim()] = s;
      });
      all(parts[k], ".grid li").forEach(function (li) {
        var n = li.querySelector(".n"), cell = li.querySelector(".p"), s = n && map[n.textContent.trim()];
        if (!s || !cell) return;
        var a = document.createElement("div");
        a.className = "qa-ans";
        a.appendChild(document.createTextNode("Answer: "));
        a.appendChild(s);
        cell.appendChild(a);
      });
    }
    sheets[1].classList.add("qa-hide");
  }

  function start() {
    if (cfg.mode === "key") buildFromKey();
    var items = all(document, cfg.item);
    if (!items.length) return;

    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var state = load(), rows = [];

    // A page with its own show/hide buttons hands the job over: drop them and unhide what they hid.
    all(document, cfg.strip).forEach(function (el) { el.remove(); });
    all(document, cfg.unhide).forEach(function (el) { el.hidden = false; });

    items.forEach(function (item, i) {
      var steps = all(item, cfg.steps), answer = all(item, cfg.answer);
      var bar = document.createElement("div");
      bar.className = "qa-bar";
      var host = (cfg.bar && item.querySelector(cfg.bar)) || item;
      host.appendChild(bar);
      var row = { item: item, steps: steps, answer: answer, bar: bar, i: i };
      rows.push(row);
      render(row);
    });

    function render(row) {
      var mark = state[row.i], bar = row.bar, shown = !!mark || row.open;
      row.answer.forEach(function (el) { el.classList.toggle("qa-hide", !shown); });
      row.steps.forEach(function (el) { el.classList.toggle("qa-hide", !(shown && row.stepsOpen)); });
      if (cfg.openclass) row.item.classList.toggle(cfg.openclass, shown);
      bar.textContent = "";
      if (!shown) {
        var show = btn("Show answer");
        show.onclick = function () { row.open = true; render(row); };
        bar.appendChild(show);
      } else if (!mark) {
        var got = btn("I got it", "qa-got"), miss = btn("Missed it", "qa-miss");
        got.onclick = function () { setMark(row, "got"); };
        miss.onclick = function () { setMark(row, "miss"); row.stepsOpen = true; render(row); };
        bar.appendChild(got); bar.appendChild(miss);
      } else {
        var chip = document.createElement("span");
        chip.className = "qa-chip " + (mark === "got" ? "ok" : "no");
        chip.textContent = mark === "got" ? "Got it" : "Missed";
        bar.appendChild(chip);
        var again = btn("Try again");
        again.onclick = function () { delete state[row.i]; save(state); row.open = false; row.stepsOpen = false; render(row); score(); };
        bar.appendChild(again);
      }
      if (shown && row.steps.length) {
        var st = btn(row.stepsOpen ? "Hide steps" : "Show steps");
        st.onclick = function () { row.stepsOpen = !row.stepsOpen; render(row); };
        bar.appendChild(st);
      }
    }

    function setMark(row, m) { state[row.i] = m; save(state); render(row); score(); }

    var panel = document.createElement("div");
    panel.className = "qa-panel";
    var label = document.createElement("span");
    label.setAttribute("aria-live", "polite");
    var next = btn("Next"), redo = btn("Redo missed"), reset = btn("Reset");
    panel.appendChild(label); panel.appendChild(next); panel.appendChild(redo); panel.appendChild(reset);
    document.body.appendChild(panel);

    next.onclick = function () {
      var r = rows.filter(function (x) { return !state[x.i]; })[0];
      if (r) r.item.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    redo.onclick = function () {
      var first = null;
      rows.forEach(function (r) {
        if (state[r.i] !== "miss") return;
        delete state[r.i]; r.open = false; r.stepsOpen = false; render(r);
        if (!first) first = r;
      });
      save(state); score();
      if (first) first.item.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    reset.onclick = function () {
      state = {}; save(state);
      rows.forEach(function (r) { r.open = false; r.stepsOpen = false; render(r); });
      score();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    function score() {
      var got = 0, miss = 0;
      rows.forEach(function (r) { if (state[r.i] === "got") got++; else if (state[r.i] === "miss") miss++; });
      var left = rows.length - got - miss;
      label.textContent = got + " right · " + miss + " missed · " + left + " left";
      redo.hidden = !miss;
      next.hidden = !left;
    }
    score();
  }

  // Wait for the math to finish drawing before hiding anything, so it lays out correctly. Check
  // after the page has loaded, since MathJax may still be loading when this script runs.
  function boot() {
    var mj = window.MathJax;
    if (mj && mj.startup && mj.startup.promise) mj.startup.promise.then(start, start);
    else start();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
