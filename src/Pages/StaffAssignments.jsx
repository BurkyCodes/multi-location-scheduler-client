import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Select } from "antd";
import { toast } from "sonner";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import {
  createAssignment,
  deleteAssignment,
  fetchAssignments,
  fetchCoverageRecommendations,
} from "../Store/Features/assignmentsSlice";
import { fetchShifts } from "../Store/Features/shiftsSlice";
import { fetchStaff } from "../Store/Features/staffSlice";
import { fetchLocations } from "../Store/Features/locationsSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";
import { hasRole } from "../Utils/roles";
import ConstraintViolationsModal from "../SharedComponents/Modals/ConstraintViolationsModal";

const getId = (value) => (typeof value === "object" ? value?._id || value?.id : value);
const TIMEZONE_LABELS = {
  EAT: "EAT (UTC+3)",
  PST: "PST (UTC-8 / -7 DST)",
};
const TIMEZONE_TO_IANA = {
  EAT: "Africa/Nairobi",
  PST: "America/Los_Angeles",
};
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
const normalizeTimezone = (value) =>
  TIMEZONE_LABELS[normalizeTimezoneCode(value)] || TIMEZONE_LABELS.EAT;
const formatDate = (value, timezoneCode = "EAT") => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  const timeZone = TIMEZONE_TO_IANA[normalizeTimezoneCode(timezoneCode)] || TIMEZONE_TO_IANA.EAT;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};
const formatShiftOptionLabel = (shift) => {
  const timezoneCode = normalizeTimezoneCode(shift?.location_timezone || shift?.timezone);
  const startLabel = formatDate(shift?.starts_at_utc, timezoneCode);
  const endLabel = formatDate(shift?.ends_at_utc, timezoneCode);
  const shiftName = shift?.title || shift?.name || "Shift";
  return `${shiftName} (${startLabel} - ${endLabel}) ${timezoneCode}`;
};

const StaffAssignments = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const assignments = useSelector((state) => state.assignments.list);
  const loading = useSelector((state) => state.assignments.loading);
  const saving = useSelector((state) => state.assignments.saving);
  const recommendations = useSelector((state) => state.assignments.recommendations);
  const recommendationsShiftId = useSelector(
    (state) => state.assignments.recommendationsShiftId,
  );
  const recommendationsLoading = useSelector(
    (state) => state.assignments.recommendationsLoading,
  );
  const shifts = useSelector((state) => state.shifts.list);
  const staff = useSelector((state) => state.staff.list);
  const locations = useSelector((state) => state.locations.list);

  const canManageAssignments = hasRole(currentUser, ["manager"]);
  const isManager = hasRole(currentUser, ["manager"]);

  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [constraintModal, setConstraintModal] = useState({
    open: false,
    title: "Assignment constraint violation",
    subtitle: "This assignment could not be saved because one or more rules failed.",
    violations: [],
    suggestions: [],
  });

  const managerLocationIds = useMemo(() => {
    const raw = currentUser?.location_ids || [];
    return raw.map((location) => String(getId(location))).filter(Boolean);
  }, [currentUser]);

  const managerLocations = useMemo(() => {
    if (!isManager) return locations;
    const allowed = new Set(managerLocationIds);
    return locations.filter((location) => allowed.has(String(getId(location))));
  }, [isManager, locations, managerLocationIds]);

  const managerTimezone = normalizeTimezone(
    managerLocations[0]?.timezone || managerLocations[0]?.location_timezone || "Africa/Nairobi",
  );

  const allowedShiftOptions = useMemo(() => {
    const filtered = shifts.filter((shift) => {
      const shiftLocationId = String(getId(shift?.location_id));

      if (!isManager) return true;
      return managerLocationIds.includes(shiftLocationId);
    });

    return filtered.map((shift) => ({
      label: formatShiftOptionLabel(shift),
      value: String(getId(shift)),
    }));
  }, [isManager, managerLocationIds, shifts]);

  const allowedStaffOptions = useMemo(() => {
    const filtered = staff.filter((member) => {
      if (!isManager) return true;
      const staffLocationIds = (member?.location_ids || []).map((locationId) => String(getId(locationId)));
      return staffLocationIds.some((id) => managerLocationIds.includes(id));
    });

    const recommendationSet = new Set(
      (recommendations || []).map((item) => String(getId(item?.user_id))).filter(Boolean),
    );

    const optionRows = filtered.map((member) => {
      const value = String(getId(member));
      const isRecommended = recommendationSet.has(value);
      return {
        label: `${member?.name || member?.email || "Unnamed"}${isRecommended ? " (Recommended)" : ""}`,
        value,
        isRecommended,
      };
    });

    return optionRows.sort((a, b) => Number(b.isRecommended) - Number(a.isRecommended));
  }, [isManager, managerLocationIds, recommendations, staff]);

  const assignmentRows = useMemo(() => {
    const filtered = assignments.filter((assignment) => {
      if (!isManager) return true;
      const shiftLocationId = String(getId(assignment?.shift_id?.location_id));
      return managerLocationIds.includes(shiftLocationId);
    });

    return filtered.map((assignment) => {
      const shift = assignment?.shift_id || {};
      const assignedUser = assignment?.user_id || {};
      const shiftLocation = shift?.location_id || {};

      return {
        key: String(getId(assignment)),
        staff: assignedUser?.name || assignedUser?.email || "Unassigned",
        shift: shift?.title || shift?.name || shift?._id || "N/A",
        period: `${formatDate(
          shift?.starts_at_utc,
          shift?.location_timezone || shift?.timezone,
        )} - ${formatDate(
          shift?.ends_at_utc,
          shift?.location_timezone || shift?.timezone,
        )}`,
        location: shiftLocation?.name || "Unknown Location",
        timezone: normalizeTimezone(shift?.location_timezone || shift?.timezone),
        status: assignment?.status || "assigned",
        assignedBy:
          assignment?.assigned_by?.name ||
          assignment?.assigned_by?.email ||
          "System",
        raw: assignment,
      };
    });
  }, [assignments, isManager, managerLocationIds]);

  useEffect(() => {
    dispatch(fetchAssignments());
    dispatch(fetchShifts());
    dispatch(fetchStaff());
    dispatch(fetchLocations());
  }, [dispatch]);

  useEffect(() => {
    if (!canManageAssignments || !selectedShiftId) return;
    dispatch(fetchCoverageRecommendations({ shiftId: selectedShiftId, limit: 8 }));
  }, [canManageAssignments, dispatch, selectedShiftId]);

  const resetForm = () => {
    setSelectedShiftId("");
    setSelectedStaffId("");
  };

  const saveAssignment = async (closeModal) => {
    if (!selectedShiftId || !selectedStaffId) {
      toast.error("Select both shift and staff member");
      return;
    }

    const payload = {
      shift_id: selectedShiftId,
      user_id: selectedStaffId,
      status: "assigned",
      ...(currentUser?._id ? { assigned_by: currentUser._id } : {}),
    };

    const result = await dispatch(createAssignment(payload));

    if (createAssignment.fulfilled.match(result)) {
      toast.success("Assignment created");
      resetForm();
      closeModal();
      dispatch(fetchAssignments());
    } else {
      const payload = result?.payload;
      const title =
        (payload && typeof payload === "object" && payload.message) ||
        (typeof payload === "string" ? payload : "Failed to save assignment");
      const violations = Array.isArray(payload?.violations) ? payload.violations : [];
      const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
      const recommendations = Array.isArray(payload?.recommendations)
        ? payload.recommendations
        : suggestions;

      if (violations.length) {
        setConstraintModal({
          open: true,
          title,
          subtitle: "Review the failed rules below and adjust shift or staff selection.",
          violations,
          suggestions: recommendations,
        });
      } else {
        toast.error(title);
      }
    }
  };

  const handleDelete = async (id) => {
    const result = await dispatch(deleteAssignment(id));
    if (deleteAssignment.fulfilled.match(result)) {
      toast.success("Assignment deleted");
    } else {
      toast.error(result?.payload || "Failed to delete assignment");
    }
  };

  const columns = [
    {
      title: colTitle("Staff"),
      dataIndex: "staff",
      key: "staff",
      render: (value, row) => <ColumnData text={value} description={row.location} />,
    },
    {
      title: colTitle("Shift"),
      dataIndex: "shift",
      key: "shift",
      render: (value, row) => <ColumnData text={value} description={row.period} />,
    },
    {
      title: colTitle("Timezone"),
      dataIndex: "timezone",
      key: "timezone",
      render: (value) => <ColumnData text={value} />,
    },
    {
      title: colTitle("Assigned By"),
      dataIndex: "assignedBy",
      key: "assignedBy",
      render: (value) => <ColumnData text={value} />,
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
      render: (_, row) =>
        canManageAssignments ? (
          <div className="flex items-center gap-2">
            <Button
              danger
              type="text"
              className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600"
              icon={<Trash2 size={13} />}
              onClick={() => handleDelete(row.key)}
            />
          </div>
        ) : (
          <span className="text-xs text-slate-400">View only</span>
        ),
    },
  ];

  return (
    <>
      <ModuleLayoutsOne
        title="Staff Assignments"
        subtitle={
          isManager
            ? `Assign staff for shifts in ${managerTimezone}.`
            : "Review manager-created staff assignments."
        }
        headerAction={({ openModal }) =>
          canManageAssignments ? (
            <Button type="primary" icon={<Plus size={14} />} className="h-10 rounded-xl font-bold" onClick={openModal}>
              Assign Staff
            </Button>
          ) : null
        }
        tableTitle="Assignment Tracker"
        totalRecords={assignmentRows.length}
        tableHeaderBadges={
          canManageAssignments ? [{ text: `Timezone: ${managerTimezone}` }] : [{ text: "Read-only mode" }]
        }
        tableProps={{
          columns,
          dataSource: assignmentRows,
          loading,
          rowClassName: () => "transition-colors cursor-pointer",
          scroll: { x: 1200, y: 520 },
        }}
        modalTitle="Assign Staff to Shift"
        modalSubtitle="Manager-only action. Select a shift and a staff member."
        modalIcon={<ClipboardCheck size={20} />}
        modalContent={({ closeModal }) => (
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
            </div>
            <div className="mt-auto flex items-center justify-between">
              <Button htmlType="button" onClick={() => { resetForm(); closeModal(); }}>
                Cancel
              </Button>
              <Button type="primary" loading={saving} onClick={() => saveAssignment(closeModal)}>
                Create Assignment
              </Button>
            </div>
          </div>
        )}
      />

      <ConstraintViolationsModal
        visible={constraintModal.open}
        title={constraintModal.title}
        subtitle={constraintModal.subtitle}
        violations={constraintModal.violations}
        suggestions={constraintModal.suggestions}
        onClose={() =>
          setConstraintModal((prev) => ({
            ...prev,
            open: false,
          }))
        }
      />
    </>
  );
};

export default StaffAssignments;
