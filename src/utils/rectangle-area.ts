export type LengthUnit = 'in' | 'cm' | 'm' | 'ft';

export interface RectangleAreaInput {
  width: number;
  height: number;
  unit: LengthUnit;
}

export interface FieldError {
  field: string;
  message: string;
}

export type RectangleAreaResult =
  | {
      ok: true;
      result: {
        area: number;
        unitLabel: string;
        width: number;
        height: number;
        unit: LengthUnit;
      };
    }
  | { ok: false; errors: FieldError[] };

const UNIT_LABELS: Record<LengthUnit, string> = {
  in: 'square inches',
  cm: 'square centimeters',
  m: 'square meters',
  ft: 'square feet',
};

export function isLengthUnit(value: string): value is LengthUnit {
  return value === 'in' || value === 'cm' || value === 'm' || value === 'ft';
}

export function validateRectangleAreaInput(raw: {
  width: unknown;
  height: unknown;
  unit: unknown;
}): FieldError[] {
  const errors: FieldError[] = [];

  const width = typeof raw.width === 'number' ? raw.width : Number(raw.width);
  const height = typeof raw.height === 'number' ? raw.height : Number(raw.height);
  const unit = typeof raw.unit === 'string' ? raw.unit : '';

  if (!Number.isFinite(width) || width <= 0) {
    errors.push({ field: 'width', message: 'Enter a width greater than zero.' });
  }
  if (!Number.isFinite(height) || height <= 0) {
    errors.push({ field: 'height', message: 'Enter a height greater than zero.' });
  }
  if (!isLengthUnit(unit)) {
    errors.push({ field: 'unit', message: 'Choose a valid unit.' });
  }

  return errors;
}

/** Pure area calculation: width × height in the selected unit. */
export function calculateRectangleArea(input: RectangleAreaInput): RectangleAreaResult {
  const errors = validateRectangleAreaInput(input);
  if (errors.length > 0) return { ok: false, errors };

  const area = input.width * input.height;
  return {
    ok: true,
    result: {
      area,
      unitLabel: UNIT_LABELS[input.unit],
      width: input.width,
      height: input.height,
      unit: input.unit,
    },
  };
}
