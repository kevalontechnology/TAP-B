import { QRCode } from '../models/QRCode.js';
import { QRRequest } from '../models/QRRequest.js';
import { recordScan } from '../services/analyticsService.js';
import { logAuditAction } from '../services/auditService.js';
import { validateDestinationSafety } from '../utils/urlSafety.js';
import { config } from '../config/env.js';

/**
 * Render a branded HTML status page for non-active or error QR states
 */
function renderBrandedStatusPage({ title, badge, message, helpText, iconType = 'info' }) {
  const iconSvg = {
    info: `<svg class="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    warning: `<svg class="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
    error: `<svg class="w-10 h-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>`,
    clock: `<svg class="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
  }[iconType] || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Tapzy Dynamic QR</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
  <div class="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
    <div class="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="relative z-10">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs font-semibold tracking-wide text-indigo-400 mb-6">
        <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
        Tapzy Smart QR
      </div>

      <div class="mx-auto w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-6 shadow-inner">
        ${iconSvg}
      </div>

      <h1 class="text-2xl font-bold text-white mb-2">${title}</h1>
      <span class="inline-block px-3 py-1 text-xs font-medium rounded-full mb-4 ${badge.color}">${badge.text}</span>
      <p class="text-slate-300 text-sm leading-relaxed mb-6">${message}</p>

      <div class="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/30 text-xs text-slate-400 text-left mb-6">
        <p class="font-semibold text-slate-300 mb-1">Notice</p>
        <p>${helpText}</p>
      </div>

      <div class="border-t border-slate-800/80 pt-6">
        <p class="text-xs text-slate-500">
          Powered by <strong class="text-slate-300 font-semibold">Tapzy</strong> &bull; Kevalon Technology
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Render Ultra-Premium Redesigned Interactive Disabled Page
 */
function renderDisabledPageWithContact({ qr, publicCode }) {
  const phone = config.supportPhone || '+91 98765 43210';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const email = config.supportEmail || 'support@tapzy.in';
  const waText = encodeURIComponent(`Hello Tapzy Support, I scanned QR Code (${publicCode}: ${qr.title}) and it is currently Disabled. Please help activate it.`);
  const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Code Inactive | Tapzy Smart Tag</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .glass-panel {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .pulse-ring {
      animation: pulseGlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.08); }
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 sm:p-6 selection:bg-amber-500 selection:text-slate-950">
  {/* Ambient Background Glows */}
  <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pulse-ring"></div>
    <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pulse-ring" style="animation-delay: 1.5s;"></div>
  </div>

  <div class="max-w-md w-full glass-panel rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
    {/* Subtle gradient border line at top */}
    <div class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/40 via-orange-500 to-amber-500/40"></div>

    {/* Brand Header & Status Pill */}
    <div class="flex items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke-width="2"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke-width="2"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke-width="2"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke-width="2"/>
          </svg>
        </div>
        <span class="text-sm font-extrabold tracking-tight text-white">Tapzy<span class="text-amber-400">QR</span></span>
      </div>

      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-400">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
        Temporarily Paused
      </div>
    </div>

    {/* Hero Icon & Title Section */}
    <div class="text-center mb-6">
      <div class="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
        <div class="absolute inset-0 rounded-3xl bg-amber-500/15 blur-lg pulse-ring"></div>
        <div class="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center shadow-inner">
          <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      </div>

      <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
        Tag Temporarily Inactive
      </h1>
      
      {/* Tag ID chip */}
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300 mb-3">
        <span class="text-slate-500">ID:</span>
        <strong class="text-amber-400 font-bold">${publicCode}</strong>
        ${qr.title ? `<span class="text-slate-600">&bull;</span><span class="text-slate-300 truncate max-w-[140px]">${qr.title}</span>` : ''}
      </div>

      <p class="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
        This dynamic smart QR code is temporarily deactivated by the owner or administrator. Choose an option below for fast assistance.
      </p>
    </div>

    {/* Segmented Tab Buttons (Direct Contact vs Request Activation) */}
    <div class="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800 mb-5">
      <button
        id="tabBtnContact"
        type="button"
        onclick="switchTab('contact')"
        class="py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 bg-slate-800 text-white shadow-sm"
      >
        <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
        </svg>
        Instant Contact
      </button>

      <button
        id="tabBtnRequest"
        type="button"
        onclick="switchTab('request')"
        class="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200 flex items-center justify-center gap-1.5"
      >
        <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        Request Online
      </button>
    </div>

    {/* TAB CONTENT 1: DIRECT CONTACT */}
    <div id="tabContentContact" class="space-y-3">
      {/* Call Support Card */}
      <a href="tel:${cleanPhone}" class="group block p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800/80 hover:from-slate-850 hover:to-slate-800 border border-slate-700/60 hover:border-indigo-500/50 transition-all duration-200 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-white">Call Support Desk</span>
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
              <p class="text-xs font-mono font-bold text-slate-300 mt-0.5">${phone}</p>
            </div>
          </div>
          <div class="flex items-center gap-1 text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
            <span>Call</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
          </div>
        </div>
      </a>

      {/* WhatsApp Chat Card */}
      <a href="${waUrl}" target="_blank" rel="noreferrer" class="group block p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800/80 hover:from-slate-850 hover:to-slate-800 border border-slate-700/60 hover:border-emerald-500/50 transition-all duration-200 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </div>
            <div>
              <span class="text-xs font-bold text-white">Chat on WhatsApp</span>
              <p class="text-[11px] text-slate-400">Instant response with QR details</p>
            </div>
          </div>
          <div class="flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
            <span>Chat</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
          </div>
        </div>
      </a>
    </div>

    {/* TAB CONTENT 2: REQUEST RE-ACTIVATION FORM */}
    <div id="tabContentRequest" class="hidden">
      <div class="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5">
        <div class="text-left">
          <h3 class="text-xs font-bold text-white">Notify Administrator</h3>
          <p class="text-[11px] text-slate-400">Send your name and mobile to request activation.</p>
        </div>

        <form id="activationForm" class="space-y-3">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-left">Your Full Name</label>
            <div class="relative">
              <input
                type="text"
                id="requesterName"
                required
                placeholder="e.g. Harsh Vardhan"
                class="w-full pl-3.5 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              >
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-left">Mobile / Contact Number</label>
            <div class="relative">
              <input
                type="tel"
                id="contactNumber"
                required
                placeholder="e.g. +91 98765 43210"
                class="w-full pl-3.5 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              >
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-left">Message (Optional)</label>
            <textarea
              id="message"
              rows="2"
              placeholder="e.g. Please reactivate my counter standee QR."
              class="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            ></textarea>
          </div>

          <button
            type="submit"
            id="submitBtn"
            class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
            Send Activation Request
          </button>
        </form>

        <div id="successMsg" class="hidden p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center space-y-1">
          <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
          </div>
          <p class="font-bold text-sm text-white">Request Successfully Sent!</p>
          <p class="text-[11px] text-slate-300">The administrator has been notified to review and re-enable this dynamic QR tag.</p>
        </div>
      </div>
    </div>

    {/* Footer Info */}
    <div class="border-t border-slate-800/80 pt-5 mt-6 text-center space-y-1.5">
      <p class="text-[11px] text-slate-500">
        Tag Owner? <a href="/login" class="text-indigo-400 font-semibold hover:underline">Log in to Tapzy Admin Portal</a> to unpause.
      </p>
      <p class="text-[10px] text-slate-600 font-medium">
        Secured by <strong class="text-slate-400">Tapzy Dynamic Engine</strong> &bull; Kevalon Technology
      </p>
    </div>
  </div>

  <script>
    function switchTab(tab) {
      const btnContact = document.getElementById('tabBtnContact');
      const btnRequest = document.getElementById('tabBtnRequest');
      const contentContact = document.getElementById('tabContentContact');
      const contentRequest = document.getElementById('tabContentRequest');

      if (tab === 'contact') {
        btnContact.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 bg-slate-800 text-white shadow-sm';
        btnRequest.className = 'py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200 flex items-center justify-center gap-1.5';
        contentContact.classList.remove('hidden');
        contentRequest.classList.add('hidden');
      } else {
        btnRequest.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 bg-slate-800 text-white shadow-sm';
        btnContact.className = 'py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200 flex items-center justify-center gap-1.5';
        contentRequest.classList.remove('hidden');
        contentContact.classList.add('hidden');
      }
    }

    document.getElementById('activationForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="inline-block animate-spin mr-2">◌</span> Submitting...';

      const data = {
        requesterName: document.getElementById('requesterName').value,
        contactNumber: document.getElementById('contactNumber').value,
        message: document.getElementById('message').value,
      };

      try {
        const res = await fetch('/q/${publicCode}/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.success) {
          document.getElementById('activationForm').classList.add('hidden');
          document.getElementById('successMsg').classList.remove('hidden');
        } else {
          alert(result.error || 'Failed to submit request');
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      } catch (err) {
        alert('Error submitting request. Please try again.');
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  </script>
</body>
</html>`;
}

export async function handleRedirect(req, res) {
  const { publicCode } = req.params;

  // Anti-caching headers as explicitly required:
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const qr = await QRCode.findOne({ publicCode });

    // 1. Invalid / Not Found QR
    if (!qr) {
      await recordScan({
        qrCodeId: null,
        publicCode,
        req,
        redirectStatus: 'UNASSIGNED',
      });

      return res.status(404).send(
        renderBrandedStatusPage({
          title: 'QR Code Not Found',
          badge: { text: 'Invalid QR', color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
          message: 'The dynamic QR code you scanned does not exist in our system or may have been permanently removed.',
          helpText: 'Please verify that you have scanned the correct QR code or contact the organization that issued it.',
          iconType: 'error',
        })
      );
    }

    // 2. Unassigned QR Code
    if (qr.status === 'UNASSIGNED') {
      await recordScan({
        qrCodeId: qr._id,
        publicCode,
        req,
        redirectStatus: 'UNASSIGNED',
      });

      return res.status(200).send(
        renderBrandedStatusPage({
          title: 'QR Code Not Assigned',
          badge: { text: 'Pending Activation', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
          message: 'This dynamic QR code has been generated but has not been assigned a destination yet.',
          helpText: 'If you are the owner or distributor of this Tapzy QR tag, please assign a destination via your Tapzy Admin Portal to activate it.',
          iconType: 'info',
        })
      );
    }

    // 3. Disabled QR Code - Displays Redesigned Ultra-Premium Experience
    if (qr.status === 'DISABLED') {
      await recordScan({
        qrCodeId: qr._id,
        publicCode,
        req,
        redirectStatus: 'DISABLED',
      });

      return res.status(200).send(
        renderDisabledPageWithContact({
          qr,
          publicCode,
        })
      );
    }

    // 4. Expired QR Code
    const isPastExpiry = qr.expiresAt && new Date(qr.expiresAt) < new Date();
    if (qr.status === 'EXPIRED' || isPastExpiry) {
      if (qr.status !== 'EXPIRED') {
        qr.status = 'EXPIRED';
        await qr.save();
      }

      await recordScan({
        qrCodeId: qr._id,
        publicCode,
        req,
        redirectStatus: 'EXPIRED',
      });

      return res.status(200).send(
        renderBrandedStatusPage({
          title: 'QR Code Expired',
          badge: { text: 'Expired', color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
          message: 'This dynamic QR code has reached its scheduled expiration date and is no longer active.',
          helpText: 'Please contact the issuer to extend the validity of this QR code.',
          iconType: 'clock',
        })
      );
    }

    // 5. Active - Validate Destination
    if (!qr.destinationUrl || qr.destinationUrl.trim() === '') {
      await recordScan({
        qrCodeId: qr._id,
        publicCode,
        req,
        redirectStatus: 'INVALID_DESTINATION',
      });

      return res.status(400).send(
        renderBrandedStatusPage({
          title: 'Destination Not Configured',
          badge: { text: 'Missing URL', color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
          message: 'This QR code is marked active but has no destination URL configured.',
          helpText: 'Please update the destination URL in the Tapzy Admin Dashboard.',
          iconType: 'error',
        })
      );
    }

    // Re-verify URL safety before redirect
    const safety = validateDestinationSafety(qr.destinationUrl);
    if (!safety.safe) {
      await recordScan({
        qrCodeId: qr._id,
        publicCode,
        req,
        redirectStatus: 'INVALID_DESTINATION',
      });

      return res.status(400).send(
        renderBrandedStatusPage({
          title: 'Unsafe Destination Blocked',
          badge: { text: 'Security Warning', color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
          message: `The destination URL failed security verification: ${safety.error || 'Blocked'}.`,
          helpText: 'Redirects to private addresses, non-HTTP protocols, and loopbacks are prohibited for safety.',
          iconType: 'error',
        })
      );
    }

    // 6. Successful scan: record scan analytics
    await recordScan({
      qrCodeId: qr._id,
      publicCode,
      req,
      redirectStatus: 'SUCCESS',
    });

    // 7. Perform HTTP 302 redirect with no-store cache control
    return res.redirect(302, safety.sanitizedUrl);
  } catch (err) {
    console.error('[Redirect Engine Error]', err);
    return res.status(500).send(
      renderBrandedStatusPage({
        title: 'System Error',
        badge: { text: 'Error 500', color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
        message: 'An unexpected error occurred while resolving this dynamic QR code.',
        helpText: 'Please try again in a few moments.',
        iconType: 'error',
      })
    );
  }
}

/**
 * Handle public activation request for disabled QR codes
 * POST /q/:publicCode/request
 */
export async function handleActivationRequest(req, res) {
  try {
    const { publicCode } = req.params;
    const { requesterName, contactNumber, message } = req.body;

    if (!requesterName || !contactNumber) {
      return res.status(400).json({
        success: false,
        error: 'Name and contact number are required',
      });
    }

    const qr = await QRCode.findOne({ publicCode });

    const request = await QRRequest.create({
      qrCodeId: qr ? qr._id : null,
      publicCode,
      requesterName: requesterName.trim(),
      contactNumber: contactNumber.trim(),
      message: (message || '').trim(),
      status: 'PENDING',
      ipAddress: req.ip || '',
    });

    if (qr) {
      await logAuditAction({
        qrCodeId: qr._id,
        action: 'ACTIVATION_REQUESTED',
        newValue: {
          requesterName,
          contactNumber,
          message,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Activation request submitted successfully',
      data: request,
    });
  } catch (err) {
    console.error('[Activation Request Error]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit activation request',
    });
  }
}
