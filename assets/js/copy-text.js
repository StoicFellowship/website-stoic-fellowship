// Copy buttons: <button class="copy-btn" data-copy-target="ID"> copies the text of element #ID.
// Used for the On Stoic Living event blurbs in the Meeting materials panels.
document.addEventListener('click', function (e) {
  var btn = e.target.closest && e.target.closest('.copy-btn');
  if (!btn) return;
  e.preventDefault();
  var src = document.getElementById(btn.getAttribute('data-copy-target'));
  if (!src) return;
  var text = src.innerText.trim();
  var label = btn.querySelector('.copy-label') || btn;
  var old = label.textContent;
  function done(ok) { label.textContent = ok ? 'Copied' : 'Select and copy'; setTimeout(function () { label.textContent = old; }, 2500); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
  } else {
    try { var r = document.createRange(); r.selectNodeContents(src); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); done(document.execCommand('copy')); } catch (err) { done(false); }
  }
});
