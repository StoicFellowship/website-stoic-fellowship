/* Session-card deck on /first-year: Previous / Next, swipe, arrow keys.
   Works without JS too: each card is an #month-N anchor and the track scrolls. */
(function () {
  var deck = document.querySelector('.session-deck');
  if (!deck) return;
  var track = deck.querySelector('.session-track');
  var cards = Array.prototype.slice.call(track.querySelectorAll('.session-card'));
  var prev = deck.querySelector('.session-prev');
  var next = deck.querySelector('.session-next');
  var num = deck.querySelector('.session-status-num');
  var title = deck.querySelector('.session-status-title');
  var current = 0;

  function show(i, smooth) {
    i = Math.max(0, Math.min(cards.length - 1, i));
    track.scrollTo({ left: cards[i].offsetLeft - track.offsetLeft - 4, behavior: smooth === false ? 'instant' : 'smooth' });
    mark(i);
  }

  function mark(i) {
    current = i;
    num.textContent = 'Session ' + (i + 1) + ' of ' + cards.length;
    title.textContent = cards[i].getAttribute('data-title');
    prev.disabled = i === 0;
    next.disabled = i === cards.length - 1;
    if (history.replaceState && location.hash !== '#month-' + (i + 1) && (i > 0 || location.hash)) {
      history.replaceState(null, '', '#month-' + (i + 1));
    }
  }

  var t;
  track.addEventListener('scroll', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var w = cards[0].offsetWidth + 24;
      var i = Math.round(track.scrollLeft / w);
      if (i !== current) mark(i);
    }, 80);
  });

  function step(d) {
    // If the reader has scrolled down the card, bring the deck's top back
    // into view first (instantly), then slide the track to the next card.
    if (deck.getBoundingClientRect().top < 0) deck.scrollIntoView({ block: 'start', behavior: 'instant' });
    show(current + d);
  }
  prev.addEventListener('click', function () { step(-1); });
  next.addEventListener('click', function () { step(1); });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
  });

  function fromHash() {
    var m = /^#month-(\d{1,2})$/.exec(location.hash);
    if (!m || +m[1] < 1 || +m[1] > cards.length) return false;
    deck.scrollIntoView({ block: 'start', behavior: 'instant' });
    show(parseInt(m[1], 10) - 1, false);
    return true;
  }
  window.addEventListener('hashchange', fromHash);
  if (!fromHash()) mark(0);
})();
