import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminToolsLink, primaryNavigation } from "../../lib/config/navigation.js";

describe("primary navigation", () => {
  it("contains exactly the five everyday outreach screens", () => {
    assert.deepEqual(
      primaryNavigation.map((item) => [item.label, item.href]),
      [
        ["Dashboard", "/dashboard"],
        ["School Outreach", "/school-outreach"],
        ["Opportunities to Review", "/research/opportunities"],
        ["Active Opportunities", "/pipeline"],
        ["Tasks", "/tasks"]
      ]
    );
  });

  it("keeps secondary modules out of the primary navigation", () => {
    const hrefs = primaryNavigation.map((item) => item.href);
    for (const secondary of [
      "/activity",
      "/contacts",
      "/data-review",
      "/events",
      "/organizations",
      "/proposals",
      "/settings",
      "/templates"
    ]) {
      assert.equal(hrefs.includes(secondary), false, `${secondary} must not be primary`);
    }
  });

  it("exposes Admin Tools as the single bottom link", () => {
    assert.equal(adminToolsLink.href, "/admin-tools");
    assert.equal(adminToolsLink.label, "Admin Tools");
  });
});
