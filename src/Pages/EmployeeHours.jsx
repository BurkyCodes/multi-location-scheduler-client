import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Select, Tag } from "antd";
import { Clock3 } from "lucide-react";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import { fetchWorkedHours } from "../Store/Features/workedHoursSlice";
import { fetchStaff } from "../Store/Features/staffSlice";

const EmployeeHours = () => {
  const dispatch = useDispatch();
  const [period, setPeriod] = useState("week");
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const { list, loading } = useSelector((state) => state.workedHours);
  const staff = useSelector((state) => state.staff.list);

  useEffect(() => {
    dispatch(fetchWorkedHours({ period: "week" }));
    dispatch(fetchStaff());
  }, [dispatch]);

  const refreshData = () => {
    dispatch(
      fetchWorkedHours({
        period,
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

  const staffOptions = (staff || []).map((member) => ({
    value: member?._id,
    label: member?.name || member?.email || member?._id,
  }));

  return (
    <ModuleLayoutsOne
      title="Employee Worked Hours"
      subtitle="Track actual worked hours by week or month."
      tableTitle="Worked Hours"
      totalRecords={rows.length}
      tableHeaderBadges={[{ text: period === "month" ? "Monthly view" : "Weekly view" }]}
      filtersContent={
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            <div className="flex items-end">
              <Button type="primary" icon={<Clock3 size={14} />} onClick={refreshData} loading={loading}>
                Refresh
              </Button>
            </div>
          </div>
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
