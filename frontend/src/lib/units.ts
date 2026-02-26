/**
 * Unit conversion utilities for metric/imperial display
 */

export type UnitSystem = 'metric' | 'imperial';

/**
 * Convert meters to the specified unit system
 */
export function formatLength(meters: number, unitSystem: UnitSystem, decimals: number = 1): string {
  if (unitSystem === 'metric') {
    return `${meters.toFixed(decimals)} m`;
  } else {
    const feet = meters * 3.28084;
    return `${feet.toFixed(decimals)} ft`;
  }
}

/**
 * Convert square meters to the specified unit system
 */
export function formatArea(squareMeters: number, unitSystem: UnitSystem, decimals: number = 2): string {
  if (unitSystem === 'metric') {
    return `${squareMeters.toFixed(decimals)} m²`;
  } else {
    const squareFeet = squareMeters * 10.7639;
    return `${squareFeet.toFixed(decimals)} ft²`;
  }
}

/**
 * Get the unit label for the current system
 */
export function getUnitLabel(unitSystem: UnitSystem): string {
  return unitSystem === 'metric' ? 'meters' : 'feet';
}

/**
 * Convert from display units back to meters (for form inputs)
 */
export function parseLength(value: number, unitSystem: UnitSystem): number {
  if (unitSystem === 'metric') {
    return value;
  } else {
    // Convert feet to meters
    return value / 3.28084;
  }
}
