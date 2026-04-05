import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card, Checkbox, Input, Select } from "antd";
import { Clock3 } from "lucide-react";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import { fetchLocations } from "../Store/Features/locationsSlice";
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

const Availability = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const locations = useSelector((state) => state.locations.list);
  const availabilityByUser = useSelector((state) => state.availability.byUser);
  const saving = useSelector((state) => state.availability.saving);
  const userId = user?._id;
  const existing = availabilityByUser[userId];

  const defaultLocationId = useMemo(() => {
    const location = (user?.location_ids || [])[0];
    return typeof location === "object" ? location?._id : location || "";
  }, [user]);

  const recurringWindows = useMemo(
    () => existing?.recurring_windows || [],
    [existing?.recurring_windows],
  );
  const derivedSelectedDays = useMemo(
    () => (recurringWindows.length ? [...new Set(recurringWindows.map((window) => window.weekday))] : [1, 2, 3, 4, 5]),
    [recurringWindows],
  );
  const derivedStartTime = recurringWindows.length ? toTimeValue(recurringWindows[0]?.start_time_local) : "09:00";
  const derivedEndTime = recurringWindows.length ? toTimeValue(recurringWindows[0]?.end_time_local) : "17:00";
  const derivedTimezone = recurringWindows.length
    ? normalizeTimezoneCode(recurringWindows[0]?.timezone)
    : "EAT";
  const derivedLocationId = recurringWindows.length
    ? recurringWindows[0]?.location_id?._id || recurringWindows[0]?.location_id || defaultLocationId || ""
    : defaultLocationId || "";

  const [selectedDaysState, setSelectedDaysState] = useState();
  const [startTimeState, setStartTimeState] = useState();
  const [endTimeState, setEndTimeState] = useState();
  const [timezoneState, setTimezoneState] = useState();
  const [locationIdState, setLocationIdState] = useState();

  const selectedDays = selectedDaysState ?? derivedSelectedDays;
  const startTime = startTimeState ?? derivedStartTime;
  const endTime = endTimeState ?? derivedEndTime;
  const timezone = timezoneState ?? derivedTimezone;
  const locationId = locationIdState ?? derivedLocationId;

  useEffect(() => {
    dispatch(fetchLocations());
    if (userId) dispatch(fetchAvailabilityByUser(userId));
  }, [dispatch, userId]);

  const onSave = async () => {
    if (!userId) return;
    if (!selectedDays.length) {
      toast.error("Select at least one day");
      return;
    }
    if (!startTime || !endTime) {
      toast.error("Start and end time are required");
      return;
    }

    const recurringWindows = selectedDays.map((weekday) => ({
      weekday,
      start_time_local: startTime,
      end_time_local: endTime,
      timezone: normalizeTimezoneCode(timezone),
      ...(locationId ? { location_id: locationId } : {}),
    }));

    const result = await dispatch(
      upsertAvailability({
        user_id: userId,
        recurring_windows: recurringWindows,
        exceptions: existing?.exceptions || [],
      }),
    );

    if (upsertAvailability.fulfilled.match(result)) {
      toast.success("Availability saved");
    } else {
      toast.error(result?.payload || "Failed to save availability");
    }
  };

  return (
    <ModuleLayoutsOne
      title="My Availability"
      subtitle="Set your recurring work availability windows."
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Location (Optional)
                </label>
                <Select
                  className="mt-1 w-full"
                  value={locationId || undefined}
                  onChange={setLocationIdState}
                  placeholder="Select location"
                  options={locations.map((location) => ({
                    value: location?._id || location?.id,
                    label: location?.name || "Unnamed Location",
                  }))}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Start Time
                </label>
                <Input
                  type="time"
                  className="mt-1 rounded-xl"
                  value={startTime}
                  onChange={(event) => setStartTimeState(event.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  End Time
                </label>
                <Input
                  type="time"
                  className="mt-1 rounded-xl"
                  value={endTime}
                  onChange={(event) => setEndTimeState(event.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Available Days
              </label>
              <div className="mt-2">
                <Checkbox.Group
                  options={DAYS.map((day) => ({ label: day.label, value: day.value }))}
                  value={selectedDays}
                  onChange={(value) => setSelectedDaysState(value)}
                />
              </div>
            </div>
          </Card>
        </div>
      }
    />
  );
};

export default Availability;
