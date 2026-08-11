/**
 * auth.js
 * Frontend authentication: a React context that tracks who is logged in
 * (role + profile), backed by the session cookie the backend sets.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import * as api from "./services.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [role, setRole] = useState(null); // "admin" | "assistant" | "student" | null
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await api.getMe();
      if (data.authenticated) {
        setRole(data.role);
        setProfile(data.profile);
      } else {
        setRole(null);
        setProfile(null);
      }
    } catch {
      setRole(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const loginAsStaff = async (username, password) => {
    const data = await api.loginStaff(username, password);
    setRole(data.user.role);
    setProfile(data.user);
    return data.user;
  };

  const loginAsStudent = async (mobile, studentCode) => {
    const data = await api.loginStudent(mobile, studentCode);
    setRole("student");
    setProfile(data.student);
    return data.student;
  };

  const logout = async () => {
    await api.logout();
    setRole(null);
    setProfile(null);
  };

  // Written with createElement (not JSX) so this file can keep the plain
  // .js extension required by the project's file structure.
  return React.createElement(
    AuthContext.Provider,
    { value: { role, profile, loading, loginAsStaff, loginAsStudent, logout, refresh } },
    children
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
