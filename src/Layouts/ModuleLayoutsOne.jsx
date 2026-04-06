import { Button, Card, Spin, Table, Drawer } from "antd";
import { useEffect, useMemo, useState } from "react";
import StatCard from "../SharedComponents/StatCard";
import TablePagination from "../SharedComponents/TablePagination";
import { X } from "lucide-react";
import FiltersBar from "../SharedComponents/Filters/FiltersBar";
import DeleteConfirmModal from "../SharedComponents/Modals/DeleteConfirmModal";
import ListView from "../SharedComponents/Calendar/ListView";

const FONT = { fontFamily: "'Montserrat', sans-serif" };
const FONT_SM = { ...FONT, fontSize: 12 };
const FONT_XS = { ...FONT, fontSize: 11 };

// Primary colors defined by user
const COLORS = {
  black: "#0B0B0B",
  white: "#FFFFFF",
  gray: "#f1f5f9",
  coralDark: "#533c2e",
  coralMid: "#a65430",
  coral: "#f6873a",
  coralSoft: "#fcbc5c",
  coralLight: "#ffd799",
};

const ModuleLayoutsOne = ({
  title,
  subtitle,
  headerAction,
  modalContent,
  modalTitle,
  modalSubtitle,
  modalWidth = 1000,
  modalIcon,
  editModalOpen,
  editModalTitle,
  editModalSubtitle,
  editModalContent,
  editModalWidth = 1000,
  onEditModalClose,
  editModalIcon,
  secondaryModalOpen,
  secondaryModalTitle,
  secondaryModalSubtitle,
  secondaryModalContent,
  secondaryModalWidth = 1000,
  onSecondaryModalClose,
  secondaryModalIcon,
  headerContent,
  stats,
  statsContent,
  filtersContent,
  filtersProps,
  tableTitle,
  totalRecords,
  tableContent,
  tableProps,
  pagination,
  tableHeaderBadges,
  tableHeaderAction,
  tableExtra,
  afterTableContent,
  enableListViewToggle,
  isTrashView,
  loading,
  deleteModalProps,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasManualViewSelection, setHasManualViewSelection] = useState(false);
  const [viewType, setViewType] = useState("list");

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const headerActionNode = useMemo(() => {
    if (typeof headerAction === "function") {
      return headerAction({ openModal, closeModal, isModalOpen });
    }
    return headerAction || null;
  }, [headerAction, isModalOpen]);

  const headerContentNode = useMemo(() => {
    if (!headerContent) return null;
    if (typeof headerContent === "function") {
      return headerContent({ openModal, closeModal, isModalOpen });
    }
    return headerContent;
  }, [headerContent, isModalOpen]);

  const shouldShowViewToggle = Boolean(enableListViewToggle || tableProps);
  const shouldUseTablePropsRenderer = Boolean(tableProps);
  const tableContentNode =
    typeof tableContent === "function"
      ? tableContent({ viewType, setViewType })
      : tableContent;
  const shouldRenderTableSection = Boolean(
    tableContentNode ||
      shouldUseTablePropsRenderer ||
      tableTitle ||
      tableHeaderBadges?.length ||
      tableHeaderAction ||
      tableExtra ||
      typeof totalRecords === "number",
  );

  useEffect(() => {
    const handleResize = () => {
      if (!hasManualViewSelection) {
        setViewType("list");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hasManualViewSelection]);

  return (
    <div className="space-y-6" style={{ backgroundColor: COLORS.white, minHeight: '100%' }}>
      {headerContent ? (
        headerContentNode
      ) : (
        (title || subtitle || headerAction) && (
        <div className="flex md:items-center md:flex-row flex-col items-start gap-2 md:gap-0 justify-between px-2 pt-2">
          <div className="flex flex-col">
            {title && (
              <p className="text-xl font-extrabold" style={{ ...FONT, color: COLORS.black }}>
                {title}
              </p>
            )}
            {subtitle && (
              <p className="mt-1" style={{ ...FONT_SM, color: "#64748b" }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerActionNode}
        </div>
        )
      )}

      {statsContent ? (
        statsContent
      ) : Array.isArray(stats) && stats.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          {stats.map((item, index) => (
            <StatCard 
              key={item?.key || index} 
              {...item} 
            />
          ))}
        </div>
      ) : null}

      {filtersContent ? (
        <div className="px-2">
          <Card className="shadow-sm border-none rounded-2xl" style={{ backgroundColor: "#f8fafc", border: "1px solid #f1f5f9" }}>{filtersContent}</Card>
        </div>
      ) : filtersProps ? (
        <div className="px-2">
          <Card className="shadow-sm border-none rounded-2xl" bodyStyle={{ padding: 0 }} style={{ backgroundColor: "#f8fafc", border: "1px solid #f1f5f9" }}>
            <FiltersBar {...filtersProps} />
          </Card>
        </div>
      ) : null}

      {shouldRenderTableSection ? (
        <div className="px-2">
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-sm border"
            style={{ backgroundColor: COLORS.white, borderColor: "#f1f5f9" }}
          >
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold" style={{ ...FONT, color: COLORS.black }}>
                  {tableTitle || (isTrashView ? "Deleted" : "All Records")}
                </h3>
                {loading ? (
                  <Spin size="small" />
                ) : tableHeaderBadges && tableHeaderBadges.length ? (
                  tableHeaderBadges.map((badge, index) => (
                    <span
                      key={badge?.key || index}
                      className={
                        badge?.className ||
                        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                      }
                      style={{
                        backgroundColor: "#fff7ed",
                        color: COLORS.coral,
                        border: `1px solid #ffedd5`,
                        ...FONT
                      }}
                    >
                      {badge?.text}
                    </span>
                  ))
                ) : (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                    style={{ ...FONT, backgroundColor: "#fff7ed", color: COLORS.coral, border: `1px solid #ffedd5` }}
                  >
                    {(totalRecords || 0).toLocaleString()} total
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {shouldShowViewToggle ? (
                  <>
                    <Button
                      htmlType="button"
                      type={viewType === "table" ? "primary" : "default"}
                      size="small"
                      onClick={() => {
                        setHasManualViewSelection(true);
                        setViewType("table");
                      }}
                    >
                      Table
                    </Button>
                    <Button
                      htmlType="button"
                      type={viewType === "list" ? "primary" : "default"}
                      size="small"
                      onClick={() => {
                        setHasManualViewSelection(true);
                        setViewType("list");
                      }}
                    >
                      List
                    </Button>
                  </>
                ) : null}
                {tableHeaderAction || tableExtra || null}
              </div>
            </div>

            {tableContentNode ||
              (shouldUseTablePropsRenderer ? (
                <>
                  {viewType === "table" ? (
                    <Table
                      {...tableProps}
                      pagination={false}
                      size={tableProps.size || "middle"}
                      style={tableProps.style || FONT}
                      rowClassName={
                        tableProps.rowClassName ||
                        (() => "transition-colors cursor-pointer")
                      }
                      scroll={tableProps.scroll || { x: 1100, y: 520 }}
                    />
                  ) : (
                    <ListView
                      columns={tableProps.columns || []}
                      dataSource={tableProps.dataSource || []}
                      rowKey={tableProps.rowKey || "key"}
                      loading={Boolean(tableProps.loading)}
                      onRowClick={(row) => {
                        const onRowConfig =
                          typeof tableProps.onRow === "function"
                            ? tableProps.onRow(row)
                            : null;
                        if (typeof onRowConfig?.onClick === "function") {
                          onRowConfig.onClick();
                        }
                      }}
                    />
                  )}
                  {pagination ? <TablePagination {...pagination} /> : null}
                </>
              ) : null)}
          </div>
        </div>
      ) : null}

      {afterTableContent ? (
        <div className="px-2">
          {typeof afterTableContent === "function"
            ? afterTableContent({ viewType, setViewType })
            : afterTableContent}
        </div>
      ) : null}

      {modalContent && (
        <Drawer
          open={isModalOpen}
          onClose={closeModal}
          width={modalWidth}
          placement="right"
          destroyOnClose
          closable={false}
          styles={{
            body: {
              padding: 0,
              display: "flex",
              flexDirection: "column",
              height: "100%",
              backgroundColor: COLORS.white,
              color: COLORS.black,
            },
            wrapper: { fontFamily: "'Montserrat', sans-serif" },
          }}
          title={null}
        >
          <div className="p-6 relative" style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <button
              type="button"
              style={{
                ...FONT_XS,
                height: 28,
                padding: "0 12px",
                borderRadius: 6,
                flexShrink: 0,
                border: "none",
                background: COLORS.coral,
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
                outline: "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
                position: "absolute",
                right: 24,
                top: 24,
              }}
              onClick={closeModal}
              aria-label="Close"
            >
              <X size={14} />
            </button>
            <div className="flex items-start gap-4">
              {modalIcon && (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${COLORS.coral} 0%, ${COLORS.coralSoft} 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 12px ${COLORS.coral}40`,
                    flexShrink: 0,
                    color: "#ffffff"
                  }}
                >
                  {modalIcon}
                </div>
              )}
              <div>
                {modalTitle && (
                  <h3 className="text-lg font-bold" style={{ ...FONT, color: COLORS.black }}>
                    {modalTitle}
                  </h3>
                )}
                {modalSubtitle && (
                  <p className="text-xs mt-1" style={{ ...FONT_SM, color: "#64748b" }}>
                    {modalSubtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-auto" style={{ backgroundColor: COLORS.white, color: COLORS.black }}>
            {typeof modalContent === "function"
              ? modalContent({ closeModal })
              : modalContent}
          </div>
        </Drawer>
      )}

      {/* Edit and Secondary drawers following same pattern */}
      {[
        { open: editModalOpen, close: onEditModalClose, title: editModalTitle, sub: editModalSubtitle, content: editModalContent, icon: editModalIcon, width: editModalWidth },
        { open: secondaryModalOpen, close: onSecondaryModalClose, title: secondaryModalTitle, sub: secondaryModalSubtitle, content: secondaryModalContent, icon: secondaryModalIcon, width: secondaryModalWidth }
      ].map((m, idx) => m.content && (
        <Drawer
          key={idx}
          open={Boolean(m.open)}
          onClose={m.close}
          width={m.width}
          placement="right"
          destroyOnClose
          closable={false}
          styles={{
            body: { padding: 0, display: "flex", flexDirection: "column", height: "100%", backgroundColor: COLORS.white, color: COLORS.black },
            wrapper: { fontFamily: "'Montserrat', sans-serif" },
          }}
          title={null}
        >
          <div className="p-6 relative" style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <button
              type="button"
              style={{ ...FONT_XS, height: 28, padding: "0 12px", borderRadius: 6, border: "none", background: COLORS.coral, color: "#ffffff", fontWeight: 700, cursor: "pointer", position: "absolute", right: 24, top: 24, display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={m.close}
            >
              <X size={14} />
            </button>
            <div className="flex items-start gap-4">
              {m.icon && (
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${idx === 0 ? COLORS.coral : COLORS.coralMid} 0%, ${idx === 0 ? COLORS.coralSoft : COLORS.coral} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${COLORS.coral}40`, flexShrink: 0, color: "#ffffff" }}>
                  {m.icon}
                </div>
              )}
              <div>
                {m.title && <h3 className="text-lg font-bold" style={{ ...FONT, color: COLORS.black }}>{m.title}</h3>}
                {m.sub && <p className="text-xs mt-1" style={{ ...FONT_SM, color: "#64748b" }}>{m.sub}</p>}
              </div>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-auto" style={{ backgroundColor: COLORS.white, color: COLORS.black }}>
            {typeof m.content === "function" ? m.content({ closeModal: m.close }) : m.content}
          </div>
        </Drawer>
      ))}

      <style>{`
        .ant-table-wrapper .ant-table {
          background: transparent !important;
          color: ${COLORS.black} !important;
        }
        .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #64748b !important;
          border-bottom: 1px solid #f1f5f9 !important;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
        }
        .ant-table-tbody > tr > td {
          color: ${COLORS.black} !important;
          border-bottom: 1px solid #f1f5f9 !important;
          background: transparent !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: #f8fafc !important;
        }
      `}</style>

      {deleteModalProps ? <DeleteConfirmModal {...deleteModalProps} /> : null}
    </div>
  );
};

export default ModuleLayoutsOne;
