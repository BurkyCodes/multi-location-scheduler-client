import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "antd";
import { CalendarClock, CheckCircle2, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import { createSchedule, fetchSchedules } from "../Store/Features/schedulesSlice";
import { fetchLocations } from "../Store/Features/locationsSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";
import { hasRole } from "../utils/roles";

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
  const { list, loading, saving } = useSelector((state) => state.schedules);
  const { list: locations } = useSelector((state) => state.locations);
  const currentUser = useSelector((state) => state.auth.user);

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);

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
        const locationFromRecord = item?.location_id;
        const locationId =
          typeof locationFromRecord === "object" ? getLocationId(locationFromRecord) : locationFromRecord;
        const locationName =
          typeof locationFromRecord === "object"
            ? locationFromRecord?.name || "Unknown Location"
            : locations.find((loc) => `${getLocationId(loc)}` === `${locationId}`)?.name || "Unknown Location";

        return {
          key: item?._id || item?.id,
          location: locationName,
          week_start_date: item?.week_start_date,
          edit_cutoff_hours: item?.edit_cutoff_hours ?? 48,
          status: item?.status || "draft",
        };
      });
  }, [isManager, list, locations, userLocationIds]);

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
    />
  );
};

export default Schedules;
