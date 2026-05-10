import { AlignLeft, List, Megaphone } from 'lucide-react';
import type { WritingTool } from '@/lib/validations/writing.schema';

interface WritingLandingViewProps {
  selected: WritingTool;
  onSelect: (tool: WritingTool) => void;
}

export function WritingLandingView({
  selected,
  onSelect,
}: WritingLandingViewProps) {
  const cards = [
    {
      id: 'caption' as WritingTool,
      title: 'Caption Assistant',
      description: 'Craft compelling social media copy and project headlines.',
      icon: <Megaphone className="size-5 text-primary" />,
      iconBg: 'bg-primary/10',
    },
    {
      id: 'paraphrase' as WritingTool,
      title: 'Paraphrasing',
      description:
        'Refine sentence structure while maintaining original intent.',
      icon: <AlignLeft className="size-5 text-accent" />,
      iconBg: 'bg-accent/10',
    },
    {
      id: 'email' as WritingTool,
      title: 'Email Assistant',
      description: 'Draft professional outreach and scholarly inquiries.',
      icon: <span className="font-bold text-lg text-secondary">@</span>,
      iconBg: 'bg-secondary/10',
    },
    {
      id: 'outline' as WritingTool,
      title: 'Essay Outliner',
      description: 'Structure complex ideas into logical academic flows.',
      icon: <List className="size-5 text-muted-foreground" />,
      iconBg: 'bg-muted',
    },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="mb-12 space-y-4 text-center">
        <h1 className="font-extrabold text-4xl text-foreground tracking-tight sm:text-5xl">
          How can I help you <span className="text-primary italic">write</span>{' '}
          today?
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Refine your academic voice with precision tools designed for scholarly
          clarity and impact.
        </p>
      </div>

      <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <button
            type="button"
            key={card.id}
            onClick={() => onSelect(card.id)}
            className={`flex flex-col items-start rounded-3xl border p-6 text-left transition-all hover:shadow-md ${
              selected === card.id
                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                : 'border-border/50 bg-card hover:border-border'
            }`}
          >
            <div
              className={`mb-4 flex size-12 items-center justify-center rounded-2xl ${card.iconBg}`}
            >
              {card.icon}
            </div>
            <h3 className="mb-2 font-bold text-foreground text-lg">
              {card.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {card.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
