/** sRGB ↔ OKLab conversions (Björn Ottosson), so gradients look even to the eye (SPEC 7.8). */

interface Rgb {
  red: number;
  green: number;
  blue: number;
}
interface Oklab {
  lightness: number;
  greenRed: number;
  blueYellow: number;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_CHANNEL = 255;

export function parseHexColor(hexColor: string): Rgb {
  if (!HEX_COLOR.test(hexColor)) throw new Error(`Not a #RRGGBB color: ${hexColor}`);
  return {
    red: Number.parseInt(hexColor.slice(1, 3), 16),
    green: Number.parseInt(hexColor.slice(3, 5), 16),
    blue: Number.parseInt(hexColor.slice(5, 7), 16),
  };
}

function toLinear(channel: number): number {
  const normalized = channel / MAX_CHANNEL;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function fromLinear(linear: number): number {
  const normalized = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.min(MAX_CHANNEL, Math.max(0, Math.round(normalized * MAX_CHANNEL)));
}

function rgbToOklab({ red, green, blue }: Rgb): Oklab {
  const linearRed = toLinear(red);
  const linearGreen = toLinear(green);
  const linearBlue = toLinear(blue);
  const long = Math.cbrt(
    0.4122214708 * linearRed + 0.5363325363 * linearGreen + 0.0514459929 * linearBlue,
  );
  const medium = Math.cbrt(
    0.2119034982 * linearRed + 0.6806995451 * linearGreen + 0.1073969566 * linearBlue,
  );
  const short = Math.cbrt(
    0.0883024619 * linearRed + 0.2817188376 * linearGreen + 0.6299787005 * linearBlue,
  );
  return {
    lightness: 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    greenRed: 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
    blueYellow: 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
  };
}

function oklabToHex({ lightness, greenRed, blueYellow }: Oklab): string {
  const long = (lightness + 0.3963377774 * greenRed + 0.2158037573 * blueYellow) ** 3;
  const medium = (lightness - 0.1055613458 * greenRed - 0.0638541728 * blueYellow) ** 3;
  const short = (lightness - 0.0894841775 * greenRed - 1.291485548 * blueYellow) ** 3;
  const channels = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ];
  return `#${channels
    .map((channel) => fromLinear(channel).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/** `fraction` 0 gives `startHex`, 1 gives `endHex`. */
export function interpolateOklab(startHex: string, endHex: string, fraction: number): string {
  const start = rgbToOklab(parseHexColor(startHex));
  const end = rgbToOklab(parseHexColor(endHex));
  const clamped = Math.min(1, Math.max(0, fraction));
  return oklabToHex({
    lightness: start.lightness + (end.lightness - start.lightness) * clamped,
    greenRed: start.greenRed + (end.greenRed - start.greenRed) * clamped,
    blueYellow: start.blueYellow + (end.blueYellow - start.blueYellow) * clamped,
  });
}

export interface YearColorScale {
  oldestYear: number;
  newestYear: number;
  oldestColor: string;
  newestColor: string;
}

/** Newest year gets the bright color, the oldest the dark one (SPEC 7.8). A single year is "newest". */
export function computeYearColor(year: number, scale: YearColorScale): string {
  const span = scale.newestYear - scale.oldestYear;
  const fraction = span === 0 ? 1 : (year - scale.oldestYear) / span;
  return interpolateOklab(scale.oldestColor, scale.newestColor, fraction);
}
