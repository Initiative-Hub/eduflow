import { tavily } from '@tavily/core';

export const searchWebClient = tavily({ apiKey: process.env.TAVILY_KEY! });
