import { Vector3 } from './Matrix';

/** Color as CSS hex, rgb(), or [r,g,b,a] 0-1 */
export type ColorLike = string | [number, number, number] | [number, number, number, number];

export interface Settings {
  /** Whether to use the orthographic projection. */
  useOrthographic: boolean;
  /** The field of view in radians. */
  fieldOfView: number;
  /** The zoom factor for the orthographic projection. */
  zoom: number;
  /** The visible world height when orthographic camera is enabled. */
  orthographicHeight: number;
  /** The translation (x, y, z) of the orthographic projection. */
  orthographicTranslation: Vector3;
  /** The translation (x, y, z) of the scene. */
  translation: Vector3;
  /** The scale (x, y, z) of the scene. */
  scale: Vector3;
  /** The rotation of the scene in radians. */
  rotation: number;
}
