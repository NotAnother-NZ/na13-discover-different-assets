(() => {
  const DEBUG_FLAGS = {
    ENABLE_SCROLL_RESET: true,
    ENABLE_THEME_COLORS: true,
    ENABLE_SIZE_ANIM: true,
    ENABLE_BORDER_FIX: true,
    DEBUG_SHOW_BORDERS: false,
  };

  const REGION_OPEN_DELAY = 150;
  const LOGO_RESIZE_DURATION = 150;
  const TRIGGER_POINT_OFFSET = 0;
  const THEME_RESTORE_DELAY = 800;

  const TOP_THRESHOLD_PX = 16;
  const TRANSITION_SETTINGS = "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
  const TOPBAR_BORDER_WIDTH = ".09375rem";
  const TOPBAR_BORDER_STYLE = "solid";
  const TOPBAR_BORDER_COLOR = "var(--swatches--black)";

  const VARS = {
    logoStart: "var(--animation--logo-font-size-desktop-start)",
    logoEnd: "var(--animation--logo-font-size-desktop-end)",
  };

  if (DEBUG_FLAGS.ENABLE_SCROLL_RESET) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }

  const nav = document.querySelector("#nav");
  const topbar = document.querySelector("#topbar");

  const bottombar =
    document.querySelector("#bottombar") ||
    document.querySelector(".bottombar");

  const logotypes = document.querySelectorAll(".logotype");
  const savedWrapper = document.querySelector("#saved-number-wrapper");
  const savedText = document.querySelector("#saved-number-text");

  const savedWrapperMobile = document.querySelector(
    "#saved-number-wrapper-mobile",
  );
  const savedTextMobile = document.querySelector("#saved-number-text-mobile");

  const hamSticks = document.querySelectorAll(".ham-stick");

  const bgTargets = Array.from(
    document.querySelectorAll("[data-nav-bg]"),
  ).filter((el) => {
    if (nav && nav.contains(el)) return false;
    if (bottombar && bottombar.contains(el)) return false;
    return true;
  });

  let bgRanges = [];

  const bgMap = {
    transparent: "var(--utility-swatches--transparent)",
    green: "var(--swatches--green)",
    white: "var(--swatches--white)",
    bone: "var(--swatches--bone)",
  };

  const navTextColorMap = {
    transparent: "var(--swatches--green)",
    white: "var(--swatches--black)",
    green: "var(--swatches--black)",
    bone: "var(--swatches--black)",
  };

  const savedWrapperBgMap = {
    transparent: "var(--swatches--green)",
    green: "var(--swatches--black)",
    white: "var(--swatches--black)",
    bone: "var(--swatches--black)",
  };

  const savedTextColorMap = {
    transparent: "var(--swatches--black)",
    green: "var(--swatches--green)",
    white: "var(--swatches--white)",
    bone: "var(--swatches--white)",
  };

  const hamStickBgMap = {
    transparent: "var(--swatches--green)",
    green: "var(--swatches--black)",
    white: "var(--swatches--black)",
    bone: "var(--swatches--black)",
  };

  const topbarBorderMap = {
    transparent: `${TOPBAR_BORDER_WIDTH} ${TOPBAR_BORDER_STYLE} transparent`,
    green: `${TOPBAR_BORDER_WIDTH} ${TOPBAR_BORDER_STYLE} ${TOPBAR_BORDER_COLOR}`,
    white: `${TOPBAR_BORDER_WIDTH} ${TOPBAR_BORDER_STYLE} ${TOPBAR_BORDER_COLOR}`,
    bone: `${TOPBAR_BORDER_WIDTH} ${TOPBAR_BORDER_STYLE} ${TOPBAR_BORDER_COLOR}`,
  };

  if (DEBUG_FLAGS.DEBUG_SHOW_BORDERS) {
    [nav, topbar, document.querySelector(".global-grid-12")].forEach((el) => {
      if (el) el.style.outline = "1px solid red";
    });
  }

  const getLenisInstance = () => {
    if (
      window.rtSmoothScroll &&
      typeof window.rtSmoothScroll.get === "function"
    ) {
      const instance = window.rtSmoothScroll.get("root");
      if (instance) return instance;
    }
    if (window.lenis) return window.lenis;
    return null;
  };

  const getScrollY = () => {
    const lenis = getLenisInstance();
    return lenis && typeof lenis.scroll === "number"
      ? lenis.scroll
      : window.scrollY || 0;
  };

  const lenisAtStart = getLenisInstance();
  if (DEBUG_FLAGS.ENABLE_SCROLL_RESET && lenisAtStart) {
    lenisAtStart.scrollTo(0, { immediate: true, force: true });
  }

  let lastScrollY = getScrollY();
  let activeBg = null;
  let hasTriggeredTop = false;
  let isNavCompact = false;

  let isRegionOpen = false;

  const isDesktopWithCursor = () => {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  };

  const lockAllScroll = () => {
    if (typeof window.disableScroll === "function") {
      window.disableScroll();
    }
    if (
      window.rtSmoothScroll &&
      typeof window.rtSmoothScroll.ids === "function"
    ) {
      window.rtSmoothScroll.ids().forEach((id) => {
        const instance = window.rtSmoothScroll.get(id);
        if (instance && typeof instance.stop === "function") instance.stop();
      });
    }
    if (window.lenis && typeof window.lenis.stop === "function")
      window.lenis.stop();

    if (window.rtSliders && Array.isArray(window.rtSliders)) {
      window.rtSliders.forEach((slider) => {
        if (slider.lenis && typeof slider.lenis.stop === "function") {
          slider.lenis.stop();
        }
      });
    }
  };

  const unlockAllScroll = () => {
    if (typeof window.enableScroll === "function") {
      window.enableScroll();
    }
    if (
      window.rtSmoothScroll &&
      typeof window.rtSmoothScroll.ids === "function"
    ) {
      window.rtSmoothScroll.ids().forEach((id) => {
        const instance = window.rtSmoothScroll.get(id);
        if (instance && typeof instance.start === "function") instance.start();
      });
    }
    if (window.lenis && typeof window.lenis.start === "function")
      window.lenis.start();

    if (window.rtSliders && Array.isArray(window.rtSliders)) {
      window.rtSliders.forEach((slider) => {
        if (slider.lenis && typeof slider.lenis.start === "function") {
          slider.lenis.start();
        }
      });
    }
  };

  const clampNumber = (v, min, max) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  const computeStableProbePx = () => {
    const fallback = 96;
    const target = topbar || nav;
    if (!target) return fallback;

    const rect = target.getBoundingClientRect();
    const h = rect && Number.isFinite(rect.height) ? rect.height : fallback;

    const probe = Math.floor(h) - TRIGGER_POINT_OFFSET;
    return clampNumber(probe, 10, 220);
  };

  let stableProbePx = computeStableProbePx();
  const getProbeY = () => stableProbePx;

  const getProbePoint = () => {
    const xFallback = Math.floor(window.innerWidth / 2);
    const yFallback = 1;

    const target = topbar || nav;

    if (!target) {
      return {
        x: clampNumber(xFallback, 1, Math.max(1, window.innerWidth - 2)),
        y: yFallback,
      };
    }

    const rect = target.getBoundingClientRect();
    const x = clampNumber(
      Math.floor(rect.left + rect.width / 2),
      1,
      Math.max(1, window.innerWidth - 2),
    );

    const y = clampNumber(
      Math.floor(rect.bottom) - TRIGGER_POINT_OFFSET,
      1,
      Math.max(1, window.innerHeight - 2),
    );
    return { x, y };
  };

  const rebuildBgRanges = (scrollY) => {
    const y = typeof scrollY === "number" ? scrollY : getScrollY();
    const ranges = [];

    for (const el of bgTargets) {
      if (!el || el.nodeType !== 1) continue;
      const rect = el.getBoundingClientRect();
      if (!rect || !Number.isFinite(rect.top) || !Number.isFinite(rect.bottom))
        continue;
      const h = rect.height;
      if (!Number.isFinite(h) || h <= 1) continue;

      const top = rect.top + y;
      const bottom = rect.bottom + y;
      if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top)
        continue;

      ranges.push({ el, top, bottom });
    }

    ranges.sort((a, b) => a.top - b.top);
    bgRanges = ranges;
  };

  const findClosestBgElFromNode = (node) => {
    let el = node && node.nodeType === 1 ? node : null;
    while (el) {
      if (el === nav) return null;
      if (bottombar && el === bottombar) return null;
      if (nav && nav.contains(el)) return null;

      if (el.hasAttribute && el.hasAttribute("data-nav-bg")) return el;
      el = el.parentElement;
    }
    return null;
  };

  const viewRegionsBtn = document.querySelector("#view-regions");
  const viewRegionsArrow = document.querySelector("#view-regions-arrow");
  const navOpenDesktopBtn = document.querySelector("#nav-open-desktop");
  const navCloseDesktopBtn = document.querySelector("#nav-close-desktop");
  const navOverlay = document.querySelector("#nav-overlay");
  const hamWrapper = document.querySelector("#ham-wrapper");

  const getActiveBgTarget = (dir, scrollY) => {
    const point = getProbePoint();

    if (typeof document.elementsFromPoint === "function") {
      const stack = document.elementsFromPoint(point.x, point.y) || [];

      for (const hit of stack) {
        if (bottombar) {
          if (hit === bottombar) continue;
          if (bottombar.contains(hit)) continue;
        }
        if (navOverlay && (hit === navOverlay || navOverlay.contains(hit)))
          continue;

        const bgEl = findClosestBgElFromNode(hit);
        if (bgEl) return bgEl;
      }
    } else if (typeof document.elementFromPoint === "function") {
      const hit = document.elementFromPoint(point.x, point.y);
      const bgEl = findClosestBgElFromNode(hit);
      if (bgEl) return bgEl;
    }

    const probeY = getProbeY();
    const docProbeY = scrollY + probeY;

    for (const item of bgRanges) {
      if (docProbeY >= item.top && docProbeY < item.bottom) return item.el;
    }

    let prev = null;
    let next = null;

    for (const item of bgRanges) {
      if (item.bottom <= docProbeY) prev = item.el;
      if (!next && item.top > docProbeY) next = item.el;
    }

    if (dir < 0) return prev || next || null;
    return next || prev || null;
  };

  const applyTheme = (bg) => {
    if (!DEBUG_FLAGS.ENABLE_THEME_COLORS) return;
    if (!nav) return;

    const navBgColor = bgMap[bg];
    const navTextColor = navTextColorMap[bg];
    const savedWrapperBg = savedWrapperBgMap[bg];
    const savedTextColor = savedTextColorMap[bg];
    const hamStickBg = hamStickBgMap[bg];
    const topbarBorder = topbarBorderMap[bg];

    if (!navBgColor || !navTextColor) return;

    if (topbar) {
      topbar.style.backgroundColor = navBgColor;
      topbar.style.color = navTextColor;
      if (topbarBorder) {
        topbar.style.borderBottom = topbarBorder;
      }
    }

    if (savedWrapper && savedWrapperBg)
      savedWrapper.style.backgroundColor = savedWrapperBg;
    if (savedText && savedTextColor) savedText.style.color = savedTextColor;

    if (savedWrapperMobile && savedWrapperBg)
      savedWrapperMobile.style.backgroundColor = savedWrapperBg;
    if (savedTextMobile && savedTextColor)
      savedTextMobile.style.color = savedTextColor;

    if (hamSticks && hamSticks.length && hamStickBg) {
      hamSticks.forEach((stick) => {
        if (stick) stick.style.backgroundColor = hamStickBg;
      });
    }

    if (DEBUG_FLAGS.ENABLE_BORDER_FIX) {
      const isTransparent = bg === "transparent";
      [nav].forEach((el) => {
        if (!el) return;
        if (isTransparent) {
          el.style.borderColor = "transparent";
          el.style.boxShadow = "none";
        } else {
          el.style.borderColor = "";
          el.style.boxShadow = "";
        }
      });

      if (topbar) {
        if (isTransparent) {
          topbar.style.boxShadow = "none";
        } else {
          topbar.style.boxShadow = "";
        }
      }
    }
  };

  const initSizeAnim = () => {
    if (!DEBUG_FLAGS.ENABLE_SIZE_ANIM) return;
    if (logotypes.length) {
      if (isDesktopWithCursor()) {
        logotypes.forEach((logo) => {
          logo.style.transition = TRANSITION_SETTINGS;
        });
      } else {
        logotypes.forEach((logo) => {
          logo.style.transition = "";
        });
      }
    }
  };

  const applySizeState = () => {
    if (!DEBUG_FLAGS.ENABLE_SIZE_ANIM) return;
    if (logotypes.length) {
      if (isDesktopWithCursor()) {
        logotypes.forEach((logo) => {
          logo.style.fontSize = isNavCompact ? VARS.logoEnd : VARS.logoStart;
        });
      } else {
        logotypes.forEach((logo) => {
          logo.style.fontSize = "";
        });
      }
    }
  };

  const updateNavSize = (shouldBeCompact) => {
    if (!DEBUG_FLAGS.ENABLE_SIZE_ANIM) return;
    if (shouldBeCompact === isNavCompact) return;

    isNavCompact = shouldBeCompact;
    applySizeState();

    requestAnimationFrame(() => {
      stableProbePx = computeStableProbePx();
      rebuildBgRanges(getScrollY());
    });
  };

  const updateThemeFromScroll = (dir, scrollY) => {
    const activeTarget = getActiveBgTarget(dir, scrollY);
    if (!activeTarget) return;

    const bg = activeTarget.getAttribute("data-nav-bg");
    if (!bg || bg === activeBg) return;

    applyTheme(bg);
    activeBg = bg;
  };

  const handleTopTrigger = (scrollY) => {
    const isAtTop = scrollY <= TOP_THRESHOLD_PX;

    const isTransparent = activeBg === "transparent";

    if (isAtTop && isTransparent) {
      updateNavSize(false);
      if (!hasTriggeredTop) {
        hasTriggeredTop = true;

        if (
          isDesktopWithCursor() &&
          typeof window.playLogoHoverOnce === "function"
        ) {
          window.playLogoHoverOnce();
        }
      }
    } else {
      hasTriggeredTop = false;
      updateNavSize(true);
    }
  };

  const tick = (scrollY, explicitDir) => {
    const dir =
      typeof explicitDir === "number"
        ? explicitDir
        : scrollY > lastScrollY
          ? 1
          : scrollY < lastScrollY
            ? -1
            : 0;

    updateThemeFromScroll(dir, scrollY);
    handleTopTrigger(scrollY);
    lastScrollY = scrollY;
  };

  if (viewRegionsArrow) {
    viewRegionsArrow.style.transition = "transform 0.3s ease";
  }

  const delayedThemeRestore = () => {
    setTimeout(() => {
      if (!isRegionOpen) {
        stableProbePx = computeStableProbePx();

        const currentY = getScrollY();
        rebuildBgRanges(currentY);
        updateThemeFromScroll(0, currentY);
      }
    }, THEME_RESTORE_DELAY);
  };

  const animateNavCardsIn = () => {
    setTimeout(() => {
      const cards = [1, 2, 3, 4, 5, 6];
      cards.forEach((id, index) => {
        setTimeout(() => {
          if (
            window.rt &&
            window.rt.scramble &&
            typeof window.rt.scramble.play === "function"
          ) {
            window.rt.scramble.play(`nav-card-${id}`);
          }
        }, index * 150);
      });
    }, 200);
  };

  const animateNavCardsOut = () => {
    const cards = [6, 5, 4, 3, 2, 1];
    cards.forEach((id, index) => {
      setTimeout(() => {
        if (
          window.rt &&
          window.rt.text &&
          typeof window.rt.text.out === "function"
        ) {
          window.rt.text.out(`nav-card-${id}`);
        }
      }, index * 50);
    });
  };

  const closeRegionMenu = () => {
    isRegionOpen = false;

    animateNavCardsOut();

    if (viewRegionsArrow) {
      viewRegionsArrow.style.transform = "rotate(0deg)";
    }

    unlockAllScroll();

    if (navCloseDesktopBtn) {
      navCloseDesktopBtn.click();
    }

    delayedThemeRestore();
  };

  const openRegionMenu = () => {
    isRegionOpen = true;

    if (viewRegionsArrow) {
      viewRegionsArrow.style.transform = "rotate(540deg)";
    }

    lockAllScroll();

    const isAlreadyGreen = activeBg === "green";
    const isAlreadyCompact = isNavCompact === true;

    const doFinalClick = () => {
      setTimeout(() => {
        if (navOpenDesktopBtn) navOpenDesktopBtn.click();
        animateNavCardsIn();
      }, REGION_OPEN_DELAY);
    };

    if (isAlreadyGreen && isAlreadyCompact) {
      doFinalClick();
    } else {
      updateNavSize(true);
      setTimeout(() => {
        applyTheme("green");
        activeBg = "green";
        doFinalClick();
      }, LOGO_RESIZE_DURATION);
    }
  };

  const toggleRegionMenu = () => {
    if (!navOpenDesktopBtn) return;
    if (isRegionOpen) closeRegionMenu();
    else openRegionMenu();
  };

  if (viewRegionsBtn && navOpenDesktopBtn) {
    viewRegionsBtn.addEventListener("click", () => {
      toggleRegionMenu();
    });
  }

  if (hamWrapper && navOpenDesktopBtn) {
    hamWrapper.addEventListener("click", (e) => {
      if (
        viewRegionsBtn &&
        (e.target === viewRegionsBtn || viewRegionsBtn.contains(e.target))
      )
        return;
      toggleRegionMenu();
    });
  }

  const closeMenuFromMobileLink = (clickedNode) => {
    if (!clickedNode) return false;

    const match =
      clickedNode && clickedNode.closest
        ? clickedNode.closest("[data-mobile-menu-link]")
        : null;

    if (!match) return false;

    if (!isRegionOpen) {
      if (navCloseDesktopBtn) navCloseDesktopBtn.click();
      unlockAllScroll();
      delayedThemeRestore();
      return true;
    }

    isRegionOpen = false;
    animateNavCardsOut();
    if (viewRegionsArrow) viewRegionsArrow.style.transform = "rotate(0deg)";
    unlockAllScroll();
    if (navCloseDesktopBtn) navCloseDesktopBtn.click();
    delayedThemeRestore();
    return true;
  };

  document.addEventListener(
    "click",
    (e) => {
      closeMenuFromMobileLink(e.target);
    },
    { passive: true },
  );

  if (navOverlay) {
    navOverlay.addEventListener("click", () => {
      if (isRegionOpen) {
        closeRegionMenu();
      }
    });
  }

  if (navCloseDesktopBtn) {
    navCloseDesktopBtn.addEventListener("click", () => {
      if (isRegionOpen) {
        isRegionOpen = false;
        animateNavCardsOut();
        if (viewRegionsArrow) viewRegionsArrow.style.transform = "rotate(0deg)";
        unlockAllScroll();
        delayedThemeRestore();
      }
    });
  }

  const syncLenis = () => {
    if (
      window.rtSmoothScroll &&
      typeof window.rtSmoothScroll.resize === "function"
    ) {
      window.rtSmoothScroll.resize();
    } else if (window.lenis && typeof window.lenis.resize === "function") {
      window.lenis.resize();
    }
  };

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => {
      syncLenis();
      stableProbePx = computeStableProbePx();
      rebuildBgRanges(getScrollY());
    });
    resizeObserver.observe(document.body);
  }

  window.addEventListener("load", syncLenis);

  initSizeAnim();
  applySizeState();

  const lenis = getLenisInstance();

  rebuildBgRanges(getScrollY());

  if (lenis && typeof lenis.on === "function") {
    lenis.on("scroll", (e) => {
      const scrollY =
        e && typeof e.scroll === "number"
          ? e.scroll
          : typeof lenis.scroll === "number"
            ? lenis.scroll
            : window.scrollY || 0;

      const dir =
        e && typeof e.direction === "number"
          ? e.direction
          : scrollY > lastScrollY
            ? -1
            : 0;

      tick(scrollY, dir);
    });
  } else {
    window.addEventListener(
      "scroll",
      () => {
        tick(window.scrollY || 0);
      },
      { passive: true },
    );
  }

  window.addEventListener(
    "resize",
    () => {
      initSizeAnim();
      applySizeState();

      stableProbePx = computeStableProbePx();
      const y = getScrollY();
      rebuildBgRanges(y);
      tick(y, 0);
      syncLenis();
    },
    { passive: true },
  );

  requestAnimationFrame(() => {
    stableProbePx = computeStableProbePx();
    const initialY = getScrollY();
    rebuildBgRanges(initialY);
    tick(initialY, 0);
    syncLenis();
  });
})();
