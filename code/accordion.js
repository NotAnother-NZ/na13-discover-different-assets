(() => {
  const ACCORDION = "[data-rt-accordion]";
  const ITEM = "[data-rt-accordion-item]";
  const TRIGGER = "[data-rt-accordion-trigger]";
  const CONTENT = "[data-rt-accordion-content]";
  const SPEED_OPEN_PX_PER_S = 1200;
  const SPEED_CLOSE_PX_PER_S = 900;
  const DURATION_MIN_MS = 600;
  const DURATION_MAX_MS = 2400;
  const EASE = "cubic-bezier(0.19, 1, 0.22, 1)";

  function computeExpandedHeight(item, triggerEl, contentEl) {
    const t = triggerEl ? triggerEl.offsetHeight : 0;
    const c = contentEl ? contentEl.offsetHeight : 0;
    return t + c;
  }

  function computeDurationMs(currentPx, targetPx, opening) {
    const delta = Math.abs(targetPx - currentPx);
    const speed = opening ? SPEED_OPEN_PX_PER_S : SPEED_CLOSE_PX_PER_S;
    const ms = (delta / Math.max(1, speed)) * 1000;
    return Math.max(DURATION_MIN_MS, Math.min(DURATION_MAX_MS, ms));
  }

  function updateExpandedText(item, open) {
    const nodes = item.querySelectorAll("[data-rt-accordion-expanded-text]");
    if (!nodes.length) return;
    nodes.forEach((el) => {
      if (!el.dataset.rtAccordionOriginalText) {
        el.dataset.rtAccordionOriginalText = el.textContent || "";
      }
      const expanded = el.getAttribute("data-rt-accordion-expanded-text");
      const original = el.dataset.rtAccordionOriginalText;
      el.textContent = open ? expanded : original;
    });
  }

  function setItemOpen(item, triggerEl, contentEl, open, immediate) {
    if (!item) return;
    item.style.overflow = "hidden";
    const current = item.offsetHeight || 0;
    const target = open
      ? computeExpandedHeight(item, triggerEl, contentEl)
      : triggerEl
      ? triggerEl.offsetHeight
      : 0;
    const durationMs = immediate ? 0 : computeDurationMs(current, target, open);
    const transition = "height " + durationMs + "ms " + EASE;
    item.style.transition = transition;
    item.style.height = target + "px";
    item.dataset.open = open ? "true" : "false";
    item.setAttribute("aria-expanded", open ? "true" : "false");
    if (triggerEl)
      triggerEl.setAttribute("aria-expanded", open ? "true" : "false");
    updateExpandedText(item, open);
  }

  function closeSiblingsSingleMode(item) {
    const parent = item.closest(ACCORDION);
    if (!parent) return;
    const items = parent.querySelectorAll(ITEM);
    items.forEach((i) => {
      if (i !== item) {
        const t = i.querySelector(TRIGGER);
        const c = i.querySelector(CONTENT);
        setItemOpen(i, t, c, false, false);
      }
    });
  }

  function initItem(item, openInitially) {
    const triggerEl = item.querySelector(TRIGGER);
    const contentEl = item.querySelector(CONTENT);
    if (!triggerEl || !contentEl) return;
    item.setAttribute("role", "group");
    triggerEl.setAttribute("role", "button");
    triggerEl.setAttribute("tabindex", "0");
    triggerEl.setAttribute("aria-controls", contentEl.id || "");
    contentEl.setAttribute("role", "region");
    if (!contentEl.id)
      contentEl.id = "rt-acc-" + Math.random().toString(36).slice(2);
    setItemOpen(item, triggerEl, contentEl, !!openInitially, true);
    const ro = new ResizeObserver(() => {
      if (item.dataset.open === "true") {
        const h = computeExpandedHeight(item, triggerEl, contentEl);
        const cur = item.offsetHeight || 0;
        const d = computeDurationMs(cur, h, true);
        item.style.transition = "height " + d + "ms " + EASE;
        item.style.height = h + "px";
      } else {
        const h = triggerEl.offsetHeight;
        const cur = item.offsetHeight || 0;
        const d = computeDurationMs(cur, h, false);
        item.style.transition = "height " + d + "ms " + EASE;
        item.style.height = h + "px";
      }
    });
    ro.observe(contentEl);
    ro.observe(triggerEl);
    item.__rtResizeObserver = ro;
  }

  function handleToggle(triggerEl) {
    const item = triggerEl.closest(ITEM);
    const acc = triggerEl.closest(ACCORDION);
    if (!item || !acc) return;
    const single =
      (acc.getAttribute("data-rt-accordion-mode") || "single").toLowerCase() ===
      "single";
    const contentEl = item.querySelector(CONTENT);
    const isOpen = item.dataset.open === "true";
    if (isOpen) {
      setItemOpen(item, triggerEl, contentEl, false, false);
    } else {
      if (single) closeSiblingsSingleMode(item);
      setItemOpen(item, triggerEl, contentEl, true, false);
    }
  }

  function initAccordion(acc) {
    const items = acc.querySelectorAll(ITEM);
    const defaultOpen = (
      acc.getAttribute("data-rt-accordion-default-open") || "first"
    ).toLowerCase();
    items.forEach((item, index) => {
      const forcedOpen = item.hasAttribute("data-rt-accordion-open");
      const openInitially =
        forcedOpen ||
        defaultOpen === "all" ||
        (defaultOpen === "first" && index === 0);
      initItem(item, openInitially);
    });
  }

  function onClick(e) {
    const trigger = e.target.closest(TRIGGER);
    if (!trigger) return;
    e.preventDefault();
    handleToggle(trigger);
  }

  function onKeydown(e) {
    const isTrigger = e.target && e.target.matches(TRIGGER);
    if (!isTrigger) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      handleToggle(e.target);
    }
  }

  function refreshHeights() {
    document.querySelectorAll(ACCORDION).forEach((acc) => {
      acc.querySelectorAll(ITEM).forEach((item) => {
        const t = item.querySelector(TRIGGER);
        const c = item.querySelector(CONTENT);
        if (!t || !c) return;
        const target =
          item.dataset.open === "true"
            ? computeExpandedHeight(item, t, c)
            : t.offsetHeight;
        const cur = item.offsetHeight || 0;
        const opening = item.dataset.open === "true";
        const d = computeDurationMs(cur, target, opening);
        item.style.transition = "height " + d + "ms " + EASE;
        item.style.height = target + "px";
      });
    });
  }

  function mount() {
    const accordions = document.querySelectorAll(ACCORDION);
    if (!accordions.length) return;
    accordions.forEach((acc) => {
      acc.querySelectorAll(ITEM).forEach((item) => {
        item.style.willChange = "height";
        item.style.overflow = "hidden";
      });
      initAccordion(acc);
    });
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
    let resizeTicking = false;
    window.addEventListener("resize", () => {
      if (resizeTicking) return;
      resizeTicking = true;
      requestAnimationFrame(() => {
        refreshHeights();
        resizeTicking = false;
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
