/* Session-card deck on /first-year: prev/next, numbered dots, swipe.
   Works without JS too: the dots are plain #month-N links and the track scrolls. */
(function () {
  var deck = document.querySelector('.session-deck');
  if (!deck) return;
  var track = deck.querySelector('.session-track');
  var cards = Array.prototype.slice.call(track.querySelectorAll('.session-card'));
  var prev = deck.querySelector('.session-prev');
  var next = deck.querySelector('.session-next');
  var dots = Array.prototype.slice.call(deck.querySelectorAll('.session-dots a'));
  var current = 0;

  function show(i, smooth) {
    i = Math.max(0, Math.min(cards.length - 1, i));
    track.scrollTo({ left: cards[i].offsetLeft - track.offsetLeft - 4, behavior: smooth === false ? 'auto' : 'smooth' });
    mark(i);
  }

  function mark(i) {
    current = i;
    dots.forEach(function (d, j) { d.setAttribute('aria-current', j === i ? 'true' : 'false'); });
    prev.disabled = i === 0;
    next.disabled = i === cards.length - 1;
  }

  var t;
  track.addEventListener('scroll', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var w = cards[0].offsetWidth + 24;
      mark(Math.round(track.scrollLeft / w));
    }, 80);
  });

  prev.addEventListener('click', function () { show(current - 1); });
  next.addEventListener('click', function () { show(current + 1); });
  dots.forEach(function (d, j) {
    d.addEventListener('click', function (e) {
      e.preventDefault();
      show(j);
      if (history.replaceState) history.replaceState(null, '', '#month-' + (j + 1));
    });
  });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
  });

  function fromHash() {
    var m = /^#month-([1-6])$/.exec(location.hash);
    if (!m) return false;
    show(parseInt(m[1], 10) - 1, false);
    deck.scrollIntoView({ block: 'start' });
    return true;
  }
  window.addEventListener('hashchange', fromHash);
  if (!fromHash()) mark(0);
})();
