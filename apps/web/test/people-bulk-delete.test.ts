import { describe, expect, test } from "bun:test";

const pagePaths = [
  ["src/features/Children/components/ChildrenPage.tsx"],
  ["src/features/Sponsors/components/SponsorsPage.tsx"],
] as const;

const familySources = [
  "src/features/Families/hooks/useFamiliesTableProps.tsx",
  "src/features/Families/hooks/useFamiliesPageDialogs.tsx",
  "src/features/Families/components/FamilyForms/BulkDeleteFamiliesDialog.tsx",
] as const;

const apiPaths = [
  "src/services/familyApi.ts",
  "src/services/childApi.ts",
  "src/services/sponsorApi.ts",
] as const;

describe("people-list bulk deletion", () => {
  test("wires admin selection to the NTable keyboard bulk-delete callback", async () => {
    for (const paths of pagePaths) {
      const source = (
        await Promise.all(paths.map((path) => Bun.file(path).text()))
      ).join("\n");

      expect(source).toMatch(/showCheckbox:\s*is(?:Exact)?Admin/);
      expect(source).toContain("rowSelection,");
      expect(source).toContain("onRowSelectionChange: setRowSelection");
      expect(source).toMatch(/onBulkDelete:\s*is(?:Exact)?Admin/);
      expect(source).toContain("onDeleted={() => setRowSelection({})}");
      expect(source).toContain("bulkDeleteDialogOpenRef.current) return");
    }

    const familySource = (
      await Promise.all(familySources.map((path) => Bun.file(path).text()))
    ).join("\n");
    expect(familySource).toMatch(/showCheckbox:\s*is(?:Exact)?Admin/);
    expect(familySource).toContain("rowSelection,");
    expect(familySource).toContain("onRowSelectionChange: setRowSelection");
    expect(familySource).toMatch(/onBulkDelete:\s*is(?:Exact)?Admin/);
    expect(familySource).toContain(
      "openBulkDelete(ids, () => setRowSelection({}))",
    );
    expect(familySource).toContain("onDeleted={onDeleted}");
    expect(familySource).toContain("bulkDeleteDialogOpenRef.current) return");
  });

  test("prevents repeated contribution keyboard events and confirm clicks", async () => {
    const pageSource = await Bun.file(
      "src/features/Contributions/components/ContributionsPage.tsx",
    ).text();
    const formSource = await Bun.file(
      "src/features/Contributions/components/ContributionForms.tsx",
    ).text();

    expect(pageSource).toContain("bulkDeleteDialogOpenRef.current) return");
    expect(pageSource).toContain("bulkDeleteDialogOpenRef.current = true");
    expect(formSource).toContain("submittingRef.current) return");
    expect(formSource).toContain("submittingRef.current = true");
    expect(formSource).toContain("catch {");
  });

  test("sends each selected set through one backend bulk-delete request", async () => {
    for (const path of apiPaths) {
      const source = await Bun.file(path).text();

      expect(source).toContain('bulk-delete", { ids }');
    }
  });
});
