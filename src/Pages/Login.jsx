import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card, Input, Typography } from "antd";
import { LockKeyhole, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearAuthError, fetchProfile, loginUser } from "../Store/Features/authSlice";

const { Title, Text } = Typography;

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  const onValueChange = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formValues.email.trim()) nextErrors.email = "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(formValues.email.trim())) nextErrors.email = "Enter a valid email";
    if (!formValues.password.trim()) nextErrors.password = "Password is required";
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const result = await dispatch(
      loginUser({
        email: formValues.email.trim(),
        password: formValues.password,
      }),
    );

    if (loginUser.fulfilled.match(result)) {
      await dispatch(fetchProfile());
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-[#fff8f2] via-[#fff] to-[#fff1e8]">
      <Card className="w-full max-w-md rounded-3xl shadow-xl border border-orange-100">
        <div className="mb-6">
          <Title level={3} className="!mb-1 !text-slate-900">
            Sign In
          </Title>
          <Text className="text-slate-500">Access your multi-location scheduler workspace.</Text>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Text className="text-xs font-bold uppercase tracking-wide text-slate-600">Email</Text>
            <Input
              size="large"
              prefix={<Mail size={14} color="#94a3b8" />}
              placeholder="you@company.com"
              value={formValues.email}
              onChange={(event) => onValueChange("email", event.target.value)}
              className="mt-1 rounded-xl"
            />
            {formErrors.email ? <p className="text-xs text-rose-500 mt-1">{formErrors.email}</p> : null}
          </div>

          <div>
            <Text className="text-xs font-bold uppercase tracking-wide text-slate-600">Password</Text>
            <Input.Password
              size="large"
              prefix={<LockKeyhole size={14} color="#94a3b8" />}
              placeholder="Enter password"
              value={formValues.password}
              onChange={(event) => onValueChange("password", event.target.value)}
              className="mt-1 rounded-xl"
            />
            {formErrors.password ? <p className="text-xs text-rose-500 mt-1">{formErrors.password}</p> : null}
          </div>

          {error ? <p className="text-sm text-rose-600 font-medium">{error}</p> : null}

          <Button type="primary" htmlType="submit" loading={loading} block size="large" className="!rounded-xl !font-bold">
            Login
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Login;
