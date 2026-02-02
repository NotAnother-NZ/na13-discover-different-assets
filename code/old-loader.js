(() => {
  const root = document.querySelector("#map-illustration-group");
  if (!root) return;

  const img = root.querySelector("#nz-all-regions-fill");
  if (!img) return;

  const animClass = "is-animating";
  const visibleClass = "nz-fill-visible";

  if (!document.head.querySelector('style[data-nz-map-fill="1"]')) {
    const s = document.createElement("style");
    s.setAttribute("data-nz-map-fill", "1");
    s.textContent = `
  #nz-all-regions-fill{
    opacity:0;
    transition: opacity 650ms cubic-bezier(0.19,1,0.22,1);
    will-change: opacity;
    transform: translateZ(0);
    animation: none !important;
    -webkit-animation: none !important;
  }
  #nz-all-regions-fill.${visibleClass}{ opacity:1; }
  @media (prefers-reduced-motion: reduce){
    #nz-all-regions-fill{ transition:none; }
  }
  `;
    document.head.appendChild(s);
  }

  img.classList.remove(visibleClass);

  try {
    img.loading = "eager";
    img.decoding = "async";
    img.fetchPriority = "high";
  } catch (_) {}

  let decodePromise = null;
  const warmDecode = () => {
    if (decodePromise) return decodePromise;
    const start = () => {
      if (
        img.complete &&
        img.naturalWidth > 0 &&
        typeof img.decode === "function"
      ) {
        return img.decode().catch(() => {});
      }
      return new Promise((resolve) => {
        const onLoad = () => {
          img.removeEventListener("load", onLoad);
          if (typeof img.decode === "function")
            img
              .decode()
              .catch(() => {})
              .finally(resolve);
          else resolve();
        };
        img.addEventListener("load", onLoad, { once: true });
      });
    };
    decodePromise = start();
    return decodePromise;
  };

  const getAnimTotalMs = () => {
    const outlinePath = root.querySelector("svg .nz-map-outline");
    if (!outlinePath) return 2000;

    const cs = getComputedStyle(outlinePath);
    const d = (cs.animationDuration || cs.webkitAnimationDuration || "").trim();
    const delay = (cs.animationDelay || cs.webkitAnimationDelay || "").trim();

    const parseList = (v) =>
      v
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => (x.endsWith("ms") ? parseFloat(x) : parseFloat(x) * 1000));

    const dList = parseList(d);
    const delayList = parseList(delay);

    const maxLen = Math.max(dList.length, delayList.length, 1);
    const durMs = dList.length ? dList.reduce((a, b) => a + b, 0) : 2000;
    const delayMs = delayList.length ? delayList.reduce((a, b) => a + b, 0) : 0;

    return Math.max(0, durMs + delayMs) || 2000;
  };

  const reveal = () => {
    warmDecode().finally(() => {
      requestAnimationFrame(() => {
        img.classList.add(visibleClass);
      });
    });
  };

  const play = () => {
    img.classList.remove(visibleClass);

    root.classList.remove(animClass);
    requestAnimationFrame(() => {
      root.classList.add(animClass);

      const waitMs = getAnimTotalMs();
      window.setTimeout(reveal, waitMs);
    });
  };

  const kickWarm = () => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => warmDecode(), { timeout: 1500 });
    } else {
      setTimeout(() => warmDecode(), 0);
    }
  };

  kickWarm();

  root.addEventListener("click", play, { passive: true });
})();
