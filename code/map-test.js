const MAPBOX_TOKEN =
  "pk.eyJ1Ijoibm90YW5vdGhlciIsImEiOiJjbTlrMnFpYTcwOTYwMmtwaGZtMzg3a3Z6In0.ajE3pqq2ZegKDqzGbtkbAA";

// --- REGION VARIANT CONFIGURATION ---
const currentScript = document.currentScript;
const requestedRegionSlug = currentScript
  ? currentScript.getAttribute("data-region")
  : null;

const REGION_VARIANTS = {
  timaru: {
    center: { lat: -44.15, lng: 171.0 },
    zoom: 8.2,
    highlightID: "Timaru District",
  },
  mackenzie: {
    center: { lat: -43.9658, lng: 170.4 },
    zoom: 8.0,
    highlightID: "Mackenzie District",
  },
  hurunui: {
    center: { lat: -42.7534, lng: 172.6 },
    zoom: 8.0,
    highlightID: "Hurunui District",
  },
  kaikoura: {
    center: { lat: -42.2568, lng: 173.5 },
    zoom: 8.5,
    highlightID: "Kaikōura District",
  },
  "west-coast": {
    center: { lat: -42.4, lng: 171.4 },
    zoom: 7.2,
    highlightID: "WEST_COAST",
  },
  christchurch: {
    center: { lat: -43.532, lng: 172.6362 },
    zoom: 7.8,
    highlightID: "CANTERBURY_CORE",
  },
};

const DESKTOP_INITIAL_CENTER = { lat: -43.2162, lng: 171.6896 };
const MOBILE_INITIAL_CENTER = { lat: -42.9256, lng: 172.2379 };
const MOBILE_INITIAL_ZOOM = 5.96;

const LABELS_CONFIG = [
  {
    id: "west-coast",
    text: "WEST COAST",
    pos: { lat: -42.5033, lng: 170.8753 },
    type: 1,
  },
  {
    id: "hurunui",
    text: "HURUNUI",
    pos: { lat: -42.7534, lng: 172.4974 },
    type: 1,
  },
  {
    id: "kaikoura",
    text: "KAIKŌURA",
    pos: { lat: -42.2568, lng: 173.6177 },
    type: 1,
  },
  {
    id: "otautahi-christchurch",
    text: "ŌTAUTAHI<br>CHRISTCHURCH",
    pos: { lat: -43.4696, lng: 172.7132 },
    type: 1,
  },
  {
    id: "mackenzie",
    text: "MACKENZIE",
    pos: { lat: -43.9658, lng: 170.1623 },
    type: 1,
  },
  {
    id: "timaru",
    text: "TIMARU",
    pos: { lat: -44.375, lng: 171.2422 },
    type: 1,
  },
  {
    id: "waimakariri-label",
    text: "WAIMAKARIRI",
    pos: { lat: -43.2836, lng: 172.3055 },
    type: 2,
  },
  {
    id: "selwyn-label",
    text: "SELWYN",
    pos: { lat: -43.116, lng: 171.5956 },
    type: 2,
  },
  {
    id: "banks-label",
    text: "BANKS<br>PENINSULA",
    pos: { lat: -43.9833, lng: 173.0333 },
    type: 2,
  },
  {
    id: "mid-canterbury-label",
    text: "MID<br>CANTERBURY",
    pos: { lat: -43.6495, lng: 171.4797 },
    type: 2,
  },
];

const REGION_ID_MAPPING = {
  "Christchurch City": "otautahi-christchurch",
  "Banks Peninsula": "otautahi-christchurch",
  "Ashburton District": "otautahi-christchurch",
  "Selwyn District": "otautahi-christchurch",
  "Waimakariri District": "otautahi-christchurch",

  "Buller District": "west-coast",
  "Grey District": "west-coast",
  "Westland District": "west-coast",

  "Kaikōura District": "kaikoura",
  "Kaikoura District": "kaikoura",
  "Mackenzie District": "mackenzie",
  "Timaru District": "timaru",
  "Hurunui District": "hurunui",
};

const GROUPS = {
  CANTERBURY_CORE: [
    "Christchurch City",
    "Ashburton District",
    "Waimakariri District",
    "Selwyn District",
    "Banks Peninsula",
  ],
  WEST_COAST: ["Buller District", "Grey District", "Westland District"],
};

const getActiveVariant = () => {
  if (requestedRegionSlug && REGION_VARIANTS[requestedRegionSlug]) {
    return REGION_VARIANTS[requestedRegionSlug];
  }
  return null;
};

const getInitialCenter = () => {
  const variant = getActiveVariant();
  if (variant) return variant.center;

  return window.innerWidth < 768
    ? MOBILE_INITIAL_CENTER
    : DESKTOP_INITIAL_CENTER;
};

const getInitialZoom = () => {
  const variant = getActiveVariant();
  if (variant) {
    return window.innerWidth < 768 ? variant.zoom - 0.5 : variant.zoom;
  }

  const width = window.innerWidth;
  if (width < 768) return MOBILE_INITIAL_ZOOM;
  if (width < 1024) return 6.6;
  return 7.25;
};

const getVariantAllowedLabelIds = () => {
  const v = getActiveVariant();
  if (!v || !requestedRegionSlug) return null;

  if (requestedRegionSlug === "christchurch") {
    return new Set([
      "otautahi-christchurch",
      "waimakariri-label",
      "selwyn-label",
      "banks-label",
      "mid-canterbury-label",
    ]);
  }

  if (requestedRegionSlug === "west-coast") return new Set(["west-coast"]);
  if (requestedRegionSlug === "hurunui") return new Set(["hurunui"]);
  if (requestedRegionSlug === "kaikoura") return new Set(["kaikoura"]);
  if (requestedRegionSlug === "mackenzie") return new Set(["mackenzie"]);
  if (requestedRegionSlug === "timaru") return new Set(["timaru"]);

  return null;
};

const getGroupNamesForGroupID = (groupID) => {
  if (groupID === "CANTERBURY_CORE") return GROUPS.CANTERBURY_CORE.slice();
  if (groupID === "WEST_COAST") return GROUPS.WEST_COAST.slice();
  return [groupID];
};

const buildBoundaryAnyFilterExpression = (groupID) => {
  const groupNames = getGroupNamesForGroupID(groupID);

  return [
    "any",
    ...groupNames.flatMap((name) => [
      ["==", ["get", "TA2025_V1_00_NAME"], name],
      ["==", ["get", "cblabel"], name],
    ]),
  ];
};

const applyVariantBoundaryMaskIfNeeded = (map) => {
  const v = getActiveVariant();
  if (!v || !v.highlightID) return;

  const groupID = v.highlightID;

  if (!map.getLayer("boundaries-fill") || !map.getLayer("boundaries-stroke")) {
    return;
  }

  const filterExpr = buildBoundaryAnyFilterExpression(groupID);
  map.setFilter("boundaries-fill", filterExpr);
  map.setFilter("boundaries-stroke", filterExpr);

  console.log(
    `[Map] Variant mask applied. Only showing boundaries for: ${requestedRegionSlug} (${groupID})`
  );
};

if (typeof window !== "undefined") {
  if (typeof window.activeTTDSlug === "undefined") window.activeTTDSlug = null;
}

// --- MAP OPEN/CLOSE FUNCTIONALITY ---
function setupMapOpenClose() {
  const mapOpenerWrapper = document.getElementById("map-opener-wrapper");
  const mapOpener = document.getElementById("map-opener");
  const mapClose = document.getElementById("map-close");
  const mapTop = document.getElementById("map-top");
  const mapArea = document.getElementById("map-area");
  const navHide = document.getElementById("nav-hide");
  const navShow = document.getElementById("nav-show");

  if (mapClose) {
    mapClose.style.display = "none";
  }

  const getLenis = () => {
    return (
      window.lenis ||
      (window.rtSmoothScroll && window.rtSmoothScroll.get("root"))
    );
  };

  const lockScroll = () => {
    const lenis = getLenis();
    if (lenis) {
      lenis.stop();
    }

    const scrollY = window.scrollY || window.pageYOffset;
    window.__mapScrollPosition = scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    document.addEventListener("keydown", preventScrollKeys, { passive: false });
    document.addEventListener("touchmove", preventTouchScroll, {
      passive: false,
    });
    document.addEventListener("wheel", preventWheelScroll, { passive: false });
  };

  const unlockScroll = () => {
    const lenis = getLenis();

    document.removeEventListener("keydown", preventScrollKeys);
    document.removeEventListener("touchmove", preventTouchScroll);
    document.removeEventListener("wheel", preventWheelScroll);

    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";

    if (typeof window.__mapScrollPosition !== "undefined") {
      window.scrollTo(0, window.__mapScrollPosition);
      delete window.__mapScrollPosition;
    }

    if (lenis) {
      lenis.start();
    }
  };

  const preventScrollKeys = (e) => {
    const keys = [32, 33, 34, 35, 36, 37, 38, 39, 40];
    if (keys.includes(e.keyCode)) {
      e.preventDefault();
      return false;
    }
  };

  const preventTouchScroll = (e) => {
    if (e.target.closest("#map")) {
      return;
    }
    e.preventDefault();
    return false;
  };

  const preventWheelScroll = (e) => {
    if (e.target.closest("#map")) {
      return;
    }
    e.preventDefault();
    return false;
  };

  const scrollToElement = (element) => {
    if (!element) return;

    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(element, {
        offset: 0,
        duration: 1.2,
        immediate: false,
      });
    } else {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (mapOpener) {
    mapOpener.addEventListener("click", (e) => {
      e.preventDefault();

      if (mapOpenerWrapper) {
        mapOpenerWrapper.style.display = "none";
      }

      if (mapClose) {
        mapClose.style.display = "flex";
      }

      if (mapTop) {
        scrollToElement(mapTop);
      }

      setTimeout(() => {
        lockScroll();

        setTimeout(() => {
          if (navHide) {
            navHide.click();
            console.log("[Map] Map opened, scroll locked, nav hidden (final)");
          }
        }, 50);
      }, 1300);
    });
  }

  if (mapClose) {
    mapClose.addEventListener("click", (e) => {
      e.preventDefault();

      mapClose.style.display = "none";

      if (mapOpenerWrapper) {
        mapOpenerWrapper.style.display = "flex";
      }

      if (
        window.__mapCloseAllCards &&
        typeof window.__mapCloseAllCards === "function"
      ) {
        window.__mapCloseAllCards();
      }

      if (
        window.__mapResetToInitial &&
        typeof window.__mapResetToInitial === "function"
      ) {
        window.__mapResetToInitial();
      }

      setTimeout(() => {
        unlockScroll();

        setTimeout(() => {
          if (mapArea) {
            scrollToElement(mapArea);
            console.log("[Map] Scrolled to map-area");
          }
        }, 150);

        setTimeout(() => {
          if (navShow) {
            navShow.click();
            console.log(
              "[Map] Map closed, reset, scroll unlocked, nav shown (final)"
            );
          }
        }, 750);
      }, 500);
    });
  }

  console.log("[Map] Open/Close functionality initialized");
}

function showLoadingScreen() {
  const loadingId = "map-loading-screen";
  if (document.getElementById(loadingId)) return;

  const mapSection = document.getElementById("map-section");
  if (!mapSection) {
    console.warn(
      "[Map] #map-section not found for loading screen. Map might not be in DOM yet."
    );
    return;
  }

  const computedStyle = window.getComputedStyle(mapSection);
  if (computedStyle.position === "static") {
    mapSection.style.position = "relative";
  }

  const isMobile = window.innerWidth < 768;
  const spinnerSize = isMobile ? 36 : 48;

  const style = document.createElement("style");
  style.id = "map-loading-screen-styles";
  style.textContent = `
    #${loadingId} {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #c1d58b;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      transition: opacity 0.4s ease, visibility 0s linear 0s;
    }
    #${loadingId}.hidden {
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.4s ease, visibility 0s linear 0.4s;
    }
    .map-loading-spinner {
      width: ${spinnerSize}px;
      height: ${spinnerSize}px;
      border: 3px solid rgba(20, 20, 20, 0.1);
      border-top-color: #141414;
      border-radius: 50%;
      animation: map-spinner-rotate 0.8s linear infinite;
    }
    @keyframes map-spinner-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  const loadingEl = document.createElement("div");
  loadingEl.id = loadingId;
  loadingEl.innerHTML = `
    <div class="map-loading-spinner"></div>
  `;

  mapSection.appendChild(loadingEl);

  console.log("[Map] Loading screen displayed attached to #map-section");
}

function hideLoadingScreen() {
  const loadingId = "map-loading-screen";
  const loadingEl = document.getElementById(loadingId);
  if (!loadingEl) return;

  loadingEl.classList.add("hidden");
  setTimeout(() => {
    if (loadingEl.parentNode) {
      loadingEl.parentNode.removeChild(loadingEl);
    }
  }, 500);

  console.log("[Map] Loading screen hidden");
}

function initMap() {
  if (window.__rtMapInitQueued) return;
  window.__rtMapInitQueued = true;

  const bootMap = () => {
    showLoadingScreen();
    const run = () => initMapCore();
    if ("requestIdleCallback" in window) {
      requestIdleCallback(run, { timeout: 2200 });
    } else {
      setTimeout(run, 0);
    }
  };

  const setupObserver = () => {
    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
      console.warn("[Map] #map container not found during init.");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            console.log(
              "[Map] Intersection detected. Starting map initialization..."
            );
            observer.disconnect();
            bootMap();
          }
        });
      },
      {
        rootMargin: "200px",
        threshold: 0.01,
      }
    );

    observer.observe(mapContainer);
  };

  if (document.readyState === "complete") {
    setupObserver();
  } else {
    window.addEventListener("load", setupObserver, { once: true });
  }
}

function initMapCore() {
  if (typeof mapboxgl === "undefined") {
    console.log("[Map] Waiting for Mapbox GL JS to load...");
    setTimeout(initMapCore, 100);
    return;
  }

  const tStart = performance.now();
  console.log("[Map] 1. Initializing base map...");

  mapboxgl.accessToken = MAPBOX_TOKEN;

  const mapElement = document.querySelector("#map");
  if (!mapElement) {
    console.error("[Map] Error: Map container #map not found.");
    hideLoadingScreen();
    return;
  }

  const startZoom = getInitialZoom();
  const startCenter = getInitialCenter();

  const NZ_BOUNDS = [
    [166.0, -47.5],
    [179.0, -34.0],
  ];

  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/light-v11",
    center: [startCenter.lng, startCenter.lat],
    zoom: startZoom,
    minZoom: 5.5,
    maxBounds: NZ_BOUNDS,
    attributionControl: false,
    logoPosition: "bottom-left",
    cooperativeGestures: true,
    dragRotate: false,
    touchZoomRotate: true,
    touchPitch: false,
    pitchWithRotate: false,
  });

  map.touchZoomRotate.disableRotation();
  map.dragRotate.disable();

  (() => {
    const STYLE_ID = "rt-mapbox-controls-styling";

    if (document.getElementById(STYLE_ID)) return;

    const css = `
      #map .mapboxgl-ctrl-bottom-left .mapboxgl-ctrl-attrib,
      #map .mapboxgl-ctrl-bottom-right,
      #map .mapboxgl-ctrl-top-left,
      #map .mapboxgl-ctrl-top-right,
      #map .mapboxgl-ctrl-logo {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
        
      #map .mapboxgl-cooperative-gesture-screen {
        z-index: 9999 !important;
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
    `;

    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.type = "text/css";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    console.log("[Map] Mapbox controls styled");
  })();

  map.addControl(
    new mapboxgl.AttributionControl({ compact: false }),
    "bottom-left"
  );

  window.__mapboxMap = map;

  setupGestureObserver(map);

  map.on("load", () => {
    const tEnd = performance.now();
    console.log(
      `[Map] Base map initialized in ${(tEnd - tStart).toFixed(2)}ms`
    );

    applyCustomMapStyle(map);
    setupMapFeatures(map);
  });
}

function setupGestureObserver(map) {
  const container = map.getContainer();
  if (!container) return;

  const CSS_CLASS_ACTIVE = "gesture-active";
  const BLOCKER_SELECTORS =
    ".mapboxgl-touch-pan-blocker, .mapboxgl-scroll-zoom-blocker";
  let activeInterval = null;

  const checkOverlayStatus = () => {
    const blockers = container.querySelectorAll(BLOCKER_SELECTORS);
    let isVisiblyActive = false;

    blockers.forEach((el) => {
      const style = window.getComputedStyle(el);
      const opacity = parseFloat(style.opacity);
      const inlineOpacity = el.style.opacity;

      if (
        opacity > 0.01 ||
        (inlineOpacity && parseFloat(inlineOpacity) > 0.01)
      ) {
        isVisiblyActive = true;
      }
    });

    if (isVisiblyActive) {
      if (!container.classList.contains(CSS_CLASS_ACTIVE)) {
        container.classList.add(CSS_CLASS_ACTIVE);
        console.log("[Map] Gesture overlay visible -> z-index 0");
      }

      if (!activeInterval) {
        activeInterval = setInterval(checkOverlayStatus, 150);
      }
    } else {
      if (container.classList.contains(CSS_CLASS_ACTIVE)) {
        container.classList.remove(CSS_CLASS_ACTIVE);
        console.log("[Map] Gesture overlay gone -> z-index restored");
      }

      if (activeInterval) {
        clearInterval(activeInterval);
        activeInterval = null;
      }
    }
  };

  const blockerObserver = new MutationObserver(checkOverlayStatus);

  const attachBlockerObservers = () => {
    const blockers = container.querySelectorAll(BLOCKER_SELECTORS);
    blockers.forEach((el) => {
      if (el.dataset.observerAttached) return;
      el.dataset.observerAttached = "true";
      blockerObserver.observe(el, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    });
  };

  attachBlockerObservers();
  checkOverlayStatus();

  const containerObserver = new MutationObserver((mutations) => {
    let newBlockersFound = false;
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (
            (node.matches && node.matches(BLOCKER_SELECTORS)) ||
            (node.querySelector && node.querySelector(BLOCKER_SELECTORS))
          ) {
            newBlockersFound = true;
          }
        }
      });
    });

    if (newBlockersFound) {
      attachBlockerObservers();
      checkOverlayStatus();
    }
  });

  containerObserver.observe(container, { childList: true, subtree: true });
}

function applyCustomMapStyle(map) {
  const layers = map.getStyle().layers;

  layers.forEach((layer) => {
    const id = layer.id;
    const type = layer.type;

    if (type === "symbol") {
      map.setLayoutProperty(id, "visibility", "none");
    }

    if (id.includes("water") || id === "water" || id.startsWith("water-")) {
      if (type === "fill") {
        map.setPaintProperty(id, "fill-color", "#d7ed9a");
        map.setPaintProperty(id, "fill-opacity", 1);
        map.setLayoutProperty(id, "visibility", "visible");
      } else if (type === "line") {
        map.setPaintProperty(id, "line-color", "#d7ed9a");
        map.setPaintProperty(id, "line-opacity", 1);
        map.setLayoutProperty(id, "visibility", "visible");
      }
    }

    if (
      id.includes("ocean") ||
      id.includes("sea") ||
      id.includes("marine") ||
      id.includes("bathymetry")
    ) {
      if (type === "fill") {
        map.setPaintProperty(id, "fill-color", "#d7ed9a");
        map.setPaintProperty(id, "fill-opacity", 1);
        map.setLayoutProperty(id, "visibility", "visible");
      }
    }

    if (id === "land" || id.includes("land")) {
      if (type === "background" || type === "fill") {
        map.setPaintProperty(
          id,
          type === "background" ? "background-color" : "fill-color",
          "#c1d58b"
        );
      }
    }

    if (id.includes("landcover")) {
      if (type === "fill") {
        map.setPaintProperty(id, "fill-color", "#c1d58b");
        map.setPaintProperty(id, "fill-opacity", 1);
      }
    }

    if (id.includes("landuse")) {
      if (type === "fill") {
        map.setPaintProperty(id, "fill-color", "#c1d58b");
        map.setPaintProperty(id, "fill-opacity", 1);
      }
    }

    if (id.includes("national") || id.includes("park")) {
      if (type === "fill") {
        map.setPaintProperty(id, "fill-color", "#c1d58b");
        map.setPaintProperty(id, "fill-opacity", 1);
      }
    }

    if (
      id.includes("road") ||
      id.includes("bridge") ||
      id.includes("tunnel") ||
      id.includes("street") ||
      id.includes("highway")
    ) {
      map.setLayoutProperty(id, "visibility", "none");
    }

    if (
      id.includes("transit") ||
      id.includes("rail") ||
      id.includes("ferry") ||
      id.includes("aeroway")
    ) {
      map.setLayoutProperty(id, "visibility", "none");
    }

    if (id.includes("building")) {
      map.setLayoutProperty(id, "visibility", "none");
    }

    if (id.includes("poi")) {
      map.setLayoutProperty(id, "visibility", "none");
    }

    if (id.includes("admin") || id.includes("boundary")) {
      map.setLayoutProperty(id, "visibility", "none");
    }

    if (id.includes("place") || id.includes("settlement")) {
      map.setLayoutProperty(id, "visibility", "none");
    }
  });

  if (map.getLayer("background")) {
    map.setPaintProperty("background", "background-color", "#c1d58b");
  }

  console.log("[Map] Custom styling applied.");
}

function setupMapFeatures(map) {
  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  let isMarkerClickActive = false;
  let markerClickTimeout = null;

  const triggerMarkerClickLock = () => {
    isMarkerClickActive = true;
    if (markerClickTimeout) clearTimeout(markerClickTimeout);
    markerClickTimeout = setTimeout(() => {
      isMarkerClickActive = false;
    }, 150);
  };

  const animator = (() => {
    let rafId = null;
    let active = false;
    let lastStartAt = 0;

    const cancel = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      active = false;
    };

    const animateTo = ({ center, zoom }, { duration = 650 } = {}) => {
      const now = performance.now();
      if (now - lastStartAt < 40) duration = Math.max(420, duration - 120);
      lastStartAt = now;

      cancel();
      active = true;

      const startCenter = map.getCenter();
      const startZoom = map.getZoom();

      const endCenter = center || startCenter;
      const endZoom = typeof zoom === "number" ? zoom : startZoom;

      const start = performance.now();

      return new Promise((resolve) => {
        const tick = (time) => {
          const t = clamp((time - start) / duration, 0, 1);
          const e = easeInOutCubic(t);

          const z = startZoom + (endZoom - startZoom) * e;
          const lng = startCenter.lng + (endCenter.lng - startCenter.lng) * e;
          const lat = startCenter.lat + (endCenter.lat - startCenter.lat) * e;

          map.jumpTo({ center: [lng, lat], zoom: z });

          if (t < 1) {
            rafId = requestAnimationFrame(tick);
          } else {
            rafId = null;
            active = false;
            resolve();
          }
        };

        rafId = requestAnimationFrame(tick);
      });
    };

    const cinematicTo = async (center, targetZoom, { duration = 800 } = {}) => {
      await animateTo({ center, zoom: targetZoom }, { duration });
    };

    const smoothZoomTo = (z, { duration = 520 } = {}) => {
      const center = map.getCenter();
      return animateTo(
        { center: { lng: center.lng, lat: center.lat }, zoom: z },
        { duration }
      );
    };

    const isActive = () => active;

    return { animateTo, cinematicTo, smoothZoomTo, cancel, isActive };
  })();

  const labelMarkersData = createCustomLabels(map);

  let closeAllCardsFunc = null;
  let resetAllMarkersFunc = null;

  window.__mapResetToInitial = () => {
    const targetZoom = getInitialZoom();
    const center = getInitialCenter();

    if (resetAllMarkersFunc) {
      resetAllMarkersFunc();
    }

    resetRegionStyles(map);

    if (animator && typeof animator.cinematicTo === "function") {
      animator.cinematicTo(center, targetZoom, { duration: 820 });
      setTimeout(() => smartFitLabels(map), 60);
    } else {
      map.jumpTo({ center: [center.lng, center.lat], zoom: targetZoom });
      smartFitLabels(map);
    }

    console.log("[Map] Reset to initial state");
  };

  window.__mapCloseAllCards = () => {
    if (closeAllCardsFunc) {
      closeAllCardsFunc();
    }
  };

  setupMapControls(map, animator, () => {
    if (closeAllCardsFunc) {
      closeAllCardsFunc();
    }
  });

  let resetAllMarkers = null;
  let activeTTDSlug = null;
  let lockedGroupID = null;
  let currentGroupID = null;

  const activeVariant = getActiveVariant();
  if (activeVariant) {
    console.log(
      `[Map] Variant Active: ${requestedRegionSlug}, Highlight: ${activeVariant.highlightID}`
    );
    lockedGroupID = activeVariant.highlightID;
    currentGroupID = activeVariant.highlightID;
  }

  const onCardClosed = () => {
    lockedGroupID = null;
    activeTTDSlug = null;

    if (typeof window !== "undefined") window.activeTTDSlug = null;
    if (resetAllMarkers) resetAllMarkers();
    clearHoverIfNeeded();
  };

  const { openCard, openTTDCard, closeAllCards } =
    setupContentCards(onCardClosed);

  closeAllCardsFunc = closeAllCards;

  map.once("idle", () => {
    if (!activeVariant) {
      smartFitLabels(map);
    }

    setTimeout(() => {
      hideLoadingScreen();
    }, 300);
  });

  let isTransitioning = false;
  let transitionToken = 0;

  const executeMapTransition = (
    targetLatLng,
    isSwitchingContext,
    forceZoomInOnly = false
  ) => {
    let activeZoomLevel = getInitialZoom() + 1.25;

    if (forceZoomInOnly) {
      const currentZoom = map.getZoom();
      if (typeof currentZoom === "number" && currentZoom > activeZoomLevel) {
        activeZoomLevel = currentZoom;
      }
    }

    const finalTargetPos = getUIAdjustedCenter(
      targetLatLng,
      activeZoomLevel,
      map,
      false
    );

    transitionToken++;
    const myToken = transitionToken;

    isTransitioning = true;

    const doAnim = async () => {
      try {
        const duration = isSwitchingContext ? 750 : 650;
        await animator.cinematicTo(finalTargetPos, activeZoomLevel, {
          duration,
        });
      } finally {
        if (myToken === transitionToken) isTransitioning = false;
      }
    };

    doAnim();
  };

  const markersManager = setupTTDMarkers(
    map,
    openTTDCard,
    closeAllCards,
    (newSlug) => {
      const isSwitching =
        lockedGroupID !== null ||
        (activeTTDSlug !== null && activeTTDSlug !== newSlug);

      lockedGroupID = null;
      resetRegionStyles(map);

      activeTTDSlug = newSlug;
      if (typeof window !== "undefined") window.activeTTDSlug = newSlug;

      return isSwitching;
    },
    executeMapTransition,
    animator,
    labelMarkersData,
    triggerMarkerClickLock
  );

  resetAllMarkers = markersManager.resetMarkers;
  resetAllMarkersFunc = resetAllMarkers;

  const getGroupID = (name) => {
    if (GROUPS.CANTERBURY_CORE.includes(name)) return "CANTERBURY_CORE";
    if (GROUPS.WEST_COAST.includes(name)) return "WEST_COAST";
    return name;
  };

  let activeAnimationId = null;
  let lastFeatureHitAt = 0;
  let clearRafId = null;

  const stopAnimation = () => {
    if (activeAnimationId) {
      cancelAnimationFrame(activeAnimationId);
      activeAnimationId = null;
    }
  };

  const stopClearRaf = () => {
    if (clearRafId) {
      cancelAnimationFrame(clearRafId);
      clearRafId = null;
    }
  };

  const setHoveredGroup = (newGroupID) => {
    if (lockedGroupID) return;
    if (isTransitioning) return;
    if (animator.isActive()) return;
    if (currentGroupID === newGroupID) return;

    stopAnimation();
    resetRegionStyles(map);
    currentGroupID = newGroupID;

    if (newGroupID && map.getSource("boundaries")) {
      animateHighlight(map, newGroupID, 0.001, 0.35, 220);
    }
  };

  const clearHoverIfNeeded = () => {
    stopClearRaf();
    const check = () => {
      if (lockedGroupID) return;
      if (isTransitioning) return;
      if (animator.isActive()) return;

      const now = performance.now();
      const msSinceHit = now - lastFeatureHitAt;
      if (currentGroupID && msSinceHit > 120) {
        stopAnimation();
        resetRegionStyles(map);
        currentGroupID = null;
        clearRafId = null;
        return;
      }
      clearRafId = requestAnimationFrame(check);
    };
    clearRafId = requestAnimationFrame(check);
  };

  const setupRegionInteractions = () => {
    map.on("mousemove", "boundaries-fill", (e) => {
      if (isMarkerClickActive) return;
      if (!e.features || e.features.length === 0) return;

      lastFeatureHitAt = performance.now();
      stopClearRaf();

      const feature = e.features[0];
      const name = getFeatureName(feature);
      const groupID = getGroupID(name);

      map.getCanvas().style.cursor = "pointer";
      setHoveredGroup(groupID);
    });

    map.on("mouseleave", "boundaries-fill", () => {
      map.getCanvas().style.cursor = "";
      clearHoverIfNeeded();
    });

    map.on("click", "boundaries-fill", (e) => {
      if (isMarkerClickActive) {
        console.log("[Map] Region click ignored due to marker lock");
        return;
      }

      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const rawName = getFeatureName(feature);
      const mappedID = REGION_ID_MAPPING[rawName];
      const groupID = getGroupID(rawName);

      console.log(
        `[Map] Clicked Region: ${rawName} -> ID: ${mappedID || "NONE"}`
      );

      if (!mappedID) {
        closeAllCards();
        lockedGroupID = null;
        activeTTDSlug = null;
        if (typeof window !== "undefined") window.activeTTDSlug = null;
        if (resetAllMarkers) resetAllMarkers();
        resetRegionStyles(map);
        return;
      }

      let baseTargetPos = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      const labelConfig = LABELS_CONFIG.find((l) => l.id === mappedID);
      if (labelConfig && labelConfig.pos) {
        baseTargetPos = { lng: labelConfig.pos.lng, lat: labelConfig.pos.lat };
      }

      openCard(mappedID);

      if (lockedGroupID !== groupID) {
        resetRegionStyles(map);
        lockedGroupID = groupID;
        activeTTDSlug = null;
        if (typeof window !== "undefined") window.activeTTDSlug = null;
        if (resetAllMarkers) resetAllMarkers();
        currentGroupID = groupID;
        setHighlightStyle(map, groupID, 0.35);
      }

      executeMapTransition(baseTargetPos, true, false);
    });

    map.on("click", (e) => {
      if (isMarkerClickActive) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ["boundaries-fill"],
      });
      if (!features || features.length === 0) {
        console.log("[Map] Clicked outside regions - closing cards");
        closeAllCards();
        lockedGroupID = null;
        activeTTDSlug = null;
        if (typeof window !== "undefined") window.activeTTDSlug = null;
        if (resetAllMarkers) resetAllMarkers();
        resetRegionStyles(map);
      }
    });
  };

  const animateHighlight = (
    map,
    groupID,
    fromOpacity,
    toOpacity,
    durationMs
  ) => {
    stopAnimation();
    const start = performance.now();
    const from = Math.max(0.001, fromOpacity);
    const to = Math.max(0.001, toOpacity);

    const tick = (time) => {
      let t = (time - start) / durationMs;
      if (t > 1) t = 1;
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setHighlightStyle(map, groupID, current);
      if (t < 1) {
        activeAnimationId = requestAnimationFrame(tick);
      } else {
        activeAnimationId = null;
      }
    };
    activeAnimationId = requestAnimationFrame(tick);
  };

  const lazyLoadBoundaries = async () => {
    console.log("[Map] 3. Starting data fetch...");
    const boundariesData = await loadCanterburyBoundaries();
    if (boundariesData) {
      addBoundariesToMap(map, boundariesData);

      applyVariantBoundaryMaskIfNeeded(map);

      setupRegionInteractions();

      if (activeVariant) {
        console.log(
          `[Map] Applying initial variant highlight: ${activeVariant.highlightID}`
        );
        setTimeout(() => {
          setHighlightStyle(map, activeVariant.highlightID, 0.35);
        }, 100);
      }
    }
  };

  if ("requestIdleCallback" in window) {
    console.log("[Map] 2. Queuing lazy load (idle)...");
    requestIdleCallback(lazyLoadBoundaries, { timeout: 2200 });
  } else {
    setTimeout(lazyLoadBoundaries, 1500);
  }
}

function addBoundariesToMap(map, geojsonData) {
  map.addSource("boundaries", {
    type: "geojson",
    data: geojsonData,
    generateId: true,
  });

  map.addLayer({
    id: "boundaries-fill",
    type: "fill",
    source: "boundaries",
    paint: { "fill-color": "#D7ED9A", "fill-opacity": 0 },
  });

  map.addLayer({
    id: "boundaries-stroke",
    type: "line",
    source: "boundaries",
    paint: { "line-color": "#D7ED9A", "line-width": 2, "line-opacity": 1 },
  });

  console.log("[Map] 7. Boundaries added to map.");
}

function resetRegionStyles(map) {
  if (!map.getLayer("boundaries-fill")) return;
  map.setPaintProperty("boundaries-fill", "fill-opacity", 0);
  map.setPaintProperty("boundaries-stroke", "line-width", 2);
}

function setHighlightStyle(map, groupID, opacity) {
  if (!map.getSource("boundaries")) return;

  const groupNames = getGroupNamesForGroupID(groupID);

  const filterExpression = [
    "any",
    ...groupNames.flatMap((name) => [
      ["==", ["get", "TA2025_V1_00_NAME"], name],
      ["==", ["get", "cblabel"], name],
    ]),
  ];

  map.setPaintProperty("boundaries-fill", "fill-opacity", [
    "case",
    filterExpression,
    opacity,
    0,
  ]);

  const fillColorExpression = [
    "case",
    [
      "any",
      ["==", ["get", "TA2025_V1_00_NAME"], "Banks Peninsula"],
      ["==", ["get", "cblabel"], "Banks Peninsula"],
    ],
    "#C9DE91",
    "#D7ED9A",
  ];

  map.setPaintProperty("boundaries-fill", "fill-color", fillColorExpression);
  map.setPaintProperty("boundaries-stroke", "line-width", [
    "case",
    filterExpression,
    3,
    2,
  ]);
}

function setupTTDMarkers(
  map,
  openTTDCard,
  closeAllCards,
  onMarkerClick,
  executeMapTransition,
  animator,
  labelMarkersData,
  triggerMarkerClickLock
) {
  const wrapper = document.getElementById("map-ttd-list");
  if (!wrapper) {
    console.warn("[Map] #map-ttd-list not found");
    return { resetMarkers: () => {}, markers: [] };
  }

  const items = wrapper.querySelectorAll(
    '.map-content-item[data-map-content="ttd"]'
  );
  console.log(`[Map] Found ${items.length} TTD items to process`);

  const allMarkers = [];
  const markerElements = new Map();
  let activeSlug = null;

  const isMobile = window.innerWidth < 768;
  const markerSize = isMobile ? 2.25 : 3.5;

  const ensureMarkerBaseCSS = () => {
    const styleId = "ttd-marker-fix-css";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .mapboxgl-map * {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
      .ttd-marker-outer {
        width: ${markerSize}rem;
        height: ${markerSize}rem;
        padding: 0;
        border-radius: 0;
        box-sizing: border-box;
        cursor: pointer;
        overflow: visible;
        z-index: 2000 !important;
      }
      .ttd-marker-inner {
        width: 100%;
        height: 100%;
        padding: 0;
        border-radius: 0;
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #D7ED9A;
        border: 1.5px solid #141414;
        transform: scale(1);
        transition: background-color 0.2s ease, border-width 0.2s ease, transform 0.22s cubic-bezier(0.19, 1, 0.22, 1);
        will-change: transform;
      }
      .ttd-marker-inner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
        display: block;
      }
      .ttd-cluster-marker {
        min-width: ${markerSize}rem;
        min-height: ${markerSize}rem;
        border-radius: 50%;
        background: rgba(170, 188, 120, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-sizing: border-box;
        padding: 0.5rem;
        pointer-events: auto;
        z-index: 3000 !important;
        transition: background 0.2s ease;
      }
      .ttd-cluster-marker.over-label {
        background: rgba(170, 188, 120, 0.75);
      }
      .ttd-cluster-marker:hover .ttd-cluster-inner {
        transform: scale(1.1);
      }
      .ttd-cluster-inner {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.22s cubic-bezier(0.19, 1, 0.22, 1);
        pointer-events: none;
      }
      .ttd-cluster-text {
        font-family: var(--global--font-family-1);
        font-size: ${isMobile ? "11px" : "14px"};
        font-weight: 600;
        color: #141414;
        text-align: center;
        line-height: 1;
        letter-spacing: 0.5px;
        pointer-events: none;
        user-select: none;
      }
      .map-label {
        z-index: 1000 !important;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }
      .map-label.hidden {
        opacity: 0;
        visibility: hidden;
      }

      body #map.gesture-active .ttd-marker-outer,
      body #map.gesture-active .ttd-cluster-marker,
      body #map.gesture-active .map-label {
        z-index: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  };

  ensureMarkerBaseCSS();

  const updateMarkerStyles = (activeSlugArg) => {
    markerElements.forEach((obj, slug) => {
      const isActive = slug === activeSlugArg;
      obj.outer.style.display = "block";
      if (isActive) {
        obj.inner.style.backgroundColor = "#F3FFD2";
        obj.inner.style.borderWidth = "2px";
        obj.inner.style.transform = "scale(1.06)";
      } else {
        obj.inner.style.backgroundColor = "#D7ED9A";
        obj.inner.style.borderWidth = "1.5px";
        obj.inner.style.transform = "scale(1)";
      }
    });
  };

  items.forEach((item, index) => {
    const lat = parseFloat(item.dataset.mapLat);
    const lng = parseFloat(item.dataset.mapLong);
    const slug = item.dataset.savedSlug;

    const svgImgEl = item.querySelector("img[data-map-content-pointer]");

    if (isNaN(lat) || isNaN(lng) || !slug) {
      console.warn(
        `[Map] Skipping TTD item ${index} - invalid coordinates or slug:`,
        { lat, lng, slug }
      );
      return;
    }

    if (!svgImgEl) {
      console.warn(
        `[Map] Skipping TTD item ${index} (${slug}) - no SVG icon found`
      );
      return;
    }

    const svgUrl = svgImgEl.src;

    const outer = document.createElement("div");
    outer.className = "ttd-marker-outer";
    outer.style.width = `${markerSize}rem`;
    outer.style.height = `${markerSize}rem`;
    outer.style.padding = "0";
    outer.style.borderRadius = "0";
    outer.style.boxSizing = "border-box";
    outer.style.cursor = "pointer";

    const inner = document.createElement("div");
    inner.className = "ttd-marker-inner";

    const img = document.createElement("img");
    img.src = svgUrl;
    img.alt = "";
    img.draggable = false;

    inner.appendChild(img);
    outer.appendChild(inner);

    outer.addEventListener("mouseenter", () => {
      if (slug !== activeSlug) inner.style.transform = "scale(1.04)";
    });

    outer.addEventListener("mouseleave", () => {
      if (slug !== activeSlug) inner.style.transform = "scale(1)";
    });

    outer.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (triggerMarkerClickLock) triggerMarkerClickLock();

      const targetCard = document.querySelector(
        `.map-content-item[data-saved-slug="${slug}"]`
      );
      const isAlreadyOpen = !!(
        targetCard && targetCard.classList.contains("is-active")
      );

      if (isAlreadyOpen) {
        if (typeof closeAllCards === "function") closeAllCards();
        activeSlug = null;
        updateMarkerStyles(null);
        if (typeof window !== "undefined") window.activeTTDSlug = null;
        console.log(`[Map] Closed TTD card via marker toggle: ${slug}`);
        return;
      }

      console.log(`[Map] Clicked TTD marker: ${slug}`);

      const isSwitching = onMarkerClick(slug);

      openTTDCard(slug);
      executeMapTransition({ lng, lat }, isSwitching, true);

      activeSlug = slug;
      updateMarkerStyles(slug);
    });

    markerElements.set(slug, { outer, inner });

    allMarkers.push({
      slug,
      svgUrl,
      lngLat: { lng, lat },
      element: outer,
      isTTD: true,
    });

    console.log(
      `[Map] Created TTD marker ${index + 1}/${
        items.length
      }: ${slug} at [${lat}, ${lng}]`
    );
  });

  console.log(`[Map] Successfully created ${allMarkers.length} TTD markers`);

  const clusterManager = setupCustomClustering(
    map,
    allMarkers,
    animator,
    markerElements,
    labelMarkersData,
    markerSize,
    triggerMarkerClickLock
  );

  const addMarkersToMap = () => {
    clusterManager.initialize();
  };

  if (map.loaded()) {
    console.log("[Map] Map already loaded, initializing clustering");
    setTimeout(addMarkersToMap, 100);
  } else {
    console.log("[Map] Waiting for map to load before initializing clustering");
    map.once("load", () => {
      setTimeout(addMarkersToMap, 100);
    });
  }

  return {
    resetMarkers: () => {
      activeSlug = null;
      updateMarkerStyles(null);
    },
    markers: allMarkers,
  };
}

function setupCustomClustering(
  map,
  markers,
  animator,
  markerElements,
  labelMarkersData,
  markerSize,
  triggerMarkerClickLock
) {
  const isMobile = window.innerWidth < 768;
  const CLUSTER_RADIUS_PX = isMobile ? 70 : 120;
  const MIN_CLUSTER_SIZE = 2;
  const MAX_CLUSTER_ZOOM = 11.5;
  const LABEL_HIDE_ZOOM = 9.5;

  let clusterMarkers = [];
  let individualMarkers = [];

  const getClusterSize = (count) => {
    if (isMobile) return markerSize;

    const baseSize = 6;
    if (count < 5) return baseSize;
    if (count < 10) return baseSize + 1.5;
    if (count < 25) return baseSize + 3;
    if (count < 50) return baseSize + 4.5;
    return baseSize + 6;
  };

  const getClusterText = (count) => {
    if (count > 99) return "99+";
    return count.toString();
  };

  const isOverlappingLabel = (center, map, type = "cluster") => {
    const point = map.project([center.lng, center.lat]);
    const labelEls = document.querySelectorAll(".map-label");

    const currentZoom = map.getZoom();
    const initialZoom = getInitialZoom();

    if (type === "marker" && currentZoom > initialZoom + 0.5) {
      return false;
    }

    for (const labelEl of labelEls) {
      const rect = labelEl.getBoundingClientRect();
      const mapContainer = map.getContainer().getBoundingClientRect();

      const labelCenterX = rect.left + rect.width / 2 - mapContainer.left;
      const labelCenterY = rect.top + rect.height / 2 - mapContainer.top;

      const distance = Math.sqrt(
        Math.pow(point.x - labelCenterX, 2) +
          Math.pow(point.y - labelCenterY, 2)
      );

      const overlapThreshold = type === "cluster" ? 100 : 80;
      if (distance < overlapThreshold) {
        return true;
      }
    }

    return false;
  };

  const updateLabelVisibility = () => {
    const currentZoom = map.getZoom();
    const shouldHide = currentZoom > LABEL_HIDE_ZOOM;

    labelMarkersData.forEach(({ element }) => {
      const labelEl = element.querySelector(".map-label");
      if (labelEl) {
        if (shouldHide) {
          labelEl.classList.add("hidden");
        } else {
          labelEl.classList.remove("hidden");
        }
      }
    });
  };

  const createClusterMarker = (points, center) => {
    const count = points.length;
    const size = getClusterSize(count);
    const text = getClusterText(count);

    const el = document.createElement("div");
    el.className = "ttd-cluster-marker";
    el.style.width = `${size}rem`;
    el.style.height = `${size}rem`;
    el.style.pointerEvents = "auto";

    if (isOverlappingLabel(center, map, "cluster")) {
      el.classList.add("over-label");
    }

    const innerWrapper = document.createElement("div");
    innerWrapper.className = "ttd-cluster-inner";

    const textEl = document.createElement("div");
    textEl.className = "ttd-cluster-text";
    textEl.textContent = text;

    innerWrapper.appendChild(textEl);
    el.appendChild(innerWrapper);

    el.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (triggerMarkerClickLock) triggerMarkerClickLock();

      const currentZoom = map.getZoom();
      let targetZoom = currentZoom + 2;

      const maxAttempts = 5;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const testZoom = currentZoom + 2 + attempt;

        const wouldBreak = points.some((p1, i) => {
          return points.some((p2, j) => {
            if (i >= j) return false;
            const screenPos1 = map.project(
              new mapboxgl.LngLat(p1.lngLat.lng, p1.lngLat.lat)
            );
            const screenPos2 = map.project(
              new mapboxgl.LngLat(p2.lngLat.lng, p2.lngLat.lat)
            );

            const zoomFactor = Math.pow(2, testZoom - currentZoom);
            const projectedDistance =
              Math.sqrt(
                Math.pow(screenPos1.x - screenPos2.x, 2) +
                  Math.pow(screenPos1.y - screenPos2.y, 2)
              ) * zoomFactor;

            return projectedDistance >= CLUSTER_RADIUS_PX;
          });
        });

        if (wouldBreak || testZoom > MAX_CLUSTER_ZOOM + 1) {
          targetZoom = Math.min(testZoom, MAX_CLUSTER_ZOOM + 1);
          break;
        }
      }

      const isCardOpen = !!document.querySelector(
        ".map-content-item.is-active"
      );

      const adjustedCenter = getUIAdjustedCenter(
        center,
        targetZoom,
        map,
        !isCardOpen
      );

      if (animator && typeof animator.cinematicTo === "function") {
        await animator.cinematicTo(adjustedCenter, targetZoom, {
          duration: 720,
        });
      } else {
        map.flyTo({
          center: [adjustedCenter.lng, adjustedCenter.lat],
          zoom: targetZoom,
        });
      }

      setTimeout(() => updateClusters(), 100);
    });

    const marker = new mapboxgl.Marker({
      element: el,
      anchor: "center",
    })
      .setLngLat([center.lng, center.lat])
      .addTo(map);

    return { marker, element: el, points };
  };

  const projectToScreen = (lngLat) => {
    const point = map.project([lngLat.lng, lngLat.lat]);
    return { x: point.x, y: point.y };
  };

  const distance = (p1, p2) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getClusterCenter = (points) => {
    let sumLat = 0;
    let sumLng = 0;
    points.forEach((p) => {
      sumLat += p.lngLat.lat;
      sumLng += p.lngLat.lng;
    });
    return {
      lat: sumLat / points.length,
      lng: sumLng / points.length,
    };
  };

  const clearClusters = () => {
    clusterMarkers.forEach((cm) => {
      if (cm.marker) cm.marker.remove();
    });
    clusterMarkers = [];

    individualMarkers.forEach((im) => {
      if (im.marker) im.marker.remove();
    });
    individualMarkers = [];
  };

  const updateClusters = () => {
    clearClusters();
    updateLabelVisibility();

    const currentZoom = map.getZoom();
    const ttdMarkers = markers.filter((m) => m.isTTD === true);

    if (currentZoom > MAX_CLUSTER_ZOOM) {
      ttdMarkers.forEach((m) => {
        const overlapsLabel = isOverlappingLabel(m.lngLat, map, "marker");

        if (overlapsLabel && currentZoom <= getInitialZoom() + 0.5) {
          return;
        }

        const marker = new mapboxgl.Marker({
          element: m.element,
          anchor: "center",
        })
          .setLngLat([m.lngLat.lng, m.lngLat.lat])
          .addTo(map);

        individualMarkers.push({ marker, data: m });
      });
      return;
    }

    const processed = new Set();
    const clusters = [];

    ttdMarkers.forEach((marker, i) => {
      if (processed.has(i)) return;

      const screenPos = projectToScreen(marker.lngLat);
      const cluster = [i];

      ttdMarkers.forEach((otherMarker, j) => {
        if (i === j || processed.has(j)) return;

        const otherScreenPos = projectToScreen(otherMarker.lngLat);
        const dist = distance(screenPos, otherScreenPos);

        if (dist < CLUSTER_RADIUS_PX) {
          cluster.push(j);
          processed.add(j);
        }
      });

      processed.add(i);

      if (cluster.length >= MIN_CLUSTER_SIZE) {
        const clusterPoints = cluster.map((idx) => ttdMarkers[idx]);
        const center = getClusterCenter(clusterPoints);
        clusters.push({ points: clusterPoints, center });
      } else {
        const m = ttdMarkers[i];

        const overlapsLabel = isOverlappingLabel(m.lngLat, map, "marker");

        if (overlapsLabel && currentZoom <= getInitialZoom() + 0.5) {
          return;
        }

        const marker = new mapboxgl.Marker({
          element: m.element,
          anchor: "center",
        })
          .setLngLat([m.lngLat.lng, m.lngLat.lat])
          .addTo(map);

        individualMarkers.push({ marker, data: m });
      }
    });

    clusters.forEach((cluster) => {
      const cm = createClusterMarker(cluster.points, cluster.center);
      clusterMarkers.push(cm);
    });

    console.log(
      `[Map] Clustering: ${clusters.length} clusters, ${
        individualMarkers.length
      } individual markers at zoom ${currentZoom.toFixed(2)}`
    );
  };

  map.on("zoom", updateClusters);
  map.on("moveend", updateClusters);

  return {
    initialize: () => {
      updateClusters();
    },
    update: updateClusters,
    clear: clearClusters,
  };
}

const getUIAdjustedCenter = (lngLat, targetZoom, map, ignoreOffset = false) => {
  if (ignoreOffset) {
    return { lng: lngLat.lng, lat: lngLat.lat };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isMobile = width < 768;

  const metersPerPixel =
    (156543.03392 * Math.cos((lngLat.lat * Math.PI) / 180)) /
    Math.pow(2, targetZoom);

  let offsetLng = 0;
  let offsetLat = 0;

  if (isMobile) {
    const offsetPx = height * 0.18;
    offsetLat = -(offsetPx * metersPerPixel) / 111320;
  } else {
    const cardWidthEstimate = 420;
    const offsetPx = cardWidthEstimate * 0.5;
    offsetLng =
      (offsetPx * metersPerPixel) /
      (111320 * Math.cos((lngLat.lat * Math.PI) / 180));
  }

  return { lng: lngLat.lng + offsetLng, lat: lngLat.lat + offsetLat };
};

function setupContentCards(onCloseCallback) {
  const cards = document.querySelectorAll(".map-content-item");
  const closeButtons = document.querySelectorAll("[data-map-close-content]");
  let activeCard = null;

  const styleId = "map-card-animations";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .map-content-item {
        transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1), 
                    visibility 0s linear 0.5s;
        transform: translateY(150%);
        z-index: 2000;
        pointer-events: none;
        visibility: hidden;
      }
      .map-content-item.is-active {
        transform: translateY(0%);
        pointer-events: auto;
        visibility: visible;
        transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1),
                    visibility 0s linear 0s;
      }
    `;
    document.head.appendChild(style);
  }

  cards.forEach((card) => card.classList.remove("is-active"));

  const closeAllCards = () => {
    if (activeCard) {
      activeCard.classList.remove("is-active");
      activeCard = null;
      if (onCloseCallback) onCloseCallback();
    }
  };

  closeButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      closeAllCards();
    });
  });

  const openCard = (regionId) => {
    const targetCard = document.querySelector(
      `[data-map-content-region-name="${regionId}"]`
    );
    activateCard(targetCard, `Region ID: ${regionId}`);
  };

  const openTTDCard = (slug) => {
    const targetCard = document.querySelector(
      `.map-content-item[data-saved-slug="${slug}"]`
    );
    activateCard(targetCard, `TTD Slug: ${slug}`);
  };

  const activateCard = (targetCard, debugName) => {
    if (!targetCard) {
      console.warn(`[Map] No card found for: ${debugName}`);
      return;
    }

    if (activeCard === targetCard) return;

    if (activeCard) activeCard.classList.remove("is-active");

    requestAnimationFrame(() => {
      targetCard.classList.add("is-active");
      activeCard = targetCard;

      const mapContainer = document.getElementById("map");
      if (mapContainer) {
        mapContainer.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    });
  };

  return { openCard, openTTDCard, closeAllCards };
}

function smartFitLabels(map) {
  if (!LABELS_CONFIG || LABELS_CONFIG.length === 0) return;

  const bounds = new mapboxgl.LngLatBounds();
  LABELS_CONFIG.forEach((label) =>
    bounds.extend([label.pos.lng, label.pos.lat])
  );

  const optimalZoom = getInitialZoom();
  console.log(`[Map] SmartFit: Calculated optimal zoom is ${optimalZoom}`);

  const center = getInitialCenter();

  map.jumpTo({
    center: [center.lng, center.lat],
    zoom: optimalZoom,
  });
}

function setupMapControls(map, animator, closeAllCards) {
  const zoomInBtn = document.getElementById("map-zoom-in");
  const zoomOutBtn = document.getElementById("map-zoom-out");
  const recenterBtn = document.getElementById("map-recenter");

  const CENTER_EPS = 0.0001;
  const ZOOM_EPS = 0.2;

  const normalizeLng = (lng) => {
    let x = lng;
    while (x > 180) x -= 360;
    while (x < -180) x += 360;
    return x;
  };

  const isDefaultView = () => {
    const c = map.getCenter();
    if (!c) return false;

    const z = map.getZoom();
    if (typeof z !== "number") return false;

    const targetCenter = getInitialCenter();
    const targetZoom = getInitialZoom();

    const dLat = Math.abs(c.lat - targetCenter.lat);
    const dLng = Math.abs(normalizeLng(c.lng) - normalizeLng(targetCenter.lng));
    const dZoom = Math.abs(z - targetZoom);

    return dLat <= CENTER_EPS && dLng <= CENTER_EPS && dZoom <= ZOOM_EPS;
  };

  const setRecenterVisible = (visible) => {
    if (!recenterBtn) return;
    const desired = visible ? "flex" : "none";
    if (recenterBtn.style.display === desired) return;
    recenterBtn.style.display = desired;
  };

  const syncRecenterVisibility = () => {
    if (!recenterBtn) return;
    setRecenterVisible(!isDefaultView());
  };

  const getZoomSafe = () => {
    const z = map.getZoom();
    return typeof z === "number" ? z : getInitialZoom();
  };

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = getZoomSafe() + 1;
      if (animator && typeof animator.smoothZoomTo === "function")
        animator.smoothZoomTo(target, { duration: 420 });
      else map.zoomTo(target);
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = getZoomSafe() - 1;
      if (animator && typeof animator.smoothZoomTo === "function")
        animator.smoothZoomTo(target, { duration: 420 });
      else map.zoomTo(target);
    });
  }

  if (recenterBtn) {
    recenterBtn.addEventListener("click", (e) => {
      e.preventDefault();

      if (closeAllCards) {
        closeAllCards();
      }

      const targetZoom = getInitialZoom();
      const center = getInitialCenter();

      if (animator && typeof animator.cinematicTo === "function") {
        animator.cinematicTo(center, targetZoom, { duration: 820 });
        setTimeout(() => smartFitLabels(map), 60);
      } else {
        map.jumpTo({ center: [center.lng, center.lat], zoom: targetZoom });
        smartFitLabels(map);
      }

      syncRecenterVisibility();
    });
  }

  map.on("moveend", syncRecenterVisibility);
  map.on("zoomend", syncRecenterVisibility);
  map.on("idle", syncRecenterVisibility);

  setTimeout(syncRecenterVisibility, 100);
}

function createCustomLabels(map) {
  const markers = [];
  const allowed = getVariantAllowedLabelIds();

  LABELS_CONFIG.forEach((config) => {
    if (allowed && !allowed.has(config.id)) return;

    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.fontFamily = "var(--global--font-family-1)";
    el.style.zIndex = "1000";
    el.style.pointerEvents = "none";
    el.style.cursor = "default";

    if (config.type === 2) {
      el.innerHTML = `<div class="map-label"><div class="map-label-text type2">${config.text}</div></div>`;
    } else {
      el.innerHTML = `<div class="map-label"><div class="map-label-pointer"></div><div class="map-label-text">${config.text}</div></div>`;
    }

    const anchor = config.type === 1 ? "top-left" : "center";

    const marker = new mapboxgl.Marker({
      element: el,
      anchor,
      draggable: false,
    })
      .setLngLat([config.pos.lng, config.pos.lat])
      .addTo(map);

    markers.push({ marker, config, element: el });
  });

  if (allowed) {
    console.log(
      `[Map] Variant labels active (${requestedRegionSlug}). Rendering labels: ${Array.from(
        allowed
      ).join(", ")}`
    );
  }

  return markers;
}

function getFeatureName(feature) {
  const props = feature.properties || feature;
  return props.TA2025_V1_00_NAME || props.cblabel;
}

const DB_NAME = "NZ_Map_DB";
const STORE_NAME = "boundaries";
const CACHE_KEY = "canterbury_v5";
const CACHE_EXPIRY_DAYS = 7;

async function loadCanterburyBoundaries() {
  const tStart = performance.now();
  console.log("[Map] 4. Checking Cache...");

  try {
    const cachedData = await getFromDB(CACHE_KEY);

    if (cachedData) {
      const tEnd = performance.now();
      console.log(`[Map] 5. Cache HIT (${(tEnd - tStart).toFixed(2)}ms)`);
      return cachedData;
    }

    console.log("[Map] 5. Cache MISS. Fetching API...");

    const statsNzTaLayerUrl =
      "https://services2.arcgis.com/vKb0s8tBIA3bdocZ/ArcGIS/rest/services/Territorial_Authorities/FeatureServer/1/query";

    const taNames = [
      "Buller District",
      "Grey District",
      "Westland District",
      "Hurunui District",
      "Kaikōura District",
      "Kaikoura District",
      "Selwyn District",
      "Waimakariri District",
      "Christchurch City",
      "Ashburton District",
      "Mackenzie District",
      "Timaru District",
    ];

    const taWhere =
      "TA2025_V1_00_NAME IN (" +
      taNames.map((n) => `'${escapeSqlString(n)}'`).join(",") +
      ")";

    const cccCommunityBoardsLayerUrl =
      "https://gis.ccc.govt.nz/arcgis/rest/services/Hosted/Community_Boards/FeatureServer/0/query";
    const bpWhere = "cblabel = 'Banks Peninsula'";

    const tNetStart = performance.now();

    const [taGeoJson, bpGeoJson] = await Promise.all([
      fetchArcGisGeoJson(statsNzTaLayerUrl, {
        where: taWhere,
        outFields: "TA2025_V1_00_NAME",
      }),
      fetchArcGisGeoJson(cccCommunityBoardsLayerUrl, {
        where: bpWhere,
        outFields: "cblabel",
      }),
    ]);

    const tNetEnd = performance.now();
    console.log(
      `[Map] 6. Network done in ${(tNetEnd - tNetStart).toFixed(2)}ms.`
    );

    const combinedGeoJson = {
      type: "FeatureCollection",
      features: [...taGeoJson.features, ...bpGeoJson.features],
    };

    await saveToDB(CACHE_KEY, combinedGeoJson);
    console.log("[Map] 8. Saved to DB.");

    return combinedGeoJson;
  } catch (error) {
    console.error("[Map] CRITICAL ERROR:", error);
    return null;
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToDB(key, data) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ timestamp: Date.now(), data: data }, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[Map] IndexedDB Save Failed:", err);
  }
}

async function getFromDB(key) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const payload = request.result;
        if (!payload) {
          resolve(null);
          return;
        }
        if (Date.now() - payload.timestamp > CACHE_EXPIRY_DAYS * 86400000)
          resolve(null);
        else resolve(payload.data);
      };
      request.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
}

async function fetchArcGisGeoJson(layerQueryUrl, { where, outFields }) {
  const params = new URLSearchParams();
  params.set("where", where);
  params.set("outFields", outFields || "*");
  params.set("returnGeometry", "true");
  params.set("outSR", "4326");
  params.set("f", "geojson");
  const res = await fetch(`${layerQueryUrl}?${params.toString()}`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!data || !data.features) throw new Error("Invalid GeoJSON");
  return data;
}

function escapeSqlString(value) {
  return String(value).replace(/'/g, "''");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupMapOpenClose);
} else {
  setupMapOpenClose();
}

window.initMap = initMap;
initMap();
