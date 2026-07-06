import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CRM_TIME_ZONE,
  addCrmBusinessDays,
  formatCrmCalendarDate,
  formatCrmDate,
  formatCrmDateTime,
  formatCrmDateTimeLocalInput,
  formatCrmTime,
  getCrmDateKey,
  getCrmTodayString,
  parseCrmDateTimeLocalInputToUtc,
  parseCrmLocalDateTimeToUtc
} from "../../lib/crm/format.js";

describe("CRM timezone helpers", () => {
  it("uses the Bloom Boys CRM timezone", () => {
    assert.equal(CRM_TIME_ZONE, "America/Regina");
  });

  it("formats timestamps in America/Regina regardless of runtime timezone", () => {
    const afternoonRegina = "2026-07-06T22:11:00.000Z";
    assert.equal(formatCrmTime(afternoonRegina), "4:11 p.m.");
    assert.match(formatCrmDateTime(afternoonRegina), /Jul 6, 2026/);
    assert.match(formatCrmDateTime(afternoonRegina), /4:11 p.m./);
  });

  it("formats date-only values as CRM calendar dates", () => {
    assert.equal(formatCrmDate("2026-07-06"), "Jul 6, 2026");
  });

  it("parses CRM-local follow-up datetimes into UTC instants", () => {
    assert.equal(
      parseCrmLocalDateTimeToUtc("2026-07-06", "16:11"),
      "2026-07-06T22:11:00.000Z"
    );
    assert.equal(
      parseCrmDateTimeLocalInputToUtc("2026-07-06T16:11"),
      "2026-07-06T22:11:00.000Z"
    );
  });

  it("builds datetime-local defaults in CRM local time", () => {
    const value = formatCrmDateTimeLocalInput(new Date("2026-07-06T22:11:00.000Z"));
    assert.equal(value, "2026-07-06T16:11");
  });

  it("groups timestamps by CRM calendar date", () => {
    assert.equal(getCrmDateKey("2026-07-06T22:11:00.000Z"), "2026-07-06");
    assert.equal(getCrmDateKey("2026-07-07T05:30:00.000Z"), "2026-07-06");
  });

  it("computes CRM today and business days from CRM calendar dates", () => {
    const friday = new Date("2026-06-26T22:00:00.000Z");
    assert.equal(getCrmTodayString(friday), "2026-06-26");
    assert.equal(formatCrmCalendarDate(addCrmBusinessDays(friday, 3)), "2026-07-01");
  });
});
