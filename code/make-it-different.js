(() => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  const canInit = () => {
    const wrapper = qs("#mid-video-wrapper");
    const captionEl = qs("#mid-caption");
    const locationEl = qs("#mid-location");
    const items = qsa(".mid-item");
    const trigger =
      qs("#make-it-different") || qs("#make-it-different-content");
    return !!(wrapper && captionEl && locationEl && items.length && trigger);
  };

  const clampIndex = (i, len) => ((i % len) + len) % len;

  const isMobileMode = () => {
    const coarse =
      window.matchMedia &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const small =
      window.matchMedia && window.matchMedia("(max-width: 991px)").matches;
    return !!(coarse || small);
  };

  const clampOrigin = (v) => {
    const n = Number(v);
    if (!isFinite(n)) return 50;
    if (n < 0) return 0;
    if (n > 100) return 100;
    return n;
  };

  const parseOrigin = (raw) => {
    if (raw == null) return 50;
    const s = String(raw).trim();
    if (!s) return 50;
    const n = parseFloat(s);
    return clampOrigin(n);
  };

  const applyOrigin = (el, origin) => {
    if (!el) return;
    const o = clampOrigin(origin);
    el.style.objectPosition = `${o}% 50%`;
  };

  const getItemData = (imgEl) => {
    const videoUrl = imgEl.getAttribute("data-mid-video-url") || "";
    const caption = imgEl.getAttribute("data-mid-caption") || "";
    const location = imgEl.getAttribute("data-mid-location") || "";
    const origin = parseOrigin(imgEl.getAttribute("data-mid-origin"));
    const imgSrc =
      imgEl.getAttribute("src") ||
      imgEl.getAttribute("data-src") ||
      imgEl.getAttribute("data-lazy-src") ||
      "";
    return { videoUrl, caption, location, imgSrc, origin };
  };

  const ensureWrapperOnly = (wrapperEl) => {
    const pos = window.getComputedStyle(wrapperEl).position;
    if (pos === "static") wrapperEl.style.position = "relative";
    wrapperEl.style.overflow = "hidden";
    if (window.getComputedStyle(wrapperEl).zIndex === "auto") {
      wrapperEl.style.zIndex = "1";
    }
  };

  const createLayerVideo = (id) => {
    const v = document.createElement("video");
    v.classList.add("mid-layer-video");
    v.id = id;
    v.playsInline = true;
    v.autoplay = true;
    v.loop = true;
    v.preload = "auto";
    v.muted = true;
    v.volume = 0;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.setAttribute("muted", "");

    v.style.position = "absolute";
    v.style.inset = "0";
    v.style.width = "100%";
    v.style.height = "100%";
    v.style.objectFit = "cover";
    v.style.willChange = "transform, box-shadow";
    v.style.zIndex = "0";
    v.style.opacity = "0";

    applyOrigin(v, 50);

    return v;
  };

  const createLayerImage = (id) => {
    const img = document.createElement("img");
    img.classList.add("mid-layer-image");
    img.id = id;
    img.decoding = "async";
    img.loading = "eager";

    img.style.position = "absolute";
    img.style.inset = "0";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.willChange = "transform, box-shadow";
    img.style.zIndex = "0";
    img.style.opacity = "0";
    img.style.display = "block";
    img.style.pointerEvents = "none";

    applyOrigin(img, 50);

    return img;
  };

  const createPool = (wrapper, size = 4, mode = "video") => {
    const pool = [];
    for (let i = 0; i < size; i++) {
      const el =
        mode === "image"
          ? createLayerImage(`mid-layer-img-${i}`)
          : createLayerVideo(`mid-layer-${i}`);
      wrapper.insertBefore(el, wrapper.firstChild);
      pool.push(el);
    }
    return pool;
  };

  const cancelFade = (videoEl) => {
    if (videoEl && videoEl._midFadeTimer) {
      clearInterval(videoEl._midFadeTimer);
      videoEl._midFadeTimer = null;
    }
  };

  const fadeTo = (videoEl, targetVol, duration = 500) => {
    if (!videoEl) return;
    cancelFade(videoEl);

    const safeDuration = Math.max(0, Number(duration) || 0);
    const stepTime = 20;
    const steps = Math.max(1, Math.ceil(safeDuration / stepTime));
    const clampedTarget = Math.max(0, Math.min(1, Number(targetVol) || 0));

    if (clampedTarget > 0 && videoEl.muted) {
      videoEl.muted = false;
      videoEl.removeAttribute("muted");
      videoEl.volume = 0;
    }

    const startVol = Math.max(0, Math.min(1, Number(videoEl.volume) || 0));
    const diff = clampedTarget - startVol;

    if (Math.abs(diff) < 0.001 || safeDuration === 0) {
      videoEl.volume = clampedTarget;
      if (clampedTarget === 0) {
        videoEl.muted = true;
        videoEl.setAttribute("muted", "");
      }
      return;
    }

    const volStep = diff / steps;
    let currentStep = 0;

    videoEl._midFadeTimer = setInterval(() => {
      currentStep++;
      let newVol = startVol + volStep * currentStep;
      if (newVol < 0) newVol = 0;
      if (newVol > 1) newVol = 1;

      videoEl.volume = newVol;

      if (currentStep >= steps) {
        cancelFade(videoEl);
        videoEl.volume = clampedTarget;
        if (clampedTarget === 0) {
          videoEl.muted = true;
          videoEl.setAttribute("muted", "");
        }
      }
    }, stepTime);
  };

  const forceMuted = (videoEl) => {
    if (!videoEl) return;
    cancelFade(videoEl);
    videoEl.muted = true;
    videoEl.setAttribute("muted", "");
    videoEl.volume = 0;
  };

  const forceUnmuted = (videoEl) => {
    if (!videoEl) return;
    cancelFade(videoEl);
    videoEl.muted = false;
    videoEl.removeAttribute("muted");
    videoEl.volume = 1;
  };

  const loadVideoSource = (videoEl, url) => {
    if (!videoEl || !url) return false;
    if (videoEl.src !== url) {
      videoEl.src = url;
      videoEl.load();
      return true;
    }
    return false;
  };

  const loadImageSource = (imgEl, url) => {
    if (!imgEl || !url) return false;
    const cur = imgEl.getAttribute("src") || "";
    if (cur !== url) {
      imgEl.setAttribute("src", url);
      return true;
    }
    return false;
  };

  const warmPlay = (videoEl) => {
    if (!videoEl) return;
    const p = videoEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  const safePause = (videoEl) => {
    if (!videoEl) return;
    try {
      cancelFade(videoEl);
      videoEl.pause();
    } catch (_) {}
  };

  const safeSeekZero = (videoEl) => {
    if (!videoEl) return;
    try {
      videoEl.currentTime = 0;
    } catch (_) {}
  };

  const waitOnce = (el, event, timeoutMs = 800) => {
    return new Promise((resolve) => {
      if (!el) return resolve(false);
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(ok);
      };
      const onEvt = () => finish(true);
      const cleanup = () => {
        el.removeEventListener(event, onEvt);
      };
      el.addEventListener(event, onEvt, { once: true });
      window.setTimeout(() => finish(false), timeoutMs);
    });
  };

  const waitForReady = (videoEl, timeoutMs = 1200) => {
    return new Promise((resolve) => {
      if (!videoEl) return resolve(false);
      if (videoEl.readyState >= 3) return resolve(true);

      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(ok);
      };

      const onCanPlay = () => finish(true);
      const onLoadedData = () => finish(videoEl.readyState >= 2);
      const onError = () => finish(false);

      const cleanup = () => {
        videoEl.removeEventListener("canplay", onCanPlay);
        videoEl.removeEventListener("loadeddata", onLoadedData);
        videoEl.removeEventListener("error", onError);
      };

      videoEl.addEventListener("canplay", onCanPlay, { once: true });
      videoEl.addEventListener("loadeddata", onLoadedData, { once: true });
      videoEl.addEventListener("error", onError, { once: true });

      window.setTimeout(() => finish(videoEl.readyState >= 2), timeoutMs);
    });
  };

  const waitForPrimedAtZero = async (videoEl) => {
    if (!videoEl) return false;
    if (videoEl.readyState < 1) {
      await waitOnce(videoEl, "loadedmetadata", 1200);
    }
    safeSeekZero(videoEl);
    if (videoEl.readyState < 2) {
      await waitForReady(videoEl, 1400);
    }
    warmPlay(videoEl);
    await waitOnce(videoEl, "playing", 600);
    safePause(videoEl);
    safeSeekZero(videoEl);
    return true;
  };

  const playFromZeroNow = async (videoEl) => {
    if (!videoEl) return false;
    safeSeekZero(videoEl);
    warmPlay(videoEl);
    return true;
  };

  const mountPrefetchLinks = (urls, asType) => {
    const head = document.head || document.documentElement;
    const rel = "preload";
    const selector = `link[rel="${rel}"][as="${asType}"]`;
    const existing = new Set(
      Array.from(document.querySelectorAll(selector)).map((l) => l.href)
    );
    for (const u of urls) {
      if (!u || existing.has(u)) continue;
      const link = document.createElement("link");
      link.rel = rel;
      link.as = asType;
      link.href = u;
      head.appendChild(link);
      existing.add(u);
    }
  };

  const init = () => {
    if (!canInit()) return;

    const wrapper = qs("#mid-video-wrapper");
    const controlsEl = qs("#mid-video-controls");
    const captionEl = qs("#mid-caption");
    const locationEl = qs("#mid-location");
    const items = qsa(".mid-item");
    const triggerEl =
      qs("#make-it-different") || qs("#make-it-different-content");
    const soundButton = qs("#mid-sound");

    if (!wrapper || !captionEl || !locationEl || !items.length || !triggerEl)
      return;

    ensureWrapperOnly(wrapper);

    const mode = isMobileMode() ? "image" : "video";
    const rawSlides = items.map(getItemData);

    const slides =
      mode === "image"
        ? rawSlides.filter((d) => !!d.imgSrc)
        : rawSlides.filter((d) => !!d.videoUrl);

    if (!slides.length) return;

    if (mode === "image") {
      mountPrefetchLinks(
        slides.map((s) => s.imgSrc),
        "image"
      );
    } else {
      mountPrefetchLinks(
        slides.map((s) => s.videoUrl),
        "video"
      );
    }

    const pool = createPool(wrapper, 4, mode);

    const state = {
      mode,
      wrapper,
      triggerEl,
      controlsEl,
      captionEl,
      locationEl,
      slides,
      idx: 0,

      pool,
      active: pool[0],
      standby: pool[1],

      globalZ: 10,
      lastDirection: null,
      opToken: 0,

      baffleInstances: {
        caption: null,
        location: null,
      },

      sound: {
        button: soundButton,
        label: soundButton ? soundButton.querySelector(".title6-1") : null,
        currentState: "off",
        dirTimer: null,
      },
    };

    const getToken = () => state.opToken;

    const nextToken = () => {
      state.opToken += 1;
      return state.opToken;
    };

    const runBaffle = (el, newText, instanceKey) => {
      if (typeof window.baffle !== "function") {
        el.textContent = newText;
        return;
      }

      if (!state.baffleInstances[instanceKey]) {
        state.baffleInstances[instanceKey] = window.baffle(el);
      }

      const b = state.baffleInstances[instanceKey];
      const interval = 125;
      const duration = 5 * interval;

      b.stop();
      b.set({
        speed: interval,
        characters: newText || " ",
      });

      b.text(() => newText);
      b.reveal(duration);
    };

    const applyText = (i, animate = false) => {
      const s = state.slides[i];
      const nextCaption = s.caption || "";
      const nextLocation = s.location || "";

      if (animate) {
        runBaffle(state.captionEl, nextCaption, "caption");
        runBaffle(state.locationEl, nextLocation, "location");
      } else {
        state.captionEl.textContent = nextCaption;
        state.locationEl.textContent = nextLocation;
      }
    };

    const lockSoundTextWidth = () => {
      const textLabel = state.sound.label;
      if (!textLabel) return;
      const originalText = textLabel.textContent;
      textLabel.style.width = "auto";
      textLabel.textContent = "Sound: OFF";
      const offWidth = textLabel.offsetWidth;
      textLabel.textContent = "Sound: ON";
      const onWidth = textLabel.offsetWidth;
      const maxWidth = Math.max(offWidth, onWidth);
      textLabel.style.width = maxWidth + "px";
      textLabel.textContent = originalText;
    };

    const setDirectionClass = (nextState) => {
      const btn = state.sound.button;
      if (!btn) return;
      const isMobileIcons =
        window.matchMedia && window.matchMedia("(max-width: 991px)").matches;
      if (!isMobileIcons) return;

      btn.classList.remove("sound-turning-on", "sound-turning-off");
      btn.offsetWidth;
      btn.classList.add(
        nextState === "on" ? "sound-turning-on" : "sound-turning-off"
      );

      if (state.sound.dirTimer) clearTimeout(state.sound.dirTimer);
      state.sound.dirTimer = setTimeout(() => {
        btn.classList.remove("sound-turning-on", "sound-turning-off");
        state.sound.dirTimer = null;
      }, 520);
    };

    const updateSoundStateUI = (nextState) => {
      const btn = state.sound.button;
      if (!btn) return;
      const isOn = nextState === "on";
      btn.setAttribute("data-mid-sound", isOn ? "on" : "off");
      btn.classList.toggle("is-sound-on", isOn);
      btn.setAttribute("aria-pressed", isOn ? "true" : "false");
      if (state.sound.label) {
        state.sound.label.textContent = isOn ? "Sound: ON" : "Sound: OFF";
      }
    };

    const moveMakeItDifferentForMobile = () => {
      if (!state.sound.button) return;
      if (
        !window.matchMedia ||
        !window.matchMedia("(max-width: 479px)").matches
      )
        return;
      const makeItDifferent = qs("#make-it-different");
      if (!makeItDifferent) return;
      const parent = state.sound.button.parentNode;
      if (!parent) return;
      parent.insertBefore(makeItDifferent, state.sound.button);
    };

    const setSoundState = (nextState) => {
      state.sound.currentState = nextState === "on" ? "on" : "off";
      updateSoundStateUI(state.sound.currentState);
    };

    const applySoundToActiveOnlyInstant = () => {
      if (state.mode !== "video") return;
      if (state.sound.currentState === "on") {
        forceUnmuted(state.active);
        warmPlay(state.active);
      } else {
        forceMuted(state.active);
      }
      state.pool.forEach((v) => {
        if (v !== state.active) forceMuted(v);
      });
    };

    const resetSlideStyle = (el) => {
      el.style.width = "100%";
      el.style.height = "100%";
      el.style.boxShadow = "none";
      el.style.transform = "none";
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.display = "block";
    };

    const getNextLayer = (currentActive) => {
      if (state.standby && state.standby !== currentActive) {
        return state.standby;
      }
      let candidates = state.pool.filter((v) => v !== currentActive);
      candidates.sort((a, b) => {
        const zA = parseInt(a.style.zIndex || 0);
        const zB = parseInt(b.style.zIndex || 0);
        return zA - zB;
      });
      return candidates[0];
    };

    const hideOldLayersAfter = (ms) => {
      setTimeout(() => {
        const threshold = state.globalZ - 1;
        state.pool.forEach((el) => {
          const z = parseInt(el.style.zIndex || 0);
          if (z < threshold) {
            if (state.mode === "video") safePause(el);
            el.style.display = "none";
          } else {
            el.style.display = "block";
          }
        });
      }, ms);
    };

    const goTo = async (nextIdx) => {
      const token = nextToken();
      const len = state.slides.length;
      const idx = clampIndex(nextIdx, len);
      state.idx = idx;

      const s = state.slides[idx];
      applyText(idx, true);

      const outgoing = state.active;
      const incoming = getNextLayer(outgoing);

      state.active = incoming;
      state.globalZ++;

      incoming.style.zIndex = state.globalZ;

      if (state.controlsEl) {
        state.controlsEl.style.zIndex = state.globalZ + 1;
      }

      const nextStandby = state.pool.find(
        (v) => v !== incoming && v !== outgoing
      );
      if (nextStandby) {
        state.standby = nextStandby;
        const nextS = state.slides[clampIndex(idx + 1, len)];
        applyOrigin(nextStandby, nextS.origin);
        if (state.mode === "image") {
          loadImageSource(nextStandby, nextS.imgSrc);
        } else {
          loadVideoSource(nextStandby, nextS.videoUrl);
          forceMuted(nextStandby);
          waitForPrimedAtZero(nextStandby);
        }
      }

      applyOrigin(incoming, s.origin);

      if (state.mode === "image") {
        loadImageSource(incoming, s.imgSrc);
      } else {
        loadVideoSource(incoming, s.videoUrl);
        if (state.sound.currentState === "off") forceMuted(incoming);
        await waitForPrimedAtZero(incoming);
        if (token !== getToken()) return;
        await playFromZeroNow(incoming);
      }

      const allDirs = ["bottom-up", "left-right", "right-left"];
      const validDirs = state.lastDirection
        ? allDirs.filter((d) => d !== state.lastDirection)
        : allDirs;
      const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
      state.lastDirection = dir;

      const BORDER_SIZE = "0.09375rem";
      const ANIMATION_MS = 800;
      const EASING = "cubic-bezier(0.19, 1, 0.22, 1)";

      resetSlideStyle(incoming);

      let oldActiveTarget = "";

      switch (dir) {
        case "bottom-up":
          incoming.style.boxShadow = `0 -${BORDER_SIZE} 0 0 var(--swatches--black)`;
          incoming.style.transform = "translateY(100%)";
          oldActiveTarget = "translateY(-25%)";
          break;
        case "left-right":
          incoming.style.boxShadow = `${BORDER_SIZE} 0 0 0 var(--swatches--black)`;
          incoming.style.transform = "translateX(-100%)";
          oldActiveTarget = "translateX(25%)";
          break;
        case "right-left":
          incoming.style.boxShadow = `-${BORDER_SIZE} 0 0 0 var(--swatches--black)`;
          incoming.style.transform = "translateX(100%)";
          oldActiveTarget = "translateX(-25%)";
          break;
      }

      if (state.mode === "video") {
        if (state.sound.currentState === "on") {
          incoming.volume = 0;
          incoming.muted = false;
          incoming.removeAttribute("muted");
          fadeTo(incoming, 1, 400);
        }
        state.pool.forEach((v) => {
          if (v !== incoming) {
            if (state.sound.currentState === "on") fadeTo(v, 0, 300);
            else forceMuted(v);
          }
        });
      }

      incoming.style.transition = `transform ${ANIMATION_MS}ms ${EASING}`;
      outgoing.style.transition = `transform ${ANIMATION_MS}ms ${EASING}`;

      requestAnimationFrame(() => {
        if (dir === "bottom-up") incoming.style.transform = "translateY(0%)";
        else incoming.style.transform = "translateX(0%)";
        outgoing.style.transform = oldActiveTarget;
      });

      hideOldLayersAfter(ANIMATION_MS);
    };

    const onAdvance = (e) => {
      const btn = state.sound.button;
      if (btn && (e.target === btn || (e.target && btn.contains(e.target))))
        return;
      goTo(state.idx + 1);
    };

    const onToggleSound = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!state.sound.button) return;

      const nextState = state.sound.currentState === "off" ? "on" : "off";
      setDirectionClass(nextState);
      setSoundState(nextState);

      if (state.mode !== "video") return;

      if (nextState === "on") {
        warmPlay(state.active);
        fadeTo(state.active, 1, 380);
      } else {
        fadeTo(state.active, 0, 380);
      }
    };

    if (state.sound.button) {
      let current = state.sound.button.getAttribute("data-mid-sound");
      if (current !== "on" && current !== "off") current = "off";
      state.sound.currentState = current;

      lockSoundTextWidth();
      updateSoundStateUI(state.sound.currentState);
      moveMakeItDifferentForMobile();

      state.sound.button.addEventListener("click", onToggleSound);

      const ro = () => lockSoundTextWidth();
      window.addEventListener("resize", ro, { passive: true });
    }

    applyText(0, false);

    resetSlideStyle(state.active);
    state.active.style.zIndex = state.globalZ;

    if (state.controlsEl) {
      state.controlsEl.style.zIndex = state.globalZ + 1;
    }

    state.active.style.opacity = "1";

    const secondSlideIdx = clampIndex(1, state.slides.length);

    if (state.mode === "image") {
      applyOrigin(state.active, state.slides[0].origin);
      loadImageSource(state.active, state.slides[0].imgSrc);

      if (state.standby) {
        applyOrigin(state.standby, state.slides[secondSlideIdx].origin);
        loadImageSource(state.standby, state.slides[secondSlideIdx].imgSrc);
      }

      state.pool.forEach((el, i) => {
        if (i === 0) {
          el.style.display = "block";
          el.style.opacity = "1";
        } else {
          el.style.display = "none";
          el.style.opacity = "1";
        }
      });
    } else {
      applyOrigin(state.active, state.slides[0].origin);
      loadVideoSource(state.active, state.slides[0].videoUrl);

      applyOrigin(state.standby, state.slides[secondSlideIdx].origin);
      loadVideoSource(state.standby, state.slides[secondSlideIdx].videoUrl);

      forceMuted(state.standby);
      waitForPrimedAtZero(state.standby);

      forceMuted(state.active);
      safeSeekZero(state.active);
      warmPlay(state.active);

      const bootToken = nextToken();
      waitForPrimedAtZero(state.active).then(() => {
        if (bootToken !== getToken()) return;
        playFromZeroNow(state.active).then(() => {
          applySoundToActiveOnlyInstant();
        });
      });
    }

    const warmRemaining = () => {
      const urls =
        state.mode === "image"
          ? state.slides.map((s) => s.imgSrc)
          : state.slides.map((s) => s.videoUrl);
      const head = document.head || document.documentElement;
      const existing = new Set(
        Array.from(head.querySelectorAll('link[rel="prefetch"]')).map(
          (l) => l.href
        )
      );
      for (const u of urls) {
        if (!u || existing.has(u)) continue;
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = u;
        head.appendChild(link);
        existing.add(u);
      }
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => warmRemaining(), { timeout: 1200 });
    } else {
      window.setTimeout(() => warmRemaining(), 600);
    }

    state.triggerEl.addEventListener("click", onAdvance, { passive: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
