export type Sex = 'hombre' | 'mujer';
export type Goal = 'bajar' | 'mantener' | 'subir';
export type WeightSuggestion = { peso_sugerido: number; peso_min_saludable: number; peso_max_saludable: number; nota: string | null };
export type WeightSuggestionArgs = { p_altura_cm: number; p_peso_kg: number; p_objetivo: Goal };
export type Activity = 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy_activo';
export type ProfileFields = {
  sexo: Sex | null; fecha_nacimiento: string | null; altura_cm: number | null;
  peso_kg: number | null; peso_objetivo_kg: number | null; actividad: Activity | null;
  objetivo: Goal | null; ritmo_kg_semana: number | null; onboarding_completo: boolean;
};
export type TargetArgs = {
  p_sexo: Sex; p_fecha_nac: string; p_altura_cm: number; p_peso_kg: number;
  p_actividad: Activity; p_objetivo: Goal; p_ritmo_kg_semana: number;
};
export type CompleteArgs = TargetArgs & { p_peso_objetivo_kg: number; p_hora_registro: string; p_nombre: string };
export type Targets = { bmr: number; tdee: number; kcal_objetivo: number; kcal_min: number; kcal_max: number; prot_min: number; prot_max: number };
export type OnboardingDraft = {
  name: string; goal: Goal | ''; sex: Sex | ''; birth: string; height: string;
  weight: string; target: string; pace: number; activity: Activity | ''; time: string;
};
export const emptyOnboarding: OnboardingDraft = {
  name: '', goal: '', sex: '', birth: '', height: '170', weight: '', target: '', pace: 0.5, activity: '', time: '21:00',
};
