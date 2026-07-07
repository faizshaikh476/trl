import type { AIProvider } from "./ai-provider";
import { DeepSeekProvider } from "./providers/deepseek-provider";
import { GeminiProvider } from "./providers/gemini-provider";
import { MockAIProvider } from "./providers/mock-provider";
import { OpenAIProvider } from "./providers/openai-provider";

const providers: Record<string, AIProvider> = {
  mock: new MockAIProvider(),
  openai: new OpenAIProvider(),
  deepseek: new DeepSeekProvider(),
  gemini: new GeminiProvider(),
};

function defaultProviderName() {
  if (process.env.AI_DEFAULT_PROVIDER) return process.env.AI_DEFAULT_PROVIDER;
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  return "mock";
}

function addUnique(values: string[], value: string) {
  if (!values.includes(value)) values.push(value);
}

export function getAIProvider(providerName = defaultProviderName()) {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unknown AI provider: ${providerName}`);
  }
  return provider;
}

export function listConfiguredProviderNames() {
  const names: string[] = [];
  addUnique(names, defaultProviderName());
  if (process.env.OPENAI_API_KEY) addUnique(names, "openai");
  if (process.env.DEEPSEEK_API_KEY) addUnique(names, "deepseek");
  if (process.env.GEMINI_API_KEY) addUnique(names, "gemini");
  if (!names.length) addUnique(names, "mock");
  return names.filter((name) => providers[name]);
}

export function listAIProviders() {
  return [
    { id: "mock", label: "Local AI parser", enabled: true, localOnly: true },
    { id: "openai", label: "OpenAI", enabled: Boolean(process.env.OPENAI_API_KEY), localOnly: false },
    {
      id: "deepseek",
      label: "DeepSeek",
      enabled: Boolean(process.env.DEEPSEEK_API_KEY),
      localOnly: false,
    },
    { id: "gemini", label: "Gemini", enabled: Boolean(process.env.GEMINI_API_KEY), localOnly: false },
    {
      id: "anthropic",
      label: "Anthropic",
      enabled: false,
      localOnly: false,
    },
  ];
}
