import { useEffect, useMemo, useState } from "react";
import { Button, Tabs } from "antd";
import { BadgeCheck, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import ReusableSlideForm from "../SharedComponents/Forms/ReusableSlideForm";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";
import {
  createCertification,
  deleteCertification,
  fetchCertifications,
  updateCertification,
} from "../Store/Features/certificationsSlice";
import {
  createSkill,
  createStaffSkill,
  deleteStaffSkill,
  fetchSkills,
  fetchStaffSkills,
} from "../Store/Features/skillsSlice";
import { fetchStaff } from "../Store/Features/staffSlice";
import { fetchLocations } from "../Store/Features/locationsSlice";
import { hasRole } from "../Utils/roles";

const getId = (value) => (typeof value === "object" ? value?._id || value?.id : value);

const CERT_TAB = "certifications";
const SKILL_TAB = "skills";
const STAFF_SKILL_TAB = "staffSkills";

const Certifications = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const certificationsState = useSelector((state) => state.certifications);
  const skillsState = useSelector((state) => state.skills);
  const staff = useSelector((state) => state.staff.list);
  const locations = useSelector((state) => state.locations.list);

  const isAdmin = hasRole(user, ["admin"]);
  const isManager = hasRole(user, ["manager"]);
  const isStaff = hasRole(user, ["staff"]);
  const canManageCertifications = isAdmin || isManager;

  const [activeTab, setActiveTab] = useState(CERT_TAB);
  const [formValues, setFormValues] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [editingCertification, setEditingCertification] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchCertifications());
    dispatch(fetchSkills());
    dispatch(fetchStaffSkills());
    dispatch(fetchStaff());
    dispatch(fetchLocations());
  }, [dispatch]);

  const staffById = useMemo(
    () =>
      (staff || []).reduce((acc, item) => {
        acc[String(getId(item))] = item;
        return acc;
      }, {}),
    [staff],
  );

  const locationById = useMemo(
    () =>
      (locations || []).reduce((acc, item) => {
        acc[String(getId(item))] = item;
        return acc;
      }, {}),
    [locations],
  );

  const skillById = useMemo(
    () =>
      (skillsState.skills || []).reduce((acc, item) => {
        acc[String(getId(item))] = item;
        return acc;
      }, {}),
    [skillsState.skills],
  );

  const staffOptions = useMemo(
    () =>
      (staff || []).map((item) => ({
        value: String(getId(item)),
        label: item?.name || item?.email || "Staff User",
      })),
    [staff],
  );

  const locationOptions = useMemo(
    () =>
      (locations || []).map((item) => ({
        value: String(getId(item)),
        label: item?.name || item?.code || "Location",
      })),
    [locations],
  );

  const skillOptions = useMemo(
    () =>
      (skillsState.skills || []).map((item) => ({
        value: String(getId(item)),
        label: item?.name || item?.code || "Skill",
      })),
    [skillsState.skills],
  );

  const certificationRows = useMemo(() => {
    const base = certificationsState.list || [];
    const visible = isStaff
      ? base.filter((item) => String(getId(item?.user_id)) === String(user?._id))
      : base;

    return visible.map((item) => {
      const staffId = String(getId(item?.user_id));
      const locationId = String(getId(item?.location_id));
      const managerId = String(getId(item?.certified_by));

      return {
        key: String(getId(item)),
        raw: item,
        staffName: staffById[staffId]?.name || item?.user_id?.name || "Unknown Staff",
        locationName: locationById[locationId]?.name || item?.location_id?.name || "Unknown Location",
        certifiedBy: staffById[managerId]?.name || item?.certified_by?.name || "System",
        certifiedAt: item?.certified_at ? new Date(item.certified_at).toLocaleString() : "N/A",
        status: item?.is_active ? "active" : "inactive",
      };
    });
  }, [certificationsState.list, isStaff, locationById, staffById, user?._id]);

  const skillRows = useMemo(
    () =>
      (skillsState.skills || []).map((item) => ({
        key: String(getId(item)),
        raw: item,
        name: item?.name || "Unnamed Skill",
        code: item?.code || "N/A",
        description: item?.description || "No description",
        status: item?.is_active === false ? "inactive" : "active",
      })),
    [skillsState.skills],
  );

  const staffSkillRows = useMemo(() => {
    const base = skillsState.staffSkills || [];
    const visible = isStaff
      ? base.filter((item) => String(getId(item?.user_id)) === String(user?._id))
      : base;

    return visible.map((item) => {
      const staffId = String(getId(item?.user_id));
      const skillId = String(getId(item?.skill_id));

      return {
        key: String(getId(item)),
        raw: item,
        staffName: staffById[staffId]?.name || item?.user_id?.name || "Unknown Staff",
        skillName: skillById[skillId]?.name || item?.skill_id?.name || item?.skill_id?.code || "Unknown Skill",
        level: item?.level || item?.proficiency || "assigned",
        status: item?.is_active === false ? "inactive" : "active",
      };
    });
  }, [isStaff, skillById, skillsState.staffSkills, staffById, user?._id]);

  const certColumns = useMemo(() => {
    const cols = [
      {
        title: colTitle("Staff"),
        dataIndex: "staffName",
        key: "staffName",
        render: (value, row) => <ColumnData text={value} description={row.locationName} />,
      },
      {
        title: colTitle("Certified By"),
        dataIndex: "certifiedBy",
        key: "certifiedBy",
        render: (value, row) => <ColumnData text={value} description={row.certifiedAt} />,
      },
      {
        title: colTitle("Status"),
        dataIndex: "status",
        key: "status",
        render: (value) => <StatusBadge status={value} />,
      },
    ];

    if (canManageCertifications) {
      cols.push({
        title: colTitle("Action"),
        key: "action",
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <Button
              type="text"
              className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600"
              icon={<Pencil size={13} />}
              onClick={() => {
                const record = row.raw;
                setEditingCertification(row);
                setFormValues({
                  user_id: String(getId(record?.user_id) || ""),
                  location_id: String(getId(record?.location_id) || ""),
                  is_active: record?.is_active === false ? "false" : "true",
                });
                setFormErrors({});
                setEditOpen(true);
              }}
            />
            <Button
              danger
              type="text"
              className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600"
              icon={<Trash2 size={13} />}
              onClick={() => setDeleteTarget({ type: CERT_TAB, row })}
            />
          </div>
        ),
      });
    }

    return cols;
  }, [canManageCertifications]);

  const skillColumns = [
    {
      title: colTitle("Skill"),
      dataIndex: "name",
      key: "name",
      render: (value, row) => <ColumnData text={value} description={row.description} />,
    },
    {
      title: colTitle("Code"),
      dataIndex: "code",
      key: "code",
      render: (value) => <ColumnData text={value} />,
    },
    {
      title: colTitle("Status"),
      dataIndex: "status",
      key: "status",
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  const staffSkillColumns = useMemo(() => {
    const cols = [
      {
        title: colTitle("Staff"),
        dataIndex: "staffName",
        key: "staffName",
        render: (value) => <ColumnData text={value} />,
      },
      {
        title: colTitle("Skill"),
        dataIndex: "skillName",
        key: "skillName",
        render: (value, row) => <ColumnData text={value} description={`Level: ${row.level}`} />,
      },
      {
        title: colTitle("Status"),
        dataIndex: "status",
        key: "status",
        render: (value) => <StatusBadge status={value} />,
      },
    ];

    if (isManager) {
      cols.push({
        title: colTitle("Action"),
        key: "action",
        render: (_, row) => (
          <Button
            danger
            type="text"
            className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600"
            icon={<Trash2 size={13} />}
            onClick={() => setDeleteTarget({ type: STAFF_SKILL_TAB, row })}
          />
        ),
      });
    }

    return cols;
  }, [isManager]);

  const resetCreateForm = () => {
    if (activeTab === CERT_TAB) {
      setFormValues({ user_id: "", location_id: "", is_active: "true" });
      return;
    }
    if (activeTab === SKILL_TAB) {
      setFormValues({ name: "", code: "", description: "" });
      return;
    }
    setFormValues({ user_id: "", skill_id: "", level: "" });
  };

  useEffect(() => {
    resetCreateForm();
    setFormErrors({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const validate = () => {
    const errors = {};

    if (activeTab === CERT_TAB) {
      if (!formValues.user_id) errors.user_id = "Staff is required";
      if (!formValues.location_id) errors.location_id = "Location is required";
    }

    if (activeTab === SKILL_TAB) {
      if (!String(formValues.name || "").trim()) errors.name = "Skill name is required";
    }

    if (activeTab === STAFF_SKILL_TAB) {
      if (!formValues.user_id) errors.user_id = "Staff is required";
      if (!formValues.skill_id) errors.skill_id = "Skill is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (event, closeModal) => {
    event.preventDefault();
    if (!validate()) return;

    let result;

    if (activeTab === CERT_TAB) {
      result = await dispatch(
        createCertification({
          user_id: formValues.user_id,
          location_id: formValues.location_id,
          is_active: formValues.is_active !== "false",
          certified_by: user?._id,
        }),
      );
      if (createCertification.fulfilled.match(result)) {
        toast.success("Certification added");
      }
    }

    if (activeTab === SKILL_TAB) {
      result = await dispatch(
        createSkill({
          name: String(formValues.name || "").trim(),
          code: String(formValues.code || "").trim() || undefined,
          description: String(formValues.description || "").trim() || undefined,
        }),
      );
      if (createSkill.fulfilled.match(result)) {
        toast.success("Skill added");
      }
    }

    if (activeTab === STAFF_SKILL_TAB) {
      result = await dispatch(
        createStaffSkill({
          user_id: formValues.user_id,
          skill_id: formValues.skill_id,
          level: String(formValues.level || "").trim() || undefined,
          certified_by: user?._id,
        }),
      );
      if (createStaffSkill.fulfilled.match(result)) {
        toast.success("Staff skill assigned");
      }
    }

    if (result?.type?.endsWith("/fulfilled")) {
      resetCreateForm();
      closeModal();
      dispatch(fetchCertifications());
      dispatch(fetchSkills());
      dispatch(fetchStaffSkills());
    } else if (result) {
      toast.error(result?.payload || "Failed to save");
    }
  };

  const handleUpdateCertification = async (event) => {
    event.preventDefault();
    if (!editingCertification) return;

    if (!formValues.user_id || !formValues.location_id) {
      setFormErrors({
        user_id: formValues.user_id ? undefined : "Staff is required",
        location_id: formValues.location_id ? undefined : "Location is required",
      });
      return;
    }

    const result = await dispatch(
      updateCertification({
        id: editingCertification.key,
        user_id: formValues.user_id,
        location_id: formValues.location_id,
        is_active: formValues.is_active !== "false",
        certified_by: user?._id,
      }),
    );

    if (updateCertification.fulfilled.match(result)) {
      toast.success("Certification updated");
      setEditOpen(false);
      setEditingCertification(null);
      dispatch(fetchCertifications());
    } else {
      toast.error(result?.payload || "Failed to update certification");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === CERT_TAB) {
      const result = await dispatch(deleteCertification(deleteTarget.row.key));
      if (deleteCertification.fulfilled.match(result)) {
        toast.success("Certification deleted");
      } else {
        toast.error(result?.payload || "Failed to delete certification");
        return;
      }
    }

    if (deleteTarget.type === STAFF_SKILL_TAB) {
      const result = await dispatch(deleteStaffSkill(deleteTarget.row.key));
      if (deleteStaffSkill.fulfilled.match(result)) {
        toast.success("Staff skill removed");
      } else {
        toast.error(result?.payload || "Failed to remove staff skill");
        return;
      }
    }

    setDeleteTarget(null);
  };

  const createFields = useMemo(() => {
    if (activeTab === CERT_TAB) {
      return [
        { name: "user_id", label: "Staff", type: "select", options: staffOptions, required: true },
        {
          name: "location_id",
          label: "Location",
          type: "select",
          options: locationOptions,
          required: true,
        },
        {
          name: "is_active",
          label: "Status",
          type: "select",
          options: [
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ],
          required: true,
        },
      ];
    }

    if (activeTab === SKILL_TAB) {
      return [
        { name: "name", label: "Skill Name", required: true, placeholder: "e.g. Espresso Machine" },
        { name: "code", label: "Skill Code", placeholder: "e.g. ESP" },
        { name: "description", label: "Description", type: "textarea" },
      ];
    }

    return [
      { name: "user_id", label: "Staff", type: "select", options: staffOptions, required: true },
      { name: "skill_id", label: "Skill", type: "select", options: skillOptions, required: true },
      { name: "level", label: "Level", placeholder: "e.g. beginner, intermediate, expert" },
    ];
  }, [activeTab, locationOptions, skillOptions, staffOptions]);

  const canOpenCreateModal =
    (activeTab === CERT_TAB && canManageCertifications) ||
    (activeTab === SKILL_TAB && isAdmin) ||
    (activeTab === STAFF_SKILL_TAB && isManager);

  const tablePropsByTab = {
    [CERT_TAB]: { columns: certColumns, dataSource: certificationRows },
    [SKILL_TAB]: { columns: skillColumns, dataSource: skillRows },
    [STAFF_SKILL_TAB]: { columns: staffSkillColumns, dataSource: staffSkillRows },
  };

  const tableTitleByTab = {
    [CERT_TAB]: "Location Certifications",
    [SKILL_TAB]: "Skill Catalog",
    [STAFF_SKILL_TAB]: "Staff Skills",
  };

  const modalTitleByTab = {
    [CERT_TAB]: "Add Certification",
    [SKILL_TAB]: "Add Skill",
    [STAFF_SKILL_TAB]: "Assign Staff Skill",
  };

  const modalSubtitleByTab = {
    [CERT_TAB]: "Admins and managers can create and maintain location certifications.",
    [SKILL_TAB]: "Admins can add available skills for the organization.",
    [STAFF_SKILL_TAB]: "Managers can assign skills to staff members.",
  };

  return (
    <ModuleLayoutsOne
      title="Certifications & Skills"
      subtitle="Manager handles certifications and staff skills. Admin adds skills. Staff has read-only self view."
      headerContent={({ openModal }) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xl font-extrabold">Certifications & Skills</p>
              <p className="text-xs text-slate-500">
                Admins/managers handle certifications. Managers handle staff skills. Staff has read-only self view.
              </p>
            </div>
            {canOpenCreateModal ? (
              <Button
                type="primary"
                icon={<Plus size={14} />}
                className="h-10 rounded-xl font-bold"
                onClick={() => {
                  resetCreateForm();
                  setFormErrors({});
                  openModal();
                }}
              >
                {activeTab === CERT_TAB ? "Add Certification" : activeTab === SKILL_TAB ? "Add Skill" : "Assign Skill"}
              </Button>
            ) : null}
          </div>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: CERT_TAB, label: "Certifications" },
              { key: SKILL_TAB, label: "Skills" },
              { key: STAFF_SKILL_TAB, label: "Staff Skills" },
            ]}
          />
        </div>
      )}
      tableTitle={tableTitleByTab[activeTab]}
      totalRecords={tablePropsByTab[activeTab].dataSource.length}
      tableProps={{
        ...tablePropsByTab[activeTab],
        loading: certificationsState.loading || skillsState.loading,
      }}
      modalTitle={modalTitleByTab[activeTab]}
      modalSubtitle={modalSubtitleByTab[activeTab]}
      modalIcon={activeTab === SKILL_TAB ? <Wrench size={20} /> : <BadgeCheck size={20} />}
      modalContent={({ closeModal }) => (
        <ReusableSlideForm
          title={modalTitleByTab[activeTab]}
          subtitle={modalSubtitleByTab[activeTab]}
          icon={activeTab === SKILL_TAB ? Wrench : BadgeCheck}
          fields={createFields}
          values={formValues}
          errors={formErrors}
          loading={certificationsState.saving || skillsState.saving}
          submitLabel="Save"
          onValueChange={(name, value) => {
            setFormValues((prev) => ({ ...prev, [name]: value }));
            setFormErrors((prev) => ({ ...prev, [name]: undefined }));
          }}
          onSubmit={(event) => handleCreate(event, closeModal)}
          onCancel={closeModal}
        />
      )}
      editModalOpen={editOpen}
      onEditModalClose={() => {
        setEditOpen(false);
        setEditingCertification(null);
        setFormErrors({});
      }}
      editModalTitle="Edit Certification"
      editModalSubtitle="Update certification status or assignment."
      editModalIcon={<Pencil size={20} />}
      editModalContent={() => (
        <ReusableSlideForm
          title="Edit Certification"
          subtitle="Managers can edit certification and active state."
          icon={BadgeCheck}
          fields={[
            { name: "user_id", label: "Staff", type: "select", options: staffOptions, required: true },
            {
              name: "location_id",
              label: "Location",
              type: "select",
              options: locationOptions,
              required: true,
            },
            {
              name: "is_active",
              label: "Status",
              type: "select",
              options: [
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ],
              required: true,
            },
          ]}
          values={formValues}
          errors={formErrors}
          loading={certificationsState.saving}
          submitLabel="Update"
          onValueChange={(name, value) => {
            setFormValues((prev) => ({ ...prev, [name]: value }));
            setFormErrors((prev) => ({ ...prev, [name]: undefined }));
          }}
          onSubmit={handleUpdateCertification}
          onCancel={() => {
            setEditOpen(false);
            setEditingCertification(null);
          }}
        />
      )}
      deleteModalProps={
        deleteTarget
          ? {
              visible: Boolean(deleteTarget),
              onCancel: () => setDeleteTarget(null),
              onConfirm: handleDeleteConfirm,
              title: deleteTarget.type === CERT_TAB ? "Delete Certification" : "Remove Staff Skill",
              subtitle:
                deleteTarget.type === CERT_TAB
                  ? `Delete ${deleteTarget.row.staffName} certification at ${deleteTarget.row.locationName}?`
                  : `Remove ${deleteTarget.row.skillName} from ${deleteTarget.row.staffName}?`,
            }
          : null
      }
    />
  );
};

export default Certifications;
