document.addEventListener(
  "DOMContentLoaded",
  () => {
    // --- Existing Selectors ---
    const heroVideo = document.getElementById("hero-media-video");
    const overlay = document.getElementById("hero-media-overlay");
    const clickTrigger = document.getElementById("page-load-desktop");
    const callout = document.getElementById("home-hero-callout");

    // --- Text Selectors ---
    const flyDirect = document.getElementById("fly-direct");
    const toDifferent = document.getElementById("to-different");

    // --- Navbar Selectors ---
    const navItems = document.querySelectorAll(
      "#topbar #logo-anim-wrapper, #topbar .nav-link, #topbar .nav-button"
    );

    // --- Location & Map Selectors ---
    const locationWrapper = document.getElementById("hero-location-wrapper");
    const mapGroup = document.getElementById("map-illustration-group");

    // Check mobile status early for use in logic
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    let attentionStartTimer = null;
    let attentionInterval = null;
    let userInteracted = false;

    const clearAttentionTimers = () => {
      if (attentionStartTimer) clearTimeout(attentionStartTimer);
      if (attentionInterval) clearInterval(attentionInterval);
      attentionStartTimer = null;
      attentionInterval = null;
    };

    const markUserActive = () => {
      if (userInteracted) return;
      userInteracted = true;
      clearAttentionTimers();

      // --- FIX: Prevent "Stuck" Animation ---
      // If the user scrolls while the callout is entering (blurred/half opacity),
      // we kill the tween and force it to a clean, visible resting state immediately.
      if (callout) {
        gsap.to(callout, {
          autoAlpha: 1, // Ensure fully visible
          y: 0, // Reset position
          rotation: 0, // Reset rotation
          filter: "blur(0px)", // Remove blur
          duration: 0.3, // Fast, smooth snap-to-finish
          ease: "power2.out",
          overwrite: true, // Immediately kill any other animations on this element
        });
        callout.style.pointerEvents = "auto";
        callout.style.willChange = "";
      }
    };

    const bindUserActivityKillSwitch = () => {
      const opts = { passive: true, once: true };
      [
        "wheel",
        "touchstart",
        "keydown",
        "mousedown",
        "pointerdown",
        "scroll",
      ].forEach((evt) => {
        window.addEventListener(evt, markUserActive, opts);
      });
    };

    const shakeCallout = () => {
      if (!callout || userInteracted) return;

      gsap.killTweensOf(callout);

      gsap
        .timeline({ defaults: { overwrite: "auto" } })
        .set(callout, {
          transformOrigin: "50% 50%",
          willChange: "transform",
        })
        .to(callout, { rotation: -3, duration: 0.08, ease: "power2.out" })
        .to(callout, { rotation: 3, duration: 0.12, ease: "power2.inOut" })
        .to(callout, { rotation: -2.2, duration: 0.12, ease: "power2.inOut" })
        .to(callout, { rotation: 1.6, duration: 0.11, ease: "power2.inOut" })
        .to(callout, { rotation: -1, duration: 0.1, ease: "power2.inOut" })
        .to(callout, {
          rotation: 0,
          duration: 0.16,
          ease: "power3.out",
          onComplete: () => {
            callout.style.willChange = "";
          },
        });
    };

    const startIdleAttentionLoop = () => {
      clearAttentionTimers();
      if (userInteracted || !callout) return;

      attentionStartTimer = setTimeout(() => {
        shakeCallout();
        attentionInterval = setInterval(shakeCallout, 10000);
      }, 3000);
    };

    if (callout) {
      gsap.set(callout, {
        autoAlpha: 0,
        y: 28,
        rotation: 0,
        transformOrigin: "50% 50%",
        pointerEvents: "none",
        willChange: "transform,opacity,filter",
        force3D: true,
      });
    }

    bindUserActivityKillSwitch();

    // --- Prepare Navbar Items ---
    if (navItems.length > 0) {
      gsap.set(navItems, {
        autoAlpha: 0,
        y: -15,
        willChange: "transform, opacity",
      });
    }

    // --- Prepare Location Wrapper ---
    if (locationWrapper) {
      gsap.set(locationWrapper, {
        autoAlpha: 0,
        y: 10,
      });
    }

    // --- Prepare Main Text (Simple Fade) ---
    if (flyDirect) gsap.set(flyDirect, { y: 20, autoAlpha: 0 });
    if (toDifferent) gsap.set(toDifferent, { y: 20, autoAlpha: 0 });

    if (!heroVideo && !overlay) {
      document.documentElement.classList.remove("is-loading");
      if (typeof window.enableScroll === "function") window.enableScroll();
      return;
    }

    const heroGroup = overlay
      ? [heroVideo, overlay].filter(Boolean)
      : [heroVideo];

    const initialWidth = isMobile ? "80vw" : "16vw";
    const initialHeight = isMobile ? "45vw" : "9vw";

    const hasLenisAPI =
      typeof window.disableScroll === "function" &&
      typeof window.enableScroll === "function";

    const lockScroll = () => {
      if (hasLenisAPI) window.disableScroll();
      else if (document.body) document.body.classList.add("no-scroll");
    };

    const unlockScroll = () => {
      if (hasLenisAPI) window.enableScroll();
      else if (document.body) document.body.classList.remove("no-scroll");
    };

    const showCallout = () => {
      if (!callout) return;

      // --- FIX: Dynamic Timing ---
      // Use 1 second for mobile, 3 seconds for desktop
      const delayTime = isMobile ? 1.0 : 3.0;

      gsap.delayedCall(delayTime, () => {
        if (!callout) return;
        // If user already interacted during the wait, we don't start the entry animation
        // (markUserActive handles the state)
        if (userInteracted) return;

        callout.style.pointerEvents = "";
        callout.classList.add("is-visible");

        gsap.fromTo(
          callout,
          { autoAlpha: 0, y: 30, filter: "blur(6px)" },
          {
            autoAlpha: 1,
            y: -6,
            filter: "blur(0px)",
            duration: 0.6,
            ease: "expo.out",
            overwrite: "auto",
            onComplete: () => {
              gsap.to(callout, {
                y: 0,
                duration: 0.28,
                ease: "power2.out",
                overwrite: "auto",
                onComplete: () => {
                  callout.style.willChange = "";
                  startIdleAttentionLoop();
                },
              });
            },
          }
        );
      });
    };

    lockScroll();

    if (heroVideo) {
      heroVideo.muted = true;
      heroVideo.playsInline = true;

      const play = () => {
        try {
          heroVideo.currentTime = 0;
        } catch (_) {}
        const p = heroVideo.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      };

      if (heroVideo.readyState >= 2) play();
      else
        heroVideo.addEventListener("loadeddata", play, {
          once: true,
          passive: true,
        });
    }

    gsap.set(heroGroup, {
      width: initialWidth,
      height: initialHeight,
      xPercent: -50,
      yPercent: -50,
      top: "45%",
      left: "50%",
      position: "absolute",
      autoAlpha: 1,
      willChange: "transform,width,height,clip-path",
      force3D: true,
    });

    // --- MAIN TIMELINE ---
    const tl = gsap.timeline({
      defaults: { ease: "power4.inOut", autoRound: false },
      delay: 0.5,
      onComplete: () => {
        document.documentElement.classList.remove("is-loading");
        unlockScroll();
        showCallout();
        if (navItems.length) gsap.set(navItems, { willChange: "" });
      },
    });

    // 1. Video Clip Unmask
    tl.to(heroGroup, {
      clipPath: "inset(0% 0% 0% 0%)",
      webkitClipPath: "inset(0% 0% 0% 0%)",
      duration: 1.75,
      ease: "power3.inOut",
    })
      .call(() => {
        if (clickTrigger) clickTrigger.click();
      })
      // 2. Video Scale Up
      .to(
        heroGroup,
        {
          width: "105%",
          height: "105%",
          top: "50%",
          duration: 1.35,
          ease: "expo.inOut",
          force3D: true,
        },
        "+=1"
      );

    // 3. Simple Text Fade In
    const textElements = [flyDirect, toDifferent].filter(Boolean);
    if (textElements.length > 0) {
      tl.to(
        textElements,
        {
          duration: 1.0,
          autoAlpha: 1,
          y: 0,
          stagger: 0.3,
          ease: "power2.out",
        },
        "-=0.2"
      );
    }

    // 4. Topbar Stagger
    if (navItems.length > 0) {
      tl.to(
        navItems,
        {
          duration: 0.8,
          autoAlpha: 1,
          y: 0,
          stagger: 0.08,
          ease: "power2.out",
        },
        "-=0.6"
      );
    }

    // 5. Location Reveal & Map Animation
    if (locationWrapper) {
      tl.to(
        locationWrapper,
        {
          duration: 0.8,
          autoAlpha: 1,
          y: 0,
          ease: "power2.out",
          onStart: () => {
            if (mapGroup) mapGroup.classList.add("is-animating");
          },
        },
        "-=0.4"
      );
    }
  },
  { once: true }
);
