/* Live partner grid for /partners.
 *
 * The list is served from the panel API rather than baked into the HTML, so a
 * partner approved in the admin area appears here without anyone editing a file.
 * It refreshes on a timer and whenever the tab is brought back to the front, so
 * a page left open overnight is not showing yesterday's list.
 *
 * Every value below is partner-editable text out of the database. It is written
 * with textContent / setAttribute and never interpolated into HTML, and link and
 * image URLs are restricted to http(s) - a `javascript:` value in publicLink
 * would otherwise be a stored XSS on the public site.
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/v1/public/partners';
  var REFRESH_MS = 60000;
  var grid = document.getElementById('in-partners');
  var note = document.getElementById('in-partners-note');
  if (!grid) return;

  // Reject anything that is not plain http(s): protocol-relative, javascript:,
  // data: and friends all resolve to something we must not put in href/src.
  function safeUrl(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    try {
      var u = new URL(raw, window.location.origin);
      return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
    } catch (e) {
      return '';
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildCard(partner) {
    var href = safeUrl(partner.linkUrl);
    var card = el(href ? 'a' : 'div', 'in-partner');
    if (href) {
      card.setAttribute('href', href);
      card.setAttribute('target', '_blank');
      // noopener also covers the reverse-tabnabbing risk on partner-supplied links.
      card.setAttribute('rel', 'noopener noreferrer nofollow');
    }

    var head = el('div', 'in-partner__head');
    var logo = safeUrl(partner.imageUrl);
    if (logo) {
      var img = el('img', 'in-partner__logo');
      img.setAttribute('src', logo);
      img.setAttribute('alt', String(partner.displayName || 'Partner') + ' logo');
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
      img.setAttribute('referrerpolicy', 'no-referrer');
      // A dead third-party image must not leave a broken-icon box in the grid.
      img.addEventListener('error', function () { img.remove(); });
      head.appendChild(img);
    }

    var meta = el('div');
    meta.style.minWidth = '0';
    meta.appendChild(el('p', 'in-partner__name', String(partner.displayName || 'Partner')));
    if (partner.partnerSince) {
      var since = el('p', 'in-partner__since');
      since.appendChild(document.createTextNode('Partner since '));
      var when = el('time', null, String(partner.partnerSince));
      if (partner.partnerSinceIso) when.setAttribute('datetime', String(partner.partnerSinceIso));
      since.appendChild(when);
      meta.appendChild(since);
    }
    head.appendChild(meta);
    card.appendChild(head);

    if (partner.description) card.appendChild(el('p', 'in-partner__text', String(partner.description)));
    if (href) {
      // Show the destination host rather than a bare "Visit" - it tells the
      // visitor where the card sends them before they click.
      var label = 'Visit partner';
      try { label = 'Visit ' + new URL(href).hostname.replace(/^www\./, ''); } catch (e) { /* keep the generic label */ }
      card.appendChild(el('span', 'in-partner__go', label));
    }
    return card;
  }

  function renderEmpty(message) {
    grid.textContent = '';
    grid.classList.remove('in-partners');
    var box = el('div', 'in-partners__empty', message);
    grid.appendChild(box);
  }

  function render(partners) {
    grid.textContent = '';
    if (!partners.length) {
      renderEmpty('Our partner network is being set up. Check back soon.');
      if (note) note.textContent = '';
      return;
    }
    grid.classList.add('in-partners');
    var frag = document.createDocumentFragment();
    for (var i = 0; i < partners.length; i++) frag.appendChild(buildCard(partners[i]));
    grid.appendChild(frag);
    if (note) {
      note.textContent = partners.length === 1
        ? '1 official partner'
        : partners.length + ' official partners';
    }
  }

  var loadedOnce = false;

  function load() {
    return fetch(ENDPOINT, { headers: { Accept: 'application/json' }, credentials: 'omit' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var partners = (data && Array.isArray(data.partners)) ? data.partners : [];
        grid.setAttribute('aria-busy', 'false');
        render(partners);
        loadedOnce = true;
      })
      .catch(function () {
        grid.setAttribute('aria-busy', 'false');
        // A failed refresh must never blank a list that is already on screen.
        if (loadedOnce) return;
        renderEmpty('Could not load the partner list right now. Please try again shortly.');
        if (note) note.textContent = '';
      });
  }

  load();

  // Only poll while the tab is actually visible, and refresh immediately when
  // the visitor comes back to it.
  var timer = null;
  function startPolling() {
    if (timer === null) timer = window.setInterval(load, REFRESH_MS);
  }
  function stopPolling() {
    if (timer !== null) { window.clearInterval(timer); timer = null; }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stopPolling(); return; }
    load();
    startPolling();
  });
  if (!document.hidden) startPolling();
})();
