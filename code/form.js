document.addEventListener("DOMContentLoaded", function () {
  const animStyle = document.createElement("style");
  animStyle.innerHTML = `
      @keyframes tickPop {
        0% { transform: scale(0); opacity: 0; }
        60% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
  document.head.appendChild(animStyle);

  const tick1 = document.getElementById("tick1");
  const tick2 = document.getElementById("tick2");

  const updatesInput = document.getElementById("Receive-Updates");
  const locationInput = document.getElementById("Location");
  const firstNameInput = document.getElementById("First-Name");
  const lastNameInput = document.getElementById("Last-Name");
  const emailInput = document.getElementById("Email");
  const phoneInput = document.getElementById("Phone-Number");
  const submitBtn = document.getElementById("enter-now");
  const form = document.getElementById("wf-form-Competition");

  if (locationInput) {
    const v = (locationInput.value || "").trim();
    if (!v) locationInput.value = "Locating...";
  }

  if (firstNameInput) {
    const computedStyle = window.getComputedStyle(firstNameInput);
    const targetColor = computedStyle.borderColor;

    const inputStyle = document.createElement("style");
    inputStyle.innerHTML = `
        .form-input {
          color: ${targetColor} !important;
        }
        .form-input:focus {
          border-color: ${targetColor} !important;
          outline: none !important;
          box-shadow: none !important;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-text-fill-color: ${targetColor} !important;
          transition: background-color 5000s ease-in-out 0s;
          box-shadow: none !important;
        }
      `;
    document.head.appendChild(inputStyle);
  }

  function showTick(element) {
    const icon = element.querySelector(".tick-icon");
    if (icon) {
      icon.style.display = "";
      icon.style.animation = "none";
      icon.offsetHeight;
      icon.style.animation = "tickPop 0.3s ease-out forwards";
    }
  }

  function hideTick(element) {
    const icon = element.querySelector(".tick-icon");
    if (icon) {
      icon.style.display = "none";
      icon.style.animation = "none";
    }
  }

  function isTickActive(tickEl) {
    if (!tickEl) return false;
    const icon = tickEl.querySelector(".tick-icon");
    if (!icon) return false;
    const display = icon.style.display;
    if (display && display.toLowerCase() === "none") return false;
    return true;
  }

  function checkFormValidity() {
    const nameRegex = /^[a-zA-Z\s\-\']+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;

    const fnVal = (firstNameInput?.value || "").trim();
    const isFirstNameValid = fnVal !== "" && nameRegex.test(fnVal);

    const lnVal = (lastNameInput?.value || "").trim();
    const isLastNameValid = lnVal !== "" && nameRegex.test(lnVal);

    const emailVal = (emailInput?.value || "").trim();
    const isEmailValid = emailRegex.test(emailVal);

    const phoneVal = (phoneInput?.value || "").trim();
    const isPhoneValid = phoneVal !== "" && phoneRegex.test(phoneVal);

    const isConsentActive = isTickActive(tick2);

    const locVal = (locationInput?.value || "").trim();
    const isLocationValid = locVal !== "";

    const isValid =
      isFirstNameValid &&
      isLastNameValid &&
      isEmailValid &&
      isPhoneValid &&
      isConsentActive &&
      isLocationValid;

    if (submitBtn) {
      submitBtn.style.opacity = isValid ? "1" : "0.45";
      submitBtn.style.pointerEvents = isValid ? "auto" : "none";
      submitBtn.setAttribute("aria-disabled", isValid ? "false" : "true");
    }

    return isValid;
  }

  if (submitBtn) {
    submitBtn.style.opacity = "0.45";
    submitBtn.style.pointerEvents = "none";
    submitBtn.setAttribute("aria-disabled", "true");
  }

  if (form) {
    form.addEventListener(
      "keydown",
      function (e) {
        if (e.key !== "Enter") return;
        const target = e.target;
        if (!target || !(target instanceof Element)) return;

        const tag = (target.tagName || "").toLowerCase();
        const type =
          (target.getAttribute &&
            (target.getAttribute("type") || "").toLowerCase()) ||
          "";

        const isTextArea = tag === "textarea";
        const isButton =
          tag === "button" ||
          (tag === "input" &&
            (type === "submit" || type === "button" || type === "image"));

        if (isTextArea || isButton) return;

        e.preventDefault();
        e.stopPropagation();

        if (typeof target.blur === "function") target.blur();
        const active = document.activeElement;
        if (
          active &&
          active !== document.body &&
          typeof active.blur === "function"
        )
          active.blur();
      },
      true,
    );

    form.addEventListener(
      "submit",
      function (e) {
        const isValid = checkFormValidity();
        const byButton = e.submitter ? e.submitter === submitBtn : true;

        if (!isValid || !byButton) {
          e.preventDefault();
          e.stopPropagation();
          try {
            const active = document.activeElement;
            if (
              active &&
              active !== document.body &&
              typeof active.blur === "function"
            )
              active.blur();
          } catch (err) {}
          return false;
        }
      },
      true,
    );
  }

  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      let raw = this.value.replace(/[^0-9+]/g, "");
      let formatted = raw;

      if (raw.startsWith("04")) {
        if (raw.length > 4) {
          formatted = raw.slice(0, 4) + " " + raw.slice(4);
        }
        if (raw.length > 7) {
          formatted = formatted.slice(0, 8) + " " + raw.slice(7);
        }
        if (raw.length > 10) {
          formatted = formatted.slice(0, 12);
        }
      } else if (raw.startsWith("02")) {
        if (raw.length > 3) {
          formatted = raw.slice(0, 3) + " " + raw.slice(3);
        }
        if (raw.length > 6) {
          formatted = formatted.slice(0, 7) + " " + raw.slice(6);
        }
        if (raw.length > 11) {
          formatted = formatted.slice(0, 13);
        }
      }

      this.value = formatted;
      checkFormValidity();
    });
  }

  const textInputs = [firstNameInput, lastNameInput, emailInput, phoneInput];
  textInputs.forEach((input) => {
    if (input) {
      input.addEventListener("input", checkFormValidity);
      input.addEventListener("blur", checkFormValidity);
    }
  });

  if (tick1 && updatesInput) {
    let updatesActive = true;
    updatesInput.value = "Yes";
    showTick(tick1);

    tick1.addEventListener("click", function (e) {
      e.preventDefault();
      updatesActive = !updatesActive;
      if (updatesActive) {
        updatesInput.value = "Yes";
        showTick(tick1);
      } else {
        updatesInput.value = "No";
        hideTick(tick1);
      }
      checkFormValidity();
    });
  }

  if (tick2) {
    let consentActive = false;
    hideTick(tick2);

    tick2.addEventListener("click", function (e) {
      e.preventDefault();
      consentActive = !consentActive;
      if (consentActive) {
        showTick(tick2);
      } else {
        hideTick(tick2);
      }
      checkFormValidity();
    });
  }

  const hideRequiredField = () => {
    const el = document.getElementById("required-field");
    if (el) el.style.display = "none";
  };

  const clickGoToFormTop = () => {
    const btn = document.getElementById("go-to-form-top");
    if (btn && typeof btn.click === "function") btn.click();
  };

  const hideWinBadgeWrapper2 = () => {
    const el = document.getElementById("win-badge-wrapper2");
    if (el) el.style.display = "none";
  };

  const setupSuccessWatcher = () => {
    if (!form) return;

    const wrapper = form.closest(".w-form");
    if (!wrapper) return;

    const successEl = wrapper.querySelector(".w-form-done");
    if (!successEl) return;

    const isVisible = (node) => {
      if (!node) return false;
      if (node.hasAttribute("hidden")) return false;
      const cs = window.getComputedStyle(node);
      if (
        cs.display === "none" ||
        cs.visibility === "hidden" ||
        parseFloat(cs.opacity || "1") === 0
      )
        return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const onSuccess = () => {
      hideRequiredField();
      clickGoToFormTop();
      hideWinBadgeWrapper2();
    };

    if (isVisible(successEl)) {
      onSuccess();
      return;
    }

    const mo = new MutationObserver(() => {
      if (isVisible(successEl)) {
        onSuccess();
        mo.disconnect();
      }
    });

    mo.observe(successEl, {
      attributes: true,
      attributeFilter: ["style", "class", "hidden", "aria-hidden"],
    });
    mo.observe(wrapper, { attributes: true, childList: true, subtree: true });
  };

  const LOCATION_CACHE_KEY = "rt_ipapi_location_v1";

  const normalizeLocationString = (payload) => {
    if (!payload || typeof payload !== "object") return "";
    const parts = [];
    const city = (payload.city || "").trim();
    const region = (payload.regionName || payload.region || "").trim();
    const country = (payload.country || "").trim();
    if (city) parts.push(city);
    if (region && region.toLowerCase() !== city.toLowerCase())
      parts.push(region);
    if (country) parts.push(country);
    const out = parts.join(", ").trim();
    return out;
  };

  const setLocationValue = (val) => {
    if (!locationInput) return;
    const v = (val || "").trim();
    locationInput.value = v || "No Location data";
    checkFormValidity();
  };

  const tryLoadCachedLocation = () => {
    try {
      const raw = sessionStorage.getItem(LOCATION_CACHE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const loc = normalizeLocationString(parsed);
      if (!loc) return false;
      setLocationValue(loc);
      return true;
    } catch (e) {
      return false;
    }
  };

  const fetchLocation = async () => {
    if (!locationInput) return;

    if (tryLoadCachedLocation()) return;

    const key = "3rxukZrZ9IgP9hB";
    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = setTimeout(() => {
      if (controller) controller.abort();
    }, 4500);

    try {
      const url =
        "https://pro.ip-api.com/json/?key=" +
        encodeURIComponent(key) +
        "&fields=" +
        encodeURIComponent(
          "status,message,country,regionName,city,zip,lat,lon,timezone,isp,org,as,query",
        );
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: controller ? controller.signal : undefined,
      });

      if (!res.ok) {
        setLocationValue("No Location data");
        return;
      }

      const data = await res.json();
      if (!data || data.status !== "success") {
        setLocationValue("No Location data");
        return;
      }

      const loc = normalizeLocationString(data);
      setLocationValue(loc || "No Location data");

      try {
        sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(data));
      } catch (e) {}
    } catch (e) {
      setLocationValue("No Location data");
    } finally {
      clearTimeout(timeoutId);
    }
  };

  setupSuccessWatcher();
  checkFormValidity();
  fetchLocation();
});
