(function () {
  "use strict";

  // Configuration
  const CONFIG = {
    elementId: "history-back",
    storageKey: "site_internal_history_last_url",
    currentHost: window.location.hostname,
  };

  /**
   * Safe execution wrapper to handle browser quirks or disabled cookies/storage
   */
  try {
    // 1. Logic to Store the URL
    // We only want to update the history if the user came from an INTERNAL page.
    // If they came from Google or a direct link, we preserve the existing history (if any).
    const referrer = document.referrer;

    if (referrer) {
      try {
        const referrerUrl = new URL(referrer);

        // Check if the referrer is from the same hostname
        if (referrerUrl.hostname === CONFIG.currentHost) {
          // Verify we aren't just reloading the exact same page (optional UX preference)
          if (referrerUrl.href !== window.location.href) {
            sessionStorage.setItem(CONFIG.storageKey, referrerUrl.href);
          }
        }
      } catch (urlErr) {
        // Fail silently if referrer URL is malformed
        console.debug("History Back: Malformed referrer URL", urlErr);
      }
    }

    // 2. Logic to Update the DOM Element
    const updateBackElement = () => {
      const backButton = document.getElementById(CONFIG.elementId);

      // Stop if element doesn't exist
      if (!backButton) return;

      // Retrieve the stored URL
      const lastInternalUrl = sessionStorage.getItem(CONFIG.storageKey);

      if (lastInternalUrl) {
        // If we have a stored internal link, set the href
        backButton.setAttribute("href", lastInternalUrl);

        // Optional: If you hide the button by default in CSS, unhide it here
        // backButton.style.display = 'inline-block';
      } else {
        // OPTIONAL: Robustness fallback
        // If there is no history (user landed directly on this page),
        // you might want to hide the button or set it to homepage.
        // Uncomment the line below to hide it if no history exists:
        // backButton.style.display = 'none';
        // OR set it to root:
        // backButton.setAttribute('href', '/');
      }
    };

    // 3. Execution Trigger
    // Run immediately if DOM is ready, otherwise wait for load
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", updateBackElement);
    } else {
      updateBackElement();
    }
  } catch (err) {
    // Catch-all for sessionStorage errors (e.g., if user blocks cookies/storage)
    console.warn(
      "History Back Script: Storage access denied or error occurred.",
      err
    );
  }
})();
