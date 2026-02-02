const DEV_MODE = false;

const INITIAL_CENTER = { lat: -43.2162, lng: 171.6896 };

const getInitialZoom = () => {
  const width = window.innerWidth;
  if (width < 768) return 7.0;
  if (width < 1024) return 7.6;
  return 8.25;
};

const MAP_GESTURE_HINT = {
  enabled: true,
  id: "map-gesture-hint",
  showForMs: 1200,
  minGapMs: 250,
  textMac: "Hold ⌘ and scroll to zoom the map",
  textWin: "Hold Ctrl and scroll to zoom the map",
};

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

const __rtIsCoarsePointer = () => {
  try {
    return !!(
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches
    );
  } catch (_) {
    return false;
  }
};

const __rtCanHover = () => {
  try {
    return !!(
      window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  } catch (_) {
    return false;
  }
};

const __rtIsMobilePerfMode = () => {
  return window.innerWidth < 768 || __rtIsCoarsePointer();
};

const __rtCreateRafScheduler = () => {
  let rafId = null;
  return (fn) => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      fn();
    });
  };
};

const __rtCreateAdaptiveDebounce = () => {
  let t = null;
  let lastReason = "";
  return (fn, delay, reason) => {
    lastReason = reason || lastReason;
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(lastReason);
    }, delay);
  };
};

function initMap() {
  if (window.__rtMapInitQueued) return;
  window.__rtMapInitQueued = true;

  const boot = () => {
    const run = () => initMapCore();
    if ("requestIdleCallback" in window) {
      requestIdleCallback(run, { timeout: 2200 });
    } else {
      setTimeout(run, 0);
    }
  };

  if (document.readyState === "complete") {
    boot();
  } else {
    window.addEventListener("load", boot, { once: true });
  }
}

function initMapCore() {
  const tStart = performance.now();
  console.log("[Map] 1. Initializing base map...");

  const mapStyle = [
    {
      featureType: "all",
      elementType: "all",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "administrative.land_parcel",
      elementType: "geometry.stroke",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "administrative.neighborhood",
      elementType: "geometry.stroke",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "administrative",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ visibility: "on" }, { color: "#c1d58b" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ visibility: "on" }, { color: "#d7ed9a" }],
    },
    {
      featureType: "water",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "road",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "transit",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ];

  const mapElement = document.querySelector("#map");
  if (!mapElement) {
    console.error("[Map] Error: Map container #map not found.");
    return;
  }

  const NZ_BOUNDS = { north: -34.0, south: -47.5, west: 166.0, east: 179.0 };
  const startZoom = getInitialZoom();

  const map = new google.maps.Map(mapElement, {
    center: INITIAL_CENTER,
    zoom: startZoom,
    disableDefaultUI: true,
    gestureHandling: "cooperative",
    styles: mapStyle,
    minZoom: 6.5,
    restriction: { latLngBounds: NZ_BOUNDS, strictBounds: false },
  });

  const tEnd = performance.now();
  console.log(`[Map] Base map initialized in ${(tEnd - tStart).toFixed(2)}ms`);

  map.data.setStyle({
    fillColor: "transparent",
    strokeColor: "#D7ED9A",
    strokeWeight: 2,
    strokeOpacity: 1.0,
    clickable: true,
  });

  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const animator = (() => {
    let rafId = null;
    let active = false;
    let lastStartAt = 0;

    const cancel = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      active = false;
    };

    const getProjectionSafe = () => map.getProjection && map.getProjection();

    const getWorldPoint = (latLng) => {
      const p = getProjectionSafe();
      if (!p) return null;
      return p.fromLatLngToPoint(latLng);
    };

    const getLatLngFromWorld = (pt) => {
      const p = getProjectionSafe();
      if (!p) return null;
      return p.fromPointToLatLng(pt);
    };

    const setCamera = (center, zoom) => {
      if (typeof map.moveCamera === "function") {
        map.moveCamera({ center, zoom });
        return;
      }
      if (typeof zoom === "number") map.setZoom(zoom);
      if (center) map.setCenter(center);
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

      const w0 = startCenter ? getWorldPoint(startCenter) : null;
      const w1 = endCenter ? getWorldPoint(endCenter) : null;

      if (
        !w0 ||
        !w1 ||
        typeof startZoom !== "number" ||
        typeof endZoom !== "number"
      ) {
        setCamera(endCenter, endZoom);
        active = false;
        return Promise.resolve();
      }

      const start = performance.now();

      return new Promise((resolve) => {
        const tick = (time) => {
          const t = clamp((time - start) / duration, 0, 1);
          const e = easeInOutCubic(t);

          const z = startZoom + (endZoom - startZoom) * e;

          const wx = w0.x + (w1.x - w0.x) * e;
          const wy = w0.y + (w1.y - w0.y) * e;
          const c =
            getLatLngFromWorld(new google.maps.Point(wx, wy)) || endCenter;

          setCamera(c, z);

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
      return animateTo({ center, zoom: z }, { duration });
    };

    const isActive = () => active;

    return { animateTo, cinematicTo, smoothZoomTo, cancel, isActive };
  })();

  createCustomLabels(map);
  setupMapControls(map, animator);

  const onCardClosed = () => {
    lockedGroupID = null;
    activeTTDSlug = null;
    if (resetAllMarkers) resetAllMarkers();
    clearHoverIfNeeded();
  };

  const { openCard, openTTDCard, closeAllCards } =
    setupContentCards(onCardClosed);

  let isGlobalScrolling = false;
  const setGlobalScrollingState = (isScrolling) => {
    isGlobalScrolling = isScrolling;
  };
  setupCustomCooperativeGestureHint(map, setGlobalScrollingState);

  google.maps.event.addListenerOnce(map, "idle", () => {
    smartFitLabels(map);
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
      map
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

  let resetAllMarkers = null;
  let activeTTDSlug = null;

  const markersManager = setupTTDMarkers(
    map,
    openTTDCard,
    (newSlug) => {
      closeAllCards();

      const isSwitching =
        lockedGroupID !== null ||
        (activeTTDSlug !== null && activeTTDSlug !== newSlug);

      lockedGroupID = null;
      map.data.revertStyle();

      activeTTDSlug = newSlug;
      return isSwitching;
    },
    executeMapTransition
  );

  resetAllMarkers = markersManager.resetMarkers;

  if (markersManager.overlays && markersManager.overlays.length > 0) {
    setupMapClusterer(map, markersManager.overlays, animator);
  }

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

  const getGroupID = (feature) => {
    const name = getFeatureName(feature);
    if (GROUPS.CANTERBURY_CORE.includes(name)) return "CANTERBURY_CORE";
    if (GROUPS.WEST_COAST.includes(name)) return "WEST_COAST";
    return name;
  };

  const BANKS_PENINSULA_NAME = "Banks Peninsula";
  const BANKS_PENINSULA_HOVER_FILL = "#C9DE91";

  let currentGroupID = null;
  let lockedGroupID = null;
  let activeAnimationId = null;
  let lastFeatureHitAt = 0;
  let clearRafId = null;
  let lastRenderedOpacity = 0;

  let featureCacheVersion = 0;
  let cachedGroupID = null;
  let cachedGroupFeatures = null;
  let cachedFeaturesVersion = -1;

  map.data.addListener("addfeature", () => {
    featureCacheVersion++;
    cachedGroupID = null;
    cachedGroupFeatures = null;
    cachedFeaturesVersion = -1;
  });

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

  const getGroupFeatures = (groupID) => {
    if (
      cachedGroupID === groupID &&
      cachedFeaturesVersion === featureCacheVersion &&
      cachedGroupFeatures
    ) {
      return cachedGroupFeatures;
    }
    const features = [];
    map.data.forEach((f) => {
      if (getGroupID(f) === groupID) features.push(f);
    });
    cachedGroupID = groupID;
    cachedGroupFeatures = features;
    cachedFeaturesVersion = featureCacheVersion;
    return features;
  };

  const getPerFeatureFillColor = (feature, groupID) => {
    if (
      groupID === "CANTERBURY_CORE" &&
      getFeatureName(feature) === BANKS_PENINSULA_NAME
    ) {
      return BANKS_PENINSULA_HOVER_FILL;
    }
    return "#D7ED9A";
  };

  const applyHighlightStyle = (features, groupID, opacity) => {
    const o = opacity <= 0 ? 0.001 : opacity;
    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      map.data.overrideStyle(f, {
        strokeWeight: 3,
        strokeColor: "#D7ED9A",
        fillColor: getPerFeatureFillColor(f, groupID),
        fillOpacity: o,
        zIndex: 999,
      });
    }
    lastRenderedOpacity = o;
  };

  const animateToOpacity = (
    features,
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
      applyHighlightStyle(features, groupID, current);
      if (t < 1) {
        activeAnimationId = requestAnimationFrame(tick);
      } else {
        activeAnimationId = null;
      }
    };
    activeAnimationId = requestAnimationFrame(tick);
  };

  const setHoveredGroup = (newGroupID) => {
    if (lockedGroupID) return;
    if (isTransitioning) return;
    if (animator.isActive()) return;
    if (currentGroupID === newGroupID) return;

    const newFeatures = getGroupFeatures(newGroupID);
    stopAnimation();
    map.data.revertStyle();
    currentGroupID = newGroupID;
    applyHighlightStyle(newFeatures, newGroupID, 0.001);
    animateToOpacity(newFeatures, newGroupID, 0.001, 0.35, 220);
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
        map.data.revertStyle();
        currentGroupID = null;
        lastRenderedOpacity = 0;
        clearRafId = null;
        return;
      }
      clearRafId = requestAnimationFrame(check);
    };
    clearRafId = requestAnimationFrame(check);
  };

  const shouldBindHover = __rtCanHover();

  if (shouldBindHover) {
    map.data.addListener("mouseover", (event) => {
      if (isGlobalScrolling) return;
      lastFeatureHitAt = performance.now();
      stopClearRaf();
      setHoveredGroup(getGroupID(event.feature));
    });

    map.data.addListener("mousemove", (event) => {
      if (isGlobalScrolling) return;
      lastFeatureHitAt = performance.now();
      stopClearRaf();
      setHoveredGroup(getGroupID(event.feature));
    });

    map.data.addListener("mouseout", () => {
      if (isGlobalScrolling) return;
      clearHoverIfNeeded();
    });

    const mapDiv = map.getDiv();

    const onPointerMove = () => {
      if (isGlobalScrolling || !currentGroupID) return;
      clearHoverIfNeeded();
    };

    const onPointerLeave = () => {
      stopClearRaf();
      if (
        currentGroupID &&
        !lockedGroupID &&
        !isTransitioning &&
        !animator.isActive()
      ) {
        stopAnimation();
        map.data.revertStyle();
        currentGroupID = null;
        lastRenderedOpacity = 0;
      }
    };

    mapDiv.addEventListener("pointermove", onPointerMove, { passive: true });
    mapDiv.addEventListener("pointerleave", onPointerLeave, { passive: true });
    mapDiv.addEventListener("mouseleave", onPointerLeave, { passive: true });
  }

  map.data.addListener("click", (event) => {
    const rawName = getFeatureName(event.feature);
    const mappedID = REGION_ID_MAPPING[rawName];
    const groupID = getGroupID(event.feature);

    console.log(
      `[Map] Clicked Region: ${rawName} -> ID: ${mappedID || "NONE"}`
    );

    if (!mappedID) {
      closeAllCards();
      lockedGroupID = null;
      activeTTDSlug = null;
      if (resetAllMarkers) resetAllMarkers();
      map.data.revertStyle();
      return;
    }

    let baseTargetPos = event.latLng;
    const labelConfig = LABELS_CONFIG.find((l) => l.id === mappedID);
    if (labelConfig && labelConfig.pos) {
      baseTargetPos = labelConfig.pos;
    }

    openCard(mappedID);

    if (lockedGroupID !== groupID) {
      map.data.revertStyle();
      lockedGroupID = groupID;
      activeTTDSlug = null;
      if (resetAllMarkers) resetAllMarkers();
      currentGroupID = groupID;
      const features = getGroupFeatures(groupID);
      applyHighlightStyle(features, groupID, 0.35);
    }

    const isSwitching = true;
    executeMapTransition(baseTargetPos, isSwitching, false);
  });

  const lazyLoadBoundaries = () => {
    console.log("[Map] 3. Starting data fetch...");
    loadCanterburyBoundaries(map);
  };

  if ("requestIdleCallback" in window) {
    console.log("[Map] 2. Queuing lazy load (idle)...");
    requestIdleCallback(lazyLoadBoundaries, { timeout: 2200 });
  } else {
    setTimeout(lazyLoadBoundaries, 1500);
  }
}

function setupMapClusterer(map, markerOverlays, animator) {
  const GRID_SIZE = 90;
  const MAX_CLUSTER_ZOOM = 12.25;
  let currentClusters = [];
  let timeoutId = null;

  const rafSchedule = __rtCreateRafScheduler();
  const adaptiveDebounce = __rtCreateAdaptiveDebounce();

  const getZoomSafe = () => {
    const z = map.getZoom();
    return typeof z === "number" ? z : getInitialZoom();
  };

  const clearClusters = () => {
    currentClusters.forEach((c) => c.setMap(null));
    currentClusters = [];
  };

  class ClusterOverlay extends google.maps.OverlayView {
    constructor(position, markers, mapInstance, countScale) {
      super();
      this.position = position;
      this.markers = markers;
      this.count = markers.length;
      this.div = null;
      this.mapInstance = mapInstance;
      this.countScale = countScale;
      this.setMap(mapInstance);
    }

    onAdd() {
      const div = document.createElement("div");
      div.classList.add("map-cluster");

      const base = 60;
      const size0 = this.count >= 50 ? 80 : this.count >= 10 ? 70 : base;
      const size = Math.round(size0 * this.countScale);

      div.style.position = "absolute";
      div.style.width = `${size}px`;
      div.style.height = `${size}px`;
      div.style.borderRadius = "50%";
      div.style.backgroundColor = "rgba(170, 188, 120, 0.5)";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.style.cursor = "pointer";
      div.style.zIndex = "2500";
      div.style.userSelect = "none";
      div.style.webkitUserSelect = "none";

      div.style.color = "#141414";
      div.style.fontFamily = "var(--global--font-family-1)";
      div.style.fontWeight = "600";
      div.style.fontSize = "14px";
      div.style.letterSpacing = "0.02em";

      const countText = this.count > 99 ? "99+" : this.count;
      div.innerHTML = `<span>${countText}</span>`;

      div.addEventListener("click", (e) => {
        e.stopPropagation();
        this.zoomToCluster();
      });

      this.div = div;
      const panes = this.getPanes();
      panes.overlayMouseTarget.appendChild(div);
    }

    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;

      const point = projection.fromLatLngToDivPixel(this.position);
      if (point) {
        const w = parseInt(this.div.style.width, 10);
        this.div.style.left = point.x - w / 2 + "px";
        this.div.style.top = point.y - w / 2 + "px";
      }
    }

    onRemove() {
      if (this.div && this.div.parentNode) {
        this.div.parentNode.removeChild(this.div);
      }
      this.div = null;
    }

    zoomToCluster() {
      const bounds = new google.maps.LatLngBounds();
      this.markers.forEach((m) => bounds.extend(m.position));

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      const tiny =
        Math.abs(ne.lat() - sw.lat()) < 0.0001 &&
        Math.abs(ne.lng() - sw.lng()) < 0.0001;

      const currentZoom = getZoomSafe();

      if (tiny) {
        const targetZoom = Math.min(MAX_CLUSTER_ZOOM + 0.75, currentZoom + 3);
        const center = bounds.getCenter();

        const adjustedCenter = getUIAdjustedCenter(center, targetZoom, map);

        if (animator && typeof animator.cinematicTo === "function") {
          animator.cinematicTo(adjustedCenter, targetZoom, {
            duration: 720,
          });
        } else {
          map.setZoom(targetZoom);
          map.panTo(adjustedCenter);
        }
      } else {
        if (animator && typeof animator.cancel === "function")
          animator.cancel();

        const isMobile = window.innerWidth < 768;
        const padding = isMobile
          ? { bottom: window.innerHeight * 0.45, top: 50, left: 20, right: 20 }
          : { bottom: 50, right: 450, top: 50, left: 50 };

        map.fitBounds(bounds, padding);
      }

      queueUpdate("cluster-click");
    }
  }

  const updateClusters = () => {
    const projection = map.getProjection();
    const bounds = map.getBounds();
    const zoom = getZoomSafe();

    if (!projection || !bounds || !zoom) return;

    clearClusters();

    const toProcess = [...markerOverlays];

    if (zoom >= MAX_CLUSTER_ZOOM || toProcess.length <= 1) {
      toProcess.forEach((m) => m.setVisible(true));
      return;
    }

    const groups = [];
    const scale = Math.pow(2, zoom);
    const grid = GRID_SIZE;

    while (toProcess.length > 0) {
      const pivot = toProcess.pop();
      const pivotPixel = projection.fromLatLngToPoint(pivot.position);

      const clusterGroup = [pivot];
      const indicesToRemove = [];

      for (let i = 0; i < toProcess.length; i++) {
        const candidate = toProcess[i];
        const candidatePixel = projection.fromLatLngToPoint(candidate.position);

        const dx = (pivotPixel.x - candidatePixel.x) * scale;
        const dy = (pivotPixel.y - candidatePixel.y) * scale;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= grid) {
          clusterGroup.push(candidate);
          indicesToRemove.push(i);
        }
      }

      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        toProcess.splice(indicesToRemove[i], 1);
      }

      groups.push(clusterGroup);
    }

    const countScale = 1.5;

    groups.forEach((group) => {
      if (group.length === 1) {
        group[0].setVisible(true);
      } else {
        group.forEach((m) => m.setVisible(false));

        let latSum = 0;
        let lngSum = 0;
        group.forEach((m) => {
          latSum += m.position.lat();
          lngSum += m.position.lng();
        });

        const centerPos = {
          lat: latSum / group.length,
          lng: lngSum / group.length,
        };

        const cluster = new ClusterOverlay(centerPos, group, map, countScale);
        currentClusters.push(cluster);
      }
    });
  };

  const runUpdate = () => {
    rafSchedule(() => updateClusters());
  };

  const queueUpdate = (reason) => {
    const mobileMode = __rtIsMobilePerfMode();
    const r = reason || "unknown";
    const delay = mobileMode
      ? r === "bounds_changed"
        ? 140
        : r === "idle"
        ? 70
        : 110
      : r === "bounds_changed"
      ? 70
      : 60;

    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      adaptiveDebounce(() => runUpdate(), 0, r);
    }, delay);
  };

  map.addListener("idle", () => queueUpdate("idle"));
  map.addListener("zoom_changed", () => queueUpdate("zoom_changed"));
  map.addListener("bounds_changed", () => queueUpdate("bounds_changed"));

  queueUpdate("init");
}

function setupTTDMarkers(
  map,
  openTTDCard,
  onMarkerClick,
  executeMapTransition
) {
  const wrapper = document.getElementById("map-ttd-list");
  if (!wrapper) return { resetMarkers: () => {}, overlays: [] };

  const items = wrapper.querySelectorAll(
    '.map-content-item[data-map-content="ttd"]'
  );
  const allOverlays = [];

  const updateMarkerStyles = (activeSlug) => {
    allOverlays.forEach((overlay) => {
      const isActive = overlay._slug === activeSlug;
      overlay.setActive(isActive);
    });
  };

  class TTDMarkerOverlay extends google.maps.OverlayView {
    constructor(position, iconUrl, slug, mapInstance) {
      super();
      this.position = position;
      this.iconUrl = iconUrl;
      this.slug = slug;
      this.map = mapInstance;
      this.div = null;
      this.isActive = false;
      this.isVisible = true;
      this.setMap(mapInstance);
    }

    onAdd() {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.cursor = "pointer";

      const size = 50;
      div.style.width = `${size}px`;
      div.style.height = `${size}px`;
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";

      div.style.backgroundColor = "#d7ed9a";
      div.style.border = "0.1rem solid #141414";
      div.style.transition =
        "background-color 0.2s ease, opacity 0.2s ease, transform 0.22s cubic-bezier(0.19, 1, 0.22, 1)";
      div.style.willChange = "transform";

      const img = document.createElement("img");
      img.src = this.iconUrl;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.pointerEvents = "none";

      div.appendChild(img);
      this.div = div;

      this.div.style.display = this.isVisible ? "flex" : "none";
      this.div.style.pointerEvents = this.isVisible ? "auto" : "none";

      const panes = this.getPanes();
      panes.overlayMouseTarget.appendChild(div);

      div.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleClick();
      });
    }

    draw() {
      if (!this.div) return;

      const overlayProjection = this.getProjection();
      const point = overlayProjection.fromLatLngToDivPixel(this.position);

      if (point) {
        const halfSize = 25;
        this.div.style.left = point.x - halfSize + "px";
        this.div.style.top = point.y - halfSize + "px";
      }

      this.updateStateVisuals();
    }

    handleClick() {
      console.log(`[Map] Clicked TTD: ${this.slug}`);
      openTTDCard(this.slug);

      const isSwitching = onMarkerClick(this.slug);
      executeMapTransition(this.position, isSwitching, true);

      updateMarkerStyles(this.slug);
    }

    setActive(active) {
      this.isActive = active;
      this.updateStateVisuals();
    }

    setVisible(visible) {
      this.isVisible = visible;
      if (this.div) {
        this.div.style.display = visible ? "flex" : "none";
        this.div.style.pointerEvents = visible ? "auto" : "none";
      }
    }

    updateStateVisuals() {
      if (!this.div) return;

      if (this.isActive) {
        this.div.style.backgroundColor = "#F3FFD2";
        this.div.style.zIndex = "2000";
        this.div.style.transform = "scale(1.06)";
      } else {
        this.div.style.backgroundColor = "#d7ed9a";
        this.div.style.zIndex = "1000";
        this.div.style.transform = "scale(1)";
      }
    }

    onRemove() {
      if (this.div && this.div.parentNode) {
        this.div.parentNode.removeChild(this.div);
      }
      this.div = null;
    }
  }

  items.forEach((item) => {
    const lat = parseFloat(item.dataset.mapLat);
    const lng = parseFloat(item.dataset.mapLong);
    const slug = item.dataset.savedSlug;
    const imgEl = item.querySelector("[data-map-content-pointer]");

    if (isNaN(lat) || isNaN(lng) || !slug || !imgEl) return;

    const iconUrl = imgEl.src;
    const position = new google.maps.LatLng(lat, lng);

    const overlay = new TTDMarkerOverlay(position, iconUrl, slug, map);
    overlay._slug = slug;
    allOverlays.push(overlay);
  });

  return {
    resetMarkers: () => updateMarkerStyles(null),
    overlays: allOverlays,
  };
}

const getUIAdjustedCenter = (latLng, targetZoom, map) => {
  const projection = map.getProjection();
  if (!projection) return latLng;

  const width = window.innerWidth;
  const isMobile = width < 768;

  const scale = Math.pow(2, targetZoom);
  const worldPoint = projection.fromLatLngToPoint(latLng);

  let offsetXWorld = 0;
  let offsetYWorld = 0;

  if (isMobile) {
    const offsetPx = window.innerHeight * 0.25;
    offsetYWorld = offsetPx / scale;
  } else {
    const cardWidthEstimate = 420;
    const offsetPx = cardWidthEstimate * 0.5;
    offsetXWorld = offsetPx / scale;
  }

  const newWorldPoint = new google.maps.Point(
    worldPoint.x + offsetXWorld,
    worldPoint.y + offsetYWorld
  );

  return projection.fromPointToLatLng(newWorldPoint);
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
        transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1);
        transform: translateY(110%);
        z-index: 2000;
        pointer-events: none;
      }
      .map-content-item.is-active {
        transform: translateY(0%);
        pointer-events: auto;
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
    _activateCard(targetCard, `Region ID: ${regionId}`);
  };

  const openTTDCard = (slug) => {
    const targetCard = document.querySelector(
      `.map-content-item[data-saved-slug="${slug}"]`
    );
    _activateCard(targetCard, `TTD Slug: ${slug}`);
  };

  const _activateCard = (targetCard, debugName) => {
    if (!targetCard) {
      console.warn(`[Map] No card found for: ${debugName}`);
      return;
    }

    if (activeCard === targetCard) return;

    if (activeCard) {
      activeCard.classList.remove("is-active");
    }

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

  const bounds = new google.maps.LatLngBounds();
  LABELS_CONFIG.forEach((label) => {
    bounds.extend(label.pos);
  });

  const mapDiv = map.getDiv();
  const PADDING = 120;

  const width = mapDiv.clientWidth - PADDING * 2;
  const height = mapDiv.clientHeight - PADDING * 2;
  const projection = map.getProjection();

  if (!projection || width <= 0 || height <= 0) return;

  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const swPoint = projection.fromLatLngToPoint(sw);
  const nePoint = projection.fromLatLngToPoint(ne);

  let startZ = map.getZoom() || 8.25;
  if (startZ < 9) startZ = 9;

  let optimalZoom = getInitialZoom();
  const minZoomAllowed = map.get("minZoom") || 5;

  for (let z = startZ; z >= minZoomAllowed; z -= 0.25) {
    const scale = Math.pow(2, z);
    const pSW = { x: swPoint.x * scale, y: swPoint.y * scale };
    const pNE = { x: nePoint.x * scale, y: nePoint.y * scale };
    const contentWidth = Math.abs(pNE.x - pSW.x);
    const contentHeight = Math.abs(pSW.y - pNE.y);

    if (contentWidth <= width && contentHeight <= height) {
      optimalZoom = z;
      break;
    }
  }

  console.log(`[Map] SmartFit: Calculated optimal zoom is ${optimalZoom}`);
  map.setCenter(bounds.getCenter());
  map.setZoom(optimalZoom);
}

function setupMapControls(map, animator) {
  const zoomInBtn = document.getElementById("map-zoom-in");
  const zoomOutBtn = document.getElementById("map-zoom-out");
  const recenterBtn = document.getElementById("map-recenter");

  const CENTER_EPS = 0.00008;

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

    const targetCenter = INITIAL_CENTER;
    const dLat = Math.abs(c.lat() - targetCenter.lat);
    const dLng = Math.abs(
      normalizeLng(c.lng()) - normalizeLng(targetCenter.lng)
    );

    const zoomOk = Math.abs(z - getInitialZoom()) <= 1.5;
    const centerOk = dLat <= CENTER_EPS && dLng <= CENTER_EPS;

    return zoomOk && centerOk;
  };

  const setRecenterVisible = (visible) => {
    if (!recenterBtn) return;
    const desired = visible ? "flex" : "none";
    if (recenterBtn.style.display === desired) return;
    recenterBtn.style.display = desired;
  };

  const syncRecenterVisibility = () => {
    if (!recenterBtn) return;
    const atDefault = isDefaultView();
    setRecenterVisible(!atDefault);
  };

  const getZoomSafe = () => {
    const z = map.getZoom();
    return typeof z === "number" ? z : getInitialZoom();
  };

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const currentZoom = getZoomSafe();
      const target = currentZoom + 1;
      if (animator && typeof animator.smoothZoomTo === "function") {
        animator.smoothZoomTo(target, { duration: 420 });
      } else {
        map.setZoom(target);
      }
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const currentZoom = getZoomSafe();
      const target = currentZoom - 1;
      if (animator && typeof animator.smoothZoomTo === "function") {
        animator.smoothZoomTo(target, { duration: 420 });
      } else {
        map.setZoom(target);
      }
    });
  }

  if (recenterBtn) {
    recenterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const targetZoom = getInitialZoom();
      const center = INITIAL_CENTER;

      if (animator && typeof animator.cinematicTo === "function") {
        animator.cinematicTo(center, targetZoom, {
          duration: 820,
        });
        setTimeout(() => smartFitLabels(map), 60);
      } else {
        map.setCenter(center);
        map.setZoom(targetZoom);
        smartFitLabels(map);
      }

      syncRecenterVisibility();
    });
  }

  map.addListener("idle", () => {
    syncRecenterVisibility();
  });

  syncRecenterVisibility();
}

function createCustomLabels(map) {
  const overlays = [];
  const scheduleRedraw = __rtCreateRafScheduler();
  const scheduleRemeasure = __rtCreateRafScheduler();

  class MapLabelOverlay extends google.maps.OverlayView {
    constructor(configIndex) {
      super();
      this.configIndex = configIndex;
      this.config = LABELS_CONFIG[configIndex];
      this.position = new google.maps.LatLng(
        this.config.pos.lat,
        this.config.pos.lng
      );
      this.div = null;
      this.anchorX = null;
      this.anchorY = null;
      this.anchorReady = false;
      this.measureQueued = false;
      this.isDragging = false;
      this.startX = 0;
      this.startY = 0;
      this.boundMove = null;
      this.boundUp = null;
    }

    onAdd() {
      this.div = document.createElement("div");
      if (this.config.type === 2) {
        this.div.innerHTML = `
          <div class="map-label">
            <div class="map-label-text type2">${this.config.text}</div>
          </div>
        `;
      } else {
        this.div.innerHTML = `
          <div class="map-label">
            <div class="map-label-pointer"></div>
            <div class="map-label-text">${this.config.text}</div>
          </div>
        `;
      }
      this.div.style.position = "absolute";
      this.div.style.fontFamily = "var(--global--font-family-1)";
      this.div.style.zIndex = "1000";
      this.div.style.transform = "translate3d(0,0,0)";

      if (DEV_MODE) {
        this.div.style.cursor = "move";
        this.div.style.pointerEvents = "auto";
        this.div.addEventListener("mousedown", (e) => this.onDragStart(e));
      } else {
        this.div.style.cursor = "default";
        this.div.style.pointerEvents = "none";
      }

      const panes = this.getPanes();
      const pane = DEV_MODE ? panes.overlayMouseTarget : panes.overlayLayer;
      pane.appendChild(this.div);
      this.queueMeasureAnchor();
    }

    queueMeasureAnchor() {
      if (this.measureQueued) return;
      this.measureQueued = true;
      requestAnimationFrame(() => {
        this.measureQueued = false;
        this.measureAnchor();
        this.draw();
      });
    }

    measureAnchor() {
      if (!this.div) return;
      const divRect = this.div.getBoundingClientRect();
      if (!divRect || divRect.width <= 0 || divRect.height <= 0) {
        this.anchorReady = false;
        return;
      }
      const pointer = this.div.querySelector(".map-label-pointer");
      if (pointer) {
        const pRect = pointer.getBoundingClientRect();
        if (pRect && pRect.width > 0 && pRect.height > 0) {
          const cx = pRect.left + pRect.width / 2;
          const cy = pRect.top + pRect.height / 2;
          this.anchorX = cx - divRect.left;
          this.anchorY = cy - divRect.top;
          this.anchorReady = true;
          return;
        }
      }
      this.anchorX = divRect.width / 2;
      this.anchorY = divRect.height / 2;
      this.anchorReady = true;
    }

    draw() {
      const projection = this.getProjection();
      if (!projection || !this.div) return;
      if (!this.anchorReady) this.measureAnchor();
      if (!this.anchorReady || this.anchorX == null || this.anchorY == null) {
        this.queueMeasureAnchor();
        return;
      }
      const pixel = projection.fromLatLngToDivPixel(this.position);
      if (!pixel) return;
      const left = Math.round(pixel.x - this.anchorX);
      const top = Math.round(pixel.y - this.anchorY);
      this.div.style.left = left + "px";
      this.div.style.top = top + "px";
    }

    onRemove() {
      if (this.div) {
        if (this.div.parentNode) this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    }

    onDragStart(e) {
      e.stopPropagation();
      e.preventDefault();
      this.isDragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.div.style.opacity = "0.7";
      this.div.style.zIndex = "9999";
      this.boundMove = (evt) => this.onDragMove(evt);
      this.boundUp = (evt) => this.onDragEnd(evt);
      document.addEventListener("mousemove", this.boundMove);
      document.addEventListener("mouseup", this.boundUp);
    }

    onDragMove(e) {
      if (!this.isDragging) return;
      e.preventDefault();
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      const projection = this.getProjection();
      if (!projection) return;
      const currentPixel = projection.fromLatLngToDivPixel(this.position);
      if (!currentPixel) return;
      const newPixel = new google.maps.Point(
        currentPixel.x + dx,
        currentPixel.y + dy
      );
      const newLatLng = projection.fromDivPixelToLatLng(newPixel);
      if (!newLatLng) return;
      this.position = newLatLng;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.draw();
    }

    onDragEnd() {
      this.isDragging = false;
      this.div.style.opacity = "1";
      this.div.style.zIndex = "1000";
      document.removeEventListener("mousemove", this.boundMove);
      document.removeEventListener("mouseup", this.boundUp);
      const newLat = this.position.lat();
      const newLng = this.position.lng();
      LABELS_CONFIG[this.configIndex].pos = {
        lat: parseFloat(newLat.toFixed(4)),
        lng: parseFloat(newLng.toFixed(4)),
      };
      this.anchorReady = false;
      this.queueMeasureAnchor();
      console.clear();
      console.log(JSON.stringify(LABELS_CONFIG, null, 2));
    }
  }

  LABELS_CONFIG.forEach((_, index) => {
    const overlay = new MapLabelOverlay(index);
    overlays.push(overlay);
    overlay.setMap(map);
  });

  const redrawAll = () => {
    for (let i = 0; i < overlays.length; i++) overlays[i].draw();
  };

  const remeasureAll = () => {
    for (let i = 0; i < overlays.length; i++) {
      overlays[i].anchorReady = false;
      overlays[i].queueMeasureAnchor();
    }
  };

  const queueRedrawAll = () => scheduleRedraw(redrawAll);

  const queueRemeasureAll = () => scheduleRemeasure(remeasureAll);

  map.addListener("zoom_changed", queueRedrawAll);
  map.addListener("bounds_changed", queueRedrawAll);
  map.addListener("idle", queueRedrawAll);
  window.addEventListener("resize", queueRemeasureAll, { passive: true });

  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    document.fonts.ready.then(queueRemeasureAll).catch(() => {});
  }
}

function getFeatureName(feature) {
  return (
    feature.getProperty("TA2025_V1_00_NAME") || feature.getProperty("cblabel")
  );
}

function getDisplayName(officialName) {
  const mapping = {
    "Christchurch City": "Ōtautahi Christchurch",
    "Ashburton District": "Mid Canterbury",
    "Buller District": "West Coast",
    "Grey District": "West Coast",
    "Westland District": "West Coast",
    "Mackenzie District": "Mackenzie",
    "Timaru District": "Timaru",
    "Selwyn District": "Selwyn",
    "Waimakariri District": "Waimakariri",
    "Hurunui District": "Hurunui",
    "Kaikōura District": "Kaikōura",
    "Kaikoura District": "Kaikōura",
  };
  return mapping[officialName] || officialName;
}

function setupCustomCooperativeGestureHint(map, setGlobalScrollingState) {
  if (!MAP_GESTURE_HINT.enabled) return;

  const mapDiv = map.getDiv();

  try {
    const computed = window.getComputedStyle(mapDiv);
    if (!computed || computed.position === "static") {
      mapDiv.style.position = "relative";
    }
  } catch (_) {}

  const ensureStyles = () => {
    const styleId = "map-gesture-hint-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
#${MAP_GESTURE_HINT.id} {
  position: absolute;
  left: 50%;
  bottom: 5rem;
  transform: translateX(-50%);
  z-index: 5000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 160ms ease;
  will-change: opacity;
}
#${MAP_GESTURE_HINT.id}.is-visible {
  opacity: 1;
}
#${MAP_GESTURE_HINT.id} .map-gesture-hint-inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
  font-family: var(--global--font-family-1, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial);
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.2px;
  box-shadow: 0 10px 28px rgba(0,0,0,0.25);
}
#${MAP_GESTURE_HINT.id} .map-gesture-hint-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 18px;
  padding: 0 6px;
  border-radius: 6px;
  background: rgba(255,255,255,0.14);
  border: 1px solid rgba(255,255,255,0.18);
  font-size: 11px;
}
`;
    document.head.appendChild(style);
  };

  const ensureEl = () => {
    let el = document.getElementById(MAP_GESTURE_HINT.id);
    if (el) return el;
    el = document.createElement("div");
    el.id = MAP_GESTURE_HINT.id;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
      <div class="map-gesture-hint-inner">
        <span class="map-gesture-hint-kbd" data-kbd></span>
        <span data-text></span>
      </div>
    `;
    mapDiv.appendChild(el);
    return el;
  };

  const isApple = () => {
    const p = (navigator.platform || "").toLowerCase();
    const ua = (navigator.userAgent || "").toLowerCase();
    return (
      p.includes("mac") ||
      p.includes("iphone") ||
      p.includes("ipad") ||
      p.includes("ipod") ||
      ua.includes("mac os")
    );
  };

  ensureStyles();
  const hintEl = ensureEl();
  const kbdEl = hintEl.querySelector("[data-kbd]");
  const textEl = hintEl.querySelector("[data-text]");

  let hideTimer = null;
  let lastShownAt = 0;
  let visible = false;

  const hide = (reason) => {
    if (!visible) return;
    visible = false;
    hintEl.classList.remove("is-visible");
    console.log(`[Map] Gesture hint hidden (${reason})`);
  };

  const show = (reason) => {
    const now = Date.now();
    if (now - lastShownAt < MAP_GESTURE_HINT.minGapMs) return;
    lastShownAt = now;
    const apple = isApple();
    const kbd = apple ? "⌘" : "Ctrl";
    const txt = apple ? MAP_GESTURE_HINT.textMac : MAP_GESTURE_HINT.textWin;
    if (kbdEl) kbdEl.textContent = kbd;
    if (textEl) textEl.textContent = txt;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (!visible) {
      visible = true;
      hintEl.classList.add("is-visible");
      console.log(`[Map] Gesture hint shown (${reason})`);
    }
    hideTimer = setTimeout(() => hide("timeout"), MAP_GESTURE_HINT.showForMs);
  };

  let isOptimizing = false;
  let optimizationTimer = null;

  const endOptimization = () => {
    isOptimizing = false;
    mapDiv.style.pointerEvents = "";
    if (setGlobalScrollingState) setGlobalScrollingState(false);
    console.log("[Map] Scroll optimization ended. Interactions restored.");
  };

  let isZoomLocked = false;
  let isHoveringMap = false;

  const lockLenis = () => {
    if (isZoomLocked) return;
    isZoomLocked = true;
    if (typeof window.disableScroll === "function") window.disableScroll();
    if (visible) hide("modifier");
    console.log("[Map] Zoom intent detected. Lenis disabled.");
  };

  const unlockLenis = () => {
    if (!isZoomLocked) return;
    isZoomLocked = false;
    if (typeof window.enableScroll === "function") window.enableScroll();
    console.log("[Map] Zoom intent ended. Lenis enabled.");
  };

  document.addEventListener(
    "keydown",
    (e) => {
      const isMod = e.key === "Control" || e.key === "Meta";
      if (isMod && isHoveringMap) lockLenis();
    },
    { passive: true }
  );

  document.addEventListener(
    "keyup",
    (e) => {
      const isMod = e.key === "Control" || e.key === "Meta";
      if (isMod) unlockLenis();
    },
    { passive: true }
  );

  mapDiv.addEventListener(
    "mouseenter",
    (e) => {
      isHoveringMap = true;
      if (e.ctrlKey || e.metaKey) lockLenis();
    },
    { passive: true }
  );

  mapDiv.addEventListener(
    "mouseleave",
    () => {
      if (visible) hide("mouseleave");
      isHoveringMap = false;
      unlockLenis();
    },
    { passive: true }
  );

  let lastWheelAt = 0;

  const onWindowWheel = (e) => {
    const now = performance.now();
    const modifier = !!(e.ctrlKey || e.metaKey);

    if (modifier && mapDiv.contains(e.target)) {
      if (visible) hide("modifier");
      lockLenis();
      if (isOptimizing) {
        if (optimizationTimer) clearTimeout(optimizationTimer);
        endOptimization();
      }
      return;
    }

    if (mapDiv.contains(e.target)) {
      if (typeof e.stopImmediatePropagation === "function")
        e.stopImmediatePropagation();
      e.stopPropagation();

      if (now - lastWheelAt > 32) {
        lastWheelAt = now;
        show("wheel-no-modifier");
      }
    }

    if (!isOptimizing && !isZoomLocked) {
      isOptimizing = true;
      if (setGlobalScrollingState) setGlobalScrollingState(true);
      mapDiv.style.pointerEvents = "none";
      console.log("[Map] Scroll optimization active (pointer-events: none)");
    }

    if (optimizationTimer) clearTimeout(optimizationTimer);
    optimizationTimer = setTimeout(endOptimization, 400);
  };

  window.addEventListener("wheel", onWindowWheel, {
    passive: false,
    capture: true,
  });
}

const DB_NAME = "NZ_Map_DB";
const STORE_NAME = "boundaries";
const CACHE_KEY = "canterbury_v4";
const CACHE_EXPIRY_DAYS = 7;

async function loadCanterburyBoundaries(map) {
  const tStart = performance.now();
  console.log("[Map] 4. Checking Cache...");

  try {
    const cachedData = await getFromDB(CACHE_KEY);

    if (cachedData) {
      const tEnd = performance.now();
      console.log(`[Map] 5. Cache HIT (${(tEnd - tStart).toFixed(2)}ms)`);
      map.data.addGeoJson(cachedData);
      return;
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

    map.data.addGeoJson(combinedGeoJson);
    await saveToDB(CACHE_KEY, combinedGeoJson);
    console.log("[Map] 8. Saved to DB.");
  } catch (error) {
    console.error("[Map] CRITICAL ERROR:", error);
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
        if (Date.now() - payload.timestamp > CACHE_EXPIRY_DAYS * 86400000) {
          resolve(null);
        } else {
          resolve(payload.data);
        }
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

window.initMap = initMap;
