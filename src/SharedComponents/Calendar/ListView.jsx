import React from "react";
import { Avatar, Tooltip, Empty, Spin } from "antd";
import dayjs from "dayjs";
import { getEventColor, getAssigneeShortName } from "../../utils/crm-calendar";
import {
  UserOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  TagOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const getDataIndexValue = (row, dataIndex) => {
  if (!row || dataIndex === undefined || dataIndex === null) return undefined;
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce((acc, key) => (acc == null ? undefined : acc[key]), row);
  }
  return row[dataIndex];
};

const Card = ({ event, onClick, calendarMode }) => {
  const color = getEventColor(event.type);
  const shortName = getAssigneeShortName(event);
  const fullName =
    event.ownerUserId?.name ||
    event.ownerUserId?.username ||
    event.ownerUserId?.email ||
    "Unassigned";

  return (
    <div
      onClick={() => onClick(event)}
      className="bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 group flex flex-col overflow-hidden cursor-pointer"
    >
      <div
        className="h-1.5 bg-gradient-to-r from-[#3b82f6] to-[#2563eb]"
        style={{ background: color.bg }}
      />

      <div className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ backgroundColor: `${color.bg}80` }}
            >
              <CalendarOutlined style={{ color: color.text, fontSize: 18 }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors">
                {event.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <TagOutlined className="text-[10px] text-slate-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {event.type || "Event"}
                </span>
              </div>
            </div>
          </div>
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 uppercase tracking-tight"
            style={{
              backgroundColor: color.bg,
              color: color.text,
              borderColor: color.border,
            }}
          >
            {event.status || "Scheduled"}
          </span>
        </div>

        <div className="bg-slate-50 rounded-2xl p-3 mb-4 flex-1">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-slate-600">
              <ClockCircleOutlined className="text-blue-500 text-xs" />
              <span className="text-xs font-medium">
                {dayjs(event.startAt).format("h:mm A")} - {dayjs(event.endAt).format("h:mm A")}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-slate-600">
              <CalendarOutlined className="text-blue-500 text-xs" />
              <span className="text-xs font-medium">
                {dayjs(event.startAt).format("dddd, MMMM D, YYYY")}
              </span>
            </div>

            {event.location ? (
              <div className="flex items-center gap-2.5 text-slate-500">
                <EnvironmentOutlined className="text-blue-400 text-xs" />
                <span className="text-xs truncate">{event.location}</span>
              </div>
            ) : null}

            {event.description ? (
              <div className="flex items-start gap-2.5 mt-1 border-t border-slate-100 pt-2">
                <InfoCircleOutlined className="text-slate-300 text-xs mt-0.5" />
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                  {event.description}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
          {calendarMode === "team" ? (
            <div className="flex items-center gap-2">
              <Avatar
                size={24}
                icon={<UserOutlined />}
                src={event.ownerUserId?.avatar}
                className="border border-white shadow-sm"
              />
              <Tooltip title={fullName}>
                <span className="text-[11px] font-semibold text-slate-600">
                  {shortName || "Unassigned"}
                </span>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Personal
              </span>
            </div>
          )}

          <button className="text-[11px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

const TableListCard = ({ row, columns, rowIndex, onRowClick = () => {} }) => {
  const visibleColumns = columns.filter((column) => column && !column.hidden);

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 overflow-hidden"
      onClick={() => onRowClick(row)}
    >
      <div className="h-1.5 bg-gradient-to-r from-[#f6873a] to-[#fcbc5c]" />
      <div className="p-4 space-y-3">
        {visibleColumns.map((column, colIndex) => {
          const raw = getDataIndexValue(row, column.dataIndex);
          const content =
            typeof column.render === "function" ? column.render(raw, row, rowIndex) : raw;

          return (
            <div key={column.key || column.dataIndex || colIndex} className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {typeof column.title === "string" ? column.title : column.key || "Field"}
              </p>
              <div className="text-xs font-medium text-slate-700 break-words">
                {content ?? "N/A"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ListView = ({
  events = [],
  onEventClick = () => {},
  calendarMode = "personal",
  columns = [],
  dataSource = [],
  rowKey = "key",
  onRowClick = () => {},
  loading = false,
}) => {
  const isTableDataMode = Boolean(columns?.length);
  const sortedEvents = [...events].sort(
    (a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf(),
  );
  const listRows = Array.isArray(dataSource) ? dataSource : [];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-slate-50/30">
        <Spin />
      </div>
    );
  }

  if (isTableDataMode) {
    if (!listRows.length) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50/30">
          <Empty
            description={<span className="text-slate-400 font-medium">No records to display</span>}
          />
        </div>
      );
    }

    return (
      <div className="p-6 bg-slate-50/30 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {listRows.map((row, index) => (
            <TableListCard
              key={String(getDataIndexValue(row, rowKey) ?? row.id ?? row._id ?? index)}
              row={row}
              columns={columns}
              rowIndex={index}
              onRowClick={onRowClick}
            />
          ))}
        </div>
      </div>
    );
  }

  if (sortedEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50/30">
        <Empty
          description={
            <span className="text-slate-400 font-medium">No events for this period</span>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50/30 flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {sortedEvents.map((event) => (
          <Card
            key={event._id || event.id}
            event={event}
            onClick={onEventClick}
            calendarMode={calendarMode}
          />
        ))}
      </div>
    </div>
  );
};

export default ListView;
