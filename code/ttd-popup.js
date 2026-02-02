(function () {
  const CFG = {
    triggerSelector: ".cms-link-wrapper",
    cardRootSelector: ".mason-grid-item",
    payloadSelector: "[popup-content]",
    shellSelector: '[data-ttd-popup-shell="true"]',
    openBtnSelector: "#open-ttd-popup",
    closeBtnSelector: "#close-ttd-popup",
    closeTriggerSelector: "#close-ttd-popup-trigger",
    saveBtnSelector: "#popup-save", // Added selector
    legacyCloseBtnSelector: "#history-back",
    overlayClickSelector: ".fixed-hero-bg-overlay",
    overlayScrollWrapperSelector: ".schema-content-list-wrapper",
    lockClass: "rt-ttd-bg-locked",
    cssKey: "rt-ttd-bg-lock-css",
    dealIconId: "#ttd-popup-deal-icon",
    overlayLenisId: "ttd-popup",
    desktopMinWidth: 992,
    desktopHoverMQ: "(hover: hover) and (pointer: fine)",
  };

  let shellEl = null;
  let openBtnEl = null;

  let isLocked = false;
  let lockedScrollY = 0;

  let wheelListener = null;
  let touchMoveListener = null;
  let keydownListener = null;

  let stickyObserver = null;
  let stickyRaf = 0;

  function isDesktopAllowed() {
    const w = window.innerWidth || 0;
    if (w < CFG.desktopMinWidth) return false;
    if (!window.matchMedia) return true;
    return window.matchMedia(CFG.desktopHoverMQ).matches;
  }

  function injectOnce(key, css) {
    if (document.head.querySelector('[data-rt-injected="' + key + '"]')) return;
    const s = document.createElement("style");
    s.setAttribute("data-rt-injected", key);
    s.textContent = css;
    document.head.appendChild(s);
  }

  function ensureShell() {
    shellEl = document.querySelector(CFG.shellSelector);
    if (!shellEl) {
      console.error("[ttd-popup] Missing popup shell:", CFG.shellSelector);
      return null;
    }
    return shellEl;
  }

  function ensureOpenBtn() {
    openBtnEl = document.querySelector(CFG.openBtnSelector);
    if (!openBtnEl) {
      console.error("[ttd-popup] Missing open trigger:", CFG.openBtnSelector);
      return null;
    }
    return openBtnEl;
  }

  function getOverlayWrapper() {
    return document.querySelector(CFG.overlayScrollWrapperSelector);
  }

  function setOverlayPointerEvents(enabled) {
    const wrapper = getOverlayWrapper();
    if (!wrapper) return;
    wrapper.style.pointerEvents = enabled ? "auto" : "none";
  }

  function getLenisScrollY() {
    try {
      if (window.lenis && typeof window.lenis.scroll === "number")
        return window.lenis.scroll;
    } catch (e) {}
    return window.scrollY || window.pageYOffset || 0;
  }

  function rtHas() {
    return !!(window.rtSmoothScroll && window.rtSmoothScroll.__initialized);
  }

  function rtStop(id) {
    try {
      if (rtHas()) window.rtSmoothScroll.stop(id);
    } catch (e) {}
  }

  function rtStart(id) {
    try {
      if (rtHas()) window.rtSmoothScroll.start(id);
    } catch (e) {}
  }

  function rtResize(id) {
    try {
      if (rtHas()) window.rtSmoothScroll.resize(id);
    } catch (e) {}
  }

  function stopLenisRoot() {
    rtStop("root");
    try {
      if (window.lenis && typeof window.lenis.stop === "function")
        window.lenis.stop();
    } catch (e) {}
  }

  function startLenisRoot() {
    rtStart("root");
    rtResize("root");
    try {
      if (window.lenis && typeof window.lenis.start === "function")
        window.lenis.start();
    } catch (e) {}
  }

  function stopOverlayLenis() {
    rtStop(CFG.overlayLenisId);
  }

  function startOverlayLenis() {
    rtStart(CFG.overlayLenisId);
    rtResize(CFG.overlayLenisId);
  }

  function isEventInsideOverlay(e) {
    const wrapper = getOverlayWrapper();
    if (!wrapper) return false;
    const t = e && e.target ? e.target : null;
    if (!t) return false;
    return !!t.closest(CFG.overlayScrollWrapperSelector);
  }

  function applyBodyFreeze() {
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = "-" + lockedScrollY + "px";
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    const html = document.documentElement;
    html.style.overflow = "hidden";
  }

  function clearBodyFreeze() {
    const body = document.body;
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    body.style.overflow = "";
    const html = document.documentElement;
    html.style.overflow = "";
  }

  function ensureStickyLock() {
    if (!isLocked) return;
    const body = document.body;
    const top = body.style.top || "";
    const pos = body.style.position || "";
    if (pos !== "fixed" || top !== "-" + lockedScrollY + "px")
      applyBodyFreeze();
  }

  function startStickyGuard() {
    if (stickyObserver) return;
    stickyObserver = new MutationObserver(() => {
      if (!isLocked) return;
      if (stickyRaf) cancelAnimationFrame(stickyRaf);
      stickyRaf = requestAnimationFrame(() => {
        stickyRaf = 0;
        ensureStickyLock();
      });
    });
    stickyObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
      subtree: true,
    });
  }

  function stopStickyGuard() {
    if (stickyObserver) {
      try {
        stickyObserver.disconnect();
      } catch (e) {}
      stickyObserver = null;
    }
    if (stickyRaf) {
      cancelAnimationFrame(stickyRaf);
      stickyRaf = 0;
    }
  }

  function addInputGuards() {
    if (wheelListener || touchMoveListener || keydownListener) return;

    wheelListener = (e) => {
      if (!isLocked) return;
      if (isEventInsideOverlay(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };

    touchMoveListener = (e) => {
      if (!isLocked) return;
      if (isEventInsideOverlay(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };

    keydownListener = (e) => {
      if (!isLocked) return;

      const keys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "PageUp",
        "PageDown",
        "Home",
        "End",
        " ",
        "Spacebar",
      ];

      if (e.key === "Escape") return;
      if (keys.indexOf(e.key) === -1) return;

      const wrapper = getOverlayWrapper();
      if (!wrapper) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const active = document.activeElement;
      const focusInside = active && wrapper.contains(active);
      if (!focusInside) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("wheel", wheelListener, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchmove", touchMoveListener, {
      passive: false,
      capture: true,
    });
    window.addEventListener("keydown", keydownListener, {
      passive: false,
      capture: true,
    });
  }

  function removeInputGuards() {
    if (wheelListener) {
      window.removeEventListener("wheel", wheelListener, { capture: true });
      wheelListener = null;
    }
    if (touchMoveListener) {
      window.removeEventListener("touchmove", touchMoveListener, {
        capture: true,
      });
      touchMoveListener = null;
    }
    if (keydownListener) {
      window.removeEventListener("keydown", keydownListener, { capture: true });
      keydownListener = null;
    }
  }

  function lockBackgroundScrollUltra() {
    if (!isDesktopAllowed()) return;
    if (isLocked) return;

    lockedScrollY = getLenisScrollY();

    stopLenisRoot();
    startOverlayLenis();

    document.documentElement.classList.add(CFG.lockClass);
    document.body.classList.add(CFG.lockClass);

    applyBodyFreeze();
    addInputGuards();
    startStickyGuard();

    isLocked = true;
  }

  function unlockBackgroundScrollUltra() {
    if (!isLocked) return;

    stopOverlayLenis();
    setOverlayPointerEvents(false);

    stopStickyGuard();
    removeInputGuards();

    clearBodyFreeze();

    document.documentElement.classList.remove(CFG.lockClass);
    document.body.classList.remove(CFG.lockClass);

    try {
      window.scrollTo(0, lockedScrollY);
    } catch (e) {}

    startLenisRoot();

    isLocked = false;
  }

  function decodeHtmlEntities(str) {
    const txt = document.createElement("textarea");
    txt.innerHTML = str == null ? "" : String(str);
    return txt.value;
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = value == null ? "" : String(value);
  }

  function setInnerSvg(el, svgString) {
    if (!el) return;
    const decoded = decodeHtmlEntities(svgString || "");
    el.innerHTML = decoded;
  }

  function setImgSrc(imgEl, src) {
    if (!imgEl) return;
    if (!src) {
      imgEl.removeAttribute("src");
      imgEl.classList.add("w-condition-invisible");
      return;
    }
    imgEl.classList.remove("w-condition-invisible");
    imgEl.setAttribute("src", src);
  }

  function setLink(linkEl, href) {
    if (!linkEl) return;
    if (!href || href === "#") {
      linkEl.classList.add("w-condition-invisible");
      linkEl.setAttribute("href", "#");
      return;
    }
    linkEl.classList.remove("w-condition-invisible");
    linkEl.setAttribute("href", href);
  }

  function resolveCardRoot(fromEl) {
    if (!fromEl) return null;
    return fromEl.closest(CFG.cardRootSelector) || null;
  }

  function resetPopupScrollToTop() {
    const wrapper = getOverlayWrapper();
    if (wrapper) {
      try {
        wrapper.scrollTop = 0;
      } catch (e) {}
    }
    if (!shellEl) return;
    const scrollable = shellEl.querySelector(".ttd-wrapper");
    if (scrollable) {
      scrollable.scrollTop = 0;
      return;
    }
    shellEl.scrollTop = 0;
  }

  function payloadHasDeal(dealIconSrc) {
    if (!dealIconSrc) return false;
    if (
      dealIconSrc.classList &&
      dealIconSrc.classList.contains("w-condition-invisible")
    )
      return false;
    if (dealIconSrc.hasAttribute && dealIconSrc.hasAttribute("hidden"))
      return false;
    const html = (dealIconSrc.innerHTML || "").trim();
    if (!html) return false;
    return true;
  }

  function setDealIconVisibilityFromPayload(payload) {
    if (!shellEl) return;

    const dealIconTarget =
      shellEl.querySelector(CFG.dealIconId) ||
      shellEl.querySelector(".category-filter-deal-icon");
    if (!dealIconTarget) return;

    const dealIconSrc = payload
      ? payload.querySelector("[data-ttd-deal-icon-content]")
      : null;

    const isDeal = payloadHasDeal(dealIconSrc);

    if (!isDeal) {
      dealIconTarget.classList.add("w-condition-invisible");
      dealIconTarget.innerHTML = "";
      return;
    }

    dealIconTarget.classList.remove("w-condition-invisible");
    dealIconTarget.innerHTML = dealIconSrc.innerHTML;
  }

  function fillPopupFromCard(cardEl) {
    if (!shellEl) return false;
    if (!cardEl) return false;

    const payload = cardEl.querySelector(CFG.payloadSelector);
    if (!payload) return false;

    const categorySrc = payload.querySelector("[data-ttd-category-content]");
    const titleSrc = payload.querySelector("[data-ttd-title-content]");
    const schemaSrc = payload.querySelector("[data-ttd-schema-content]");
    const imageSrc = payload.querySelector("[data-ttd-image-content]");
    const iconSrc = payload.querySelector("[data-ttd-icon-content]");
    const bookingSrc = payload.querySelector("[data-ttd-booking-content]");

    const categoryTarget = shellEl.querySelector(".ttd-tags .title6-1");
    const titleTarget = shellEl.querySelector(".ttd-header h1");
    const schemaTarget = shellEl.querySelector(
      ".ttd-content .schema[data-schema]"
    );
    const iconTarget = shellEl.querySelector(".category-filter-button-icon");

    const bookingTarget = shellEl.querySelector(".ttd-content a.cta4");
    const explicitImgTarget = shellEl.querySelector("[data-ttd-popup-image]");
    const fallbackImgTarget = shellEl.querySelector(".ttd-content img");
    const imgTarget = explicitImgTarget || fallbackImgTarget;

    // Select the save button using the ID
    const saveTarget = document.querySelector(CFG.saveBtnSelector);

    setText(categoryTarget, categorySrc ? categorySrc.textContent.trim() : "");
    setText(titleTarget, titleSrc ? titleSrc.textContent.trim() : "");

    if (schemaTarget) {
      schemaTarget.innerHTML = schemaSrc ? schemaSrc.innerHTML : "";
      if (typeof window.rtSchemaRender === "function") {
        window.rtSchemaRender(shellEl);
      } else {
        console.error(
          "[ttd-popup] window.rtSchemaRender not found. Ensure schema.js is loaded before popup.js"
        );
      }
    }

    if (iconTarget) {
      if (iconSrc) setInnerSvg(iconTarget, iconSrc.innerHTML);
      else iconTarget.innerHTML = "";
    }

    setDealIconVisibilityFromPayload(payload);

    if (imgTarget) {
      const src = imageSrc ? imageSrc.getAttribute("src") : "";
      setImgSrc(imgTarget, src);
    }

    if (bookingTarget) {
      const href = bookingSrc ? bookingSrc.getAttribute("href") : "";
      setLink(bookingTarget, href);
    }

    // NEW: Update the save button's data-saved-slug attribute
    if (saveTarget) {
      const slug = cardEl.getAttribute("data-saved-slug") || "";
      saveTarget.setAttribute("data-saved-slug", slug);
    }

    resetPopupScrollToTop();
    return true;
  }

  function openPopupProgrammatically() {
    if (!openBtnEl) return;
    openBtnEl.click();
  }

  function handleOpenFlowFromCard(cardRoot) {
    if (!isDesktopAllowed()) return;

    const ok = fillPopupFromCard(cardRoot);
    if (!ok) return;

    lockBackgroundScrollUltra();
    setOverlayPointerEvents(true);
    resetPopupScrollToTop();

    openPopupProgrammatically();
  }

  function bindOpenTriggers() {
    document.addEventListener(
      "click",
      (e) => {
        if (!isDesktopAllowed()) return;

        const trigger = e.target.closest(CFG.triggerSelector);
        if (!trigger) return;

        const cardRoot = resolveCardRoot(trigger);
        if (!cardRoot) return;

        e.preventDefault();
        handleOpenFlowFromCard(cardRoot);
      },
      true
    );
  }

  function smoothScrollAndClose() {
    setOverlayPointerEvents(false);
    stopOverlayLenis();

    let scrollContainer = getOverlayWrapper();

    if (
      !scrollContainer ||
      scrollContainer.scrollHeight <= scrollContainer.clientHeight
    ) {
      if (shellEl) {
        const inner = shellEl.querySelector(".ttd-wrapper");
        if (inner && inner.scrollHeight > inner.clientHeight) {
          scrollContainer = inner;
        } else {
          scrollContainer = shellEl;
        }
      }
    }

    const finalize = () => {
      const triggerBtn = document.querySelector(CFG.closeTriggerSelector);
      if (triggerBtn) {
        triggerBtn.click();
      }
      unlockBackgroundScrollUltra();
    };

    if (!scrollContainer || scrollContainer.scrollTop < 1) {
      finalize();
      return;
    }

    const startY = scrollContainer.scrollTop;
    const startTime = performance.now();
    const duration = 600;

    const easeOutQuart = (t) => 1 - --t * t * t * t;

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      let progress = elapsed / duration;

      if (progress > 1) progress = 1;

      const val = easeOutQuart(progress);
      const newY = startY * (1 - val);

      scrollContainer.scrollTop = newY;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        scrollContainer.scrollTop = 0;
        finalize();
      }
    };

    requestAnimationFrame(step);
  }

  function bindLenisToggleToOpenCloseButtons() {
    document.addEventListener(
      "click",
      (e) => {
        const open = e.target.closest(CFG.openBtnSelector);
        if (open) {
          if (!isDesktopAllowed()) return;
          resetPopupScrollToTop();
          setOverlayPointerEvents(true);
          if (isLocked) {
            startOverlayLenis();
            stopLenisRoot();
          }
          return;
        }

        const close = e.target.closest(CFG.closeBtnSelector);
        if (close) {
          smoothScrollAndClose();
          return;
        }

        const legacyClose = e.target.closest(CFG.legacyCloseBtnSelector);
        if (legacyClose) {
          unlockBackgroundScrollUltra();
          return;
        }
      },
      true
    );
  }

  function bindOverlayAndEscapeClose() {
    document.addEventListener(
      "click",
      (e) => {
        if (!isDesktopAllowed()) return;
        const overlay = e.target.closest(CFG.overlayClickSelector);
        if (overlay) {
          unlockBackgroundScrollUltra();
          return;
        }
      },
      true
    );

    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") unlockBackgroundScrollUltra();
      },
      { passive: true }
    );
  }

  function setupCss() {
    injectOnce(
      CFG.cssKey,
      `
html.${CFG.lockClass},
body.${CFG.lockClass} {
  overflow: hidden !important;
}

${CFG.overlayScrollWrapperSelector} {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
  pointer-events: none;
}
      `.trim()
    );
  }

  function forceCleanupIfNotDesktop() {
    if (isDesktopAllowed()) return;
    setOverlayPointerEvents(false);
    unlockBackgroundScrollUltra();
  }

  function onReady() {
    setupCss();

    if (!isDesktopAllowed()) {
      setOverlayPointerEvents(false);
      stopOverlayLenis();
      return;
    }

    ensureShell();
    ensureOpenBtn();

    setOverlayPointerEvents(false);
    stopOverlayLenis();

    bindOpenTriggers();
    bindLenisToggleToOpenCloseButtons();
    bindOverlayAndEscapeClose();

    window.addEventListener(
      "resize",
      () => {
        forceCleanupIfNotDesktop();
      },
      { passive: true }
    );
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", onReady)
    : onReady();

  window.rtTtdUnlockScroll = unlockBackgroundScrollUltra;
})();
