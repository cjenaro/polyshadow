const TAU = Math.PI * 2;
const STAMINA_COLOR = '#d4a843';
const STAMINA_BG = '#333333';
const HINT_COLOR = 'rgba(255, 255, 255, 0.5)';

export function createHUD(canvas) {
  const ctx = canvas.getContext('2d');
  let time = 0;

  function update(dt) {
    time += dt;
  }

  function draw(state) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    drawStaminaArc(state.stamina, w, h);
    if (state.hints && state.hints.length > 0) {
      drawHints(state.hints, w, h);
    }
  }

  function drawStaminaArc(stamina, w, h) {
    if (stamina == null) return;
    const ratio = Math.max(0, Math.min(1, stamina));
    if (ratio >= 1) return;

    const cx = 70;
    const cy = h - 70;
    const radius = 40;
    const lineW = 8;
    const startAngle = Math.PI * 0.5;
    const endAngle = startAngle + ratio * TAU;

    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + TAU);
    ctx.strokeStyle = STAMINA_BG;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = STAMINA_COLOR;
    ctx.stroke();
  }

  function drawHints(hints, w, h) {
    const margin = 40;
    const arrowLen = 16;
    const headLen = 6;

    for (const hint of hints) {
      const angle = hint.angle;
      const ax = w / 2 + Math.cos(angle) * (w / 2 - margin);
      const ay = h / 2 + Math.sin(angle) * (h / 2 - margin);

      const tipX = Math.max(margin, Math.min(w - margin, ax));
      const tipY = Math.max(margin, Math.min(h - margin, ay));

      const dx = Math.cos(angle) * arrowLen;
      const dy = Math.sin(angle) * arrowLen;

      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(tipX - dx, tipY - dy);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      const perpX = -Math.sin(angle) * headLen * 0.5;
      const perpY = Math.cos(angle) * headLen * 0.5;
      const backX = tipX - Math.cos(angle) * headLen;
      const backY = tipY - Math.sin(angle) * headLen;

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(backX + perpX, backY + perpY);
      ctx.lineTo(backX - perpX, backY - perpY);
      ctx.closePath();
      ctx.fill();

      if (hint.label) {
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(hint.label, tipX, tipY - 8);
      }

      ctx.restore();
    }
  }

  function show() {
    canvas.style.display = '';
  }

  function hide() {
    canvas.style.display = 'none';
  }

  function resize(newW, newH) {
    canvas.width = newW;
    canvas.height = newH;
  }

  return { update, draw, show, hide, resize };
}
