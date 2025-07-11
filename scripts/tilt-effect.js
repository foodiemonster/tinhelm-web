// Reusable anime.js tilt effect for cards
// Usage: window.enableCardTilt('.tilt-interactive');
window.enableCardTilt = function(selector = '.tilt-interactive') {
  document.querySelectorAll(selector).forEach(card => {
    // Remove previous listeners if any
    card.onmousemove = null;
    card.onmouseleave = null;
    card.addEventListener('mousemove', function(e) {
      // Only apply tilt if NOT zoomed
      if (card.classList.contains('zoomed')) {
        card.style.transform = '';
        return;
      }
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      // Tilt AWAY from mouse (pressed-in effect)
      const rotateY = -((x - centerX) / centerX) * 15;
      const rotateX = ((y - centerY) / centerY) * 15;
      let scale = 1.06;
      card.style.transform = `scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseleave', function() {
      // Only reset if NOT zoomed
      if (card.classList.contains('zoomed')) {
        card.style.transform = '';
        return;
      }
      card.style.transform = '';
    });
  });
};