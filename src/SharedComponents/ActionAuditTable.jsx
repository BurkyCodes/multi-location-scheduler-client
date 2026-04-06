import { Link } from "react-router-dom";

const relativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
};

const getActionLabel = (item) =>
  item?.action ||
  item?.event ||
  item?.activity ||
  item?.message ||
  item?.description ||
  "Activity recorded";

const getActionType = (item) =>
  item?.entity_type ||
  item?.resource ||
  item?.module ||
  item?.target_type ||
  "General";

const getActorLabel = (item) => {
  const actor = item?.performed_by || item?.actor_user_id || {};
  if (typeof actor === "string") return actor;
  return actor?.name || actor?.email || actor?.phone_number || "Unknown user";
};

const getActionLink = (item) => {
  const moduleValue = String(item?.module || item?.entity_type || "").toLowerCase();
  if (moduleValue.includes("shift") || moduleValue.includes("schedule")) return "/schedule";
  if (moduleValue.includes("staff") || moduleValue.includes("user")) return "/staff";
  if (moduleValue.includes("location")) return "/locations";
  if (moduleValue.includes("swap")) return "/swaps";
  return "/";
};

const ActionAuditTable = ({ items }) => {
  const hasItems = Array.isArray(items) && items.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base text-slate-900">Actions</h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
            {items?.length || 0}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[11px] font-bold">{items?.length || 0}</span>
        </div>
      </div>

      <div className="relative flex-1">
        <div className="overflow-y-auto max-h-[264px] space-y-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
          {!hasItems ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-400">
              No actions recorded yet
            </div>
          ) : (
            items.map((item, index) => {
              const action = getActionLabel(item);
              const actionType = getActionType(item);
              const actorLabel = getActorLabel(item);
              const isCreateAction = /create|add|publish/i.test(action);

              return (
                <Link
                  key={item?._id || item?.id || `${action}-${index}`}
                  to={getActionLink(item)}
                  className="flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2.5 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <span
                    className={`shrink-0 w-2.5 h-2.5 rounded-full ${
                      isCreateAction ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate text-slate-800"
                      title={action}
                    >
                      {action}
                    </p>
                    <p
                      className="text-xs text-slate-500 truncate"
                      title={`Performed by ${actorLabel}`}
                    >
                      Performed by {actorLabel}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      isCreateAction
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {actionType}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500 font-medium hidden sm:block">
                    {relativeTime(item?.createdAt || item?.created_at)}
                  </span>
                </Link>
              );
            })
          )}
        </div>
        {items?.length > 5 ? (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-xl" />
        ) : null}
      </div>
    </div>
  );
};

export default ActionAuditTable;
