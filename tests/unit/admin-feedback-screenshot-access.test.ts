import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/routes/admin.feedback.tsx", "utf8");

describe("admin feedback screenshot access regression", () => {
  it("does not issue signed bearer links", () => {
    expect(source).not.toContain("createSignedUrl");
    expect(source).not.toContain("signedUrl");
  });

  it("uses authenticated storage downloads for previews and new downloads", () => {
    expect(source.match(/\.download\(row\.screenshot_url\)/g)).toHaveLength(2);
    const action = source.split("async function downloadScreenshot()")[1].split("return (")[0];
    expect(action).toContain('.from("feedback-screenshots")');
    expect(action).toContain("if (error || !data)");
  });

  it("cleans up local preview URLs and does not link directly to them", () => {
    expect(source).toContain("URL.revokeObjectURL(objectUrl)");
    expect(source).toContain("if (cancelled || error || !data) return");
    expect(source).not.toContain("<a href={url}");
  });
});