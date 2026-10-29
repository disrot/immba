import { describe, expect, it } from "vitest";
import { sanitizeEvent, trackingAllowed } from "../../js/privacy.js";

describe("privacy", () => {
  it("stops collection for opt-out, DNT, and GPC", () => {
    expect(trackingAllowed({ optOut: true })).toBe(false);
    expect(trackingAllowed({ dnt: "1" })).toBe(false);
    expect(trackingAllowed({ gpc: true })).toBe(false);
    expect(trackingAllowed({})).toBe(true);
  });

  it("drops query strings, click text, and email-shaped keys", () => {
    const clean = sanitizeEvent({
      path: "admissions.html?email=student@school.edu#apply",
      event_type: "click",
      referrer_host: "https://evil.example/?q=1",
      visitor_key: "student@school.edu",
      device: "Phone",
    });
    expect(clean.path).toBe("admissions.html");
    expect(clean.event_type).toBe("view");
    expect(clean.referrer_host).not.toContain("?");
    expect(clean.referrer_host).not.toContain("@");
    expect(clean.visitor_key).not.toContain("@");
    expect(clean.device).toBe("Desktop");
    expect(JSON.stringify(clean)).not.toContain("student@school.edu");
  });
});
