function createTouchLayout(screenWidth, screenHeight) {
  const minDim = Math.min(screenWidth, screenHeight);
  const unit = minDim * 0.065;

  const joystickRadius = Math.max(unit * 2.2, 20);
  const buttonRadius = Math.max(unit * 1.1, 15);
  const padding = buttonRadius * 1.3;

  const joystickCenter = {
    x: padding + joystickRadius,
    y: screenHeight - padding - joystickRadius,
  };

  const rightCenterX = screenWidth - padding - buttonRadius;
  const baseY = screenHeight * 0.45;
  const spread = Math.min(buttonRadius * 2.8, rightCenterX - screenWidth * 0.5 - buttonRadius);
  const rightSpread = Math.min(spread, screenWidth - rightCenterX - buttonRadius);

  const buttons = [
    {
      id: 'jump',
      x: rightCenterX,
      y: Math.max(padding, baseY - spread * 1.2),
      radius: buttonRadius,
    },
    {
      id: 'grab',
      x: rightCenterX - spread,
      y: Math.min(screenHeight - padding, baseY + spread * 0.5),
      radius: buttonRadius,
    },
    {
      id: 'attack',
      x: rightCenterX + rightSpread,
      y: Math.min(screenHeight - padding, baseY + spread * 0.5),
      radius: buttonRadius,
    },
    {
      id: 'sprint',
      x: rightCenterX,
      y: Math.min(screenHeight - padding, baseY + spread * 2.2),
      radius: buttonRadius * 0.85,
    },
  ];

  return { joystickCenter, joystickRadius, buttons };
}

function createTouchOverlay() {
  if (typeof document === 'undefined') return null;
  if (!(('ontouchstart' in window) || navigator.maxTouchPoints > 0)) return null;

  const container = document.createElement('div');
  container.id = 'touch-overlay';
  Object.assign(container.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '6',
    pointerEvents: 'none',
    touchAction: 'none',
  });

  const joystickRing = document.createElement('div');
  joystickRing.id = 'touch-joystick-ring';
  Object.assign(joystickRing.style, {
    position: 'absolute',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.25)',
    background: 'rgba(255, 255, 255, 0.06)',
    pointerEvents: 'none',
  });
  container.appendChild(joystickRing);

  const joystickThumb = document.createElement('div');
  joystickThumb.id = 'touch-joystick-thumb';
  Object.assign(joystickThumb.style, {
    position: 'absolute',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.35)',
    pointerEvents: 'none',
    transition: 'background 0.1s',
  });
  container.appendChild(joystickThumb);

  const LABELS = { jump: 'JUMP', grab: 'GRAB', attack: 'ATK', sprint: 'RUN' };
  const COLORS = { jump: '255,255,255', grab: '100,200,255', attack: '255,100,100', sprint: '255,200,100' };

  const buttonElements = {};

  function buildButtons() {
    for (const key of Object.keys(buttonElements)) {
      container.removeChild(buttonElements[key]);
      delete buttonElements[key];
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const layout = createTouchLayout(w, h);

    const jr = layout.joystickRadius;
    const jc = layout.joystickCenter;
    const d = jr * 2;
    joystickRing.style.width = d + 'px';
    joystickRing.style.height = d + 'px';
    joystickRing.style.left = (jc.x - jr) + 'px';
    joystickRing.style.top = (jc.y - jr) + 'px';

    const thumbR = jr * 0.45;
    const td = thumbR * 2;
    joystickThumb.style.width = td + 'px';
    joystickThumb.style.height = td + 'px';
    joystickThumb.style.left = (jc.x - thumbR) + 'px';
    joystickThumb.style.top = (jc.y - thumbR) + 'px';

    for (const btn of layout.buttons) {
      const el = document.createElement('div');
      el.dataset.action = btn.id;
      const size = btn.radius * 2;
      const color = COLORS[btn.id] || '255,255,255';
      Object.assign(el.style, {
        position: 'absolute',
        width: size + 'px',
        height: size + 'px',
        borderRadius: '50%',
        border: `2px solid rgba(${color}, 0.5)`,
        background: `rgba(${color}, 0.15)`,
        left: (btn.x - btn.radius) + 'px',
        top: (btn.y - btn.radius) + 'px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: `rgba(${color}, 0.7)`,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        fontSize: Math.max(9, btn.radius * 0.5) + 'px',
        fontWeight: '600',
        letterSpacing: '0.05em',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: 'none',
      });
      el.textContent = LABELS[btn.id] || btn.id.toUpperCase();
      container.appendChild(el);
      buttonElements[btn.id] = el;
    }

    return layout;
  }

  let layout = buildButtons();

  function onResize() {
    layout = buildButtons();
  }
  window.addEventListener('resize', onResize);

  return {
    container,
    getLayout() { return layout; },
    highlightButton(id) {
      const el = buttonElements[id];
      if (!el) return;
      const color = COLORS[id] || '255,255,255';
      el.style.background = `rgba(${color}, 0.45)`;
      el.style.border = `2px solid rgba(${color}, 0.9)`;
    },
    unhighlightButton(id) {
      const el = buttonElements[id];
      if (!el) return;
      const color = COLORS[id] || '255,255,255';
      el.style.background = `rgba(${color}, 0.15)`;
      el.style.border = `2px solid rgba(${color}, 0.5)`;
    },
    updateJoystickThumb(dx, dy) {
      const jc = layout.joystickCenter;
      const thumbR = layout.joystickRadius * 0.45;
      joystickThumb.style.left = (jc.x - thumbR + dx) + 'px';
      joystickThumb.style.top = (jc.y - thumbR + dy) + 'px';
      joystickThumb.style.background = (dx !== 0 || dy !== 0)
        ? 'rgba(255, 255, 255, 0.55)'
        : 'rgba(255, 255, 255, 0.35)';
    },
    resetJoystickThumb() {
      const jc = layout.joystickCenter;
      const thumbR = layout.joystickRadius * 0.45;
      joystickThumb.style.left = (jc.x - thumbR) + 'px';
      joystickThumb.style.top = (jc.y - thumbR) + 'px';
      joystickThumb.style.background = 'rgba(255, 255, 255, 0.35)';
    },
    destroy() {
      window.removeEventListener('resize', onResize);
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
}

export { createTouchLayout, createTouchOverlay };
