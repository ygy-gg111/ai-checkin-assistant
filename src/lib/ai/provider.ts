export type GeneratePostInput = {
  topic: string;
  inputText: string;
  imageUrls: string[];
  style?: string;
  dayCount?: number;
  promptTemplate?: string;
};

export type GeneratePostResult = {
  analysis: {
    scene: string;
    activity: string;
    emotion: string;
    summary: string;
  };
  title: string;
  content: string;
  tags: string[];
  coverText?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generatePost(input: GeneratePostInput): Promise<GeneratePostResult>;
}
