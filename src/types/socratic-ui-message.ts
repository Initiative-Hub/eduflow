import type { UIMessage } from 'ai';

export type SocraticUIMessage = UIMessage<
  unknown,
  {
    suggestions: {
      items: string[];
    };
  }
>;
