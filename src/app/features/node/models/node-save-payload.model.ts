import type { JSONContent } from '@tiptap/core';

export interface SaveNodePayload {
  title: string;
  content: JSONContent;
  isStub?: boolean;
}
