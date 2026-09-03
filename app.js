const SANITY_PROJECT_ID = "5ik5680s";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-08-25";
const SANITY_BASE_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

let currentLanguage = localStorage.getItem("ac168-language") || "en";
let loadedAmulets = [];
let contactModalPreviousFocus = null;
let contactModalInquiry = "";
let currentContacts = {
  whatsappNumber: "66649322036",
  whatsappDisplay: "+66 64 932 2036",
  wechatId: "panupong_m",
  telephoneNumber: "66816271218",
  telephoneDisplay: "+66 81 627 1218",
  email: "",
  lineId: "",
  address: {
    en: "33 Ratchaphruek Road\nBang Kho, Chom Thong\nBangkok 10150, Thailand",
    th: "33 ถนนราชพฤกษ์\nแขวงบางค้อ เขตจอมทอง\nกรุงเทพฯ 10150 ประเทศไทย",
    zh: "泰国曼谷 Chom Thong 区 Bang Kho\nRatchaphruek Road 33号\n邮编 10150",
  },
};

const AMULET_PROJECTION = `{
  _id, inventoryId, name, "slug": slug.current, category, monkMaster,
  temple, province, year, material, widthMm, heightMm, thicknessMm, weightG,
  conditionGrade, conditionNotes, story, description, origin, provenance,
  authenticationNotes, priceThb, showOnWebsite, featured, newArrival, status, sortOrder,
  "images": images[]{"url": asset->url, imageType, caption, altText},
  "documents": documents[publiclyVisible == true]{title, "url": asset->url}
}`;

async function querySanity(query, params = {}) {
  const search = new URLSearchParams({ query });
  Object.entries(params).forEach(([key, value]) =>
    search.set(`$${key}`, JSON.stringify(value)),
  );

  const response = await fetch(`${SANITY_BASE_URL}?${search.toString()}`);
  if (!response.ok) throw new Error(`Sanity returned HTTP ${response.status}`);

  const payload = await response.json();
  return payload.result;
}

async function fetchAmulets() {
  const query = `*[_type == "amulet" && showOnWebsite == true] | order(coalesce(sortOrder, 999999) asc, _createdAt desc) ${AMULET_PROJECTION}`;
  return (await querySanity(query)) || [];
}

async function fetchAmuletById(inventoryId) {
  const query = `*[_type == "amulet" && showOnWebsite == true && inventoryId == $inventoryId][0] ${AMULET_PROJECTION}`;
  return querySanity(query, { inventoryId });
}

async function fetchSiteSettings() {
  const query = `*[_type == "siteSettings"][0]{whatsappNumber, whatsappDisplay, wechatId, telephoneNumber, telephoneDisplay, email, lineId, address}`;
  return querySanity(query);
}

function getLocalizedText(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[currentLanguage] || field.en || field.th || field.zh || "";
}

function t(key) {
  return (
    window.AC168_TRANSLATIONS?.[currentLanguage]?.[key] ||
    window.AC168_TRANSLATIONS?.en?.[key] ||
    key
  );
}

function applyTranslations() {
  document.documentElement.lang =
    currentLanguage === "zh" ? "zh-CN" : currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-hero-dot]").forEach((button, index) => {
    button.setAttribute("aria-label", `${t("home.goToSlide")} ${index + 1}`);
  });
  document.querySelectorAll("[data-language]").forEach((button) => {
    const active = button.dataset.language === currentLanguage;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function initializeHeroSlider() {
  const slider = document.querySelector("[data-hero-slider]");
  if (!slider) return;

  const track = slider.querySelector("[data-hero-track]");
  const slides = [...slider.querySelectorAll("[data-hero-slide]")];
  const dots = [...slider.querySelectorAll("[data-hero-dot]")];
  const status = slider.querySelector("[data-hero-status]");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let currentSlide = 0;
  let autoplayTimer = null;
  let pointerStartX = null;

  const showSlide = (nextIndex, announce = false) => {
    currentSlide = (nextIndex + slides.length) % slides.length;
    track.style.transform = `translate3d(-${currentSlide * 100}%, 0, 0)`;
    slides.forEach((slide, index) =>
      slide.setAttribute("aria-hidden", String(index !== currentSlide)),
    );
    dots.forEach((dot, index) => {
      const active = index === currentSlide;
      dot.classList.toggle("active", active);
      if (active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    if (announce && status) {
      status.textContent = t("home.slideStatus")
        .replace("{current}", String(currentSlide + 1))
        .replace("{total}", String(slides.length));
    }
  };

  const stopAutoplay = () => {
    window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  };
  const startAutoplay = () => {
    stopAutoplay();
    if (!reducedMotion && !document.hidden) {
      autoplayTimer = window.setInterval(
        () => showSlide(currentSlide + 1),
        7000,
      );
    }
  };
  const selectSlide = (index) => {
    showSlide(index, true);
    startAutoplay();
  };

  slider
    .querySelector("[data-hero-previous]")
    ?.addEventListener("click", () => selectSlide(currentSlide - 1));
  slider
    .querySelector("[data-hero-next]")
    ?.addEventListener("click", () => selectSlide(currentSlide + 1));
  dots.forEach((dot, index) =>
    dot.addEventListener("click", () => selectSlide(index)),
  );
  slider.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectSlide(currentSlide - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectSlide(currentSlide + 1);
    }
  });
  slider.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") pointerStartX = event.clientX;
  });
  slider.addEventListener("pointerup", (event) => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(distance) < 48) return;
    selectSlide(currentSlide + (distance < 0 ? 1 : -1));
  });
  slider.addEventListener("pointercancel", () => {
    pointerStartX = null;
  });
  slider.addEventListener("mouseenter", stopAutoplay);
  slider.addEventListener("mouseleave", startAutoplay);
  slider.addEventListener("focusin", stopAutoplay);
  slider.addEventListener("focusout", (event) => {
    if (!slider.contains(event.relatedTarget)) startAutoplay();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  showSlide(0);
  startAutoplay();
}

function applyContactSettings() {
  const whatsappUrl = `https://wa.me/${currentContacts.whatsappNumber}`;
  const phoneUrl = `tel:+${currentContacts.telephoneNumber}`;
  document.querySelectorAll('[data-contact="whatsapp"]').forEach((element) => {
    element.href = whatsappUrl;
    const value = element.querySelector("[data-contact-value]");
    if (value) value.textContent = currentContacts.whatsappDisplay;
  });
  document.querySelectorAll('[data-contact="wechat"]').forEach((element) => {
    const value = element.querySelector("[data-contact-value]");
    if (value) value.textContent = currentContacts.wechatId;
  });
  document.querySelectorAll('[data-contact="telephone"]').forEach((element) => {
    element.href = phoneUrl;
    const value = element.querySelector("[data-contact-value]");
    if (value) value.textContent = currentContacts.telephoneDisplay;
  });
  document.querySelectorAll('[data-contact="address"]').forEach((element) => {
    element.textContent = getLocalizedText(currentContacts.address);
  });
  document.querySelectorAll("[data-contact-grid]").forEach((grid) => {
    grid
      .querySelectorAll(".optional-contact")
      .forEach((element) => element.remove());
    [
      currentContacts.email
        ? {
            label: t("contact.email"),
            value: currentContacts.email,
            href: `mailto:${currentContacts.email}`,
          }
        : null,
      currentContacts.lineId
        ? {
            label: t("contact.line"),
            value: currentContacts.lineId,
            href: `https://line.me/ti/p/~${encodeURIComponent(currentContacts.lineId)}`,
          }
        : null,
    ]
      .filter(Boolean)
      .forEach((channel) => {
        const link = document.createElement("a");
        link.className = "contact-channel-card optional-contact";
        link.href = channel.href;
        const label = document.createElement("strong");
        label.textContent = channel.label;
        const value = document.createElement("span");
        value.textContent = channel.value;
        link.append(label, value);
        grid.append(link);
      });
  });
  if (document.getElementById("contact-modal")) renderContactModal();
}

function getContactInquiry(source) {
  if (source?.matches?.("form")) return buildInquiryMessage(source);
  if (source?.dataset?.contactInquiry) return source.dataset.contactInquiry;
  return "";
}

function renderContactModal() {
  const modal = document.getElementById("contact-modal");
  if (!modal) return;
  const message = contactModalInquiry;
  const whatsappUrl = `https://wa.me/${currentContacts.whatsappNumber}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  const emailUrl = currentContacts.email
    ? `mailto:${currentContacts.email}${message ? `?subject=${encodeURIComponent(t("contact.emailSubject"))}&body=${encodeURIComponent(message)}` : ""}`
    : "";
  const channels = [
    {
      label: t("contact.whatsapp"),
      value: currentContacts.whatsappDisplay,
      href: whatsappUrl,
      external: true,
    },
    {
      label: t("contact.wechat"),
      value: currentContacts.wechatId,
      action: "wechat",
    },
    {
      label: t("contact.telephone"),
      value: currentContacts.telephoneDisplay,
      href: `tel:+${currentContacts.telephoneNumber}`,
    },
    currentContacts.email
      ? {
          label: t("contact.email"),
          value: currentContacts.email,
          href: emailUrl,
        }
      : null,
    currentContacts.lineId
      ? {
          label: t("contact.line"),
          value: currentContacts.lineId,
          href: `https://line.me/ti/p/~${encodeURIComponent(currentContacts.lineId)}`,
          external: true,
        }
      : null,
  ].filter(Boolean);

  modal.querySelector(".contact-modal-title").textContent =
    t("contact.modalTitle");
  modal.querySelector(".contact-modal-intro").textContent =
    t("contact.modalIntro");
  modal
    .querySelector(".contact-modal-close")
    .setAttribute("aria-label", t("contact.close"));
  modal.querySelector(".contact-modal-address-label").textContent = t(
    "contact.headquarters",
  );
  modal.querySelector(".contact-modal-address-value").textContent =
    getLocalizedText(currentContacts.address);
  modal.querySelector(".contact-modal-channels").innerHTML = channels
    .map((channel) =>
      channel.action === "wechat"
        ? `<button class="contact-modal-channel" type="button" data-modal-wechat><strong>${escapeHtml(channel.label)}</strong><span>${escapeHtml(channel.value)}</span></button>`
        : `<a class="contact-modal-channel" href="${escapeHtml(channel.href)}"${channel.external ? ' target="_blank" rel="noopener"' : ""}><strong>${escapeHtml(channel.label)}</strong><span>${escapeHtml(channel.value)}</span></a>`,
    )
    .join("");
  modal
    .querySelector("[data-modal-wechat]")
    ?.addEventListener("click", async () => {
      await copyText(message || currentContacts.wechatId);
      alert(
        message
          ? `${t("contact.copied")} ${currentContacts.wechatId}`
          : `${t("contact.wechatCopied")} ${currentContacts.wechatId}`,
      );
    });
}

function ensureContactModal() {
  let modal = document.getElementById("contact-modal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "contact-modal";
  modal.className = "contact-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="contact-modal-backdrop" data-modal-close></div>
    <section class="contact-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title" tabindex="-1">
      <button class="contact-modal-close" type="button" data-modal-close aria-label="Close">×</button>
      <p class="eyebrow">AMULET CYCLE 168</p>
      <h2 class="contact-modal-title" id="contact-modal-title"></h2>
      <p class="contact-modal-intro"></p>
      <div class="contact-modal-channels"></div>
      <div class="contact-modal-address"><strong class="contact-modal-address-label"></strong><span class="contact-modal-address-value"></span></div>
    </section>`;
  document.body.append(modal);
  modal
    .querySelectorAll("[data-modal-close]")
    .forEach((control) => control.addEventListener("click", closeContactModal));
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeContactModal();
    if (event.key !== "Tab") return;
    const focusable = [
      ...modal.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ];
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
  return modal;
}

function openContactModal(event) {
  event?.preventDefault?.();
  const source = event?.currentTarget;
  contactModalInquiry = getContactInquiry(source);
  contactModalPreviousFocus = document.activeElement;
  const modal = ensureContactModal();
  renderContactModal();
  modal.hidden = false;
  document.body.classList.add("modal-open");
  modal.querySelector(".contact-modal-close")?.focus();
}

function closeContactModal() {
  const modal = document.getElementById("contact-modal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  contactModalPreviousFocus?.focus?.();
}

async function initializeContactSettings() {
  try {
    const settings = await fetchSiteSettings();
    if (settings)
      currentContacts = {
        ...currentContacts,
        ...settings,
        address: settings.address || currentContacts.address,
      };
  } catch (error) {
    console.error("Contact settings failed:", error);
  }
  applyContactSettings();
}

function setLanguage(language) {
  if (!["en", "th", "zh"].includes(language)) return;
  currentLanguage = language;
  localStorage.setItem("ac168-language", language);
  applyTranslations();
  applyContactSettings();
  populateCategoryFilter(loadedAmulets);
  renderInventory();
  initializeFeatured();
  initializeStories();

  const productContainer = document.getElementById("product-detail");
  if (productContainer) initializeProductDetail();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(priceThb) {
  const locale =
    currentLanguage === "th"
      ? "th-TH"
      : currentLanguage === "zh"
        ? "zh-CN"
        : "en-US";
  return typeof priceThb === "number"
    ? `฿${priceThb.toLocaleString(locale)}`
    : t("product.priceRequest");
}

function getStatusLabel(status) {
  return status ? t(`status.${status}`) : "";
}

function getPrimaryImage(amulet) {
  return (
    amulet.images?.find((image) => image.imageType === "front")?.url ||
    amulet.images?.[0]?.url ||
    ""
  );
}

function getProductUrl(amulet) {
  return `product.html?id=${encodeURIComponent(amulet.inventoryId || "")}`;
}

function setMeta(selector, attribute, value) {
  const element = document.head.querySelector(selector);
  if (element && value) element.setAttribute(attribute, value);
}

function createProductCard(amulet) {
  const name =
    getLocalizedText(amulet.name) || amulet.inventoryId || "Untitled amulet";
  const temple = getLocalizedText(amulet.temple);
  const material = getLocalizedText(amulet.material);
  const category = getLocalizedText(amulet.category);
  const mainImage = getPrimaryImage(amulet);
  const article = document.createElement("article");

  article.className = "product-card";
  article.innerHTML = `
    <a class="product-link" href="${getProductUrl(amulet)}">
      <div class="product-image-wrap">
        ${
          mainImage
            ? `<img class="product-image-real" src="${escapeHtml(mainImage)}" alt="${escapeHtml(name)}" loading="lazy">`
            : '<div class="product-image-placeholder" aria-label="Image not yet available">AMULET</div>'
        }
        ${amulet.newArrival ? '<span class="new-arrival-badge">NEW ARRIVAL</span>' : ""}
      </div>
      <div class="product-card-body">
        <div class="product-card-top">
          <span class="inventory-id">${escapeHtml(amulet.inventoryId)}</span>
          <span class="status-badge status-${escapeHtml(amulet.status)}">${escapeHtml(getStatusLabel(amulet.status))}</span>
        </div>
        <h3 class="product-title">${escapeHtml(name)}</h3>
        ${temple ? `<p class="product-meta">${escapeHtml(temple)}</p>` : ""}
        ${material || amulet.year ? `<p class="product-meta">${escapeHtml([material, amulet.year].filter(Boolean).join(" · "))}</p>` : ""}
        ${category ? `<p class="product-category">${escapeHtml(category)}</p>` : ""}
        <p class="product-price">${escapeHtml(formatPrice(amulet.priceThb))}</p>
      </div>
    </a>`;

  return article;
}

function renderProductCards(container, amulets) {
  container.replaceChildren();
  if (!amulets.length) {
    container.innerHTML = `<p class="inventory-message">${escapeHtml(t("inventory.empty"))}</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  amulets.forEach((amulet) => fragment.appendChild(createProductCard(amulet)));
  container.appendChild(fragment);
}

function renderInventory() {
  const grid = document.getElementById("inventoryGrid");
  if (!grid) return;

  const search = (document.getElementById("inventory-search")?.value || "")
    .trim()
    .toLowerCase();
  const category = document.getElementById("category-filter")?.value || "all";
  const status = document.getElementById("status-filter")?.value || "all";
  const filtered = loadedAmulets.filter((amulet) => {
    const itemCategory = getLocalizedText(amulet.category);
    const searchable = [
      amulet.inventoryId,
      getLocalizedText(amulet.name),
      getLocalizedText(amulet.temple),
      itemCategory,
      getLocalizedText(amulet.material),
      amulet.year,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!search || searchable.includes(search)) &&
      (category === "all" || itemCategory === category) &&
      (status === "all" || amulet.status === status)
    );
  });

  renderProductCards(grid, filtered);
}

function populateCategoryFilter(amulets) {
  const select = document.getElementById("category-filter");
  if (!select) return;

  const categories = [
    ...new Set(
      amulets
        .map((amulet) => getLocalizedText(amulet.category))
        .filter(Boolean),
    ),
  ].sort();
  select.innerHTML = `<option value="all">${escapeHtml(t("inventory.allCategories"))}</option>`;
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
}

async function initializeInventory() {
  const grid = document.getElementById("inventoryGrid");
  if (!grid) return;
  grid.innerHTML = `<p class="inventory-message">${escapeHtml(t("inventory.loading"))}</p>`;

  try {
    loadedAmulets = await fetchAmulets();
    populateCategoryFilter(loadedAmulets);
    renderInventory();
  } catch (error) {
    console.error("Inventory initialization failed:", error);
    grid.innerHTML = `<div class="inventory-message inventory-error"><strong>${escapeHtml(t("inventory.errorTitle"))}</strong><span>${escapeHtml(t("inventory.errorCopy"))}</span></div>`;
  }
}

function createSpec(label, value) {
  if (value === "" || value === undefined || value === null) return "";
  return `<div class="spec"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`;
}

function initializeProductImageViewer(container) {
  const openButton = container.querySelector("[data-open-product-viewer]");
  const dialog = container.querySelector("[data-product-image-viewer]");
  const zoomStage = dialog?.querySelector("[data-product-zoom-stage]");
  const zoomImage = dialog?.querySelector("[data-product-zoom-image]");
  const zoomLevel = dialog?.querySelector("[data-product-zoom-level]");
  if (!openButton || !dialog || !zoomStage || !zoomImage) return null;

  const minimumZoom = 1;
  const maximumZoom = 6;
  let zoom = minimumZoom;
  let panX = 0;
  let panY = 0;
  let dragPointer = null;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let pinchDistance = 0;
  const pointers = new Map();

  const applyTransform = () => {
    zoomImage.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`;
    if (zoomLevel) zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
    const zoomOut = dialog.querySelector("[data-product-zoom-out]");
    const zoomIn = dialog.querySelector("[data-product-zoom-in]");
    if (zoomOut) zoomOut.disabled = zoom <= minimumZoom;
    if (zoomIn) zoomIn.disabled = zoom >= maximumZoom;
    zoomStage.classList.toggle("is-zoomed", zoom > minimumZoom);
  };

  const resetZoom = () => {
    zoom = minimumZoom;
    panX = 0;
    panY = 0;
    applyTransform();
  };

  const setZoom = (nextZoom) => {
    zoom = Math.min(maximumZoom, Math.max(minimumZoom, nextZoom));
    if (zoom === minimumZoom) {
      panX = 0;
      panY = 0;
    }
    applyTransform();
  };

  const openViewer = () => {
    resetZoom();
    dialog.showModal();
    zoomStage.focus();
  };

  openButton.addEventListener("click", openViewer);
  dialog
    .querySelector("[data-product-viewer-close]")
    ?.addEventListener("click", () => dialog.close());
  dialog
    .querySelector("[data-product-zoom-in]")
    ?.addEventListener("click", () => setZoom(zoom + 0.5));
  dialog
    .querySelector("[data-product-zoom-out]")
    ?.addEventListener("click", () => setZoom(zoom - 0.5));
  dialog
    .querySelector("[data-product-zoom-reset]")
    ?.addEventListener("click", resetZoom);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", resetZoom);

  zoomStage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      setZoom(zoom + (event.deltaY < 0 ? 0.35 : -0.35));
    },
    { passive: false },
  );
  zoomStage.addEventListener("dblclick", () => {
    setZoom(zoom > minimumZoom ? minimumZoom : 2.5);
  });
  zoomStage.addEventListener("keydown", (event) => {
    if (event.key === "+" || event.key === "=") setZoom(zoom + 0.5);
    if (event.key === "-") setZoom(zoom - 0.5);
    if (event.key === "0") resetZoom();
  });

  zoomStage.addEventListener("pointerdown", (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    zoomStage.setPointerCapture(event.pointerId);
    dragPointer = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
    }
  });
  zoomStage.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      const nextDistance = Math.hypot(second.x - first.x, second.y - first.y);
      if (pinchDistance) setZoom(zoom * (nextDistance / pinchDistance));
      pinchDistance = nextDistance;
      return;
    }
    if (dragPointer === event.pointerId && zoom > minimumZoom) {
      panX += event.clientX - lastPointerX;
      panY += event.clientY - lastPointerY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      applyTransform();
    }
  });
  const releasePointer = (event) => {
    pointers.delete(event.pointerId);
    if (dragPointer === event.pointerId) dragPointer = null;
    pinchDistance = 0;
  };
  zoomStage.addEventListener("pointerup", releasePointer);
  zoomStage.addEventListener("pointercancel", releasePointer);

  applyTransform();
  return (src, alt) => {
    zoomImage.src = src;
    zoomImage.alt = alt;
    resetZoom();
  };
}

function renderProductDetail(container, amulet) {
  if (!amulet) {
    container.innerHTML = `<div class="product-not-found"><p class="eyebrow">${escapeHtml(t("inventory.kicker"))}</p><h1>${escapeHtml(t("product.notFound"))}</h1><p>${escapeHtml(t("product.notFoundCopy"))}</p><a class="btn gold" href="inventory.html">${escapeHtml(t("product.returnInventory"))}</a></div>`;
    return;
  }

  const name = getLocalizedText(amulet.name) || amulet.inventoryId;
  const description = getLocalizedText(amulet.description);
  const story = getLocalizedText(amulet.story);
  const temple = getLocalizedText(amulet.temple);
  const material = getLocalizedText(amulet.material);
  const category = getLocalizedText(amulet.category);
  const monkMaster = getLocalizedText(amulet.monkMaster);
  const province = getLocalizedText(amulet.province);
  const condition =
    getLocalizedText(amulet.conditionNotes) || amulet.conditionGrade;
  const provenance =
    getLocalizedText(amulet.provenance) || getLocalizedText(amulet.origin);
  const authenticationNotes = getLocalizedText(amulet.authenticationNotes);
  const images = amulet.images || [];
  const primaryImage = getPrimaryImage(amulet);
  const orderedImages = primaryImage
    ? [...images].sort((a, b) =>
        a.url === primaryImage ? -1 : b.url === primaryImage ? 1 : 0,
      )
    : images;
  const inquiryText = `Hello Amulet Cycle 168, I am interested in Inventory ID: ${amulet.inventoryId}. Could you please provide more information?`;
  document.title = `${name} | Amulet Cycle 168`;
  const metaDescription = (
    description ||
    story ||
    `${amulet.inventoryId} from the Amulet Cycle 168 collection`
  ).slice(0, 155);
  setMeta('meta[name="description"]', "content", metaDescription);
  setMeta('meta[property="og:title"]', "content", `${name} | Amulet Cycle 168`);
  setMeta('meta[property="og:description"]', "content", metaDescription);
  setMeta('meta[property="og:image"]', "content", primaryImage);

  container.innerHTML = `
    <div class="product-gallery-shell">
      ${
        primaryImage
          ? `<button class="product-main-image" type="button" data-open-product-viewer aria-label="${escapeHtml(t("product.openZoom"))}">
        <img id="productMainImage" src="${escapeHtml(primaryImage)}" alt="${escapeHtml(name)}" draggable="false">
        <span class="product-zoom-prompt"><span aria-hidden="true">⌕</span>${escapeHtml(t("product.zoomHint"))}</span>
      </button>`
          : '<div class="product-main-image"><div class="product-main-placeholder">IMAGE COMING SOON</div></div>'
      }
      ${
        orderedImages.length > 1
          ? `<div class="product-thumbnails" aria-label="Product images">
        ${orderedImages
          .map((image, index) => {
            const caption =
              getLocalizedText(image.caption) ||
              image.imageType ||
              `Image ${index + 1}`;
            return `<button class="product-thumbnail${index === 0 ? " active" : ""}" type="button" data-image-url="${escapeHtml(image.url)}" data-image-alt="${escapeHtml(caption)}" aria-label="View ${escapeHtml(caption)}"><img src="${escapeHtml(image.url)}" alt=""><span>${escapeHtml(image.imageType || index + 1)}</span></button>`;
          })
          .join("")}
      </div>`
          : ""
      }
      ${
        primaryImage
          ? `<dialog class="product-image-viewer" data-product-image-viewer aria-label="${escapeHtml(t("product.openZoom"))}">
        <div class="product-image-viewer-shell">
          <div class="product-image-viewer-bar">
            <div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(t("product.viewerHelp"))}</small></div>
            <div class="product-zoom-controls">
              <button type="button" data-product-zoom-out aria-label="${escapeHtml(t("product.zoomOut"))}">−</button>
              <output data-product-zoom-level aria-live="polite">100%</output>
              <button type="button" data-product-zoom-in aria-label="${escapeHtml(t("product.zoomIn"))}">+</button>
              <button type="button" data-product-zoom-reset aria-label="${escapeHtml(t("product.resetZoom"))}">1:1</button>
              <button class="product-viewer-close" type="button" data-product-viewer-close aria-label="${escapeHtml(t("product.closeZoom"))}">×</button>
            </div>
          </div>
          <div class="product-image-zoom-stage" data-product-zoom-stage tabindex="0">
            <img data-product-zoom-image src="${escapeHtml(primaryImage)}" alt="${escapeHtml(name)}" draggable="false">
          </div>
        </div>
      </dialog>`
          : ""
      }
    </div>
    <div class="product-info">
      <p class="eyebrow">${escapeHtml(amulet.inventoryId)} · ${escapeHtml(getStatusLabel(amulet.status))}</p>
      <h1>${escapeHtml(name)}</h1>
      <p class="product-detail-price">${escapeHtml(formatPrice(amulet.priceThb))}</p>
      ${description ? `<p class="lead product-description">${escapeHtml(description)}</p>` : ""}
      <div class="specs">
        ${createSpec(t("product.temple"), temple)}${createSpec(t("product.monk"), monkMaster)}${createSpec(t("product.province"), province)}${createSpec(t("product.category"), category)}
        ${createSpec(t("product.year"), amulet.year)}${createSpec(t("product.material"), material)}
        ${createSpec(t("product.width"), amulet.widthMm != null ? `${amulet.widthMm} mm` : "")}
        ${createSpec(t("product.height"), amulet.heightMm != null ? `${amulet.heightMm} mm` : "")}
        ${createSpec(t("product.thickness"), amulet.thicknessMm != null ? `${amulet.thicknessMm} mm` : "")}
        ${createSpec(t("product.weight"), amulet.weightG != null ? `${amulet.weightG} g` : "")}
        ${createSpec(t("product.condition"), condition)}${createSpec(t("product.status"), getStatusLabel(amulet.status))}
      </div>
      ${story ? `<section class="product-story"><p class="eyebrow">${escapeHtml(t("product.story"))}</p><p>${escapeHtml(story)}</p></section>` : ""}
      ${provenance ? `<section class="product-story"><p class="eyebrow">${escapeHtml(t("product.provenance"))}</p><p>${escapeHtml(provenance)}</p></section>` : ""}
      ${authenticationNotes ? `<section class="product-story"><p class="eyebrow">${escapeHtml(t("product.authentication"))}</p><p>${escapeHtml(authenticationNotes)}</p></section>` : ""}
      <div class="product-actions">
        <button class="btn gold" type="button" data-contact-inquiry="${escapeHtml(inquiryText)}" onclick="openContactModal(event)">${escapeHtml(t("product.contactUs"))}</button>
      </div>
      <p class="product-disclaimer">${escapeHtml(t("product.disclaimer"))}</p>
    </div>`;

  const updateProductViewer = initializeProductImageViewer(container);
  container.querySelectorAll(".product-thumbnail").forEach((button) => {
    button.addEventListener("click", () => {
      const mainImage = document.getElementById("productMainImage");
      if (!mainImage) return;
      mainImage.src = button.dataset.imageUrl;
      mainImage.alt = button.dataset.imageAlt;
      updateProductViewer?.(button.dataset.imageUrl, button.dataset.imageAlt);
      container
        .querySelectorAll(".product-thumbnail")
        .forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });
}

async function initializeProductDetail() {
  const container = document.getElementById("product-detail");
  if (!container) return;
  const inventoryId = new URLSearchParams(window.location.search).get("id");
  if (!inventoryId) return renderProductDetail(container, null);

  container.innerHTML = `<p class="inventory-message">${escapeHtml(t("product.loading"))}</p>`;
  try {
    renderProductDetail(container, await fetchAmuletById(inventoryId));
  } catch (error) {
    console.error("Product initialization failed:", error);
    container.innerHTML = `<div class="product-not-found"><p class="eyebrow">${escapeHtml(t("inventory.kicker"))}</p><h1>${escapeHtml(t("product.unavailable"))}</h1><p>${escapeHtml(t("product.unavailableCopy"))}</p><a class="btn gold" href="inventory.html">${escapeHtml(t("product.returnInventory"))}</a></div>`;
  }
}

async function initializeFeatured() {
  const grid = document.getElementById("featured-grid");
  if (!grid) return;
  try {
    const amulets = await fetchAmulets();
    const featured = amulets.filter((amulet) => amulet.featured).slice(0, 4);
    renderProductCards(grid, featured.length ? featured : amulets.slice(0, 4));
  } catch (error) {
    console.error("Featured inventory failed:", error);
    grid.innerHTML =
      '<p class="inventory-message">Featured pieces are temporarily unavailable.</p>';
  }
}

async function initializeStories() {
  const list = document.getElementById("story-list");
  if (!list) return;

  try {
    const amulets = await fetchAmulets();
    const stories = amulets.filter((amulet) => getLocalizedText(amulet.story));

    if (!stories.length) {
      list.innerHTML = `<p class="inventory-message">${escapeHtml(t("story.empty"))}</p>`;
      return;
    }

    list.innerHTML = stories
      .map((amulet) => {
        const name = getLocalizedText(amulet.name);
        const story = getLocalizedText(amulet.story);
        const image = getPrimaryImage(amulet);
        return `<article class="story-entry">
        <a class="story-image" href="${getProductUrl(amulet)}">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy">` : ""}</a>
        <div><p class="eyebrow">${escapeHtml(amulet.inventoryId)}</p><h2>${escapeHtml(name)}</h2><p>${escapeHtml(story)}</p><a class="text-link" href="${getProductUrl(amulet)}">${escapeHtml(t("story.read"))} →</a></div>
      </article>`;
      })
      .join("");
  } catch (error) {
    console.error("Stories failed:", error);
    list.innerHTML = `<p class="inventory-message">${escapeHtml(t("inventory.errorCopy"))}</p>`;
  }
}

function focusSearch() {
  window.location.href = "inventory.html#inventory-search";
}

function subscribe(event) {
  event.preventDefault();
  alert("Thank you. Newsletter connection will be added before launch.");
}

function buildInquiryMessage(form) {
  const data = new FormData(form);
  return [
    "Hello Amulet Cycle 168,",
    data.get("name") ? `Name: ${data.get("name")}` : "",
    data.get("country") ? `Country: ${data.get("country")}` : "",
    data.get("amulet") ? `Inventory ID: ${data.get("amulet")}` : "",
    data.get("message") ? `Question: ${data.get("message")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function copyInquiryForWeChat(event) {
  const form = event.currentTarget.closest("form");
  await copyText(buildInquiryMessage(form));
  alert(`${t("contact.copied")} ${currentContacts.wechatId}`);
}

async function copyWeChatId() {
  await copyText(currentContacts.wechatId);
  alert(`${t("contact.wechatCopied")} ${currentContacts.wechatId}`);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText)
    return navigator.clipboard.writeText(value);
  const helper = document.createElement("textarea");
  helper.value = value;
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

document
  .querySelector(".menu-toggle")
  ?.addEventListener("click", () =>
    document.querySelector(".nav")?.classList.toggle("open"),
  );
document
  .querySelectorAll("[data-language]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      setLanguage(button.dataset.language),
    ),
  );
document
  .querySelectorAll('.nav a[href="contact.html"]')
  .forEach((link) => link.addEventListener("click", openContactModal));
document.addEventListener("DOMContentLoaded", async () => {
  const requestedLanguage = navigator.language?.toLowerCase();
  if (!localStorage.getItem("ac168-language")) {
    currentLanguage = requestedLanguage?.startsWith("th")
      ? "th"
      : requestedLanguage?.startsWith("zh")
        ? "zh"
        : "en";
  }
  applyTranslations();
  initializeHeroSlider();
  await initializeContactSettings();

  const inquiryId = new URLSearchParams(window.location.search).get("amulet");
  const inquiryField = document.querySelector('[name="amulet"]');
  if (inquiryId && inquiryField) inquiryField.value = inquiryId;

  initializeInventory();
  initializeProductDetail();
  initializeFeatured();
  initializeStories();
});
