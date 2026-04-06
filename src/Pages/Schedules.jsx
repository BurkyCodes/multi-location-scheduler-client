import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "antd";
import { CalendarClock, CheckCircle2, ChevronRight, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import { createSchedule, fetchSchedules } from "../Store/Features/schedulesSlice";
import { fetchLocations } from "../Store/Features/locationsSlice";
import { fetchShifts } from "../Store/Features/shiftsSlice";
import { fetchAssignments } from "../Store/Features/assignmentsSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";
import { hasRole } from "../Utils/roles";

const FONT = { fontFamily: "'Montserrat', sans-serif" };
const FONT_SM = { ...FONT, fontSize: 12 };

const initialValues = {
  location_id: "",
  week_start_date: "",
  status: "draft",
  edit_cutoff_hours: 48,
};

const toDateValue = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
};

const getLocationId = (location) =>
  location?._id || location?.id || location?.value || "";
const getId = (value) => (typeof value === "object" ? value?._id || value?.id || "" : value || "");
const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const StepBadge = ({ active, complete, number, label }) => (
  <div className="flex items-center gap-2">
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold"
      style={{
        background: complete || active ? "#f6873a" : "#f1f5f9",
        color: complete || active ? "#fff" : "#94a3b8",
      }}
    >
      {complete ? <CheckCircle2 size={12} /> : number}
    </div>
    <span style={{ ...FONT_SM, fontWeight: 700, color: active ? "#f6873a" : "#64748b" }}>{label}</span>
  </div>
);

const Schedules = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { list, loading, saving } = useSelector((state) => state.schedules);
  const { list: locations } = useSelector((state) => state.locations);
  const { list: shifts } = useSelector((state) => state.shifts);
  const { list: assignments } = useSelector((state) => state.assignments);
  const currentUser = useSelector((state) => state.auth.user);

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const deepLinkHandled = useRef(false);

  const roleLabel =
    currentUser?.role_id?.role ||
    (Array.isArray(currentUser?.status) && currentUser.status.length ? currentUser.status[0] : "") ||
    "";
  const isManager = String(roleLabel).toLowerCase().includes("manager");
  const canCreateSchedule = hasRole(currentUser, ["manager"]);

  const userLocationIds = useMemo(() => {
    const raw = currentUser?.location_ids || currentUser?.locations || [];
    return raw
      .map((location) => (typeof location === "object" ? getLocationId(location) : location))
      .filter(Boolean)
      .map((id) => String(id));
  }, [currentUser]);

  const allowedLocations = useMemo(() => {
    if (!isManager) return locations;
    if (!userLocationIds.length) return [];
    const allowed = new Set(userLocationIds);
    return locations.filter((location) => allowed.has(String(getLocationId(location))));
  }, [isManager, locations, userLocationIds]);

  const lockedManagerLocationId =
    isManager && allowedLocations.length ? String(getLocationId(allowedLocations[0])) : "";
  const effectiveLocationId = isManager ? lockedManagerLocationId : values.location_id;

  useEffect(() => {
    dispatch(fetchSchedules());
    dispatch(fetchLocations());
    dispatch(fetchShifts());
    dispatch(fetchAssignments());
  }, [dispatch]);

  const onValueChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateStep = (targetStep) => {
    const nextErrors = {};
    if (targetStep === 0) {
      if (!effectiveLocationId) nextErrors.location_id = "Location is required";
      if (!values.week_start_date) nextErrors.week_start_date = "Week start date is required";
    }
    if (targetStep === 1) {
      const cutoff = Number(values.edit_cutoff_hours);
      if (Number.isNaN(cutoff) || cutoff < 0) nextErrors.edit_cutoff_hours = "Cutoff hours must be 0 or greater";
      if (!["draft", "published", "unpublished"].includes(values.status)) {
        nextErrors.status = "Select a valid status";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const scheduleInsights = useMemo(() => {
    const byScheduleId = new Map();

    (shifts || []).forEach((shift) => {
      const scheduleId = String(getId(shift?.schedule_id));
      if (!scheduleId) return;
      const current = byScheduleId.get(scheduleId) || { shiftCount: 0, staff: new Map() };
      current.shiftCount += 1;
      byScheduleId.set(scheduleId, current);
    });

    (assignments || []).forEach((assignment) => {
      const shift = assignment?.shift_id || {};
      const scheduleId = String(getId(shift?.schedule_id) || getId(assignment?.schedule_id));
      if (!scheduleId) return;

      const current = byScheduleId.get(scheduleId) || { shiftCount: 0, staff: new Map() };
      const user = assignment?.user_id || {};
      const userId = String(getId(user) || getId(assignment?.user_id));
      const userLabel = user?.name || user?.email || user?.phone_number || "Staff member";
      if (userId) current.staff.set(userId, userLabel);
      byScheduleId.set(scheduleId, current);
    });

    return byScheduleId;
  }, [assignments, shifts]);

  const rows = useMemo(() => {
    const filtered = !isManager
      ? list
      : list.filter((item) => {
          const locationFromRecord = item?.location_id;
          const locationId =
            typeof locationFromRecord === "object" ? getLocationId(locationFromRecord) : locationFromRecord;
          return userLocationIds.includes(String(locationId));
        });

    return filtered.map((item) => {
        const scheduleId = String(getId(item));
        const locationFromRecord = item?.location_id;
        const locationId =
          typeof locationFromRecord === "object" ? getLocationId(locationFromRecord) : locationFromRecord;
        const locationName =
          typeof locationFromRecord === "object"
            ? locationFromRecord?.name || "Unknown Location"
            : locations.find((loc) => `${getLocationId(loc)}` === `${locationId}`)?.name || "Unknown Location";

        const insight = scheduleInsights.get(scheduleId) || { shiftCount: 0, staff: new Map() };
        const staffList = Array.from(insight.staff.values());

        return {
          key: scheduleId,
          location: locationName,
          week_start_date: item?.week_start_date,
          edit_cutoff_hours: item?.edit_cutoff_hours ?? 48,
          status: item?.status || "draft",
          shift_count: insight.shiftCount,
          staff_count: staffList.length,
          staff_preview: staffList.slice(0, 3).join(", "),
          staff_names: staffList,
          created_at: item?.createdAt || item?.created_at,
          published_at: item?.published_at,
          published_by:
            item?.published_by?.name ||
            item?.published_by?.email ||
            item?.published_by?.phone_number ||
            "",
        };
      });
  }, [isManager, list, locations, scheduleInsights, userLocationIds]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedScheduleId = String(location.state?.scheduleId || params.get("scheduleId") || "");
    const openDrawerRequested =
      Boolean(location.state?.openDrawer) ||
      params.get("openDrawer") === "1" ||
      params.get("drawer") === "schedule";

    if (deepLinkHandled.current || !requestedScheduleId || !openDrawerRequested || !rows.length) return;

    const match = rows.find((row) => String(row.key) === requestedScheduleId);
    if (!match) return;

    queueMicrotask(() => {
      setSelectedSchedule(match);
      setDetailsOpen(true);
    });
    deepLinkHandled.current = true;

    if (location.state?.openDrawer || location.state?.scheduleId) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
  }, [location.pathname, location.search, location.state, navigate, rows]);

  const handleSubmit = async (closeModal) => {
    if (step !== 1) return;
    if (!validateStep(0) || !validateStep(1)) return;

    const payload = {
      location_id: effectiveLocationId,
      week_start_date: new Date(values.week_start_date).toISOString(),
      status: values.status,
      edit_cutoff_hours: Number(values.edit_cutoff_hours),
    };

    const result = await dispatch(createSchedule(payload));
    if (createSchedule.fulfilled.match(result)) {
      toast.success("Schedule created");
      setValues(initialValues);
      setStep(0);
      closeModal();
      dispatch(fetchSchedules());
    } else {
      toast.error(result?.payload || "Failed to create schedule");
    }
  };

  const columns = [
    {
      title: colTitle("Location"),
      dataIndex: "location",
      key: "location",
      render: (location) => <ColumnData text={location} />,
    },
    {
      title: colTitle("Week Start"),
      dataIndex: "week_start_date",
      key: "week_start_date",
      render: (value) => <ColumnData text={toDateValue(value)} />,
    },
    {
      title: colTitle("Edit Cutoff"),
      dataIndex: "edit_cutoff_hours",
      key: "edit_cutoff_hours",
      render: (value) => <ColumnData text={`${value} hours`} />,
    },
    {
      title: colTitle("Status"),
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: colTitle("Staff"),
      dataIndex: "staff_count",
      key: "staff_count",
      render: (value, row) => (
        <ColumnData
          text={`${value || 0} staff`}
          description={row?.staff_preview || "No staff assigned"}
        />
      ),
    },
  ];

  return (
    <ModuleLayoutsOne
      title="Schedule Builder"
      subtitle="Create schedules by location and week start date."
      headerAction={({ openModal }) =>
        canCreateSchedule ? (
          <Button type="primary" icon={<Plus size={14} />} className="h-10 rounded-xl font-bold" onClick={openModal}>
            Create Schedule
          </Button>
        ) : null
      }
      tableTitle="Schedules"
      totalRecords={rows.length}
      tableProps={{
        columns,
        dataSource: rows,
        loading,
        style: FONT,
        rowClassName: () => "transition-colors cursor-pointer",
        scroll: { x: 1100, y: 520 },
        onRow: (record) => ({
          onClick: () => {
            setSelectedSchedule(record);
            setDetailsOpen(true);
          },
        }),
      }}
      modalTitle="Create Schedule"
      modalSubtitle="2-step form with required schedule fields."
      modalIcon={<CalendarClock size={20} />}
      modalContent={({ closeModal }) => (
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <StepBadge number={1} label="Base Details" active={step === 0} complete={step > 0} />
            <ChevronRight size={14} color="#cbd5e1" />
            <StepBadge number={2} label="Policy" active={step === 1} complete={false} />
          </div>

          <div className="flex-1 overflow-auto p-6">
            {step === 0 ? (
              <div className="space-y-4">
                <div>
                  <label style={{ ...FONT_SM, fontWeight: 700, color: "#374151" }}>
                    Location<span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>
                  </label>
                  <select
                    value={effectiveLocationId}
                    onChange={(event) => onValueChange("location_id", event.target.value)}
                    disabled={isManager}
                    className="w-full h-10 mt-1 rounded-lg border border-slate-200 px-3 text-sm"
                  >
                    {!isManager ? <option value="">Select location</option> : null}
                    {allowedLocations.map((location) => (
                      <option key={getLocationId(location)} value={getLocationId(location)}>
                        {location?.name || "Unnamed Location"}
                      </option>
                    ))}
                  </select>
                  {isManager ? <p className="text-xs text-slate-400 mt-1">Location is assigned to your manager account.</p> : null}
                  {errors.location_id ? <p className="text-xs text-rose-500 mt-1">{errors.location_id}</p> : null}
                </div>

                <div>
                  <label style={{ ...FONT_SM, fontWeight: 700, color: "#374151" }}>
                    Week Start Date<span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={values.week_start_date}
                    onChange={(event) => onValueChange("week_start_date", event.target.value)}
                    className="w-full h-10 mt-1 rounded-lg border border-slate-200 px-3 text-sm"
                  />
                  {errors.week_start_date ? <p className="text-xs text-rose-500 mt-1">{errors.week_start_date}</p> : null}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label style={{ ...FONT_SM, fontWeight: 700, color: "#374151" }}>Status</label>
                  <select
                    value={values.status}
                    onChange={(event) => onValueChange("status", event.target.value)}
                    className="w-full h-10 mt-1 rounded-lg border border-slate-200 px-3 text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                  {errors.status ? <p className="text-xs text-rose-500 mt-1">{errors.status}</p> : null}
                </div>

                <div>
                  <label style={{ ...FONT_SM, fontWeight: 700, color: "#374151" }}>Edit Cutoff Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={values.edit_cutoff_hours}
                    onChange={(event) => onValueChange("edit_cutoff_hours", event.target.value)}
                    className="w-full h-10 mt-1 rounded-lg border border-slate-200 px-3 text-sm"
                  />
                  {errors.edit_cutoff_hours ? (
                    <p className="text-xs text-rose-500 mt-1">{errors.edit_cutoff_hours}</p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Default is 48 hours</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 flex items-center justify-between">
            <Button htmlType="button" onClick={() => (step === 0 ? closeModal() : setStep(0))}>
              Back
            </Button>
            {step === 0 ? (
              <Button
                type="primary"
                htmlType="button"
                onClick={() => {
                  if (validateStep(0)) setStep(1);
                }}
              >
                Next
              </Button>
            ) : (
              <Button type="primary" loading={saving} onClick={() => handleSubmit(closeModal)}>
                Create Schedule
              </Button>
            )}
          </div>
        </div>
      )}
      secondaryModalOpen={detailsOpen}
      onSecondaryModalClose={() => {
        setDetailsOpen(false);
        setSelectedSchedule(null);
      }}
      secondaryModalTitle="Schedule Details"
      secondaryModalSubtitle="Read-only schedule breakdown by location and staff."
      secondaryModalContent={
        selectedSchedule ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Location</p>
              <p className="font-semibold text-slate-800">{selectedSchedule.location || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Week Start</p>
              <p className="font-semibold text-slate-800">{toDateValue(selectedSchedule.week_start_date)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
              <StatusBadge status={selectedSchedule.status} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Shifts in Schedule</p>
              <p className="font-semibold text-slate-800">{selectedSchedule.shift_count || 0}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Assigned Staff</p>
              <p className="font-semibold text-slate-800">{selectedSchedule.staff_count || 0}</p>
              {selectedSchedule.staff_names?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSchedule.staff_names.map((name, index) => (
                    <span
                      key={`${name}-${index}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-1">No staff assigned yet.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Edit Cutoff</p>
              <p className="font-semibold text-slate-800">{selectedSchedule.edit_cutoff_hours} hours</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Published By</p>
              <p className="font-semibold text-slate-800">{selectedSchedule.published_by || "Not published yet"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Created</p>
              <p className="font-semibold text-slate-800">{formatDateTime(selectedSchedule.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Published At</p>
              <p className="font-semibold text-slate-800">{formatDateTime(selectedSchedule.published_at)}</p>
            </div>
          </div>
        ) : null
      }
    />
  );
};

export default Schedules;
