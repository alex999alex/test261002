(function () {
  var root = document.documentElement;
  root.classList.add("js");

  var nav = document.querySelector("[data-nav]");
  var toggle = document.querySelector("[data-nav-toggle]");
  var menu = document.getElementById("nav-menu");
  var desktop = window.matchMedia("(min-width: 980px)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setMenuState(open) {
    var isDesktop = desktop.matches;
    nav.classList.toggle("is-open", open && !isDesktop);
    toggle.setAttribute("aria-expanded", String(open && !isDesktop));
    if ("inert" in menu) menu.inert = !isDesktop && !open;
    document.body.style.overflow = open && !isDesktop ? "hidden" : "";
  }

  function closeMenu() {
    setMenuState(false);
  }

  setMenuState(false);

  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") === "true";
    setMenuState(!open);
    if (!open) {
      var first = menu.querySelector("a");
      if (first) first.focus();
    }
  });

  menu.addEventListener("click", function (event) {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      closeMenu();
      toggle.focus();
    }
  });

  desktop.addEventListener("change", function () {
    closeMenu();
  });

  function onScroll() {
    var solid = window.scrollY > window.innerHeight * 0.72;
    nav.classList.toggle("is-solid", solid);
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var reveals = document.querySelectorAll(".reveal");
  if (reduce.matches || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) {
      observer.observe(el);
    });
  }

  var dialog = document.getElementById("piece-dialog");
  var dialogImage = document.getElementById("piece-dialog-image");
  var fields = {
    index: document.getElementById("piece-dialog-index"),
    title: document.getElementById("piece-dialog-title"),
    cat: document.getElementById("piece-dialog-cat"),
    copy: document.getElementById("piece-dialog-copy"),
    price: document.getElementById("piece-dialog-price")
  };

  document.querySelectorAll("[data-piece]").forEach(function (button) {
    button.addEventListener("click", function () {
      var image = button.querySelector("img");
      dialogImage.src = image.currentSrc || image.src;
      dialogImage.alt = image.alt;
      fields.index.textContent = button.dataset.index;
      fields.title.textContent = button.dataset.title;
      fields.cat.textContent = button.dataset.category;
      fields.copy.textContent = button.dataset.copy;
      fields.price.textContent = button.dataset.price;
      dialog.showModal();
    });
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });

  dialog.querySelector("[data-close]").addEventListener("click", function () {
    dialog.close();
  });

  dialog.querySelector("[data-enquire]").addEventListener("click", function (event) {
    event.preventDefault();
    dialog.close();
    var target = document.getElementById("newsletter");
    target.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth" });
    if (!form.hidden) email.focus({ preventScroll: true });
  });

  var form = document.getElementById("newsletter-form");
  var email = document.getElementById("email");
  var error = document.getElementById("newsletter-error");
  var success = document.getElementById("newsletter-success");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var value = email.value.trim();
    var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!valid) {
      error.hidden = false;
      error.textContent = "Enter a complete email address.";
      email.setAttribute("aria-invalid", "true");
      email.focus();
      return;
    }
    error.hidden = true;
    email.removeAttribute("aria-invalid");
    form.hidden = true;
    success.hidden = false;
  });
})();
