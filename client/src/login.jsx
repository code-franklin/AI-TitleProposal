import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import axios from "axios";

const LoginFunction = () => {
  const [form] = Form.useForm();
  const [clientReady, setClientReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem("user"));
    if (items) {
      setItems(items);
    }
  }, []);

  const handleLogin = async (values) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/login",
        {
          email: values.username,
          password: values.password,
        }
      );

      const { user } = response.data;
      localStorage.setItem("user", JSON.stringify(user));

      // Redirect based on user role
      if (user.role === "student") {
        window.location.href = "/Search"; // Update the path based on your routing setup
      } else if (user.role === "adviser") {
        window.location.href = "/Search"; // Update the path based on your routing setup
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        setErrorMessage("Your account is awaiting admin approval.");
      } else if (error.response && error.response.status === 400) {
        setErrorMessage("Invalid credentials.");
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
    }
  };

  useEffect(() => {
    setClientReady(true);
  }, []);

  return (
    <div>
      <h1>Sign in</h1>
      <h2>Explore more manuscripts</h2>

      <Form form={form} name="login" onFinish={handleLogin} layout="vertical">
        <Form.Item
          name="username"
          label="Username"
          rules={[
            {
              required: true,
              message: "Please input your username!",
            },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            {
              required: true,
              message: "Please input your password!",
            },
          ]}
        >
          <Input
            prefix={<LockOutlined />}
            type="password"
            placeholder="Password"
          />
        </Form.Item>

        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

        {items.email ? (
          <Form.Item shouldUpdate>
            {() => (
              <Button
                onClick={() => {
                  items.role === "student"
                    ? navigate("/Search")   
                    : navigate("/Search");
                }}
                disabled={
                  !clientReady ||
                  !form.isFieldsTouched(true) ||
                  !!form.getFieldsError().filter(({ errors }) => errors.length).length
                }
              >
                Go to Dashboard
              </Button>
            )}
          </Form.Item>
        ) : (
          <Form.Item shouldUpdate>
            {() => (
              <Button
                type="primary"
                htmlType="submit"
                disabled={
                  !clientReady ||
                  !form.isFieldsTouched(true) ||
                  !!form.getFieldsError().filter(({ errors }) => errors.length).length
                }
              >
                Login
              </Button>
            )}
          </Form.Item>
        )}
      </Form>

      <h3>
        <span>Don’t have an Account? </span>
        <Link to="/Register">Sign up here</Link>
      </h3>
    </div>
  );
};

export default LoginFunction;
