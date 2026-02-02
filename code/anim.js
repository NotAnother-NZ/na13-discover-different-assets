(() => {
  /**
   * RETHINK LIBRARY (rt)
   * Module: Text
   * Description: Professional text animation controller using GSAP + SplitText.
   * Updates:
   * 1. Fixed FOUC by waiting for fonts.
   * 2. Added slick speed profiles (Lines/Words/Chars).
   * 3. Fixed Mask Clipping: Applied padding hacks to words/chars so 'g'/'y' tails aren't cut off.
   * 4. Device Restriction: Desktop Only (min-width: 992px).
   */

  const CONFIG = {
    waitTimeout: 8000,
    resizeDebounce: 200,
    // Desktop Breakpoint: Animations only run if width is >= this value.
    desktopBreakpoint: "(min-width: 992px)",
    profiles: {
      lines: {
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        distance: 100,
      },
      words: {
        duration: 0.6,
        stagger: 0.025,
        ease: "power2.out",
        distance: 100,
      },
      chars: {
        duration: 0.3,
        stagger: 0.015,
        ease: "power3.out",
        distance: 100,
      },
    },
    globalDefaults: {
      threshold: "top 85%",
      effect: "mask-rise",
      group: "lines",
    },
  };

  let resizeTimer;
  let activeSplits = [];
  let manualRegistry = {};

  // --- 1. Style Injection (UPDATED) ---
  const injectCoreStyles = () => {
    const css = `
        /* 1. Block mask (for Lines) */
        .rt-mask {
          display: block;
          overflow: hidden;
          position: relative; /* Safety */
          
          /* Padding Hack: Reveals descenders (g, j, p, q, y) */
          padding-bottom: 0.25em; 
          margin-bottom: -0.25em; 
          padding-top: 0.1em;     
          margin-top: -0.1em;
        }
        
        /* 2. Inline-Block mask (for Words/Chars) */
        .rt-mask-inline {
          display: inline-block;
          overflow: hidden;
          position: relative; /* Safety */
          vertical-align: bottom;
          margin-right: -0.05em; 
          
          /* Padding Hack: NOW APPLIED HERE TOO */
          padding-bottom: 0.25em; 
          margin-bottom: -0.25em; 
          padding-top: 0.1em;     
          margin-top: -0.1em;
        }

        .rt-content {
          display: inline-block;
          will-change: transform, opacity;
          -webkit-font-smoothing: antialiased;
          backface-visibility: hidden; 
        }
      `;
    if (!document.getElementById("rt-text-core-css")) {
      const style = document.createElement("style");
      style.id = "rt-text-core-css";
      style.innerHTML = css;
      document.head.appendChild(style);
    }
  };

  // --- 2. Smart Utilities ---
  const getAttr = (el, attr, def) => {
    const val = el.getAttribute(attr);
    if (val === null || val.trim() === "") return def;
    return val.trim();
  };

  const getBool = (el, attr, def) => {
    const val = getAttr(el, attr, String(def)).toLowerCase();
    return ["true", "1", "yes", "on"].includes(val);
  };

  const getFloat = (el, attr, def) => {
    const val = parseFloat(getAttr(el, attr, def));
    return isFinite(val) ? val : def;
  };

  const wrapElement = (el, className) => {
    const wrapper = document.createElement("div");
    wrapper.classList.add(className);
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
    return wrapper;
  };

  // --- 3. Animation Engine ---
  const init = (gsap, ScrollTrigger, SplitText) => {
    // A. CLEANUP PHASE:
    // Always revert existing splits/animations first.
    // This ensures that if we resize from Desktop -> Mobile, we leave the text clean.
    if (activeSplits.length) {
      activeSplits.forEach((s) => s.revert());
      activeSplits = [];
    }
    manualRegistry = {};

    ScrollTrigger.getAll().forEach((t) => {
      if (
        t.vars &&
        t.vars.trigger &&
        t.vars.trigger.hasAttribute("rt-text-effect")
      ) {
        t.kill();
      }
    });

    // B. DEVICE CHECK:
    // If we are NOT on desktop (less than 992px), stop here.
    // We have already cleaned up above, so the text is safe and readable.
    const isDesktop = window.matchMedia(CONFIG.desktopBreakpoint).matches;
    if (!isDesktop) return;

    // C. INITIALIZATION PHASE:
    const elements = document.querySelectorAll(
      "[rt-text-effect], [rt-text-group]"
    );

    elements.forEach((el) => {
      // 1. Profile Selection
      const groupType = getAttr(
        el,
        "rt-text-group",
        CONFIG.globalDefaults.group
      );
      const profile = CONFIG.profiles[groupType] || CONFIG.profiles.lines;

      // 2. Config Parsing
      const effectType = getAttr(
        el,
        "rt-text-effect",
        CONFIG.globalDefaults.effect
      );
      const triggerId = getAttr(el, "rt-text-trigger", null);

      const duration = getFloat(el, "rt-text-duration", profile.duration);
      const stagger = getFloat(el, "rt-text-stagger", profile.stagger);
      const distance = getFloat(el, "rt-text-distance", profile.distance);
      const ease = getAttr(el, "rt-text-ease", profile.ease);

      let threshold = getAttr(
        el,
        "rt-text-threshold",
        CONFIG.globalDefaults.threshold
      );
      if (!isNaN(parseFloat(threshold)) && isFinite(threshold)) {
        threshold = `top ${
          parseFloat(threshold) <= 1 ? parseFloat(threshold) * 100 : threshold
        }%`;
      }

      const replay = getBool(el, "rt-text-replay", false);
      const observerSel = getAttr(el, "rt-text-observer", null);
      const triggerEl = observerSel
        ? document.querySelector(observerSel) || el
        : el;

      // 3. Layout Force & Split
      // eslint-disable-next-line no-unused-vars
      const _forceLayout = el.offsetWidth;

      const split = new SplitText(el, {
        type: "lines,words,chars",
        linesClass: "rt-content rt-line",
        wordsClass: "rt-content rt-word",
        charsClass: "rt-content rt-char",
      });
      activeSplits.push(split);

      // 4. Effect: "mask-rise"
      if (effectType === "mask-rise") {
        let targets;
        let wrapperClass = "rt-mask";

        // Assign Targets & Mask Class
        if (groupType === "chars") {
          targets = split.chars;
          wrapperClass = "rt-mask-inline";
        } else if (groupType === "words") {
          targets = split.words;
          wrapperClass = "rt-mask-inline";
        } else {
          targets = split.lines;
          wrapperClass = "rt-mask";
        }

        // Apply Wrappers
        targets.forEach((target) => wrapElement(target, wrapperClass));
        el.style.overflow = "hidden"; // Parent safety

        // GSAP Config
        const animConfig = {
          yPercent: distance,
          opacity: 0,
          duration: duration,
          stagger: stagger,
          ease: ease,
        };

        if (triggerId) {
          animConfig.paused = true;
          const tween = gsap.from(targets, animConfig);
          if (!manualRegistry[triggerId]) manualRegistry[triggerId] = [];
          manualRegistry[triggerId].push(tween);
        } else {
          animConfig.scrollTrigger = {
            trigger: triggerEl,
            start: threshold,
            toggleActions: replay
              ? "play none none reset"
              : "play none none none",
          };
          gsap.from(targets, animConfig);
        }
      }
    });

    ScrollTrigger.refresh();
  };

  // --- 4. Boot System ---
  const boot = () => {
    injectCoreStyles();
    const checkDeps = () => {
      if (window.gsap && window.ScrollTrigger && window.SplitText) {
        window.gsap.registerPlugin(window.ScrollTrigger, window.SplitText);

        const run = () =>
          init(window.gsap, window.ScrollTrigger, window.SplitText);

        // Wait for Fonts
        document.fonts.ready.then(() => {
          run();
        });

        window.addEventListener("resize", () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(run, CONFIG.resizeDebounce);
        });

        // API
        window.rt = window.rt || {};
        window.rt.text = {
          init: run,
          refresh: window.ScrollTrigger.refresh,
          in: (id) => {
            if (manualRegistry[id]) {
              manualRegistry[id].forEach((anim) => {
                if (anim.reversed()) anim.play();
                else anim.restart();
              });
            }
          },
          out: (id) => {
            if (manualRegistry[id]) {
              manualRegistry[id].forEach((anim) => anim.reverse());
            }
          },
        };
      } else {
        requestAnimationFrame(checkDeps);
      }
    };
    checkDeps();
  };

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
