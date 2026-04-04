import React from 'react';
import { Modal, Button } from 'antd';
import { Trash2, AlertTriangle } from 'lucide-react';

const DeleteConfirmModal = ({ visible, onConfirm, onCancel, title = "Confirm Delete", subtitle = "Are you sure you want to delete this? This action cannot be undone." }) => (
  <Modal
    open={visible}
    onCancel={onCancel}
    footer={null}
    centered
    width={400}
    className="rounded-2xl overflow-hidden"
    closable={false}
  >
    <div className="p-6 text-center">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-8">{subtitle}</p>
      <div className="flex gap-3">
        <Button 
          className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 font-bold"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 border-none text-white font-bold"
          onClick={onConfirm}
        >
          Delete
        </Button>
      </div>
    </div>
  </Modal>
);

export default DeleteConfirmModal;
