// Runs before first paint (classic script) so the saved theme never flashes.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    var saved = window.localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (err) { /* storage blocked: fall back to the system preference */ }
})();
