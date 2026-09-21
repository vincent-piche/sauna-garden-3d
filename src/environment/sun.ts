/**
 * Solar position, following the NOAA solar calculation equations.
 *
 * Everything here is pure arithmetic: no Three.js, no DOM, so the maths can be
 * checked on its own. Angles are in degrees at the boundaries of the module and
 * in radians inside it.
 *
 * Deliberate simplifications: no atmospheric refraction beyond the standard
 * −0.833° horizon correction, no daylight saving rule (the UTC offset is a
 * parameter), and the year is fixed for labelling only.
 */

const DEG = Math.PI / 180;
const MINUTES_PER_DEGREE = 4;
const SUNRISE_ZENITH = 90.833 * DEG;

export interface SunPosition {
  /** Degrees above the horizon, negative at night. */
  altitude: number;
  /** Geographic azimuth in degrees, clockwise from north (90 = east). */
  azimuth: number;
}

export interface SunTimes {
  /** Local clock hours, or null when the sun never crosses the horizon that day. */
  sunrise: number | null;
  sunset: number | null;
  solarNoon: number;
  /** True when the sun stays up all day, false when it never rises, null otherwise. */
  polarDay: boolean | null;
}

export interface SunObserver {
  latitude: number;
  /** Positive east. */
  longitude: number;
  /** Hours east of UTC, for instance 1 for CET and 2 for CEST. */
  utcOffset: number;
}

function fractionalYear(dayOfYear: number, hour: number): number {
  return ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hour - 12) / 24);
}

/** Equation of time, in minutes. */
function equationOfTime(gamma: number): number {
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  );
}

/** Solar declination, in radians. */
function declination(gamma: number): number {
  return (
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)
  );
}

/** Minutes to add to local clock time to obtain true solar time. */
function timeOffset(gamma: number, observer: SunObserver): number {
  return equationOfTime(gamma) + MINUTES_PER_DEGREE * observer.longitude - 60 * observer.utcOffset;
}

export function sunPosition(dayOfYear: number, hour: number, observer: SunObserver): SunPosition {
  const gamma = fractionalYear(dayOfYear, hour);
  const decl = declination(gamma);
  const trueSolarTime = hour * 60 + timeOffset(gamma, observer);
  const hourAngle = (trueSolarTime / MINUTES_PER_DEGREE - 180) * DEG;

  const lat = observer.latitude * DEG;
  const sinAltitude =
    Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.min(1, Math.max(-1, sinAltitude)));

  // Azimuth measured from south, westward positive, then rebased on north.
  const fromSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)
  );
  const azimuth = (fromSouth / DEG + 180 + 360) % 360;

  return { altitude: altitude / DEG, azimuth };
}

export function sunTimes(dayOfYear: number, observer: SunObserver): SunTimes {
  const gamma = fractionalYear(dayOfYear, 12);
  const decl = declination(gamma);
  const offset = timeOffset(gamma, observer);
  const solarNoon = (720 - offset) / 60;

  const lat = observer.latitude * DEG;
  const cosHourAngle =
    (Math.cos(SUNRISE_ZENITH) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl));

  if (cosHourAngle < -1) {
    return { sunrise: null, sunset: null, solarNoon, polarDay: true };
  }
  if (cosHourAngle > 1) {
    return { sunrise: null, sunset: null, solarNoon, polarDay: false };
  }

  const hourAngle = Math.acos(cosHourAngle) / DEG;
  return {
    sunrise: (MINUTES_PER_DEGREE * (180 - hourAngle) - offset) / 60,
    sunset: (MINUTES_PER_DEGREE * (180 + hourAngle) - offset) / 60,
    solarNoon,
    polarDay: null
  };
}

/**
 * Converts a solar position into a direction in the model's own frame.
 *
 * The model has a fixed local orientation: −Z is the rear bay. `bayAzimuth` says
 * which geographic azimuth that direction actually points to on the site, which is
 * enough to rotate the whole sky onto the model.
 *
 * Returns the unit vector pointing from the sauna towards the sun.
 */
export function sunDirection(position: SunPosition, bayAzimuth: number): [number, number, number] {
  const relative = (position.azimuth - bayAzimuth) * DEG;
  const altitude = position.altitude * DEG;
  const horizontal = Math.cos(altitude);
  return [horizontal * Math.sin(relative), Math.sin(altitude), -horizontal * Math.cos(relative)];
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre'
];

/** Formats a day of year as a readable date, on a common (non leap) year. */
export function formatDayOfYear(dayOfYear: number): string {
  let remaining = Math.max(1, Math.min(365, Math.round(dayOfYear)));
  for (let month = 0; month < MONTH_LENGTHS.length; month += 1) {
    if (remaining <= MONTH_LENGTHS[month]) {
      return `${remaining} ${MONTH_NAMES[month]}`;
    }
    remaining -= MONTH_LENGTHS[month];
  }
  return '31 décembre';
}

export function formatHour(hour: number | null): string {
  if (hour === null || !Number.isFinite(hour)) {
    return '—';
  }
  const normalised = ((hour % 24) + 24) % 24;
  const hours = Math.floor(normalised);
  const minutes = Math.round((normalised - hours) * 60);
  const carry = minutes === 60;
  return `${String(carry ? hours + 1 : hours).padStart(2, '0')}:${String(carry ? 0 : minutes).padStart(2, '0')}`;
}

/** Compass label for a geographic azimuth. */
export function formatAzimuth(azimuth: number): string {
  const points = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  const index = Math.round((((azimuth % 360) + 360) % 360) / 22.5) % 16;
  return `${Math.round(azimuth)}° ${points[index]}`;
}
