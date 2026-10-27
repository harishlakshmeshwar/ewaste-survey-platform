import type { RawRow } from '../src/lib/normalize'
import { QUESTIONS } from '../src/lib/schema'

/** Builds a fully valid row with sensible defaults; override per question. */
export function makeRow(overrides: Partial<Record<string, string>> = {}): RawRow {
  const row: RawRow = {
    Timestamp: '2026-10-01 10:00:00',
    'Respondent Category': 'Student',
    'Department or School': 'CSE',
    'Familiarity with E-Waste Term': 'Very familiar',
    'Ability to Identify E-Waste Items': 'Yes, I can identify most of them',
    'Awareness of Environmental and Health Impacts': 'Fully aware',
    'Previous E-Waste Awareness Training': 'No',
    'Device Replacement Frequency': 'Every 2–3 years',
    'Typical Disposal Method': 'Store at home (unused)',
    'Use of Authorized Recycling Facility': 'No',
    'Knowledge of Responsible Disposal Locations': 'Yes, near campus',
    'Awareness of Campus Collection Facilities': 'No, I am not aware of any',
    'Willingness to Use Campus Facility': 'Definitely',
      'Barriers to Responsible Disposal': 'Lack of awareness, No convenient collection point',
      'Perceived Usefulness of Awareness Campaigns': 'Very useful',
      'Improvement Measures': '',
      'Incineration Risk Awareness': 'Release of toxic fumes and pollutants',
      'Landfill Contamination': 'Hazardous substances may contaminate soil and groundwater',
      'Health Effects of E-Waste Exposure': 'Respiratory problems, Skin irritation',
      'Hazardous Pollutants': 'Lead, Mercury',
      'Environmental Components Affected': 'Air, Soil, Surface water and groundwater',
      ...overrides,
  }
  return row
}

/** N shape-consistent rows with distinct timestamps (so dedupe treats them as separate). */
export function makeRows(count: number, rotate: Partial<Record<string, string>>[] = []): RawRow[] {
  return Array.from({ length: count }, (_, i) => {
    const overrides = rotate.length > 0 ? rotate[i % rotate.length] : {}
    const base = makeRow(overrides)
    const seconds = String((i % 60) + 1).padStart(2, '0')
    const minutes = String(Math.floor(i / 60) % 60).padStart(2, '0')
    if (!overrides.Timestamp) {
      base.Timestamp = `2026-10-01 ${minutes}:${seconds}:00`
    }
    return base
  })
}

export function allColumns(): string[] {
  return QUESTIONS.map((q) => q.column)
}
