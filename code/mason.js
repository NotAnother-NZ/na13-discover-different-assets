// --- Global Grid System ---
// We define these on the window object so they can be called sitewide.

window.updateMasonryLayout = function () {
  if (typeof MasonIt !== "undefined") {
    // 1. Force Masonry Layout
    MasonIt.init("#grid-1", {
      masonDelay: 0,
      masonPollInterval: 500,
    });

    // 2. Sync Smooth Scroll (Lenis or RT Smooth Scroll)
    // We do this because Masonry changes the page height.
    if (
      window.rtSmoothScroll &&
      typeof window.rtSmoothScroll.resize === "function"
    ) {
      window.rtSmoothScroll.resize();
    } else if (window.lenis && typeof window.lenis.resize === "function") {
      window.lenis.resize();
    }
  }
};

window.mergeAllGrids = function () {
  const grid1 = document.getElementById("grid-1");
  const grid2 = document.getElementById("grid-2");
  const grid3 = document.getElementById("grid-3"); // Added Grid 3

  const grid2Wrapper = document.getElementById("grid-2-wrapper");
  // Assuming a wrapper for grid 3 might exist, similar to grid 2
  const grid3Wrapper =
    document.getElementById("grid-3-wrapper") ||
    document.querySelector('[id="grid-3"]').parentElement;

  if (!grid1) return;

  // 1. Collect all "Secondary" items (from Grid 2 and Grid 3)
  let secondaryItems = [];

  if (grid2) {
    secondaryItems.push(...Array.from(grid2.children));
  }
  if (grid3) {
    secondaryItems.push(...Array.from(grid3.children));
  }

  // If there are no items to merge, stop here
  if (secondaryItems.length === 0) return;

  // 2. Collect Primary items (Grid 1)
  // We use Array.from to get a static list of current nodes
  const items1 = Array.from(grid1.children);

  // 3. Shuffle Secondary Items
  // This ensures Grid 2 and Grid 3 items are mixed randomly together
  for (let i = secondaryItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [secondaryItems[i], secondaryItems[j]] = [
      secondaryItems[j],
      secondaryItems[i],
    ];
  }

  // 4. The Merge Loop (Self-Correcting Ratio)
  const mergedList = [];

  // Buffer: Always start with 2 standard items from Grid 1
  mergedList.push(...items1.splice(0, 2));

  while (secondaryItems.length > 0) {
    // Calculate Ratio: Primary Items Left / Secondary Items Left
    let ratio = items1.length / secondaryItems.length;

    // Create Jitter (-1, 0, or +1)
    let gap = Math.floor(ratio) + (Math.floor(Math.random() * 3) - 1);

    // Safety: Minimum gap of 2 to prevent clumping
    if (gap < 2) gap = 2;

    // Take from Primary
    const itemsToTake = Math.min(gap, items1.length);
    mergedList.push(...items1.splice(0, itemsToTake));

    // Take 1 from Secondary
    mergedList.push(secondaryItems.shift());
  }

  // Append any remaining Primary items
  if (items1.length > 0) {
    mergedList.push(...items1);
  }

  // 5. Render to DOM
  const fragment = document.createDocumentFragment();
  mergedList.forEach((item) => fragment.appendChild(item));

  grid1.innerHTML = "";
  grid1.appendChild(fragment);

  // 6. Cleanup Wrappers
  if (grid2Wrapper) grid2Wrapper.style.display = "none";

  // Only hide Grid 3 wrapper if we found it and it's distinct from the grid itself
  if (grid3Wrapper && grid3Wrapper !== grid3) {
    grid3Wrapper.style.display = "none";
  } else if (grid3) {
    grid3.style.display = "none";
  }

  // 7. Re-Run Auto Tagging & Layout
  // New items are in Grid 1, so we must tag them for filters
  window.autoTagGridItems();
  window.updateMasonryLayout();
};

window.autoTagGridItems = function () {
  const grid1 = document.getElementById("grid-1");
  if (!grid1) return;

  const allItems = Array.from(grid1.children);

  allItems.forEach((item) => {
    let category = "all";
    let isDeal = false;

    // LOGIC A: Is it an Article Card? (Usually from Grid 2 or 3)
    if (item.querySelector(".article-card")) {
      category = "Itinerary";
    }
    // LOGIC B: Standard Card
    else {
      // 1. Read Category Label
      const labelEl = item.querySelector(".title6-1");
      if (labelEl) {
        category = labelEl.textContent.trim();
      }

      // 2. Check for Deal Icon
      const dealIcon = item.querySelector(".category-filter-deal-icon");
      // Only tag as deal if the icon exists and is NOT hidden by CMS
      if (dealIcon && !dealIcon.classList.contains("w-condition-invisible")) {
        isDeal = true;
      }
    }

    // Write Attributes
    item.setAttribute("data-filter-category", category);
    if (isDeal) item.setAttribute("data-filter-deal", "true");
  });
};

// --- Initialization ---

document.addEventListener("DOMContentLoaded", () => {
  // 1. Run the Global Merge Immediately
  window.mergeAllGrids();

  // 2. Setup Filter Event Listeners
  const filterLinks = document.querySelectorAll("[data-ttd-filter]");
  const grid1 = document.getElementById("grid-1");

  function runFilter(filterValue) {
    const target = filterValue.trim();
    const allItems = Array.from(grid1.children);

    allItems.forEach((item) => {
      const itemCat = item.getAttribute("data-filter-category");
      const isDeal = item.getAttribute("data-filter-deal") === "true";

      let shouldShow = false;

      if (target === "All") {
        shouldShow = true;
      } else if (target === "Deal") {
        shouldShow = isDeal;
      } else {
        // Case-insensitive check
        if (itemCat && itemCat.toLowerCase() === target.toLowerCase()) {
          shouldShow = true;
        }
      }

      item.style.display = shouldShow ? "" : "none";
    });

    window.updateMasonryLayout();
  }

  filterLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const filterValue = link.getAttribute("data-ttd-filter");
      runFilter(filterValue);
    });
  });

  // 3. Initial Layout (Just to be safe)
  window.updateMasonryLayout();
});
