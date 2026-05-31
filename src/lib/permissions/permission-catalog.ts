import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Eye,
  FilePlus,
  Files,
  Folder,
  FolderCog,
  GraduationCap,
  LibraryBig,
  ListChecks,
  MessageSquare,
  Pencil,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ToggleLeft,
  Trash2,
  UserCog,
  UserPlus,
  UserRoundCog,
  Users,
  WandSparkles,
  Workflow,
} from 'lucide-react';
import {
  COURSE_PERMISSION,
  type PermissionKey,
  PLATFORM_PERMISSION,
} from '@/lib/permissions/permission-keys';

export type PermissionDefinition = {
  key: PermissionKey;
  icon: LucideIcon;
  title: string;
  description: string;
};

export type PermissionCategory = {
  icon: LucideIcon;
  title: string;
  description: string;
  permissions: readonly PermissionDefinition[];
};

export const PLATFORM_PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    icon: Users,
    title: 'User administration',
    description: 'Manage platform users, roles, and access control.',
    permissions: [
      {
        key: PLATFORM_PERMISSION.USERS_VIEW,
        icon: Eye,
        title: 'View users',
        description: 'View platform user accounts.',
      },
      {
        key: PLATFORM_PERMISSION.USERS_CREATE,
        icon: UserPlus,
        title: 'Create users',
        description: 'Create new platform users.',
      },
      {
        key: PLATFORM_PERMISSION.USERS_UPDATE,
        icon: UserCog,
        title: 'Update users',
        description: 'Edit user details and assigned roles.',
      },
      {
        key: PLATFORM_PERMISSION.ROLES_VIEW,
        icon: Shield,
        title: 'View roles',
        description: 'View platform and course role configuration.',
      },
      {
        key: PLATFORM_PERMISSION.ROLES_MANAGE,
        icon: ShieldCheck,
        title: 'Manage roles',
        description: 'Edit role permission assignments.',
      },
    ],
  },
  {
    icon: BookOpen,
    title: 'Courses',
    description: 'Create and moderate courses at the platform level.',
    permissions: [
      {
        key: PLATFORM_PERMISSION.COURSES_CREATE,
        icon: Plus,
        title: 'Create courses',
        description: 'Create new courses.',
      },
      {
        key: PLATFORM_PERMISSION.COURSES_VIEW_ALL,
        icon: Eye,
        title: 'View all courses',
        description: 'View courses across the platform.',
      },
      {
        key: PLATFORM_PERMISSION.COURSES_MODERATE,
        icon: ToggleLeft,
        title: 'Moderate courses',
        description: 'Enable, disable, publish, or unpublish courses.',
      },
    ],
  },
  {
    icon: Files,
    title: 'Personal files',
    description: 'Manage personal file storage.',
    permissions: [
      {
        key: PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE,
        icon: Folder,
        title: 'Manage personal files',
        description: 'Upload, rename, move, share, and delete personal files.',
      },
    ],
  },
  {
    icon: Sparkles,
    title: 'AI tools',
    description: 'Control access to platform AI-assisted workflows.',
    permissions: [
      {
        key: PLATFORM_PERMISSION.AI_USE_CHAT,
        icon: MessageSquare,
        title: 'Use AI chat',
        description: 'Use the general AI chat assistant.',
      },
      {
        key: PLATFORM_PERMISSION.AI_USE_WRITING,
        icon: Pencil,
        title: 'Use writing assistant',
        description: 'Use the AI writing assistant.',
      },
    ],
  },
  {
    icon: Workflow,
    title: 'Infrastructure',
    description:
      'System-level controls for platform administration and technical operations.',
    permissions: [
      {
        key: PLATFORM_PERMISSION.SYSTEM_SETTINGS_MANAGE,
        icon: Settings,
        title: 'Manage system settings',
        description: 'Manage platform settings and integrations.',
      },
    ],
  },
];

export const COURSE_PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    icon: BookOpen,
    title: 'Course settings',
    description: 'Configure an individual course.',
    permissions: [
      {
        key: COURSE_PERMISSION.COURSE_SETTINGS_MANAGE,
        icon: SlidersHorizontal,
        title: 'Manage course settings',
        description: 'Edit course configuration.',
      },
    ],
  },
  {
    icon: UserRoundCog,
    title: 'Course members',
    description: 'Control course membership and member roles.',
    permissions: [
      {
        key: COURSE_PERMISSION.COURSE_MEMBERS_VIEW,
        icon: Users,
        title: 'View members',
        description: 'View course members.',
      },
      {
        key: COURSE_PERMISSION.COURSE_MEMBERS_MANAGE,
        icon: UserPlus,
        title: 'Manage members',
        description: 'Add, remove, or change course member roles.',
      },
    ],
  },
  {
    icon: LibraryBig,
    title: 'Learning content',
    description: 'Manage modules, lessons, and lesson ordering.',
    permissions: [
      {
        key: COURSE_PERMISSION.COURSE_CONTENT_VIEW,
        icon: Eye,
        title: 'View content',
        description: 'View course modules and lessons.',
      },
      {
        key: COURSE_PERMISSION.COURSE_CONTENT_CREATE,
        icon: FilePlus,
        title: 'Create content',
        description: 'Create modules and lessons.',
      },
      {
        key: COURSE_PERMISSION.COURSE_CONTENT_UPDATE,

        icon: Pencil,
        title: 'Edit content',
        description: 'Edit lesson titles and content.',
      },
      {
        key: COURSE_PERMISSION.COURSE_CONTENT_DELETE,
        icon: Trash2,
        title: 'Delete content',
        description: 'Delete modules or lessons.',
      },
    ],
  },
  {
    icon: ClipboardList,
    title: 'Assessments',
    description: 'Manage questions, quizzes, attempts, and grading.',
    permissions: [
      {
        key: COURSE_PERMISSION.ASSESSMENTS_VIEW,
        icon: Eye,
        title: 'View assessments',
        description: 'View question banks and quizzes.',
      },
      {
        key: COURSE_PERMISSION.ASSESSMENTS_CREATE,
        icon: Plus,
        title: 'Create assessments',
        description: 'Create questions and quizzes.',
      },
      {
        key: COURSE_PERMISSION.ASSESSMENTS_UPDATE,
        icon: Pencil,
        title: 'Edit assessments',
        description: 'Edit questions and quizzes.',
      },
      {
        key: COURSE_PERMISSION.ASSESSMENTS_DELETE,
        icon: Trash2,
        title: 'Delete assessments',
        description: 'Delete questions and quizzes.',
      },
      {
        key: COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW,
        icon: ListChecks,
        title: 'View assessment results',
        description: 'View quiz attempts and results.',
      },
      {
        key: COURSE_PERMISSION.ASSESSMENTS_GRADE,
        icon: GraduationCap,
        title: 'Grade assessments',
        description: 'Review and grade pending assessment attempts.',
      },
    ],
  },
  {
    icon: Files,
    title: 'Course files',
    description: 'Manage course file storage.',
    permissions: [
      {
        key: COURSE_PERMISSION.COURSE_FILES_VIEW,
        icon: Eye,
        title: 'View course files',
        description: 'View course file inventory.',
      },
      {
        key: COURSE_PERMISSION.COURSE_FILES_MANAGE,
        icon: FolderCog,
        title: 'Manage course files',
        description: 'Upload, rename, move, share, and delete course files.',
      },
    ],
  },
  {
    icon: Sparkles,
    title: 'Course AI',
    description: 'Control access to course AI-assisted workflows.',
    permissions: [
      {
        key: COURSE_PERMISSION.AI_USE_COURSE_GENERATION,
        icon: WandSparkles,
        title: 'Generate course content',
        description: 'Generate course modules and lessons with AI.',
      },
    ],
  },
  {
    icon: Workflow,
    title: 'Course analytics',
    description: 'View course reporting and storage statistics.',
    permissions: [
      {
        key: COURSE_PERMISSION.COURSE_ANALYTICS_VIEW,
        icon: BarChart3,
        title: 'View course analytics',
        description: 'View course analytics and storage statistics.',
      },
    ],
  },
];

export const PERMISSION_CATEGORIES = [
  ...PLATFORM_PERMISSION_CATEGORIES,
  ...COURSE_PERMISSION_CATEGORIES,
];

export const PERMISSION_DEFINITIONS = PERMISSION_CATEGORIES.reduce<
  PermissionDefinition[]
>((permissions, category) => permissions.concat(category.permissions), []);

export function getPermissionDefinition(key: string) {
  return PERMISSION_DEFINITIONS.find((permission) => permission.key === key);
}
