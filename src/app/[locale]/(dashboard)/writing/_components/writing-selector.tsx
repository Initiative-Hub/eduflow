import {
  AlignLeft,
  Hash,
  List,
  MessageSquare,
  RefreshCw,
  SpellCheck,
} from 'lucide-react';
import type { WritingTool } from '@/lib/validations/writing.schema';

const TOOLS = [
  { id: 'grammar', label: 'Fix Grammar', icon: SpellCheck },
  { id: 'rewrite', label: 'Rewrite', icon: RefreshCw },
  { id: 'paraphrase', label: 'Paraphrase', icon: AlignLeft },
  { id: 'outline', label: 'Generate Outline', icon: List },
  { id: 'email', label: 'Write Email', icon: MessageSquare },
  { id: 'caption', label: 'Social Caption', icon: Hash },
] satisfies { id: WritingTool; label: string; icon: React.ElementType }[];

export function WritingSelector({
  selected,
  onSelect,
}: {
  selected: WritingTool;
  onSelect: (tool: WritingTool) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            type="button"
            key={tool.id}
            onClick={() => onSelect(tool.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 font-medium text-sm transition-colors ${
              selected === tool.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Icon className="size-4" />
            {tool.label}
          </button>
        );
      })}
    </div>
  );
}
