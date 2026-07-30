/**
 * Parse file actions from agent tool calls.
 * Converts agentic loop tool call results into FileActionResult props.
 */
export function parseFileActionsFromToolCalls(toolCalls = []) {
  const actions = [];

  for (const call of toolCalls) {
    const { tool, args, result } = call;
    if (['create_file', 'write_file', 'delete_file', 'delete'].includes(tool)) {
      actions.push({
        type: tool,
        path: args?.path || '',
        content: args?.content || result?.content || '',
        success: result?.success !== false,
        duration: result?.duration || null,
      });
    }
    if (tool === 'apply_patch' && result?.files) {
      for (const file of result.files) {
        actions.push({
          type: 'apply_patch',
          path: file.path || file.newPath || '',
          content: file.content || '',
          success: true,
        });
      }
    }
  }

  return actions;
}
