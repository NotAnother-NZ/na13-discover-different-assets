(function () {
  function rtSchemaRender(root) {
    const scope = root && root.querySelectorAll ? root : document;

    const schemaContainers = [];
    const seen = new Set();

    scope.querySelectorAll("[data-schema]").forEach((el) => {
      if (!seen.has(el)) {
        seen.add(el);
        schemaContainers.push(el);
      }
    });

    scope.querySelectorAll(".schema").forEach((el) => {
      if (!seen.has(el)) {
        seen.add(el);
        schemaContainers.push(el);
      }
    });

    if (!schemaContainers.length) return;

    schemaContainers.forEach((schemaContainer) => {
      const alreadyConverted =
        schemaContainer.querySelector &&
        schemaContainer.querySelector(".converted-schema");

      if (alreadyConverted) {
        if (schemaContainer.dataset)
          schemaContainer.dataset.schemaRendered = "1";
        return;
      }

      const txt = document.createElement("textarea");
      txt.innerHTML = schemaContainer.innerHTML;
      let rawContent = txt.value;

      rawContent = rawContent.replace(/<\/break>/gi, "<break/>");

      rawContent = rawContent.replace(
        /&(?![a-zA-Z]+;|#\d+;|#x[0-9a-fA-F]+;)/g,
        "&amp;",
      );

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(
        `<root>${rawContent}</root>`,
        "text/xml",
      );

      const parseError = xmlDoc.querySelector("parsererror");
      if (parseError) {
        console.error("Schema parsing error:", parseError.textContent);
        return;
      }

      const xmlRoot = xmlDoc.querySelector("root");
      if (!xmlRoot) return;

      const nodes = xmlRoot.childNodes;
      const outputHTML = [];

      outputHTML.push(`<div class="converted-schema">`);

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.nodeType !== 1) continue;

        const tagName = node.nodeName.toLowerCase();

        if (tagName === "gallery") {
          const images = node.getElementsByTagName("image");
          let imgHTML = "";

          for (let j = 0; j < images.length; j++) {
            const src = (images[j].textContent || "").trim();
            if (src) {
              imgHTML += `<img src="${escapeAttr(
                src,
              )}" loading="lazy" alt="" class="gallery-image" draggable="false">`;
            }
          }

          const controlsHTML =
            images.length > 1
              ? `
          <div class="slider-controls">
            <a data-gallery-slider="prev" aria-label="View previous images" href="#" class="cta3 inactive w-inline-block">
              <div class="site-slidein-bg-layer"></div>
              <img src="https://cdn.prod.website-files.com/695fd35ca60f993c998070b0/69778280b2cff87c16f038d3_arrow-left.svg" loading="lazy" alt="" class="button-icon type2" draggable="false">
            </a>
            <a data-gallery-slider="next" aria-label="View next images" href="#" class="cta3 w-inline-block">
              <div class="site-slidein-bg-layer"></div>
              <img src="https://cdn.prod.website-files.com/695fd35ca60f993c998070b0/69778275d88ee0416d60c8b9_arrow-right.svg" loading="lazy" alt="" class="button-icon type2" draggable="false">
            </a>
          </div>`
              : "";

          outputHTML.push(`
        <div class="gallery-wrapper">
          ${controlsHTML}
          <div class="gallery">${imgHTML}</div>
        </div>
      `);
        } else if (tagName === "paragraph") {
          const html = renderInlineNodes(node);
          outputHTML.push(
            `<div class="paragraph-block"><p class="title5-1">${html.trim()}</p></div>`,
          );
        } else if (tagName === "title") {
          outputHTML.push(
            `<div class="title-block"><h2 class="title4-1">${escapeHTML(
              (node.textContent || "").trim(),
            )}</h2></div>`,
          );
        } else if (tagName === "list") {
          const items = node.getElementsByTagName("item");
          let listItemsHTML = "";

          for (let j = 0; j < items.length; j++) {
            const key = (items[j].getAttribute("key") || "").trim();
            const value = (items[j].textContent || "").trim();
            listItemsHTML += `
          <div class="list-item">
            <h3 data-caps="" class="title6-1">${escapeHTML(key)}</h3>
            <h3 data-caps="" class="title6-1">${escapeHTML(value)}</h3>
          </div>
        `;
          }

          outputHTML.push(`<div class="list-wrapper">${listItemsHTML}</div>`);
        } else if (tagName === "gap-large") {
          outputHTML.push(`<div class="gap-large"></div>`);
        } else if (tagName === "gap-small") {
          outputHTML.push(`<div class="gap-small"></div>`);
        }
      }

      outputHTML.push(`</div>`);
      schemaContainer.innerHTML = outputHTML.join("");

      if (schemaContainer.dataset) schemaContainer.dataset.schemaRendered = "1";
    });

    initSliders(root);
  }

  function renderInlineNodes(node) {
    let html = "";

    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        html += escapeHTML(child.textContent || "");
        return;
      }

      if (child.nodeType !== 1) return;

      const name = child.nodeName.toLowerCase();

      if (name === "break") {
        html += "<br>";
        return;
      }

      if (name === "bold") {
        html += `<strong>${renderInlineNodes(child)}</strong>`;
        return;
      }

      if (name === "italic") {
        html += `<em>${renderInlineNodes(child)}</em>`;
        return;
      }

      if (name === "underline") {
        html += `<u>${renderInlineNodes(child)}</u>`;
        return;
      }

      if (name === "link") {
        const rawUrl = (child.getAttribute("url") || "").trim();
        const inner = renderInlineNodes(child).trim();
        if (rawUrl) {
          html += `<a href="${escapeAttr(
            rawUrl,
          )}" data-underline="" target="_blank" rel="noopener noreferrer">${inner}</a>`;
        } else {
          html += inner || escapeHTML(child.textContent || "");
        }
        return;
      }

      html += escapeHTML(child.textContent || "");
    });

    return html;
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(str) {
    return escapeHTML(str).replace(/`/g, "&#96;");
  }

  function initSliders(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const wrappers = scope.querySelectorAll(".gallery-wrapper");

    wrappers.forEach((wrapper) => {
      const gallery = wrapper.querySelector(".gallery");
      const prevBtn = wrapper.querySelector('[data-gallery-slider="prev"]');
      const nextBtn = wrapper.querySelector('[data-gallery-slider="next"]');

      if (!gallery || !prevBtn || !nextBtn) return;

      if (wrapper.dataset && wrapper.dataset.galleryInited === "1") {
        updateButtonsForWrapper(wrapper);
        return;
      }

      let ticking = false;

      const updateButtons = () => {
        const scrollLeft = gallery.scrollLeft;
        const maxScroll = gallery.scrollWidth - gallery.clientWidth;

        if (scrollLeft <= 5) prevBtn.classList.add("inactive");
        else prevBtn.classList.remove("inactive");

        if (scrollLeft >= maxScroll - 5) nextBtn.classList.add("inactive");
        else nextBtn.classList.remove("inactive");

        ticking = false;
      };

      const onScroll = () => {
        if (!ticking) {
          requestAnimationFrame(updateButtons);
          ticking = true;
        }
      };

      const scroll = (dir) => {
        gallery.scrollBy({
          left:
            dir === "next"
              ? gallery.clientWidth * 0.8
              : -gallery.clientWidth * 0.8,
          behavior: "smooth",
        });
      };

      nextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        scroll("next");
      });

      prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        scroll("prev");
      });

      gallery.addEventListener("scroll", onScroll, { passive: true });
      updateButtons();

      if (wrapper.dataset) wrapper.dataset.galleryInited = "1";
    });
  }

  function updateButtonsForWrapper(wrapper) {
    const gallery = wrapper.querySelector(".gallery");
    const prevBtn = wrapper.querySelector('[data-gallery-slider="prev"]');
    const nextBtn = wrapper.querySelector('[data-gallery-slider="next"]');
    if (!gallery || !prevBtn || !nextBtn) return;

    const scrollLeft = gallery.scrollLeft;
    const maxScroll = gallery.scrollWidth - gallery.clientWidth;

    if (scrollLeft <= 5) prevBtn.classList.add("inactive");
    else prevBtn.classList.remove("inactive");

    if (scrollLeft >= maxScroll - 5) nextBtn.classList.add("inactive");
    else nextBtn.classList.remove("inactive");
  }

  window.rtSchemaRender = rtSchemaRender;

  document.addEventListener("DOMContentLoaded", function () {
    rtSchemaRender(document);
  });
})();
