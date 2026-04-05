import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Space } from "antd";
import { ArrowLeftRight, Clock3, PauseCircle, PlayCircle, StopCircle } from "lucide-react";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import {
  fetchSwapRequests,
  managerDecisionSwapRequest,
  createSwapRequest,
} from "../Store/Features/swapRequestsSlice";
import {
  clockInAssignmentQuick,
  clockOutAssignmentQuick,
  fetchMyShiftTracking,
  pauseAssignmentQuick,
  resumeAssignmentQuick,
} from "../Store/Features/assignmentsSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";
import { hasRole } from "../utils/roles";

const getId = (value) => (typeof value === "object" ? value?._id || value?.id : value);
const getAssignmentId = (assignment) =>
  String(
    assignment?._id ||
      assignment?.assignment_id ||
      assignment?.id ||
      assignment?.assignment?.id ||
      "",
  );

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
};

const getActionableStatus = (assignment, activeAssignmentId) => {
  const currentStatus = String(assignment?.status || "assigned").toLowerCase();
  const id = String(getId(assignment) || "");
  const isActive = id && activeAssignmentId && id === activeAssignmentId;
  if (currentStatus === "paused") return "paused";
  if (currentStatus === "completed" || currentStatus === "clocked_out") return "completed";
  if (currentStatus === "in-progress" || currentStatus === "clocked_in" || isActive) return "in-progress";
  return "assigned";
};

const Swaps = () => {
  const dispatch = useDispatch();
  const { list, loading, saving } = useSelector((state) => state.swapRequests);
  const {
    myTracking,
    myTrackingLoading,
    quickActionLoading,
  } = useSelector((state) => state.assignments);
  const user = useSelector((state) => state.auth?.user);
  const userId = user?._id;
  const isStaff = hasRole(user, ["staff"]);
  const canApprove = hasRole(user, ["admin", "manager"]);
  const [requestingSwapId, setRequestingSwapId] = useState("");

  useEffect(() => {
    dispatch(fetchSwapRequests());
    if (isStaff) dispatch(fetchMyShiftTracking());
  }, [dispatch, isStaff]);

  const activeAssignmentId = useMemo(
    () => getAssignmentId(myTracking?.active_assignment),
    [myTracking?.active_assignment],
  );

  const assignments = Array.isArray(myTracking?.assignments) ? myTracking.assignments : [];
  const assignedShifts = assignments.map((assignment) => {
    const shift = assignment?.shift_id || assignment?.shift || {};
    const location = shift?.location_id || {};
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

  const decide = async (id, approve) => {
    const result = await dispatch(managerDecisionSwapRequest({ id, approve, manager_id: userId }));
    if (managerDecisionSwapRequest.fulfilled.match(result)) {
      toast.success(approve ? "Swap approved" : "Swap rejected");
    } else {
      toast.error(result?.payload || "Failed to submit decision");
    }
  };

  const submitSwapRequest = async (assignment) => {
    if (!assignment?.shiftId || !assignment?.id || !userId) {
      toast.error("Could not request swap. Assignment details are incomplete.");
      return;
    }
    setRequestingSwapId(assignment.id);
    const result = await dispatch(
      createSwapRequest({
        type: "swap",
        requester_id: userId,
        from_assignment_id: assignment.id,
        note: "Requested from Shift Swaps screen",
      }),
    );

    setRequestingSwapId("");
    if (createSwapRequest.fulfilled.match(result)) {
      toast.success("Swap request submitted");
      dispatch(fetchSwapRequests());
    } else {
      toast.error(result?.payload || "Failed to request swap");
    }
  };

  const handleQuickAction = async (assignmentId, action) => {
    if (!assignmentId) {
      toast.error("Could not update shift. Assignment ID is missing.");
      return;
    }
    let result;
    if (action === "clock-in") {
      result = await dispatch(clockInAssignmentQuick({ assignmentId }));
    } else if (action === "pause") {
      result = await dispatch(pauseAssignmentQuick({ assignmentId, reason: "Break" }));
    } else if (action === "resume") {
      result = await dispatch(resumeAssignmentQuick({ assignmentId }));
    } else {
      result = await dispatch(clockOutAssignmentQuick({ assignmentId }));
    }

    if (
      clockInAssignmentQuick.fulfilled.match(result) ||
      pauseAssignmentQuick.fulfilled.match(result) ||
      resumeAssignmentQuick.fulfilled.match(result) ||
      clockOutAssignmentQuick.fulfilled.match(result)
    ) {
      toast.success("Shift updated");
      dispatch(fetchMyShiftTracking());
    } else {
      toast.error(result?.payload || "Failed to update shift");
    }
  };

  const pendingSwapRequests = useMemo(
    () =>
      list.filter((item) => {
        const requesterId = String(getId(item?.requester_id) || item?.requester_id || "");
        return requesterId === String(userId || "") && String(item?.status || "").toLowerCase().includes("pending");
      }),
    [list, userId],
  );

  const otherStaffRequests = useMemo(
    () =>
      list.filter((item) => {
        const requesterId = String(getId(item?.requester_id) || item?.requester_id || "");
        return requesterId !== String(userId || "") && String(item?.status || "").toLowerCase().includes("pending");
      }),
    [list, userId],
  );

  const rows = useMemo(
    () =>
      list.map((item) => ({
        key: item?._id || item?.id,
        requester: item?.requester_id?.name || item?.requester?.name || "Unknown",
        target: item?.target_user_id?.name || item?.target_user?.name || "Unassigned",
        shift:
          item?.from_assignment_id?.shift_id?.title ||
          item?.from_assignment_id?.shift_id?.name ||
          item?.from_assignment_id?._id ||
          "N/A",
        requestedAt: formatDateTime(item?.createdAt || item?.created_at),
        status: item?.status || "pending_peer_acceptance",
      })),
    [list],
  );

  const columns = [
    {
      title: colTitle("Requester"),
      dataIndex: "requester",
      key: "requester",
      render: (value, row) => <ColumnData text={value} description={`Target: ${row.target}`} />,
    },
    {
      title: colTitle("Shift"),
      dataIndex: "shift",
      key: "shift",
      render: (value) => <ColumnData text={value} />,
    },
    {
      title: colTitle("Requested"),
      dataIndex: "requestedAt",
      key: "requestedAt",
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
        String(row.status || "").toLowerCase().includes("pending") && canApprove ? (
          <Space>
            <Button size="small" type="primary" onClick={() => decide(row.key, true)}>
              Approve
            </Button>
            <Button size="small" danger onClick={() => decide(row.key, false)}>
              Reject
            </Button>
          </Space>
        ) : (
          <span className="text-xs text-slate-400">Resolved</span>
        ),
    },
  ];

  if (isStaff) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">My Shift Swaps</h2>
              <p className="text-sm text-slate-600">
                View your assigned shifts, use quick actions in each shift card, and request swaps.
              </p>
            </div>
            <div className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
              Pending Requests: {pendingSwapRequests.length}
            </div>
          </div>
        </div>

        {myTrackingLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
            Loading assigned shifts...
          </div>
        ) : assignedShifts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
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
                      <Button
                        type="primary"
                        icon={<PlayCircle size={14} />}
                        loading={quickActionLoading}
                        onClick={() => handleQuickAction(shift.id, "clock-in")}
                      >
                        Clock In
                      </Button>
                    ) : null}
                    {shift.status === "in-progress" ? (
                      <>
                        <Button
                          icon={<PauseCircle size={14} />}
                          loading={quickActionLoading}
                          onClick={() => handleQuickAction(shift.id, "pause")}
                        >
                          Pause
                        </Button>
                        <Button
                          icon={<StopCircle size={14} />}
                          loading={quickActionLoading}
                          onClick={() => handleQuickAction(shift.id, "clock-out")}
                        >
                          Clock Out
                        </Button>
                      </>
                    ) : null}
                    {shift.status === "paused" ? (
                      <>
                        <Button
                          type="primary"
                          icon={<PlayCircle size={14} />}
                          loading={quickActionLoading}
                          onClick={() => handleQuickAction(shift.id, "resume")}
                        >
                          Resume
                        </Button>
                        <Button
                          icon={<StopCircle size={14} />}
                          loading={quickActionLoading}
                          onClick={() => handleQuickAction(shift.id, "clock-out")}
                        >
                          Clock Out
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type="default"
                      icon={<ArrowLeftRight size={14} />}
                      loading={saving && requestingSwapId === shift.id}
                      onClick={() => submitSwapRequest(shift)}
                    >
                      Request Swap
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 size={16} />
            <h4 className="text-sm font-black text-slate-900">My Swap Requests</h4>
          </div>
          {pendingSwapRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No pending swap requests.</p>
          ) : (
            <div className="space-y-2">
              {pendingSwapRequests.map((request) => (
                <div key={String(getId(request))} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Requested {formatDateTime(request?.createdAt || request?.created_at)}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {request?.shift_id?.name || request?.shift_id?._id || "Shift"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ArrowLeftRight size={16} />
            <h4 className="text-sm font-black text-slate-900">Other Staff Swap Requests</h4>
          </div>
          {otherStaffRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No pending requests from other staff.</p>
          ) : (
            <div className="space-y-2">
              {otherStaffRequests.map((request) => (
                <div key={String(getId(request))} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    {request?.requester_id?.name || "Staff"} requested {formatDateTime(request?.createdAt || request?.created_at)}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {request?.from_assignment_id?.shift_id?.title ||
                      request?.from_assignment_id?.shift_id?.name ||
                      "Shift"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ModuleLayoutsOne
      title="Shift Swap Queue"
      subtitle={
        canApprove
          ? "Review and resolve pending staff swap requests."
          : "Review submitted swap requests."
      }
      headerAction={
        <div className="inline-flex items-center px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold">
          Pending: {rows.filter((row) => String(row.status || "").toLowerCase().includes("pending")).length}
        </div>
      }
      tableTitle="Swap Requests"
      totalRecords={rows.length}
      tableProps={{
        columns,
        dataSource: rows,
        loading,
      }}
      tableHeaderBadges={[{ text: `${rows.length} requests` }]}
      tableHeaderAction={<ArrowLeftRight size={16} color="#f6873a" />}
    />
  );
};

export default Swaps;
