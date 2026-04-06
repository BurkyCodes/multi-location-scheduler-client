import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card, Checkbox, Input, Select } from "antd";
import { Clock3 } from "lucide-react";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import {
  fetchAvailabilityByUser,
  upsertAvailability,
} from "../Store/Features/availabilitySlice";

const DAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

const TIMEZONE_OPTIONS = [
  { value: "EAT", label: "EAT (UTC+3)" },
  { value: "PST", label: "PST (UTC-8 / -7 DST)" },
];

const normalizeTimezoneCode = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (
    normalized === "PST" ||
    normalized === "PDT" ||
    normalized === "PT" ||
    normalized === "AMERICA/LOS_ANGELES"
  ) {
    return "PST";
  }
  return "EAT";
};

const toTimeValue = (value) => {
  if (!value) return "";
  const [hours = "09", minutes = "00"] = String(value).split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};

const isValidTimeValue = (value) => /^\d{2}:\d{2}$/.test(String(value || ""));

const buildDayWindows = (windows) => {
  const base = DAYS.reduce((acc, day) => {
    acc[day.value] = { enabled: false, start: "09:00", end: "17:00" };
    return acc;
  }, {});

  (windows || []).forEach((window) => {
    const weekday = Number(window?.weekday);
    if (Number.isNaN(weekday) || !base[weekday]) return;
    base[weekday] = {
      enabled: true,
      start: toTimeValue(window?.start_time_local || "09:00"),
      end: toTimeValue(window?.end_time_local || "17:00"),
    };
  });

  return base;
};

const Availability = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const availabilityByUser = useSelector((state) => state.availability.byUser);
  const saving = useSelector((state) => state.availability.saving);
  const userId = user?._id;
  const existing = availabilityByUser[userId];

  const recurringWindows = useMemo(
    () => existing?.recurring_windows || [],
    [existing?.recurring_windows],
  );
  const derivedDayWindows = useMemo(() => buildDayWindows(recurringWindows), [recurringWindows]);
  const derivedTimezone = recurringWindows.length
    ? normalizeTimezoneCode(recurringWindows[0]?.timezone)
    : "EAT";

  const [dayWindowsState, setDayWindowsState] = useState();
  const [timezoneState, setTimezoneState] = useState();

  const dayWindows = dayWindowsState ?? derivedDayWindows;
  const timezone = timezoneState ?? derivedTimezone;
  const selectedDays = DAYS.filter((day) => dayWindows?.[day.value]?.enabled).map((day) => day.value);

  useEffect(() => {
    if (userId) dispatch(fetchAvailabilityByUser(userId));
  }, [dispatch, userId]);

  const onSave = async () => {
    if (!userId) return;
    if (!selectedDays.length) {
      toast.error("Select at least one day");
      return;
    }
    const hasInvalidWindow = selectedDays.some((day) => {
      const dayWindow = dayWindows?.[day];
      return !dayWindow?.start || !dayWindow?.end;
    });
    if (hasInvalidWindow) {
      toast.error("Each selected day must include start and end time");
      return;
    }

    const recurringWindows = [...new Set(selectedDays)]
      .sort((a, b) => a - b)
      .map((weekday) => ({
        weekday: Number(weekday),
        start_time_local: toTimeValue(dayWindows[weekday].start),
        end_time_local: toTimeValue(dayWindows[weekday].end),
        timezone: normalizeTimezoneCode(timezone),
      }));

    const hasBadTimes = recurringWindows.some(
      (entry) =>
        !isValidTimeValue(entry.start_time_local) ||
        !isValidTimeValue(entry.end_time_local),
    );
    if (hasBadTimes) {
      toast.error("Use valid time values for all selected days");
      return;
    }

    const result = await dispatch(
      upsertAvailability({
        user_id: userId,
        recurring_windows: recurringWindows,
        exceptions: existing?.exceptions || [],
      }),
    );

    if (upsertAvailability.fulfilled.match(result)) {
      toast.success(`Availability saved for ${recurringWindows.length} day(s)`);
    } else {
      toast.error(result?.payload || "Failed to save availability");
    }
  };

  return (
    <ModuleLayoutsOne
      title="My Availability"
      subtitle="Set your recurring work availability windows."
      tableTitle="Availability Windows"
      totalRecords={selectedDays.length}
      headerAction={
        <Button type="primary" className="h-10 rounded-xl font-bold" onClick={onSave} loading={saving}>
          Save Availability
        </Button>
      }
      tableContent={
        <div className="p-6">
          <Card className="rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock3 size={16} color="#f6873a" />
              <h3 className="text-sm font-bold text-slate-900 m-0">Recurring Availability</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Timezone
                </label>
                <Select
                  className="mt-1 rounded-xl"
                  value={normalizeTimezoneCode(timezone)}
                  onChange={setTimezoneState}
                  options={TIMEZONE_OPTIONS}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Available Days and Time Windows
              </label>
              <div className="mt-2 space-y-2">
                {DAYS.map((day) => {
                  const dayWindow = dayWindows?.[day.value] || {
                    enabled: false,
                    start: "09:00",
                    end: "17:00",
                  };
                  return (
                    <div
                      key={day.value}
                      className="grid grid-cols-1 md:grid-cols-[150px_1fr_1fr] gap-2 items-center rounded-xl border border-slate-100 p-2"
                    >
                      <Checkbox
                        checked={Boolean(dayWindow.enabled)}
                        onChange={(event) =>
                          setDayWindowsState((prev) => ({
                            ...(prev ?? dayWindows),
                            [day.value]: {
                              ...(prev?.[day.value] ?? dayWindow),
                              enabled: event.target.checked,
                            },
                          }))
                        }
                      >
                        {day.label}
                      </Checkbox>
                      <Input
                        type="time"
                        className="rounded-xl"
                        disabled={!dayWindow.enabled}
                        value={dayWindow.start}
                        onChange={(event) =>
                          setDayWindowsState((prev) => ({
                            ...(prev ?? dayWindows),
                            [day.value]: {
                              ...(prev?.[day.value] ?? dayWindow),
                              start: event.target.value,
                            },
                          }))
                        }
                      />
                      <Input
                        type="time"
                        className="rounded-xl"
                        disabled={!dayWindow.enabled}
                        value={dayWindow.end}
                        onChange={(event) =>
                          setDayWindowsState((prev) => ({
                            ...(prev ?? dayWindows),
                            [day.value]: {
                              ...(prev?.[day.value] ?? dayWindow),
                              end: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      }
    />
  );
};

export default Availability;
