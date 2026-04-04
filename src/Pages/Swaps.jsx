import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, message, Space } from "antd";
import { ArrowLeftRight } from "lucide-react";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import { fetchSwapRequests, managerDecisionSwapRequest } from "../Store/Features/swapRequestsSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
};

const Swaps = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.swapRequests);
  const userId = useSelector((state) => state.auth?.user?._id);

  useEffect(() => {
    dispatch(fetchSwapRequests());
  }, [dispatch]);

  const decide = async (id, approve) => {
    const result = await dispatch(managerDecisionSwapRequest({ id, approve, manager_id: userId }));
    if (managerDecisionSwapRequest.fulfilled.match(result)) {
      message.success(approve ? "Swap approved" : "Swap rejected");
    } else {
      message.error(result?.payload || "Failed to submit decision");
    }
  };

  const rows = useMemo(
    () =>
      list.map((item) => ({
        key: item?._id || item?.id,
        requester: item?.requested_by?.name || item?.requester?.name || "Unknown",
        target: item?.target_user_id?.name || item?.target_user?.name || "Unassigned",
        shift: item?.shift_id?.name || item?.shift_id?._id || "N/A",
        requestedAt: formatDateTime(item?.createdAt || item?.created_at),
        status: item?.status || "pending",
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
        row.status === "pending" ? (
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

  return (
    <ModuleLayoutsOne
      title="Shift Swap Queue"
      subtitle="Review and resolve pending staff swap requests."
      headerAction={
        <div className="inline-flex items-center px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold">
          Pending: {rows.filter((row) => row.status === "pending").length}
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
