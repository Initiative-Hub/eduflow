'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '@/components/ai-elements/model-selector';
import { Button } from '@/components/ui/button';
import { CHAT_MODEL_OPTIONS, type ChatModel } from '@/services/ai/chat-models';

interface ChatModelSelectControlProps {
  disabled: boolean;
  emptyLabel: string;
  heading: string;
  label: string;
  onModelChange: (model: ChatModel) => void;
  selectedModel: ChatModel;
}

export function ChatModelSelectControl({
  disabled,
  emptyLabel,
  heading,
  label,
  onModelChange,
  selectedModel,
}: ChatModelSelectControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModelLabel =
    CHAT_MODEL_OPTIONS.find((model) => model.id === selectedModel)?.label ?? '';

  return (
    <ModelSelector onOpenChange={setIsOpen} open={isOpen && !disabled}>
      <ModelSelectorTrigger asChild>
        <Button
          aria-label={label}
          className="h-9 max-w-44 cursor-pointer gap-2 rounded-full border-none px-3 text-foreground text-sm hover:bg-muted sm:max-w-56"
          disabled={disabled}
          type="button"
          variant="outline"
        >
          <ModelSelectorLogo provider="google" />
          <ModelSelectorName className="min-w-0 text-sm">
            {selectedModelLabel}
          </ModelSelectorName>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorList>
          <ModelSelectorEmpty>{emptyLabel}</ModelSelectorEmpty>
          <ModelSelectorGroup heading={heading}>
            {CHAT_MODEL_OPTIONS.map((model) => (
              <ModelSelectorItem
                data-checked={model.id === selectedModel}
                key={model.id}
                onSelect={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                value={model.label}
              >
                <ModelSelectorLogo provider="google" />
                <ModelSelectorName>{model.label}</ModelSelectorName>
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
