import * as z from 'zod';

export const SOCRATIC_DISCIPLINES = [
  'quantumPhysics',
  'philosophicalEthics',
  'biochemistry',
  'macroeconomics',
] as const;

export const socraticDisciplineSchema = z.enum(SOCRATIC_DISCIPLINES);

export type SocraticDiscipline = z.infer<typeof socraticDisciplineSchema>;

export const DEFAULT_SOCRATIC_DISCIPLINE = 'quantumPhysics';
