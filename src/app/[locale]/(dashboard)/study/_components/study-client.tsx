import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Leaf,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function StudyClient() {
  const t = await getTranslations('StudyPage');

  return <></>;
}
