/**
 * StoryFrame CMS Portal Controller
 * Full visual editor for every section of the portfolio, with live India map pin picker,
 * image upload (saved to /uploads on local server or base64 in static mode), and JSON backup/restore.
 */
(function () {
  const SESSION_KEY = "storyframe_cms_authed";
  let data = null;
  let activeTab = "overview";
  let isDirty = false;

  const TAB_TITLES = {
    overview: "Dashboard Overview",
    "brand-hero": "Brand, Hero Video & Socials",
    formats: "How I Tell My Stories",
    "metrics-brands": "Metrics & Partner Brands",
    personal: "What I Have Created Personally (MASAAN)",
    courses: "Commercial Work",
    essays: "Originals & Dispatches",
    vibe: "See What's Behind The Camera",
    contact: "Contact & CMS Security",
    inquiries: "Inquiries & Project Requests"
  };

  function esc(val) {
    return String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(msg) {
    const el = document.getElementById("site-toast");
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("is-visible"), 2600);
  }

  function markDirty(state = true) {
    isDirty = state;
    const status = document.getElementById("cms-save-status");
    if (!status) return;
    if (state) {
      status.textContent = "Unsaved changes — click Save Changes";
      status.classList.add("is-dirty");
    } else {
      status.textContent = "All changes synced";
      status.classList.remove("is-dirty");
    }
  }

  function isVideoUrl(url) {
    return /\.(mp4|webm|mov)(\?|$)/i.test(url || "") || (url || "").startsWith("data:video/");
  }

  function imageInputBlock(label, currentUrl, bindPath, accept = "image/*", placeholder = "assets/hero-doc.jpg or https://...") {
    const thumb = isVideoUrl(currentUrl)
      ? `<video class="cms-thumb" src="${esc(currentUrl)}" muted autoplay loop playsinline></video>`
      : `<img class="cms-thumb" src="${esc(currentUrl)}" alt="preview" onerror="this.style.opacity=0.25" />`;
    return `
      <div class="cms-field is-full">
        <label>${esc(label)}</label>
        <div class="cms-image-row">
          ${currentUrl ? thumb : ""}
          <input type="text" value="${esc(currentUrl)}" data-bind="${esc(bindPath)}" placeholder="${esc(placeholder)}" />
          <label class="cms-outline-btn" style="white-space:nowrap; cursor:pointer;">
            Upload
            <input type="file" accept="${esc(accept)}" data-upload-for="${esc(bindPath)}" hidden />
          </label>
        </div>
      </div>`;
  }

  function getByPath(obj, path) {
    return path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
  }

  function setByPath(obj, path, value) {
    const parts = path.split(".");
    const last = parts.pop();
    let target = obj;
    for (const part of parts) {
      target = target[part];
    }
    target[last] = value;
  }

  function renderActiveTab() {
    document.getElementById("cms-tab-title").textContent = TAB_TITLES[activeTab] || "CMS";
    document.getElementById("inbox-count-pill").textContent = (data.inquiries || []).length;
    document.getElementById("cms-brand-mark").textContent = data.site.brandMarkTop || "SF";

    const area = document.getElementById("cms-content-area");

    if (activeTab === "overview") {
      area.innerHTML = `
        <div class="cms-stats-grid">
          <div class="cms-stat-card"><span>Story Formats</span><strong>${data.formatsSection.items.length}</strong></div>
          <div class="cms-stat-card"><span>Photo-Essays</span><strong>${(data.photoEssays || []).length}</strong></div>
          <div class="cms-stat-card"><span>Courses &amp; Tools</span><strong>${data.coursesSection.items.length}</strong></div>
          <div class="cms-stat-card"><span>Inquiries</span><strong>${(data.inquiries || []).length}</strong></div>
        </div>

        <div class="cms-panel">
          <div class="cms-panel-head">
            <h3>Quick Actions &amp; Backup</h3>
          </div>
          <p class="muted-copy" style="margin-top:0;">
            Every edit you make updates <code>data/cms-content.json</code> when running via <code>start-server.ps1</code> (or browser storage in static mode).
          </p>
          <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:16px;">
            <a href="index.html" target="_blank" class="btn-pill-orange">Open Live Portfolio ↗</a>
            <button type="button" class="cms-outline-btn" id="reset-defaults-btn">Reset to Default Template</button>
          </div>
        </div>`;

      document.getElementById("reset-defaults-btn").addEventListener("click", async () => {
        if (!confirm("Reset all portfolio content back to the original template defaults?")) return;
        data = await CmsStore.resetToFileDefaults();
        markDirty(false);
        renderActiveTab();
        showToast("Reset to default template.");
      });
      return;
    }

    if (activeTab === "brand-hero") {
      area.innerHTML = `
        <div class="cms-panel">
          <div class="cms-panel-head"><h3>Brand Identity &amp; Footer</h3></div>
          <div class="cms-form-grid">
            <div class="cms-field"><label>Brand Name</label><input data-bind="site.brandName" value="${esc(data.site.brandName)}" /></div>
            <div class="cms-field"><label>Watermark Wordmark (Footer)</label><input data-bind="site.watermarkText" value="${esc(data.site.watermarkText)}" /></div>
            <div class="cms-field"><label>Monogram Mark (fallback)</label><input data-bind="site.brandMarkTop" value="${esc(data.site.brandMarkTop)}" /></div>
            <div class="cms-field"><label>Monogram Sublabel (fallback)</label><input data-bind="site.brandMarkSub" value="${esc(data.site.brandMarkSub)}" /></div>
            ${imageInputBlock("Brand Logo Image (leave blank to use monogram text)", data.site.logoImage || "", "site.logoImage")}
            <div class="cms-field is-full"><label>Footer Tagline</label><input data-bind="site.tagline" value="${esc(data.site.tagline)}" /></div>
            <div class="cms-field"><label>Top CTA Button Label</label><input data-bind="site.ctaLabel" value="${esc(data.site.ctaLabel)}" /></div>
            <div class="cms-field"><label>Copyright Line</label><input data-bind="site.copyright" value="${esc(data.site.copyright)}" /></div>
            <div class="cms-field"><label>Origin Note</label><input data-bind="site.originNote" value="${esc(data.site.originNote)}" /></div>
            <div class="cms-field">
              <label>Default Theme</label>
              <select data-bind="site.defaultTheme">
                <option value="dark" ${data.site.defaultTheme === "dark" ? "selected" : ""}>Dark (Warm Charcoal)</option>
                <option value="light" ${data.site.defaultTheme === "light" ? "selected" : ""}>Light (Sky Blue Blur)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="cms-panel">
          <div class="cms-panel-head"><h3>Hero Section</h3></div>
          <div class="cms-form-grid">
            <div class="cms-field is-full">
              <label>Hero Headline (wrap words in *asterisks* for italic serif highlight)</label>
              <input data-bind="hero.headline" value="${esc(data.hero.headline)}" />
            </div>
            <div class="cms-field is-full">
              <label>Hero Subtitle</label>
              <textarea rows="2" data-bind="hero.subtitle">${esc(data.hero.subtitle)}</textarea>
            </div>
            <div class="cms-field"><label>Hero About Title</label><input data-bind="hero.aboutTitle" value="${esc(data.hero.aboutTitle || "About Me")}" /></div>
            <div class="cms-field is-full">
              <label>Hero About Me Bio (under social links — blank line between paragraphs)</label>
              <textarea rows="6" data-bind="hero.aboutText">${esc(data.hero.aboutText || "")}</textarea>
            </div>
            ${imageInputBlock("Hero Background Video (.mp4 / .webm — plays behind hero text)", data.hero.videoUrl || "", "hero.videoUrl", "video/*,image/*", "uploads/hero-reel.mp4 or https://...")}
            ${imageInputBlock("Hero Poster Media (Image or Video — .jpg/.png/.mp4/.webm)", data.hero.image || "", "hero.image", "image/*,video/*")}
          </div>
        </div>

        <div class="cms-panel">
          <div class="cms-panel-head"><h3>Social Links</h3></div>
          <div class="cms-form-grid">
            <div class="cms-field"><label>YouTube URL</label><input data-bind="site.socials.youtube" value="${esc(data.site.socials.youtube || "")}" /></div>
            <div class="cms-field"><label>Instagram URL</label><input data-bind="site.socials.instagram" value="${esc(data.site.socials.instagram || "")}" /></div>
            <div class="cms-field"><label>X (Twitter) URL</label><input data-bind="site.socials.x" value="${esc(data.site.socials.x || "")}" /></div>
            <div class="cms-field"><label>LinkedIn URL</label><input data-bind="site.socials.linkedin" value="${esc(data.site.socials.linkedin || "")}" /></div>
            <div class="cms-field"><label>Facebook URL</label><input data-bind="site.socials.facebook" value="${esc(data.site.socials.facebook || "")}" /></div>
          </div>
        </div>`;
      bindInputs(area);
      return;
    }

    if (activeTab === "formats") {
      area.innerHTML = `
        <div class="cms-panel">
          <div class="cms-panel-head">
            <h3>Section Header</h3>
            <button type="button" class="btn-pill-orange" id="add-format-btn">+ Add Format Card</button>
          </div>
          <div class="cms-form-grid">
            <div class="cms-field"><label>Eyebrow</label><input data-bind="formatsSection.eyebrow" value="${esc(data.formatsSection.eyebrow)}" /></div>
            <div class="cms-field"><label>Heading</label><input data-bind="formatsSection.heading" value="${esc(data.formatsSection.heading)}" /></div>
          </div>
        </div>
        ${data.formatsSection.items
          .map(
            (item, idx) => `
          <div class="cms-item-card">
            <div class="cms-item-top">
              <strong>Card #${idx + 1}: ${esc(item.title)}</strong>
              <div style="display:flex; gap:10px; align-items:center;">
                <label class="cms-checkbox-row">
                  <input type="radio" name="expandedFormat" ${item.expanded ? "checked" : ""} data-set-expanded="${idx}" />
                  Default Expanded
                </label>
                <button type="button" class="cms-danger-btn" data-del-format="${idx}">Delete</button>
              </div>
            </div>
            <div class="cms-form-grid">
              <div class="cms-field"><label>Title</label><input data-bind="formatsSection.items.${idx}.title" value="${esc(item.title)}" /></div>
              <div class="cms-field"><label>Description</label><input data-bind="formatsSection.items.${idx}.description" value="${esc(item.description)}" /></div>
              ${imageInputBlock("Card Image or Video (.jpg/.png/.mp4/.webm)", item.image, `formatsSection.items.${idx}.image`, "image/*,video/*")}
            </div>
          </div>`
          )
          .join("")}`;

      bindInputs(area);
      document.getElementById("add-format-btn").addEventListener("click", () => {
        data.formatsSection.items.push({
          id: "fmt-" + Date.now(),
          title: "New Format",
          description: "Short description for this storytelling format.",
          image: "assets/creator-studio.jpg",
          expanded: false
        });
        markDirty();
        renderActiveTab();
      });
      area.querySelectorAll("[data-set-expanded]").forEach((radio) => {
        radio.addEventListener("change", () => {
          const i = Number(radio.dataset.setExpanded);
          data.formatsSection.items.forEach((f, idx) => (f.expanded = idx === i));
          markDirty();
        });
      });
      area.querySelectorAll("[data-del-format]").forEach((btn) => {
        btn.addEventListener("click", () => {
          data.formatsSection.items.splice(Number(btn.dataset.delFormat), 1);
          markDirty();
          renderActiveTab();
        });
      });
      return;
    }

    if (activeTab === "metrics-brands") {
      area.innerHTML = `
        <div class="cms-panel">
          <div class="cms-panel-head">
            <h3>Monthly Metrics</h3>
            <button type="button" class="cms-outline-btn" id="add-metric-row-btn">+ Add Row</button>
          </div>
          <div class="cms-form-grid" style="margin-bottom:14px;">
            <div class="cms-field"><label>Eyebrow</label><input data-bind="metrics.eyebrow" value="${esc(data.metrics.eyebrow)}" /></div>
            <div class="cms-field"><label>Big Number</label><input data-bind="metrics.primaryNumber" value="${esc(data.metrics.primaryNumber)}" /></div>
            <div class="cms-field"><label>Accent Suffix (+)</label><input data-bind="metrics.primarySuffix" value="${esc(data.metrics.primarySuffix)}" /></div>
          </div>
          ${data.metrics.rows
            .map(
              (r, idx) => `
            <div class="cms-item-card">
              <div class="cms-form-grid">
                <div class="cms-field"><label>Row Label</label><input data-bind="metrics.rows.${idx}.label" value="${esc(r.label)}" /></div>
                <div class="cms-field">
                  <label>Value</label>
                  <div style="display:flex; gap:8px;">
                    <input data-bind="metrics.rows.${idx}.value" value="${esc(r.value)}" />
                    <button type="button" class="cms-danger-btn" data-del-metric="${idx}">✕</button>
                  </div>
                </div>
              </div>
            </div>`
            )
            .join("")}
        </div>

        <div class="cms-panel">
          <div class="cms-panel-head">
            <h3>Trusted Brands</h3>
            <button type="button" class="btn-pill-orange" id="add-brand-btn">+ Add Brand</button>
          </div>
          <div class="cms-form-grid" style="margin-bottom:14px;">
            <div class="cms-field"><label>Eyebrow</label><input data-bind="brandsSection.eyebrow" value="${esc(data.brandsSection.eyebrow)}" /></div>
            <div class="cms-field"><label>Heading</label><input data-bind="brandsSection.heading" value="${esc(data.brandsSection.heading)}" /></div>
          </div>
          ${data.brandsSection.items
            .map(
              (b, idx) => `
            <div class="cms-item-card">
              <div class="cms-form-grid">
                <div class="cms-field"><label>Brand Name</label><input data-bind="brandsSection.items.${idx}.name" value="${esc(b.name)}" /></div>
                <div class="cms-field">
                  <label>Badge / Monogram Icon (optional)</label>
                  <div style="display:flex; gap:8px;">
                    <input data-bind="brandsSection.items.${idx}.icon" value="${esc(b.icon || "")}" />
                    <button type="button" class="cms-danger-btn" data-del-brand="${idx}">Delete</button>
                  </div>
                </div>
              </div>
            </div>`
            )
            .join("")}
        </div>`;

      bindInputs(area);
      document.getElementById("add-metric-row-btn").addEventListener("click", () => {
        data.metrics.rows.push({ label: "NEW METRIC", value: "100K" });
        markDirty();
        renderActiveTab();
      });
      area.querySelectorAll("[data-del-metric]").forEach((b) =>
        b.addEventListener("click", () => {
          data.metrics.rows.splice(Number(b.dataset.delMetric), 1);
          markDirty();
          renderActiveTab();
        })
      );
      document.getElementById("add-brand-btn").addEventListener("click", () => {
        data.brandsSection.items.push({ id: "b-" + Date.now(), name: "New Partner", icon: "★" });
        markDirty();
        renderActiveTab();
      });
      area.querySelectorAll("[data-del-brand]").forEach((b) =>
        b.addEventListener("click", () => {
          data.brandsSection.items.splice(Number(b.dataset.delBrand), 1);
          markDirty();
          renderActiveTab();
        })
      );
      return;
    }

    if (activeTab === "personal") {
      if (!data.personalSection) data.personalSection = {};
      const p = data.personalSection;
      area.innerHTML = `
        <div class="cms-panel">
          <div class="cms-panel-head"><h3>Original Series / Personal Creation</h3></div>
          <div class="cms-form-grid">
            <div class="cms-field"><label>Section Eyebrow</label><input data-bind="personalSection.eyebrow" value="${esc(p.eyebrow || "")}" /></div>
            <div class="cms-field"><label>Badge Label</label><input data-bind="personalSection.statusBadge" value="${esc(p.statusBadge || "")}" /></div>
            <div class="cms-field"><label>Series / Film Title</label><input data-bind="personalSection.title" value="${esc(p.title || "")}" /></div>
            <div class="cms-field"><label>Subtitle / Logline</label><input data-bind="personalSection.subtitle" value="${esc(p.subtitle || "")}" /></div>
            <div class="cms-field is-full"><label>Genres (comma separated)</label><input data-bind="personalSection.genre" value="${esc(p.genre || "")}" /></div>
            <div class="cms-field is-full"><label>Film Description (blank line between paragraphs)</label><textarea rows="7" data-bind="personalSection.description">${esc(p.description || "")}</textarea></div>
            <div class="cms-field"><label>CTA Button Label</label><input data-bind="personalSection.ctaLabel" value="${esc(p.ctaLabel || "")}" /></div>
            <div class="cms-field"><label>Watch Teaser YouTube URL</label><input data-bind="personalSection.ctaUrl" value="${esc(p.ctaUrl || "")}" placeholder="https://youtube.com/watch?v=..." /></div>
            ${imageInputBlock("Masaan Background Video (.mp4 / .webm — plays with audio behind Masaan)", p.videoUrl || "", "personalSection.videoUrl", "video/*,image/*", "uploads/masaan-bg.mp4 or https://...")}
            ${imageInputBlock("Fallback Image (shown while video loads)", p.posterImage || "", "personalSection.posterImage", "image/*")}
          </div>
        </div>`;
      bindInputs(area);
      return;
    }

    if (activeTab === "courses") {
      area.innerHTML = `
        <div class="cms-panel">
          <div class="cms-panel-head">
            <h3>Commercial Work Header</h3>
            <button type="button" class="btn-pill-orange" id="add-course-btn">+ Add Commercial Project</button>
          </div>
          <div class="cms-form-grid">
            <div class="cms-field"><label>Eyebrow</label><input data-bind="coursesSection.eyebrow" value="${esc(data.coursesSection.eyebrow)}" /></div>
            <div class="cms-field"><label>Heading</label><input data-bind="coursesSection.heading" value="${esc(data.coursesSection.heading)}" /></div>
            <div class="cms-field is-full"><label>Subtitle</label><input data-bind="coursesSection.subtitle" value="${esc(data.coursesSection.subtitle)}" /></div>
          </div>
        </div>
        ${data.coursesSection.items
          .map(
            (c, idx) => `
          <div class="cms-item-card">
            <div class="cms-item-top">
              <strong>${esc(c.title)}</strong>
              <button type="button" class="cms-danger-btn" data-del-course="${idx}">Delete</button>
            </div>
            <div class="cms-form-grid">
              <div class="cms-field"><label>Project Title</label><input data-bind="coursesSection.items.${idx}.title" value="${esc(c.title)}" /></div>
              <div class="cms-field">
                <label>Type</label>
                <select data-bind="coursesSection.items.${idx}.type">
                  <option value="REELS EDIT" ${c.type === "REELS EDIT" ? "selected" : ""}>REELS EDIT</option>
                  <option value="COMMERCIAL" ${c.type === "COMMERCIAL" ? "selected" : ""}>COMMERCIAL</option>
                  <option value="BRAND FILM" ${c.type === "BRAND FILM" ? "selected" : ""}>BRAND FILM</option>
                  <option value="CAMPAIGN" ${c.type === "CAMPAIGN" ? "selected" : ""}>CAMPAIGN</option>
                  <option value="SHORT FILM" ${c.type === "SHORT FILM" ? "selected" : ""}>SHORT FILM</option>
                </select>
              </div>
              <div class="cms-field"><label>Industry / Topic</label><input data-bind="coursesSection.items.${idx}.topic" value="${esc(c.topic)}" /></div>
              <div class="cms-field"><label>Client / Brand Name</label><input data-bind="coursesSection.items.${idx}.learners" value="${esc(c.learners)}" /></div>
              <div class="cms-field">
                <label class="cms-checkbox-row"><input type="checkbox" ${c.flagship ? "checked" : ""} data-toggle="coursesSection.items.${idx}.flagship" /> Show FEATURED Badge</label>
              </div>
              <div class="cms-field">
                <label class="cms-checkbox-row"><input type="checkbox" ${c.newlyLaunched ? "checked" : ""} data-toggle="coursesSection.items.${idx}.newlyLaunched" /> Show FEATURED WORK Strip</label>
              </div>
              <div class="cms-field is-full"><label>Summary</label><textarea rows="2" data-bind="coursesSection.items.${idx}.summary">${esc(c.summary)}</textarea></div>
              ${imageInputBlock("Cover Image or Reel Video (.jpg/.png/.mp4/.webm)", c.image, `coursesSection.items.${idx}.image`, "image/*,video/*")}
            </div>
          </div>`
          )
          .join("")}`;

      bindInputs(area);
      document.getElementById("add-course-btn").addEventListener("click", () => {
        data.coursesSection.items.unshift({
          id: "cw-" + Date.now(),
          title: "NEW COMMERCIAL PROJECT",
          type: "COMMERCIAL",
          topic: "Brand Film",
          flagship: false,
          newlyLaunched: true,
          rating: "5.0",
          learners: "CLIENT NAME",
          price: "Commercial",
          image: "assets/creator-studio.jpg",
          summary: "Describe the commercial deliverables and visual approach.",
          registerUrl: "#register"
        });
        markDirty();
        renderActiveTab();
      });
      area.querySelectorAll("[data-del-course]").forEach((btn) => {
        btn.addEventListener("click", () => {
          data.coursesSection.items.splice(Number(btn.dataset.delCourse), 1);
          markDirty();
          renderActiveTab();
        });
      });
      return;
    }

    if (activeTab === "essays") {
      area.innerHTML = `
        <div class="cms-panel">
          <div class="cms-panel-head">
            <h3>Field Photo-Essays</h3>
            <button type="button" class="btn-pill-orange" id="add-essay-btn">+ New Photo-Essay</button>
          </div>
          <p class="muted-copy" style="margin:0;">Displayed on the Photo-essays page in the top navigation.</p>
        </div>
        ${(data.photoEssays || [])
          .map(
            (e, idx) => `
          <div class="cms-item-card">
            <div class="cms-item-top">
              <strong>${esc(e.title)}</strong>
              <button type="button" class="cms-danger-btn" data-del-essay="${idx}">Delete</button>
            </div>
            <div class="cms-form-grid">
              <div class="cms-field"><label>Title</label><input data-bind="photoEssays.${idx}.title" value="${esc(e.title)}" /></div>
              <div class="cms-field"><label>Location</label><input data-bind="photoEssays.${idx}.location" value="${esc(e.location)}" /></div>
              <div class="cms-field"><label>Date</label><input data-bind="photoEssays.${idx}.date" value="${esc(e.date)}" /></div>
              <div class="cms-field"><label>Read Time</label><input data-bind="photoEssays.${idx}.readTime" value="${esc(e.readTime)}" /></div>
              <div class="cms-field is-full"><label>Excerpt</label><textarea rows="2" data-bind="photoEssays.${idx}.excerpt">${esc(e.excerpt)}</textarea></div>
              <div class="cms-field is-full"><label>Full Body (separate paragraphs with a blank line)</label><textarea rows="4" data-bind="photoEssays.${idx}.body">${esc(e.body)}</textarea></div>
              ${imageInputBlock("Cover Image", e.coverImage, `photoEssays.${idx}.coverImage`)}
            </div>
          </div>`
          )
          .join("")}`;

      bindInputs(area);
      document.getElementById("add-essay-btn").addEventListener("click", () => {
        data.photoEssays.unshift({
          id: "pe-" + Date.now(),
          title: "Untitled Field Dispatch",
          location: "India",
          date: "November 2026",
          readTime: "4 min read",
          coverImage: "assets/hero-doc.jpg",
          excerpt: "Short intro shown on the photo-essays grid.",
          body: "Write the full editorial dispatch here."
        });
        markDirty();
        renderActiveTab();
      });
      area.querySelectorAll("[data-del-essay]").forEach((btn) => {
        btn.addEventListener("click", () => {
          data.photoEssays.splice(Number(btn.dataset.delEssay), 1);
          markDirty();
          renderActiveTab();
        });
      });
      return;
    }

    if (activeTab === "vibe") {
      area.innerHTML = `
        <div class="cms-panel">
          <div class="cms-panel-head"><h3>Team Vibe Section Header</h3></div>
          <div class="cms-form-grid">
            <div class="cms-field"><label>Eyebrow</label><input data-bind="vibeSection.eyebrow" value="${esc(data.vibeSection.eyebrow)}" /></div>
            <div class="cms-field"><label>Heading</label><input data-bind="vibeSection.heading" value="${esc(data.vibeSection.heading)}" /></div>
            <div class="cms-field is-full"><label>Subtitle</label><input data-bind="vibeSection.subtitle" value="${esc(data.vibeSection.subtitle)}" /></div>
          </div>
        </div>
        ${(data.vibeSection.photos || [])
          .map(
            (p, idx) => `
          <div class="cms-item-card">
            <div class="cms-item-top"><strong>Bento Slot: ${esc(p.slot)}</strong></div>
            <div class="cms-form-grid">
              <div class="cms-field is-full"><label>Caption</label><input data-bind="vibeSection.photos.${idx}.caption" value="${esc(p.caption)}" /></div>
              ${imageInputBlock("Photo or Video (.jpg/.png/.mp4/.webm)", p.image, `vibeSection.photos.${idx}.image`, "image/*,video/*")}
            </div>
          </div>`
          )
          .join("")}`;
      bindInputs(area);
      return;
    }

    if (activeTab === "contact") {
      area.innerHTML = `
        <div class="cms-panel">
          <div class="cms-panel-head"><h3>Contact Section &amp; Emails</h3></div>
          <div class="cms-form-grid">
            <div class="cms-field"><label>Eyebrow</label><input data-bind="contactSection.eyebrow" value="${esc(data.contactSection.eyebrow)}" /></div>
            <div class="cms-field"><label>Heading</label><input data-bind="contactSection.heading" value="${esc(data.contactSection.heading)}" /></div>
            <div class="cms-field"><label>Brands Email</label><input data-bind="contactSection.brandsEmail" value="${esc(data.contactSection.brandsEmail)}" /></div>
            <div class="cms-field"><label>Creators Email</label><input data-bind="contactSection.creatorsEmail" value="${esc(data.contactSection.creatorsEmail)}" /></div>
          </div>
        </div>

        <div class="cms-panel">
          <div class="cms-panel-head">
            <h3>Open Career Roles</h3>
            <button type="button" class="btn-pill-orange" id="add-role-btn">+ Add Role</button>
          </div>
          ${(data.contactSection.openRoles || [])
            .map(
              (r, idx) => `
            <div class="cms-item-card">
              <div class="cms-item-top">
                <strong>${esc(r.title)}</strong>
                <button type="button" class="cms-danger-btn" data-del-role="${idx}">Delete</button>
              </div>
              <div class="cms-form-grid">
                <div class="cms-field"><label>Role Title</label><input data-bind="contactSection.openRoles.${idx}.title" value="${esc(r.title)}" /></div>
                <div class="cms-field"><label>Type / Location</label><input data-bind="contactSection.openRoles.${idx}.type" value="${esc(r.type)}" /></div>
                <div class="cms-field is-full"><label>Summary</label><input data-bind="contactSection.openRoles.${idx}.summary" value="${esc(r.summary)}" /></div>
              </div>
            </div>`
            )
            .join("")}
        </div>

        <div class="cms-panel">
          <div class="cms-panel-head"><h3>CMS Portal Credentials</h3></div>
          <div class="cms-form-grid">
            <div class="cms-field"><label>Admin Username</label><input data-bind="cmsSettings.adminUser" value="${esc(data.cmsSettings.adminUser)}" /></div>
            <div class="cms-field"><label>Admin Password</label><input data-bind="cmsSettings.adminPass" value="${esc(data.cmsSettings.adminPass)}" /></div>
          </div>
        </div>`;

      bindInputs(area);
      document.getElementById("add-role-btn").addEventListener("click", () => {
        data.contactSection.openRoles.push({
          id: "role-" + Date.now(),
          title: "Associate Producer",
          type: "Full-time · Remote",
          summary: "Coordinate field logistics, travel, and shoot schedules."
        });
        markDirty();
        renderActiveTab();
      });
      area.querySelectorAll("[data-del-role]").forEach((btn) => {
        btn.addEventListener("click", () => {
          data.contactSection.openRoles.splice(Number(btn.dataset.delRole), 1);
          markDirty();
          renderActiveTab();
        });
      });
      return;
    }

    if (activeTab === "inquiries") {
      const list = data.inquiries || [];
      area.innerHTML = `
        <div class="cms-panel">
          <div class="cms-panel-head">
            <h3>Submitted Inquiries &amp; Course Registrations (${list.length})</h3>
            ${list.length ? `<button type="button" class="cms-danger-btn" id="clear-inquiries-btn">Clear All</button>` : ""}
          </div>
          ${
            list.length
              ? list
                  .map(
                    (inq, idx) => `
                  <div class="cms-item-card">
                    <div class="cms-item-top">
                      <div>
                        <span class="eyebrow" style="margin:0;">${esc(inq.kind)} · ${esc(inq.subject || "")}</span>
                        <div><strong>${esc(inq.name)}</strong> (${esc(inq.email)})</div>
                      </div>
                      <button type="button" class="cms-danger-btn" data-del-inq="${idx}">Delete</button>
                    </div>
                    <p class="muted-copy" style="margin:0 0 6px;">${esc(inq.message || "No additional message.")}</p>
                    <small style="color:var(--text-dim);">${new Date(inq.createdAt).toLocaleString()}</small>
                  </div>`
                  )
                  .join("")
              : `<p class="muted-copy">No inquiries or course registrations yet. Test submitting one from the portfolio site!</p>`
          }
        </div>`;

      area.querySelectorAll("[data-del-inq]").forEach((btn) => {
        btn.addEventListener("click", () => {
          data.inquiries.splice(Number(btn.dataset.delInq), 1);
          markDirty();
          renderActiveTab();
        });
      });
      const clearBtn = document.getElementById("clear-inquiries-btn");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          data.inquiries = [];
          markDirty();
          renderActiveTab();
        });
      }
    }
  }

  function bindInputs(container) {
    container.querySelectorAll("[data-bind]").forEach((input) => {
      const eventName = input.tagName === "SELECT" ? "change" : "input";
      input.addEventListener(eventName, () => {
        let val = input.value;
        if (input.type === "number") val = parseFloat(val) || 0;
        setByPath(data, input.dataset.bind, val);
        markDirty();
      });
    });

    container.querySelectorAll("[data-toggle]").forEach((chk) => {
      chk.addEventListener("change", () => {
        setByPath(data, chk.dataset.toggle, chk.checked);
        markDirty();
      });
    });

    container.querySelectorAll("[data-upload-for]").forEach((fileInput) => {
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file) return;
        try {
          const url = await CmsStore.uploadImage(file);
          setByPath(data, fileInput.dataset.uploadFor, url);
          markDirty();
          renderActiveTab();
          showToast("Image uploaded! Click Save Changes to publish.");
        } catch (err) {
          showToast("Upload failed: " + err.message);
        }
      });
    });
  }

  async function saveAll() {
    const btn = document.getElementById("cms-save-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";
    try {
      const res = await CmsStore.saveContent(data);
      markDirty(false);
      showToast(
        res.persistedTo === "server"
          ? "Saved directly to data/cms-content.json!"
          : "Saved to browser storage (localStorage)."
      );
    } catch (err) {
      showToast("Error saving: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Changes";
    }
  }

  function showWorkspace() {
    document.getElementById("cms-login-screen").hidden = true;
    document.getElementById("cms-shell").hidden = false;
    renderActiveTab();
  }

  async function init() {
    data = await CmsStore.loadContent();
    const hasServer = await CmsStore.detectServer();
    const badge = document.getElementById("cms-mode-badge");
    badge.textContent = hasServer ? "Server JSON" : "Static Local";

    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      showWorkspace();
    }

    document.getElementById("cms-login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const u = document.getElementById("login-user").value.trim();
      const p = document.getElementById("login-pass").value;
      const expectedU = data.cmsSettings?.adminUser || "admin";
      const expectedP = data.cmsSettings?.adminPass || "creator2026";
      if (u === expectedU && p === expectedP) {
        sessionStorage.setItem(SESSION_KEY, "1");
        document.getElementById("cms-login-error").hidden = true;
        showWorkspace();
      } else {
        document.getElementById("cms-login-error").hidden = false;
      }
    });

    document.getElementById("cms-logout-btn").addEventListener("click", () => {
      sessionStorage.removeItem(SESSION_KEY);
      location.reload();
    });

    document.querySelectorAll(".cms-nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".cms-nav-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        activeTab = btn.dataset.tab;
        renderActiveTab();
      });
    });

    document.getElementById("cms-save-btn").addEventListener("click", saveAll);

    document.getElementById("cms-export-btn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cms-content.json";
      a.click();
      showToast("Exported cms-content.json");
    });

    document.getElementById("cms-import-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed.site || !parsed.hero) throw new Error("Invalid CMS JSON format.");
        data = parsed;
        await CmsStore.saveContent(data);
        markDirty(false);
        renderActiveTab();
        showToast("Imported and saved JSON content!");
      } catch (err) {
        showToast("Import failed: " + err.message);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
