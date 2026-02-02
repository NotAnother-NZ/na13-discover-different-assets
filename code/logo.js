const ANIM_SETTINGS = {
  scrambleCount: 5,
  intervalMs: 125,
  pauseSwapMs: 750,
  pauseLoopMs: 1500,
};

const BAFFLE_TEXT_CONFIG = {
  speed: 0,
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

document.addEventListener("DOMContentLoaded", () => {
  const WRAPPER_SELECTOR = "#logo-anim-wrapper";
  const TEXT_SELECTOR = ".logotype";

  window._animStateMap = new WeakMap();

  function makeItem(textEl) {
    const baseText = BAFFLE_TEXT_CONFIG.getFinalText(textEl);
    if (!baseText) return null;
    const b = baffle(textEl).set({
      characters: BAFFLE_TEXT_CONFIG.getUniqueCharacters(baseText),
      speed: 0,
    });
    b.text(() => baseText).reveal(0);
    return { textEl, b, baseText, currentText: baseText };
  }

  function ensureState(wrapper) {
    let state = window._animStateMap.get(wrapper);
    if (state) return state;

    const textEls = Array.from(wrapper.querySelectorAll(TEXT_SELECTOR)).slice(
      0,
      2
    );
    const items = textEls.map(makeItem).filter(Boolean);

    state = {
      items,
      isHovering: false,
      isActive: false,
      scrambleTimerId: null,
      pauseTimerId: null,
      loopTimerId: null,
      phase: 0,
    };

    window._animStateMap.set(wrapper, state);
    return state;
  }

  function setInstant(state, t1, t2) {
    const [a, b] = state.items;
    a.currentText = t1;
    b.currentText = t2;
    a.b.text(() => t1).reveal(0);
    b.b.text(() => t2).reveal(0);
  }

  function scrambleToTargets(state, target1, target2, onDone) {
    if (state.scrambleTimerId) clearInterval(state.scrambleTimerId);

    const [a, b] = state.items;
    const combinedText =
      (a.baseText || "") + (b.baseText || "") + target1 + target2;
    const pool = BAFFLE_TEXT_CONFIG.getUniqueCharacters(combinedText);

    a.b.set({ characters: pool, speed: 0 });
    b.b.set({ characters: pool, speed: 0 });

    let iteration = 0;
    state.scrambleTimerId = setInterval(() => {
      iteration++;
      if (iteration <= ANIM_SETTINGS.scrambleCount) {
        a.b.text(() => BAFFLE_TEXT_CONFIG.getNoiseString(target1.length, pool));
        b.b.text(() => BAFFLE_TEXT_CONFIG.getNoiseString(target2.length, pool));
      } else {
        clearInterval(state.scrambleTimerId);
        state.scrambleTimerId = null;
        a.currentText = target1;
        b.currentText = target2;
        a.b.text(() => target1).reveal(0);
        b.b.text(() => target2).reveal(0);
        onDone && onDone();
      }
    }, ANIM_SETTINGS.intervalMs);
  }

  function runSwapCycle(state) {
    state.isActive = true;

    if (state.items.length < 2) {
      state.isActive = false;
      return;
    }

    const [a, b] = state.items;
    const textA = a.baseText;
    const textB = b.baseText;

    const target1 = state.phase % 2 === 0 ? textB : textA;
    const target2 = state.phase % 2 === 0 ? textA : textB;

    scrambleToTargets(state, target1, target2, () => {
      const isSwappedState = state.phase % 2 === 0;
      const shouldContinue = state.isHovering || isSwappedState;

      if (!shouldContinue) {
        state.isActive = false;
        state.phase = 0;
        setInstant(state, textA, textB);
        return;
      }

      const isEndOfLoop = state.phase % 2 === 1;
      const delay = isEndOfLoop
        ? ANIM_SETTINGS.pauseLoopMs
        : ANIM_SETTINGS.pauseSwapMs;

      state.pauseTimerId = setTimeout(() => {
        state.pauseTimerId = null;
        state.phase = (state.phase + 1) % 2;
        runSwapCycle(state);
      }, delay);
    });
  }

  function onEnter(wrapper) {
    const state = ensureState(wrapper);
    if (state.items.length < 2) return;

    state.isHovering = true;
    if (state.isActive) return;

    state.phase = 0;
    setInstant(state, state.items[0].baseText, state.items[1].baseText);
    runSwapCycle(state);
  }

  function onLeave(wrapper) {
    const state = ensureState(wrapper);
    state.isHovering = false;
  }

  const wrappers = Array.from(document.querySelectorAll(WRAPPER_SELECTOR));

  wrappers.forEach((wrapper) => {
    wrapper.addEventListener("mouseenter", () => onEnter(wrapper));
    wrapper.addEventListener("mouseleave", () => onLeave(wrapper));
  });

  window.playLogoHoverOnce = () => {
    wrappers.forEach((wrapper) => {
      const state = ensureState(wrapper);
      if (state.items.length < 2) return;
      if (state.isActive) return;

      state.isHovering = false;
      state.phase = 0;
      setInstant(state, state.items[0].baseText, state.items[1].baseText);
      runSwapCycle(state);
    });
  };
});
