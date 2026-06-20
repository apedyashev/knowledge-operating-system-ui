import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    knowledgeMention: {
      insertKnowledgeMention: (attributes: { nodeId: string; title: string }) => ReturnType;
    };
  }
}

export const KnowledgeMention = Node.create({
  name: 'knowledgeMention',

  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      nodeId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-node-id'),
        renderHTML: (attributes) => ({ 'data-node-id': attributes['nodeId'] })
      },
      title: {
        default: '',
        parseHTML: (element) => {
          const title = element.getAttribute('data-title');

          return title ?? element.textContent?.replace(/^[@#]/, '') ?? '';
        },
        renderHTML: (attributes) => ({ 'data-title': attributes['title'] })
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-node-id]'
      },
      {
        tag: 'span[data-node-id]'
      }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const nodeId = encodeURIComponent(String(node.attrs['nodeId'] ?? ''));
    const title = String(node.attrs['title'] ?? '');

    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        href: `/node/${nodeId}`,
        class: 'node-page-link',
        'data-node-id': nodeId,
        'data-title': title,
        contenteditable: 'false'
      }),
      `@${title}`
    ];
  },

  renderText({ node }) {
    return `@${node.attrs['title']}`;
  },

  addCommands() {
    return {
      insertKnowledgeMention:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: attributes
          })
    };
  }
});