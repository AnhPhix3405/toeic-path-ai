import { describe, it, expect } from "vitest";
import {
  publicNavItems,
  studentNavSections,
  teacherNavSections,
  adminNavSections,
  getNavSectionsForRole,
} from "@/config/navigation";

describe("Navigation Configuration", () => {
  it("provides valid public navigation items with title, href and icon", () => {
    expect(publicNavItems.length).toBeGreaterThan(0);
    publicNavItems.forEach((item) => {
      expect(item.title).toBeTruthy();
      expect(item.href).toMatch(/^\//);
      expect(item.icon).toBeDefined();
    });
  });

  it("provides student navigation sections with dashboard, exams and ai-tutor", () => {
    const studentHrefs = studentNavSections.flatMap((sec) => sec.items.map((i) => i.href));
    expect(studentHrefs).toContain("/dashboard");
    expect(studentHrefs).toContain("/exams");
    expect(studentHrefs).toContain("/practice");
    expect(studentHrefs).toContain("/ai-tutor");
  });

  it("provides teacher navigation sections with questions and exams", () => {
    const teacherHrefs = teacherNavSections.flatMap((sec) => sec.items.map((i) => i.href));
    expect(teacherHrefs).toContain("/teacher-dashboard");
    expect(teacherHrefs).toContain("/questions");
    expect(teacherHrefs).toContain("/exams");
  });

  it("provides admin navigation sections with users, audit-logs and roles", () => {
    const adminHrefs = adminNavSections.flatMap((sec) => sec.items.map((i) => i.href));
    expect(adminHrefs).toContain("/admin-dashboard");
    expect(adminHrefs).toContain("/users");
    expect(adminHrefs).toContain("/audit-logs");
  });

  it("returns correct navigation sections based on UserRole via getNavSectionsForRole", () => {
    expect(getNavSectionsForRole("student")).toEqual(studentNavSections);
    expect(getNavSectionsForRole("teacher")).toEqual(teacherNavSections);
    expect(getNavSectionsForRole("admin")).toEqual(adminNavSections);
    expect(getNavSectionsForRole("guest")).toEqual([]);
  });
});
