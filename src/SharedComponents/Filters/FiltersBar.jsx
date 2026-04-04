import React from 'react';
import { Input, Select, Button, Space } from 'antd';
import { Search, Filter, RotateCcw } from 'lucide-react';

const FiltersBar = ({ onSearch, filters = [], onFilterChange, onReset }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white rounded-2xl">
    <div className="flex-1 min-w-[300px]">
      <Input
        placeholder="Search schedules, staff, or locations..."
        prefix={<Search size={16} className="text-slate-400" />}
        className="h-11 rounded-xl border-slate-200 hover:border-coral-400 focus:border-coral-500"
        onChange={(e) => onSearch && onSearch(e.target.value)}
      />
    </div>
    <div className="flex items-center gap-3">
      {filters.map((filter) => (
        <Select
          key={filter.key}
          placeholder={filter.label}
          className="h-11 min-w-[140px]"
          options={filter.options}
          onChange={(val) => onFilterChange && onFilterChange(filter.key, val)}
          allowClear
        />
      ))}
      <Button 
        icon={<RotateCcw size={16} />} 
        className="h-11 rounded-xl border-slate-200 text-slate-500 hover:text-coral-500 hover:border-coral-500"
        onClick={onReset}
      >
        Reset
      </Button>
    </div>
  </div>
);

export default FiltersBar;
