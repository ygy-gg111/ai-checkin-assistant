export type PromptContext = {
  locale: string;
  persona: string;
  scene: string;
  userInput: string;
};

export function buildPrompt(context: PromptContext) {
  return [context.persona, context.scene, context.userInput].filter(Boolean).join('\n\n');
}
