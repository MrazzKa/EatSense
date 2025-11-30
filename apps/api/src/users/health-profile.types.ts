export type FatDistributionType = 'visceral' | 'gynoid' | 'mixed';

export type SnackingTendency = 'low' | 'medium' | 'high';

export type Chronotype = 'early' | 'mid' | 'late';

export type Glp1DrugType = 'semaglutide' | 'tirzepatide' | 'liraglutide';

export type Glp1TherapyGoal =
  | 'preserve_muscle'
  | 'appetite_control'
  | 'weight_maintenance'
  | 'slow_weight_loss';

export interface HealthFocusAreas {
  sugarControl?: boolean;
  cholesterol?: boolean;
  inflammation?: boolean;
  iron?: boolean;
  microbiome?: boolean;
  hormonalBalance?: boolean;
}

export interface HealthProfile {
  metabolic?: {
    bodyFatPercent?: number; // 5–60
    waistCm?: number; // 50–150
    hipCm?: number; // 70–160
    whr?: number; // auto (waist/hip)
    fatDistributionType?: FatDistributionType; // visceral/gynoid/mixed
  };

  eatingBehavior?: {
    mealsPerDay?: number; // 1–8
    snackingTendency?: SnackingTendency; // low/medium/high
    eveningAppetite?: boolean; // yes/no
  };

  sleep?: {
    sleepHours?: number; // 3–12 (0.5 step allowed)
    chronotype?: Chronotype; // early/mid/late
  };

  glp1Module?: {
    isGlp1User?: boolean; // yes/no
    drugType?: Glp1DrugType; // Semaglutide / Tirzepatide / Liraglutide
    therapyGoal?: Glp1TherapyGoal; // preserve_muscle / appetite_control / ...
  };

  healthFocus?: HealthFocusAreas;
}

