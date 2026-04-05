import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card, Select, Tag } from "antd";
import { Clock3 } from "lucide-react";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import { fetchAssignmentInsights, fetchWorkedHours } from "../Store/Features/workedHoursSlice";
import { fetchShifts } from "../Store/Features/shiftsSlice";
import { fetchStaff } from "../Store/Features/staffSlice";

const EmployeeHours = () => {
  const dispatch = useDispatch();
  const [period, setPeriod] = useState("week");
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const { list, loading, insights, insightsLoading } = useSelector((state) => state.workedHours);
  const shifts = useSelector((state) => state.shifts.list);
  const staff = useSelector((state) => state.staff.list);

  useEffect(() => {
    dispatch(fetchWorkedHours({ period: "week" }));
    dispatch(fetchShifts());
    dispatch(fetchStaff());
  }, [dispatch]);

  const refreshData = () => {
    dispatch(
      fetchWorkedHours({
        period,
        ...(selectedStaffId ? { user_id: selectedStaffId } : {}),
      })
    );
    dispatch(
      fetchAssignmentInsights({
        ...(selectedShiftId ? { shift_id: selectedShiftId } : {}),
        ...(selectedStaffId ? { user_id: selectedStaffId } : {}),
      })
    );
  };

  const rows = useMemo(
    () =>
      (list || []).map((item) => ({
        key: String(item.user_id),
        employee: item.name,
        workedHours: item.total_worked_hours ?? 0,
        buckets: item.buckets || [],
      })),
    [list]
  );

  const columns = [
    {
      title: "Employee",
      dataIndex: "employee",
      key: "employee",
    },
    {
      title: "Total Worked Hours",
      dataIndex: "workedHours",
      key: "workedHours",
      render: (value) => <strong>{Number(value || 0).toFixed(2)}h</strong>,
    },
    {
      title: period === "month" ? "Monthly Buckets" : "Weekly Buckets",
      dataIndex: "buckets",
      key: "buckets",
      render: (value) =>
        value?.length ? (
          <div className="flex flex-wrap gap-1">
            {value.map((bucket) => (
              <Tag key={`${bucket.bucket}-${bucket.worked_minutes}`}>
                {bucket.bucket}: {bucket.worked_hours}h
              </Tag>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">No tracked sessions</span>
        ),
    },
  ];

  const shiftOptions = (shifts || []).map((shift) => ({
    value: shift?._id,
    label: `${shift?.title || shift?._id} (${new Date(shift?.starts_at_utc).toLocaleString()})`,
  }));

  const staffOptions = (staff || []).map((member) => ({
    value: member?._id,
    label: member?.name || member?.email || member?._id,
  }));

  return (
    <ModuleLayoutsOne
      title="Employee Worked Hours"
      subtitle="Track actual worked hours by week or month and review assignment insights."
      tableTitle="Worked Hours"
      totalRecords={rows.length}
      tableHeaderBadges={[{ text: period === "month" ? "Monthly view" : "Weekly view" }]}
      filtersContent={
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Period</label>
              <Select
                className="w-full mt-1"
                value={period}
                onChange={setPeriod}
                options={[
                  { value: "week", label: "Weeks" },
                  { value: "month", label: "Months" },
                ]}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Employee</label>
              <Select
                allowClear
                className="w-full mt-1"
                value={selectedStaffId || undefined}
                onChange={(value) => setSelectedStaffId(value || "")}
                options={staffOptions}
                placeholder="All employees"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Shift (Insights)</label>
              <Select
                allowClear
                className="w-full mt-1"
                value={selectedShiftId || undefined}
                onChange={(value) => setSelectedShiftId(value || "")}
                options={shiftOptions}
                placeholder="Optional shift"
              />
            </div>
            <div className="flex items-end">
              <Button type="primary" icon={<Clock3 size={14} />} onClick={refreshData} loading={loading || insightsLoading}>
                Refresh
              </Button>
            </div>
          </div>
          <Card size="small" className="border border-slate-200 rounded-xl">
            <p className="font-semibold mb-2">Operational Insights</p>
            <div className="text-xs text-slate-600 space-y-1">
              <p>
                <strong>Sunday Night Chaos:</strong>{" "}
                {(insights?.sunday_night_chaos?.fastest_path || []).join(" -> ") ||
                  "Select shift and click refresh to load guidance."}
              </p>
              <p>
                <strong>Overtime Trap:</strong>{" "}
                {(insights?.overtime_trap?.at_risk_staff || []).length} at-risk staff in current window.
              </p>
              <p>
                <strong>Simultaneous Assignment:</strong>{" "}
                {insights?.simultaneous_assignment?.expected_behavior || "Refresh to load"}
              </p>
              <p>
                <strong>Fairness Complaint:</strong>{" "}
                {insights?.fairness_complaint?.note || "Refresh to load"}
              </p>
              <p>
                <strong>Regret Swap:</strong>{" "}
                {(insights?.regret_swap?.pending_requests_count ?? 0)} pending requests.
              </p>
            </div>
          </Card>
        </div>
      }
      tableProps={{
        columns,
        dataSource: rows,
        loading,
        pagination: false,
      }}
    />
  );
};

export default EmployeeHours;
