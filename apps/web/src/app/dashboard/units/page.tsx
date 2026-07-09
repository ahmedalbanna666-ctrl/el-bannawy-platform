"use client";

import { type ReactNode } from "react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@el-bannawy/shared";
import { TeacherUnitsView } from "./_components/teacher-units-view";
import { StudentUnitsView } from "./_components/student-units-view";

export default function UnitsPage(): ReactNode {
  const { can } = usePermissions();

  if (can(PERMISSIONS.UNITS_CREATE)) {
    return <TeacherUnitsView />;
  }

  return <StudentUnitsView />;
}
