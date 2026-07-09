import { describe, expect, it } from "vitest";
import { workspaceSlugForBrokerPhone } from "./broker-workspace-service";

describe("workspaceSlugForBrokerPhone", () => {
  it("does not expose the broker phone number in public catalogue URLs", () => {
    const slug = workspaceSlugForBrokerPhone("+91 72767 09161");

    expect(slug).toMatch(/^broker-[a-f0-9]{12}$/);
    expect(slug).not.toContain("7276709161");
    expect(slug).not.toContain("917276709161");
  });

  it("keeps the same public slug for equivalent phone formats", () => {
    expect(workspaceSlugForBrokerPhone("+91 72767 09161")).toBe(
      workspaceSlugForBrokerPhone("917276709161"),
    );
  });
});
