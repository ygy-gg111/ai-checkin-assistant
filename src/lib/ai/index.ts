export type {AIProvider, GeneratePostInput, GeneratePostResult} from './provider';
export {OpenAIProvider} from './openai';

import {OpenAIProvider} from './openai';

export function getAIProvider() {
  return new OpenAIProvider();
}
