import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card, InputNumber } from "antd";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import {
  fetchStaffPreferenceByUser,
  upsertStaffPreference,
} from "../Store/Features/preferencesSlice";

const clampNonNegative = (value, fallback = 0) => {
  const next = Number(value);
  if (Number.isNaN(next) || next < 0) return fallback;
  return next;
};

const StaffPreferences = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id;
  const saving = useSelector((state) => state.preferences.loading || state.preferences.saving);
  const existing = useSelector((state) => state.preferences.staffByUser[userId]);

  const defaultValues = useMemo(
    () => ({
      desired_hours_per_week: clampNonNegative(existing?.desired_hours_per_week, 40),
      max_hours_per_week: clampNonNegative(existing?.max_hours_per_week, 40),
      min_hours_per_week: clampNonNegative(existing?.min_hours_per_week, 0),
    }),
    [existing],
  );

  const [values, setValues] = useState(defaultValues);

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchStaffPreferenceByUser(userId));
  }, [dispatch, userId]);

  useEffect(() => {
    setValues(defaultValues);
  }, [defaultValues]);

  const savePreferences = async () => {
    if (!userId) return;

    if (values.min_hours_per_week > values.max_hours_per_week) {
      toast.error("Minimum hours cannot be greater than maximum hours");
      return;
    }

    const result = await dispatch(
      upsertStaffPreference({
        user_id: userId,
        desired_hours_per_week: clampNonNegative(values.desired_hours_per_week, 40),
        max_hours_per_week: clampNonNegative(values.max_hours_per_week, 40),
        min_hours_per_week: clampNonNegative(values.min_hours_per_week, 0),
      }),
    );

    if (upsertStaffPreference.fulfilled.match(result)) {
      toast.success("Staff preferences saved");
    } else {
      toast.error(result?.payload || "Failed to save staff preferences");
    }
  };

  return (
    <ModuleLayoutsOne
      title="My Staff Preferences"
      subtitle="Set your weekly scheduling preference limits."
      headerAction={
        <Button type="primary" className="h-10 rounded-xl font-bold" loading={saving} onClick={savePreferences}>
          Save Preferences
        </Button>
      }
      tableContent={
        <div className="p-6">
          <Card className="rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal size={16} color="#f6873a" />
              <h3 className="text-sm font-bold text-slate-900 m-0">Weekly Hours Preferences</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Desired Hours / Week
                </label>
                <InputNumber
                  className="mt-1 w-full rounded-xl"
                  min={0}
                  step={1}
                  value={values.desired_hours_per_week}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, desired_hours_per_week: clampNonNegative(value, 40) }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Max Hours / Week
                </label>
                <InputNumber
                  className="mt-1 w-full rounded-xl"
                  min={0}
                  step={1}
                  value={values.max_hours_per_week}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, max_hours_per_week: clampNonNegative(value, 40) }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Min Hours / Week
                </label>
                <InputNumber
                  className="mt-1 w-full rounded-xl"
                  min={0}
                  step={1}
                  value={values.min_hours_per_week}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, min_hours_per_week: clampNonNegative(value, 0) }))
                  }
                />
              </div>
            </div>
          </Card>
        </div>
      }
    />
  );
};

export default StaffPreferences;
