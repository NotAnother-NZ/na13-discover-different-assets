(function () {
  window.rtSliders = window.rtSliders || [];

  let lenisLoadingPromise = null;

  function uid() {
    return "s" + Math.random().toString(36).slice(2);
  }
  function assignUID(el, attr) {
    if (!el.getAttribute(attr)) el.setAttribute(attr, uid());
    return el.getAttribute(attr);
  }
  function injectOnce(key, css) {
    let s = document.head.querySelector('[data-rt-injected="' + key + '"]');
    if (!s) {
      s = document.createElement("style");
      s.setAttribute("data-rt-injected", key);
      document.head.appendChild(s);
    }
    if (s.textContent !== css) s.textContent = css;
  }
  function toSel(v) {
    return typeof v === "string" ? v.trim() : "";
  }

  function parseBool(val, def) {
    if (val === null) return def;
    var u = String(val).trim().toLowerCase();
    return u === "" ||
      u === "true" ||
      u === "1" ||
      u === "yes" ||
      u === "y" ||
      u === "on"
      ? true
      : u === "false" || u === "0" || u === "no" || u === "n" || u === "off"
      ? false
      : def;
  }
  function parseNum(val, def) {
    if (val === null) return def;
    var u = String(val).trim();
    if (!u.length) return def;
    var e = Number(u);
    return Number.isFinite(e) ? e : def;
  }
  function parseStr(val, def) {
    if (val === null) return def;
    var u = String(val);
    return u.length ? u : def;
  }
  function clamp(i) {
    return i < 0 ? 0 : i > 1 ? 1 : i;
  }
  function parseEasing(val) {
    var s = String(val || "").trim();
    if (!s) return null;
    var u = {
      linear: function (e) {
        return clamp(e);
      },
      easeInQuad: function (e) {
        return (e = clamp(e)), e * e;
      },
      easeOutQuad: function (e) {
        return (e = clamp(e)), e * (2 - e);
      },
      easeInOutQuad: function (e) {
        return (
          (e = clamp(e)), e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2
        );
      },
      easeInCubic: function (e) {
        return (e = clamp(e)), e * e * e;
      },
      easeOutCubic: function (e) {
        return (e = clamp(e)), 1 - Math.pow(1 - e, 3);
      },
      easeInOutCubic: function (e) {
        return (
          (e = clamp(e)),
          e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2
        );
      },
      easeInOutSine: function (e) {
        return (e = clamp(e)), -(Math.cos(Math.PI * e) - 1) / 2;
      },
      easeOutExpo: function (e) {
        return (e = clamp(e)), e === 1 ? 1 : 1 - Math.pow(2, -10 * e);
      },
    };
    return u[s] || null;
  }

  function isTransparentColor(csVal) {
    if (!csVal) return true;
    var v = String(csVal).trim().toLowerCase();
    if (v === "transparent") return true;
    if (v.startsWith("rgba(")) {
      var parts = v
        .slice(5, -1)
        .split(",")
        .map(function (x) {
          return x.trim();
        });
      var a = parts.length === 4 ? Number(parts[3]) : 1;
      return !Number.isFinite(a) ? false : a === 0;
    }
    return false;
  }

  function findNearestOpaqueBgColor(el) {
    var n = el;
    while (n && n !== document.documentElement) {
      var cs = getComputedStyle(n);
      var bg = cs.backgroundColor;
      if (!isTransparentColor(bg)) return bg;
      n = n.parentElement;
    }
    var rootBg = getComputedStyle(document.body).backgroundColor;
    return isTransparentColor(rootBg) ? "rgb(255, 255, 255)" : rootBg;
  }

  function loadLenis() {
    if (typeof window.Lenis !== "undefined") {
      return Promise.resolve();
    }
    if (lenisLoadingPromise) {
      return lenisLoadingPromise;
    }
    lenisLoadingPromise = new Promise(function (resolve, reject) {
      var existingScript =
        document.querySelector('script[data-rt-lenis="true"]') ||
        document.querySelector('script[src*="cdn.jsdelivr.net/npm/lenis"]');

      if (existingScript) {
        if (typeof window.Lenis !== "undefined") {
          resolve();
          return;
        }
        existingScript.addEventListener("load", function () {
          resolve();
        });
        existingScript.addEventListener("error", function (e) {
          reject(e);
        });
      } else {
        var src = "https://cdn.jsdelivr.net/npm/lenis@1.3.16/dist/lenis.min.js";
        var script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.dataset.rtLenis = "true";
        script.onload = function () {
          resolve();
        };
        script.onerror = function (e) {
          reject(e);
        };
        document.head.appendChild(script);
      }
    });
    return lenisLoadingPromise;
  }

  function getConf(root) {
    return {
      list: toSel(root.getAttribute("data-rt-list")),
      item: toSel(root.getAttribute("data-rt-item")),
      spacer: toSel(root.getAttribute("data-rt-spacer")),
      btnPrev: toSel(root.getAttribute("data-rt-btn-prev")),
      btnNext: toSel(root.getAttribute("data-rt-btn-next")),
      scrollTrack: toSel(root.getAttribute("data-rt-scroll-track")),
      scrollBar: toSel(root.getAttribute("data-rt-scroll-bar")),
      marginRef: toSel(root.getAttribute("data-rt-margin-ref")),
      overlayStart: toSel(root.getAttribute("data-rt-overlay-start")),
      overlayEnd: toSel(root.getAttribute("data-rt-overlay-end")),
    };
  }

  function findScrollableAncestor(el) {
    let n = el;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      const ox = cs.overflowX;
      const scrollable = ox === "auto" || ox === "scroll" || ox === "overlay";
      if (scrollable) return n;
      n = n.parentElement;
    }
    return el;
  }

  function Slider(root) {
    this.root = root;
    this.conf = getConf(root);

    this.valid = !!(this.conf.list && this.conf.item);
    if (!this.valid) return;

    this.list = this.root.querySelector(this.conf.list);
    if (!this.list) {
      this.valid = false;
      return;
    }

    this.list.style.overflowX = "auto";
    this.list.style.webkitOverflowScrolling = "touch";
    this.list.style.scrollbarWidth = "none";
    this.list.style.msOverflowStyle = "none";

    this.scroller = findScrollableAncestor(this.list);

    this.scroller.style.scrollbarWidth = "none";
    this.scroller.style.msOverflowStyle = "none";

    this._basePaddingBottomPx = null;
    this._basePaddingCaptured = false;

    this.btnPrev = this.conf.btnPrev
      ? this.root.querySelector(this.conf.btnPrev) ||
        document.querySelector(this.conf.btnPrev)
      : null;
    this.btnNext = this.conf.btnNext
      ? this.root.querySelector(this.conf.btnNext) ||
        document.querySelector(this.conf.btnNext)
      : null;

    this.overlayStart = this.conf.overlayStart
      ? this.root.querySelector(this.conf.overlayStart) ||
        document.querySelector(this.conf.overlayStart)
      : null;
    this.overlayEnd = this.conf.overlayEnd
      ? this.root.querySelector(this.conf.overlayEnd) ||
        document.querySelector(this.conf.overlayEnd)
      : null;

    if (this.overlayStart) {
      this.overlayStart.style.transition = "opacity 0.3s ease";
      this.overlayStart.style.willChange = "opacity";
    }
    if (this.overlayEnd) {
      this.overlayEnd.style.transition = "opacity 0.3s ease";
      this.overlayEnd.style.willChange = "opacity";
    }

    this.scrollTrack = this.conf.scrollTrack
      ? this.root.querySelector(this.conf.scrollTrack)
      : null;
    this.scrollBar = this.conf.scrollBar
      ? this.root.querySelector(this.conf.scrollBar)
      : null;

    this.firstItem = this.list.querySelector(`${this.conf.item}:first-child`);
    this.lastItem = this.list.querySelector(`${this.conf.item}:last-child`);

    this.dragging = false;
    this.maybeDrag = false;
    this.draggingBar = false;
    this.barOffsetX = 0;
    this.startX = 0;
    this.startScroll = 0;
    this.lastX = 0;
    this.lastT = 0;
    this.velocity = 0;
    this.inertiaId = 0;
    this.ticking = false;
    this.didDrag = false;
    this.cursorBindings = [];
    this.imgHandlers = [];

    this.lenis = null;
    this.lenisRafId = null;

    this.mq = window.matchMedia("(hover: hover) and (pointer: fine)");

    this.ro =
      "ResizeObserver" in window
        ? new ResizeObserver(() => {
            this.rafUpdate();
            this.setupCursorMode();
            this.applyIOSScrollIndicatorMask();
          })
        : null;

    this.init();

    window.rtSliders.push(this);
  }

  Slider.prototype.devicePixelEpsilon = function () {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    return 1 / dpr;
  };
  Slider.prototype.listGap = function () {
    const cs = getComputedStyle(this.list);
    const g1 = parseFloat(cs.columnGap || "0") || 0;
    const g2 = parseFloat(cs.gap || "0") || 0;
    return Math.max(g1, g2);
  };
  Slider.prototype.pickVisibleMarginRef = function () {
    if (!this.conf.marginRef) return null;

    let nodes = this.root.querySelectorAll(this.conf.marginRef);
    if (nodes.length === 0)
      nodes = document.querySelectorAll(this.conf.marginRef);

    for (const el of nodes) {
      if (!el) continue;
      const cs = getComputedStyle(el);
      const visible =
        cs.display !== "none" &&
        cs.visibility !== "hidden" &&
        el.getClientRects().length > 0;
      if (visible) return el;
    }
    return null;
  };
  Slider.prototype.isFlex = function () {
    const d = getComputedStyle(this.list).display;
    return d.includes("flex");
  };
  Slider.prototype.isGrid = function () {
    const d = getComputedStyle(this.list).display;
    return d.includes("grid");
  };
  Slider.prototype.ensureSpacers = function () {
    const kids = Array.from(this.list.children);
    const className = this.conf.spacer
      ? this.conf.spacer.replace(/^[.#]/, "")
      : "awards-slider-spacer";
    const needStart = !(
      kids[0] &&
      kids[0].classList &&
      kids[0].classList.contains(className)
    );
    const needEnd = !(
      kids[kids.length - 1] &&
      kids[kids.length - 1].classList &&
      kids[kids.length - 1].classList.contains(className)
    );
    if (needStart) {
      const el = document.createElement("div");
      el.className = className;
      el.setAttribute("aria-hidden", "true");
      el.style.pointerEvents = "none";
      el.style.height = "1px";
      el.style.minHeight = "1px";
      if (this.isFlex()) el.style.flex = "0 0 auto";
      this.list.insertBefore(el, this.list.firstChild);
    }
    if (needEnd) {
      const el = document.createElement("div");
      el.className = className;
      el.setAttribute("aria-hidden", "true");
      el.style.pointerEvents = "none";
      el.style.height = "1px";
      el.style.minHeight = "1px";
      if (this.isFlex()) el.style.flex = "0 0 auto";
      this.list.appendChild(el);
    }
  };
  Slider.prototype.resetEdgeItemMargins = function () {
    if (this.firstItem) this.firstItem.style.marginLeft = "0px";
    if (this.lastItem) this.lastItem.style.marginRight = "0px";
  };
  Slider.prototype.updateSpacers = function () {
    this.ensureSpacers();
    this.resetEdgeItemMargins();
    const kids = Array.from(this.list.children);
    const cls = this.conf.spacer
      ? this.conf.spacer.replace(/^[.#]/, "")
      : "awards-slider-spacer";
    const spacerStart =
      kids[0] && kids[0].classList.contains(cls) ? kids[0] : null;
    const spacerEnd =
      kids[kids.length - 1] && kids[kids.length - 1].classList.contains(cls)
        ? kids[kids.length - 1]
        : null;
    if (!spacerStart || !spacerEnd) return;
    const marginRef = this.pickVisibleMarginRef();
    if (!marginRef) {
      const eps0 = this.devicePixelEpsilon();
      spacerStart.style.width = eps0 + "px";
      spacerEnd.style.width = eps0 + "px";
      return;
    }
    const sRect = this.scroller.getBoundingClientRect();
    const rRect = marginRef.getBoundingClientRect();
    const rawLeft = rRect.left - sRect.left;
    const gap = this.listGap();
    const gutter = Math.max(0, Math.round(rawLeft - gap));
    const eps = this.devicePixelEpsilon();
    const width = gutter === 0 ? eps : gutter;
    spacerStart.style.width = width + "px";
    spacerEnd.style.width = width + "px";
    if (this.isGrid()) {
      spacerStart.style.justifySelf = "start";
      spacerEnd.style.justifySelf = "start";
      spacerStart.style.gridColumn = "auto";
      spacerEnd.style.gridColumn = "auto";
    }
  };
  Slider.prototype.maxScroll = function () {
    return Math.max(0, this.scroller.scrollWidth - this.scroller.clientWidth);
  };

  Slider.prototype.updateOverlays = function () {
    if (!this.overlayStart && !this.overlayEnd) return;
    const total = this.scroller.scrollWidth;
    const visible = this.scroller.clientWidth;
    const scrollable = total > visible + 1;
    const setVis = (el, show) => {
      if (!el) return;
      el.style.opacity = show ? "1" : "0";
      el.style.pointerEvents = show ? "" : "none";
    };
    if (!scrollable) {
      setVis(this.overlayStart, false);
      setVis(this.overlayEnd, false);
      return;
    }
    const m = this.maxScroll();
    const current = this.scroller.scrollLeft;
    const tolerance = 10;
    const atStart = current <= tolerance;
    const atEnd = current >= m - tolerance;

    setVis(this.overlayStart, !atStart);
    setVis(this.overlayEnd, !atEnd);
  };

  Slider.prototype.updateButtons = function () {
    if (!this.btnPrev && !this.btnNext) return;

    const total = this.scroller.scrollWidth;
    const visible = this.scroller.clientWidth;
    const scrollable = total > visible + 1;

    if (!scrollable) {
      if (this.btnPrev) {
        this.btnPrev.classList.add("inactive");
        this.btnPrev.style.display = "none";
      }
      if (this.btnNext) {
        this.btnNext.classList.add("inactive");
        this.btnNext.style.display = "none";
      }
      return;
    }

    if (this.btnPrev) this.btnPrev.style.display = "";
    if (this.btnNext) this.btnNext.style.display = "";

    const m = this.maxScroll();
    const current = this.scroller.scrollLeft;
    const tolerance = 10;
    const atStart = current <= tolerance;
    const atEnd = current >= m - tolerance;

    if (this.btnPrev) {
      if (atStart) this.btnPrev.classList.add("inactive");
      else this.btnPrev.classList.remove("inactive");
    }

    if (this.btnNext) {
      if (atEnd) this.btnNext.classList.add("inactive");
      else this.btnNext.classList.remove("inactive");
    }
  };

  Slider.prototype.updateScrollbar = function () {
    if (!this.scrollTrack || !this.scrollBar) return;

    if (this.draggingBar) return;
    const total = this.scroller.scrollWidth;
    const visible = this.scroller.clientWidth;
    const items = this.list.querySelectorAll(this.conf.item).length;

    if (total <= visible || items === 0) {
      this.scrollTrack.style.display = "none";
      return;
    }
    this.scrollTrack.style.display = "";

    const trackWidth = this.scrollTrack.clientWidth;
    const avgItemWidth = total / Math.max(1, items + 2);
    const visibleItems = Math.max(1, Math.round(visible / avgItemWidth));
    const barWidth = Math.max(8, (visibleItems / (items + 2)) * trackWidth);
    const maxS = Math.max(1, total - visible);
    const maxX = Math.max(0, trackWidth - barWidth);
    const progress = Math.min(1, Math.max(0, this.scroller.scrollLeft / maxS));
    const x = maxX * progress;

    this.scrollBar.style.width = `${barWidth}px`;
    this.scrollBar.style.transform = `translateX(${x}px)`;
  };

  Slider.prototype.rafUpdate = function () {
    this.updateSpacers();
    this.updateScrollbar();
    this.updateButtons();
    this.updateOverlays();
  };

  Slider.prototype.onScroll = function () {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      const clamped = Math.min(
        Math.max(this.scroller.scrollLeft, 0),
        this.maxScroll()
      );
      if (clamped !== this.scroller.scrollLeft)
        this.scroller.scrollLeft = clamped;
      this.updateScrollbar();
      this.updateButtons();
      this.updateOverlays();
      this.ticking = false;
    });
  };

  Slider.prototype.itemStepWidth = function () {
    if (!this.conf.item)
      return Math.max(1, Math.floor(this.scroller.clientWidth * 0.9));

    const item = this.list.querySelector(this.conf.item);
    if (!item) return Math.max(1, Math.floor(this.scroller.clientWidth * 0.9));

    const cs = getComputedStyle(item);
    const w = item.getBoundingClientRect().width;
    const mr = parseFloat(cs.marginRight) || 0;
    return Math.max(1, Math.round(w + mr));
  };

  Slider.prototype.scrollByItems = function (n) {
    const step = this.itemStepWidth();
    const target =
      n > 0
        ? this.scroller.scrollLeft + step * n
        : this.scroller.scrollLeft - step * Math.abs(n);
    const clamped = Math.min(Math.max(target, 0), this.maxScroll());
    if (this.lenis) {
      this.lenis.scrollTo(clamped, {
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        immediate: false,
        lock: false,
      });
    } else {
      this.scroller.scrollTo({ left: clamped, behavior: "smooth" });
    }
  };

  Slider.prototype.onPrevClick = function (e) {
    e.preventDefault();
    this.scrollByItems(-1);
  };
  Slider.prototype.onNextClick = function (e) {
    e.preventDefault();
    this.scrollByItems(1);
  };

  Slider.prototype.stopInertia = function () {
    if (this.inertiaId) {
      cancelAnimationFrame(this.inertiaId);
      this.inertiaId = 0;
    }
  };
  Slider.prototype.clampScrollLeft = function (x) {
    return Math.min(Math.max(x, 0), this.maxScroll());
  };

  Slider.prototype.startDrag = function (e) {
    if (this.dragging) return;
    this.dragging = true;
    this.didDrag = true;
    if (this.lenis) this.lenis.stop();
    this.scroller.setPointerCapture(e.pointerId);
    this.scroller.classList.add("is-dragging");
    this.scroller.style.userSelect = "none";
    this.stopInertia();
    this.lastX = e.clientX;
    this.lastT = performance.now();
    this.velocity = 0;
  };

  Slider.prototype.endDrag = function (e) {
    if (!this.dragging) return;
    this.dragging = false;
    this.scroller.classList.remove("is-dragging");
    this.scroller.style.userSelect = "";
    if (e && e.pointerId != null)
      this.scroller.releasePointerCapture(e.pointerId);

    if (this.lenis) {
      this.lenis.start();

      const minVel = 0.2;
      if (Math.abs(this.velocity) >= minVel) {
        const throwDist = this.velocity * 24;
        const target = this.clampScrollLeft(
          this.scroller.scrollLeft + throwDist
        );
        this.lenis.scrollTo(target, {
          lock: false,
          force: true,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      }
      return;
    }

    const decay = 0.92;
    const minVel = 0.2;
    const step = () => {
      const next = this.clampScrollLeft(
        this.scroller.scrollLeft + this.velocity
      );
      this.scroller.scrollLeft = next;
      this.velocity *= decay;
      const atEdge = next <= 0 || next >= this.maxScroll();
      if (Math.abs(this.velocity) < minVel || atEdge) {
        this.inertiaId = 0;
        return;
      }
      this.inertiaId = requestAnimationFrame(step);
    };
    if (Math.abs(this.velocity) >= minVel) {
      this.inertiaId = requestAnimationFrame(step);
    }
  };

  Slider.prototype.onPointerDown = function (e) {
    const total = this.scroller.scrollWidth;
    const visible = this.scroller.clientWidth;
    const scrollable = total > visible + 1;
    if (!scrollable) return;

    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.maybeDrag = true;
    this.dragging = false;
    this.didDrag = false;
    this.startX = e.clientX;
    this.startScroll = this.scroller.scrollLeft;
    this.lastX = e.clientX;
    this.lastT = performance.now();
    this.velocity = 0;
  };

  Slider.prototype.onPointerMove = function (e) {
    if (!this.maybeDrag && !this.dragging) return;
    const dxFromStart = e.clientX - this.startX;
    if (!this.dragging) {
      if (Math.abs(dxFromStart) >= 6) {
        this.startDrag(e);
      } else {
        return;
      }
    }
    const now = performance.now();
    const dx = e.clientX - this.lastX;
    const dt = Math.max(1, now - this.lastT);
    this.scroller.scrollLeft = this.clampScrollLeft(
      this.startScroll - (e.clientX - this.startX)
    );
    this.velocity = -(dx / dt) * 16;
    this.lastX = e.clientX;
    this.lastT = now;
  };
  Slider.prototype.onPointerUp = function (e) {
    if (this.dragging) this.endDrag(e);
    this.maybeDrag = false;
    setTimeout(() => {
      this.didDrag = false;
    }, 0);
  };
  Slider.prototype.onPointerCancel = function () {
    if (this.dragging) {
      this.dragging = false;
      this.scroller.classList.remove("is-dragging");
      this.scroller.style.userSelect = "";
      this.stopInertia();
      if (this.lenis) this.lenis.start();
    }
    this.maybeDrag = false;
    setTimeout(() => {
      this.didDrag = false;
    }, 0);
  };

  Slider.prototype.trackMetrics = function () {
    const trackWidth = this.scrollTrack ? this.scrollTrack.clientWidth : 0;
    const barWidth = this.scrollBar
      ? this.scrollBar.getBoundingClientRect().width
      : 0;
    const maxX = Math.max(0, trackWidth - barWidth);
    const m = Math.max(1, this.maxScroll());
    return { trackWidth, barWidth, maxX, m };
  };

  Slider.prototype.setScrollFromTrackX = function (x) {
    const { maxX, m } = this.trackMetrics();
    const nx = Math.min(Math.max(x, 0), maxX);
    if (this.scrollBar) {
      this.scrollBar.style.transform = `translateX(${nx}px)`;
    }
    const progress = maxX === 0 ? 0 : nx / maxX;
    const target = progress * m;
    this.scroller.scrollLeft = target;
    this.updateButtons();
  };

  Slider.prototype.onBarPointerDown = function (e) {
    if (!this.scrollTrack || !this.scrollBar) return;

    if (e.pointerType === "mouse" && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    if (this.lenis) this.lenis.stop();
    this.scrollBar.setPointerCapture(e.pointerId);
    this.draggingBar = true;
    this.scrollBar.style.cursor = "grabbing";
    this.scrollTrack.style.cursor = "grabbing";
    const barRect = this.scrollBar.getBoundingClientRect();
    this.barOffsetX = e.clientX - barRect.left;
  };
  Slider.prototype.onBarPointerMove = function (e) {
    if (!this.draggingBar) return;
    if (!this.scrollTrack) return;

    e.preventDefault();
    const trackRect = this.scrollTrack.getBoundingClientRect();
    const x = e.clientX - trackRect.left - this.barOffsetX;
    this.setScrollFromTrackX(x);
  };
  Slider.prototype.onBarPointerUp = function (e) {
    if (!this.draggingBar) return;
    this.draggingBar = false;
    if (this.lenis) this.lenis.start();

    if (this.scrollBar) this.scrollBar.style.cursor = "grab";
    if (this.scrollTrack) this.scrollTrack.style.cursor = "pointer";
    if (this.scrollBar && e.pointerId != null)
      this.scrollBar.releasePointerCapture(e.pointerId);

    this.updateScrollbar();
  };
  Slider.prototype.onTrackPointerDown = function (e) {
    if (!this.scrollTrack || !this.scrollBar) return;

    if (e.target === this.scrollBar) return;

    e.preventDefault();

    const rect = this.scrollTrack.getBoundingClientRect();
    const barWidth = this.scrollBar.getBoundingClientRect().width;
    const x = e.clientX - rect.left - barWidth / 2;
    this.setScrollFromTrackX(x);
    this.onBarPointerDown({
      ...e,
      clientX: e.clientX,
      target: this.scrollBar,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      preventDefault: () => {},
      stopPropagation: () => {},
    });
    this.barOffsetX = barWidth / 2;
  };

  Slider.prototype.detectLinksInItems = function () {
    if (!this.conf.item) return false;
    const selector = `${this.conf.item} a[href]`;
    return !!this.list.querySelector(selector);
  };
  Slider.prototype.clearCursorBindings = function () {
    this.cursorBindings.forEach(({ el, type, fn }) =>
      el.removeEventListener(type, fn)
    );
    this.cursorBindings = [];
  };

  Slider.prototype.setupCursorMode = function () {
    this.clearCursorBindings();

    const total = this.scroller.scrollWidth;
    const visible = this.scroller.clientWidth;
    const scrollable = total > visible + 1;

    if (!scrollable) {
      this.scroller.style.cursor = "";
      return;
    }

    const canHover = this.mq.matches;
    if (!canHover) {
      this.scroller.style.cursor = "";
      return;
    }
    this.hasLinks = this.detectLinksInItems();
    if (this.hasLinks) {
      this.scroller.style.cursor = "";
      return;
    }
    const onEnter = () => {
      if (!this.scroller.classList.contains("is-dragging")) {
        this.scroller.style.cursor = "grab";
      }
    };
    const onLeave = () => {
      this.scroller.style.cursor = "";
    };
    this.scroller.addEventListener("mouseenter", onEnter);
    this.scroller.addEventListener("mouseleave", onLeave);
    this.cursorBindings.push({
      el: this.scroller,
      type: "mouseenter",
      fn: onEnter,
    });
    this.cursorBindings.push({
      el: this.scroller,
      type: "mouseleave",
      fn: onLeave,
    });
  };

  Slider.prototype.captureBasePaddingBottomOnce = function () {
    if (this._basePaddingCaptured) return;
    const cs = getComputedStyle(this.scroller);
    const pb = parseFloat(cs.paddingBottom || "0") || 0;
    this._basePaddingBottomPx = pb;
    this._basePaddingCaptured = true;
  };

  Slider.prototype.applyIOSScrollIndicatorMask = function () {
    const isDesktop = this.mq.matches;

    if (!this._basePaddingCaptured) this.captureBasePaddingBottomOnce();

    if (isDesktop) {
      this.scroller.style.removeProperty("--rt-slider-mask-bg");
      this.scroller.style.removeProperty("--rt-slider-mask-h");
      this.scroller.style.removeProperty("--rt-slider-base-pb");
      return;
    }

    const bg = findNearestOpaqueBgColor(this.scroller);

    this.scroller.style.setProperty("--rt-slider-mask-bg", bg);
    this.scroller.style.setProperty("--rt-slider-mask-h", "12px");
    this.scroller.style.setProperty(
      "--rt-slider-base-pb",
      (this._basePaddingBottomPx || 0) + "px"
    );
  };

  Slider.prototype.applyListStyles = function () {
    const listUID = assignUID(this.list, "data-rt-ss-id");
    const scrollerUID = assignUID(this.scroller, "data-rt-ss-scroller-id");

    const isDesktop = this.mq.matches;

    let scrollbarStyles = "";

    if (this.scrollTrack && this.scrollBar) {
      const trackUID = assignUID(this.scrollTrack, "data-rt-track-id");
      const barUID = assignUID(this.scrollBar, "data-rt-bar-id");

      if (isDesktop) {
        scrollbarStyles =
          `[data-rt-track-id="${trackUID}"]{position:relative; touch-action:none; overflow: visible !important;}` +
          `[data-rt-track-id="${trackUID}"]::before{content:'';position:absolute;top:-30px;bottom:-30px;left:0;right:0;z-index:0; cursor:pointer; pointer-events:auto;}` +
          `[data-rt-bar-id="${barUID}"]{position:relative; z-index:2; touch-action:none;}` +
          `[data-rt-bar-id="${barUID}"]::after{content:'';position:absolute;top:-30px;bottom:-30px;left:0;right:0;z-index:3; cursor:grab; pointer-events:auto;}`;
      } else {
        scrollbarStyles =
          `[data-rt-track-id="${trackUID}"]{position:relative; touch-action:auto; overflow: visible !important; pointer-events:none !important; user-select:none !important;}` +
          `[data-rt-track-id="${trackUID}"]::before{content:'';position:absolute;top:-30px;bottom:-30px;left:0;right:0;z-index:0; pointer-events:none !important;}` +
          `[data-rt-bar-id="${barUID}"]{position:relative; z-index:2; touch-action:auto; pointer-events:none !important; user-select:none !important;}` +
          `[data-rt-bar-id="${barUID}"]::after{content:'';position:absolute;top:-30px;bottom:-30px;left:0;right:0;z-index:3; pointer-events:none !important;}`;
      }
    }

    const hideNativeScrollbarCSS =
      `[data-rt-ss-id="${listUID}"]::-webkit-scrollbar{width:0 !important;height:0 !important;display:none !important;background:transparent !important;}` +
      `[data-rt-ss-id="${listUID}"]::-webkit-scrollbar-thumb{background:transparent !important;}` +
      `[data-rt-ss-id="${listUID}"]::-webkit-scrollbar-track{background:transparent !important;}` +
      `[data-rt-ss-id="${listUID}"]{scrollbar-width:none !important;-ms-overflow-style:none !important;}` +
      `[data-rt-ss-scroller-id="${scrollerUID}"]::-webkit-scrollbar{width:0 !important;height:0 !important;display:none !important;background:transparent !important;}` +
      `[data-rt-ss-scroller-id="${scrollerUID}"]::-webkit-scrollbar-thumb{background:transparent !important;}` +
      `[data-rt-ss-scroller-id="${scrollerUID}"]::-webkit-scrollbar-track{background:transparent !important;}` +
      `[data-rt-ss-scroller-id="${scrollerUID}"]{scrollbar-width:none !important;-ms-overflow-style:none !important;}`;

    const iosMaskCSS = isDesktop
      ? ""
      : `[data-rt-ss-scroller-id="${scrollerUID}"]{position:relative;padding-bottom:calc(var(--rt-slider-base-pb, 0px) + var(--rt-slider-mask-h, 12px));}` +
        `[data-rt-ss-scroller-id="${scrollerUID}"]::after{content:'';position:absolute;left:0;right:0;bottom:0;height:var(--rt-slider-mask-h, 12px);pointer-events:none;z-index:2147483647;background:var(--rt-slider-mask-bg, transparent);}`;

    injectOnce(
      "rt-ss-" + listUID,
      hideNativeScrollbarCSS +
        `[data-rt-ss-scroller-id="${scrollerUID}"].is-dragging{cursor:grabbing !important;user-select:none}` +
        `[data-rt-ss-id="${listUID}"].is-dragging{cursor:grabbing !important;user-select:none}` +
        `[data-rt-ss-id="${listUID}"] img,[data-rt-ss-id="${listUID}"] a,[data-rt-ss-id="${listUID}"] ${this.conf.item}{user-select:none;-webkit-user-drag:none}` +
        scrollbarStyles +
        iosMaskCSS
    );
  };

  Slider.prototype.onResize = function () {
    this.stopInertia();
    this.rafUpdate();
    this.setupCursorMode();
    this.applyIOSScrollIndicatorMask();
  };
  Slider.prototype.onClickCapture = function (e) {
    const a = e.target.closest("a");
    if (!a) return;
    if (this.didDrag) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  Slider.prototype.getLenisOptions = function () {
    var prefix = "data-rt-slider-";
    var el = this.root;
    var getAttr = function (name) {
      return el.getAttribute(prefix + name);
    };

    var options = {
      wrapper: this.scroller,
      content: this.list,
      orientation: "horizontal",
      gestureOrientation: "horizontal",
      smoothWheel: true,
      syncTouch: false,
    };

    var lerp = parseNum(getAttr("lerp"), undefined);
    var duration = parseNum(getAttr("duration"), undefined);
    var easing = parseStr(getAttr("easing"), "");
    var easingFn = parseEasing(easing);

    if (lerp !== undefined) options.lerp = lerp;
    else if (duration !== undefined) options.duration = duration;

    if (easingFn) options.easing = easingFn;

    var orientation = parseStr(getAttr("orientation"), "");
    if (orientation) options.orientation = orientation;

    var gestureOrientation = parseStr(getAttr("gesture-orientation"), "");
    if (gestureOrientation) options.gestureOrientation = gestureOrientation;

    var smoothWheel = getAttr("smooth-wheel");
    if (smoothWheel !== null)
      options.smoothWheel = parseBool(smoothWheel, true);

    var wheelMultiplier = parseNum(getAttr("wheel-multiplier"), undefined);
    if (wheelMultiplier !== undefined)
      options.wheelMultiplier = wheelMultiplier;

    var touchMultiplier = parseNum(getAttr("touch-multiplier"), undefined);
    if (touchMultiplier !== undefined)
      options.touchMultiplier = touchMultiplier;

    var infinite = parseBool(getAttr("infinite"), false);
    if (infinite) options.infinite = true;

    var autoResize = parseBool(getAttr("auto-resize"), true);
    if (autoResize === false) options.autoResize = false;

    var jsonStr = getAttr("options-json");
    if (jsonStr) {
      try {
        var jsonOpts = JSON.parse(jsonStr);
        if (jsonOpts && typeof jsonOpts === "object") {
          for (var key in jsonOpts) {
            options[key] = jsonOpts[key];
          }
        }
      } catch (e) {}
    }

    return options;
  };

  Slider.prototype.setupLenisInstance = function () {
    if (!this.mq.matches) return;

    if (this.lenis) return;
    var options = this.getLenisOptions();
    this.lenis = new window.Lenis(options);
    const raf = (time) => {
      this.lenis.raf(time);
      this.lenisRafId = requestAnimationFrame(raf);
    };
    this.lenisRafId = requestAnimationFrame(raf);
  };

  Slider.prototype.bindEvents = function () {
    this.scroller.addEventListener(
      "scroll",
      (this._onScroll = this.onScroll.bind(this)),
      { passive: true }
    );
    window.addEventListener(
      "resize",
      (this._onResize = this.onResize.bind(this))
    );

    if (this.mq.matches) {
      this.scroller.addEventListener(
        "pointerdown",
        (this._onPD = this.onPointerDown.bind(this))
      );
      this.scroller.addEventListener(
        "pointermove",
        (this._onPM = this.onPointerMove.bind(this))
      );
      this.scroller.addEventListener(
        "pointerup",
        (this._onPU = this.onPointerUp.bind(this))
      );
      this.scroller.addEventListener(
        "pointercancel",
        (this._onPC = this.onPointerCancel.bind(this))
      );
      this.scroller.addEventListener(
        "pointerleave",
        (this._onPL = this.onPointerCancel.bind(this))
      );
      this.scroller.addEventListener(
        "click",
        (this._onClickCap = this.onClickCapture.bind(this)),
        true
      );
    }

    if (this.btnPrev)
      this.btnPrev.addEventListener(
        "click",
        (this._onPrev = this.onPrevClick.bind(this))
      );
    if (this.btnNext)
      this.btnNext.addEventListener(
        "click",
        (this._onNext = this.onNextClick.bind(this))
      );

    if (this.mq.matches) {
      if (this.scrollBar) {
        this.scrollBar.style.touchAction = "none";
        this.scrollBar.style.cursor = "grab";
        this.scrollBar.addEventListener(
          "pointerdown",
          (this._onBPD = this.onBarPointerDown.bind(this))
        );
        this.scrollBar.addEventListener(
          "pointermove",
          (this._onBPM = this.onBarPointerMove.bind(this))
        );
        this.scrollBar.addEventListener(
          "pointerup",
          (this._onBPU = this.onBarPointerUp.bind(this))
        );
        this.scrollBar.addEventListener(
          "pointercancel",
          (this._onBPC = this.onBarPointerUp.bind(this))
        );
        this.scrollBar.addEventListener(
          "pointerleave",
          (this._onBPL = this.onBarPointerUp.bind(this))
        );
      }

      if (this.scrollTrack) {
        this.scrollTrack.style.userSelect = "none";
        this.scrollTrack.style.cursor = "pointer";
        this.scrollTrack.style.touchAction = "none";
        this.scrollTrack.addEventListener(
          "pointerdown",
          (this._onTPD = this.onTrackPointerDown.bind(this))
        );
      }
    } else {
      if (this.scrollBar) {
        this.scrollBar.style.touchAction = "";
        this.scrollBar.style.cursor = "";
      }
      if (this.scrollTrack) {
        this.scrollTrack.style.userSelect = "";
        this.scrollTrack.style.cursor = "";
        this.scrollTrack.style.touchAction = "";
      }
    }

    this._onMQ = () => {
      this.applyIOSScrollIndicatorMask();
      this.applyListStyles();
      this.setupCursorMode();
    };
    if (this.mq.addEventListener)
      this.mq.addEventListener("change", this._onMQ);
    else if (this.mq.addListener) this.mq.addListener(this._onMQ);

    const imgs = Array.from(this.list.querySelectorAll("img"));
    imgs.forEach((img) => {
      if (img.complete) return;
      const onL = () => {
        this.rafUpdate();
        this.setupCursorMode();
        this.applyIOSScrollIndicatorMask();
      };
      const onE = () => {
        this.rafUpdate();
        this.setupCursorMode();
        this.applyIOSScrollIndicatorMask();
      };
      img.addEventListener("load", onL, { once: true });
      img.addEventListener("error", onE, { once: true });
      this.imgHandlers.push({ img, onL, onE });
    });

    if (this.ro) {
      this.ro.observe(this.list);
      this.ro.observe(this.scroller);
      if (this.scrollTrack) this.ro.observe(this.scrollTrack);
    }
    window.addEventListener("pagehide", (this._onPH = this.destroy.bind(this)));
    window.addEventListener(
      "beforeunload",
      (this._onBU = this.destroy.bind(this))
    );
  };

  Slider.prototype.init = function () {
    this.captureBasePaddingBottomOnce();
    this.applyIOSScrollIndicatorMask();
    this.applyListStyles();

    if (this.mq.matches) {
      loadLenis()
        .then(() => {
          this.setupLenisInstance();
        })
        .catch((err) => {
          console.warn(
            "[Slider] Lenis load failed, falling back to native.",
            err
          );
        });
    }

    this.rafUpdate();
    window.addEventListener(
      "load",
      (this._onWL = () => {
        this.rafUpdate();
        this.applyIOSScrollIndicatorMask();
        this.applyListStyles();
      })
    );
    this.setupCursorMode();
    this.bindEvents();
  };

  Slider.prototype.destroy = function () {
    this.stopInertia();
    window.rtSliders = window.rtSliders.filter((s) => s !== this);

    if (this.lenis) {
      this.lenis.destroy();
      this.lenis = null;
    }
    if (this.lenisRafId) {
      cancelAnimationFrame(this.lenisRafId);
      this.lenisRafId = null;
    }
    if (this._onScroll)
      this.scroller.removeEventListener("scroll", this._onScroll);
    if (this._onResize) window.removeEventListener("resize", this._onResize);
    if (this._onPD)
      this.scroller.removeEventListener("pointerdown", this._onPD);
    if (this._onPM)
      this.scroller.removeEventListener("pointermove", this._onPM);
    if (this._onPU) this.scroller.removeEventListener("pointerup", this._onPU);
    if (this._onPC)
      this.scroller.removeEventListener("pointercancel", this._onPC);
    if (this._onPL)
      this.scroller.removeEventListener("pointerleave", this._onPL);
    if (this._onClickCap)
      this.scroller.removeEventListener("click", this._onClickCap, true);
    if (this._onPrev && this.btnPrev)
      this.btnPrev.removeEventListener("click", this._onPrev);
    if (this._onNext && this.btnNext)
      this.btnNext.removeEventListener("click", this._onNext);

    if (this.scrollBar) {
      if (this._onBPD)
        this.scrollBar.removeEventListener("pointerdown", this._onBPD);
      if (this._onBPM)
        this.scrollBar.removeEventListener("pointermove", this._onBPM);
      if (this._onBPU)
        this.scrollBar.removeEventListener("pointerup", this._onBPU);
      if (this._onBPC)
        this.scrollBar.removeEventListener("pointercancel", this._onBPC);
      if (this._onBPL)
        this.scrollBar.removeEventListener("pointerleave", this._onBPL);
    }
    if (this.scrollTrack && this._onTPD)
      this.scrollTrack.removeEventListener("pointerdown", this._onTPD);
    if (this.mq.removeEventListener && this._onMQ)
      this.mq.removeEventListener("change", this._onMQ);
    else if (this.mq.removeListener && this._onMQ)
      this.mq.removeListener(this._onMQ);
    if (this._onWL) window.removeEventListener("load", this._onWL);
    if (this._onPH) window.removeEventListener("pagehide", this._onPH);
    if (this._onBU) window.removeEventListener("beforeunload", this._onBU);
    this.imgHandlers.forEach(({ img, onL, onE }) => {
      img.removeEventListener("load", onL);
      img.removeEventListener("error", onE);
    });
    this.imgHandlers = [];
    this.clearCursorBindings();
    this.scroller.style.cursor = "";
    this.scroller.style.removeProperty("--rt-slider-mask-bg");
    this.scroller.style.removeProperty("--rt-slider-mask-h");
    this.scroller.style.removeProperty("--rt-slider-base-pb");
    if (this.ro) this.ro.disconnect();
  };

  function initAll() {
    const roots = document.querySelectorAll("[data-rt-slider]");
    const instances = [];
    roots.forEach((root) => {
      const inst = new Slider(root);
      if (inst.valid) instances.push(inst);
    });
    return instances;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initAll();
    });
  } else {
    initAll();
  }
})();
