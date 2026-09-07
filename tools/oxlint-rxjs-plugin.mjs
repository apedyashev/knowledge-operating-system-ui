const teardownOperatorNames = new Set(['takeUntil', 'takeUntilDestroyed']);

function isNamedCall(expression) {
  if (expression?.type !== 'CallExpression') {
    return false;
  }

  if (expression.callee.type === 'Identifier') {
    return teardownOperatorNames.has(expression.callee.name);
  }

  return (
    expression.callee.type === 'MemberExpression' &&
    expression.callee.property.type === 'Identifier' &&
    teardownOperatorNames.has(expression.callee.property.name)
  );
}

function hasTeardownOperator(expression) {
  if (expression?.type !== 'CallExpression') {
    return false;
  }

  if (
    expression.callee.type === 'MemberExpression' &&
    expression.callee.property.type === 'Identifier' &&
    expression.callee.property.name === 'pipe'
  ) {
    return expression.arguments.some(isNamedCall);
  }

  return hasTeardownOperator(expression.callee.type === 'MemberExpression' ? expression.callee.object : null);
}

const preferTakeUntil = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require RxJS subscriptions to include takeUntil or takeUntilDestroyed.',
    },
    messages: {
      missingTeardown: 'Subscribe with takeUntil(...) or takeUntilDestroyed(...) to clean up the subscription.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.computed ||
          node.callee.property.type !== 'Identifier' ||
          node.callee.property.name !== 'subscribe' ||
          hasTeardownOperator(node.callee.object)
        ) {
          return;
        }

        context.report({ node, messageId: 'missingTeardown' });
      },
    };
  },
};

export default {
  meta: {
    name: 'kos-rxjs',
  },
  rules: {
    'prefer-takeuntil': preferTakeUntil,
  },
};
