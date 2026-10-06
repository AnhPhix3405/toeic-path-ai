import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

describe("Badge Component", () => {
  it("renders correctly with different status variants", () => {
    const { rerender } = render(<Badge variant="default">Full Test</Badge>);
    let badge = screen.getByText("Full Test");
    expect(badge).toHaveClass("bg-primary");

    rerender(<Badge variant="success">Hoàn thành</Badge>);
    badge = screen.getByText("Hoàn thành");
    expect(badge).toHaveClass("bg-success");

    rerender(<Badge variant="destructive">Chưa đạt</Badge>);
    badge = screen.getByText("Chưa đạt");
    expect(badge).toHaveClass("bg-destructive");
  });
});

describe("Avatar Component", () => {
  it("displays fallback text when no image is loaded", () => {
    render(
      <Avatar>
        <AvatarFallback>ST</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("ST")).toBeInTheDocument();
  });
});

describe("Skeleton Component", () => {
  it("renders with pulse animation and custom classes", () => {
    render(<Skeleton className="h-6 w-32" data-testid="test-skeleton" />);
    const skeleton = screen.getByTestId("test-skeleton");
    expect(skeleton).toHaveClass("animate-pulse");
    expect(skeleton).toHaveClass("h-6");
    expect(skeleton).toHaveClass("w-32");
  });
});

describe("Table Component", () => {
  it("renders table rows and cells properly", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã đề</TableHead>
            <TableHead>Số câu</TableHead>
            <TableHead>Thời gian</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>ETS-2024-TEST01</TableCell>
            <TableCell>200 câu</TableCell>
            <TableCell>120 phút</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText("Mã đề")).toBeInTheDocument();
    expect(screen.getByText("ETS-2024-TEST01")).toBeInTheDocument();
    expect(screen.getByText("200 câu")).toBeInTheDocument();
    expect(screen.getByText("120 phút")).toBeInTheDocument();
  });
});
