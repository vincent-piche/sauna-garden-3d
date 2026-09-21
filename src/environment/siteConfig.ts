/**
 * Configuration of the site around the sauna: sun, terrain, pool and the trees
 * that actually shade the building.
 *
 * Same conventions as the sauna configuration: millimetres, degrees, decimal hours.
 * Distances are measured from the sauna itself, so the decor follows when the
 * building changes size.
 */
export interface SiteConfig {
  /** Observer, used by the solar calculation. */
  latitude: number;
  longitude: number;
  /** Hours east of UTC: 1 in winter, 2 during European summer time. */
  utcOffset: number;
  /** Geographic azimuth the rear bay faces. 135 = south-east. */
  bayAzimuth: number;
  dayOfYear: number;
  hourOfDay: number;

  /** Ground falling away towards the valley, behind the rear facade. */
  gardenSlope: number;
  /** Distance behind the rear facade where the ground starts to fall. */
  slopeStart: number;
  /** Total drop the slope saturates at, so the valley floor levels out. */
  valleyDrop: number;
  /** Distance to the far ridge closing the view. */
  ridgeDistance: number;
  ridgeHeight: number;

  /** Pool, in front of the entrance. */
  poolLength: number;
  poolWidth: number;
  /** From the front facade to the near edge of the coping. */
  poolDistance: number;
  poolDepth: number;
  copingWidth: number;
  /** Paving kept around the coping. */
  terraceMargin: number;

  /** Solar masks: the cedar on the right, the cypress screen on the left, the rear hedge. */
  cedarHeight: number;
  cedarDistance: number;
  cypressHeight: number;
  cypressDistance: number;
  hedgeHeight: number;
  hedgeDistance: number;

  showSunPath: boolean;
  showDecor: boolean;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  latitude: 40.6,
  longitude: -4.0,
  utcOffset: 2,
  bayAzimuth: 135,
  dayOfYear: 264,
  hourOfDay: 9,

  gardenSlope: 14,
  slopeStart: 4000,
  valleyDrop: 55000,
  ridgeDistance: 320000,
  ridgeHeight: 34000,

  poolLength: 9000,
  poolWidth: 4500,
  poolDistance: 3200,
  poolDepth: 1500,
  copingWidth: 450,
  terraceMargin: 2200,

  cedarHeight: 15000,
  cedarDistance: 7000,
  cypressHeight: 12000,
  cypressDistance: 6000,
  hedgeHeight: 1600,
  hedgeDistance: 2600,

  showSunPath: true,
  showDecor: true
};

export function cloneSiteConfig(config: SiteConfig): SiteConfig {
  return { ...config };
}
