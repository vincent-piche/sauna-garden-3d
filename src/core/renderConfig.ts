/**
 * Rendering quality. Everything here is a trade the machine makes, not a design choice,
 * so it lives apart from the sauna and its site — and every option can be switched off.
 */
export interface RenderConfig {
  /** Screen space ambient occlusion: darkens creases, corners and contacts. */
  ambientOcclusion: boolean;
  /** Renders the scene a second time to make the pool reflect it. */
  waterReflections: boolean;
  /** Irregular foliage volumes instead of plain cones. */
  detailedVegetation: boolean;
  /** 4096 instead of 2048 pixels for the shadow map. */
  highResolutionShadows: boolean;
  /** Upper bound on the device pixel ratio. */
  renderScale: number;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  ambientOcclusion: true,
  waterReflections: true,
  detailedVegetation: true,
  highResolutionShadows: true,
  renderScale: 2
};

export function cloneRenderConfig(config: RenderConfig): RenderConfig {
  return { ...config };
}
