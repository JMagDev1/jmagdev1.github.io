// Runs before first paint (classic script) so saved display settings never
// flash. Nothing here overrides the device unless the visitor chose it on
// this site: no saved theme = follow the device's light/dark setting.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    var store = window.localStorage;
    var theme = store.getItem('theme');
    if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
    if (store.getItem('motion') === 'reduce') root.classList.add('reduce-motion');
    if (store.getItem('reading') === 'easy') root.classList.add('easy-read');
  } catch (err) { /* storage blocked: device settings apply */ }
})();
