import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { canUploadDocuments, submissionBlock, DOCS_LOCKED_MESSAGE } from "./doc-submission";

const both = { identity: 1, driving_license: 1 };

describe("document uploads", () => {
  it("are open before the first submission", () => {
    expect(canUploadDocuments("not_submitted")).toBe(true);
  });
  it("are locked once submitted, under review or verified", () => {
    expect(canUploadDocuments("received")).toBe(false);
    expect(canUploadDocuments("pending")).toBe(false);
    expect(canUploadDocuments("verified")).toBe(false);
  });
  it("reopen after a rejection or an info request", () => {
    expect(canUploadDocuments("rejected")).toBe(true);
    expect(canUploadDocuments("needs_info")).toBe(true);
  });
});

describe("submission", () => {
  it("first time needs both the ID and the driving license", () => {
    expect(submissionBlock({ status: "not_submitted", kinds: { identity: 1, driving_license: 0 }, newFiles: 1 })).toBe("Add your driving license before submitting.");
    expect(submissionBlock({ status: "not_submitted", kinds: { identity: 0, driving_license: 1 }, newFiles: 1 })).toBe("Add your ID before submitting.");
    expect(submissionBlock({ status: "not_submitted", kinds: both, newFiles: 2 })).toBe(null);
  });
  it("is refused after documents were already submitted", () => {
    expect(submissionBlock({ status: "received", kinds: both, newFiles: 1 })).toBe(DOCS_LOCKED_MESSAGE);
    expect(submissionBlock({ status: "verified", kinds: both, newFiles: 1 })).toBe(DOCS_LOCKED_MESSAGE);
  });
  it("after an info request needs at least one new file", () => {
    expect(submissionBlock({ status: "needs_info", kinds: both, newFiles: 0 })).toBe("Add the updated document before submitting.");
    expect(submissionBlock({ status: "needs_info", kinds: both, newFiles: 1 })).toBe(null);
  });
});
