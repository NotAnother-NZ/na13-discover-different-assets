document.addEventListener("DOMContentLoaded", function () {
  const CONFIG = {
    selectors: {
      desktopFooter: "#footer",
      mobileFooter: "#footer-mobile",
      mobileImageContainer: ".footer-trailing-image",
      uiElements:
        "[data-footer-credit], [data-footer-credit-links], [data-footer-text]",
      linkGroups: "[data-footer-credit-links]",
      timeElements: "[data-nz-time]",
    },
    images: {
      baseUrl:
        "https://cdn.jsdelivr.net/gh/NotAnother-NZ/na13-discover-different-assets@1.0.3/footer_images/",
      extension: ".webp",
      allowed: [2, 4, 5, 6, 8, 12, 13, 16, 18, 20],
      excluded: [1, 3, 7, 9, 10, 11, 14, 15, 17, 19, 20],
    },
    desktop: {
      minWidth: 992,
      trailCopies: 2,
      threshold: 50,
    },
    mobile: {
      maxVisible: 8,
      randomRange: 40,
    },
    lazy: {
      rootMargin: "900px 0px 900px 0px",
      threshold: 0.01,
      loadTimeoutMs: 12000,
    },
  };

  let generatedImages = null;
  let imagesLoading = false;
  let imagesLoaded = false;

  let desktopCleanup = null;
  let mobileCleanup = null;

  function buildImageUrls() {
    const urls = [];
    const allowed = CONFIG.images.allowed;

    for (let i = 0; i < allowed.length; i++) {
      const index = allowed[i];
      urls.push(`${CONFIG.images.baseUrl}${index}${CONFIG.images.extension}`);
    }

    return urls;
  }

  function loadFooterImages() {
    if (imagesLoaded) return Promise.resolve(generatedImages || []);
    if (imagesLoading) {
      return new Promise((resolve) => {
        const poll = () => {
          if (imagesLoaded) resolve(generatedImages || []);
          else setTimeout(poll, 50);
        };
        poll();
      });
    }

    imagesLoading = true;

    const urls = buildImageUrls();
    const imgs = urls.map((src) => {
      const img = new Image();
      img.className = "footer-image-dynamic";
      img.alt = "Footer Art";
      img.style.display = "block";
      return { img, src };
    });

    let timeoutId;

    const finish = () => {
      if (imagesLoaded) return;
      clearTimeout(timeoutId);
      generatedImages = imgs.map((x) => x.img);
      imagesLoaded = true;
      imagesLoading = false;
      handleLayoutChange();
      window.addEventListener("resize", handleLayoutChange);
    };

    timeoutId = setTimeout(finish, CONFIG.lazy.loadTimeoutMs);

    let remaining = imgs.length;
    imgs.forEach(({ img, src }) => {
      const done = () => {
        remaining -= 1;
        if (remaining <= 0) finish();
      };
      img.onload = done;
      img.onerror = done;
      img.src = src;
      if (img.decode) {
        img
          .decode()
          .then(() => {})
          .catch(() => {});
      }
    });

    return new Promise((resolve) => {
      const poll = () => {
        if (imagesLoaded) resolve(generatedImages || []);
        else setTimeout(poll, 50);
      };
      poll();
    });
  }

  function initDesktopTrail() {
    if (!generatedImages || !generatedImages.length) return null;

    const footer = document.querySelector(CONFIG.selectors.desktopFooter);
    if (!footer) return null;

    if (getComputedStyle(footer).position === "static") {
      footer.style.position = "relative";
    }

    const uiElements = footer.querySelectorAll(CONFIG.selectors.uiElements);
    uiElements.forEach((el) => {
      if (getComputedStyle(el).position === "static") {
        el.style.position = "relative";
      }
      el.style.zIndex = "10";
    });

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

    generatedImages.forEach((img, i) => {
      for (let j = 0; j < CONFIG.desktop.trailCopies; j++) {
        const clone = img.cloneNode(true);
        trail.appendChild(clone);
        imagesArray.push(new TrailImage(clone, i));
      }
    });

    let seqIndex = 0;

    const showNextImage = () => {
      if (isHoveringLinks) return;

      const total = imagesArray.length;
      if (!total) return;

      let attempts = 0;
      let candidateIdx = -1;
      let candidateImg = null;

      while (attempts < total) {
        const idx = seqIndex % total;
        seqIndex += 1;
        attempts += 1;

        const imgObj = imagesArray[idx];
        if (!imgObj.isActive() && imgObj.sourceIndex !== lastImageIndex) {
          candidateIdx = idx;
          candidateImg = imgObj;
          break;
        }
      }

      if (!candidateImg) {
        candidateIdx = (seqIndex - 1 + total) % total;
        candidateImg = imagesArray[candidateIdx];
      }

      const trailImg = candidateImg;
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
          0,
        )
        .to(
          trailImg.DOM.el,
          { duration: 1, ease: "power1.out", opacity: 0 },
          0.4,
        )
        .to(
          trailImg.DOM.el,
          {
            duration: 1,
            ease: "quint.inOut",
            y: `+=${window.innerHeight / 2 + trailImg.rect.height / 2}`,
          },
          0.4,
        );
    };

    const render = () => {
      const rect = footer.getBoundingClientRect();
      if (
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        !isHoveringLinks
      ) {
        smoothMousePos.x = lerp(
          smoothMousePos.x || mousePos.x,
          mousePos.x,
          0.1,
        );
        smoothMousePos.y = lerp(
          smoothMousePos.y || mousePos.y,
          mousePos.y,
          0.1,
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

    footer.addEventListener("mousemove", handleMouseMove);
    animationFrameId = requestAnimationFrame(render);

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

  function initMobileStack() {
    if (!generatedImages || !generatedImages.length) return null;

    const mobileFooter = document.querySelector(CONFIG.selectors.mobileFooter);
    if (!mobileFooter) return null;

    const container = mobileFooter.querySelector(
      CONFIG.selectors.mobileImageContainer,
    );
    if (!container) return null;

    container.innerHTML = "";
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    const images = [];

    generatedImages.forEach((genImg) => {
      const clone = genImg.cloneNode(true);

      Object.assign(clone.style, {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "100%",
        height: "auto",
        maxWidth: "200px",
        display: "block",
        margin: "0",
        padding: "0",
      });

      container.appendChild(clone);
      images.push(clone);
    });

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

    const showNext = () => {
      const nextImage = images[currentIndex];
      currentIndex = (currentIndex + 1) % images.length;
      stackZIndex++;
      visibleStack.push(nextImage);

      const range = CONFIG.mobile.randomRange;

      gsap.set(nextImage, {
        autoAlpha: 1,
        zIndex: stackZIndex,
        xPercent: -50,
        yPercent: -50,
        x: randomOffset(-range, range),
        y: randomOffset(-range, range),
      });

      if (visibleStack.length > CONFIG.mobile.maxVisible) {
        const oldest = visibleStack.shift();
        gsap.set(oldest, { autoAlpha: 0, zIndex: 0 });
      }
    };

    for (let i = 0; i < CONFIG.mobile.maxVisible; i++) {
      timeoutIds.push(setTimeout(showNext, i * 100));
    }

    const animateStack = () => {
      const delay = 600 + Math.random() * 600;
      timeoutIds.push(
        setTimeout(() => {
          showNext();
          animateStack();
        }, delay),
      );
    };

    timeoutIds.push(
      setTimeout(animateStack, CONFIG.mobile.maxVisible * 100 + 300),
    );

    return () => {
      timeoutIds.forEach(clearTimeout);
      container.innerHTML = "";
    };
  }

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
            gsap.to(other, { opacity: 1, duration: 0.3 }),
          );
        });
      });

      group.addEventListener("mouseleave", () => {
        links.forEach((link) => gsap.to(link, { opacity: 1, duration: 0.3 }));
      });
    });
  }

  function initNZTime() {
    const elements = document.querySelectorAll(CONFIG.selectors.timeElements);
    if (!elements.length) return;

    const update = () => {
      const nzTime = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Pacific/Auckland" }),
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

  function handleLayoutChange() {
    if (!imagesLoaded) return;

    const isDesktop = window.matchMedia(
      `(min-width: ${CONFIG.desktop.minWidth}px)`,
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

  function setupFooterProximityLoader() {
    const desktopFooter = document.querySelector(
      CONFIG.selectors.desktopFooter,
    );
    const mobileFooter = document.querySelector(CONFIG.selectors.mobileFooter);

    const targets = [];
    if (desktopFooter) targets.push(desktopFooter);
    if (mobileFooter) targets.push(mobileFooter);

    if (!targets.length) return;

    const startLoad = () => {
      if (imagesLoaded || imagesLoading) return;
      loadFooterImages();
    };

    if (!("IntersectionObserver" in window)) {
      const onScroll = () => {
        if (imagesLoaded || imagesLoading) return;
        const near = targets.some((el) => {
          const r = el.getBoundingClientRect();
          return r.top < window.innerHeight + 900 && r.bottom > -900;
        });
        if (near) {
          window.removeEventListener("scroll", onScroll, { passive: true });
          startLoad();
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (imagesLoaded || imagesLoading) return;
        for (let i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            io.disconnect();
            startLoad();
            break;
          }
        }
      },
      {
        root: null,
        rootMargin: CONFIG.lazy.rootMargin,
        threshold: CONFIG.lazy.threshold,
      },
    );

    targets.forEach((el) => io.observe(el));
  }

  initLinkHover();
  initNZTime();
  setupFooterProximityLoader();
});
