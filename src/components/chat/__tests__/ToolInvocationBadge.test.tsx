import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

function renderBadge(
  toolName: string,
  args: Record<string, unknown>,
  state = "call",
  result?: unknown
) {
  return render(
    <ToolInvocationBadge toolName={toolName} args={args} state={state} result={result} />
  );
}

describe("str_replace_editor labels", () => {
  test("create command shows Creating with filename", () => {
    renderBadge("str_replace_editor", { command: "create", path: "src/components/Card.tsx" });
    expect(screen.getByText("Creating Card.tsx")).toBeDefined();
  });

  test("str_replace command shows Editing with filename", () => {
    renderBadge("str_replace_editor", { command: "str_replace", path: "src/components/Card.tsx" });
    expect(screen.getByText("Editing Card.tsx")).toBeDefined();
  });

  test("insert command shows Editing with filename", () => {
    renderBadge("str_replace_editor", { command: "insert", path: "src/components/Card.tsx" });
    expect(screen.getByText("Editing Card.tsx")).toBeDefined();
  });

  test("view command shows Reading with filename", () => {
    renderBadge("str_replace_editor", { command: "view", path: "src/components/Card.tsx" });
    expect(screen.getByText("Reading Card.tsx")).toBeDefined();
  });

  test("undo_edit command shows Reverting with filename", () => {
    renderBadge("str_replace_editor", { command: "undo_edit", path: "src/components/Card.tsx" });
    expect(screen.getByText("Reverting Card.tsx")).toBeDefined();
  });

  test("unknown command falls back to Editing with filename", () => {
    renderBadge("str_replace_editor", { command: "unknown_cmd", path: "src/components/Card.tsx" });
    expect(screen.getByText("Editing Card.tsx")).toBeDefined();
  });
});

describe("file_manager labels", () => {
  test("delete command shows Deleting with filename", () => {
    renderBadge("file_manager", { command: "delete", path: "src/styles.css" });
    expect(screen.getByText("Deleting styles.css")).toBeDefined();
  });

  test("rename command shows Renaming with filename", () => {
    renderBadge("file_manager", { command: "rename", path: "src/old.tsx", new_path: "src/new.tsx" });
    expect(screen.getByText("Renaming old.tsx")).toBeDefined();
  });

  test("unknown command falls back to Updating with filename", () => {
    renderBadge("file_manager", { command: "unknown_cmd", path: "src/file.tsx" });
    expect(screen.getByText("Updating file.tsx")).toBeDefined();
  });
});

describe("visual states", () => {
  test("in-progress state shows spinner", () => {
    const { container } = renderBadge("str_replace_editor", {
      command: "create",
      path: "src/App.tsx",
    });
    expect(container.querySelector(".animate-spin")).toBeDefined();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("completed state shows green dot", () => {
    const { container } = renderBadge(
      "str_replace_editor",
      { command: "create", path: "src/App.tsx" },
      "result",
      "Success"
    );
    expect(container.querySelector(".bg-emerald-500")).toBeDefined();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});

describe("edge cases", () => {
  test("no path in args shows label without filename", () => {
    renderBadge("str_replace_editor", { command: "create" });
    expect(screen.getByText("Creating")).toBeDefined();
  });

  test("unknown tool name shows raw tool name", () => {
    renderBadge("some_other_tool", {});
    expect(screen.getByText("some_other_tool")).toBeDefined();
  });
});
