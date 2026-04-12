export type GradeType = 'PSA10' | 'UNGRADED';

export interface GradeConfig {
  label: string;
  shortLabel: string;
  /** Semantic color key from theme tokens */
  colorKey: 'warning' | 'onSurfaceVariant';
}

export const GRADES: Record<GradeType, GradeConfig> = {
  PSA10: {
    label: 'PSA 10',
    shortLabel: 'PSA 10',
    colorKey: 'warning',
  },
  UNGRADED: {
    label: 'Ungraded',
    shortLabel: 'Raw',
    colorKey: 'onSurfaceVariant',
  },
} as const;

export const GRADE_OPTIONS: GradeType[] = ['UNGRADED', 'PSA10'];
