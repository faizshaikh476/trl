import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileSideNavigation } from "./mobile-side-navigation";

describe("MobileSideNavigation", () => {
  it("opens the role navigation and closes it after a route is selected", async () => {
    render(
      <MobileSideNavigation
        ariaLabel="Admin navigation"
        brand={<span>Super Admin</span>}
        navigation={<a href="/admin/workspaces" onClick={(event) => event.preventDefault()}>Workspaces</a>}
        footer={<span>Sign out</span>}
      />,
    );

    expect(screen.queryByRole("navigation", { name: "Admin navigation" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    expect(screen.getByRole("navigation", { name: "Admin navigation" })).toBeInTheDocument();
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Workspaces" }));

    await waitFor(() => {
      expect(screen.queryByRole("navigation", { name: "Admin navigation" })).not.toBeInTheDocument();
    });
  });
});
