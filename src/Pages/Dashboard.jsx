import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Table } from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  LineChartOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import { fetchShifts } from "../Store/Features/shiftsSlice";
import { fetchStaff } from "../Store/Features/staffSlice";
import { fetchLocations } from "../Store/Features/locationsSlice";
import { fetchAssignments } from "../Store/Features/assignmentsSlice";
import { fetchAuditLogs } from "../Store/Features/auditLogsSlice";
import { fetchAvailabilityByUser } from "../Store/Features/availabilitySlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";
import StatCard from "../SharedComponents/StatCard";
import ActionAuditTable from "../SharedComponents/ActionAuditTable";
import { hasRole } from "../utils/roles";
import ListView from "../SharedComponents/Calendar/ListView";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const getShiftStatus = (record) => {
  if (record?.status === "cancelled") return "alert";
  if (record?.status === "filled" || record?.assignmentStatus === "assigned") {
    return "published";
  }
  return "pending";
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const isStaffUser = hasRole(currentUser, ["staff"]) && !hasRole(currentUser, ["admin", "manager"]);
  const currentUserId = currentUser?._id || currentUser?.id;

  const { list: shifts, loading: shiftsLoading } = useSelector((state) => state.shifts);
  const { list: staff } = useSelector((state) => state.staff);
  const { list: locations } = useSelector((state) => state.locations);
  const { list: assignments, loading: assignmentsLoading } = useSelector(
    (state) => state.assignments,
  );
  const { list: auditLogs } = useSelector((state) => state.auditLogs);
  const userAvailability = useSelector((state) => state.availability.byUser[currentUserId]);

  useEffect(() => {
    dispatch(fetchShifts());
    dispatch(fetchLocations());
    dispatch(fetchAssignments());
    if (!isStaffUser) {
      dispatch(fetchStaff());
      dispatch(fetchAuditLogs({ limit: 10 }));
    }
    if (currentUserId) dispatch(fetchAvailabilityByUser(currentUserId));
  }, [dispatch, isStaffUser, currentUserId]);

  const rows = useMemo(() => {
    if (assignments.length) {
      return assignments.map((assignment) => {
        const shift = assignment.shift_id || {};
        const user = assignment.user_id || {};
        const location = shift.location_id || {};
        const locationName =
          location.name ||
          locations.find((loc) => loc._id === shift.location_id)?.name ||
          "Unknown Location";
        return {
          key: assignment._id,
          shiftId: shift._id || assignment.shift_id,
          details: {
            location: locationName,
            skill:
              shift.required_skill_id?.name ||
              shift.required_skill_id?.code ||
              "General Staff",
          },
          staff: user.name || user.email || "Unassigned",
          time: {
            range: `${formatDateTime(shift.starts_at_utc)} - ${formatDateTime(shift.ends_at_utc)}`,
            timezone: shift.location_timezone || "N/A",
          },
          status: getShiftStatus({
            status: shift.status,
            assignmentStatus: assignment.status,
          }),
        };
      });
    }

    return shifts.map((shift) => {
      const assignedUser = staff.find((member) =>
        Array.isArray(member?.location_ids) &&
        member.location_ids.some((id) => `${id}` === `${shift.location_id?._id || shift.location_id}`),
      );

      return {
        key: shift._id,
        shiftId: shift._id,
        details: {
          location: shift.location_id?.name || "Unknown Location",
          skill: shift.required_skill_id?.name || shift.required_skill_id?.code || "General Staff",
        },
        staff: assignedUser?.name || "Open Shift",
        time: {
          range: `${formatDateTime(shift.starts_at_utc)} - ${formatDateTime(shift.ends_at_utc)}`,
          timezone: shift.location_timezone || "N/A",
        },
        status: getShiftStatus({ status: shift.status }),
      };
    });
  }, [assignments, shifts, staff, locations]);

  const staffRows = useMemo(() => {
    const mine = assignments.filter((assignment) => {
      const assignmentUserId = assignment?.user_id?._id || assignment?.user_id?.id || assignment?.user_id;
      return String(assignmentUserId) === String(currentUserId);
    });

    return mine.map((assignment) => {
      const shift = assignment.shift_id || {};
      const location = shift.location_id || {};
      const locationName =
        location.name || locations.find((loc) => `${loc._id}` === `${shift.location_id}`)?.name || "Unknown Location";

      return {
        key: assignment._id,
        shiftId: shift._id || assignment.shift_id,
        details: {
          location: locationName,
          skill: shift.required_skill_id?.name || shift.required_skill_id?.code || "General Staff",
        },
        time: {
          range: `${formatDateTime(shift.starts_at_utc)} - ${formatDateTime(shift.ends_at_utc)}`,
          timezone: shift.location_timezone || "N/A",
        },
        status: getShiftStatus({
          status: shift.status,
          assignmentStatus: assignment.status,
        }),
      };
    });
  }, [assignments, currentUserId, locations]);

  const statCards = useMemo(() => {
    const activeShifts = shifts.filter((item) => item.status === "open").length;
    const filledShifts = shifts.filter((item) => item.status === "filled").length;
    const fairnessScore = shifts.length
      ? Math.round((filledShifts / shifts.length) * 100)
      : 0;

    return [
      {
        key: "staff",
        label: "Total Staff",
        value: `${staff.length}`,
        Icon: TeamOutlined,
        iconBg: "bg-blue-50",
        iconText: "text-blue-600 text-base",
        labelText: "text-slate-600",
        text: "text-slate-900",
      },
      {
        key: "active-shifts",
        label: "Active Shifts",
        value: `${activeShifts}`,
        Icon: CalendarOutlined,
        iconBg: "bg-emerald-50",
        iconText: "text-emerald-600 text-base",
        labelText: "text-emerald-700",
        text: "text-slate-900",
      },
      {
        key: "open-tasks",
        label: "Open Tasks",
        value: `${Math.max(0, activeShifts - filledShifts)}`,
        Icon: ClockCircleOutlined,
        iconBg: "bg-amber-50",
        iconText: "text-amber-600 text-base",
        labelText: "text-amber-700",
        text: "text-slate-900",
      },
      {
        key: "coverage",
        label: "Coverage",
        value: `${fairnessScore}%`,
        Icon: LineChartOutlined,
        iconBg: "bg-indigo-50",
        iconText: "text-indigo-600 text-base",
        labelText: "text-indigo-700",
        text: fairnessScore >= 70 ? "text-indigo-700" : "text-rose-600",
      },
      {
        key: "locations",
        label: "Locations",
        value: `${locations.length}`,
        Icon: EnvironmentOutlined,
        iconBg: "bg-fuchsia-50",
        iconText: "text-fuchsia-700 text-base ",
        labelText: "text-fuchsia-700",
        text: "text-slate-900",
      },
    ];
  }, [staff.length, shifts, locations.length]);

  const columns = [
    {
      title: colTitle("Task Location"),
      dataIndex: "details",
      key: "details",
      render: (details) => (
        <ColumnData text={details.location} description={details.skill} />
      ),
    },
    {
      title: colTitle("Assigned Staff"),
      dataIndex: "staff",
      key: "staff",
      render: (staffName) => (
        <ColumnData
          icon={<UserOutlined className="text-slate-500 text-[10px]" />}
          text={staffName}
        />
      ),
    },
    {
      title: colTitle("Schedule"),
      dataIndex: "time",
      key: "time",
      render: (time) => (
        <ColumnData
          text={time.range}
          description={time.timezone}
          icon={<ClockCircleOutlined className="text-slate-500 text-[10px]" />}
        />
      ),
    },
    {
      title: colTitle("Status"),
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: colTitle("Action"),
      key: "action",
      render: (_, record) => (
        <Button
          type="text"
          className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
          icon={<EyeOutlined style={{ fontSize: 12 }} />}
          aria-label={`View shift ${record.shiftId?.slice?.(-6) || ""}`}
        />
      ),
    },
  ];

  const headerAction = () => (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-100">
      <EnvironmentOutlined className="text-gray-400" />
      <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
        Operations Hub
      </span>
    </div>
  );

  const statsWithActions = useMemo(
    () => (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {statCards.map((item, index) => (
            <StatCard key={item?.key || index} {...item} />
          ))}
        </div>
        <div className="xl:col-span-1">
          <ActionAuditTable items={auditLogs.slice(0, 8)} />
        </div>
      </div>
    ),
    [statCards, auditLogs],
  );

  const availabilitySummary = useMemo(() => {
    const windows = userAvailability?.recurring_windows || [];
    if (!windows.length) return "No availability profile configured";
    const time = `${windows[0]?.start_time_local || "--:--"} - ${windows[0]?.end_time_local || "--:--"}`;
    const timezone = windows[0]?.timezone || "N/A";
    return `${windows.length} recurring window(s), ${time} (${timezone})`;
  }, [userAvailability]);

  const staffColumns = [
    {
      title: colTitle("Assigned Location"),
      dataIndex: "details",
      key: "details",
      render: (details) => <ColumnData text={details.location} description={details.skill} />,
    },
    {
      title: colTitle("Shift Schedule"),
      dataIndex: "time",
      key: "time",
      render: (time) => (
        <ColumnData
          text={time.range}
          description={time.timezone}
          icon={<ClockCircleOutlined className="text-slate-500 text-[10px]" />}
        />
      ),
    },
    {
      title: colTitle("Status"),
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
    },
  ];

  if (isStaffUser) {
    return (
      <ModuleLayoutsOne
        title="My Shift Dashboard"
        subtitle="Your assigned shifts and current availability profile."
        tableTitle="My Assigned Shifts"
        totalRecords={staffRows.length}
        enableListViewToggle
        tableHeaderBadges={[{ text: `${staffRows.length} assigned shifts` }]}
        tableContent={({ viewType }) => (
          <div>
            <div className="px-6 pt-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Availability
                </div>
                <div className="text-sm font-semibold text-slate-800">{availabilitySummary}</div>
              </div>
            </div>
            {viewType === "table" ? (
              <Table
                columns={staffColumns}
                dataSource={staffRows}
                loading={assignmentsLoading || shiftsLoading}
                pagination={false}
                size="middle"
                rowClassName={() => "transition-colors cursor-pointer"}
                scroll={{ x: 900, y: 520 }}
              />
            ) : (
              <ListView
                columns={staffColumns}
                dataSource={staffRows}
                rowKey="key"
                loading={assignmentsLoading || shiftsLoading}
              />
            )}
          </div>
        )}
      />
    );
  }

  return (
    <ModuleLayoutsOne
      title="Operations Command Center"
      subtitle="Live shift tasks, staffing coverage, and assignment status."
      headerAction={headerAction}
      statsContent={statsWithActions}
      tableTitle="Staff Task Board"
      totalRecords={rows.length}
      tableHeaderBadges={[
        { text: `${rows.length} active records` },
        {
          text: `${assignments.length ? assignments.length : shifts.length} synchronized`,
        },
      ]}
      tableProps={{
        columns,
        dataSource: rows,
        loading: shiftsLoading || assignmentsLoading,
      }}
    />
  );
};

export default Dashboard;
