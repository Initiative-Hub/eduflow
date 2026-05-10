import { List, Megaphone, SpellCheck, Type, Wand2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { WritingTool } from '@/lib/validations/writing.schema';

interface WritingSelectorProps {
  selected: WritingTool;
  onSelect: (tool: WritingTool) => void;
}

export function WritingSelector({ selected, onSelect }: WritingSelectorProps) {
  const cards = [
    {
      id: 'caption' as WritingTool,
      title: 'Caption Assistant',
      description: 'Craft compelling social media copy and project headlines.',
      icon: <Megaphone className="size-5 text-primary" />,
    },
    {
      id: 'paraphrase' as WritingTool,
      title: 'Paraphrasing',
      description:
        'Refine sentence structure while maintaining original intent.',
      icon: <Type className="size-5 text-primary" />,
    },
    {
      id: 'email' as WritingTool,
      title: 'Email Assistant',
      description: 'Draft professional outreach and scholarly inquiries.',
      icon: <span className="font-bold text-lg text-primary">@</span>,
    },
    {
      id: 'outline' as WritingTool,
      title: 'Essay Outliner',
      description: 'Structure complex ideas into logical academic flows.',
      icon: <List className="size-5 text-primary" />,
    },
    {
      id: 'grammar' as WritingTool,
      title: 'Grammar Check',
      description:
        'Polish your writing with advanced syntax and punctuation analysis.',
      icon: <SpellCheck className="size-5 text-primary" />,
    },
    {
      id: 'rewrite' as WritingTool,
      title: 'Rewrite Assistant',
      description: 'Transform the tone and style of your paragraphs instantly.',
      icon: <Wand2 className="size-5 text-primary" />,
    },
  ];

  return (
    <div className="mb-4 flex h-full flex-col items-center justify-center px-4">
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

      <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card
            key={card.id}
            onClick={() => onSelect(card.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(card.id);
              }
            }}
            className={cn(
              'flex cursor-pointer flex-col items-start text-left transition-all hover:shadow-md',
              selected === card.id
                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                : 'border-border/50 bg-card hover:border-primary/50'
            )}
          >
            <CardHeader className="w-full pb-2">
              <div
                className={cn(
                  'mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10'
                )}
              >
                {card.icon}
              </div>
              <CardTitle className="font-bold text-lg">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                {card.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
