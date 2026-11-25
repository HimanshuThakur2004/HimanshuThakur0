/**
 * Shared CMS Data Store for both the Public Portfolio and the CMS Admin Portal.
 * - Uses the local PowerShell CMS API (/api/content, /api/upload, /api/inquiries) when running via start-server.ps1.
 * - Gracefully falls back to data/cms-content.json + localStorage when hosted statically (Vercel/Netlify/file://).
 */
(function (global) {
  const STORAGE_KEY = "himanshu_portfolio_cms_v2";

  const FALLBACK_CONTENT = {
    site: {
      brandName: "Himanshu Thakur",
      logoImage: "assets/brand-logo.png",
      brandMarkTop: "HT",
      brandMarkSub: "VISUALS",
      watermarkText: "HIM",
      tagline: "EXPECT THE UNEXPECTED — visuals that tell a story with emotions",
      copyright: "© 2026 Himanshu Thakur. All rights reserved.",
      originNote: "Made in India.",
      defaultTheme: "dark",
      ctaLabel: "Explore Work",
      ctaTarget: "#learn",
      socials: {
        youtube: "https://youtube.com",
        instagram: "https://instagram.com",
        x: "https://x.com",
        linkedin: "https://linkedin.com",
        facebook: "https://facebook.com"
      }
    },
    hero: {
      headline: "EXPECT THE *UNEXPECTED*",
      subtitle: "Visuals that tell a story with emotions.",
      videoUrl: "",
      image: "assets/hero-doc.jpg",
      imageAlt: "Himanshu Thakur — Filmmaker & Visual Storyteller",
      aboutTitle: "About Me",
      aboutText: "Hi, I’m Himanshu Thakur, a visual storyteller who believes in creating emotions, not just videos.\n\nWith a commerce background, I studied at Shemford School in Kashipur and P.N.G. P.G. College in Ramnagar. I also spent two years working in the corporate world, where I learned a lot—but I realized I wanted to build a life around work that felt more creative and meaningful.\n\nThat journey led me to video creation: a way to tell stories, connect with people, and make every frame feel something. I believe life can take unexpected turns, and that’s what makes the journey exciting.\n\nExpect the unexpected."
    },
    aboutSection: {
      eyebrow: "WHO I AM",
      heading: "Himanshu *Thakur*",
      bio: "I craft emotion-driven visual stories, documentaries, commercial brand films, and atmospheric original cinema rooted in real human experiences.",
      portraitImage: "assets/creator-studio.jpg",
      portraitBadge: "WHO I AM",
      name: "Himanshu Thakur",
      profession: "Filmmaker, Visual Storyteller & Video Editor",
      education: "Filmmaking & Visual Storytelling (Update your degree / institute in CMS → About Me)",
      skills: "Cinematic Documentaries, Short Form Reels, Explainers, Visual Storytelling, Shortfilms, Video Editing, Direction",
      work: "Commercial films & reels for 16+ brands (Hero, Himgiri, JJM Hospital, VibeSoft, The Billes, Devsthali) & Original Series: MASAAN"
    },
    formatsSection: {
      eyebrow: "HOW I TELL MY STORIES",
      heading: "How I tell my stories",
      items: [
        { id: "fmt-1", title: "CINEMATIC DOCUMENTARIES", description: "Atmospheric, character-driven documentaries capturing raw human truth and emotion.", image: "assets/hero-doc.jpg", expanded: false },
        { id: "fmt-2", title: "SHORT FORM", description: "High-retention reels and vertical edits built to move audiences in under 60 seconds.", image: "assets/creator-studio.jpg", expanded: true },
        { id: "fmt-4", title: "STORY TELLING", description: "Emotion-first visual narratives crafted for brands, creators, and cinema.", image: "assets/creator-studio.jpg", expanded: false },
        { id: "fmt-5", title: "SHORTFILMS", description: "Independent narrative cinema exploring folklore, suspense, and human psychology.", image: "assets/hero-doc.jpg", expanded: false }
      ]
    },
    metrics: {
      eyebrow: "PORTFOLIO IMPACT",
      primaryNumber: "16",
      primarySuffix: "+",
      rows: [
        { label: "BRANDS COLLABORATED WITH", value: "16+" },
        { label: "COMMERCIAL CAMPAIGNS", value: "6+" }
      ]
    },
    brandsSection: {
      eyebrow: "TRUSTED BY",
      heading: "Brands I have worked with",
      items: []
    },
    personalSection: {
      eyebrow: "WHAT I HAVE CREATED PERSONALLY",
      title: "MASAAN - SERIES",
      subtitle: "A Folk Horror / Psychological Thriller",
      genre: "Folk Horror, Supernatural Horror, Psychological Thriller, Mystery & Drama",
      videoUrl: "",
      posterImage: "assets/hero-doc.jpg",
      statusBadge: "ORIGINAL SERIES",
      description: "",
      ctaLabel: "▶ Watch Teaser",
      ctaUrl: "https://youtube.com"
    },
    coursesSection: {
      eyebrow: "COMMERCIAL WORK",
      heading: "Commercial work",
      subtitle: "Selected reels edits, brand campaigns, and commercial visual productions.",
      items: []
    },
    photoEssays: [],
    vibeSection: {
      eyebrow: "SEE WHAT'S BEHIND THE CAMERA",
      heading: "Behind the scene, making of video & bloopers",
      subtitle: "Behind the scene, making of video, bloopers, random stuff — unfiltered moments from every shoot.",
      photos: []
    },
    contactSection: {
      eyebrow: "CONTACT ME",
      heading: "Let's make something",
      brandsEmail: "brands@himanshuthakur.in",
      creatorsEmail: "creators@himanshuthakur.in",
      cards: [],
      openRoles: []
    },
    cmsSettings: {
      adminUser: "admin",
      adminPass: "creator2026"
    },
    inquiries: []
  };

  let serverAvailable = null;

  async function detectServer() {
    if (serverAvailable !== null) return serverAvailable;
    if (window.location.protocol === "file:") {
      serverAvailable = false;
      return false;
    }
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      serverAvailable = res.ok;
    } catch {
      serverAvailable = false;
    }
    return serverAvailable;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  async function loadContent() {
    const hasServer = await detectServer();
    if (hasServer) {
      try {
        const res = await fetch("/api/content", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn("API fetch failed, falling back:", err);
      }
    }

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    try {
      const res = await fetch("data/cms-content.json", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch {}

    return clone(FALLBACK_CONTENT);
  }

  async function saveContent(content) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    const hasServer = await detectServer();
    if (hasServer) {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content, null, 2)
      });
      if (!res.ok) {
        throw new Error("Server failed to save CMS content.");
      }
      return { persistedTo: "server" };
    }
    return { persistedTo: "localStorage" };
  }

  async function submitInquiry(entry) {
    const payload = {
      id: "inq-" + Date.now(),
      createdAt: new Date().toISOString(),
      ...entry
    };

    const hasServer = await detectServer();
    if (hasServer) {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) return { persistedTo: "server", entry: payload };
    }

    const current = await loadContent();
    current.inquiries = [payload, ...(current.inquiries || [])];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return { persistedTo: "localStorage", entry: payload };
  }

  async function uploadImage(file) {
    const hasServer = await detectServer();
    if (hasServer) {
      const res = await fetch("/api/upload-raw", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name)
        },
        body: file
      });
      if (res.ok) {
        const json = await res.json();
        return json.url;
      }
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return dataUrl;
  }

  async function resetToFileDefaults() {
    localStorage.removeItem(STORAGE_KEY);
    const res = await fetch("data/cms-content.json", { cache: "no-store" });
    if (res.ok) {
      const defaults = await res.json();
      await saveContent(defaults);
      return defaults;
    }
    return clone(FALLBACK_CONTENT);
  }

  global.CmsStore = {
    detectServer,
    loadContent,
    saveContent,
    submitInquiry,
    uploadImage,
    resetToFileDefaults,
    STORAGE_KEY
  };
})(window);
