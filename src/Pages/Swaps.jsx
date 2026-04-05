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
  acceptSwapRequest,
} from "../Store/Features/swapRequestsSlice";
import {
  clockInAssignmentQuick,
  clockOutAssignmentQuick,
  fetchMyShiftTracking,
  pauseAssignmentQuick,
  resumeAssignmentQuick,
} from "../Store/Features/assignmentsSlice";
import { fetchAvailabilityByUser } from "../Store/Features/availabilitySlice";
import { createAuditLog } from "../Store/Features/auditLogsSlice";
import { fetchShifts } from "../Store/Features/shiftsSlice";
import { fetchStaffSkills } from "../Store/Features/skillsSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";
import { hasRole } from "../Utils/roles";

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
const timezoneCodeToIana = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (
    normalized === "PST" ||
    normalized === "PDT" ||
    normalized === "PT" ||
    normalized === "AMERICA/LOS_ANGELES"
  ) {
    return "America/Los_Angeles";
  }
  return "Africa/Nairobi";
};

const parseLocalTimeToMinutes = (value) => {
  const [hours = "0", minutes = "0"] = String(value || "").split(":");
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);
  if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) return null;
  return parsedHours * 60 + parsedMinutes;
};

const getLocalDateParts = (utcDate, timezoneCode) => {
  const timeZone = timezoneCodeToIana(timezoneCode);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const weekdayLabel = parts.find((part) => part.type === "weekday")?.value || "";
  const hour = parts.find((part) => part.type === "hour")?.value || "00";
  const minute = parts.find((part) => part.type === "minute")?.value || "00";
  const weekdayMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return {
    weekday: weekdayMap[weekdayLabel],
    minutes: Number(hour) * 60 + Number(minute),
  };
};

const expandAvailabilitySegments = (windows) =>
  (Array.isArray(windows) ? windows : []).flatMap((window) => {
    const weekday = Number(window?.weekday);
    const startMinutes = parseLocalTimeToMinutes(window?.start_time_local);
    const endMinutes = parseLocalTimeToMinutes(window?.end_time_local);
    if (Number.isNaN(weekday) || startMinutes === null || endMinutes === null) return [];
    if (startMinutes <= endMinutes) {
      return [{ weekday, startMinutes, endMinutes }];
    }
    const nextWeekday = (weekday + 1) % 7;
    return [
      { weekday, startMinutes, endMinutes: 1440 },
      { weekday: nextWeekday, startMinutes: 0, endMinutes },
    ];
  });

const isSegmentCovered = (segments, weekday, startMinutes, endMinutes) => {
  if (startMinutes === endMinutes) return true;
  const daySegments = segments
    .filter((segment) => segment.weekday === weekday)
    .sort((a, b) => a.startMinutes - b.startMinutes);
  if (!daySegments.length) return false;
  let coveredUntil = startMinutes;
  for (const segment of daySegments) {
    if (segment.endMinutes <= coveredUntil) continue;
    if (segment.startMinutes > coveredUntil) break;
    coveredUntil = Math.max(coveredUntil, segment.endMinutes);
    if (coveredUntil >= endMinutes) return true;
  }
  return coveredUntil >= endMinutes;
};

const isUserAvailableForShift = (availabilityDoc, shiftStartUtc, shiftEndUtc, shiftTimezone) => {
  const windows = availabilityDoc?.recurring_windows || [];
  if (!windows.length || !shiftStartUtc || !shiftEndUtc) return false;
  const startDate = new Date(shiftStartUtc);
  const endDate = new Date(shiftEndUtc);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return false;
  }
  const timezone = shiftTimezone || windows[0]?.timezone || "EAT";
  const startLocal = getLocalDateParts(startDate, timezone);
  const endLocal = getLocalDateParts(endDate, timezone);
  const segments = expandAvailabilitySegments(windows);
  if (!segments.length || Number.isNaN(startLocal.weekday) || Number.isNaN(endLocal.weekday)) return false;

  if (startLocal.weekday === endLocal.weekday && endLocal.minutes >= startLocal.minutes) {
    return isSegmentCovered(segments, startLocal.weekday, startLocal.minutes, endLocal.minutes);
  }

  const firstSegmentCovered = isSegmentCovered(
    segments,
    startLocal.weekday,
    startLocal.minutes,
    1440,
  );
  const secondSegmentCovered = isSegmentCovered(segments, endLocal.weekday, 0, endLocal.minutes);
  return firstSegmentCovered && secondSegmentCovered;
};

const getSwapShiftWindow = (request) => ({
  startsAt:
    request?.from_assignment_id?.shift_id?.starts_at_utc ||
    request?.from_assignment_id?.shift_id?.start_at ||
    null,
  endsAt:
    request?.from_assignment_id?.shift_id?.ends_at_utc ||
    request?.from_assignment_id?.shift_id?.end_at ||
    null,
  timezone:
    request?.from_assignment_id?.shift_id?.location_timezone ||
    request?.from_assignment_id?.shift_id?.timezone ||
    "EAT",
});

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
  const user = useSelector((state) => state.auth?.user);
  const { list, loading, saving } = useSelector((state) => state.swapRequests);
  const { list: shifts } = useSelector((state) => state.shifts);
  const { staffSkills } = useSelector((state) => state.skills);
  const {
    myTracking,
    myTrackingLoading,
    quickActionLoading,
  } = useSelector((state) => state.assignments);
  const currentAvailability = useSelector((state) => state.availability.byUser[user?._id]);
  const userId = user?._id;
  const isStaff = hasRole(user, ["staff"]);
  const canApprove = hasRole(user, ["admin", "manager"]);
  const [requestingSwapId, setRequestingSwapId] = useState("");
  const [acceptingSwapId, setAcceptingSwapId] = useState("");

  useEffect(() => {
    dispatch(fetchSwapRequests());
    dispatch(fetchShifts());
    dispatch(fetchStaffSkills());
    if (isStaff) dispatch(fetchMyShiftTracking());
    if (isStaff && userId) dispatch(fetchAvailabilityByUser(userId));
  }, [dispatch, isStaff, userId]);

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

  const shiftById = useMemo(
    () =>
      (shifts || []).reduce((acc, shift) => {
        acc[String(getId(shift))] = shift;
        return acc;
      }, {}),
    [shifts],
  );

  const activeSkillIdsByUser = useMemo(() => {
    const map = {};
    (staffSkills || []).forEach((row) => {
      const skillUserId = String(getId(row?.user_id) || row?.user_id || "");
      const skillId = String(getId(row?.skill_id) || row?.skill_id || "");
      if (!skillUserId || !skillId) return;
      if (row?.is_active === false) return;
      if (!map[skillUserId]) map[skillUserId] = new Set();
      map[skillUserId].add(skillId);
    });
    return map;
  }, [staffSkills]);

  const hasRequiredSkillForSwap = (request) => {
    const shiftId = String(
      getId(request?.from_assignment_id?.shift_id) || request?.from_assignment_id?.shift_id || "",
    );
    const fullShift = shiftById[shiftId] || request?.from_assignment_id?.shift_id || {};
    const requiredSkillId = String(
      getId(fullShift?.required_skill_id) || fullShift?.required_skill_id || "",
    );
    if (!requiredSkillId) return true;
    const userSkillSet = activeSkillIdsByUser[String(userId || "")];
    return Boolean(userSkillSet && userSkillSet.has(requiredSkillId));
  };

  const logSwapAudit = async (action, details) => {
    await dispatch(
      createAuditLog({
        actor_user_id: userId,
        action,
        module: "swap_requests",
        entity_type: "swap_request",
        after_state: details,
      }),
    );
  };

  const decide = async (id, approve) => {
    const result = await dispatch(managerDecisionSwapRequest({ id, approve, manager_id: userId }));
    if (managerDecisionSwapRequest.fulfilled.match(result)) {
      const updatedRequest = result.payload?.swap_request || result.payload;
      const acceptedUserId =
        getId(updatedRequest?.claimed_by_user_id) ||
        updatedRequest?.claimed_by_user_id ||
        getId(updatedRequest?.target_user_id) ||
        updatedRequest?.target_user_id ||
        getId(updatedRequest?.accepted_by_user_id) || updatedRequest?.accepted_by_user_id || "";
      const assignmentId =
        getId(updatedRequest?.from_assignment_id) || updatedRequest?.from_assignment_id || "";
      await logSwapAudit(approve ? "swap_request_approved" : "swap_request_rejected", {
        swap_request_id: String(id),
        approved: Boolean(approve),
        approved_by: userId,
        accepted_by_user_id: acceptedUserId || null,
        assignment_id: assignmentId || null,
      });
      toast.success(approve ? "Swap approved" : "Swap rejected");
      dispatch(fetchSwapRequests());
    } else {
      toast.error(toErrorMessage(result?.payload, "Failed to submit decision"));
    }
  };

  const submitSwapRequest = async (assignment) => {
    if (!assignment?.shiftId || !assignment?.id || !userId) {
      toast.error("Could not request swap. Assignment details are incomplete.");
      return;
    }
    if (myPendingSwapAssignmentIds.has(String(assignment.id))) {
      toast.error("Swap already requested for this shift.");
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
      const createdRequest = result.payload;
      await logSwapAudit("swap_request_created", {
        swap_request_id: String(getId(createdRequest) || ""),
        requester_id: userId,
        assignment_id: assignment.id,
      });
      toast.success("Swap request submitted");
      dispatch(fetchSwapRequests());
    } else {
      toast.error(toErrorMessage(result?.payload, "Failed to request swap"));
    }
  };

  const acceptRequest = async (request) => {
    const requestId = String(getId(request) || "");
    if (!requestId || !userId) return;
    const { startsAt, endsAt, timezone } = getSwapShiftWindow(request);
    const isAvailable = isUserAvailableForShift(currentAvailability, startsAt, endsAt, timezone);
    if (!isAvailable) {
      toast.error("Not available for the shift");
      return;
    }
    if (!hasRequiredSkillForSwap(request)) {
      toast.error("Missing required skill for this shift");
      return;
    }
    setAcceptingSwapId(requestId);
    const result = await dispatch(
      acceptSwapRequest({
        id: requestId,
        accepted_by_user_id: userId,
      }),
    );
    setAcceptingSwapId("");

    if (acceptSwapRequest.fulfilled.match(result)) {
      await logSwapAudit("swap_request_accepted", {
        swap_request_id: requestId,
        accepted_by_user_id: userId,
      });
      toast.success("Swap request accepted. Waiting for manager/admin approval.");
      dispatch(fetchSwapRequests());
    } else {
      toast.error(toErrorMessage(result?.payload, "Failed to accept swap request"));
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
      toast.error(toErrorMessage(result?.payload, "Failed to update shift"));
    }
  };

  const pendingSwapRequests = useMemo(
    () =>
      list.filter((item) => {
        const requesterId = String(getId(item?.requester_id) || item?.requester_id || "");
        return requesterId === String(userId || "") && isPendingLikeStatus(item?.status);
      }),
    [list, userId],
  );

  const myPendingSwapAssignmentIds = new Set(
    list
      .filter((item) => {
        const requesterId = String(getId(item?.requester_id) || item?.requester_id || "");
        return (
            requesterId === String(userId || "") &&
          isPendingLikeStatus(item?.status)
        );
      })
      .map((item) => String(getId(item?.from_assignment_id) || item?.from_assignment_id || ""))
      .filter(Boolean),
  );

  const otherStaffRequests = useMemo(
    () =>
      list.filter((item) => {
        const requesterId = String(getId(item?.requester_id) || item?.requester_id || "");
        return requesterId !== String(userId || "") && isPendingLikeStatus(item?.status);
      }),
    [list, userId],
  );

  const myPendingAcceptedRequestIds = useMemo(
    () =>
      new Set(
        list
          .filter((item) => {
            const acceptedById =
              String(getId(item?.claimed_by_user_id) || item?.claimed_by_user_id || "") ||
              String(getId(item?.target_user_id) || item?.target_user_id || "") ||
              String(getId(item?.accepted_by_user_id) || item?.accepted_by_user_id || "");
            return acceptedById === String(userId || "");
          })
          .map((item) => String(getId(item) || ""))
          .filter(Boolean),
      ),
    [list, userId],
  );

  const rows = useMemo(
    () =>
      list.map((item) => ({
        key: item?._id || item?.id,
        requester: item?.requester_id?.name || item?.requester?.name || "Unknown",
        target: item?.target_user_id?.name || item?.target_user?.name || "Unassigned",
        acceptedBy:
          item?.claimed_by_user_id?.name ||
          item?.target_user_id?.name ||
          item?.accepted_by_user_id?.name ||
          item?.accepted_by_user?.name ||
          item?.accepted_by?.name ||
          "Not accepted yet",
        acceptedById:
          String(
            getId(item?.claimed_by_user_id) ||
              item?.claimed_by_user_id ||
              getId(item?.target_user_id) ||
              item?.target_user_id ||
            getId(item?.accepted_by_user_id) ||
              item?.accepted_by_user_id ||
              getId(item?.accepted_by_user) ||
              item?.accepted_by?.id ||
              "",
          ) || "",
        shift:
          item?.from_assignment_id?.shift_id?.title ||
          item?.from_assignment_id?.shift_id?.name ||
          item?.from_assignment_id?._id ||
          "N/A",
        shiftStart:
          item?.from_assignment_id?.shift_id?.starts_at_utc ||
          item?.from_assignment_id?.shift_id?.start_at ||
          null,
        shiftEnd:
          item?.from_assignment_id?.shift_id?.ends_at_utc ||
          item?.from_assignment_id?.shift_id?.end_at ||
          null,
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
      render: (value, row) => (
        <ColumnData text={value} description={`Accepted by: ${row.acceptedBy}`} />
      ),
    },
    {
      title: colTitle("Shift"),
      dataIndex: "shift",
      key: "shift",
      render: (value) => <ColumnData text={value} />,
    },
    {
      title: colTitle("Shift Window"),
      key: "shiftWindow",
      render: (_, row) => (
        <ColumnData
          text={`${formatDateTime(row.shiftStart)} - ${formatDateTime(row.shiftEnd)}`}
        />
      ),
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
      render: (_, row) => {
        const isPending = isPendingLikeStatus(row.status);
        const hasAcceptedUser = Boolean(row.acceptedById);
        if (isPending && canApprove && hasAcceptedUser) {
          return (
            <Space>
              <Button size="small" type="primary" onClick={() => decide(row.key, true)}>
                Approve
              </Button>
              <Button size="small" danger onClick={() => decide(row.key, false)}>
                Reject
              </Button>
            </Space>
          );
        }
        if (isPending && canApprove && !hasAcceptedUser) {
          return <span className="text-xs text-slate-500">Awaiting staff acceptance</span>;
        }
        return <span className="text-xs text-slate-400">Resolved</span>;
      },
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
                      disabled={myPendingSwapAssignmentIds.has(String(shift.id))}
                      onClick={() => submitSwapRequest(shift)}
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
                    {request?.from_assignment_id?.shift_id?.title ||
                      request?.from_assignment_id?.shift_id?.name ||
                      "Shift"}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {formatDateTime(request?.from_assignment_id?.shift_id?.starts_at_utc)} -{" "}
                    {formatDateTime(request?.from_assignment_id?.shift_id?.ends_at_utc)}
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
              {otherStaffRequests.map((request) => {
                const requestId = String(getId(request) || "");
                const requesterId = String(
                  getId(request?.requester_id) || request?.requester_id || "",
                );
                const acceptedById = String(
                  getId(request?.claimed_by_user_id) ||
                    request?.claimed_by_user_id ||
                    getId(request?.target_user_id) ||
                    request?.target_user_id ||
                  getId(request?.accepted_by_user_id) || request?.accepted_by_user_id || "",
                );
                const { startsAt, endsAt, timezone } = getSwapShiftWindow(request);
                const availableForShift = isUserAvailableForShift(
                  currentAvailability,
                  startsAt,
                  endsAt,
                  timezone,
                );
                const hasRequiredSkill = hasRequiredSkillForSwap(request);
                const alreadyAcceptedByMe = myPendingAcceptedRequestIds.has(requestId);
                const alreadyAcceptedByOther = Boolean(acceptedById && acceptedById !== String(userId || ""));
                const canAccept =
                  !alreadyAcceptedByOther &&
                  !alreadyAcceptedByMe &&
                  requesterId !== String(userId || "") &&
                  availableForShift &&
                  hasRequiredSkill;
                let acceptButtonLabel = "Accept Swap";
                if (alreadyAcceptedByMe) acceptButtonLabel = "Accepted by you";
                else if (alreadyAcceptedByOther) acceptButtonLabel = "Accepted";
                return (
                  <div key={requestId} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">
                      {request?.requester_id?.name || "Staff"} requested{" "}
                      {formatDateTime(request?.createdAt || request?.created_at)}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {request?.from_assignment_id?.shift_id?.title ||
                        request?.from_assignment_id?.shift_id?.name ||
                        "Shift"}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {formatDateTime(startsAt)} - {formatDateTime(endsAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold ${
                          availableForShift ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {availableForShift ? "Available for shift" : "Not available for shift"}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          hasRequiredSkill ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {hasRequiredSkill ? "Required skill matched" : "Missing required skill"}
                      </span>
                      <Button
                        size="small"
                        type="primary"
                        loading={saving && acceptingSwapId === requestId}
                        disabled={!canAccept}
                        onClick={() => acceptRequest(request)}
                      >
                        {acceptButtonLabel}
                      </Button>
                    </div>
                  </div>
                );
              })}
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
          Pending: {rows.filter((row) => isPendingLikeStatus(row.status)).length}
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
