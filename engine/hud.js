const TAU = Math.PI * 2;
const STAMINA_COLOR = '#d4a843';
const STAMINA_BG = '#333333';
const HINT_COLOR = 'rgba(255, 255, 255, 0.5)';
const CONTROL_HINT_COLOR = 'rgba(255, 255, 255, 0.75)';
const CONTROL_HINT_FADE_TIME = 1.5;

export function createHUD(canvas) {
  const ctx = canvas.getContext('2d');
  let time = 0;
  let controlHintOpacity = 1;
  let controlHintTarget = 1;
  let controlHintVisible = false;

  function showControlHints() {
    controlHintVisible = true;
    controlHintOpacity = 1;
    controlHintTarget = 1;
  }

  function hideControlHints() {
    controlHintTarget = 0;
  }

  function update(dt) {
    time += dt;
    if (!controlHintVisible && controlHintTarget === 0) return;
    if (controlHintTarget === 0) {
      controlHintOpacity = Math.max(0, controlHintOpacity - dt / CONTROL_HINT_FADE_TIME);
      if (controlHintOpacity <= 0) controlHintVisible = false;
    }
  }

  function draw(state) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    drawStaminaArc(state.stamina, w, h);
    if (state.hints && state.hints.length > 0) {
      drawHints(state.hints, w, h);
    }
    if (state.controlHints && state.controlHints.length > 0 && controlHintOpacity > 0) {
      drawControlHints(state.controlHints, w, h);
    }
    if (state.skipHint) {
      drawSkipHint(w, h);
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

  function drawControlHints(hints, w, h) {
    const fontSize = Math.max(12, Math.min(16, w * 0.014));
    const lineHeight = fontSize * 1.8;
    const padding = 20;
    const boxW = 240;
    const boxH = hints.length * lineHeight + padding * 2;
    const boxX = w / 2 - boxW / 2;
    const boxY = h - boxH - 50;

    ctx.save();
    ctx.globalAlpha = controlHintOpacity * 0.85;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    const r = 8;
    ctx.moveTo(boxX + r, boxY);
    ctx.lineTo(boxX + boxW - r, boxY);
    ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
    ctx.lineTo(boxX + boxW, boxY + boxH - r);
    ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
    ctx.lineTo(boxX + r, boxY + boxH);
    ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
    ctx.lineTo(boxX, boxY + r);
    ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = controlHintOpacity;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (let i = 0; i < hints.length; i++) {
      const hint = hints[i];
      const y = boxY + padding + i * lineHeight;

      if (hint.keys) {
        ctx.fillStyle = CONTROL_HINT_COLOR;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillText(hint.keys, boxX + padding, y);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = CONTROL_HINT_COLOR;
        const keysW = ctx.measureText(hint.keys).width;
        ctx.fillText(hint.action, boxX + padding + keysW + 8, y);
      } else {
        ctx.fillStyle = CONTROL_HINT_COLOR;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillText(hint.text, boxX + padding, y);
      }
    }

    ctx.restore();
  }

  function drawSkipHint(w, h) {
    const fontSize = Math.max(14, Math.min(20, w * 0.016));
    const pulse = 0.5 + 0.5 * Math.sin(time * 2);
    const alpha = 0.4 + pulse * 0.3;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Press any key to skip', w / 2, h - 40);
    ctx.restore();
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

  return { update, draw, show, hide, resize, showControlHints, hideControlHints };
}
