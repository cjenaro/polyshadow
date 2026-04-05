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
  ];

  return { joystickCenter, joystickRadius, buttons };
}

export { createTouchLayout };
