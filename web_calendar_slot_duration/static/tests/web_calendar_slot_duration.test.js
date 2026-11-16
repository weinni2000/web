/* Copyright 2026 Nik (weinni2000)
 * License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl). */

import {beforeEach, expect, test} from "@odoo/hoot";
import {mountWithCleanup, preloadBundle} from "@web/../tests/web_test_helpers";
import {serializeDate, serializeDateTime} from "@web/core/l10n/dates";
import {CalendarCommonRenderer} from "@web/views/calendar/calendar_common/calendar_common_renderer";
import {CalendarModel} from "@web/views/calendar/calendar_model";
import {CallbackRecorder} from "@web/search/action_hook";
// The patches shipped by the module are part of `web.assets_backend`, which
// `web.assets_unit_tests_setup` includes, so they are already applied here.
import {FAKE_MODEL} from "@web/../tests/views/calendar/calendar_test_helpers";

const {DateTime} = luxon;

// The renderer requires these callbacks, but none of them is triggered here.
const noop = () => {
    // Nothing to do.
};

const SLOT_DURATION_CONTEXT = {calendar_slot_duration: "00:10:00"};

function makeModel(context) {
    return {
        ...FAKE_MODEL,
        scale: "day",
        meta: {...FAKE_MODEL.meta, context},
    };
}

async function start(model) {
    await mountWithCleanup(CalendarCommonRenderer, {
        props: {
            model,
            initialDate: FAKE_MODEL.date,
            createRecord: noop,
            deleteRecord: noop,
            editRecord: noop,
            callbackRecorder: new CallbackRecorder(),
            onSquareSelection: noop,
            cleanSquareSelection: noop,
        },
    });
}

function makeRecordContextModel(context) {
    return {
        dateStartType: "datetime",
        hasAllDaySlot: true,
        meta: {
            ...FAKE_MODEL.meta,
            context,
            fieldMapping: FAKE_MODEL.fieldMapping,
        },
    };
}

function buildRawRecord(partialRecord, context) {
    return CalendarModel.prototype.buildRawRecord.call(
        makeRecordContextModel(context),
        partialRecord
    );
}

preloadBundle("web.fullcalendar_lib");

beforeEach(() => {
    luxon.Settings.defaultZone = "UTC+1";
});

test("renderer uses the slot duration from the context", async () => {
    await start(makeModel(SLOT_DURATION_CONTEXT));
    // A 10 minute slot duration adds a row every 10 minutes
    expect(`.fc-timegrid-slot[data-time="08:10:00"]`).toHaveCount(2);
});

test("renderer keeps the default slot duration without context", async () => {
    await start(makeModel({}));
    expect(`.fc-timegrid-slot[data-time="08:10:00"]`).toHaveCount(0);
    expect(`.fc-timegrid-slot[data-time="08:30:00"]`).toHaveCount(2);
});

test("buildRawRecord uses the slot duration when no end is given", () => {
    const startDate = DateTime.local(2021, 7, 16, 8, 0);
    const data = buildRawRecord(
        {title: "Demo", start: startDate, isAllDay: false},
        SLOT_DURATION_CONTEXT
    );
    expect(data.start_date).toBe(serializeDateTime(startDate));
    expect(data.stop_date).toBe(serializeDateTime(startDate.plus({minutes: 10})));
});

test("buildRawRecord supports slot durations longer than an hour", () => {
    const startDate = DateTime.local(2021, 7, 16, 8, 0);
    const data = buildRawRecord(
        {title: "Demo", start: startDate, isAllDay: false},
        {calendar_slot_duration: "01:30:00"}
    );
    expect(data.stop_date).toBe(
        serializeDateTime(startDate.plus({hours: 1, minutes: 30}))
    );
});

test("buildRawRecord keeps an explicit end", () => {
    const startDate = DateTime.local(2021, 7, 16, 8, 0);
    const endDate = startDate.plus({hours: 2});
    const data = buildRawRecord(
        {title: "Demo", start: startDate, end: endDate, isAllDay: false},
        SLOT_DURATION_CONTEXT
    );
    expect(data.stop_date).toBe(serializeDateTime(endDate));
});

test("buildRawRecord ignores the slot duration for all day events", () => {
    const startDate = DateTime.local(2021, 7, 16, 8, 0);
    const data = buildRawRecord(
        {title: "Demo", start: startDate, isAllDay: true},
        SLOT_DURATION_CONTEXT
    );
    expect(data.allday).toBe(true);
    expect(data.stop_date).toBe(serializeDate(startDate));
});
