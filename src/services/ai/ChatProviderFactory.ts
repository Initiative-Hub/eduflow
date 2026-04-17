import { AIGatewayService } from '@/services/ai/AIGatewayService';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';
import type { ChatProvider } from '@/services/ai/chat-provider.types';
import { GoogleService } from '@/services/ai/GoogleService';
import { OpenRouterService } from '@/services/ai/OpenRouterService';
import type { ChatProviderService } from './ChatProviderService';

export class ChatProviderFactory {
  static create(provider?: ChatProvider): ChatProviderService {
    const resolvedProvider = provider ?? DEFAULT_PROVIDER;

    switch (resolvedProvider) {
      case 'ai-gateway':
        return new AIGatewayService();
      case 'google':
        return new GoogleService();
      case 'openrouter':
        return new OpenRouterService();
      default:
        throw new Error(`Unsupported provider: ${resolvedProvider}`);
    }
  }
}
