/**
 * Server-Side HTML Rendering Engine for KevalonTap Public Digital Profiles
 * Premium Dark Obsidian & Cyan Theme matching KevalonTap Digital Business Cards
 * Strict Conditional Rendering: Sections and rows are ONLY shown if data exists.
 */

function sanitizeHtml(str = '') {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasValue(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val).length > 0;
  return Boolean(val);
}

const ICONS = {
  phone: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>`,
  whatsapp: `<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1 .587 1.815.883 2.806.883 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.385-.453-4.821-1.246l-5.179 1.36 1.385-5.053c-.886-1.501-1.385-3.248-1.385-5.061 0-5.519 4.481-10 10-10 5.519 0 10 4.481 10 10z"/></svg>`,
  mail: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
  mapPin: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  globe: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9m0-18a15.3 15.3 0 00-4 9 15.3 15.3 0 004 9"/></svg>`,
  download: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>`,
  share: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>`,
  externalLink: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>`,
  fileText: `<svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
  creditCard: `<svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>`,
  chevronDown: `<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`,
  linkedin: `<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`,
  instagram: `<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  facebook: `<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.6 5H18V0h-3.808C10.596 0 9 1.583 9 4.615V8z"/></svg>`,
  youtube: `<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  twitter: `<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  github: `<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`,
};

function getCleanPhone(phone = '') {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) return `91${cleaned}`;
  return cleaned;
}

/**
 * Generates dynamic color palette, glowing gradients, rgba tints, and contrast text based on user-selected theme color
 */
export function getThemePalette(color) {
  const fallback = '#034665';
  let hex =
    color && typeof color === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(color.trim())
      ? color.trim()
      : fallback;

  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }

  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;

  const rgba = (alpha) => `rgba(${r}, ${g}, ${b}, ${alpha})`;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const isLight = luminance > 0.55;
  const buttonText = isLight ? '#06080d' : '#ffffff';

  const lighten = (factor = 0.35) => {
    const nr = Math.min(255, Math.round(r + (255 - r) * factor));
    const ng = Math.min(255, Math.round(g + (255 - g) * factor));
    const nb = Math.min(255, Math.round(b + (255 - b) * factor));
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  };

  const primaryLight = lighten(0.35);

  return {
    primary: hex,
    primaryLight,
    rgba,
    isLight,
    buttonText,
    gradient: `linear-gradient(135deg, ${hex}, ${primaryLight})`,
    glowShadow: `0 10px 25px -5px ${rgba(0.45)}`,
  };
}

function resolveMedia(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Render the Complete Ultra-Premium KevalonTap Digital Business Card HTML
 * Matches user's exact uploaded design with dynamic theme color selected by the user
 */
export function renderProfileHtml({ profile, publicUrl, vcfUrl }) {
  const theme = getThemePalette(profile.themeColor);
  const name = sanitizeHtml(profile.fullName || profile.username);
  const designation = sanitizeHtml(profile.designation || '');
  const companyName = sanitizeHtml(profile.companyName || '');
  const companyLogo = resolveMedia(profile.companyLogo);
  const industry = sanitizeHtml(profile.industry || '');
  const bio = sanitizeHtml(profile.bio || '');
  const photo = resolveMedia(profile.profilePhoto);
  const initials = (name.charAt(0) || 'T').toUpperCase();

  // Contact Details
  const mobile = profile.mobileNumber ? profile.mobileNumber.trim() : '';
  const cleanMobile = getCleanPhone(mobile);
  const whatsapp = profile.whatsappNumber ? profile.whatsappNumber.trim() : '';
  const cleanWhatsapp = getCleanPhone(whatsapp || mobile);
  const altPhone = profile.alternatePhone ? profile.alternatePhone.trim() : '';
  const email1 = sanitizeHtml(profile.email1 || '');
  const email2 = sanitizeHtml(profile.email2 || '');
  const website = profile.companyWebsite ? profile.companyWebsite.trim() : '';
  const address = sanitizeHtml(profile.companyAddress || '');
  const mapsUrl = profile.googleMapsLocation ? profile.googleMapsLocation.trim() : '';

  // Social Links
  const social = profile.socialLinks || {};

  // Formatted Services string for Company card row
  let servicesSummary = '';
  if (Array.isArray(profile.services) && profile.services.length > 0) {
    servicesSummary = profile.services
      .map((s) => (typeof s === 'string' ? s : s.title))
      .filter(Boolean)
      .join(' | ');
  } else if (typeof profile.services === 'string' && profile.services.trim().length > 0) {
    servicesSummary = profile.services.trim();
  }

  // Determine which sections have data
  const hasCompanyInfo = Boolean(companyName || servicesSummary || industry);
  const hasBio = Boolean(bio);
  const hasSocial = Boolean(
    social.whatsapp ||
    social.instagram ||
    social.facebook ||
    social.linkedIn ||
    social.twitter ||
    social.googleReview ||
    social.youtube ||
    social.github ||
    social.portfolio ||
    (Array.isArray(social.customLinks) && social.customLinks.length > 0)
  );

  // Build list of valid REACH ME items
  const reachMeItems = [];
  if (mobile) {
    reachMeItems.push({
      icon: ICONS.phone,
      text: mobile,
      link: `tel:${cleanMobile || mobile}`,
      isExternal: false,
    });
  }
  if (altPhone && altPhone !== mobile) {
    reachMeItems.push({
      icon: ICONS.phone,
      text: altPhone,
      link: `tel:${getCleanPhone(altPhone) || altPhone}`,
      isExternal: false,
    });
  }
  if (whatsapp && !mobile) {
    reachMeItems.push({
      icon: ICONS.whatsapp,
      text: whatsapp,
      link: `https://wa.me/${cleanWhatsapp}`,
      isExternal: true,
    });
  }
  if (email1) {
    reachMeItems.push({
      icon: ICONS.mail,
      text: email1,
      link: `mailto:${email1}`,
      isExternal: false,
    });
  }
  if (email2 && email2 !== email1) {
    reachMeItems.push({
      icon: ICONS.mail,
      text: email2,
      link: `mailto:${email2}`,
      isExternal: false,
    });
  }
  if (website) {
    const formattedWeb = website.startsWith('http') ? website : `https://${website}`;
    reachMeItems.push({
      icon: ICONS.globe,
      text: website,
      link: formattedWeb,
      isExternal: true,
    });
  }
  if (address || mapsUrl) {
    reachMeItems.push({
      icon: ICONS.mapPin,
      text: address || 'View Location on Google Maps',
      link: mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      isExternal: true,
    });
  }
  const hasReachMe = reachMeItems.length > 0;

  // Check additional items
  const hasDetailedServices = Array.isArray(profile.services) && profile.services.some((s) => s.description || s.price);
  const hasProducts = Array.isArray(profile.products) && profile.products.length > 0;
  const hasPortfolio = Array.isArray(profile.portfolioItems) && profile.portfolioItems.length > 0;
  const hasGallery = Array.isArray(profile.imageGallery) && profile.imageGallery.length > 0;
  const hasBrochure = Boolean(profile.brochureUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${name} | KevalonTap Digital Profile</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${name} | KevalonTap Digital Business Card">
  <meta name="description" content="${bio ? bio.substring(0, 160) : `${name} - ${designation} at ${companyName}`}">
  
  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${publicUrl}">
  <meta property="og:title" content="${name} - ${designation}">
  <meta property="og:description" content="${bio ? bio.substring(0, 160) : `Connect with ${name}`}">
  ${photo ? `<meta property="og:image" content="${photo}">` : ''}

  <!-- Google Fonts & Tailwind CSS -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  
  <style>
    :root {
      --theme-primary: ${theme.primary};
      --theme-glow: ${theme.rgba(0.4)};
      --theme-btn-text: ${theme.buttonText};
    }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: transparent;
      background-color: #06080d;
    }
    ::selection {
      background-color: ${theme.primary};
      color: ${theme.buttonText};
    }
    .custom-scrollbar::-webkit-scrollbar { display: none; }
    .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="text-slate-100 min-h-screen flex justify-center pb-28">
  
  <!-- Mobile Container (Max Width 420px) -->
  <div class="w-full max-w-[420px] min-h-screen relative flex flex-col justify-between px-4 pt-4 pb-6 space-y-4">
    
    <div class="space-y-4">
      
      <!-- 1. Top Profile Portrait Card -->
      <div class="relative w-full rounded-[28px] overflow-hidden bg-[#0d121d] border shadow-2xl" style="border-color: ${theme.rgba(0.2)};">
        <div class="relative w-full aspect-[4/4.8] overflow-hidden bg-[#0a0e17] flex items-center justify-center">
          ${
            photo
              ? `<img src="${photo}" alt="${name}" class="w-full h-full object-cover object-top" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                 <div class="w-full h-full hidden items-center justify-center text-6xl font-black" style="background: ${theme.gradient}; color: ${theme.buttonText};">${initials}</div>`
              : `<div class="w-full h-full flex items-center justify-center text-6xl font-black" style="background: ${theme.gradient}; color: ${theme.buttonText};">${initials}</div>`
          }

          <!-- Floating Company Logo Badge (Top Right) -->
          ${
            companyLogo
              ? `<div class="absolute top-4 right-4 w-12 h-12 rounded-full p-1 bg-white/15 backdrop-blur-md border border-white/25 shadow-xl flex items-center justify-center overflow-hidden">
                   <img src="${companyLogo}" alt="Company Logo" class="w-full h-full object-contain rounded-full" />
                 </div>`
              : ''
          }

          <!-- Bottom Text Overlay with Gradient Fade -->
          <div class="absolute inset-x-0 bottom-0 pt-24 pb-4 px-4 bg-gradient-to-t from-[#06080d] via-[#06080d]/85 to-transparent text-center space-y-1">
            <h1 class="text-xl sm:text-2xl font-black text-white tracking-wide uppercase font-sans drop-shadow-md">
              ${name}
            </h1>
            ${
              designation
                ? `<p class="text-[11px] font-bold tracking-wider uppercase drop-shadow-sm font-sans" style="color: ${theme.primary};">
                     ${designation}
                   </p>`
                : ''
            }
          </div>
        </div>
      </div>

      <!-- 2. Company & Services Card (ONLY shown if details exist) -->
      ${
        hasCompanyInfo
          ? `<div class="rounded-2xl bg-[#0f1420] border border-slate-800/80 p-4 space-y-3 shadow-lg">
              ${
                companyName
                  ? `<div class="flex items-center justify-between gap-3 text-xs ${servicesSummary || industry ? 'border-b border-slate-800/60 pb-3' : ''}">
                       <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 shrink-0">COMPANY</span>
                       <div class="flex items-center gap-2 font-bold text-white text-right">
                         ${companyLogo ? `<img src="${companyLogo}" class="w-4 h-4 rounded-full object-contain" />` : ''}
                         <span class="truncate">${companyName}</span>
                       </div>
                     </div>`
                  : ''
              }

              ${
                servicesSummary
                  ? `<div class="flex items-start justify-between gap-3 text-xs ${industry ? 'border-b border-slate-800/60 pb-3' : ''}">
                       <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 shrink-0 pt-0.5">SERVICES</span>
                       <p class="text-xs font-semibold text-slate-200 text-right leading-relaxed max-w-[70%]">
                         ${sanitizeHtml(servicesSummary)}
                       </p>
                     </div>`
                  : ''
              }

              ${
                industry
                  ? `<div class="flex items-center justify-between gap-3 text-xs">
                       <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 shrink-0">INDUSTRY</span>
                       <span class="text-xs font-semibold text-slate-200 text-right truncate">${industry}</span>
                     </div>`
                  : ''
              }
            </div>`
          : ''
      }

      <!-- 3. Professional Bio Card (ONLY shown if bio exists) -->
      ${
        hasBio
          ? `<div class="rounded-2xl bg-[#0f1420] border border-slate-800/80 p-4 shadow-lg">
               <p class="text-xs font-medium text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                 ${bio}
               </p>
             </div>`
          : ''
      }

      <!-- 4. CONNECT Section (ONLY shown if at least one social link exists) -->
      ${
        hasSocial
          ? `<div class="space-y-2.5 pt-1">
               <div class="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style="color: ${theme.primary};">
                 <span class="text-sm font-black">#</span>
                 <span>CONNECT</span>
               </div>
               
               <div class="grid grid-cols-4 gap-2 text-xs">
                 ${
                   whatsapp || mobile
                     ? `<a href="https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`Hi ${name}, I connected with you via your KevalonTap profile.`)}" target="_blank" rel="noopener noreferrer" class="aspect-square rounded-2xl bg-[#0f1420] border border-slate-800 flex items-center justify-center text-white active:scale-95 transition-all shadow-md group" onmouseenter="this.style.borderColor='${theme.primary}'; this.style.boxShadow='0 0 14px ${theme.rgba(0.35)}';" onmouseleave="this.style.borderColor='rgb(30 41 59)'; this.style.boxShadow='none';" title="WhatsApp">
                          <div class="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            ${ICONS.whatsapp}
                          </div>
                        </a>`
                     : ''
                 }

                 ${
                   social.instagram
                     ? `<a href="${social.instagram}" target="_blank" rel="noopener noreferrer" class="aspect-square rounded-2xl bg-[#0f1420] border border-slate-800 flex items-center justify-center text-white active:scale-95 transition-all shadow-md group" onmouseenter="this.style.borderColor='${theme.primary}'; this.style.boxShadow='0 0 14px ${theme.rgba(0.35)}';" onmouseleave="this.style.borderColor='rgb(30 41 59)'; this.style.boxShadow='none';" title="Instagram">
                          <div class="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            ${ICONS.instagram}
                          </div>
                        </a>`
                     : ''
                 }

                 ${
                   social.facebook
                     ? `<a href="${social.facebook}" target="_blank" rel="noopener noreferrer" class="aspect-square rounded-2xl bg-[#0f1420] border border-slate-800 flex items-center justify-center text-white active:scale-95 transition-all shadow-md group" onmouseenter="this.style.borderColor='${theme.primary}'; this.style.boxShadow='0 0 14px ${theme.rgba(0.35)}';" onmouseleave="this.style.borderColor='rgb(30 41 59)'; this.style.boxShadow='none';" title="Facebook">
                          <div class="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            ${ICONS.facebook}
                          </div>
                        </a>`
                     : ''
                 }

                 ${
                   social.linkedIn
                     ? `<a href="${social.linkedIn}" target="_blank" rel="noopener noreferrer" class="aspect-square rounded-2xl bg-[#0f1420] border border-slate-800 flex items-center justify-center text-white active:scale-95 transition-all shadow-md group" onmouseenter="this.style.borderColor='${theme.primary}'; this.style.boxShadow='0 0 14px ${theme.rgba(0.35)}';" onmouseleave="this.style.borderColor='rgb(30 41 59)'; this.style.boxShadow='none';" title="LinkedIn">
                          <div class="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            ${ICONS.linkedin}
                          </div>
                        </a>`
                     : ''
                 }

                 ${
                   social.twitter
                     ? `<a href="${social.twitter}" target="_blank" rel="noopener noreferrer" class="aspect-square rounded-2xl bg-[#0f1420] border border-slate-800 flex items-center justify-center text-white active:scale-95 transition-all shadow-md group" onmouseenter="this.style.borderColor='${theme.primary}'; this.style.boxShadow='0 0 14px ${theme.rgba(0.35)}';" onmouseleave="this.style.borderColor='rgb(30 41 59)'; this.style.boxShadow='none';" title="X (Twitter)">
                          <div class="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            ${ICONS.twitter}
                          </div>
                        </a>`
                     : ''
                 }

                 ${
                   social.googleReview
                     ? `<a href="${social.googleReview}" target="_blank" rel="noopener noreferrer" class="aspect-square rounded-2xl bg-[#0f1420] border border-slate-800 flex items-center justify-center text-white active:scale-95 transition-all shadow-md group" onmouseenter="this.style.borderColor='${theme.primary}'; this.style.boxShadow='0 0 14px ${theme.rgba(0.35)}';" onmouseleave="this.style.borderColor='rgb(30 41 59)'; this.style.boxShadow='none';" title="Google Review">
                          <span class="font-black text-lg" style="color: ${theme.primary};">G</span>
                        </a>`
                     : ''
                 }

                 ${
                   social.youtube
                     ? `<a href="${social.youtube}" target="_blank" rel="noopener noreferrer" class="aspect-square rounded-2xl bg-[#0f1420] border border-slate-800 flex items-center justify-center text-white active:scale-95 transition-all shadow-md group" onmouseenter="this.style.borderColor='${theme.primary}'; this.style.boxShadow='0 0 14px ${theme.rgba(0.35)}';" onmouseleave="this.style.borderColor='rgb(30 41 59)'; this.style.boxShadow='none';" title="YouTube">
                          <div class="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            ${ICONS.youtube}
                          </div>
                        </a>`
                     : ''
                 }

                 ${
                   social.github
                     ? `<a href="${social.github}" target="_blank" rel="noopener noreferrer" class="aspect-square rounded-2xl bg-[#0f1420] border border-slate-800 flex items-center justify-center text-white active:scale-95 transition-all shadow-md group" onmouseenter="this.style.borderColor='${theme.primary}'; this.style.boxShadow='0 0 14px ${theme.rgba(0.35)}';" onmouseleave="this.style.borderColor='rgb(30 41 59)'; this.style.boxShadow='none';" title="GitHub">
                          <div class="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            ${ICONS.github}
                          </div>
                        </a>`
                     : ''
                 }

                 ${
                   social.portfolio
                     ? `<a href="${social.portfolio}" target="_blank" rel="noopener noreferrer" class="aspect-square rounded-2xl bg-[#0f1420] border border-slate-800 flex items-center justify-center text-white active:scale-95 transition-all shadow-md group" onmouseenter="this.style.borderColor='${theme.primary}'; this.style.boxShadow='0 0 14px ${theme.rgba(0.35)}';" onmouseleave="this.style.borderColor='rgb(30 41 59)'; this.style.boxShadow='none';" title="Portfolio">
                          <div class="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            ${ICONS.globe}
                          </div>
                        </a>`
                     : ''
                 }

                 ${
                   Array.isArray(social.customLinks)
                     ? social.customLinks
                         .map(
                           (c) =>
                             `<a href="${c.url}" target="_blank" rel="noopener noreferrer" class="aspect-square rounded-2xl bg-[#0f1420] border border-slate-800 flex flex-col items-center justify-center text-white active:scale-95 transition-all shadow-md group p-1" onmouseenter="this.style.borderColor='${theme.primary}'; this.style.boxShadow='0 0 14px ${theme.rgba(0.35)}';" onmouseleave="this.style.borderColor='rgb(30 41 59)'; this.style.boxShadow='none';" title="${sanitizeHtml(c.label)}">
                                ${ICONS.externalLink}
                                <span class="text-[8px] font-bold truncate max-w-full mt-0.5">${sanitizeHtml(c.label)}</span>
                              </a>`
                         )
                         .join('')
                     : ''
                 }
               </div>
             </div>`
          : ''
      }

      <!-- 5. REACH ME Section (ONLY shown if contact data exists) -->
      ${
        hasReachMe
          ? `<div class="space-y-2.5 pt-1">
               <div class="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style="color: ${theme.primary};">
                 <span class="w-2.5 h-2.5 rounded-sm inline-block" style="background-color: ${theme.rgba(0.2)}; border: 1px solid ${theme.primary};"></span>
                 <span>REACH ME</span>
               </div>

               <div class="rounded-2xl bg-[#0f1420] border border-slate-800/80 p-4 shadow-lg">
                 <div class="flex gap-3.5 items-stretch">
                   <!-- Left Connected Pill Enclosing All Icons -->
                   <div class="rounded-full border-2 border-white/25 bg-white/5 py-3 px-1.5 flex flex-col items-center justify-around space-y-4 shrink-0 shadow-inner">
                     ${reachMeItems.map((item) => `<div class="w-5 h-5 flex items-center justify-center text-white">${item.icon}</div>`).join('')}
                   </div>

                   <!-- Right Details List -->
                   <div class="flex flex-col justify-around space-y-4 flex-1 min-w-0">
                     ${reachMeItems
                       .map(
                         (item) => `
                         <a href="${item.link}" ${item.isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''} class="text-xs font-semibold text-slate-200 transition-colors break-words leading-tight" onmouseenter="this.style.color='${theme.primary}';" onmouseleave="this.style.color='rgb(226 232 240)';">
                           ${item.text}
                         </a>`
                       )
                       .join('')}
                   </div>
                 </div>
               </div>
             </div>`
          : ''
      }

      <!-- 6. Detailed Services (Optional: ONLY shown if description or price exists) -->
      ${
        hasDetailedServices
          ? `<div class="rounded-2xl bg-[#0f1420] border border-slate-800/80 p-4 space-y-2.5 shadow-lg">
               <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Detailed Services</h3>
               <div class="space-y-2">
                 ${profile.services
                   .map(
                     (srv) => `
                     <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                       <div class="flex items-center justify-between">
                         <h4 class="font-bold text-white text-xs">${sanitizeHtml(srv.title)}</h4>
                         ${srv.price ? `<span class="text-xs font-bold" style="color: ${theme.primary};">${sanitizeHtml(srv.price)}</span>` : ''}
                       </div>
                       ${srv.description ? `<p class="text-[11px] text-slate-400 leading-relaxed">${sanitizeHtml(srv.description)}</p>` : ''}
                     </div>`
                   )
                   .join('')}
               </div>
             </div>`
          : ''
      }

      <!-- 7. Products (ONLY shown if products exist) -->
      ${
        hasProducts
          ? `<div class="rounded-2xl bg-[#0f1420] border border-slate-800/80 p-4 space-y-2.5 shadow-lg">
               <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Products</h3>
               <div class="grid grid-cols-2 gap-2.5">
                 ${profile.products
                   .map(
                     (prd) => `
                     <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                       ${prd.image ? `<div class="aspect-square rounded-lg bg-black/40 overflow-hidden border border-slate-800"><img src="${resolveMedia(prd.image)}" alt="${sanitizeHtml(prd.name)}" class="w-full h-full object-cover" /></div>` : ''}
                       <h4 class="font-bold text-white text-xs truncate">${sanitizeHtml(prd.name)}</h4>
                       ${prd.price ? `<p class="text-xs font-bold" style="color: ${theme.primary};">${sanitizeHtml(prd.price)}</p>` : ''}
                       ${prd.link ? `<a href="${prd.link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[10px] font-bold hover:underline" style="color: ${theme.primary};"><span>View</span>${ICONS.externalLink}</a>` : ''}
                     </div>`
                   )
                   .join('')}
               </div>
             </div>`
          : ''
      }

      <!-- 8. Portfolio (ONLY shown if portfolio exists) -->
      ${
        hasPortfolio
          ? `<div class="rounded-2xl bg-[#0f1420] border border-slate-800/80 p-4 space-y-2.5 shadow-lg">
               <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Portfolio</h3>
               <div class="space-y-2.5">
                 ${profile.portfolioItems
                   .map(
                     (port) => `
                     <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                       ${port.image ? `<div class="h-28 rounded-lg bg-black/40 overflow-hidden border border-slate-800"><img src="${resolveMedia(port.image)}" alt="${sanitizeHtml(port.title)}" class="w-full h-full object-cover" /></div>` : ''}
                       <div class="flex items-center justify-between">
                         <h4 class="font-bold text-white text-xs">${sanitizeHtml(port.title)}</h4>
                         ${port.link ? `<a href="${port.link}" target="_blank" rel="noopener noreferrer" class="text-xs font-bold hover:underline flex items-center gap-1" style="color: ${theme.primary};"><span>View</span>${ICONS.externalLink}</a>` : ''}
                       </div>
                       ${port.description ? `<p class="text-[11px] text-slate-400">${sanitizeHtml(port.description)}</p>` : ''}
                     </div>`
                   )
                   .join('')}
               </div>
             </div>`
          : ''
      }

      <!-- 9. Photo Gallery (ONLY shown if images exist) -->
      ${
        hasGallery
          ? `<div class="rounded-2xl bg-[#0f1420] border border-slate-800/80 p-4 space-y-2.5 shadow-lg">
               <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Photo Gallery</h3>
               <div class="grid grid-cols-3 gap-2">
                 ${profile.imageGallery
                   .map(
                     (img) => `
                     <div class="aspect-square rounded-xl bg-black/40 overflow-hidden border border-slate-800">
                       <img src="${resolveMedia(img.url)}" alt="${sanitizeHtml(img.caption || 'Gallery')}" class="w-full h-full object-cover hover:scale-105 transition-transform" />
                     </div>`
                   )
                   .join('')}
               </div>
             </div>`
          : ''
      }

      <!-- 10. Brochure PDF Download (ONLY shown if brochure exists) -->
      ${
        hasBrochure
          ? `<div class="rounded-2xl bg-[#0f1420] border border-slate-800/80 p-4 shadow-lg">
               <a href="${resolveMedia(profile.brochureUrl)}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between text-white group">
                 <div class="flex items-center gap-3">
                   <div style="color: ${theme.primary};">${ICONS.fileText}</div>
                   <div>
                     <h4 class="font-bold text-xs transition-colors" style="color: ${theme.primary};">Download Company Brochure</h4>
                     <p class="text-[10px] text-slate-400">Official PDF specifications</p>
                   </div>
                 </div>
                 <div class="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform" style="background-color: ${theme.rgba(0.12)}; border: 1px solid ${theme.rgba(0.25)}; color: ${theme.primary};">
                   ${ICONS.download}
                 </div>
               </a>
             </div>`
          : ''
      }

      <!-- 11. Payment Options Accordion (Collapsible) -->
      <div class="rounded-2xl bg-[#0f1420] border border-slate-800/80 overflow-hidden shadow-lg">
        <button type="button" onclick="document.getElementById('payment-accordion-body').classList.toggle('hidden');" class="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-white/5 transition-colors">
          <div class="flex items-center gap-2.5">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background-color: ${theme.rgba(0.15)}; border: 1px solid ${theme.rgba(0.3)}; color: ${theme.primary};">
              ${ICONS.creditCard}
            </span>
            <span class="text-xs font-bold text-white">Payment Options</span>
          </div>
          ${ICONS.chevronDown}
        </button>
        <div id="payment-accordion-body" class="hidden p-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-2">
          <p class="text-[11px] text-slate-400">UPI & Direct Bank Transfer available upon inquiry.</p>
          ${mobile ? `<p class="font-mono text-xs" style="color: ${theme.primary};">UPI: ${mobile}@upi</p>` : ''}
        </div>
      </div>

    </div>

    <!-- 12. Footer Branding & App Badges -->
    <div class="pt-6 pb-2 text-center space-y-4">
      <!-- KevalonTap Logo with Gradient -->
      <div class="flex items-center justify-center gap-1.5">
        <a href="https://kevalon.com" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-base font-black tracking-wide">
          <span class="font-extrabold text-lg" style="color: ${theme.primary};">⚡</span>
          <span class="text-white">KevalonTap</span><span class="text-[10px] -mt-2" style="color: ${theme.primary};">®</span>
        </a>
      </div>

      <!-- App Badges -->
      <div class="flex items-center justify-center gap-3">
        <!-- Google Play Badge -->
        <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-[#0f1420] border border-slate-800 hover:border-slate-700 flex items-center gap-2 text-left transition-colors">
          <svg class="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24"><path d="M3.609 1.814L13.792 12 3.61 22.186a1.59 1.59 0 0 1-.61-.955V2.77c0-.395.228-.737.609-.956zm11.233 11.235l2.25 2.25-11.85 6.842 9.6-9.092zm0-2.098L5.242 1.859l11.85 6.842-2.25 2.25zm1.507 1.05l4.088 2.36a1.2 1.2 0 0 1 0 2.08l-4.088 2.36-1.89-1.89 1.89-2.91z"/></svg>
          <div>
            <div class="text-[7px] text-slate-400 uppercase font-bold leading-none">GET IT ON</div>
            <div class="text-[10px] text-white font-bold leading-tight">Google Play</div>
          </div>
        </a>

        <!-- App Store Badge -->
        <a href="https://apple.com" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-[#0f1420] border border-slate-800 hover:border-slate-700 flex items-center gap-2 text-left transition-colors">
          <svg class="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.54c.64-.78 1.08-1.86.96-2.95-1 .04-2.14.65-2.79 1.43-.57.67-.98 1.76-.85 2.81 1.11.09 2.04-.51 2.68-1.29z"/></svg>
          <div>
            <div class="text-[7px] text-slate-400 leading-none">Download on the</div>
            <div class="text-[10px] text-white font-bold leading-tight">App Store</div>
          </div>
        </a>
      </div>
    </div>

  </div>

  <!-- 14. Fixed Floating Action Bar (Bottom of Screen) -->
  <div class="fixed bottom-0 inset-x-0 max-w-[420px] mx-auto p-3.5 bg-[#06080d]/90 backdrop-blur-xl border-t border-slate-800/80 flex items-center gap-3 z-50">
    <!-- Save Contact Button (Dynamic Theme Gradient) -->
    <a href="${vcfUrl}" download class="flex-1 py-3 px-4 rounded-full font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer" style="background: ${theme.gradient}; color: ${theme.buttonText}; box-shadow: ${theme.glowShadow};">
      ${ICONS.download}
      <span>Save Contact</span>
    </a>

    <!-- Share Contact Button (Dark Obsidian Pill) -->
    <button type="button" id="share-contact-btn" class="flex-1 py-3 px-4 rounded-full font-black text-xs text-white bg-[#101522] border border-slate-700/80 hover:bg-[#182033] active:scale-95 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md">
      ${ICONS.share}
      <span>Share Contact</span>
    </button>
  </div>

  <!-- Toast Notification Container -->
  <div id="toast-notify" class="fixed top-5 inset-x-0 max-w-xs mx-auto px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl text-center transition-all opacity-0 pointer-events-none transform -translate-y-4 z-50" style="background-color: ${theme.primary}; color: ${theme.buttonText};">
    Link copied to clipboard!
  </div>

  <!-- Client-side Interactive Scripts -->
  <script>
    (function() {
      const username = '${profile.username}';
      const shareUrl = '${publicUrl}';
      const shareTitle = '${name} | KevalonTap Digital Business Card';

      // 1. Auto track profile view
      try {
        fetch('/api/public/profile/' + username + '/track-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralSource: 'direct' })
        }).catch(() => {});
      } catch (e) {}

      // 2. Share Contact Button
      const shareBtn = document.getElementById('share-contact-btn');
      const toast = document.getElementById('toast-notify');

      function showToast(msg) {
        if (!toast) return;
        toast.innerText = msg;
        toast.classList.remove('opacity-0', '-translate-y-4', 'pointer-events-none');
        toast.classList.add('opacity-100', 'translate-y-0');
        setTimeout(() => {
          toast.classList.remove('opacity-100', 'translate-y-0');
          toast.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
        }, 2500);
      }

      if (shareBtn) {
        shareBtn.addEventListener('click', async function() {
          if (navigator.share) {
            try {
              await navigator.share({
                title: shareTitle,
                text: 'Connect with ' + '${name}' + ' on KevalonTap:',
                url: shareUrl
              });
            } catch (err) {}
          } else {
            try {
              await navigator.clipboard.writeText(shareUrl);
              showToast('Profile link copied to clipboard!');
            } catch (err) {
              showToast('Share: ' + shareUrl);
            }
          }
        });
      }

    })();
  </script>

</body>
</html>`;
}

/**
 * Render Ultra-Premium Profile Not Found Page
 */
export function renderProfileNotFoundHtml({ username }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile Not Found | KevalonTap</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #06080d; }</style>
</head>
<body class="text-slate-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-[#0f1420] border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
    <div class="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
    </div>
    <h1 class="text-xl font-bold text-white">Profile Not Found</h1>
    <p class="text-xs text-slate-400 leading-relaxed">
      The profile <strong class="text-white font-mono">@${sanitizeHtml(username)}</strong> does not exist or has been removed.
    </p>
    <div class="pt-2">
      <a href="https://kevalon.com" class="inline-block px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition-colors">
        Visit Kevalon.com
      </a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Render Ultra-Premium Inactive or Private Profile Page
 */
export function renderProfileUnavailableHtml({ username, reason = 'private' }) {
  const isPrivate = reason === 'private';
  const title = isPrivate ? 'Profile is Private' : 'Profile is Inactive';
  const desc = isPrivate
    ? `The profile @${sanitizeHtml(username)} is currently marked as private by its owner.`
    : `The profile @${sanitizeHtml(username)} is currently deactivated.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | KevalonTap</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #06080d; }</style>
</head>
<body class="text-slate-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-[#0f1420] border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
    <div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
    </div>
    <h1 class="text-xl font-bold text-white">${title}</h1>
    <p class="text-xs text-slate-400 leading-relaxed">${desc}</p>
    <div class="pt-2">
      <a href="https://kevalon.com" class="inline-block px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition-colors">
        Visit Kevalon.com
      </a>
    </div>
  </div>
</body>
</html>`;
}
