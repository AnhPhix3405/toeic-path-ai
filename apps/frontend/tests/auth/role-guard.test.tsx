import * as React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAuthStore } from "@/stores/auth.store";
import type { UserProfile } from "@/types/api";

describe("RoleGuard Component", () => {
  const studentUser: UserProfile = {
    id: "stu-1",
    email: "student@toeicpath.ai",
    fullName: "Học Viên",
    role: "student",
    createdAt: "2026-10-06T00:00:00.000Z",
  };

  const teacherUser: UserProfile = {
    id: "tch-1",
    email: "teacher@toeicpath.ai",
    fullName: "Giảng Viên",
    role: "teacher",
    createdAt: "2026-10-06T00:00:00.000Z",
  };

  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("renders skeleton loader when auth state is loading", () => {
    useAuthStore.getState().setLoading(true);

    render(
      <RoleGuard allowedRoles={["student"]}>
        <div>Nội dung học viên</div>
      </RoleGuard>
    );

    expect(screen.getByTestId("role-guard-loading")).toBeInTheDocument();
    expect(screen.queryByText("Nội dung học viên")).not.toBeInTheDocument();
  });

  it("renders login required message when user is unauthenticated", () => {
    useAuthStore.getState().setLoading(false);

    render(
      <RoleGuard allowedRoles={["student"]}>
        <div>Nội dung học viên</div>
      </RoleGuard>
    );

    expect(screen.getByText("Yêu cầu đăng nhập")).toBeInTheDocument();
    expect(screen.queryByText("Nội dung học viên")).not.toBeInTheDocument();
  });

  it("renders unauthorized screen when user role is not allowed", () => {
    useAuthStore.getState().setAuth(studentUser, "mock-token");
    useAuthStore.getState().setLoading(false);

    render(
      <RoleGuard allowedRoles={["teacher", "admin"]}>
        <div>Khu vực soạn đề thi của Giảng viên</div>
      </RoleGuard>
    );

    expect(screen.getByText("Không đủ quyền truy cập")).toBeInTheDocument();
    expect(
      screen.queryByText("Khu vực soạn đề thi của Giảng viên")
    ).not.toBeInTheDocument();
  });

  it("renders children when user role matches allowedRoles", () => {
    useAuthStore.getState().setAuth(teacherUser, "mock-token");
    useAuthStore.getState().setLoading(false);

    render(
      <RoleGuard allowedRoles={["teacher", "admin"]}>
        <div>Khu vực soạn đề thi của Giảng viên</div>
      </RoleGuard>
    );

    expect(
      screen.getByText("Khu vực soạn đề thi của Giảng viên")
    ).toBeInTheDocument();
    expect(screen.queryByText("Không đủ quyền truy cập")).not.toBeInTheDocument();
  });

  it("renders custom fallback when provided and unauthorized", () => {
    useAuthStore.getState().setAuth(studentUser, "mock-token");
    useAuthStore.getState().setLoading(false);

    render(
      <RoleGuard
        allowedRoles={["admin"]}
        fallback={<p>Custom Fallback: Bạn không phải Admin</p>}
      >
        <div>Trang Admin tối mật</div>
      </RoleGuard>
    );

    expect(
      screen.getByText("Custom Fallback: Bạn không phải Admin")
    ).toBeInTheDocument();
    expect(screen.queryByText("Trang Admin tối mật")).not.toBeInTheDocument();
  });
});
