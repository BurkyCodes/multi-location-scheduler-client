import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Select } from "antd";
import { ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import dayjs from "dayjs";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";
import ConstraintViolationsModal from "../SharedComponents/Modals/ConstraintViolationsModal";
import { createShift, deleteShift, fetchShifts, updateShift } from "../Store/Features/shiftsSlice";
import { fetchLocations } from "../Store/Features/locationsSlice";
import { fetchSchedules } from "../Store/Features/schedulesSlice";
import { fetchSkills } from "../Store/Features/skillsSlice";
import { fetchStaff } from "../Store/Features/staffSlice";
import { fetchAvailabilityByUser } from "../Store/Features/availabilitySlice";
import {
  clockInAssignmentQuick,
  clockOutAssignmentQuick,
  createAssignment,
  fetchAssignments,
  fetchCoverageRecommendations,
  fetchMyShiftTracking,
  pauseAssignmentQuick,
  resumeAssignmentQuick,
} from "../Store/Features/assignmentsSlice";
import { createSwapRequest, fetchSwapRequests } from "../Store/Features/swapRequestsSlice";
import { createAuditLog } from "../Store/Features/auditLogsSlice";
import { hasRole } from "../Utils/roles";

const FONT = { fontFamily: "'Montserrat', sans-serif" };
const FONT_SM = { ...FONT, fontSize: 12 };
const FONT_XS = { ...FONT, fontSize: 11 };

const initialValues = {
  schedule_id: "",
  location_id: "",
  required_skill_id: "",
  starts_at_utc: "",
  ends_at_utc: "",
  headcount_required: "1",
  status: "open",
};

const TZ_ALIAS_MAP = {
  "Africa/DaresSalaam": "Africa/Dar_es_Salaam",
  "Africa/DarEsSalaam": "Africa/Dar_es_Salaam",
  "Africa/Dar es Salaam": "Africa/Dar_es_Salaam",
};
const TZ_CODE_TO_IANA = {
  EAT: "Africa/Nairobi",
  PST: "America/Los_Angeles",
};
const TZ_DISPLAY_LABEL = {
  EAT: "EAT",
  PST: "PST",
};

const getId = (value) => (typeof value === "object" ? value?._id || value?.id : value);
const toErrorMessage = (payload, fallback) => {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string") return payload.message;
    const firstText = Object.values(payload).find((item) => typeof item === "string");
    if (firstText) return firstText;
  }
  return fallback;
};
const isPendingLikeStatus = (status) => {
  const normalized = String(status || "").toLowerCase();
  return normalized.includes("pending") || normalized === "processing";
};
const isPastShift = (endAt) => {
  if (!endAt) return false;
  const endDate = new Date(endAt);
  if (Number.isNaN(endDate.getTime())) return false;
  return endDate.getTime() < Date.now();
};
const getAssignmentId = (assignment) =>
  String(
    assignment?._id ||
      assignment?.assignment_id ||
      assignment?.id ||
      assignment?.assignment?.id ||
      "",
  );
const isOngoingAssignment = (workStatus) => {
  const normalized = String(workStatus || "").toLowerCase();
  return normalized === "clocked_in" || normalized === "paused";
};
const parseDateTimeLocal = (value) => {
  const match = String(value || "").match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
};

const isValidTimeZone = (timeZone) => {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const normalizeTimeZoneCode = (timeZone) => {
  const normalized = String(timeZone || "").trim().toUpperCase();
  if (
    normalized === "PST" ||
    normalized === "PDT" ||
    normalized === "PT" ||
    normalized === "AMERICA/LOS_ANGELES"
  ) {
    return "PST";
  }
  if (
    normalized === "EAT" ||
    normalized === "AFRICA/NAIROBI" ||
    normalized === "AFRICA/DAR_ES_SALAAM"
  ) {
    return "EAT";
  }
  return "EAT";
};

const toIanaTimeZone = (timeZone) => {
  const normalizedAlias = TZ_ALIAS_MAP[timeZone] || timeZone;
  if (isValidTimeZone(normalizedAlias)) return normalizedAlias;
  const code = normalizeTimeZoneCode(timeZone);
  return TZ_CODE_TO_IANA[code] || TZ_CODE_TO_IANA.EAT;
};

const getDateTimePartsInTimezone = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map = {};
  formatter.formatToParts(date).forEach((part) => {
    map[part.type] = part.value;
  });
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
};

const zonedDateTimeToUtcIso = (value, timezoneCode) => {
  const parsed = parseDateTimeLocal(value);
  if (!parsed) return null;
  const { year, month, day, hour, minute } = parsed;
  const timeZone = toIanaTimeZone(timezoneCode);

  let guess = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 4; i += 1) {
    const actual = getDateTimePartsInTimezone(new Date(guess), timeZone);
    const desiredUtc = Date.UTC(year, month - 1, day, hour, minute);
    const actualUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    const diff = desiredUtc - actualUtc;
    if (diff === 0) break;
    guess += diff;
  }

  return new Date(guess).toISOString();
};

const utcIsoToDateTimeLocalInTimezone = (value, timezoneCode) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = getDateTimePartsInTimezone(date, toIanaTimeZone(timezoneCode));
  const y = String(parts.year).padStart(4, "0");
  const m = String(parts.month).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  const h = String(parts.hour).padStart(2, "0");
  const min = String(parts.minute).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
};

const formatDateTimeInTimezone = (value, timezoneCode, options = {}) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: toIanaTimeZone(timezoneCode),
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  }).format(date);
};

const formatShiftWindowInTimezone = (startsAt, endsAt, timezoneCode) => {
  if (!startsAt || !endsAt) return "N/A";
  const startDateOnly = formatDateTimeInTimezone(startsAt, timezoneCode, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const endDateOnly = formatDateTimeInTimezone(endsAt, timezoneCode, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const startLabel = formatDateTimeInTimezone(startsAt, timezoneCode);
  if (startDateOnly === endDateOnly) {
    const endTime = formatDateTimeInTimezone(endsAt, timezoneCode, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${startLabel} - ${endTime}`;
  }
  const endLabel = formatDateTimeInTimezone(endsAt, timezoneCode);
  return `${startLabel} - ${endLabel}`;
};

const isSundayNightChaosPremium = (startsAtIso, timeZone) => {
  if (!startsAtIso) return false;
  const start = new Date(startsAtIso);
  const now = new Date();
  const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilStart < 0 || hoursUntilStart > 2) return false;

  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(start);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(start));

  return weekday === "Sun" && hour >= 19;
};

const inputStyle = (hasError, isDisabled = false) => ({
  ...FONT_SM,
  width: "100%",
  height: 40,
  borderRadius: 8,
  border: `1.5px solid ${hasError ? "#fecaca" : "#e2e8f0"}`,
  padding: "0 12px",
  color: "#1e293b",
  background: isDisabled ? "#f8fafc" : hasError ? "#fef2f2" : "#fff",
  outline: "none",
});

const FieldLabel = ({ text, hint }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ ...FONT_SM, fontWeight: 700, color: "#374151" }}>{text}</div>
    {hint ? <div style={{ ...FONT_XS, color: "#94a3b8", marginTop: 2 }}>{hint}</div> : null}
  </div>
);

const FieldError = ({ value }) =>
  value ? <div style={{ ...FONT_XS, color: "#ef4444", marginTop: 4 }}>{value}</div> : null;

const ShiftForm = ({
  title,
  subtitle,
  values,
  errors,
  loading,
  submitLabel,
  scheduleOptions,
  locationOptions,
  skillOptions,
  locationTimezone,
  isManager,
  effectiveLocationId,
  onValueChange,
  onSubmit,
  onCancel,
}) => (
  <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ ...FONT, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{title}</div>
        <div style={{ ...FONT_XS, color: "#64748b", marginTop: 3 }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel text="Schedule" />
          <select
            value={values.schedule_id}
            onChange={(event) => onValueChange("schedule_id", event.target.value)}
            style={inputStyle(Boolean(errors.schedule_id))}
          >
            <option value="">Select schedule</option>
            {scheduleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError value={errors.schedule_id} />
        </div>

        <div>
          <FieldLabel text="Location" />
          {isManager ? (
            <input value={locationOptions.find((opt) => opt.value === effectiveLocationId)?.label || "No location"} readOnly style={inputStyle(false, true)} />
          ) : (
            <select
              value={values.location_id}
              onChange={(event) => onValueChange("location_id", event.target.value)}
              style={inputStyle(Boolean(errors.location_id))}
            >
              <option value="">Select location</option>
              {locationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          <FieldError value={errors.location_id} />
        </div>

        <div>
          <FieldLabel text="Location Timezone" />
          <input value={locationTimezone || "Africa/Nairobi"} readOnly style={inputStyle(false, true)} />
        </div>

        <div>
          <FieldLabel text="Required Skill" />
          <select
            value={values.required_skill_id}
            onChange={(event) => onValueChange("required_skill_id", event.target.value)}
            style={inputStyle(Boolean(errors.required_skill_id))}
          >
            <option value="">Select skill</option>
            {skillOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError value={errors.required_skill_id} />
        </div>

        <div>
          <FieldLabel text="Shift Start" />
          <input
            type="datetime-local"
            value={values.starts_at_utc}
            onChange={(event) => onValueChange("starts_at_utc", event.target.value)}
            style={inputStyle(Boolean(errors.starts_at_utc))}
          />
          <FieldError value={errors.starts_at_utc} />
        </div>

        <div>
          <FieldLabel text="Shift End" />
          <input
            type="datetime-local"
            value={values.ends_at_utc}
            onChange={(event) => onValueChange("ends_at_utc", event.target.value)}
            style={inputStyle(Boolean(errors.ends_at_utc))}
          />
          <FieldError value={errors.ends_at_utc} />
        </div>

        <div>
          <FieldLabel text="Headcount" />
          <input
            type="number"
            min="1"
            step="1"
            value={values.headcount_required}
            onChange={(event) => onValueChange("headcount_required", event.target.value)}
            style={inputStyle(Boolean(errors.headcount_required))}
          />
          <FieldError value={errors.headcount_required} />
        </div>

        <div>
          <FieldLabel text="Status" />
          <select
            value={values.status}
            onChange={(event) => onValueChange("status", event.target.value)}
            style={inputStyle(false)}
          >
            <option value="open">Open</option>
            <option value="filled">Filled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Premium Shift Rule</p>
          <p className="text-xs text-amber-700 mt-1">
            Premium is automatically set for Sunday-night emergency shifts posted within 2 hours of shift start.
          </p>
        </div>
      </div>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 24px", borderTop: "1px solid #f1f5f9", background: "#fff" }}>
      <button type="button" onClick={onCancel} style={{ ...FONT_SM, height: 40, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", padding: "0 16px", fontWeight: 700, cursor: "pointer" }}>
        Cancel
      </button>
      <button type="submit" disabled={loading} style={{ ...FONT_SM, height: 40, borderRadius: 8, border: "none", background: loading ? "#fdba74" : "#f6873a", color: "#fff", padding: "0 20px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(246,135,58,0.25)" }}>
        {loading ? "Saving..." : submitLabel}
      </button>
    </div>
  </form>
);

const Shifts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);
  const currentUserId = currentUser?._id || currentUser?.id;
  const isManager = hasRole(currentUser, ["manager"]);
  const canManageShifts = hasRole(currentUser, ["admin", "manager"]);
  const isStaffUser = hasRole(currentUser, ["staff"]) && !canManageShifts;

  const { list, loading, saving } = useSelector((state) => state.shifts);
  const { list: assignments } = useSelector((state) => state.assignments);
  const {
    myTracking,
    myTrackingLoading,
    quickActionLoading,
    saving: assignmentSaving,
    recommendations,
    recommendationsShiftId,
    recommendationsLoading,
  } = useSelector((state) => state.assignments);
  const { list: swapRequests, saving: swapSaving } = useSelector((state) => state.swapRequests);
  const { list: locations } = useSelector((state) => state.locations);
  const { list: schedules } = useSelector((state) => state.schedules);
  const { skills } = useSelector((state) => state.skills);
  const { list: staff } = useSelector((state) => state.staff);
  const availabilityByUser = useSelector((state) => state.availability.byUser);

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [seventhDayOverrideEnabled, setSeventhDayOverrideEnabled] = useState(false);
  const [seventhDayOverrideReason, setSeventhDayOverrideReason] = useState("");
  const [constraintModal, setConstraintModal] = useState({
    open: false,
    title: "Assignment constraint violation",
    subtitle: "Review the failed rules below and adjust shift or staff selection.",
    violations: [],
    suggestions: [],
  });

  useEffect(() => {
    dispatch(fetchShifts());
    dispatch(fetchAssignments());
    dispatch(fetchLocations());
    dispatch(fetchSchedules());
    dispatch(fetchSkills());
    if (isManager) {
      dispatch(fetchStaff());
    }
    if (isStaffUser) {
      dispatch(fetchMyShiftTracking());
      dispatch(fetchSwapRequests());
    }
  }, [dispatch, isManager, isStaffUser]);

  const managerLocationIds = useMemo(() => {
    const raw = currentUser?.location_ids || [];
    return raw.map((loc) => String(getId(loc))).filter(Boolean);
  }, [currentUser]);

  const allowedLocations = useMemo(() => {
    if (!isManager) return locations;
    const allowed = new Set(managerLocationIds);
    return locations.filter((location) => allowed.has(String(getId(location))));
  }, [isManager, locations, managerLocationIds]);

  const locationById = useMemo(
    () =>
      locations.reduce((acc, location) => {
        acc[String(getId(location))] = location;
        return acc;
      }, {}),
    [locations],
  );

  const locationOptions = useMemo(
    () =>
      allowedLocations.map((location) => ({
        value: String(getId(location)),
        label: location?.name || "Unnamed Location",
      })),
    [allowedLocations],
  );

  const scheduleOptions = useMemo(() => {
    const allowedLocationSet = new Set(allowedLocations.map((location) => String(getId(location))));
    const filtered = isManager
      ? schedules.filter((schedule) => allowedLocationSet.has(String(getId(schedule?.location_id))))
      : schedules;

    return filtered.map((schedule) => ({
      value: String(getId(schedule)),
      label: `${schedule?.location_id?.name || "Location"} - ${dayjs(schedule?.week_start_date).format("MMM D, YYYY")}`,
    }));
  }, [allowedLocations, isManager, schedules]);

  const scheduleById = useMemo(
    () =>
      (schedules || []).reduce((acc, schedule) => {
        acc[String(getId(schedule))] = schedule;
        return acc;
      }, {}),
    [schedules],
  );

  const skillOptions = useMemo(
    () =>
      (skills || []).map((skill) => ({
        value: String(getId(skill)),
        label: skill?.name || skill?.code || "Skill",
      })),
    [skills],
  );

  const skillById = useMemo(
    () =>
      (skills || []).reduce((acc, skill) => {
        acc[String(getId(skill))] = skill;
        return acc;
      }, {}),
    [skills],
  );
  const allowedShiftOptions = useMemo(() => {
    const filtered = isManager
      ? list.filter((shift) => managerLocationIds.includes(String(getId(shift?.location_id))))
      : list;
    return filtered.map((shift) => ({
      label:
        shift?.title ||
        shift?.name ||
        `${shift?.location_id?.name || "Location"} - ${dayjs(shift?.starts_at_utc).format("MMM D, YYYY h:mm A")}`,
      value: String(getId(shift)),
    }));
  }, [isManager, list, managerLocationIds]);
  const allowedStaffOptions = useMemo(() => {
    const filtered = isManager
      ? (staff || []).filter((member) => {
          const staffLocationIds = (member?.location_ids || []).map((locationId) => String(getId(locationId)));
          return staffLocationIds.some((id) => managerLocationIds.includes(id));
        })
      : staff || [];

    const recommendationSet = new Set(
      (recommendations || []).map((item) => String(getId(item?.user_id))).filter(Boolean),
    );

    return filtered
      .map((member) => {
        const value = String(getId(member));
        const isRecommended = recommendationSet.has(value);
        return {
          value,
          label: `${member?.name || member?.email || "Unnamed"}${isRecommended ? " (Recommended)" : ""}`,
          isRecommended,
        };
      })
      .sort((a, b) => Number(b.isRecommended) - Number(a.isRecommended));
  }, [isManager, managerLocationIds, recommendations, staff]);

  const managerDefaultLocationId = isManager && allowedLocations.length ? String(getId(allowedLocations[0])) : "";
  const effectiveLocationId = values.location_id || managerDefaultLocationId;
  const selectedLocation = locationById[String(effectiveLocationId)] || null;
  const selectedTimezoneCode = normalizeTimeZoneCode(
    selectedLocation?.timezone || selectedLocation?.location_timezone || "EAT",
  );
  const selectedTimezoneIana = toIanaTimeZone(selectedTimezoneCode);

  const onValueChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (payload) => {
    const nextErrors = {};
    if (!payload.schedule_id) nextErrors.schedule_id = "Schedule is required";
    const locationId = payload.location_id || managerDefaultLocationId;
    if (!locationId) nextErrors.location_id = "Location is required";
    if (!payload.required_skill_id) nextErrors.required_skill_id = "Required skill is required";
    if (!payload.starts_at_utc) nextErrors.starts_at_utc = "Start time is required";
    if (!payload.ends_at_utc) nextErrors.ends_at_utc = "End time is required";
    if (payload.starts_at_utc && payload.ends_at_utc) {
      const start = new Date(payload.starts_at_utc);
      const end = new Date(payload.ends_at_utc);
      if (!(end > start)) nextErrors.ends_at_utc = "Shift end must be after shift start";
    }
    const headcount = Number(payload.headcount_required);
    if (Number.isNaN(headcount) || headcount < 1) nextErrors.headcount_required = "Headcount must be at least 1";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const rows = useMemo(() => {
    const filtered = isManager
      ? list.filter((shift) => managerLocationIds.includes(String(getId(shift?.location_id))))
      : list;

    const assignmentMetaByShift = new Map();
    (assignments || []).forEach((assignment) => {
      const shiftId = String(getId(assignment?.shift_id));
      if (!shiftId) return;
      const current = assignmentMetaByShift.get(shiftId) || { hasAssigned: false, isOngoing: false };
      if (String(assignment?.status || "").toLowerCase() === "assigned") current.hasAssigned = true;
      if (isOngoingAssignment(assignment?.work_status)) current.isOngoing = true;
      assignmentMetaByShift.set(shiftId, current);
    });

    return filtered.map((shift) => {
      const location = shift?.location_id;
      const skill = shift?.required_skill_id;
      const schedule = shift?.schedule_id;
      const shiftId = String(getId(shift));
      const shiftMeta = assignmentMetaByShift.get(shiftId) || { hasAssigned: false, isOngoing: false };
      const past = isPastShift(shift?.ends_at_utc);
      const scheduleDate = schedule?.week_start_date
        ? dayjs(schedule.week_start_date).format("MMM D, YYYY")
        : "N/A";
      const derivedStatus = past
        ? "past"
        : shiftMeta.isOngoing
        ? "ongoing"
        : shiftMeta.hasAssigned
        ? "assigned"
        : shift?.status || "open";

      return {
        key: shiftId,
        raw: shift,
        location: location?.name || locationById[String(getId(location))]?.name || "Unknown Location",
        schedule: scheduleDate,
        skill: skill?.name || skill?.code || skillById[String(getId(skill))]?.name || "N/A",
        timeframe: formatShiftWindowInTimezone(
          shift?.starts_at_utc,
          shift?.ends_at_utc,
          shift?.location_timezone || shift?.timezone || "EAT",
        ),
        timezone: TZ_DISPLAY_LABEL[normalizeTimeZoneCode(shift?.location_timezone)] || "EAT",
        headcount_required: shift?.headcount_required ?? 1,
        status: derivedStatus,
        premium: shift?.is_premium ? "Yes" : "No",
        hasAssignment: shiftMeta.hasAssigned,
        isPastShift: past,
      };
    });
  }, [isManager, list, locationById, managerLocationIds, skillById, assignments]);

  const activeAssignmentId = useMemo(
    () => String(getId(myTracking?.active_assignment) || ""),
    [myTracking?.active_assignment],
  );

  const assignedShifts = useMemo(
    () =>
      (Array.isArray(myTracking?.assignments) ? myTracking.assignments : [])
        .map((assignment) => {
          const shift = assignment?.shift_id || assignment?.shift || {};
          const location = shift?.location_id || shift?.location || {};
          const currentStatus = String(assignment?.status || "assigned").toLowerCase();
          const assignmentId = getAssignmentId(assignment);
          const isActive = assignmentId && activeAssignmentId && assignmentId === activeAssignmentId;
          const actionStatus =
            currentStatus === "paused"
              ? "paused"
              : currentStatus === "completed" || currentStatus === "clocked_out"
              ? "completed"
              : currentStatus === "in-progress" || currentStatus === "clocked_in" || isActive
              ? "in-progress"
              : "assigned";
          const start = shift?.starts_at_utc || assignment?.starts_at_utc;
          const end = shift?.ends_at_utc || assignment?.ends_at_utc;
          const past = isPastShift(end);
          const status = past ? "past" : actionStatus === "in-progress" ? "ongoing" : actionStatus;

          return {
            id: assignmentId,
            shiftId: String(getId(shift)),
            title: shift?.title || shift?.name || "Assigned shift",
            location: location?.name || "Unknown location",
            start,
            end,
            timezone: shift?.location_timezone || shift?.timezone || "EAT",
            status,
            actionStatus,
            isPastShift: past,
          };
        })
        .sort((a, b) => {
          const pastRank = Number(a.isPastShift) - Number(b.isPastShift);
          if (pastRank !== 0) return pastRank;
          return new Date(b.start || 0).getTime() - new Date(a.start || 0).getTime();
        }),
    [myTracking, activeAssignmentId],
  );
  useEffect(() => {
    if (!isManager || !selectedShiftId) return;
    dispatch(fetchCoverageRecommendations({ shiftId: selectedShiftId, limit: 8 }));
  }, [dispatch, isManager, selectedShiftId]);
  useEffect(() => {
    if (!isManager || !selectedStaffId) return;
    dispatch(fetchAvailabilityByUser(selectedStaffId));
  }, [dispatch, isManager, selectedStaffId]);
  const selectedAssignShift = useMemo(
    () => (list || []).find((item) => String(getId(item)) === String(selectedShiftId || "")) || null,
    [list, selectedShiftId],
  );
  const selectedAssignShiftTimezoneCode = useMemo(
    () => normalizeTimeZoneCode(selectedAssignShift?.location_timezone || selectedAssignShift?.timezone),
    [selectedAssignShift],
  );
  const selectedAssignStaffAvailability = availabilityByUser[String(selectedStaffId || "")];
  const selectedAssignStaffAvailabilityTimezoneCode = useMemo(() => {
    const recurringTz = selectedAssignStaffAvailability?.recurring_windows?.[0]?.timezone;
    const exceptionTz = selectedAssignStaffAvailability?.exceptions?.[0]?.timezone;
    const raw = recurringTz || exceptionTz || "";
    return raw ? normalizeTimeZoneCode(raw) : "";
  }, [selectedAssignStaffAvailability]);
  const assignTimezoneMatch = useMemo(() => {
    if (!selectedAssignShiftTimezoneCode || !selectedAssignStaffAvailabilityTimezoneCode) return null;
    return selectedAssignShiftTimezoneCode === selectedAssignStaffAvailabilityTimezoneCode;
  }, [selectedAssignShiftTimezoneCode, selectedAssignStaffAvailabilityTimezoneCode]);

  const pendingSwapCount = useMemo(
    () =>
      (swapRequests || []).filter((request) => {
        const requesterId = String(getId(request?.requester_id) || request?.requester_id || "");
        return requesterId === String(currentUserId || "") && isPendingLikeStatus(request?.status);
      }).length,
    [swapRequests, currentUserId],
  );
  const pendingSwapAssignmentIds = useMemo(
    () =>
      new Set(
        (swapRequests || [])
          .filter((request) => {
            const requesterId = String(getId(request?.requester_id) || request?.requester_id || "");
            return requesterId === String(currentUserId || "") && isPendingLikeStatus(request?.status);
          })
          .map((request) => String(getId(request?.from_assignment_id) || request?.from_assignment_id || ""))
          .filter(Boolean),
      ),
    [swapRequests, currentUserId],
  );
  const pendingSwapRequests = useMemo(
    () =>
      (swapRequests || []).filter((request) => {
        const requesterId = String(getId(request?.requester_id) || request?.requester_id || "");
        return requesterId === String(currentUserId || "") && isPendingLikeStatus(request?.status);
      }),
    [swapRequests, currentUserId],
  );

  const validateShiftAgainstSchedule = (payload) => {
    const scheduleId = String(payload?.schedule_id || "");
    const selectedSchedule = scheduleById[scheduleId];
    if (!selectedSchedule?.week_start_date || !payload?.starts_at_utc) return { valid: true };
    const scheduleStart = new Date(selectedSchedule.week_start_date);
    const shiftStart = new Date(payload.starts_at_utc);
    if (Number.isNaN(scheduleStart.getTime()) || Number.isNaN(shiftStart.getTime())) {
      return { valid: true };
    }
    if (shiftStart < scheduleStart) {
      return {
        valid: false,
        message: "Shift start cannot be before the selected schedule start date.",
      };
    }
    return { valid: true };
  };

  const buildPayload = (formValues, isUpdate = false) => {
    const timezoneCode = selectedTimezoneCode;
    const startsAtIso = zonedDateTimeToUtcIso(formValues.starts_at_utc, timezoneCode);
    const endsAtIso = zonedDateTimeToUtcIso(formValues.ends_at_utc, timezoneCode);
    if (!startsAtIso || !endsAtIso) return null;

    return {
      schedule_id: formValues.schedule_id,
      location_id: formValues.location_id || managerDefaultLocationId,
      required_skill_id: formValues.required_skill_id,
      starts_at_utc: startsAtIso,
      ends_at_utc: endsAtIso,
      location_timezone: timezoneCode,
      headcount_required: Number(formValues.headcount_required),
      is_premium: isSundayNightChaosPremium(startsAtIso, selectedTimezoneIana),
      status: formValues.status,
      ...(isUpdate ? { updated_by: currentUser?._id } : { created_by: currentUser?._id }),
    };
  };

  const resetForm = () => {
    setValues({
      ...initialValues,
      location_id: isManager && allowedLocations.length ? String(getId(allowedLocations[0])) : "",
    });
    setErrors({});
  };

  const handleCreate = async (event, closeModal) => {
    event.preventDefault();
    if (!validate(values)) return;
    const payload = buildPayload(values, false);
    if (!payload) {
      toast.error("Invalid shift start or end time");
      return;
    }
    const scheduleValidation = validateShiftAgainstSchedule(payload);
    if (!scheduleValidation.valid) {
      setErrors((prev) => ({ ...prev, starts_at_utc: scheduleValidation.message }));
      toast.error(scheduleValidation.message);
      return;
    }
    const result = await dispatch(createShift(payload));
    if (createShift.fulfilled.match(result)) {
      toast.success("Shift created");
      resetForm();
      closeModal();
      dispatch(fetchShifts());
    } else {
      toast.error(toErrorMessage(result?.payload, "Failed to create shift"));
    }
  };

  const openEditModal = (record) => {
    const shift = record.raw;
    const shiftTimezoneCode = normalizeTimeZoneCode(shift?.location_timezone || shift?.timezone || "EAT");
    setEditingShift(record);
    setErrors({});
    setValues({
      schedule_id: String(getId(shift?.schedule_id) || ""),
      location_id: String(getId(shift?.location_id) || ""),
      required_skill_id: String(getId(shift?.required_skill_id) || ""),
      starts_at_utc: utcIsoToDateTimeLocalInTimezone(shift?.starts_at_utc, shiftTimezoneCode),
      ends_at_utc: utcIsoToDateTimeLocalInTimezone(shift?.ends_at_utc, shiftTimezoneCode),
      headcount_required: String(shift?.headcount_required ?? 1),
      status: shift?.status || "open",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editingShift) return;
    if (!validate(values)) return;
    const payload = buildPayload(values, true);
    if (!payload) {
      toast.error("Invalid shift start or end time");
      return;
    }
    const scheduleValidation = validateShiftAgainstSchedule(payload);
    if (!scheduleValidation.valid) {
      setErrors((prev) => ({ ...prev, starts_at_utc: scheduleValidation.message }));
      toast.error(scheduleValidation.message);
      return;
    }

    const result = await dispatch(
      updateShift({
        id: editingShift.key,
        ...payload,
      }),
    );

    if (updateShift.fulfilled.match(result)) {
      toast.success("Shift updated");
      setEditOpen(false);
      setEditingShift(null);
      resetForm();
      dispatch(fetchShifts());
    } else {
      toast.error(toErrorMessage(result?.payload, "Failed to update shift"));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await dispatch(deleteShift(deleteTarget.key));
    if (deleteShift.fulfilled.match(result)) {
      toast.success("Shift deleted");
      setDeleteTarget(null);
    } else {
      toast.error(toErrorMessage(result?.payload, "Failed to delete shift"));
    }
  };
  const resetAssignForm = () => {
    setSelectedShiftId("");
    setSelectedStaffId("");
    setSeventhDayOverrideEnabled(false);
    setSeventhDayOverrideReason("");
  };
  const openAssignDrawer = (shiftId = "") => {
    resetAssignForm();
    setSelectedShiftId(shiftId ? String(shiftId) : "");
    setAssignDrawerOpen(true);
  };
  const saveAssignmentFromShifts = async () => {
    if (!selectedShiftId || !selectedStaffId) {
      toast.error("Select both shift and staff member");
      return;
    }
    if (seventhDayOverrideEnabled && !String(seventhDayOverrideReason || "").trim()) {
      toast.error("Override reason is required when 7th day override is enabled");
      return;
    }

    const payload = {
      shift_id: selectedShiftId,
      user_id: selectedStaffId,
      status: "assigned",
      ...(currentUser?._id ? { assigned_by: currentUser._id } : {}),
      ...(seventhDayOverrideEnabled
        ? {
            manager_override: {
              is_override: true,
              override_type: "seventh_consecutive_day",
              reason: seventhDayOverrideReason,
              approved_by: currentUser?._id,
              approved_at: new Date().toISOString(),
            },
          }
        : {}),
    };

    const result = await dispatch(createAssignment(payload));
    if (createAssignment.fulfilled.match(result)) {
      toast.success("Assignment created");
      setAssignDrawerOpen(false);
      resetAssignForm();
      dispatch(fetchAssignments());
      navigate("/assignments");
      return;
    }

    const payloadError = result?.payload;
    const violations = Array.isArray(payloadError?.violations) ? payloadError.violations : [];
    const warnings = Array.isArray(payloadError?.warnings) ? payloadError.warnings : [];
    const requiresSeventhDayOverride = violations.some(
      (item) => item?.rule === "seventh_day_override_required",
    );
    if (requiresSeventhDayOverride) {
      setSeventhDayOverrideEnabled(true);
      toast.error("This assignment hits a 7th consecutive day. Enter an override reason to continue.");
    }
    if (violations.length > 0) {
      const suggestions = Array.isArray(payloadError?.suggestions) ? payloadError.suggestions : [];
      const recommendations = Array.isArray(payloadError?.recommendations)
        ? payloadError.recommendations
        : suggestions;
      const title = toErrorMessage(payloadError, "Assignment constraint violation");
      setConstraintModal({
        open: true,
        title,
        subtitle: "Review the failed rules below and adjust shift or staff selection.",
        violations,
        suggestions: recommendations,
      });
    } else {
      const message = toErrorMessage(payloadError, "Failed to save assignment");
      toast.error(message);
    }

    warnings.slice(0, 2).forEach((warning) => {
      if (warning?.message) {
        toast.warning(warning.message);
      }
    });
  };

  const runQuickAction = async (action, assignmentId) => {
    if (!assignmentId) {
      toast.error("Could not update shift. Assignment ID is missing.");
      return;
    }
    let result;

    if (action === "clock_in") {
      result = await dispatch(clockInAssignmentQuick({ assignmentId }));
    } else if (action === "pause") {
      result = await dispatch(pauseAssignmentQuick({ assignmentId, reason: "Break" }));
    } else if (action === "resume") {
      result = await dispatch(resumeAssignmentQuick({ assignmentId }));
    } else if (action === "clock_out") {
      result = await dispatch(clockOutAssignmentQuick({ assignmentId }));
    } else {
      return;
    }

    const fulfilled =
      clockInAssignmentQuick.fulfilled.match(result) ||
      pauseAssignmentQuick.fulfilled.match(result) ||
      resumeAssignmentQuick.fulfilled.match(result) ||
      clockOutAssignmentQuick.fulfilled.match(result);

    if (fulfilled) {
      toast.success("Shift action updated");
      dispatch(fetchMyShiftTracking());
      return;
    }

    toast.error(toErrorMessage(result?.payload, "Failed to update shift"));
  };

  const requestSwap = async (assignment) => {
    if (!assignment?.shiftId || !assignment?.id || !currentUserId) {
      toast.error("Could not request swap. Assignment details are incomplete.");
      return;
    }
    if (assignment?.isPastShift) {
      toast.error("Past shifts cannot be swapped.");
      return;
    }
    if (pendingSwapCount >= 3) {
      toast.error("You can only have up to 3 pending swap/drop requests at a time.");
      return;
    }
    if (pendingSwapAssignmentIds.has(String(assignment.id))) {
      toast.error("Swap already requested for this shift.");
      return;
    }
    const result = await dispatch(
      createSwapRequest({
        type: "swap",
        requester_id: currentUserId,
        from_assignment_id: assignment.id,
        note: "Requested from Shifts page",
      }),
    );

    if (createSwapRequest.fulfilled.match(result)) {
      const createdRequest = result?.payload;
      dispatch(
        createAuditLog({
          actor_user_id: currentUserId,
          action: "swap_request_created",
          module: "swap_requests",
          entity_type: "swap_request",
          after_state: {
            swap_request_id: String(getId(createdRequest) || ""),
            requester_id: currentUserId,
            assignment_id: assignment.id,
          },
        }),
      );
      toast.success("Swap request submitted");
      dispatch(fetchSwapRequests());
      return;
    }

    toast.error(toErrorMessage(result?.payload, "Failed to request swap"));
  };

  if (isStaffUser) {
    return (
      <ModuleLayoutsOne
        title="My Shifts"
        subtitle="Your assigned shifts with quick actions and swap requests."
        tableTitle="Assigned Shifts"
        totalRecords={assignedShifts.length}
        tableHeaderBadges={[
          { text: `${assignedShifts.length} assigned` },
          { text: `${pendingSwapCount} pending swap requests` },
        ]}
        tableContent={() => (
          <div className="p-6">
            {myTrackingLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                Loading assigned shifts...
              </div>
            ) : assignedShifts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                No assigned shifts found.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {assignedShifts.map((shift) => (
                  <div key={shift.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{shift.location}</p>
                        <h3 className="text-lg font-black text-slate-900">{shift.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{shift.timezone}</p>
                      </div>
                      {shift.isPastShift ? (
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Past Shift
                        </span>
                      ) : (
                        <StatusBadge status={shift.status} />
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Starts</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatDateTimeInTimezone(shift.start, shift.timezone)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Ends</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatDateTimeInTimezone(shift.end, shift.timezone)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 p-3">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Quick Actions</p>
                      <div className="flex flex-wrap gap-2">
                        {shift.isPastShift ? (
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Past Shift
                          </span>
                        ) : (
                          <>
                            {shift.actionStatus === "assigned" ? (
                              <Button size="small" type="primary" loading={quickActionLoading} onClick={() => runQuickAction("clock_in", shift.id)}>
                                Clock In
                              </Button>
                            ) : null}
                            {shift.actionStatus === "in-progress" ? (
                              <>
                                <Button size="small" loading={quickActionLoading} onClick={() => runQuickAction("pause", shift.id)}>
                                  Pause
                                </Button>
                                <Button size="small" danger loading={quickActionLoading} onClick={() => runQuickAction("clock_out", shift.id)}>
                                  Clock Out
                                </Button>
                              </>
                            ) : null}
                            {shift.actionStatus === "paused" ? (
                              <>
                                <Button size="small" type="primary" loading={quickActionLoading} onClick={() => runQuickAction("resume", shift.id)}>
                                  Resume
                                </Button>
                                <Button size="small" danger loading={quickActionLoading} onClick={() => runQuickAction("clock_out", shift.id)}>
                                  Clock Out
                                </Button>
                              </>
                            ) : null}
                            <Button
                              size="small"
                              loading={swapSaving}
                              disabled={pendingSwapAssignmentIds.has(String(shift.id))}
                              onClick={() => requestSwap(shift)}
                            >
                              {pendingSwapAssignmentIds.has(String(shift.id))
                                ? "Requested Swap"
                                : "Request Swap"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-900 mb-3">My Swap Requests</p>
              {pendingSwapRequests.length === 0 ? (
                <p className="text-sm text-slate-500">No pending swap requests.</p>
              ) : (
                <div className="space-y-2">
                  {pendingSwapRequests.map((request) => (
                    <div key={String(getId(request))} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Requested {dayjs(request?.createdAt || request?.created_at).format("MMM D, YYYY h:mm A")}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {request?.from_assignment_id?.shift_id?.title ||
                          request?.from_assignment_id?.shift_id?.name ||
                          "Shift"}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {formatDateTimeInTimezone(
                          request?.from_assignment_id?.shift_id?.starts_at_utc,
                          request?.from_assignment_id?.shift_id?.location_timezone ||
                            request?.from_assignment_id?.shift_id?.timezone ||
                            "EAT",
                        )}{" "}
                        -{" "}
                        {formatDateTimeInTimezone(
                          request?.from_assignment_id?.shift_id?.ends_at_utc,
                          request?.from_assignment_id?.shift_id?.location_timezone ||
                            request?.from_assignment_id?.shift_id?.timezone ||
                            "EAT",
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      />
    );
  }

  const columns = [
    {
      title: colTitle("Location"),
      dataIndex: "location",
      key: "location",
      render: (value, row) => <ColumnData text={value} description={`Week starts: ${row.schedule}`} />,
    },
    {
      title: colTitle("Skill"),
      dataIndex: "skill",
      key: "skill",
      render: (value) => <ColumnData text={value} />,
    },
    {
      title: colTitle("Shift Window"),
      dataIndex: "timeframe",
      key: "timeframe",
      render: (value, row) => <ColumnData text={value} description={row.timezone} />,
    },
    {
      title: colTitle("Headcount"),
      dataIndex: "headcount_required",
      key: "headcount_required",
      render: (value, row) => <ColumnData text={`${value}`} description={`Premium: ${row.premium}`} />,
    },
    {
      title: colTitle("Status"),
      dataIndex: "status",
      key: "status",
      render: (value) => <StatusBadge status={value} />,
    },
    {
      title: colTitle("Action"),
      key: "action",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {isManager && !row.hasAssignment && !row.isPastShift ? (
            <Button
              type="default"
              className="h-8 rounded-lg border-slate-200 text-slate-700"
              onClick={() => openAssignDrawer(row.key)}
            >
              Assign
            </Button>
          ) : null}
          {!row.hasAssignment ? (
            <Button type="text" className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600" icon={<Pencil size={13} />} onClick={() => openEditModal(row)} />
          ) : null}
          <Button danger type="text" className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600" icon={<Trash2 size={13} />} onClick={() => setDeleteTarget(row)} />
        </div>
      ),
    },
  ];

  return (
    <>
    <ModuleLayoutsOne
      title="Shifts"
      subtitle="Create and manage location shifts for assignment."
      headerAction={({ openModal }) => (
        <div className="flex items-center gap-2">
          {isManager ? (
            <Button icon={<ClipboardCheck size={14} />} className="h-10 rounded-xl font-bold" onClick={() => openAssignDrawer()}>
              Assign Staff
            </Button>
          ) : null}
          {canManageShifts ? (
            <Button
              type="primary"
              icon={<Plus size={14} />}
              className="h-10 rounded-xl font-bold"
              onClick={() => {
                resetForm();
                openModal();
              }}
            >
              Create Shift
            </Button>
          ) : null}
        </div>
      )}
      tableTitle="Shift Roster"
      totalRecords={rows.length}
      tableProps={{ columns, dataSource: rows, loading }}
      modalTitle="Create Shift"
      modalSubtitle="Define shift window, skill requirement, and headcount."
      modalIcon={<ClipboardCheck size={20} />}
      modalContent={({ closeModal }) => (
        <ShiftForm
          title="Shift Details"
          subtitle="Define shift details."
          values={values}
          errors={errors}
          loading={saving}
          submitLabel="Create Shift"
          scheduleOptions={scheduleOptions}
          locationOptions={locationOptions}
          skillOptions={skillOptions}
          locationTimezone={selectedTimezoneCode}
          isManager={isManager}
          effectiveLocationId={effectiveLocationId}
          onValueChange={onValueChange}
          onSubmit={(event) => handleCreate(event, closeModal)}
          onCancel={closeModal}
        />
      )}
      editModalOpen={editOpen}
      onEditModalClose={() => {
        setEditOpen(false);
        setEditingShift(null);
        resetForm();
      }}
      editModalTitle="Edit Shift"
      editModalSubtitle="Update shift details and status."
      editModalIcon={<Pencil size={20} />}
      editModalContent={() => (
        <ShiftForm
          title="Edit Shift"
          subtitle="Modify shift details."
          values={values}
          errors={errors}
          loading={saving}
          submitLabel="Update Shift"
          scheduleOptions={scheduleOptions}
          locationOptions={locationOptions}
          skillOptions={skillOptions}
          locationTimezone={selectedTimezoneCode}
          isManager={isManager}
          effectiveLocationId={effectiveLocationId}
          onValueChange={onValueChange}
          onSubmit={handleUpdate}
          onCancel={() => {
            setEditOpen(false);
            setEditingShift(null);
            resetForm();
          }}
        />
      )}
      deleteModalProps={{
        visible: Boolean(deleteTarget),
        onCancel: () => setDeleteTarget(null),
        onConfirm: handleDeleteConfirm,
        title: "Delete Shift",
        subtitle: `Delete shift at ${deleteTarget?.location || "this location"}? This action cannot be undone.`,
      }}
      secondaryModalOpen={assignDrawerOpen}
      onSecondaryModalClose={() => {
        setAssignDrawerOpen(false);
        resetAssignForm();
      }}
      secondaryModalTitle="Assign Staff to Shift"
      secondaryModalSubtitle="Assign from Shifts page, then continue in Assignments."
      secondaryModalContent={
        <div className="h-full flex flex-col p-6 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Shift</label>
            <Select
              className="mt-1 w-full"
              value={selectedShiftId || undefined}
              onChange={setSelectedShiftId}
              placeholder="Select shift"
              options={allowedShiftOptions}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Staff Member</label>
            <Select
              className="mt-1 w-full"
              value={selectedStaffId || undefined}
              onChange={setSelectedStaffId}
              placeholder="Select staff member"
              options={allowedStaffOptions}
            />
            {selectedShiftId ? (
              <p className="mt-2 text-[11px] text-slate-500">
                {recommendationsLoading
                  ? "Checking available staff for this shift..."
                  : recommendationsShiftId === selectedShiftId
                    ? `${recommendations.length} staff recommendation(s) based on shift fit and availability.`
                    : "Select a shift to load availability-based recommendations."}
              </p>
            ) : null}
            {selectedShiftId && selectedStaffId ? (
              <p className="mt-2 text-[11px]">
                <span className="font-bold text-slate-700">Timezone Match:</span>{" "}
                {assignTimezoneMatch === null ? (
                  <span className="text-slate-500">Checking staff availability timezone...</span>
                ) : assignTimezoneMatch ? (
                  <span className="text-emerald-700 font-semibold">
                    Yes ({selectedAssignShiftTimezoneCode})
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold">
                    No (Shift: {selectedAssignShiftTimezoneCode} | Availability: {selectedAssignStaffAvailabilityTimezoneCode})
                  </span>
                )}
              </p>
            ) : null}
          </div>
          {selectedShiftId && selectedStaffId ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800">
                <input
                  type="checkbox"
                  checked={seventhDayOverrideEnabled}
                  onChange={(event) => setSeventhDayOverrideEnabled(event.target.checked)}
                />
                7th Day Override
              </label>
              <p className="mt-1 text-[11px] text-amber-700">
                Enable only when this staff member is being assigned on a 7th consecutive workday.
              </p>
              {seventhDayOverrideEnabled ? (
                <textarea
                  className="mt-2 w-full rounded-lg border border-amber-300 bg-white p-2 text-xs text-slate-700"
                  rows={3}
                  value={seventhDayOverrideReason}
                  onChange={(event) => setSeventhDayOverrideReason(event.target.value)}
                  placeholder="Enter manager reason for this override..."
                />
              ) : null}
            </div>
          ) : null}
          <div className="mt-auto flex items-center justify-between">
            <Button
              htmlType="button"
              onClick={() => {
                setAssignDrawerOpen(false);
                resetAssignForm();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" loading={assignmentSaving} onClick={saveAssignmentFromShifts}>
              Create Assignment
            </Button>
          </div>
        </div>
      }
    />
    <ConstraintViolationsModal
      visible={constraintModal.open}
      title={constraintModal.title}
      subtitle={constraintModal.subtitle}
      violations={constraintModal.violations}
      suggestions={constraintModal.suggestions}
      onClose={() =>
        setConstraintModal({
          open: false,
          title: "Assignment constraint violation",
          subtitle: "Review the failed rules below and adjust shift or staff selection.",
          violations: [],
          suggestions: [],
        })
      }
    />
    </>
  );
};

export default Shifts;
