import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Select } from "antd";
import { toast } from "sonner";
import { ClipboardCheck, Plus, Trash2, Pencil } from "lucide-react";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import {
  createAssignment,
  deleteAssignment,
  fetchAssignments,
  updateAssignment,
} from "../Store/Features/assignmentsSlice";
import { fetchShifts } from "../Store/Features/shiftsSlice";
import { fetchStaff } from "../Store/Features/staffSlice";
import { fetchLocations } from "../Store/Features/locationsSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";
import { hasRole } from "../utils/roles";

const getId = (value) => (typeof value === "object" ? value?._id || value?.id : value);
const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
};

const StaffAssignments = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const assignments = useSelector((state) => state.assignments.list);
  const loading = useSelector((state) => state.assignments.loading);
  const saving = useSelector((state) => state.assignments.saving);
  const shifts = useSelector((state) => state.shifts.list);
  const staff = useSelector((state) => state.staff.list);
  const locations = useSelector((state) => state.locations.list);

  const isManager = hasRole(currentUser, ["manager"]);

  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [editingAssignment, setEditingAssignment] = useState(null);

  const managerLocationIds = useMemo(() => {
    const raw = currentUser?.location_ids || [];
    return raw.map((location) => String(getId(location))).filter(Boolean);
  }, [currentUser]);

  const managerLocations = useMemo(() => {
    if (!isManager) return locations;
    const allowed = new Set(managerLocationIds);
    return locations.filter((location) => allowed.has(String(getId(location))));
  }, [isManager, locations, managerLocationIds]);

  const managerTimezone = managerLocations[0]?.timezone || managerLocations[0]?.location_timezone || "Africa/Nairobi";

  const allowedShiftOptions = useMemo(() => {
    const filtered = shifts.filter((shift) => {
      const shiftLocationId = String(getId(shift?.location_id));
      const shiftTimezone = shift?.location_timezone || shift?.timezone;

      if (!isManager) return true;
      return managerLocationIds.includes(shiftLocationId) && shiftTimezone === managerTimezone;
    });

    return filtered.map((shift) => ({
      label: `${shift?.title || shift?.name || "Shift"} (${formatDate(shift?.starts_at_utc)})`,
      value: String(getId(shift)),
    }));
  }, [isManager, managerLocationIds, managerTimezone, shifts]);

  const allowedStaffOptions = useMemo(() => {
    const filtered = staff.filter((member) => {
      if (!isManager) return true;
      const staffLocationIds = (member?.location_ids || []).map((locationId) => String(getId(locationId)));
      return staffLocationIds.some((id) => managerLocationIds.includes(id));
    });

    return filtered.map((member) => ({
      label: member?.name || member?.email || "Unnamed",
      value: String(getId(member)),
    }));
  }, [isManager, managerLocationIds, staff]);

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
        period: `${formatDate(shift?.starts_at_utc)} - ${formatDate(shift?.ends_at_utc)}`,
        location: shiftLocation?.name || "Unknown Location",
        timezone: shift?.location_timezone || "N/A",
        status: assignment?.status || "assigned",
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

  const resetForm = () => {
    setSelectedShiftId("");
    setSelectedStaffId("");
    setEditingAssignment(null);
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

    const result = editingAssignment
      ? await dispatch(updateAssignment({ id: editingAssignment, ...payload }))
      : await dispatch(createAssignment(payload));

    if (
      createAssignment.fulfilled.match(result) ||
      updateAssignment.fulfilled.match(result)
    ) {
      toast.success(editingAssignment ? "Assignment updated" : "Assignment created");
      resetForm();
      closeModal();
      dispatch(fetchAssignments());
    } else {
      toast.error(result?.payload || "Failed to save assignment");
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
      title: colTitle("Status"),
      dataIndex: "status",
      key: "status",
      render: (value) => <StatusBadge status={value} />,
    },
    {
      title: colTitle("Action"),
      key: "action",
      render: (_, row) =>
        isManager ? (
          <div className="flex items-center gap-2">
            <Button
              type="text"
              className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600"
              icon={<Pencil size={13} />}
              onClick={() => {
                setEditingAssignment(row.key);
                setSelectedShiftId(String(getId(row.raw?.shift_id)));
                setSelectedStaffId(String(getId(row.raw?.user_id)));
              }}
            />
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
    <ModuleLayoutsOne
      title="Staff Assignments"
      subtitle={
        isManager
          ? `Assign staff for shifts in ${managerTimezone}.`
          : "Review manager-created staff assignments."
      }
      headerAction={({ openModal }) =>
        isManager ? (
          <Button type="primary" icon={<Plus size={14} />} className="h-10 rounded-xl font-bold" onClick={openModal}>
            Assign Staff
          </Button>
        ) : null
      }
      tableTitle="Assignment Tracker"
      totalRecords={assignmentRows.length}
      tableHeaderBadges={
        isManager ? [{ text: `Timezone: ${managerTimezone}` }] : [{ text: "Read-only mode" }]
      }
      tableProps={{
        columns,
        dataSource: assignmentRows,
        loading,
        rowClassName: () => "transition-colors cursor-pointer",
        scroll: { x: 1100, y: 520 },
      }}
      modalTitle={editingAssignment ? "Edit Assignment" : "Assign Staff to Shift"}
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
          </div>
          <div className="mt-auto flex items-center justify-between">
            <Button htmlType="button" onClick={() => { resetForm(); closeModal(); }}>
              Cancel
            </Button>
            <Button type="primary" loading={saving} onClick={() => saveAssignment(closeModal)}>
              {editingAssignment ? "Update Assignment" : "Create Assignment"}
            </Button>
          </div>
        </div>
      )}
    />
  );
};

export default StaffAssignments;
