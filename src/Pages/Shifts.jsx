import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "antd";
import { ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import dayjs from "dayjs";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";
import { createShift, deleteShift, fetchShifts, updateShift } from "../Store/Features/shiftsSlice";
import { fetchLocations } from "../Store/Features/locationsSlice";
import { fetchSchedules } from "../Store/Features/schedulesSlice";
import { fetchSkills } from "../Store/Features/skillsSlice";
import { hasRole } from "../utils/roles";

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

const getId = (value) => (typeof value === "object" ? value?._id || value?.id : value);
const toDateTimeLocal = (value) => (value ? dayjs(value).format("YYYY-MM-DDTHH:mm") : "");

const isValidTimeZone = (timeZone) => {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const normalizeTimeZone = (timeZone) => {
  const normalized = TZ_ALIAS_MAP[timeZone] || timeZone;
  if (isValidTimeZone(normalized)) return normalized;
  return "Africa/Nairobi";
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
          <FieldLabel text="Location" hint={isManager ? "Prefilled from your account and locked" : undefined} />
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
          <FieldLabel text="Location Timezone" hint={isManager ? "Prefilled from location and locked" : "Auto-derived from selected location"} />
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
  const isManager = hasRole(currentUser, ["manager"]);

  const { list, loading, saving } = useSelector((state) => state.shifts);
  const { list: locations } = useSelector((state) => state.locations);
  const { list: schedules } = useSelector((state) => state.schedules);
  const { skills } = useSelector((state) => state.skills);

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchShifts());
    dispatch(fetchLocations());
    dispatch(fetchSchedules());
    dispatch(fetchSkills());
  }, [dispatch]);

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

  const managerDefaultLocationId = isManager && allowedLocations.length ? String(getId(allowedLocations[0])) : "";
  const effectiveLocationId = values.location_id || managerDefaultLocationId;
  const selectedLocation = locationById[String(effectiveLocationId)] || null;
  const selectedTimezone = normalizeTimeZone(selectedLocation?.timezone || selectedLocation?.location_timezone || "Africa/Nairobi");

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

    return filtered.map((shift) => {
      const location = shift?.location_id;
      const skill = shift?.required_skill_id;
      const schedule = shift?.schedule_id;

      return {
        key: String(getId(shift)),
        raw: shift,
        location: location?.name || locationById[String(getId(location))]?.name || "Unknown Location",
        schedule: schedule?._id || getId(schedule) || "N/A",
        skill: skill?.name || skill?.code || skillById[String(getId(skill))]?.name || "N/A",
        timeframe: `${dayjs(shift?.starts_at_utc).format("MMM D, YYYY h:mm A")} - ${dayjs(shift?.ends_at_utc).format("h:mm A")}`,
        timezone: shift?.location_timezone || "N/A",
        headcount_required: shift?.headcount_required ?? 1,
        status: shift?.status || "open",
        premium: shift?.is_premium ? "Yes" : "No",
      };
    });
  }, [isManager, list, locationById, managerLocationIds, skillById]);

  const buildPayload = (formValues, isUpdate = false) => {
    const startsAtIso = new Date(formValues.starts_at_utc).toISOString();
    const timezone = normalizeTimeZone(selectedTimezone);

    return {
      schedule_id: formValues.schedule_id,
      location_id: formValues.location_id || managerDefaultLocationId,
      required_skill_id: formValues.required_skill_id,
      starts_at_utc: startsAtIso,
      ends_at_utc: new Date(formValues.ends_at_utc).toISOString(),
      location_timezone: timezone,
      headcount_required: Number(formValues.headcount_required),
      is_premium: isSundayNightChaosPremium(startsAtIso, timezone),
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
    const result = await dispatch(createShift(buildPayload(values, false)));
    if (createShift.fulfilled.match(result)) {
      toast.success("Shift created");
      resetForm();
      closeModal();
      dispatch(fetchShifts());
    } else {
      toast.error(result?.payload || "Failed to create shift");
    }
  };

  const openEditModal = (record) => {
    const shift = record.raw;
    setEditingShift(record);
    setErrors({});
    setValues({
      schedule_id: String(getId(shift?.schedule_id) || ""),
      location_id: String(getId(shift?.location_id) || ""),
      required_skill_id: String(getId(shift?.required_skill_id) || ""),
      starts_at_utc: toDateTimeLocal(shift?.starts_at_utc),
      ends_at_utc: toDateTimeLocal(shift?.ends_at_utc),
      headcount_required: String(shift?.headcount_required ?? 1),
      status: shift?.status || "open",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editingShift) return;
    if (!validate(values)) return;

    const result = await dispatch(
      updateShift({
        id: editingShift.key,
        ...buildPayload(values, true),
      }),
    );

    if (updateShift.fulfilled.match(result)) {
      toast.success("Shift updated");
      setEditOpen(false);
      setEditingShift(null);
      resetForm();
      dispatch(fetchShifts());
    } else {
      toast.error(result?.payload || "Failed to update shift");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await dispatch(deleteShift(deleteTarget.key));
    if (deleteShift.fulfilled.match(result)) {
      toast.success("Shift deleted");
      setDeleteTarget(null);
    } else {
      toast.error(result?.payload || "Failed to delete shift");
    }
  };

  const columns = [
    {
      title: colTitle("Location"),
      dataIndex: "location",
      key: "location",
      render: (value, row) => <ColumnData text={value} description={`Schedule: ${row.schedule}`} />,
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
          <Button type="text" className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600" icon={<Pencil size={13} />} onClick={() => openEditModal(row)} />
          <Button danger type="text" className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600" icon={<Trash2 size={13} />} onClick={() => setDeleteTarget(row)} />
        </div>
      ),
    },
  ];

  return (
    <ModuleLayoutsOne
      title="Shifts"
      subtitle="Create and manage location shifts for assignment."
      headerAction={({ openModal }) => (
        <div className="flex items-center gap-2">
          <Button icon={<ClipboardCheck size={14} />} className="h-10 rounded-xl font-bold" onClick={() => navigate("/assignments")}>
            Assign Staff
          </Button>
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
          subtitle="Managers get prefilled locked location and timezone."
          values={values}
          errors={errors}
          loading={saving}
          submitLabel="Create Shift"
          scheduleOptions={scheduleOptions}
          locationOptions={locationOptions}
          skillOptions={skillOptions}
          locationTimezone={selectedTimezone}
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
          subtitle="Modify shift details with locked manager location/timezone."
          values={values}
          errors={errors}
          loading={saving}
          submitLabel="Update Shift"
          scheduleOptions={scheduleOptions}
          locationOptions={locationOptions}
          skillOptions={skillOptions}
          locationTimezone={selectedTimezone}
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
    />
  );
};

export default Shifts;
