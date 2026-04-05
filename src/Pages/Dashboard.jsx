import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "antd";
import { toast } from "sonner";
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
import {
  clockInAssignmentQuick,
  clockOutAssignmentQuick,
  fetchAssignments,
  fetchMyShiftTracking,
  pauseAssignmentQuick,
  resumeAssignmentQuick,
} from "../Store/Features/assignmentsSlice";
import { createSwapRequest, fetchSwapRequests } from "../Store/Features/swapRequestsSlice";
import { createAuditLog, fetchAuditLogs } from "../Store/Features/auditLogsSlice";
import { fetchAvailabilityByUser } from "../Store/Features/availabilitySlice";
import { fetchLaborAlerts } from "../Store/Features/laborAlertsSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";
import StatCard from "../SharedComponents/StatCard";
import ActionAuditTable from "../SharedComponents/ActionAuditTable";
import { hasRole } from "../Utils/roles";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
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
const getAssignmentId = (assignment) =>
  String(
    assignment?._id ||
      assignment?.assignment_id ||
      assignment?.id ||
      assignment?.assignment?.id ||
      "",
  );

const getActionableStatus = (assignment, activeAssignmentId) => {
  const currentStatus = String(assignment?.status || "assigned").toLowerCase();
  const id = String(getId(assignment) || "");
  const isActive = id && activeAssignmentId && id === activeAssignmentId;
  if (currentStatus === "paused") return "paused";
  if (currentStatus === "completed" || currentStatus === "clocked_out") return "completed";
  if (currentStatus === "in-progress" || currentStatus === "clocked_in" || isActive) return "in-progress";
  return "assigned";
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
  const myTracking = useSelector((state) => state.assignments.myTracking);
  const myTrackingLoading = useSelector((state) => state.assignments.myTrackingLoading);
  const quickActionLoading = useSelector((state) => state.assignments.quickActionLoading);
  const { list: swapRequests, saving: swapSaving } = useSelector((state) => state.swapRequests);
  const { list: auditLogs } = useSelector((state) => state.auditLogs);
  const { list: laborAlerts, loading: laborAlertsLoading } = useSelector(
    (state) => state.laborAlerts,
  );
  const userAvailability = useSelector((state) => state.availability.byUser[currentUserId]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingShift, setViewingShift] = useState(null);

  useEffect(() => {
    dispatch(fetchShifts());
    dispatch(fetchLocations());
    dispatch(fetchAssignments());
    if (isStaffUser) {
      dispatch(fetchMyShiftTracking());
      dispatch(fetchSwapRequests());
    }
    if (!isStaffUser) {
      dispatch(fetchStaff());
      dispatch(fetchAuditLogs({ limit: 10 }));
      dispatch(fetchLaborAlerts());
    }
    if (isStaffUser && currentUserId) dispatch(fetchAvailabilityByUser(currentUserId));
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
          onClick={() => {
            setViewingShift(record);
            setViewOpen(true);
          }}
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

  const openLaborAlerts = useMemo(
    () => (laborAlerts || []).filter((item) => !item?.resolved_at),
    [laborAlerts],
  );

  const statsWithActions = useMemo(
    () => (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {statCards.map((item, index) => (
            <StatCard key={item?.key || index} {...item} />
          ))}
        </div>
        <div className="xl:col-span-1 space-y-4">
          <ActionAuditTable items={auditLogs.slice(0, 8)} />
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-rose-700">
              Labor Compliance
            </div>
            <div className="mt-1 text-sm font-semibold text-rose-800">
              {openLaborAlerts.length} open alert(s)
            </div>
            <div className="mt-2 space-y-2">
              {(openLaborAlerts || []).slice(0, 3).map((alert) => (
                <div key={alert?._id || alert?.id} className="rounded-lg bg-white p-2 text-xs text-slate-700">
                  <div className="font-bold text-slate-800">{alert?.type || "Labor alert"}</div>
                  <div>{alert?.message || "Compliance warning"}</div>
                </div>
              ))}
              {laborAlertsLoading ? (
                <div className="text-xs text-slate-500">Loading labor alerts...</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    ),
    [statCards, auditLogs, openLaborAlerts, laborAlertsLoading],
  );

  const availabilitySummary = useMemo(() => {
    const windows = userAvailability?.recurring_windows || [];
    if (!windows.length) return "No availability profile configured";
    const time = `${windows[0]?.start_time_local || "--:--"} - ${windows[0]?.end_time_local || "--:--"}`;
    const timezone = windows[0]?.timezone || "N/A";
    return `${windows.length} recurring window(s), ${time} (${timezone})`;
  }, [userAvailability]);

  const activeAssignment = myTracking?.active_assignment || null;
  const activeShift = activeAssignment?.shift || null;
  const activeAssignmentId = getAssignmentId(activeAssignment);

  const trackedAssignments = Array.isArray(myTracking?.assignments) ? myTracking.assignments : [];
  const assignedShiftCards = trackedAssignments.map((assignment) => {
    const shift = assignment?.shift_id || assignment?.shift || {};
    const location = shift?.location_id || shift?.location || {};
    const status = getActionableStatus(assignment, activeAssignmentId);
    return {
      id: getAssignmentId(assignment),
      shiftId: String(getId(shift)),
      title: shift?.title || shift?.name || "Assigned shift",
      location: location?.name || "Unknown location",
      start: shift?.starts_at_utc || assignment?.starts_at_utc,
      end: shift?.ends_at_utc || assignment?.ends_at_utc,
      timezone: shift?.location_timezone || shift?.timezone || "EAT",
      status,
    };
  });

  const myPendingSwapCount = useMemo(
    () =>
      (swapRequests || []).filter((request) => {
        const requesterId = String(getId(request?.requester_id) || request?.requester_id || "");
        return requesterId === String(currentUserId || "") && String(request?.status || "").toLowerCase().includes("pending");
      }).length,
    [swapRequests, currentUserId],
  );
  const myPendingSwapAssignmentIds = useMemo(
    () =>
      new Set(
        (swapRequests || [])
          .filter((request) => {
            const requesterId = String(getId(request?.requester_id) || request?.requester_id || "");
            return requesterId === String(currentUserId || "") && String(request?.status || "").toLowerCase().includes("pending");
          })
          .map((request) => String(getId(request?.from_assignment_id) || request?.from_assignment_id || ""))
          .filter(Boolean),
      ),
    [swapRequests, currentUserId],
  );

  const runQuickAction = async (action, assignmentIdOverride) => {
    const assignmentId = assignmentIdOverride || activeAssignment?.assignment_id;
    if (!assignmentId) {
      toast.error("No active assignment available for this action");
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

    if (!fulfilled) {
      const message =
        (typeof result?.payload === "string" && result.payload) ||
        result?.payload?.message ||
        "Action failed";
      toast.error(message);
      return;
    }

    toast.success("Shift action updated");
    dispatch(fetchMyShiftTracking());
    dispatch(fetchAssignments());
  };

  const requestSwap = async (assignment) => {
    if (!assignment?.shiftId || !assignment?.id || !currentUserId) return;
    if (myPendingSwapCount >= 3) {
      toast.error("You can only have up to 3 pending swap/drop requests at a time.");
      return;
    }
    if (myPendingSwapAssignmentIds.has(String(assignment.id))) {
      toast.error("Swap already requested for this shift.");
      return;
    }
    const result = await dispatch(
      createSwapRequest({
        type: "swap",
        requester_id: currentUserId,
        from_assignment_id: assignment.id,
        note: "Requested from staff dashboard",
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
    } else {
      toast.error(toErrorMessage(result?.payload, "Failed to request swap"));
    }
  };

  if (isStaffUser) {
    return (
      <ModuleLayoutsOne
        title="My Shift Dashboard"
        subtitle="Your assigned shifts and current availability profile."
        tableTitle="My Assigned Shifts"
        totalRecords={assignedShiftCards.length}
        tableHeaderBadges={[
          { text: `${assignedShiftCards.length} assigned shifts` },
          { text: `${myPendingSwapCount} pending swap requests` },
        ]}
        tableContent={() => (
          <div>
            <div className="px-6 pt-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Availability
                </div>
                <div className="text-sm font-semibold text-slate-800">{availabilitySummary}</div>
              </div>
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-1">
                  Quick Actions
                </div>
                <div className="text-sm font-semibold text-slate-800 mb-3">
                  {activeShift
                    ? `${activeShift.location?.name || "Assigned location"} | ${formatDateTime(
                        activeShift.starts_at_utc,
                      )} - ${formatDateTime(activeShift.ends_at_utc)}`
                    : "No active shift at the moment"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="small"
                    type="primary"
                    loading={quickActionLoading}
                    disabled={!activeAssignment?.can_clock_in}
                    onClick={() => runQuickAction("clock_in", getAssignmentId(activeAssignment))}
                  >
                    Clock In
                  </Button>
                  <Button
                    size="small"
                    loading={quickActionLoading}
                    disabled={!activeAssignment?.can_pause}
                    onClick={() => runQuickAction("pause", getAssignmentId(activeAssignment))}
                  >
                    Pause
                  </Button>
                  <Button
                    size="small"
                    loading={quickActionLoading}
                    disabled={!activeAssignment?.can_resume}
                    onClick={() => runQuickAction("resume", getAssignmentId(activeAssignment))}
                  >
                    Resume
                  </Button>
                  <Button
                    size="small"
                    danger
                    loading={quickActionLoading}
                    disabled={!activeAssignment?.can_clock_out}
                    onClick={() => runQuickAction("clock_out", getAssignmentId(activeAssignment))}
                  >
                    Clock Out
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {myTrackingLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                  Loading assigned shifts...
                </div>
              ) : assignedShiftCards.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                  No assigned shifts found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {assignedShiftCards.map((shift) => (
                    <div key={shift.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{shift.location}</p>
                          <h3 className="text-lg font-black text-slate-900">{shift.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">{shift.timezone}</p>
                        </div>
                        <StatusBadge status={shift.status} />
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Starts</p>
                          <p className="text-sm font-semibold text-slate-900">{formatDateTime(shift.start)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Ends</p>
                          <p className="text-sm font-semibold text-slate-900">{formatDateTime(shift.end)}</p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl border border-slate-200 p-3">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Quick Actions</p>
                        <div className="flex flex-wrap gap-2">
                          {shift.status === "assigned" ? (
                            <Button size="small" type="primary" loading={quickActionLoading} onClick={() => runQuickAction("clock_in", shift.id)}>
                              Clock In
                            </Button>
                          ) : null}
                          {shift.status === "in-progress" ? (
                            <>
                              <Button size="small" loading={quickActionLoading} onClick={() => runQuickAction("pause", shift.id)}>
                                Pause
                              </Button>
                              <Button size="small" danger loading={quickActionLoading} onClick={() => runQuickAction("clock_out", shift.id)}>
                                Clock Out
                              </Button>
                            </>
                          ) : null}
                          {shift.status === "paused" ? (
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
                            disabled={myPendingSwapAssignmentIds.has(String(shift.id))}
                            onClick={() => requestSwap(shift)}
                          >
                            {myPendingSwapAssignmentIds.has(String(shift.id))
                              ? "Requested Swap"
                              : "Request Swap"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        secondaryModalOpen={viewOpen}
        onSecondaryModalClose={() => {
          setViewOpen(false);
          setViewingShift(null);
        }}
        secondaryModalTitle="Shift Details"
        secondaryModalSubtitle="Detailed shift information."
        secondaryModalContent={
          viewingShift ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Location</p>
                <p className="font-semibold text-slate-800">{viewingShift?.location || viewingShift?.details?.location || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Shift</p>
                <p className="font-semibold text-slate-800">{viewingShift?.title || viewingShift?.shift || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Schedule</p>
                <p className="font-semibold text-slate-800">
                  {viewingShift?.time?.range || `${formatDateTime(viewingShift?.start)} - ${formatDateTime(viewingShift?.end)}`}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Timezone</p>
                <p className="font-semibold text-slate-800">{viewingShift?.timezone || viewingShift?.time?.timezone || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
                <p className="font-semibold text-slate-800">{viewingShift?.status || "N/A"}</p>
              </div>
            </div>
          ) : null
        }
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
        { text: `${openLaborAlerts.length} labor alerts open` },
      ]}
      tableProps={{
        columns,
        dataSource: rows,
        loading: shiftsLoading || assignmentsLoading,
        onRow: (record) => ({
          onClick: () => {
            setViewingShift(record);
            setViewOpen(true);
          },
        }),
      }}
      secondaryModalOpen={viewOpen}
      onSecondaryModalClose={() => {
        setViewOpen(false);
        setViewingShift(null);
      }}
      secondaryModalTitle="Shift Details"
      secondaryModalSubtitle="Detailed shift information."
      secondaryModalContent={
        viewingShift ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Location</p>
              <p className="font-semibold text-slate-800">{viewingShift?.details?.location || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Skill</p>
              <p className="font-semibold text-slate-800">{viewingShift?.details?.skill || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Assigned Staff</p>
              <p className="font-semibold text-slate-800">{viewingShift?.staff || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Schedule</p>
              <p className="font-semibold text-slate-800">{viewingShift?.time?.range || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Timezone</p>
              <p className="font-semibold text-slate-800">{viewingShift?.time?.timezone || "N/A"}</p>
            </div>
          </div>
        ) : null
      }
    />
  );
};

export default Dashboard;
