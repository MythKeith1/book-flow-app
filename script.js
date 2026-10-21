
// ============================================================
// BOOKFLOW — PART 3 OF 3
// Premium appointment-booking application
// Vanilla JavaScript | No frameworks or dependencies
//
// DEMO ONLY:
// - Bookings are stored in this browser using localStorage.
// - Availability checks work only against this browser's data.
// - This is NOT a secure, multi-user reservation backend.
// ============================================================

(() => {
  "use strict";

  // ----------------------------------------------------------
  // 1. CONFIGURATION
  // ----------------------------------------------------------

  const CONFIG = Object.freeze({
    storageKey: "bookflow.demo.bookings.v1",
    schemaVersion: 1,
    currency: "ZAR",
    locale: "en-ZA",
    openingHour: 9,
    closingHour: 18,
    slotInterval: 30,
    minimumNoticeMinutes: 0,
    maximumAdvanceDays: 365,
    maxNameLength: 100,
    maxEmailLength: 254,
    maxPhoneLength: 25,
    maxNotesLength: 500,
    storageEventName: "bookflow:bookings-updated"
  });

  const SERVICES = Object.freeze([
    {
      id: "classic-haircut",
      name: "Classic Haircut",
      category: "Hair",
      description: "A clean, tailored cut finished to your preference.",
      duration: 30,
      price: 180,
      icon: "✂",
      popular: true
    },
    {
      id: "premium-haircut",
      name: "Premium Haircut",
      category: "Hair",
      description: "A detailed cut with a personalised finishing service.",
      duration: 45,
      price: 280,
      icon: "✦",
      popular: false
    },
    {
      id: "beard-grooming",
      name: "Beard Grooming",
      category: "Grooming",
      description: "Precision shaping and a clean, refined finish.",
      duration: 30,
      price: 150,
      icon: "⌁",
      popular: false
    },
    {
      id: "wash-and-style",
      name: "Wash & Style",
      category: "Hair",
      description: "A refreshing wash followed by a professional style.",
      duration: 45,
      price: 220,
      icon: "◈",
      popular: false
    },
    {
      id: "colour-treatment",
      name: "Colour Treatment",
      category: "Hair",
      description: "A colour consultation and salon treatment session.",
      duration: 90,
      price: 650,
      icon: "◉",
      popular: false
    },
    {
      id: "express-facial",
      name: "Express Facial",
      category: "Skincare",
      description: "A refreshing facial focused on cleansing and care.",
      duration: 30,
      price: 250,
      icon: "✧",
      popular: false
    }
  ]);

  const WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];

  const MONTHS = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
  ];

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const byId = (id) => document.getElementById(id);

  const first = (...selectors) => {
    for (const selector of selectors) {
      const element = $(selector);
      if (element) return element;
    }
    return null;
  };

  const firstId = (...ids) => {
    for (const id of ids) {
      const element = byId(id);
      if (element) return element;
    }
    return null;
  };

  const on = (element, event, handler, options) => {
    if (element) element.addEventListener(event, handler, options);
  };

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

  const money = (amount) =>
    new Intl.NumberFormat(CONFIG.locale, {
      style: "currency",
      currency: CONFIG.currency,
      maximumFractionDigits: 2
    }).format(amount);

  const pad = (number) => String(number).padStart(2, "0");

  const localDateKey = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const parseDateKey = (key) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key))) {
      return null;
    }

    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
  };

  const formatDate = (key, options = {}) => {
    const date = parseDateKey(key);
    if (!date) return "Date unavailable";

    return new Intl.DateTimeFormat(CONFIG.locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      ...options
    }).format(date);
  };

  const formatTime = (time) => {
    if (!/^\d{2}:\d{2}$/.test(String(time))) return time;

    const [hours, minutes] = time.split(":").map(Number);

    return new Intl.DateTimeFormat(CONFIG.locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(new Date(2000, 0, 1, hours, minutes));
  };

  const dateTimeValue = (dateKey, time) => {
    const date = parseDateKey(dateKey);
    if (!date || !/^\d{2}:\d{2}$/.test(String(time))) {
      return NaN;
    }

    const [hours, minutes] = time.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  };

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  };

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  const isValidPhone = (phone) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  };

  const createReference = () => {
    const randomPart = () => {
      if (globalThis.crypto?.getRandomValues) {
        const values = new Uint32Array(2);
        globalThis.crypto.getRandomValues(values);
        return Array.from(values, (value) =>
          value.toString(36)
        ).join("").toUpperCase();
      }

      return Math.random().toString(36).slice(2, 12).toUpperCase();
    };

    return `BF-${Date.now().toString(36).toUpperCase()}-${randomPart().slice(0, 6)}`;
  };

  // ----------------------------------------------------------
  // 2. DOM ELEMENTS
  //
  // If your HTML uses different IDs, update these aliases.
  // The script also recognises common data-* attributes.
  // ----------------------------------------------------------

  const DOM = {
    serviceList: first(
      "#service-list", "#services-grid", "#serviceGrid",
      "#service-cards", "[data-service-list]"
    ),

    calendar: first(
      "#calendar", "#calendar-grid", "#calendarGrid",
      "[data-calendar]"
    ),

    calendarTitle: first(
      "#calendar-title", "#calendarTitle",
      "[data-calendar-title]"
    ),

    timeSlots: first(
      "#time-slots", "#timeSlots", "#time-slots-grid",
      "[data-time-slots]"
    ),

    bookingForm: first(
      "#booking-form", "#bookingForm", "form[data-booking-form]"
    ),

    name: firstId("customer-name", "customerName", "full-name", "name"),
    email: firstId("customer-email", "customerEmail", "email"),
    phone: firstId("customer-phone", "customerPhone", "phone"),
    notes: firstId("customer-notes", "customerNotes", "notes"),

    selectedDate: firstId("selected-date", "selectedDate"),
    selectedTime: firstId("selected-time", "selectedTime"),

    price: first(
      "#total-price", "#booking-price", "#summary-price",
      "[data-total-price]"
    ),

    duration: first(
      "#total-duration", "#booking-duration", "#summary-duration",
      "[data-total-duration]"
    ),

    summaryServices: first(
      "#summary-services", "#booking-summary-services",
      "[data-summary-services]"
    ),

    summaryDate: first(
      "#summary-date", "#booking-summary-date",
      "[data-summary-date]"
    ),

    summaryTime: first(
      "#summary-time", "#booking-summary-time",
      "[data-summary-time]"
    ),

    summaryName: first(
      "#summary-name", "#booking-summary-name",
      "[data-summary-name]"
    ),

    summaryEmail: first(
      "#summary-email", "#booking-summary-email",
      "[data-summary-email]"
    ),

    summaryPhone: first(
      "#summary-phone", "#booking-summary-phone",
      "[data-summary-phone]"
    ),

    summaryNotes: first(
      "#summary-notes", "#booking-summary-notes",
      "[data-summary-notes]"
    ),

    reviewTotal: first(
      "#review-total", "#review-price", "[data-review-total]"
    ),

    confirmation: first(
      "#confirmation-screen", "#confirmationScreen",
      "[data-confirmation-screen]"
    ),

    confirmationReference: first(
      "#confirmation-reference", "#booking-reference",
      "[data-booking-reference]"
    ),

    confirmationMessage: first(
      "#confirmation-message", "[data-confirmation-message]"
    ),

    bookingList: first(
      "#booking-list", "#bookings-list", "#bookingList",
      "[data-booking-list]"
    ),

    bookingSearch: first(
      "#booking-search", "#bookingSearch", "[data-booking-search]"
    ),

    bookingFilter: first(
      "#booking-filter", "#bookingFilter", "[data-booking-filter]"
    ),

    modal: first(
      "#booking-modal", "#confirmation-modal", "#modal",
      "[data-modal]"
    ),

    modalTitle: first(
      "#modal-title", "[data-modal-title]"
    ),

    modalMessage: first(
      "#modal-message", "[data-modal-message]"
    ),

    toastRegion: first(
      "#toast-region", "#toast-container", "#toastContainer",
      "[data-toast-region]"
    ),

    navToggle: first(
      "#menu-toggle", "#nav-toggle", "#mobile-menu-toggle",
      "[data-menu-toggle]"
    ),

    nav: first(
      "#primary-navigation", "#main-nav", "#nav-menu",
      "[data-navigation]"
    ),

    currentYear: first(
      "#current-year", "#currentYear", "[data-current-year]"
    )
  };

  const findAll = (...selectors) => {
    const found = new Set();

    for (const selector of selectors) {
      $$(selector).forEach((element) => found.add(element));
    }

    return Array.from(found);
  };

  const nextButtons = findAll(
    "[data-next-step]", ".next-step", "#next-step", "#nextStep"
  );

  const backButtons = findAll(
    "[data-prev-step]", ".prev-step", "#prev-step", "#prevStep"
  );

  const stepPanels = findAll(
    "[data-step-panel]", ".wizard-step", ".form-step"
  );

  const stepIndicators = findAll(
    "[data-step-indicator]", ".step-indicator"
  );

  const prevMonthButtons = findAll(
    "[data-calendar-prev]", "#prev-month", "#prevMonth"
  );

  const nextMonthButtons = findAll(
    "[data-calendar-next]", "#next-month", "#nextMonth"
  );

  // ----------------------------------------------------------
  // 3. APPLICATION STATE
  // ----------------------------------------------------------

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const state = {
    step: 1,
    selectedServices: new Set(),
    selectedDate: "",
    selectedTime: "",
    calendarMonth: new Date(today.getFullYear(), today.getMonth(), 1),
    bookings: [],
    lastBooking: null,
    pendingCancellation: null,
    storageAvailable: true,
    modalPreviousFocus: null
  };

  // ----------------------------------------------------------
  // 4. TOAST NOTIFICATIONS
  // ----------------------------------------------------------

  let toastTimer = null;

  function toast(message, type = "info", duration = 3500) {
    let region = DOM.toastRegion;

    if (!region) {
      region = makeElement("div", "toast-region");
      region.id = "toast-region";
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      region.setAttribute("aria-atomic", "true");
      document.body.appendChild(region);
      DOM.toastRegion = region;
    }

    const item = makeElement("div", `toast toast--${type}`);
    item.setAttribute("role", type === "error" ? "alert" : "status");

    const messageElement = makeElement("span", "toast__message", message);
    const close = makeElement("button", "toast__close", "×");

    close.type = "button";
    close.setAttribute("aria-label", "Dismiss notification");

    close.addEventListener("click", () => item.remove());

    item.append(messageElement, close);
    region.appendChild(item);

    window.clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      item.remove();
    }, duration);
  }

  // ----------------------------------------------------------
  // 5. SAFE LOCAL STORAGE
  // ----------------------------------------------------------

  function readBookings() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);

      if (raw === null) return [];

      const parsed = JSON.parse(raw);

      if (
        !parsed ||
        parsed.schemaVersion !== CONFIG.schemaVersion ||
        !Array.isArray(parsed.bookings)
      ) {
        throw new Error("Unsupported booking data format.");
      }

      return parsed.bookings.filter(isValidStoredBooking);
    } catch (error) {
      state.storageAvailable = false;

      console.warn("BOOKFLOW could not read saved bookings.", error);

      toast(
        "Saved demo bookings could not be loaded. Check browser storage settings.",
        "error",
        6000
      );

      return [];
    }
  }

  function isValidStoredBooking(booking) {
    if (!booking || typeof booking !== "object") return false;

    return (
      typeof booking.id === "string" &&
      typeof booking.date === "string" &&
      Boolean(parseDateKey(booking.date)) &&
      typeof booking.time === "string" &&
      /^\d{2}:\d{2}$/.test(booking.time) &&
      ["confirmed", "cancelled"].includes(booking.status) &&
      Array.isArray(booking.services) &&
      booking.services.length > 0 &&
      typeof booking.customer === "object" &&
      typeof booking.customer.name === "string" &&
      Number.isFinite(booking.total)
    );
  }

  function writeBookings(bookings) {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify({
          schemaVersion: CONFIG.schemaVersion,
          savedAt: new Date().toISOString(),
          bookings
        })
      );

      state.storageAvailable = true;
      return true;
    } catch (error) {
      state.storageAvailable = false;

      console.error("BOOKFLOW could not save bookings.", error);

      toast(
        "Your changes could not be saved. Browser storage may be full or blocked.",
        "error",
        6000
      );

      return false;
    }
  }

  function persistBookings() {
    if (!writeBookings(state.bookings)) return false;

    window.dispatchEvent(new CustomEvent(CONFIG.storageEventName, {
      detail: { bookings: state.bookings }
    }));

    return true;
  }

  function reloadBookings() {
    state.bookings = readBookings();
    renderBookingManagement();
    renderCalendar();
    renderTimeSlots();
  }

  // ----------------------------------------------------------
  // 6. SERVICE SELECTION AND DYNAMIC PRICING
  // ----------------------------------------------------------

  function getSelectedServices() {
    return SERVICES.filter((service) =>
      state.selectedServices.has(service.id)
    );
  }

  function getTotals() {
    const services = getSelectedServices();

    return {
      services,
      price: services.reduce((sum, service) => sum + service.price, 0),
      duration: services.reduce((sum, service) => sum + service.duration, 0)
    };
  }

  function renderServices() {
    if (!DOM.serviceList) {
      console.warn("BOOKFLOW: service-list container not found.");
      return;
    }

    const fragment = document.createDocumentFragment();

    SERVICES.forEach((service) => {
      const selected = state.selectedServices.has(service.id);

      const card = makeElement(
        "article",
        `service-card${selected ? " is-selected" : ""}`
      );

      card.dataset.serviceId = service.id;

      const button = makeElement("button", "service-card__select");
      button.type = "button";
      button.dataset.selectService = service.id;
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute(
        "aria-label",
        `${selected ? "Remove" : "Select"} ${service.name}`
      );

      const icon = makeElement("span", "service-card__icon", service.icon);
      icon.setAttribute("aria-hidden", "true");

      const content = makeElement("div", "service-card__content");
      const name = makeElement("h3", "service-card__name", service.name);
      const description = makeElement(
        "p",
        "service-card__description",
        service.description
      );

      const meta = makeElement("div", "service-card__meta");
      const duration = makeElement(
        "span",
        "service-card__duration",
        `${service.duration} min`
      );

      const price = makeElement(
        "strong",
        "service-card__price",
        money(service.price)
      );

      const status = makeElement(
        "span",
        "service-card__status",
        selected ? "Selected" : "Select service"
      );

      content.append(name, description, meta);
      meta.append(duration, price);
      button.append(icon, content, status);

      if (service.popular) {
        const badge = makeElement(
          "span",
          "service-card__badge",
          "Popular"
        );
        badge.setAttribute("aria-label", "Popular service");
        card.appendChild(badge);
      }

      card.appendChild(button);
      fragment.appendChild(card);
    });

    DOM.serviceList.replaceChildren(fragment);
    updateTotals();
  }

  function updateTotals() {
    const totals = getTotals();

    if (DOM.price) DOM.price.textContent = money(totals.price);

    if (DOM.duration) {
      DOM.duration.textContent = `${totals.duration} min`;
    }

    if (DOM.reviewTotal) {
      DOM.reviewTotal.textContent = money(totals.price);
    }

    if (DOM.summaryServices) {
      if (totals.services.length === 0) {
        DOM.summaryServices.textContent = "No services selected";
      } else {
        const fragment = document.createDocumentFragment();

        totals.services.forEach((service) => {
          const row = makeElement("div", "summary-service");
          const name = makeElement(
            "span",
            "summary-service__name",
            service.name
          );

          const price = makeElement(
            "span",
            "summary-service__price",
            money(service.price)
          );

          row.append(name, price);
          fragment.appendChild(row);
        });

        DOM.summaryServices.replaceChildren(fragment);
      }
    }

    return totals;
  }

  function selectService(serviceId) {
    const service = SERVICES.find((item) => item.id === serviceId);

    if (!service) return;

    if (state.selectedServices.has(serviceId)) {
      state.selectedServices.delete(serviceId);
    } else {
      state.selectedServices.add(serviceId);
    }

    renderServices();
    renderCalendar();
    renderTimeSlots();
  }

  // ----------------------------------------------------------
  // 7. CALENDAR
  // Monday-first layout, local dates, no past-date selection.
  // ----------------------------------------------------------

  function isDateAllowed(date) {
    const candidate = new Date(date);
    candidate.setHours(0, 0, 0, 0);

    const maximum = new Date(today);
    maximum.setDate(maximum.getDate() + CONFIG.maximumAdvanceDays);

    return candidate >= today && candidate <= maximum;
  }

  function getMondayFirstIndex(date) {
    return (date.getDay() + 6) % 7;
  }

  function changeCalendarMonth(offset) {
    state.calendarMonth = new Date(
      state.calendarMonth.getFullYear(),
      state.calendarMonth.getMonth() + offset,
      1
    );

    renderCalendar();
  }

  function renderCalendar() {
    if (!DOM.calendar) return;

    if (DOM.calendarTitle) {
      DOM.calendarTitle.textContent =
        `${MONTHS[state.calendarMonth.getMonth()]} ${state.calendarMonth.getFullYear()}`;
    }

    const year = state.calendarMonth.getFullYear();
    const month = state.calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const offset = getMondayFirstIndex(firstDay);
    const totalCells = Math.ceil((offset + lastDay.getDate()) / 7) * 7;

    const fragment = document.createDocumentFragment();

    WEEKDAYS.forEach((weekday) => {
      const heading = makeElement("span", "calendar__weekday", weekday.slice(0, 3));
      heading.setAttribute("aria-label", weekday);
      fragment.appendChild(heading);
    });

    for (let index = 0; index < totalCells; index += 1) {
      const dayNumber = index - offset + 1;

      if (dayNumber < 1 || dayNumber > lastDay.getDate()) {
        fragment.appendChild(makeElement("span", "calendar__empty"));
        continue;
      }

      const date = new Date(year, month, dayNumber);
      const key = localDateKey(date);
      const isPast = date < today;
      const allowed = isDateAllowed(date);
      const selected = state.selectedDate === key;
      const isToday = key === localDateKey(today);

      const button = makeElement("button", "calendar__day", String(dayNumber));

      button.type = "button";
      button.dataset.date = key;
      button.disabled = !allowed;

      button.classList.toggle("is-selected", selected);
      button.classList.toggle("is-today", isToday);
      button.classList.toggle("is-past", isPast);

      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute(
        "aria-label",
        formatDate(key, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      );

      if (selected) button.setAttribute("aria-current", "date");

      fragment.appendChild(button);
    }

    DOM.calendar.replaceChildren(fragment);

    prevMonthButtons.forEach((button) => {
      const previous = new Date(year, month - 1, 1);
      const minimumMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      button.disabled = previous < minimumMonth;
    });

    nextMonthButtons.forEach((button) => {
      const next = new Date(year, month + 1, 1);
      const maximumDate = new Date(today);
      maximumDate.setDate(maximumDate.getDate() + CONFIG.maximumAdvanceDays);

      button.disabled =
        next > new Date(maximumDate.getFullYear(), maximumDate.getMonth(), 1);
    });

    updateSelectedDateText();
  }

  function updateSelectedDateText() {
    const text = state.selectedDate
      ? formatDate(state.selectedDate)
      : "Choose a date";

    if (DOM.selectedDate) DOM.selectedDate.textContent = text;
    if (DOM.summaryDate) DOM.summaryDate.textContent = text;
  }

  function selectDate(dateKey) {
    const date = parseDateKey(dateKey);

    if (!date || !isDateAllowed(date)) {
      toast("Please choose a valid future date.", "error");
      return;
    }

    state.selectedDate = dateKey;
    state.selectedTime = "";

    state.calendarMonth = new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    );

    renderCalendar();
    renderTimeSlots();
    updateSelectedDateText();
    updateSelectedTimeText();
  }

  // ----------------------------------------------------------
  // 8. TIME SLOTS AND COLLISION PREVENTION
  //
  // A slot conflicts if its interval overlaps an existing active
  // booking. This is only a local-demo check, not server locking.
  // ----------------------------------------------------------

  function hasTimeConflict(dateKey, startTime, duration, excludeId = null) {
    const start = dateTimeValue(dateKey, startTime);
    const end = start + duration * 60000;

    return state.bookings.some((booking) => {
      if (
        booking.status !== "confirmed" ||
        booking.date !== dateKey ||
        booking.id === excludeId
      ) {
        return false;
      }

      const otherStart = dateTimeValue(booking.date, booking.time);
      const otherEnd = otherStart + Number(booking.duration) * 60000;

      return start < otherEnd && end > otherStart;
    });
  }

  function isSlotInPast(dateKey, time) {
    const start = dateTimeValue(dateKey, time);

    return start < Date.now() + CONFIG.minimumNoticeMinutes * 60000;
  }

  function getTimeSlotList() {
    const totals = getTotals();
    const slots = [];

    if (!state.selectedDate || totals.duration === 0) return slots;

    const date = parseDateKey(state.selectedDate);
    if (!date || !isDateAllowed(date)) return slots;

    const startMinutes = CONFIG.openingHour * 60;
    const closingMinutes = CONFIG.closingHour * 60;

    for (
      let minutes = startMinutes;
      minutes + totals.duration <= closingMinutes;
      minutes += CONFIG.slotInterval
    ) {
      const time = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

      const disabled =
        isSlotInPast(state.selectedDate, time) ||
        hasTimeConflict(state.selectedDate, time, totals.duration);

      slots.push({ time, disabled });
    }

    return slots;
  }

  function renderTimeSlots() {
    if (!DOM.timeSlots) return;

    if (!state.selectedDate) {
      DOM.timeSlots.replaceChildren(
        makeElement("p", "time-slots__empty", "Choose a date to see available times.")
      );
      return;
    }

    if (getTotals().duration === 0) {
      DOM.timeSlots.replaceChildren(
        makeElement("p", "time-slots__empty", "Choose a service first.")
      );
      return;
    }

    const slots = getTimeSlotList();

    if (slots.length === 0 || slots.every((slot) => slot.disabled)) {
      DOM.timeSlots.replaceChildren(
        makeElement("p", "time-slots__empty", "No available times. Try another date.")
      );
      return;
    }

    const fragment = document.createDocumentFragment();

    slots.forEach(({ time, disabled }) => {
      const selected = state.selectedTime === time;

      const button = makeElement(
        "button",
        `time-slot${selected ? " is-selected" : ""}`,
        formatTime(time)
      );

      button.type = "button";
      button.dataset.time = time;
      button.disabled = disabled;
      button.setAttribute("aria-pressed", String(selected));

      if (disabled) {
        button.classList.add("is-unavailable");
        button.setAttribute("aria-label", `${formatTime(time)} unavailable`);
      }

      fragment.appendChild(button);
    });

    DOM.timeSlots.replaceChildren(fragment);
  }

  function selectTime(time) {
    const slot = getTimeSlotList().find((item) => item.time === time);

    if (!slot || slot.disabled) {
      toast("That time is no longer available. Please choose another.", "error");
      renderTimeSlots();
      return;
    }

    state.selectedTime = time;

    renderTimeSlots();
    updateSelectedTimeText();
  }

  function updateSelectedTimeText() {
    const text = state.selectedTime
      ? formatTime(state.selectedTime)
      : "Choose a time";

    if (DOM.selectedTime) DOM.selectedTime.textContent = text;
    if (DOM.summaryTime) DOM.summaryTime.textContent = text;
  }

  // ----------------------------------------------------------
  // 9. WIZARD NAVIGATION
  // Four steps: services, schedule, details, review.
  // ----------------------------------------------------------

  function setStep(step) {
    const target = Math.max(1, Math.min(4, Number(step)));

    state.step = target;

    stepPanels.forEach((panel) => {
      const panelStep = Number(
        panel.dataset.stepPanel ||
        panel.dataset.step ||
        panel.dataset.formStep ||
        panel.getAttribute("data-step")
      );

      const active = panelStep === target;

      panel.hidden = !active;
      panel.classList.toggle("is-active", active);

      if (active) {
        panel.removeAttribute("aria-hidden");
      } else {
        panel.setAttribute("aria-hidden", "true");
      }
    });

    stepIndicators.forEach((indicator) => {
      const indicatorStep = Number(
        indicator.dataset.stepIndicator ||
        indicator.dataset.step ||
        indicator.getAttribute("data-step")
      );

      indicator.classList.toggle("is-active", indicatorStep === target);
      indicator.classList.toggle("is-complete", indicatorStep < target);

      if (indicatorStep === target) {
        indicator.setAttribute("aria-current", "step");
      } else {
        indicator.removeAttribute("aria-current");
      }
    });

    document.dispatchEvent(new CustomEvent("bookflow:stepchange", {
      detail: { step: target }
    }));
  }

  function getStepFromElement(element) {
    return Number(
      element.dataset.nextStep ||
      element.dataset.prevStep ||
      element.dataset.stepTarget ||
      0
    );
  }

  function goNext() {
    if (!validateStep(state.step)) return;

    if (state.step === 3) {
      renderReview();
    }

    if (state.step < 4) {
      setStep(state.step + 1);
    }
  }

  function goBack() {
    if (state.step > 1) setStep(state.step - 1);
  }

  // ----------------------------------------------------------
  // 10. CUSTOMER VALIDATION
  // ----------------------------------------------------------

  function setFieldError(field, message) {
    if (!field) return;

    field.setAttribute("aria-invalid", message ? "true" : "false");

    const errorId = `${field.id || field.name || "field"}-error`;
    let errorElement = byId(errorId);

    if (message) {
      if (!errorElement) {
        errorElement = makeElement("p", "field-error");
        errorElement.id = errorId;
        errorElement.setAttribute("role", "alert");

        field.insertAdjacentElement("afterend", errorElement);
      }

      errorElement.textContent = message;
      field.setAttribute("aria-describedby", errorId);
    } else if (errorElement) {
      errorElement.remove();
      field.removeAttribute("aria-describedby");
    }
  }

  function validateField(field, validator, message) {
    if (!field) return true;

    const value = String(field.value ?? "").trim();
    const valid = validator(value);

    setFieldError(field, valid ? "" : message);
    return valid;
  }

  function validateCustomer() {
    let valid = true;

    valid = validateField(
      DOM.name,
      (value) => value.length >= 2 && value.length <= CONFIG.maxNameLength,
      "Enter your name (at least 2 characters)."
    ) && valid;

    valid = validateField(
      DOM.email,
      (value) => value.length <= CONFIG.maxEmailLength && isValidEmail(value),
      "Enter a valid email address."
    ) && valid;

    valid = validateField(
      DOM.phone,
      (value) => value.length <= CONFIG.maxPhoneLength && isValidPhone(value),
      "Enter a valid phone number."
    ) && valid;

    if (DOM.notes) {
      valid = validateField(
        DOM.notes,
        (value) => value.length <= CONFIG.maxNotesLength,
        `Notes must be ${CONFIG.maxNotesLength} characters or fewer.`
      ) && valid;
    }

    const consent = first(
      "#privacy-consent", "#privacyConsent",
      'input[name="privacy-consent"]',
      'input[name="consent"]'
    );

    if (consent && !consent.checked) {
      setFieldError(consent, "Please confirm that you understand this demo.");
      valid = false;
    } else if (consent) {
      setFieldError(consent, "");
    }

    return valid;
  }

  function validateStep(step) {
    if (step === 1) {
      if (state.selectedServices.size === 0) {
        toast("Select at least one service to continue.", "error");

        DOM.serviceList?.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "center"
        });

        return false;
      }

      return true;
    }

    if (step === 2) {
      if (!state.selectedDate) {
        toast("Choose an appointment date.", "error");
        DOM.calendar?.focus?.();
        return false;
      }

      if (!state.selectedTime) {
        toast("Choose an available time slot.", "error");
        DOM.timeSlots?.focus?.();
        return false;
      }

      const totals = getTotals();

      if (
        hasTimeConflict(
          state.selectedDate,
          state.selectedTime,
          totals.duration
        ) ||
        isSlotInPast(state.selectedDate, state.selectedTime)
      ) {
        state.selectedTime = "";
        renderTimeSlots();
        updateSelectedTimeText();

        toast("That appointment slot is no longer available.", "error");
        return false;
      }

      return true;
    }

    if (step === 3) {
      return validateCustomer();
    }

    if (step === 4) {
      return state.selectedServices.size > 0 &&
        Boolean(state.selectedDate) &&
        Boolean(state.selectedTime) &&
        validateCustomer();
    }

    return true;
  }

  function getCustomer() {
    return {
      name: String(DOM.name?.value ?? "").trim(),
      email: String(DOM.email?.value ?? "").trim(),
      phone: String(DOM.phone?.value ?? "").trim(),
      notes: String(DOM.notes?.value ?? "").trim()
    };
  }

  // ----------------------------------------------------------
  // 11. REVIEW SCREEN
  // ----------------------------------------------------------

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function renderReview() {
    const totals = getTotals();
    const customer = getCustomer();

    setText(DOM.summaryDate, formatDate(state.selectedDate));
    setText(DOM.summaryTime, formatTime(state.selectedTime));
    setText(DOM.summaryName, customer.name);
    setText(DOM.summaryEmail, customer.email);
    setText(DOM.summaryPhone, customer.phone);
    setText(DOM.summaryNotes, customer.notes || "No additional notes");
    setText(DOM.reviewTotal, money(totals.price));
    updateTotals();

    const totalDuration = DOM.duration;

    if (totalDuration) {
      totalDuration.textContent = `${totals.duration} min`;
    }
  }

  // ----------------------------------------------------------
  // 12. BOOKING CREATION AND CONFIRMATION
  // ----------------------------------------------------------

  function createBooking() {
    if (!validateStep(4)) return null;

    const totals = getTotals();

    if (
      hasTimeConflict(
        state.selectedDate,
        state.selectedTime,
        totals.duration
      )
    ) {
      toast("This appointment conflicts with another demo booking.", "error");
      renderTimeSlots();
      setStep(2);
      return null;
    }

    const booking = {
      id: createReference(),
      schemaVersion: CONFIG.schemaVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "confirmed",
      demo: true,
      date: state.selectedDate,
      time: state.selectedTime,
      duration: totals.duration,
      total: totals.price,
      services: totals.services.map((service) => ({
        id: service.id,
        name: service.name,
        duration: service.duration,
        price: service.price
      })),
      customer: getCustomer()
    };

    const previousBookings = state.bookings.slice();
    state.bookings.push(booking);

    if (!persistBookings()) {
      state.bookings = previousBookings;
      return null;
    }

    state.lastBooking = booking;

    showConfirmation(booking);
    renderBookingManagement();
    renderCalendar();
    renderTimeSlots();

    return booking;
  }

  function showConfirmation(booking) {
    stepPanels.forEach((panel) => {
      panel.hidden = true;
      panel.setAttribute("aria-hidden", "true");
    });

    if (DOM.confirmation) {
      DOM.confirmation.hidden = false;
      DOM.confirmation.classList.add("is-active");
      DOM.confirmation.removeAttribute("aria-hidden");
    }

    setText(DOM.confirmationReference, booking.id);

    setText(
      DOM.confirmationMessage,
      `Demo booking saved for ${formatDate(booking.date)} at ${formatTime(booking.time)}.`
    );

    setStep(4);

    DOM.confirmation?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start"
    });

    toast("Demo booking created successfully.", "success");
  }

  function copyReference(reference) {
    if (!reference) {
      toast("There is no booking reference to copy.", "error");
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(reference)
        .then(() => toast("Booking reference copied.", "success"))
        .catch(() => fallbackCopy(reference));
    } else {
      fallbackCopy(reference);
    }
  }

  function fallbackCopy(value) {
    const input = makeElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";

    document.body.appendChild(input);
    input.select();

    let copied = false;

    try {
      copied = document.execCommand("copy");
    } catch (error) {
      console.warn("Clipboard fallback failed.", error);
    }

    input.remove();

    toast(
      copied ? "Booking reference copied." : `Reference: ${value}`,
      copied ? "success" : "info"
    );
  }

  // ----------------------------------------------------------
  // 13. BOOKING MANAGEMENT
  // Search, status filtering, cancellation and empty states.
  // ----------------------------------------------------------

  function getFilteredBookings() {
    const query = String(DOM.bookingSearch?.value ?? "")
      .trim()
      .toLowerCase();

    const filter = String(DOM.bookingFilter?.value ?? "all");

    return state.bookings
      .filter((booking) => {
        if (filter !== "all" && booking.status !== filter) return false;

        const searchable = [
          booking.id,
          booking.customer?.name,
          booking.customer?.email,
          booking.customer?.phone,
          booking.date,
          booking.time,
          ...(booking.services || []).map((service) => service.name)
        ].join(" ").toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => {
        const firstDate = dateTimeValue(a.date, a.time);
        const secondDate = dateTimeValue(b.date, b.time);
        return firstDate - secondDate;
      });
  }

  function renderBookingManagement() {
    if (!DOM.bookingList) return;

    const bookings = getFilteredBookings();

    if (bookings.length === 0) {
      const empty = makeElement("div", "booking-empty");
      const heading = makeElement("h3", "", "No bookings found");
      const message = makeElement(
        "p",
        "",
        state.bookings.length
          ? "Try another search or filter."
          : "Your demo bookings will appear here."
      );

      empty.append(heading, message);
      DOM.bookingList.replaceChildren(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    bookings.forEach((booking) => {
      const card = makeElement("article", "booking-card");
      card.dataset.bookingId = booking.id;

      const header = makeElement("div", "booking-card__header");
      const title = makeElement(
        "h3",
        "booking-card__reference",
        booking.id
      );

      const status = makeElement(
        "span",
        `booking-status booking-status--${booking.status}`,
        booking.status === "confirmed" ? "Confirmed · Demo" : "Cancelled"
      );

      header.append(title, status);

      const customer = makeElement(
        "p",
        "booking-card__customer",
        booking.customer.name
      );

      const date = makeElement(
        "p",
        "booking-card__date",
        `${formatDate(booking.date)} · ${formatTime(booking.time)}`
      );

      const serviceNames = booking.services
        .map((service) => service.name)
        .join(", ");

      const services = makeElement(
        "p",
        "booking-card__services",
        serviceNames
      );

      const details = makeElement("div", "booking-card__details");
      details.append(customer, date, services);

      const footer = makeElement("div", "booking-card__footer");
      const total = makeElement(
        "strong",
        "booking-card__total",
        money(booking.total)
      );

      footer.appendChild(total);

      const actions = makeElement("div", "booking-card__actions");

      const copyButton = makeElement("button", "button button--secondary", "Copy reference");
      copyButton.type = "button";
      copyButton.dataset.copyReference = booking.id;

      actions.appendChild(copyButton);

      if (booking.status === "confirmed") {
        const cancelButton = makeElement(
          "button",
          "button button--danger",
          "Cancel booking"
        );

        cancelButton.type = "button";
        cancelButton.dataset.cancelBooking = booking.id;
        actions.appendChild(cancelButton);
      }

      footer.appendChild(actions);
      card.append(header, details, footer);
      fragment.appendChild(card);
    });

    DOM.bookingList.replaceChildren(fragment);
  }

  // ----------------------------------------------------------
  // 14. ACCESSIBLE MODAL
  // ----------------------------------------------------------

  function openModal({ title, message, confirmLabel, onConfirm }) {
    if (!DOM.modal) {
      const accepted = window.confirm(message);

      if (accepted && typeof onConfirm === "function") onConfirm();
      return;
    }

    state.modalPreviousFocus = document.activeElement;

    setText(DOM.modalTitle, title);
    setText(DOM.modalMessage, message);

    const confirmButton = first(
      "[data-modal-confirm]", "#modal-confirm", "#confirm-modal"
    );

    const cancelButton = first(
      "[data-modal-cancel]", "#modal-cancel", "#close-modal"
    );

    if (confirmButton) {
      confirmButton.textContent = confirmLabel || "Confirm";
      confirmButton.onclick = () => {
        closeModal();

        if (typeof onConfirm === "function") onConfirm();
      };
    }

    if (cancelButton) {
      cancelButton.onclick = closeModal;
    }

    DOM.modal.hidden = false;
    DOM.modal.classList.add("is-open");
    DOM.modal.setAttribute("aria-hidden", "false");

    if (DOM.modal.tagName !== "DIALOG") {
      DOM.modal.setAttribute("role", "dialog");
      DOM.modal.setAttribute("aria-modal", "true");
    }

    (cancelButton || confirmButton || DOM.modal).focus?.();
  }

  function closeModal() {
    if (!DOM.modal) return;

    DOM.modal.hidden = true;
    DOM.modal.classList.remove("is-open");
    DOM.modal.setAttribute("aria-hidden", "true");

    if (state.modalPreviousFocus?.isConnected) {
      state.modalPreviousFocus.focus();
    }
  }

  function cancelBooking(bookingId) {
    const booking = state.bookings.find((item) => item.id === bookingId);

    if (!booking || booking.status !== "confirmed") {
      toast("This booking is already cancelled or no longer exists.", "error");
      return;
    }

    openModal({
      title: "Cancel demo booking?",
      message: `Cancel ${booking.id} for ${booking.customer.name}? This only changes this browser's demo data.`,
      confirmLabel: "Cancel booking",
      onConfirm: () => {
        const previousBookings = state.bookings.slice();

        state.bookings = state.bookings.map((item) =>
          item.id === bookingId
            ? {
                ...item,
                status: "cancelled",
                updatedAt: new Date().toISOString()
              }
            : item
        );

        if (!persistBookings()) {
          state.bookings = previousBookings;
          return;
        }

        renderBookingManagement();
        renderCalendar();
        renderTimeSlots();

        toast("Demo booking cancelled.", "success");
      }
    });
  }

  // ----------------------------------------------------------
  // 15. RESET AND NEW BOOKING
  // ----------------------------------------------------------

  function resetBookingForm() {
    state.step = 1;
    state.selectedServices.clear();
    state.selectedDate = "";
    state.selectedTime = "";
    state.lastBooking = null;

    if (DOM.bookingForm) DOM.bookingForm.reset();

    if (DOM.confirmation) {
      DOM.confirmation.hidden = true;
      DOM.confirmation.classList.remove("is-active");
      DOM.confirmation.setAttribute("aria-hidden", "true");
    }

    [DOM.name, DOM.email, DOM.phone, DOM.notes].forEach((field) => {
      if (field) setFieldError(field, "");
    });

    renderServices();
    renderCalendar();
    renderTimeSlots();
    updateSelectedDateText();
    updateSelectedTimeText();
    setStep(1);

    const firstPanel = stepPanels.find((panel) => {
      const value = Number(
        panel.dataset.stepPanel ||
        panel.dataset.step ||
        panel.dataset.formStep
      );

      return value === 1;
    });

    firstPanel?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start"
    });
  }

  // ----------------------------------------------------------
  // 16. MOBILE NAVIGATION
  // ----------------------------------------------------------

  function closeNavigation() {
    if (!DOM.navToggle || !DOM.nav) return;

    DOM.navToggle.setAttribute("aria-expanded", "false");
    DOM.nav.classList.remove("is-open");
    DOM.nav.classList.remove("active");
  }

  function toggleNavigation() {
    if (!DOM.navToggle || !DOM.nav) return;

    const expanded = DOM.navToggle.getAttribute("aria-expanded") === "true";

    DOM.navToggle.setAttribute("aria-expanded", String(!expanded));
    DOM.nav.classList.toggle("is-open", !expanded);
    DOM.nav.classList.toggle("active", !expanded);
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  // ----------------------------------------------------------
  // 17. EVENT HANDLERS
  // ----------------------------------------------------------

  function bindEvents() {
    on(DOM.serviceList, "click", (event) => {
      const button = event.target.closest("[data-select-service]");
      if (!button) return;

      selectService(button.dataset.selectService);
    });

    on(DOM.calendar, "click", (event) => {
      const button = event.target.closest("[data-date]");
      if (!button || button.disabled) return;

      selectDate(button.dataset.date);
    });

    prevMonthButtons.forEach((button) => {
      on(button, "click", () => changeCalendarMonth(-1));
    });

    nextMonthButtons.forEach((button) => {
      on(button, "click", () => changeCalendarMonth(1));
    });

    on(DOM.timeSlots, "click", (event) => {
      const button = event.target.closest("[data-time]");
      if (!button || button.disabled) return;

      selectTime(button.dataset.time);
    });

    nextButtons.forEach((button) => {
      on(button, "click", (event) => {
        event.preventDefault();

        const requested = getStepFromElement(button);
        const target = requested || state.step + 1;

        if (target <= state.step) {
          setStep(target);
          return;
        }

        if (target > state.step + 1) {
          let current = state.step;

          while (current < target) {
            if (!validateStep(current)) return;
            current += 1;
          }

          if (target === 4) renderReview();
          setStep(target);
          return;
        }

        goNext();
      });
    });

    backButtons.forEach((button) => {
      on(button, "click", (event) => {
        event.preventDefault();

        const requested = getStepFromElement(button);

        if (requested && requested < state.step) {
          setStep(requested);
        } else {
          goBack();
        }
      });
    });

    stepIndicators.forEach((indicator) => {
      on(indicator, "click", () => {
        const target = Number(
          indicator.dataset.stepIndicator ||
          indicator.dataset.step ||
          0
        );

        if (target < state.step && target >= 1) setStep(target);
      });
    });

    [DOM.name, DOM.email, DOM.phone, DOM.notes].forEach((field) => {
      on(field, "blur", () => {
        if (state.step === 3 || state.step === 4) {
          validateCustomer();
        }
      });

      on(field, "input", () => {
        if (field.getAttribute("aria-invalid") === "true") {
          setFieldError(field, "");
        }
      });
    });

    on(DOM.bookingForm, "submit", (event) => {
      event.preventDefault();

      if (state.step < 4) {
        goNext();
        return;
      }

      createBooking();
    });

    findAll(
      "[data-confirm-booking]",
      "#confirm-booking",
      "#confirmBooking",
      "#submit-booking"
    ).forEach((button) => {
      on(button, "click", (event) => {
        event.preventDefault();
        createBooking();
      });
    });

    findAll(
      "[data-new-booking]",
      "#new-booking",
      "#newBooking",
      "#book-another"
    ).forEach((button) => {
      on(button, "click", resetBookingForm);
    });

    findAll(
      "[data-copy-confirmation]",
      "#copy-reference",
      "#copyReference"
    ).forEach((button) => {
      on(button, "click", () => {
        copyReference(state.lastBooking?.id);
      });
    });

    on(DOM.bookingSearch, "input", renderBookingManagement);
    on(DOM.bookingFilter, "change", renderBookingManagement);

    on(DOM.bookingList, "click", (event) => {
      const copyButton = event.target.closest("[data-copy-reference]");

      if (copyButton) {
        copyReference(copyButton.dataset.copyReference);
        return;
      }

      const cancelButton = event.target.closest("[data-cancel-booking]");

      if (cancelButton) {
        cancelBooking(cancelButton.dataset.cancelBooking);
      }
    });

    on(DOM.navToggle, "click", toggleNavigation);

    $$("#primary-navigation a, #main-nav a, #nav-menu a, [data-navigation] a")
      .forEach((link) => {
        on(link, "click", closeNavigation);
      });

    on(document, "keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
        closeNavigation();
      }

      if (
        event.key === "Tab" &&
        DOM.modal &&
        !DOM.modal.hidden &&
        DOM.modal.getAttribute("aria-modal") === "true"
      ) {
        const focusable = $$(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          DOM.modal
        ).filter((element) => element.offsetParent !== null);

        if (!focusable.length) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    });

    // Keep the demo UI in sync when another tab changes storage.
    on(window, "storage", (event) => {
      if (event.key === CONFIG.storageKey) {
        reloadBookings();
      }
    });

    on(window, CONFIG.storageEventName, () => {
      renderBookingManagement();
      renderCalendar();
      renderTimeSlots();
    });

    // Generic in-page navigation for matching anchors.
    $$('a[href^="#"]').forEach((link) => {
      on(link, "click", (event) => {
        const href = link.getAttribute("href");
        if (!href || href === "#") return;

        const target = document.getElementById(href.slice(1));
        if (!target) return;

        event.preventDefault();

        target.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start"
        });

        closeNavigation();
      });
    });
  }

  // ----------------------------------------------------------
  // 18. DEMO STATUS AND INITIALISATION
  // ----------------------------------------------------------

  function renderDemoNotice() {
    const notices = findAll(
      "[data-demo-notice]",
      ".demo-notice",
      "#demo-notice"
    );

    notices.forEach((notice) => {
      notice.textContent =
        "DEMO MODE — Bookings are saved only in this browser. No real appointment is created.";
      notice.setAttribute("role", "note");
    });

    if (DOM.currentYear) {
      DOM.currentYear.textContent = String(new Date().getFullYear());
    }
  }

  function init() {
    renderDemoNotice();

    state.bookings = readBookings();

    bindEvents();

    renderServices();
    renderCalendar();
    renderTimeSlots();
    renderBookingManagement();

    updateSelectedDateText();
    updateSelectedTimeText();
    setStep(1);

    // Optional hooks for a portfolio demonstration or automated tests.
    document.dispatchEvent(new CustomEvent("bookflow:ready", {
      detail: {
        serviceCount: SERVICES.length,
        demoMode: true,
        storageAvailable: state.storageAvailable
      }
    }));

    console.info(
      "BOOKFLOW initialized in demo mode.",
      `${SERVICES.length} services available.`
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
