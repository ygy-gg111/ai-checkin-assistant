export type GeneratePostInput = {
  topic: string;
  inputText: string;
  imageUrls: string[];
  style?: string;
  dayCount?: number;
};

export type GeneratePostResult = {
  title: string;
  content: string;
  tags: string[];
  coverText?: string;
};

export interface AIProvider {
  readonly name: string;
  generatePost(input: GeneratePostInput): Promise<GeneratePostResult>;
}
