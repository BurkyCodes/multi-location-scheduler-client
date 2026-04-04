import React from 'react';
import { Pagination } from 'antd';

const TablePagination = ({ current, total, pageSize, onChange }) => (
  <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
    <div className="text-xs text-slate-500 font-medium">
      Showing {((current - 1) * pageSize) + 1} to {Math.min(current * pageSize, total)} of {total} entries
    </div>
    <Pagination
      current={current}
      total={total}
      pageSize={pageSize}
      onChange={onChange}
      showSizeChanger={false}
      size="small"
    />
  </div>
);

export default TablePagination;
