(() => {
  const S = document.createElement("style");
  S.textContent = `
      @keyframes scale-pop { 0% { transform: scale(1); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
      @keyframes reject-shake { 0% { transform: translateX(0); } 25% { transform: translateX(-3px) rotate(-3deg); } 75% { transform: translateX(3px) rotate(3deg); } 100% { transform: translateX(0); } }
      @keyframes badge-pop { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
  
      .save-icon-button .save-icon,
      #popup-save .save-icon { 
        transform-origin: center center; 
        will-change: transform; 
        backface-visibility: hidden; 
      }
      
      .save-icon-button .fill-path,
      #popup-save .fill-path { 
        fill: currentColor; 
        stroke: none; 
        clip-path: inset(100% 0 0 0); 
        transform-box: fill-box; 
        pointer-events: none; 
        transition: clip-path 0.35s ease-in; 
      }
      
      .save-icon-button.active .fill-path,
      #popup-save.active .fill-path { 
        clip-path: inset(0 0 0 0); 
        transition: clip-path 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
      }
      
      .save-icon-button.active .save-icon,
      #popup-save.active .save-icon { 
        animation: scale-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
      }
      
      .save-icon-button:not(.active).shaking .save-icon,
      #popup-save:not(.active).shaking .save-icon { 
        animation: reject-shake 0.3s ease-in-out; 
      }
      
      .save-icon-button.preload .fill-path, .save-icon-button.preload .save-icon,
      #popup-save.preload .fill-path, #popup-save.preload .save-icon { 
        transition: none !important; 
        animation: none !important; 
      }
  
      .saved-number-wrapper.badge-pop { animation: badge-pop 0.2s ease-out; }
    `;
  document.head.appendChild(S);

  const LS_KEY = "user_saved_items";

  const isSavedPage = () => window.location.pathname.includes("/saved");

  const getSaved = () => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch (e) {
      return new Set();
    }
  };

  const getSavedArray = () => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      const arr = stored ? JSON.parse(stored) : [];
      return Array.isArray(arr)
        ? arr.map((x) => String(x).trim()).filter(Boolean)
        : [];
    } catch (e) {
      return [];
    }
  };

  const normalizeSlug = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s ? s : null;
  };

  const getSlugFromContext = (node) => {
    if (!node) return null;

    const direct = normalizeSlug(node.dataset?.savedSlug);
    if (direct) return direct;

    const withinSaved = node.closest?.("[data-saved-slug]");
    if (withinSaved) {
      const s = normalizeSlug(withinSaved.dataset.savedSlug);
      if (s) return s;
    }

    const withinTTD = node.closest?.("[data-ttd-popup-item]");
    if (withinTTD) {
      const s = normalizeSlug(withinTTD.dataset.ttdPopupItem);
      if (s) return s;
    }

    const withinPopupContent = node.closest?.("[popup-content]");
    if (withinPopupContent) {
      const s = normalizeSlug(withinPopupContent.getAttribute("popup-content"));
      if (s) return s;
    }

    return null;
  };

  const updateBadge = (animate = true) => {
    const count = getSaved().size;
    const wrapper = document.getElementById("saved-number-wrapper");
    const text = document.getElementById("saved-number-text");

    if (!wrapper || !text) return;

    if (count === 0) {
      wrapper.style.display = "none";
    } else {
      wrapper.style.display = "";
      text.textContent = count >= 10 ? "9+" : count;

      if (animate) {
        wrapper.classList.remove("badge-pop");
        void wrapper.offsetWidth;
        wrapper.classList.add("badge-pop");
      }
    }
  };

  const initIcon = (btn) => {
    if (btn.dataset.init) return;

    const svg = btn.querySelector("svg");
    if (!svg) return;

    svg.classList.add("save-icon");

    const outline = svg.querySelector("path:not(.fill-path)");
    if (!outline) return;

    outline.setAttribute("fill", "none");
    const fill = outline.cloneNode();
    fill.classList.add("fill-path");
    svg.insertBefore(fill, outline);
    void fill.clientWidth;
    btn.dataset.init = "1";
  };

  const updateText = (btn, isSaved) => {
    const txtEl = btn.querySelector(".title5-1");
    if (txtEl) txtEl.textContent = isSaved ? "Saved" : "Save";
  };

  const setButtonState = (btn, isActive, opts) => {
    initIcon(btn);

    if (opts && opts.preload) btn.classList.add("preload");
    else btn.classList.remove("preload");

    if (isActive) {
      btn.classList.remove("shaking");
      btn.classList.add("active");
      btn.setAttribute("aria-label", "Unsave Event");
      updateText(btn, true);
    } else {
      btn.classList.remove("active");
      btn.setAttribute("aria-label", "Save Event");
      updateText(btn, false);

      if (opts && opts.shake) {
        btn.classList.add("shaking");
        setTimeout(() => btn.classList.remove("shaking"), 300);
      } else {
        btn.classList.remove("shaking");
      }
    }

    if (opts && opts.preload) {
      requestAnimationFrame(() =>
        setTimeout(() => btn.classList.remove("preload"), 100)
      );
    }
  };

  const findButtonsForSlug = (slug) => {
    const s = normalizeSlug(slug);
    if (!s) return [];

    const out = new Set();

    document
      .querySelectorAll(
        `[data-saved-slug="${CSS.escape(
          s
        )}"], [data-ttd-popup-item="${CSS.escape(
          s
        )}"], [popup-content="${CSS.escape(s)}"]`
      )
      .forEach((n) => {
        if (n.matches && n.matches(".save-icon-button, [id='popup-save']")) {
          out.add(n);
        } else {
          const b = n.querySelector?.(".save-icon-button, [id='popup-save']");
          if (b) out.add(b);
        }
      });

    document
      .querySelectorAll(".save-icon-button, [id='popup-save']")
      .forEach((b) => {
        const bs = getSlugFromContext(b);
        if (bs === s) out.add(b);
      });

    return [...out];
  };

  const syncSlug = (slug, isActive, opts) => {
    const buttons = findButtonsForSlug(slug);
    for (let i = 0; i < buttons.length; i++) {
      setButtonState(buttons[i], isActive, opts);
    }
  };

  const syncAllVisibleSaveButtons = (opts) => {
    const savedSet = getSaved();
    const buttons = document.querySelectorAll(
      ".save-icon-button, [id='popup-save']"
    );
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const slug = getSlugFromContext(btn);
      if (!slug) continue;
      setButtonState(btn, savedSet.has(slug), opts);
    }
  };

  const scheduleFullSync = (() => {
    let rafId = 0;
    return (opts) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        syncAllVisibleSaveButtons(opts || { preload: false, shake: false });
      });
    };
  })();

  const applySavedEmptyState = () => {
    if (!isSavedPage()) return;

    const gridWrapper = document.getElementById("grid-1-wrapper");
    const noSaved = document.getElementById("no-saved");

    const remainingCards = gridWrapper
      ? gridWrapper.querySelectorAll(".mason-grid-item")
      : document.querySelectorAll("#grid-1 .mason-grid-item");

    const hasAnySaved = remainingCards && remainingCards.length > 0;

    if (!hasAnySaved) {
      if (gridWrapper) gridWrapper.style.display = "none";
      if (noSaved) noSaved.style.display = "grid";
    } else {
      if (gridWrapper) gridWrapper.style.display = "";
      if (noSaved) noSaved.style.display = "none";
    }
  };

  const removeCardFromSavedGrid = (slug) => {
    if (!isSavedPage()) return;
    const s = normalizeSlug(slug);
    if (!s) return;

    const grid1 = document.getElementById("grid-1");
    if (!grid1) return;

    const sel = `.mason-grid-item[data-saved-slug="${CSS.escape(s)}"]`;
    const card = grid1.querySelector(sel);
    if (card) card.remove();

    applySavedEmptyState();
  };

  document.addEventListener(
    "click",
    (e) => {
      scheduleFullSync({ preload: false, shake: false });

      const btn = e.target.closest(".save-icon-button, [id='popup-save']");
      if (!btn) return;

      const slug = getSlugFromContext(btn);
      if (!slug) return;

      if (btn.tagName === "A" || btn.closest("a")) e.preventDefault();

      const savedArr = getSavedArray();
      const savedSet = new Set(savedArr);
      const isCurrentlySaved = savedSet.has(slug);
      const shouldBeActive = !isCurrentlySaved;

      let nextArr;
      if (shouldBeActive) {
        nextArr = savedArr.filter((x) => x !== slug);
        nextArr.push(slug);
      } else {
        nextArr = savedArr.filter((x) => x !== slug);
      }

      try {
        localStorage.setItem(LS_KEY, JSON.stringify(nextArr));
      } catch (err) {
        console.error("LS Error", err);
      }

      updateBadge(true);

      syncSlug(slug, shouldBeActive, {
        preload: false,
        shake: !shouldBeActive,
      });

      if (!shouldBeActive) removeCardFromSavedGrid(slug);
    },
    true
  );

  document.addEventListener(
    "pointerdown",
    () => scheduleFullSync({ preload: false, shake: false }),
    true
  );
  document.addEventListener(
    "keyup",
    () => scheduleFullSync({ preload: false, shake: false }),
    true
  );
  document.addEventListener(
    "focusin",
    () => scheduleFullSync({ preload: false, shake: false }),
    true
  );

  const setupObserver = () => {
    if (!("MutationObserver" in window)) return;

    const obs = new MutationObserver(() => {
      scheduleFullSync({ preload: false, shake: false });
    });

    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-saved-slug",
        "data-ttd-popup-item",
        "popup-content",
        "id",
      ],
    });
  };

  const run = () => {
    updateBadge(false);
    syncAllVisibleSaveButtons({ preload: true, shake: false });

    if (isSavedPage()) {
      const savedArr = getSavedArray();
      const savedSet = new Set(savedArr);

      const grid = document.getElementById("grid-1");
      const grid2 = document.getElementById("grid-2");
      const gridWrapper = document.getElementById("grid-1-wrapper");
      const noSaved = document.getElementById("no-saved");

      if (noSaved) noSaved.style.display = "none";

      if (grid && grid2) {
        const moving = Array.from(grid2.children);
        for (let i = 0; i < moving.length; i++) grid.appendChild(moving[i]);
        grid2.remove();
      }

      const allCards = gridWrapper
        ? gridWrapper.querySelectorAll(".mason-grid-item[data-saved-slug]")
        : document.querySelectorAll(".mason-grid-item[data-saved-slug]");

      allCards.forEach((item) => {
        const slug = normalizeSlug(item.dataset.savedSlug);
        if (!slug || !savedSet.has(slug)) item.remove();
      });

      if (grid) {
        const cards = Array.from(
          grid.querySelectorAll(".mason-grid-item[data-saved-slug]")
        );

        const order = new Map();
        for (let i = 0; i < savedArr.length; i++) order.set(savedArr[i], i);

        cards.sort((a, b) => {
          const as = normalizeSlug(a.dataset.savedSlug);
          const bs = normalizeSlug(b.dataset.savedSlug);
          const ai = order.has(as) ? order.get(as) : 1e9;
          const bi = order.has(bs) ? order.get(bs) : 1e9;
          return ai - bi;
        });

        const frag = document.createDocumentFragment();
        for (let i = 0; i < cards.length; i++) frag.appendChild(cards[i]);
        grid.appendChild(frag);
      }

      applySavedEmptyState();

      const g = document.getElementById("grid-1");
      if (g) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            g.style.opacity = "1";
          }, 50);
        });
      }
    }

    const list = document.getElementById("events-slider-list");
    const hide = () => {
      ["events", "view-events", "view-events-mobile"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });
    };

    if (!list) return hide();

    const items = list.querySelectorAll(".events-slider-list-item");
    if (!items.length) return hide();

    const YR = /\d{4}$/,
      AL = /[a-zA-Z]/,
      DG = /^\d+\s*/;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();
    const curYr = now.getFullYear();

    const valid = [],
      trash = [];

    for (let i = 0, n = items.length; i < n; i++) {
      const el = items[i];
      if (!el.parentNode) continue;

      const txt = el.querySelector("[data-sort-date]")?.textContent;
      if (!txt) continue;

      let s,
        e,
        c = txt.trim();
      let y = (c.match(YR) || [curYr])[0];

      if (c.includes("-")) {
        let p = c.split("-"),
          p1 = p[0].trim(),
          p2 = p[1].trim();
        e = new Date(p2);
        if (AL.test(p1)) s = new Date(`${p1} ${y}`);
        else s = new Date(`${p1} ${p2.replace(DG, "")}`);
      } else {
        s = new Date(c);
        e = new Date(c);
      }

      e.setHours(23, 59, 59, 999);
      s.setHours(0, 0, 0, 0);

      const eTime = e.getTime(),
        sTime = s.getTime();

      if (eTime < today) trash.push(el);
      else
        valid.push({ el, t: sTime <= today && eTime >= today ? today : sTime });
    }

    if (!valid.length) return hide();

    requestAnimationFrame(() => {
      trash.forEach((el) => el.remove());
      valid.sort((a, b) => a.t - b.t);
      const frag = document.createDocumentFragment();
      for (let i = 0; i < valid.length; i++) frag.appendChild(valid[i].el);
      const sp = list.querySelector(".events-slider-spacer:last-child");
      sp ? list.insertBefore(frag, sp) : list.appendChild(frag);
    });
  };

  setupObserver();

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", run);
  else run();
})();
