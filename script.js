(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (menuButton && nav) menuButton.addEventListener('click', () => nav.classList.toggle('open'));
  document.querySelectorAll('#year').forEach(el => el.textContent = new Date().getFullYear());

  const canvas = document.getElementById('rain');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, drops = [];
  let raf = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const amount = Math.max(45, Math.min(110, Math.floor(w / 8)));
    drops = Array.from({length: amount}, () => ({
      x: Math.random() * w, y: Math.random() * h,
      length: 3 + Math.random() * 5,
      speed: 0.8 + Math.random() * 1.7,
      opacity: 0.35 + Math.random() * 0.5,
      travel: 0, limit: 90 + Math.random() * 180
    }));
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);
    for (const d of drops) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 0.5, d.y + d.length);
      ctx.strokeStyle = 'rgba(170,205,255,' + d.opacity + ')';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      d.y += d.speed;
      d.travel += d.speed;
      if (d.travel >= d.limit || d.y > h + 10) {
        d.x = Math.random() * w;
        d.y = -Math.random() * 35;
        d.travel = 0;
        d.limit = 90 + Math.random() * 180;
      }
    }
    raf = requestAnimationFrame(animate);
  }
  resize();
  window.addEventListener('resize', resize, {passive:true});
  if (raf) cancelAnimationFrame(raf);
  animate();
})();
