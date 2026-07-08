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

/* ----- contact modal ----- */
const contactModal = document.getElementById("contact-modal");

if (contactModal) {
  const dialog = contactModal.querySelector(".contact-modal__dialog");
  const form = contactModal.querySelector("[data-contact-form]");
  const status = contactModal.querySelector("[data-contact-status]");
  const submitBtn = contactModal.querySelector(".contact-form__submit");
  const contactEmail = "elana@elanacaplan.com";
  let lastFocused = null;

  const openModal = () => {
    lastFocused = document.activeElement;
    contactModal.hidden = false;
    document.body.style.overflow = "hidden";
    const firstField = form.querySelector(".contact-field__input");
    if (firstField) firstField.focus();
  };

  const closeModal = () => {
    contactModal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  };

  document.querySelectorAll("[data-open-contact]").forEach((btn) => {
    btn.addEventListener("click", openModal);
  });

  contactModal.querySelectorAll("[data-close-contact]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !contactModal.hidden) closeModal();
  });

  // keep focus within the dialog while it is open
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = dialog.querySelectorAll(
      'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

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
    if (form.botcheck && form.botcheck.checked) return; // honeypot tripped

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const accessKey = data.get("access_key");
    const configured = accessKey && !String(accessKey).startsWith("YOUR_");

    // No form service wired up yet: fall back to the visitor's mail client.
    if (!configured) {
      status.textContent = "Opening your email app…";
      status.className = "contact-form__status";
      openMailFallback(data);
      return;
    }

    submitBtn.disabled = true;
    status.textContent = "Sending…";
    status.className = "contact-form__status";

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      const result = await response.json();
      if (result.success) {
        form.reset();
        status.textContent = "Thanks — your message is on its way. I'll be in touch.";
        status.className = "contact-form__status is-success";
      } else {
        throw new Error(result.message || "Submission failed");
      }
    } catch (error) {
      status.textContent = "Something went wrong. Email me directly at " + contactEmail + ".";
      status.className = "contact-form__status is-error";
    } finally {
      submitBtn.disabled = false;
    }
  });
}
