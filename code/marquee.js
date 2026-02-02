/**
 * Marquee.js
 * A truly seamless marquee implementation using CSS animations with fixed right direction
 */

class Marquee {
  constructor(element) {
    this.wrapper = element;
    this.speed = parseInt(element.getAttribute("data-dt-marquee-speed")) || 100;
    this.direction =
      element.getAttribute("data-dt-marquee-direction") || "left";

    // Mark as initialized to prevent duplication
    if (element.hasAttribute("data-marquee-initialized")) {
      return;
    }
    element.setAttribute("data-marquee-initialized", "true");

    this.init();
  }

  init() {
    // Get the original content container
    const originalContainer = this.wrapper.querySelector(
      '[class^="marquee-type-"]'
    );
    if (!originalContainer) {
      console.error("No marquee content element found");
      return;
    }

    // Store the original content and its class
    const originalContent = originalContainer.innerHTML;
    const containerClass = originalContainer.className;

    // Clear the wrapper and set it up for animation
    this.wrapper.innerHTML = "";
    this.wrapper.style.display = "flex";
    this.wrapper.style.overflow = "hidden";

    // Create the animation container
    const animationContainer = document.createElement("div");
    animationContainer.className = "marquee-animation-container";
    animationContainer.style.display = "flex";
    animationContainer.style.width = "max-content"; // Allow it to be as wide as needed
    this.wrapper.appendChild(animationContainer);

    // Create enough copies to ensure no gaps
    // For seamless scrolling, we need at least 2 copies initially
    const baseContainer = document.createElement("div");
    baseContainer.className = containerClass;
    baseContainer.style.display = "flex";
    baseContainer.style.flexShrink = "0";
    baseContainer.innerHTML = originalContent;

    // Add first copy
    animationContainer.appendChild(baseContainer);

    // We need to measure the content width after it's in the DOM
    setTimeout(() => {
      // Get actual width after rendering
      const contentWidth = baseContainer.offsetWidth;

      // Add more copies based on container width to ensure no gaps
      const wrapperWidth = this.wrapper.offsetWidth;
      const copiesNeeded = Math.ceil((wrapperWidth * 2) / contentWidth) + 2; // Add extra copies for right direction

      // Already added one, so add the rest
      for (let i = 1; i < copiesNeeded; i++) {
        const copy = baseContainer.cloneNode(true);
        animationContainer.appendChild(copy);
      }

      // Now that we know the content width, apply the animation
      this.applyAnimation(animationContainer, contentWidth, copiesNeeded);
    }, 0);
  }

  applyAnimation(container, contentWidth, copiesCount) {
    // Generate a unique animation name to avoid conflicts
    const animationName = `marquee-scroll-${Math.floor(
      Math.random() * 1000000
    )}`;

    // Calculate animation duration based on speed and content width
    // Lower speed = faster animation
    const speedFactor = 100 / this.speed; // Invert so higher speed numbers = faster
    const duration = contentWidth * speedFactor * 0.01; // Adjust this multiplier to control overall speed

    // For right direction, we need to position the content initially and use a different animation
    if (this.direction === "right") {
      // Create the keyframes for right direction
      const keyframes = document.createElement("style");
      keyframes.textContent = `
              @keyframes ${animationName} {
                0% { transform: translateX(-${contentWidth}px); }
                100% { transform: translateX(0); }
              }
            `;
      document.head.appendChild(keyframes);

      // Set initial position for right direction
      container.style.transform = `translateX(-${contentWidth}px)`;
    } else {
      // Create the keyframes for left direction
      const keyframes = document.createElement("style");
      keyframes.textContent = `
              @keyframes ${animationName} {
                0% { transform: translateX(0); }
                100% { transform: translateX(-${contentWidth}px); }
              }
            `;
      document.head.appendChild(keyframes);
    }

    // Apply the animation
    container.style.animation = `${animationName} ${duration}s linear infinite`;

    // Handle resize events to ensure it works at all screen sizes
    window.addEventListener("resize", () => {
      // Check if wrapper still exists in DOM
      if (!document.body.contains(this.wrapper)) {
        return;
      }

      // Only re-initialize if width has changed significantly
      const newWrapperWidth = this.wrapper.offsetWidth;
      if (Math.abs(newWrapperWidth - this.wrapperWidth) > 50) {
        this.wrapperWidth = newWrapperWidth;
        this.init();
      }
    });

    // Store current wrapper width
    this.wrapperWidth = this.wrapper.offsetWidth;
  }
}

// Initialize all marquees when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initMarquees();
});

// Global function to initialize marquees
window.initMarquees = function (container = document) {
  const marqueeElements = container.querySelectorAll(".marquee-wrapper");
  const instances = [];

  marqueeElements.forEach((element) => {
    instances.push(new Marquee(element));
  });

  return instances;
};
