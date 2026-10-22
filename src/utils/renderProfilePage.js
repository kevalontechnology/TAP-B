/**
 * Server-Side HTML Rendering Engine for Tapzy Public Digital Profiles
 * Ultra-responsive, mobile-first design matching Tapzy Digital Business Cards
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

const ICONS = {
  phone: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>`,
  whatsapp: `<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1 .587 1.815.883 2.806.883 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.385-.453-4.821-1.246l-5.179 1.36 1.385-5.053c-.886-1.501-1.385-3.248-1.385-5.061 0-5.519 4.481-10 10-10 5.519 0 10 4.481 10 10z"/></svg>`,
  mail: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
  mapPin: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  globe: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9m0-18a15.3 15.3 0 00-4 9 15.3 15.3 0 004 9"/></svg>`,
  download: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>`,
  building: `<svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
  externalLink: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>`,
  fileText: `<svg class="w-6 h-6 text-[#0088cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
  send: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>`,
  star: `<svg class="w-4 h-4 text-amber-500 fill-amber-500" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
  linkedin: `<svg class="w-4 h-4 fill-current text-[#0077b5]" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`,
  instagram: `<svg class="w-4 h-4 fill-current text-[#e4405f]" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  facebook: `<svg class="w-4 h-4 fill-current text-[#1877f2]" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.6 5H18V0h-3.808C10.596 0 9 1.583 9 4.615V8z"/></svg>`,
  youtube: `<svg class="w-4 h-4 fill-current text-[#ff0000]" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  twitter: `<svg class="w-4 h-4 fill-current text-slate-900" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  github: `<svg class="w-4 h-4 fill-current text-slate-900" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`,
};

function getCleanPhone(phone = '') {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) return `91${cleaned}`;
  return cleaned;
}

/**
 * Render the Complete Interactive Tapzy Digital Business Card HTML
 */
export function renderProfileHtml({ profile, publicUrl, vcfUrl }) {
  const themeColor = profile.themeColor || '#034665';
  const name = sanitizeHtml(profile.fullName || profile.username);
  const designation = sanitizeHtml(profile.designation || '');
  const companyName = sanitizeHtml(profile.companyName || '');
  const bio = sanitizeHtml(profile.bio || '');
  const mobile = profile.mobileNumber ? profile.mobileNumber.trim() : '';
  const cleanMobile = getCleanPhone(mobile);
  const whatsapp = profile.whatsappNumber ? profile.whatsappNumber.trim() : '';
  const cleanWhatsapp = getCleanPhone(whatsapp || mobile);
  const email1 = sanitizeHtml(profile.email1 || '');
  const mapsUrl = profile.googleMapsLocation || '';
  const websiteUrl = profile.companyWebsite || '';
  const social = profile.socialLinks || {};
  const photo = profile.profilePhoto || '';
  const initials = (name.charAt(0) || 'T').toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${name} | Tapzy Digital Business Card</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${name} | Tapzy Digital Profile">
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
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: transparent;
    }
    .theme-bg { background-color: ${themeColor}; }
    .theme-color { color: ${themeColor}; }
    .theme-border { border-color: ${themeColor}; }
    .glass-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
    }
  </style>
</head>
<body class="bg-slate-100 min-h-screen text-slate-800 flex justify-center selection:bg-[#0088cc] selection:text-white pb-12">
  
  <!-- Mobile Container (Max Width 440px) -->
  <div class="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col justify-between overflow-x-hidden">
    
    <div>
      <!-- Cover Banner -->
      <div class="h-36 w-full relative p-4 flex items-start justify-between theme-bg overflow-hidden shadow-inner">
        <!-- Background Pattern -->
        <div class="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div class="relative z-10 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-xs">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Tapzy Smart Card
        </div>

        ${
          profile.saveContactVcf
            ? `<a href="${vcfUrl}" download class="relative z-10 px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                ${ICONS.download}
                <span>Save Contact</span>
              </a>`
            : ''
        }
      </div>

      <!-- Identity Header -->
      <div class="px-6 -mt-16 text-center space-y-2 relative pb-6 border-b border-slate-100">
        <!-- Floating Profile Avatar -->
        <div class="w-28 h-28 mx-auto rounded-full bg-white p-1 shadow-xl overflow-hidden border-2 border-white flex items-center justify-center relative group">
          ${
            photo
              ? `<img src="${photo}" alt="${name}" class="w-full h-full object-cover rounded-full" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                 <div class="w-full h-full rounded-full hidden items-center justify-center text-white text-3xl font-black theme-bg">${initials}</div>`
              : `<div class="w-full h-full rounded-full flex items-center justify-center text-white text-3xl font-black theme-bg">${initials}</div>`
          }
        </div>

        <div>
          <h1 class="text-xl font-black text-slate-900 tracking-tight">${name}</h1>
          ${designation ? `<p class="text-xs font-semibold text-slate-600 mt-0.5">${designation}</p>` : ''}
          ${
            companyName
              ? `<p class="text-xs text-slate-500 font-medium flex items-center justify-center gap-1 mt-0.5">
                  ${ICONS.building}
                  <span>${companyName}</span>
                </p>`
              : ''
          }
        </div>

        <!-- Quick Action Buttons -->
        <div class="grid grid-cols-4 gap-2 pt-3">
          ${
            mobile
              ? `<a href="tel:${mobile}" class="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200/80 flex flex-col items-center gap-1 text-slate-700 transition-all group" title="Call">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    ${ICONS.phone}
                  </div>
                  <span class="text-[10px] font-bold">Call</span>
                </a>`
              : ''
          }

          ${
            whatsapp || mobile
              ? `<a href="https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`Hi ${name}, I connected with you via your Tapzy profile.`)}" target="_blank" rel="noopener noreferrer" class="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200/80 flex flex-col items-center gap-1 text-slate-700 transition-all group" title="WhatsApp">
                  <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    ${ICONS.whatsapp}
                  </div>
                  <span class="text-[10px] font-bold">WhatsApp</span>
                </a>`
              : ''
          }

          ${
            email1
              ? `<a href="mailto:${email1}" class="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200/80 flex flex-col items-center gap-1 text-slate-700 transition-all group" title="Email">
                  <div class="w-9 h-9 rounded-xl bg-sky-50 text-[#0088cc] flex items-center justify-center group-hover:scale-110 transition-transform">
                    ${ICONS.mail}
                  </div>
                  <span class="text-[10px] font-bold">Email</span>
                </a>`
              : ''
          }

          ${
            mapsUrl
              ? `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200/80 flex flex-col items-center gap-1 text-slate-700 transition-all group" title="Directions">
                  <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    ${ICONS.mapPin}
                  </div>
                  <span class="text-[10px] font-bold">Location</span>
                </a>`
              : websiteUrl
              ? `<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" class="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200/80 flex flex-col items-center gap-1 text-slate-700 transition-all group" title="Website">
                  <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    ${ICONS.globe}
                  </div>
                  <span class="text-[10px] font-bold">Website</span>
                </a>`
              : ''
          }
        </div>
      </div>

      <!-- Professional Bio -->
      ${
        bio
          ? `<div class="p-6 border-b border-slate-100 space-y-1.5">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">About</h3>
              <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">${bio}</p>
            </div>`
          : ''
      }

      <!-- Social Media & Connect Grid -->
      <div class="p-6 border-b border-slate-100 space-y-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Connect Online</h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          ${social.linkedIn ? `<a href="${social.linkedIn}" target="_blank" rel="noopener noreferrer" class="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 text-slate-700 font-semibold transition-colors">${ICONS.linkedin}<span class="truncate">LinkedIn</span></a>` : ''}
          ${social.instagram ? `<a href="${social.instagram}" target="_blank" rel="noopener noreferrer" class="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 text-slate-700 font-semibold transition-colors">${ICONS.instagram}<span class="truncate">Instagram</span></a>` : ''}
          ${social.facebook ? `<a href="${social.facebook}" target="_blank" rel="noopener noreferrer" class="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 text-slate-700 font-semibold transition-colors">${ICONS.facebook}<span class="truncate">Facebook</span></a>` : ''}
          ${social.youtube ? `<a href="${social.youtube}" target="_blank" rel="noopener noreferrer" class="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 text-slate-700 font-semibold transition-colors">${ICONS.youtube}<span class="truncate">YouTube</span></a>` : ''}
          ${social.twitter ? `<a href="${social.twitter}" target="_blank" rel="noopener noreferrer" class="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 text-slate-700 font-semibold transition-colors">${ICONS.twitter}<span class="truncate">X (Twitter)</span></a>` : ''}
          ${social.github ? `<a href="${social.github}" target="_blank" rel="noopener noreferrer" class="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 text-slate-700 font-semibold transition-colors">${ICONS.github}<span class="truncate">GitHub</span></a>` : ''}
          ${social.portfolio ? `<a href="${social.portfolio}" target="_blank" rel="noopener noreferrer" class="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 text-slate-700 font-semibold transition-colors">${ICONS.globe}<span class="truncate">Portfolio</span></a>` : ''}
          ${social.googleReview ? `<a href="${social.googleReview}" target="_blank" rel="noopener noreferrer" class="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 text-slate-700 font-semibold transition-colors">${ICONS.star}<span class="truncate">Review Us</span></a>` : ''}
          ${
            Array.isArray(social.customLinks)
              ? social.customLinks
                  .map(
                    (c) =>
                      `<a href="${c.url}" target="_blank" rel="noopener noreferrer" class="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 text-slate-700 font-semibold transition-colors">${ICONS.externalLink}<span class="truncate">${sanitizeHtml(c.label)}</span></a>`
                  )
                  .join('')
              : ''
          }
        </div>
      </div>

      <!-- Services Section -->
      ${
        Array.isArray(profile.services) && profile.services.length > 0
          ? `<div class="p-6 border-b border-slate-100 space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Services</h3>
              <div class="space-y-2">
                ${profile.services
                  .map(
                    (srv) => `
                    <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div class="flex items-center justify-between">
                        <h4 class="font-bold text-slate-900 text-xs">${sanitizeHtml(srv.title)}</h4>
                        ${srv.price ? `<span class="text-xs font-bold text-[#0088cc]">${sanitizeHtml(srv.price)}</span>` : ''}
                      </div>
                      ${srv.description ? `<p class="text-[11px] text-slate-600 leading-relaxed font-normal">${sanitizeHtml(srv.description)}</p>` : ''}
                    </div>`
                  )
                  .join('')}
              </div>
            </div>`
          : ''
      }

      <!-- Products Section -->
      ${
        Array.isArray(profile.products) && profile.products.length > 0
          ? `<div class="p-6 border-b border-slate-100 space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Products</h3>
              <div class="grid grid-cols-2 gap-3">
                ${profile.products
                  .map(
                    (prd) => `
                    <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      ${prd.image ? `<div class="aspect-square rounded-xl bg-white overflow-hidden border border-slate-200"><img src="${prd.image}" alt="${sanitizeHtml(prd.name)}" class="w-full h-full object-cover" /></div>` : ''}
                      <div>
                        <h4 class="font-bold text-slate-900 text-xs truncate">${sanitizeHtml(prd.name)}</h4>
                        ${prd.price ? `<p class="text-xs font-bold text-[#0088cc] mt-0.5">${sanitizeHtml(prd.price)}</p>` : ''}
                        ${prd.link ? `<a href="${prd.link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[10px] font-bold text-[#0088cc] hover:underline mt-1"><span>Buy Now</span>${ICONS.externalLink}</a>` : ''}
                      </div>
                    </div>`
                  )
                  .join('')}
              </div>
            </div>`
          : ''
      }

      <!-- Portfolio / Projects Section -->
      ${
        Array.isArray(profile.portfolioItems) && profile.portfolioItems.length > 0
          ? `<div class="p-6 border-b border-slate-100 space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Portfolio</h3>
              <div class="space-y-3">
                ${profile.portfolioItems
                  .map(
                    (port) => `
                    <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      ${port.image ? `<div class="h-32 rounded-xl bg-white overflow-hidden border border-slate-200"><img src="${port.image}" alt="${sanitizeHtml(port.title)}" class="w-full h-full object-cover" /></div>` : ''}
                      <div class="flex items-center justify-between">
                        <h4 class="font-bold text-slate-900 text-xs">${sanitizeHtml(port.title)}</h4>
                        ${port.link ? `<a href="${port.link}" target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-[#0088cc] hover:underline flex items-center gap-1"><span>View</span>${ICONS.externalLink}</a>` : ''}
                      </div>
                      ${port.description ? `<p class="text-[11px] text-slate-600">${sanitizeHtml(port.description)}</p>` : ''}
                    </div>`
                  )
                  .join('')}
              </div>
            </div>`
          : ''
      }

      <!-- Photo Gallery -->
      ${
        Array.isArray(profile.imageGallery) && profile.imageGallery.length > 0
          ? `<div class="p-6 border-b border-slate-100 space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Photo Gallery</h3>
              <div class="grid grid-cols-3 gap-2">
                ${profile.imageGallery
                  .map(
                    (img) => `
                    <div class="aspect-square rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-2xs">
                      <img src="${img.url}" alt="${sanitizeHtml(img.caption || 'Gallery')}" class="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>`
                  )
                  .join('')}
              </div>
            </div>`
          : ''
      }

      <!-- Brochure Download -->
      ${
        profile.brochureUrl
          ? `<div class="p-6 border-b border-slate-100">
              <a href="${profile.brochureUrl}" target="_blank" rel="noopener noreferrer" class="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 flex items-center justify-between text-slate-800 hover:shadow-xs transition-shadow">
                <div class="flex items-center gap-3">
                  ${ICONS.fileText}
                  <div>
                    <h4 class="font-bold text-xs">Download Company Brochure</h4>
                    <p class="text-[10px] text-slate-500">Official PDF specifications & catalog</p>
                  </div>
                </div>
                ${ICONS.download}
              </a>
            </div>`
          : ''
      }

      <!-- Connect / Lead Form -->
      <div class="p-6 space-y-3 bg-slate-50 border-b border-slate-100">
        <div class="text-center space-y-1">
          <h3 class="text-sm font-bold text-slate-900">Exchange Contact</h3>
          <p class="text-xs text-slate-500">Leave your details to connect directly with ${name}</p>
        </div>

        <div id="lead-success-box" class="hidden p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-1">
          <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div class="text-xs font-bold">Contact Details Shared!</div>
          <p class="text-[11px] text-emerald-700">Your contact info has been sent directly to ${name}.</p>
        </div>

        <form id="lead-form" class="space-y-2.5">
          <div id="lead-error-box" class="hidden p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs"></div>
          
          <input type="text" id="lead-name" placeholder="Your Full Name *" required class="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]" />
          <input type="tel" id="lead-phone" placeholder="Your Mobile Number *" required class="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]" />
          <input type="email" id="lead-email" placeholder="Your Email Address" class="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]" />
          <textarea id="lead-message" rows="2" placeholder="Message or inquiry..." class="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]"></textarea>

          <button type="submit" id="lead-submit-btn" class="w-full py-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all theme-bg cursor-pointer">
            ${ICONS.send}
            <span>Send My Contact</span>
          </button>
        </form>
      </div>

    </div>

    <!-- Footer -->
    <div class="p-5 text-center bg-white">
      <a href="https://tapzy.in" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600">
        <span>Powered by</span>
        <span class="text-[#0088cc] font-black tracking-wide">Tapzy</span>
      </a>
    </div>

  </div>

  <!-- Interactive AJAX Script for Lead Submission & View Tracking -->
  <script>
    (function() {
      const username = '${profile.username}';
      
      // Auto track profile view
      try {
        fetch('/api/public/profile/' + username + '/track-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralSource: 'direct' })
        }).catch(() => {});
      } catch (e) {}

      // Handle Contact Lead Submission
      const form = document.getElementById('lead-form');
      const submitBtn = document.getElementById('lead-submit-btn');
      const successBox = document.getElementById('lead-success-box');
      const errorBox = document.getElementById('lead-error-box');

      if (form) {
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          const fullName = document.getElementById('lead-name').value.trim();
          const phoneNumber = document.getElementById('lead-phone').value.trim();
          const email = document.getElementById('lead-email').value.trim();
          const message = document.getElementById('lead-message').value.trim();

          if (!fullName || !phoneNumber) {
            errorBox.innerText = 'Name and mobile number are required.';
            errorBox.classList.remove('hidden');
            return;
          }

          errorBox.classList.add('hidden');
          submitBtn.disabled = true;
          submitBtn.innerText = 'Sending...';

          try {
            const res = await fetch('/api/public/profile/' + username + '/connect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullName,
                phoneNumber,
                email,
                message,
                consentGiven: true,
                source: 'public_profile'
              })
            });

            const data = await res.json();
            if (res.ok && data.success) {
              form.classList.add('hidden');
              successBox.classList.remove('hidden');
            } else {
              errorBox.innerText = data.error || 'Failed to exchange contact. Please try again.';
              errorBox.classList.remove('hidden');
              submitBtn.disabled = false;
              submitBtn.innerText = 'Send My Contact';
            }
          } catch (err) {
            errorBox.innerText = 'Network error. Please try again.';
            errorBox.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Send My Contact';
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
  <title>Profile Not Found | Tapzy</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
    <div class="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
    </div>
    <h1 class="text-xl font-bold text-white">Profile Not Found</h1>
    <p class="text-xs text-slate-400 leading-relaxed">
      The profile <strong class="text-white font-mono">@${sanitizeHtml(username)}</strong> does not exist or has been removed.
    </p>
    <div class="pt-2">
      <a href="https://tapzy.in" class="inline-block px-5 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold text-xs shadow-md transition-colors">
        Visit Tapzy.in
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
  <title>${title} | Tapzy</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
    <div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
    </div>
    <h1 class="text-xl font-bold text-white">${title}</h1>
    <p class="text-xs text-slate-400 leading-relaxed">${desc}</p>
    <div class="pt-2">
      <a href="https://tapzy.in" class="inline-block px-5 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold text-xs shadow-md transition-colors">
        Visit Tapzy.in
      </a>
    </div>
  </div>
</body>
</html>`;
}
