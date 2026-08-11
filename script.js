const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const header = document.querySelector("[data-header]");
const progressFill = document.querySelector("[data-progress-fill]");
const railFill = document.querySelector("[data-rail-fill]");
const railMarkers = Array.from(document.querySelectorAll("[data-rail-marker]"));
const sections = Array.from(document.querySelectorAll("[data-section]"));
const hero = document.querySelector(".hero");
const diagram = document.querySelector("[data-diagram]");

function setHeaderState() {
  if (!header) return;
  const pastHero = window.scrollY > Math.max((hero?.offsetHeight || 320) - 80, 40);
  header.classList.toggle("is-scrolled", pastHero);
}

function setScrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

  if (progressFill) progressFill.style.width = `${ratio * 100}%`;
  if (railFill) railFill.style.height = `${ratio * 100}%`;

  positionRailMarkers();
  updateActiveMarker();
}

function positionRailMarkers() {
  if (!railMarkers.length || !sections.length) return;
  const rail = document.querySelector("[data-deal-rail]");
  if (!rail || getComputedStyle(rail).display === "none") return;

  const tops = sections.map((s) => s.offsetTop);
  const minTop = Math.min(...tops);
  const maxTop = Math.max(...tops);
  const span = Math.max(1, maxTop - minTop);

  sections.forEach((section) => {
    const marker = railMarkers.find((m) => m.dataset.section === section.dataset.section);
    if (!marker) return;
    const t = (section.offsetTop - minTop) / span;
    marker.style.top = `${8 + t * 84}%`;
  });
}

function updateActiveMarker() {
  if (!sections.length) return;
  const focusY = window.scrollY + window.innerHeight * 0.28;
  let activeIndex = 0;

  sections.forEach((section, index) => {
    if (section.offsetTop <= focusY) activeIndex = index;
  });

  railMarkers.forEach((marker) => {
    const idx = sections.findIndex((s) => s.dataset.section === marker.dataset.section);
    marker.classList.toggle("is-active", idx === activeIndex);
  });
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    setHeaderState();
    setScrollProgress();
    ticking = false;
  });
}

function initHero() {
  if (!hero) return;
  if (reduceMotion.matches) {
    hero.querySelectorAll("[data-hero-line]").forEach((line) => {
      line.style.opacity = "1";
      line.style.transform = "none";
    });
    return;
  }
  requestAnimationFrame(() => hero.classList.add("is-ready"));
}

function initReveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (!items.length) return;

  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
  );

  items.forEach((item) => observer.observe(item));
}

function prepareDiagramLines(root) {
  root.querySelectorAll(".diagram-line").forEach((line) => {
    if (!line.getTotalLength) return;
    const length = line.getTotalLength();
    line.style.strokeDasharray = String(length);
    line.style.strokeDashoffset = String(length);
  });
}

function initDiagram() {
  if (!diagram) return;

  const showFinal = () => {
    diagram.classList.add("is-drawn");
    diagram.querySelectorAll(".diagram-line").forEach((line) => {
      line.style.strokeDashoffset = "0";
    });
  };

  prepareDiagramLines(diagram);

  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    showFinal();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        diagram.classList.add("is-animating");
        window.setTimeout(() => {
          diagram.classList.remove("is-animating");
          showFinal();
        }, 2500);
        observer.unobserve(diagram);
      });
    },
    { threshold: 0.35 },
  );

  observer.observe(diagram);
}

function setCaseOpen(item, open) {
  const trigger = item.querySelector(".case__trigger");
  const panel = item.querySelector(".case__panel");
  if (!trigger || !panel) return;

  item.classList.toggle("is-open", open);
  trigger.setAttribute("aria-expanded", open ? "true" : "false");
  panel.hidden = !open;
  panel.setAttribute("aria-hidden", open ? "false" : "true");
}

function initAccordion() {
  const root = document.querySelector("[data-accordion]");
  if (!root) return;

  root.querySelectorAll(".case").forEach((item) => {
    const trigger = item.querySelector(".case__trigger");
    if (!trigger) return;

    setCaseOpen(item, item.classList.contains("is-open"));

    trigger.addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      setCaseOpen(item, willOpen);
    });
  });
}

function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const status = form.querySelector("[data-contact-status]");
  const submitBtn = form.querySelector(".contact-form__submit");
  const contactEmail = "elana@elanacaplan.com";
  const successMsg = "Got it. I'll come back to you within two business days.";
  const errorMsg = `That didn't send. Email me directly at ${contactEmail} and I'll pick it up from there.`;

  const openMailFallback = (data) => {
    const subject = encodeURIComponent("Diagnostic inquiry from " + (data.get("name") || "the site"));
    const body = encodeURIComponent(
      "Name: " + (data.get("name") || "") +
        "\nEmail: " + (data.get("email") || "") +
        "\n\n" + (data.get("message") || ""),
    );
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.botcheck && form.botcheck.checked) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const accessKey = data.get("access_key");
    const configured = accessKey && !String(accessKey).startsWith("YOUR_");

    if (!configured) {
      if (status) status.textContent = "Opening your email app…";
      openMailFallback(data);
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (status) {
      status.textContent = "Sending…";
      status.className = "contact-form__status";
    }

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      const result = await response.json();
      if (result.success) {
        form.reset();
        if (status) {
          status.textContent = successMsg;
          status.className = "contact-form__status is-success";
        }
      } else {
        throw new Error(result.message || "Submission failed");
      }
    } catch (error) {
      if (status) {
        status.textContent = errorMsg;
        status.className = "contact-form__status is-error";
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

initHero();
initReveal();
initDiagram();
initAccordion();
initContactForm();
setHeaderState();
setScrollProgress();

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => {
  setHeaderState();
  setScrollProgress();
  if (diagram && !diagram.classList.contains("is-drawn") && !diagram.classList.contains("is-animating")) {
    prepareDiagramLines(diagram);
  }
});
