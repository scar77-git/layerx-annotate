
// applies the given filter to the provided canvas 2d context
export const applyFilter = (context: CanvasRenderingContext2D, canvasFilters: CanvasFilters['filter']) => {
  
};

// filter options are often represented as number-percentage,
// means that they'll be percentages like `50%` or floating
// in-between 0 and 1 like `.5`, so we normalize them.
// https://developer.mozilla.org/en-US/docs/Web/CSS/filter#number-percentage
export const normalizeNumberPercentage = (percentage: string): number => {
  let normalized = parseFloat(percentage);

  // check for percentages and divide by a hundred
  if (/%\s*?$/i.test(percentage)) {
    normalized /= 100;
  }

  return normalized;
};

// normalizes angles to a float between 0 and 1.
// https://developer.mozilla.org/en-US/docs/Web/CSS/angle#Units
export const normalizeAngle = (angle: string): number => {
  let normalized = parseFloat(angle);
  const unit = angle.slice(normalized.toString().length);

  // check for units and align accordingly
  switch (unit) {
    case 'deg':
      normalized /= 360;
      break;
    case 'grad':
      normalized /= 400;
      break;
    case 'rad':
      normalized /= 2 * Math.PI;
      break;
  }

  return normalized;
};

// TODO: we're assuming pixel based values for now only, so adopt to other lengths as well
// https://developer.mozilla.org/en-US/docs/Web/CSS/length
export const normalizeLength = (length: string): number => {
  return parseFloat(length);
};
