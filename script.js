const header = document.querySelector("[data-header]");
const revealItems = document.querySelectorAll("[data-reveal]");
const immediateRevealItems = document.querySelectorAll(".hero [data-reveal]");
const parallaxItems = document.querySelectorAll("[data-depth]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function setHeaderState() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 18);
}

function setParallax() {
  if (reduceMotion.matches) return;

  const scrollY = window.scrollY;
  parallaxItems.forEach((item) => {
    const depth = Number(item.dataset.depth || 0);
    item.style.transform = `translate3d(0, ${scrollY * depth}px, 0) scale(1.1)`;
  });
}

let ticking = false;

function onScroll() {
  if (ticking) return;

  window.requestAnimationFrame(() => {
    setHeaderState();
    setParallax();
    ticking = false;
  });

  ticking = true;
}

if ("IntersectionObserver" in window) {
  immediateRevealItems.forEach((item) => item.classList.add("is-visible"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.16,
    },
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

setHeaderState();
setParallax();
window.addEventListener("scroll", onScroll, { passive: true });
