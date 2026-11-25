/**
 * Main Portfolio Application Controller
 * Renders all sections dynamically from CmsStore (data/cms-content.json or API/localStorage).
 */
(function () {
  let cmsData = null;
  let activeCourseType = "ALL";
  let activeCourseTopic = "ALL";

  const SOCIAL_ICONS = {
    instagram: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>`,
    x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    linkedin: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6.9 8.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM5.2 20V10h3.4v10H5.2Zm5.6 0V10H14v1.4h.1c.5-.9 1.6-1.7 3.3-1.7 3.5 0 4.1 2.3 4.1 5.3V20h-3.4v-4.4c0-1.1 0-2.4-1.5-2.4s-1.7 1.2-1.7 2.3V20h-3.4Z"/></svg>`,
    facebook: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5h1.6V4.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V11H7.7v3h2.6v8h3.2Z"/></svg>`,
    youtube: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>`
  };

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Converts `*phrase*` markers into italic serif accent spans */
  function formatEditorialText(text) {
    const safe = escapeHtml(text);
    return safe.replace(/\*([^*]+)\*/g, '<span class="serif-italic">$1</span>');
  }

  function showToast(msg) {
    const el = document.getElementById("site-toast");
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("is-visible"), 2600);
  }

  function renderSocials(container, socials) {
    if (!container || !socials) return;
    const entries = Object.entries(socials).filter(([, url]) => Boolean(url));
    container.innerHTML = entries
      .map(
        ([key, url]) => `
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="social-circle" aria-label="${escapeHtml(key)}">
          ${SOCIAL_ICONS[key] || escapeHtml(key[0].toUpperCase())}
        </a>`
      )
      .join("");
  }

  function renderSiteHeaderAndFooter(data) {
    const { site, contactSection } = data;
    document.title = `${site.brandName} — Portfolio`;

    const navImg = document.getElementById("nav-brand-img");
    const navMark = document.getElementById("nav-brand-mark");
    const navSub = document.getElementById("nav-brand-sub");
    const footerImg = document.getElementById("footer-brand-img");
    const footerMark = document.getElementById("footer-brand-mark");
    const footerSub = document.getElementById("footer-brand-sub");

    if (site.logoImage && site.logoImage.trim()) {
      navImg.src = site.logoImage.trim();
      navImg.alt = `${site.brandName || "Brand"} Logo`;
      navImg.hidden = false;
      navMark.hidden = true;
      navSub.hidden = true;

      footerImg.src = site.logoImage.trim();
      footerImg.alt = `${site.brandName || "Brand"} Logo`;
      footerImg.hidden = false;
      footerMark.hidden = true;
      footerSub.hidden = true;
    } else {
      navImg.hidden = true;
      navMark.hidden = false;
      navSub.hidden = false;
      footerImg.hidden = true;
      footerMark.hidden = false;
      footerSub.hidden = false;
    }

    navMark.textContent = site.brandMarkTop;
    navSub.textContent = site.brandMarkSub;
    document.getElementById("nav-cta").textContent = site.ctaLabel || "Explore Work";
    document.getElementById("mobile-cta").textContent = site.ctaLabel || "Explore Work";

    footerMark.textContent = site.brandMarkTop;
    footerSub.textContent = site.brandMarkSub;
    document.getElementById("footer-tagline").textContent = site.tagline;
    document.getElementById("footer-brands-email").textContent = contactSection.brandsEmail;
    document.getElementById("footer-creators-email").textContent = contactSection.creatorsEmail;
    document.getElementById("footer-copyright").textContent = site.copyright;
    document.getElementById("footer-origin").textContent = site.originNote;
    const wmText = document.getElementById("footer-watermark");
    const wmSvg = document.getElementById("footer-watermark-svg");
    wmText.textContent = site.watermarkText || site.brandName;
    const fitWatermark = () => {
      try {
        const bbox = wmText.getBBox();
        if (bbox && bbox.width > 0 && bbox.height > 0) {
          wmSvg.setAttribute(
            "viewBox",
            `${bbox.x.toFixed(1)} ${(bbox.y + bbox.height * 0.05).toFixed(1)} ${bbox.width.toFixed(1)} ${(bbox.height * 0.85).toFixed(1)}`
          );
        }
      } catch {}
    };
    fitWatermark();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitWatermark);
    }

    renderSocials(document.getElementById("hero-socials"), site.socials);
    renderSocials(document.getElementById("footer-socials"), site.socials);

    // Apply saved or default theme
    const savedTheme = localStorage.getItem("storyframe_theme") || site.defaultTheme || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }

  function startAtmosphericVideoStream(videoEl, fallbackImgEl, posterSrc, mode = "hero") {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");

        if (typeof canvas.captureStream !== "function") {
          videoEl.hidden = true;
          if (fallbackImgEl) fallbackImgEl.hidden = false;
          return;
        }

        const start = performance.now();
        const drawFrame = (now) => {
          const t = (now - start) / 1000;
          const zoom = 1.08 + Math.sin(t * 0.7) * 0.06;
          const panX = Math.sin(t * 0.55) * 48;
          const panY = Math.cos(t * 0.45) * 20;

          ctx.fillStyle = "#141210";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(canvas.width / 2 + panX, canvas.height / 2 + panY);
          ctx.scale(zoom, zoom);
          ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
          ctx.restore();

          // Drifting mist / atmospheric light sweep (neutral monochrome so original colors reveal on click)
          const mistX = ((t * 160) % (canvas.width + 500)) - 250;
          const grad = ctx.createRadialGradient(mistX, canvas.height * 0.45, 30, mistX, canvas.height * 0.45, 400);
          grad.addColorStop(0, "rgba(255, 255, 255, 0.14)");
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          requestAnimationFrame(drawFrame);
        };

        drawFrame(performance.now());
        const stream = canvas.captureStream(30);
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.srcObject = stream;
        videoEl.onloadedmetadata = () => {
          videoEl.play().catch(() => {});
        };
        videoEl.play().catch(() => {});
      } catch {
        videoEl.hidden = true;
        if (fallbackImgEl) fallbackImgEl.hidden = false;
      }
    };
    img.onerror = () => {
      videoEl.hidden = true;
      if (fallbackImgEl) fallbackImgEl.hidden = false;
    };
    img.src = posterSrc;
  }

  function attachVideoSource(videoEl, fallbackImgEl, videoUrl, posterSrc, mode) {
    if (!videoEl) return;
    videoEl.poster = posterSrc;
    if (videoUrl && videoUrl.trim()) {
      videoEl.srcObject = null;
      videoEl.src = videoUrl.trim();
      videoEl.hidden = false;
      if (fallbackImgEl) fallbackImgEl.hidden = true;
      videoEl.play().catch(() => {});
    } else {
      videoEl.hidden = false;
      if (fallbackImgEl) fallbackImgEl.hidden = true;
      startAtmosphericVideoStream(videoEl, fallbackImgEl, posterSrc, mode);
    }
  }

  function isVideoMedia(url) {
    return /\.(mp4|webm|mov)(\?|$)/i.test(url || "") || (url || "").startsWith("data:video/");
  }

  function renderHero(hero) {
    document.getElementById("hero-headline").innerHTML = formatEditorialText(hero.headline);
    document.getElementById("hero-subtitle").textContent = hero.subtitle;
    const img = document.getElementById("hero-image");
    const video = document.getElementById("hero-video");
    const activeVideoUrl = (hero.videoUrl && hero.videoUrl.trim()) || (isVideoMedia(hero.image) ? hero.image.trim() : "");
    const posterSrc = !isVideoMedia(hero.image) && hero.image ? hero.image : "assets/hero-doc.jpg";

    img.src = posterSrc;
    img.alt = hero.imageAlt || "Hero background";
    attachVideoSource(video, img, activeVideoUrl, posterSrc, "hero");

    const aboutBlock = document.getElementById("hero-about-block");
    const aboutHeading = document.getElementById("hero-about-heading");
    const aboutBody = document.getElementById("hero-about-body");
    if (aboutBlock && aboutHeading && aboutBody) {
      const text = (hero.aboutText || "").trim();
      if (text) {
        aboutBlock.hidden = false;
        aboutHeading.textContent = hero.aboutTitle || "About Me";
        aboutBody.innerHTML = text
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join("");
      } else {
        aboutBlock.hidden = true;
      }
    }

    if (window.HeroAmbience) {
      window.HeroAmbience.init(
        video,
        document.querySelector(".hero-section"),
        document.getElementById("hero-audio-btn")
      );
    }
  }

  function renderFormats(formatsSection) {
    document.getElementById("formats-eyebrow").textContent = formatsSection.eyebrow;
    document.getElementById("formats-heading").textContent = formatsSection.heading;

    const container = document.getElementById("formats-accordion");
    const items = formatsSection.items || [];
    const hasExpanded = items.some((i) => i.expanded);

    container.innerHTML = items
      .map((item, idx) => {
        const expanded = hasExpanded ? item.expanded : idx === 0;
        const src = item.image || "";
        const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(src) || src.startsWith("data:video/");
        const mediaTag = isVideo
          ? `<video src="${escapeHtml(src)}" autoplay muted loop playsinline></video>`
          : `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.title)}" loading="lazy" />`;
        return `
          <article class="format-card ${expanded ? "is-expanded" : ""}" data-format-id="${escapeHtml(item.id)}" tabindex="0">
            ${mediaTag}
            <div class="format-card-overlay">
              <h3 class="format-card-title">${escapeHtml(item.title)}</h3>
              <p class="format-card-desc">${escapeHtml(item.description)}</p>
            </div>
          </article>`;
      })
      .join("");

    const cards = container.querySelectorAll(".format-card");
    const activateCard = (target) => {
      cards.forEach((c) => c.classList.remove("is-expanded"));
      target.classList.add("is-expanded");
    };
    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => activateCard(card));
      card.addEventListener("click", () => activateCard(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activateCard(card);
        }
      });
    });
  }

  function renderMetrics(metrics) {
    document.getElementById("metrics-eyebrow").textContent = metrics.eyebrow;
    document.getElementById("metrics-primary").textContent = metrics.primaryNumber;
    document.getElementById("metrics-suffix").textContent = metrics.primarySuffix;

    const rowsEl = document.getElementById("metrics-rows");
    rowsEl.innerHTML = (metrics.rows || [])
      .map(
        (r) => `
        <div class="metric-row">
          <span class="metric-row-label">${escapeHtml(r.label)}</span>
          <span class="metric-row-val">${escapeHtml(r.value)}</span>
        </div>`
      )
      .join("");
  }

  function renderBrands(brandsSection) {
    document.getElementById("brands-eyebrow").textContent = brandsSection.eyebrow;
    document.getElementById("brands-heading").textContent = brandsSection.heading;

    const items = brandsSection.items || [];
    // Duplicate list once for seamless infinite CSS marquee loop
    const loopItems = [...items, ...items];
    document.getElementById("brands-track").innerHTML = loopItems
      .map(
        (b) => `
        <div class="brand-pill-card">
          ${b.icon ? `<span class="brand-pill-badge">${escapeHtml(b.icon)}</span>` : ""}
          <span>${escapeHtml(b.name)}</span>
        </div>`
      )
      .join("");
  }

  function courseCardMarkup(course) {
    const stripHtml = `<div class="course-strip"><span>${escapeHtml(course.learners || "Commercial")}</span><span>|</span><span>${escapeHtml(course.topic || "Production")}</span></div>`;
    const mediaSrc = (course.videoUrl || course.image || "").trim();
    const isVideo = isVideoMedia(mediaSrc);
    const posterAttr = course.poster
      ? `poster="${escapeHtml(course.poster)}"`
      : !isVideo && mediaSrc
      ? `poster="${escapeHtml(mediaSrc)}"`
      : "";

    return `
      <article class="course-card" data-course-id="${escapeHtml(course.id)}">
        <div class="course-card-media">
          <video class="course-card-video" ${isVideo ? `src="${escapeHtml(mediaSrc)}"` : ""} ${posterAttr} muted loop playsinline preload="metadata"></video>
          <span class="course-video-badge" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
          </span>
          <div class="course-media-scrim"></div>
          <div class="course-badges-top">
            <span class="badge-type">${escapeHtml(course.type)}</span>
          </div>
          <h3 class="course-card-title">${escapeHtml(course.title)}</h3>
        </div>
        ${stripHtml}
        <div class="course-card-footer">
          <button type="button" class="btn-register-full" data-register-course="${escapeHtml(course.id)}">
            ▶ View Project
          </button>
        </div>
      </article>`;
  }

  function renderPersonalSection(personal) {
    if (!personal) return;
    document.getElementById("masaan-eyebrow").textContent = personal.eyebrow || "WHAT I HAVE CREATED PERSONALLY";
    document.getElementById("masaan-title").textContent = personal.title || "MASAAN - SERIES";
    document.getElementById("masaan-subtitle").textContent = personal.subtitle || "";
    document.getElementById("masaan-badge").textContent = personal.statusBadge || "ORIGINAL SERIES";

    const rawPoster = personal.posterImage || "assets/hero-doc.jpg";
    const bgVideoUrl =
      (personal.videoUrl && personal.videoUrl.trim()) || (isVideoMedia(rawPoster) ? rawPoster.trim() : "");
    const fallbackPoster = !isVideoMedia(rawPoster) ? rawPoster : "assets/hero-doc.jpg";

    const masaanBgVideo = document.getElementById("masaan-bg-video");
    attachVideoSource(masaanBgVideo, null, bgVideoUrl, fallbackPoster, "masaan");

    // Original audio support on Masaan background video:
    // Browsers block unmuted autoplay before user interaction, so we start playing smoothly,
    // provide a clear Unmute/Mute toggle button, and auto-unmute once interacted when Masaan is in view.
    const audioBtn = document.getElementById("masaan-audio-btn");
    let userEnabledAudio = true; // default intent: original audio ON when interacted
    let isMasaanVisible = false;

    const syncAudioUi = () => {
      if (!audioBtn) return;
      const playingSound = !masaanBgVideo.muted;
      audioBtn.classList.toggle("is-sound-on", playingSound);
      audioBtn.setAttribute("aria-pressed", String(playingSound));
      audioBtn.setAttribute("aria-label", playingSound ? "Mute Masaan audio" : "Unmute Masaan audio");
      audioBtn.title = playingSound ? "Sound On — Click to Mute" : "Muted — Click to Unmute";
    };

    const tryApplyMasaanAudio = () => {
      if (!bgVideoUrl) {
        masaanBgVideo.muted = true;
        if (audioBtn) audioBtn.hidden = true;
        return;
      }
      if (audioBtn) audioBtn.hidden = false;
      if (userEnabledAudio && isMasaanVisible) {
        masaanBgVideo.muted = false;
        masaanBgVideo.volume = 1;
        masaanBgVideo.play().catch(() => {
          masaanBgVideo.muted = true;
          syncAudioUi();
        });
      } else {
        masaanBgVideo.muted = true;
      }
      syncAudioUi();
    };

    if (audioBtn) {
      audioBtn.onclick = () => {
        if (masaanBgVideo.muted) {
          userEnabledAudio = true;
          masaanBgVideo.muted = false;
          masaanBgVideo.volume = 1;
          masaanBgVideo.play().catch(() => {});
        } else {
          userEnabledAudio = false;
          masaanBgVideo.muted = true;
        }
        syncAudioUi();
      };
    }

    const masaanEl = document.getElementById("personal-creation");
    if (masaanEl && "IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          isMasaanVisible = entries[0]?.isIntersecting ?? false;
          tryApplyMasaanAudio();
        },
        { threshold: 0.35 }
      );
      obs.observe(masaanEl);
    }

    const unlockOnGesture = () => {
      if (bgVideoUrl && userEnabledAudio && isMasaanVisible && masaanBgVideo.muted) {
        masaanBgVideo.muted = false;
        masaanBgVideo.volume = 1;
        masaanBgVideo.play().catch(() => {});
        syncAudioUi();
      }
    };
    window.addEventListener("pointerdown", unlockOnGesture, { passive: true });
    window.addEventListener("keydown", unlockOnGesture, { passive: true });
    tryApplyMasaanAudio();

    const genres = (personal.genre || "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
    document.getElementById("masaan-genres").innerHTML = genres
      .map((g) => `<span class="genre-pill">${escapeHtml(g)}</span>`)
      .join("");

    const paragraphs = (personal.description || "")
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join("");
    document.getElementById("masaan-body").innerHTML = paragraphs;

    const ctaBtn = document.getElementById("masaan-cta-btn");
    const ytFallback = cmsData.site?.socials?.youtube || "https://youtube.com";
    ctaBtn.textContent = personal.ctaLabel || "▶ Watch Teaser";
    ctaBtn.href = personal.ctaUrl && !personal.ctaUrl.startsWith("#") ? personal.ctaUrl : ytFallback;
  }

  function bindHoverVideoTile(containerEl, videoEl, mediaSrc) {
    if (!containerEl || !videoEl) return;
    enforceSilentVideo(videoEl);
    videoEl.addEventListener("loadedmetadata", () => {
      if (!videoEl.poster && Number.isFinite(videoEl.duration) && videoEl.duration > 1 && videoEl.currentTime === 0) {
        try { videoEl.currentTime = Math.min(1.5, videoEl.duration * 0.15); } catch {}
      }
    }, { once: true });
    const playHoverVideo = () => {
      containerEl.classList.add("is-playing");
      videoEl.muted = true;
      videoEl.volume = 0;
      const src = (mediaSrc || "").trim();
      if (!videoEl.src && !videoEl.srcObject && src && !isVideoMedia(src)) {
        startAtmosphericVideoStream(videoEl, null, src, "hero");
        return;
      }
      videoEl.play().catch(() => {});
    };
    const pauseHoverVideo = () => {
      containerEl.classList.remove("is-playing");
      videoEl.pause();
    };
    containerEl.addEventListener("mouseenter", playHoverVideo);
    containerEl.addEventListener("mouseleave", pauseHoverVideo);
    containerEl.addEventListener("focusin", playHoverVideo);
    containerEl.addEventListener("focusout", pauseHoverVideo);
  }

  function bindCourseButtons(root) {
    const items = cmsData.coursesSection.items || [];
    root.querySelectorAll(".course-card").forEach((card) => {
      const course = items.find((c) => c.id === card.dataset.courseId);
      const vid = card.querySelector("video.course-card-video");
      if (course && vid) {
        bindHoverVideoTile(card, vid, course.videoUrl || course.image);
      }
    });
    root.querySelectorAll("[data-register-course]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const course = items.find((c) => c.id === btn.dataset.registerCourse);
        if (course) openCourseModal(course);
      });
    });
  }

  function renderHomeCourses(coursesSection) {
    document.getElementById("courses-eyebrow").textContent = coursesSection.eyebrow;
    document.getElementById("courses-heading").textContent = coursesSection.heading;
    document.getElementById("courses-subtitle").textContent = coursesSection.subtitle;

    const items = coursesSection.items || [];
    const grid = document.getElementById("home-courses-grid");
    grid.innerHTML = items.map(courseCardMarkup).join("");
    bindCourseButtons(grid);

    const prevBtn = document.getElementById("rail-prev-btn");
    const nextBtn = document.getElementById("rail-next-btn");
    if (prevBtn && nextBtn) {
      prevBtn.onclick = () => grid.scrollBy({ left: -320, behavior: "smooth" });
      nextBtn.onclick = () => grid.scrollBy({ left: 320, behavior: "smooth" });
    }
  }

  function renderCatalogPage() {
    const items = cmsData.coursesSection.items || [];
    const topics = ["ALL", ...new Set(items.map((i) => i.topic).filter(Boolean))];

    const topicWrap = document.getElementById("topic-filters");
    topicWrap.innerHTML = topics
      .map(
        (t) => `<button class="filter-pill ${t === activeCourseTopic ? "is-active" : ""}" data-topic="${escapeHtml(t)}">${t === "ALL" ? "All Topics" : escapeHtml(t)}</button>`
      )
      .join("");

    topicWrap.querySelectorAll(".filter-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCourseTopic = btn.dataset.topic;
        renderCatalogPage();
      });
    });

    document.querySelectorAll("#type-filters .filter-pill").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.type === activeCourseType);
    });

    const filtered = items.filter((item) => {
      const matchType = activeCourseType === "ALL" || item.type === activeCourseType;
      const matchTopic = activeCourseTopic === "ALL" || item.topic === activeCourseTopic;
      return matchType && matchTopic;
    });

    const grid = document.getElementById("catalog-courses-grid");
    grid.innerHTML = filtered.length
      ? filtered.map(courseCardMarkup).join("")
      : `<p class="muted-copy">No courses match that filter yet.</p>`;
    bindCourseButtons(grid);
  }

  function enforceSilentVideo(videoEl) {
    if (!videoEl) return;
    videoEl.defaultMuted = true;
    videoEl.muted = true;
    videoEl.volume = 0;
    videoEl.addEventListener("volumechange", () => {
      if (!videoEl.muted || videoEl.volume !== 0) {
        videoEl.muted = true;
        videoEl.volume = 0;
      }
    });
  }

  function renderVibeGallery(vibeSection) {
    document.getElementById("vibe-eyebrow").textContent = vibeSection.eyebrow;
    document.getElementById("vibe-heading").textContent = vibeSection.heading;
    document.getElementById("vibe-subtitle").textContent = vibeSection.subtitle;

    const grid = document.getElementById("vibe-bento-grid");
    const photos = vibeSection.photos || [];
    const hoverVideoSlots = new Set([0, 2, 4]);

    grid.innerHTML = photos
      .map((p, idx) => {
        const rawSrc = (p.videoUrl || p.image || "").trim();
        const isVideo = isVideoMedia(rawSrc) || p.mediaType === "video" || hoverVideoSlots.has(idx);
        const posterAttr = p.poster ? `poster="${escapeHtml(p.poster)}"` : !isVideoMedia(rawSrc) && rawSrc ? `poster="${escapeHtml(rawSrc)}"` : "";
        const mediaMarkup = isVideo
          ? `<video class="vibe-video" ${isVideoMedia(rawSrc) ? `src="${escapeHtml(rawSrc)}"` : ""} ${posterAttr} muted loop playsinline preload="metadata"></video>
             <span class="vibe-video-badge" aria-hidden="true">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
             </span>`
          : `<img src="${escapeHtml(rawSrc)}" alt="${escapeHtml(p.caption)}" loading="lazy" />`;

        return `
        <figure class="vibe-photo vibe-slot-${escapeHtml(p.slot)}${isVideo ? " is-video" : ""}" data-photo-id="${escapeHtml(p.id)}" data-vibe-index="${idx}" tabindex="0" style="margin:0;">
          ${mediaMarkup}
          <figcaption class="vibe-photo-caption">${escapeHtml(p.caption)}</figcaption>
        </figure>`;
      })
      .join("");

    grid.querySelectorAll(".vibe-photo").forEach((el) => {
      const idx = Number(el.dataset.vibeIndex);
      const photo = photos.find((p) => p.id === el.dataset.photoId);
      if (!photo) return;

      const vid = el.querySelector("video.vibe-video");
      if (vid) {
        bindHoverVideoTile(el, vid, photo.videoUrl || photo.image);
      }

      el.addEventListener("click", () => {
        const mediaSrc = (photo.videoUrl || photo.image || "").trim();
        const useVideoModal = isVideoMedia(mediaSrc) || photo.mediaType === "video" || hoverVideoSlots.has(idx);
        const posterAttr = photo.poster ? `poster="${escapeHtml(photo.poster)}"` : "";
        openModal(
          useVideoModal && isVideoMedia(mediaSrc)
            ? `<div class="vibe-modal-player">
                 <video class="vibe-modal-video" src="${escapeHtml(mediaSrc)}" ${posterAttr} autoplay muted loop playsinline style="width:100%; border-radius:12px; max-height:68vh; background:#000; display:block;"></video>
                 <div class="vibe-modal-controls">
                   <button type="button" class="vibe-modal-play-btn" aria-label="Pause video">❚❚</button>
                   <input type="range" class="vibe-modal-scrubber" min="0" max="100" value="0" step="0.1" aria-label="Seek video" />
                   <span class="vibe-modal-time">0:00 / 0:00</span>
                 </div>
               </div>
               <p class="muted-copy" style="margin:12px 0 0; text-align:center;">${escapeHtml(photo.caption)}</p>`
            : `<img src="${escapeHtml(photo.poster || photo.image)}" alt="${escapeHtml(photo.caption)}" style="width:100%; border-radius:12px; max-height:68vh; object-fit:contain;" />
               <p class="muted-copy" style="margin:12px 0 0; text-align:center;">${escapeHtml(photo.caption)}</p>`
        );
        const modalVid = document.querySelector(".vibe-modal-video");
        if (modalVid) {
          enforceSilentVideo(modalVid);
          const playBtn = document.querySelector(".vibe-modal-play-btn");
          const scrubber = document.querySelector(".vibe-modal-scrubber");
          const timeEl = document.querySelector(".vibe-modal-time");
          const fmtTime = (sec) => {
            if (!Number.isFinite(sec) || sec < 0) return "0:00";
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return `${m}:${s < 10 ? "0" : ""}${s}`;
          };
          const syncPlayState = () => {
            if (!playBtn) return;
            const paused = modalVid.paused;
            playBtn.textContent = paused ? "▶" : "❚❚";
            playBtn.setAttribute("aria-label", paused ? "Play video" : "Pause video");
          };
          const togglePlay = () => {
            if (modalVid.paused) modalVid.play().catch(() => {});
            else modalVid.pause();
            syncPlayState();
          };
          modalVid.addEventListener("click", togglePlay);
          if (playBtn) playBtn.addEventListener("click", togglePlay);
          modalVid.addEventListener("play", syncPlayState);
          modalVid.addEventListener("pause", syncPlayState);
          const syncTime = () => {
            const dur = modalVid.duration || 0;
            const cur = modalVid.currentTime || 0;
            if (scrubber && dur > 0) scrubber.value = ((cur / dur) * 100).toFixed(2);
            if (timeEl) timeEl.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;
          };
          modalVid.addEventListener("loadedmetadata", syncTime);
          modalVid.addEventListener("timeupdate", syncTime);
          if (scrubber) {
            scrubber.addEventListener("input", () => {
              const dur = modalVid.duration || 0;
              if (dur > 0) modalVid.currentTime = (Number(scrubber.value) / 100) * dur;
            });
          }
        }
      });
    });
  }

  function renderContactSection(contactSection) {
    document.getElementById("contact-eyebrow").textContent = contactSection.eyebrow;
    document.getElementById("contact-heading").textContent = contactSection.heading;

    const grid = document.getElementById("contact-cards-grid");
    grid.innerHTML = (contactSection.cards || [])
      .map(
        (c) => `
        <article class="contact-card">
          <div>
            <h3>${escapeHtml(c.title)}</h3>
            <p>${escapeHtml(c.description)}</p>
          </div>
          <button type="button" class="contact-card-btn" data-contact-action="${escapeHtml(c.actionType)}">
            ${escapeHtml(c.linkLabel)}
          </button>
        </article>`
      )
      .join("");

    grid.querySelectorAll("[data-contact-action]").forEach((btn) => {
      btn.addEventListener("click", () => handleContactAction(btn.dataset.contactAction));
    });
  }

  function renderPhotoEssays(essays) {
    const grid = document.getElementById("essays-grid");
    grid.innerHTML = (essays || [])
      .map(
        (e) => `
        <article class="essay-card" data-essay-id="${escapeHtml(e.id)}">
          <div class="essay-card-img">
            <img src="${escapeHtml(e.coverImage)}" alt="${escapeHtml(e.title)}" loading="lazy" />
          </div>
          <div class="essay-card-body">
            <span class="essay-meta">${escapeHtml(e.location)} · ${escapeHtml(e.date)}</span>
            <h3>${escapeHtml(e.title)}</h3>
            <p>${escapeHtml(e.excerpt)}</p>
            <span class="text-link-orange" style="margin-top:6px;">Read essay (${escapeHtml(e.readTime || "4 min")}) →</span>
          </div>
        </article>`
      )
      .join("");

    grid.querySelectorAll(".essay-card").forEach((card) => {
      card.addEventListener("click", () => {
        const essay = essays.find((e) => e.id === card.dataset.essayId);
        if (!essay) return;
        const paragraphs = (essay.body || "")
          .split(/\n\s*\n/)
          .map((p) => `<p style="line-height:1.7; color:var(--text-muted);">${escapeHtml(p)}</p>`)
          .join("");
        openModal(`
          <p class="eyebrow">${escapeHtml(essay.location)} · ${escapeHtml(essay.date)}</p>
          <h2 id="modal-title" style="margin:0 0 16px;">${escapeHtml(essay.title)}</h2>
          <img src="${escapeHtml(essay.coverImage)}" alt="${escapeHtml(essay.title)}" style="width:100%; border-radius:12px; max-height:260px; object-fit:cover; margin-bottom:16px;" />
          ${paragraphs}
        `);
      });
    });
  }

  function openModal(html, options = {}) {
    const modal = document.getElementById("site-modal");
    const dialog = modal.querySelector(".modal-dialog");
    if (dialog) {
      dialog.classList.toggle("is-reel-modal", Boolean(options.reelMode));
    }
    document.getElementById("modal-body").innerHTML = html;
    modal.hidden = false;
  }

  function closeModal() {
    const modal = document.getElementById("site-modal");
    const body = document.getElementById("modal-body");
    body.querySelectorAll("video").forEach((vid) => {
      try { vid.pause(); } catch {}
    });
    body.innerHTML = "";
    const dialog = modal.querySelector(".modal-dialog");
    if (dialog) dialog.classList.remove("is-reel-modal");
    modal.hidden = true;
  }

  function openCourseModal(course) {
    const mediaSrc = (course.videoUrl || course.image || "").trim();
    const isVideo = isVideoMedia(mediaSrc);
    openModal(
      isVideo
        ? `<div class="reel-modal-frame">
             <video class="reel-modal-video" src="${escapeHtml(mediaSrc)}" controls autoplay playsinline loop></video>
           </div>`
        : `<div class="reel-modal-frame">
             <img class="reel-modal-img" src="${escapeHtml(mediaSrc)}" alt="${escapeHtml(course.title)}" />
           </div>`,
      { reelMode: true }
    );
  }

  function handleContactAction(actionType) {
    if (actionType === "careers") {
      const roles = cmsData.contactSection.openRoles || [];
      openModal(`
        <p class="eyebrow">CAREERS</p>
        <h2 id="modal-title" style="margin:0 0 14px;">Open Roles</h2>
        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:18px;">
          ${roles
            .map(
              (r) => `
              <div style="padding:14px; border-radius:12px; border:1px solid var(--border-subtle); background:var(--bg-primary);">
                <div style="font-weight:700;">${escapeHtml(r.title)}</div>
                <div style="font-size:0.78rem; color:var(--accent); margin:3px 0 6px;">${escapeHtml(r.type)}</div>
                <div style="font-size:0.86rem; color:var(--text-muted);">${escapeHtml(r.summary)}</div>
              </div>`
            )
            .join("")}
        </div>
        <button type="button" class="btn-pill-orange" id="apply-role-btn">Submit Portfolio / Application</button>
      `);
      document.getElementById("apply-role-btn").addEventListener("click", () => handleContactAction("career-apply"));
      return;
    }

    const titles = {
      brand: "Pitch a Brand Collaboration",
      creator: "Reach the Creator Team",
      "career-apply": "Apply for an Open Role"
    };

    openModal(`
      <p class="eyebrow">GET IN TOUCH</p>
      <h2 id="modal-title" style="margin:0 0 8px;">${titles[actionType] || "Send a Message"}</h2>
      <p class="muted-copy" style="margin:0;">Submissions appear directly inside the CMS Portal Inquiries tab.</p>
      <form class="modal-form" id="inquiry-form">
        <div class="modal-field">
          <label for="inq-name">Name / Organization</label>
          <input id="inq-name" required placeholder="Your name or brand" />
        </div>
        <div class="modal-field">
          <label for="inq-email">Email</label>
          <input id="inq-email" type="email" required placeholder="name@company.com" />
        </div>
        <div class="modal-field">
          <label for="inq-msg">Message</label>
          <textarea id="inq-msg" rows="4" required placeholder="Share details, timeline, or links..."></textarea>
        </div>
        <button type="submit" class="btn-pill-orange" style="padding:12px;">Send Inquiry</button>
      </form>
    `);

    document.getElementById("inquiry-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      await CmsStore.submitInquiry({
        kind: titles[actionType] || "General Inquiry",
        subject: actionType,
        name: document.getElementById("inq-name").value.trim(),
        email: document.getElementById("inq-email").value.trim(),
        message: document.getElementById("inq-msg").value.trim()
      });
      closeModal();
      showToast("Inquiry sent! Viewable in CMS Portal.");
    });
  }

  function switchRoute(route) {
    const valid = ["home", "learn", "photo-essays"].includes(route) ? route : "home";
    document.querySelectorAll(".page-view").forEach((v) => v.classList.remove("is-active"));
    document.getElementById(`view-${valid}`).classList.add("is-active");

    document.querySelectorAll(".nav-link[data-route]").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.route === valid);
    });

    document.getElementById("mobile-drawer").classList.remove("is-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bindGlobalEvents() {
    // Route navigation
    document.querySelectorAll("[data-route]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const route = el.dataset.route;
        history.replaceState(null, "", `#${route}`);
        switchRoute(route);
      });
    });

    document.getElementById("view-all-courses-btn").addEventListener("click", () => {
      history.replaceState(null, "", "#learn");
      switchRoute("learn");
    });

    // Type filter pills on Learn page
    document.querySelectorAll("#type-filters .filter-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCourseType = btn.dataset.type;
        renderCatalogPage();
      });
    });

    // Theme toggle
    document.getElementById("theme-toggle").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("storyframe_theme", next);
    });

    // Mobile drawer
    document.getElementById("mobile-menu-btn").addEventListener("click", () => {
      document.getElementById("mobile-drawer").classList.toggle("is-open");
    });

    // Copy email buttons
    document.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const target = document.getElementById(btn.dataset.copyTarget);
        if (!target) return;
        try {
          await navigator.clipboard.writeText(target.textContent.trim());
          showToast(`Copied ${target.textContent.trim()}`);
        } catch {
          showToast(target.textContent.trim());
        }
      });
    });

    // Footer roles button
    document.getElementById("footer-open-roles-btn").addEventListener("click", () => {
      handleContactAction("careers");
    });

    // Modal close
    document.getElementById("modal-close").addEventListener("click", closeModal);
    document.getElementById("site-modal").addEventListener("click", (e) => {
      if (e.target.id === "site-modal") closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  async function init() {
    cmsData = await CmsStore.loadContent();
    renderSiteHeaderAndFooter(cmsData);
    renderHero(cmsData.hero);
    renderFormats(cmsData.formatsSection);
    renderMetrics(cmsData.metrics);
    renderBrands(cmsData.brandsSection);
    renderHomeCourses(cmsData.coursesSection);
    renderPersonalSection(cmsData.personalSection);
    renderCatalogPage();
    renderVibeGallery(cmsData.vibeSection);
    renderContactSection(cmsData.contactSection);
    renderPhotoEssays(cmsData.photoEssays);
    bindGlobalEvents();

    const hashRoute = window.location.hash.replace("#", "");
    if (["home", "learn", "photo-essays"].includes(hashRoute)) {
      switchRoute(hashRoute);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
