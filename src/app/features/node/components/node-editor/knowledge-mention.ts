import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    knowledgeMention: {
      insertKnowledgeMention: (attributes: {
        nodeId: string;
        title: string;
        isStub?: boolean;
      }) => ReturnType;
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
        renderHTML: (attributes) => ({ 'data-node-id': attributes['nodeId'] }),
      },
      title: {
        default: '',
        parseHTML: (element) => {
          const title = element.getAttribute('data-title');

          return title ?? element.textContent?.replace(/^[@#]/, '') ?? '';
        },
        renderHTML: (attributes) => ({ 'data-title': attributes['title'] }),
      },
      isStub: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-is-stub') === 'true',
        renderHTML: (attributes) => ({ 'data-is-stub': attributes['isStub'] ? 'true' : 'false' }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-node-id]',
      },
      {
        tag: 'span[data-node-id]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const nodeId = encodeURIComponent(String(node.attrs['nodeId'] ?? ''));
    const title = String(node.attrs['title'] ?? '');
    const isStub = Boolean(node.attrs['isStub']);

    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        href: `/node/${nodeId}`,
        class: isStub ? 'node-page-link node-page-link-stub' : 'node-page-link',
        'data-node-id': nodeId,
        'data-title': title,
        'data-is-stub': isStub ? 'true' : 'false',
        contenteditable: 'false',
      }),
      [
        'span',
        {
          class: 'node-page-link-icon',
          'aria-hidden': 'true',
        },
        '↗',
      ],
      ['span', { class: 'node-page-link-title' }, title],
    ];
  },

  renderText({ node }) {
    return `${node.attrs['title']}`;
  },

  addCommands() {
    return {
      insertKnowledgeMention:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: attributes,
          }),
    };
  },
});
