// Shared: mobile nav toggle
(function () {
  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('nav.mainnav');
  if (btn && nav) btn.addEventListener('click', function () { nav.classList.toggle('open'); });
})();
