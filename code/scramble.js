/**
 * scramble.js
 * A pure API controller for the Baffle text scramble effect.
 *
 * DEPENDENCIES:
 * - baffle.js
 *
 * ATTRIBUTES:
 * - rt-scramble-trigger="name"   : Registers element(s) under a specific name.
 * - rt-scramble-item             : Registers element anonymously (useful if passing DOM node directly).
 * - rt-scramble-count="5"        : (Optional) Speed/duration config.
 * - rt-scramble-interval="125"   : (Optional) Update frequency config.
 *
 * API:
 * - window.rt.scramble.play("name");       // Play all elements with this trigger name
 * - window.rt.scramble.play(domElement);   // Play specific element
 * - window.rt.scramble.play("Default Text", "New Text"); // Scramble into new text
 */

(function () {
  // 1. SAFETY CHECK
  if (typeof baffle === "undefined") {
    console.warn("rt-scramble: baffle.js is missing.");
    return;
  }

  window.rt = window.rt || {};

  // 2. DEFAULTS
  const DEFAULTS = {
    count: 5,
    interval: 125,
  };

  const TEXT_UTILS = {
    getFinalText: (el) => (el.textContent || "").trim(),
    getUniqueCharacters: (text) => Array.from(new Set(text.split(""))).join(""),
    getNoiseString: (length, charPool) => {
      let result = "";
      for (let i = 0; i < length; i++) {
        result += charPool.charAt(Math.floor(Math.random() * charPool.length));
      }
      return result;
    },
  };

  // 3. STATE & REGISTRY
  const _instanceMap = new WeakMap();
  const _triggerRegistry = new Map(); // "name" -> [Element, Element...]

  function getInstance(el) {
    let state = _instanceMap.get(el);
    if (!state) {
      const baseText = TEXT_UTILS.getFinalText(el);

      // Accessibility: Hide noise, label with real text
      el.setAttribute("aria-hidden", "true");
      if (!el.getAttribute("aria-label")) {
        el.setAttribute("aria-label", baseText);
      }

      // Config overrides
      const countAttr = el.getAttribute("rt-scramble-count");
      const intervalAttr = el.getAttribute("rt-scramble-interval");
      const config = {
        count: countAttr ? parseInt(countAttr, 10) : DEFAULTS.count,
        interval: intervalAttr ? parseInt(intervalAttr, 10) : DEFAULTS.interval,
      };

      const b = baffle(el).set({
        characters: TEXT_UTILS.getUniqueCharacters(baseText),
        speed: 0,
      });

      state = { b, baseText, config, timerId: null };
      _instanceMap.set(el, state);
    }
    return state;
  }

  // 4. ANIMATION LOGIC
  function runScramble(el, targetTextOverride = null) {
    if (!document.body.contains(el)) return;

    const state = getInstance(el);
    if (state.timerId) clearInterval(state.timerId);

    const targetText = targetTextOverride || state.baseText;
    const combinedText = (state.baseText || "") + targetText;
    const pool = TEXT_UTILS.getUniqueCharacters(combinedText);

    state.b.set({ characters: pool, speed: 0 });

    let iteration = 0;
    state.timerId = setInterval(() => {
      iteration++;
      if (iteration <= state.config.count) {
        state.b.text(() => TEXT_UTILS.getNoiseString(targetText.length, pool));
      } else {
        clearInterval(state.timerId);
        state.timerId = null;
        state.b.text(() => targetText).reveal(0);

        if (targetTextOverride) {
          state.baseText = targetTextOverride;
          el.setAttribute("aria-label", targetTextOverride);
        }
      }
    }, state.config.interval);
  }

  // 5. PUBLIC API
  window.rt.scramble = {
    play: (target, newText = null) => {
      if (!target) return;

      // Play by Name
      if (typeof target === "string") {
        const elements = _triggerRegistry.get(target);
        if (elements && elements.length > 0) {
          elements.forEach((el) => runScramble(el, newText));
        } else {
          console.warn(
            `rt-scramble: No elements found for trigger "${target}"`
          );
        }
      }
      // Play by Element
      else if (target instanceof HTMLElement) {
        runScramble(target, newText);
      }
    },

    init: () => {
      _triggerRegistry.clear();
      const elements = document.querySelectorAll(
        "[rt-scramble-trigger], [rt-scramble-item]"
      );

      elements.forEach((el) => {
        // Pre-calculate state so it's ready when play() is called
        getInstance(el);

        // Register named triggers
        const triggerName = el.getAttribute("rt-scramble-trigger");
        if (triggerName) {
          if (!_triggerRegistry.has(triggerName)) {
            _triggerRegistry.set(triggerName, []);
          }
          _triggerRegistry.get(triggerName).push(el);
        }
      });
    },
  };

  // 6. AUTO-INIT (Just scanning, no event listeners)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.rt.scramble.init);
  } else {
    window.rt.scramble.init();
  }
})();
