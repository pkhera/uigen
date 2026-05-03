import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  result?: unknown;
}

function getToolLabel(toolName: string, args: Record<string, unknown>): string {
  const filename = typeof args.path === "string" ? args.path.split("/").pop() : undefined;
  const suffix = filename ? ` ${filename}` : "";

  if (toolName === "str_replace_editor") {
    const command = args.command as string | undefined;
    switch (command) {
      case "create":
        return `Creating${suffix}`;
      case "str_replace":
      case "insert":
        return `Editing${suffix}`;
      case "view":
        return `Reading${suffix}`;
      case "undo_edit":
        return `Reverting${suffix}`;
      default:
        return `Editing${suffix}`;
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as string | undefined;
    switch (command) {
      case "delete":
        return `Deleting${suffix}`;
      case "rename":
        return `Renaming${suffix}`;
      default:
        return `Updating${suffix}`;
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolName, args, state, result }: ToolInvocationBadgeProps) {
  const label = getToolLabel(toolName, args);
  const isDone = state === "result" && result != null;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
