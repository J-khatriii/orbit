export const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

// Light colours need dark text on top, dark colours need white. This picks one.
export const readableTextColor = (hex) => {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  // Perceived brightness, 0 (black) to 255 (white).
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 160 ? "#1c1b18" : "#ffffff";
};
