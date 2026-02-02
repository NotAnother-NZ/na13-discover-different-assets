document.addEventListener("DOMContentLoaded", function () {
  // --- CONFIGURATION ---
  const CONFIG = {
    selectors: {
      // UNIQUE CONTAINERS (IDs)
      desktopFooter: "#footer", // Desktop section
      mobileFooter: "#footer-mobile", // Mobile/Tablet section

      // MOBILE TARGET
      // Inside #footer-mobile, where the images should stack
      mobileImageContainer: ".footer-trailing-image",

      // DESKTOP LAYERING (Data Attributes)
      // Elements inside desktop footer that must stay ON TOP of the image trail
      uiElements:
        "[data-footer-credit], [data-footer-credit-links], [data-footer-text]",

      // INTERACTION (Data Attributes)
      linkGroups: "[data-footer-credit-links]",

      // UTILITIES
      timeElements: "[data-nz-time]", // For the live time update
    },
    images: {
      baseUrl:
        "https://cdn.jsdelivr.net/gh/NotAnother-NZ/na13-discover-different-assets@main/footer_images/",
      count: 17,
      extension: ".webp",
      startAt: 1,
    },
    desktop: {
      minWidth: 992, // Breakpoint to switch logic
      trailCopies: 2,
      threshold: 50,
    },
    mobile: {
      maxVisible: 8,
      randomRange: 40, // How far from center they scatter
    },
  };

  // --- ASSET GENERATOR ---
  const generatedImages = [];
  for (let i = CONFIG.images.startAt; i <= CONFIG.images.count; i++) {
    const img = new Image();
    img.src = `${CONFIG.images.baseUrl}${i}${CONFIG.images.extension}`;
    img.className = "footer-image-dynamic";
    img.alt = "Footer Art";
    img.style.display = "block";
    generatedImages.push(img);
  }

  // --- SHUFFLE IMAGES (Fisher-Yates Algorithm) ---
  // This ensures a random order on every page load
  for (let i = generatedImages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [generatedImages[i], generatedImages[j]] = [
      generatedImages[j],
      generatedImages[i],
    ];
  }

  // State tracking for resize handling
  let desktopCleanup = null;
  let mobileCleanup = null;

  // --- MODULE: DESKTOP TRAIL ---
  function initDesktopTrail() {
    const footer = document.querySelector(CONFIG.selectors.desktopFooter);
    if (!footer) return null;

    // 1. Ensure Positioning Context
    if (getComputedStyle(footer).position === "static") {
      footer.style.position = "relative";
    }

    // 2. Lift UI Elements
    const uiElements = footer.querySelectorAll(CONFIG.selectors.uiElements);
    uiElements.forEach((el) => {
      if (getComputedStyle(el).position === "static") {
        el.style.position = "relative";
      }
      el.style.zIndex = "10";
    });

    // 3. Create/Get Trail Container
    let trail = footer.querySelector(".footer-trail-container");
    if (!trail) {
      trail = document.createElement("div");
      trail.className = "footer-trail-container";
      Object.assign(trail.style, {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: "5",
      });
      footer.appendChild(trail);
    }

    // 4. Logic Variables
    let imagesArray = [];
    let lastImageIndex = -1;
    let zIndexVal = 1;
    let mousePos = { x: 0, y: 0 };
    let prevMousePos = { x: 0, y: 0 };
    let smoothMousePos = { x: 0, y: 0 };
    let isHoveringLinks = false;
    let animationFrameId;

    const lerp = (start, end, t) => (1 - t) * start + t * end;
    const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

    // Image Class
    class TrailImage {
      constructor(el, sourceIndex) {
        this.DOM = { el: el };
        this.sourceIndex = sourceIndex;
        this.defaultStyle = { x: 0, y: 0, opacity: 0 };
        Object.assign(this.DOM.el.style, {
          position: "absolute",
          opacity: "0",
          pointerEvents: "none",
          width: "180px",
          display: "block",
        });
        gsap.set(this.DOM.el, this.defaultStyle);
        this.getRect();
      }
      getRect() {
        this.rect = this.DOM.el.getBoundingClientRect();
      }
      isActive() {
        return gsap.isTweening(this.DOM.el) || this.DOM.el.style.opacity != 0;
      }
    }

    // Populate using the shuffled generatedImages
    generatedImages.forEach((img, i) => {
      for (let j = 0; j < CONFIG.desktop.trailCopies; j++) {
        const clone = img.cloneNode(true);
        trail.appendChild(clone);
        imagesArray.push(new TrailImage(clone, i));
      }
    });

    // Animation Logic
    const showNextImage = () => {
      if (isHoveringLinks) return;

      let available = imagesArray
        .map((img, i) => ({ img, i }))
        .filter(
          (item) =>
            !item.img.isActive() && item.img.sourceIndex !== lastImageIndex
        )
        .map((item) => item.i);

      if (!available.length) available = imagesArray.map((_, i) => i);

      const idx = available[Math.floor(Math.random() * available.length)];
      const trailImg = imagesArray[idx];
      lastImageIndex = trailImg.sourceIndex;

      gsap.killTweensOf(trailImg.DOM.el);
      trailImg.getRect();

      const tl = gsap.timeline({
        onComplete: () => gsap.set(trailImg.DOM.el, trailImg.defaultStyle),
      });

      tl.set(trailImg.DOM.el, {
        startAt: { opacity: 0 },
        opacity: 1,
        zIndex: zIndexVal++,
        x: smoothMousePos.x - trailImg.rect.width / 2,
        y: smoothMousePos.y - trailImg.rect.height / 2,
      })
        .to(
          trailImg.DOM.el,
          {
            duration: 1.6,
            ease: "expo.out",
            x: mousePos.x - trailImg.rect.width / 2,
            y: mousePos.y - trailImg.rect.height / 2,
          },
          0
        )
        .to(
          trailImg.DOM.el,
          { duration: 1, ease: "power1.out", opacity: 0 },
          0.4
        )
        .to(
          trailImg.DOM.el,
          {
            duration: 1,
            ease: "quint.inOut",
            y: `+=${window.innerHeight / 2 + trailImg.rect.height / 2}`,
          },
          0.4
        );
    };

    const render = () => {
      const rect = footer.getBoundingClientRect();
      // Ensure footer is in view
      if (
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        !isHoveringLinks
      ) {
        smoothMousePos.x = lerp(
          smoothMousePos.x || mousePos.x,
          mousePos.x,
          0.1
        );
        smoothMousePos.y = lerp(
          smoothMousePos.y || mousePos.y,
          mousePos.y,
          0.1
        );

        if (
          dist(prevMousePos.x, prevMousePos.y, mousePos.x, mousePos.y) >
          CONFIG.desktop.threshold
        ) {
          showNextImage();
          prevMousePos = { ...mousePos };
        }
      }

      if (imagesArray.every((img) => !img.isActive()) && zIndexVal !== 1)
        zIndexVal = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    const handleMouseMove = (e) => {
      const rect = footer.getBoundingClientRect();
      mousePos.x = e.clientX - rect.left;
      mousePos.y = e.clientY - rect.top;
    };

    // Attach Listeners
    footer.addEventListener("mousemove", handleMouseMove);
    animationFrameId = requestAnimationFrame(render);

    // Link Hover Logic (Stops trail)
    const linkWrappers = footer.querySelectorAll(CONFIG.selectors.linkGroups);
    const setHoverTrue = () => (isHoveringLinks = true);
    const setHoverFalse = () => {
      isHoveringLinks = false;
      prevMousePos = { ...mousePos };
    };

    linkWrappers.forEach((el) => {
      el.addEventListener("mouseenter", setHoverTrue);
      el.addEventListener("mouseleave", setHoverFalse);
    });

    // Cleanup
    return () => {
      footer.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      linkWrappers.forEach((el) => {
        el.removeEventListener("mouseenter", setHoverTrue);
        el.removeEventListener("mouseleave", setHoverFalse);
      });
      if (trail && trail.parentNode) trail.parentNode.removeChild(trail);
    };
  }

  // --- MODULE: MOBILE STACK ---
  function initMobileStack() {
    const mobileFooter = document.querySelector(CONFIG.selectors.mobileFooter);
    if (!mobileFooter) return null;

    const container = mobileFooter.querySelector(
      CONFIG.selectors.mobileImageContainer
    );
    if (!container) return null;

    // 1. Setup Container
    container.innerHTML = "";
    // Ensure relative positioning so absolute children align to THIS div
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    const images = [];

    // 2. Prepare Images (using the shuffled generatedImages)
    generatedImages.forEach((genImg) => {
      const clone = genImg.cloneNode(true);

      Object.assign(clone.style, {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "100%",
        height: "auto",
        maxWidth: "200px", // Restrict size on mobile
        display: "block",
        margin: "0",
        padding: "0",
      });

      container.appendChild(clone);
      images.push(clone);
    });

    // Initial state: Hidden, centered (xPercent/yPercent handles the -50%)
    gsap.set(images, {
      autoAlpha: 0,
      zIndex: 0,
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0,
    });

    let currentIndex = 0;
    let visibleStack = [];
    let stackZIndex = 1;
    let timeoutIds = [];

    const randomOffset = (min, max) => min + Math.random() * (max - min);

    // 3. Animation Function
    const showNext = () => {
      const nextImage = images[currentIndex];
      currentIndex = (currentIndex + 1) % images.length;
      stackZIndex++;
      visibleStack.push(nextImage);

      const range = CONFIG.mobile.randomRange;

      // SET Position
      gsap.set(nextImage, {
        autoAlpha: 1,
        zIndex: stackZIndex,
        xPercent: -50,
        yPercent: -50,
        x: randomOffset(-range, range),
        y: randomOffset(-range, range),
      });

      // Remove Oldest
      if (visibleStack.length > CONFIG.mobile.maxVisible) {
        const oldest = visibleStack.shift();
        gsap.set(oldest, { autoAlpha: 0, zIndex: 0 });
      }
    };

    // 4. Start Sequence
    // Fill initial stack
    for (let i = 0; i < CONFIG.mobile.maxVisible; i++) {
      timeoutIds.push(setTimeout(showNext, i * 100));
    }

    // Infinite Loop
    const animateStack = () => {
      const delay = 600 + Math.random() * 600;
      timeoutIds.push(
        setTimeout(() => {
          showNext();
          animateStack();
        }, delay)
      );
    };

    // Start loop after initial stack fills
    timeoutIds.push(
      setTimeout(animateStack, CONFIG.mobile.maxVisible * 100 + 300)
    );

    // Cleanup
    return () => {
      timeoutIds.forEach(clearTimeout);
      container.innerHTML = "";
    };
  }

  // --- GENERAL: LINK DIMMING ---
  function initLinkHover() {
    const groups = document.querySelectorAll(CONFIG.selectors.linkGroups);
    groups.forEach((group) => {
      const links = group.querySelectorAll("a");
      if (!links.length) return;

      links.forEach((link) => {
        link.addEventListener("mouseenter", () => {
          links.forEach((other) => {
            if (other !== link)
              gsap.to(other, { opacity: 0.15, duration: 0.3 });
          });
        });
        link.addEventListener("mouseleave", () => {
          links.forEach((other) =>
            gsap.to(other, { opacity: 1, duration: 0.3 })
          );
        });
      });

      group.addEventListener("mouseleave", () => {
        links.forEach((link) => gsap.to(link, { opacity: 1, duration: 0.3 }));
      });
    });
  }

  // --- GENERAL: NZ TIME ---
  function initNZTime() {
    const elements = document.querySelectorAll(CONFIG.selectors.timeElements);
    if (!elements.length) return;

    const update = () => {
      const nzTime = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Pacific/Auckland" })
      );
      const timeStr = `${nzTime.getHours().toString().padStart(2, "0")}:${nzTime
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      elements.forEach((el) => (el.textContent = timeStr));
    };
    update();
    setInterval(update, 1000);
  }

  // --- MANAGER: HANDLE RESIZE ---
  function handleLayoutChange() {
    const isDesktop = window.matchMedia(
      `(min-width: ${CONFIG.desktop.minWidth}px)`
    ).matches;

    if (isDesktop) {
      if (mobileCleanup) {
        mobileCleanup();
        mobileCleanup = null;
      }
      if (!desktopCleanup) desktopCleanup = initDesktopTrail();
    } else {
      if (desktopCleanup) {
        desktopCleanup();
        desktopCleanup = null;
      }
      if (!mobileCleanup) mobileCleanup = initMobileStack();
    }
  }

  // Init
  initLinkHover();
  initNZTime();
  handleLayoutChange();
  window.addEventListener("resize", handleLayoutChange);
});
