import { z } from 'zod';

export const SOCRATIC_DISCIPLINES = [
  'quantumPhysics',
  'philosophicalEthics',
  'biochemistry',
  'macroeconomics',
] as const;

export const socraticDisciplineSchema = z.enum(SOCRATIC_DISCIPLINES);

export type SocraticDiscipline = z.infer<typeof socraticDisciplineSchema>;

export const DEFAULT_SOCRATIC_DISCIPLINE = 'quantumPhysics';

export const SOCRATIC_GUIDANCE_DEPTHS = [
  'hint',
  'balanced',
  'guidedSteps',
] as const;

export const socraticGuidanceDepthSchema = z.enum(SOCRATIC_GUIDANCE_DEPTHS);

export type SocraticGuidanceDepth = z.infer<typeof socraticGuidanceDepthSchema>;

export const DEFAULT_SOCRATIC_GUIDANCE_DEPTH = 'balanced';
