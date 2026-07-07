import { describe, expect, it } from "vitest";
import { firestorePaths } from "./paths";

describe("firestorePaths", () => {
  it("keeps workspace listing data under workspace subcollections", () => {
    expect(firestorePaths.workspaceListings("workspace_1")).toBe(
      "workspaces/workspace_1/listings",
    );
    expect(firestorePaths.workspaceListing("workspace_1", "listing_1")).toBe(
      "workspaces/workspace_1/listings/listing_1",
    );
  });

  it("keeps public listing index separate from private workspace documents", () => {
    expect(firestorePaths.publicListing("rare-home")).toBe("publicListingIndex/rare-home");
  });

  it("keeps owner profiles private while claim tokens are direct lookup documents", () => {
    expect(firestorePaths.workspaceOwnerProfiles("workspace_1")).toBe(
      "workspaces/workspace_1/ownerProfiles",
    );
    expect(firestorePaths.workspaceOwnerProfile("workspace_1", "owner_919822052388")).toBe(
      "workspaces/workspace_1/ownerProfiles/owner_919822052388",
    );
    expect(firestorePaths.ownerClaimToken("token_1")).toBe("ownerClaimTokens/token_1");
  });
});
