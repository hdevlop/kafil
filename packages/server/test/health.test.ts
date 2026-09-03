import { describe, expect, it } from "bun:test";
import { LoggerService } from "najm-core";
import { I18nService } from "najm-i18n";
import { McpRegistryService } from "najm-mcp";

import {
  KAFIL_DEFAULT_LANGUAGE,
  KAFIL_SUPPORTED_LANGUAGES,
  server,
  translations,
} from "../src";
import { databaseReadinessResponse } from "../src/modules/system/systemController";

describe("Kafil server", () => {
  it("uses readable logs unless structured JSON is explicitly requested", async () => {
    await server.init();
    const logger = server.container.get(LoggerService);

    expect(logger.getFormat()).toBe(
      process.env.LOG_FORMAT === "json" ? "json" : "pretty",
    );
  });

  it("serves health through the configured API base path", async () => {
    const response = await server.fetch(
      new Request("http://localhost/api/system/health"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      service: "kafil",
      status: "ok",
      version: "0.1.0",
    });
  });

  it("reports database-aware readiness without exposing connection errors", async () => {
    const ready = await databaseReadinessResponse(async () => ({ rows: [{ "?column?": 1 }] }));
    expect(ready.status).toBe(200);
    expect(ready.headers.get("cache-control")).toBe("no-store");
    expect(await ready.json()).toEqual({
      checks: { database: "ok" },
      service: "kafil",
      status: "ready",
      version: "0.1.0",
    });

    const unavailable = await databaseReadinessResponse(async () => {
      throw new Error("postgresql://secret@database/kafil");
    });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      checks: { database: "unavailable" },
      service: "kafil",
      status: "not_ready",
      version: "0.1.0",
    });
  });

  it("requires authentication before disclosing the MCP catalog", async () => {
    const discoveryResponse = await server.fetch(
      new Request("http://localhost/api/mcp/tools"),
    );

    expect(discoveryResponse.status).toBe(401);
  });

  it("registers all domain module tools internally", async () => {
    await server.init();
    const registry = server.container.get(McpRegistryService);

    expect(registry.tools.map((tool) => tool.name).sort()).toEqual([
      "admin-access_create_permission",
      "admin-access_deactivate",
      "admin-access_get_role",
      "admin-access_get_user",
      "admin-access_list_permissions",
      "admin-access_list_roles",
      "admin-access_list_users",
      "admin-access_reactivate",
      "admin-access_revoke_sessions",
      // `najm-theme` registers five tools under its own frozen names
      // (`najm-theme-api-freeze.md` §2.3), replacing Kafil's thirteen
      // controller-derived ones. There is deliberately no appearance-save and
      // no upload tool: uploads stay REST/binary rather than sending image
      // bytes as base64 through a transcript that is frequently logged.
      "budgets_get_own_summary",
      "budgets_list_own_ledger",
      "budgets_get_summary",
      "budgets_list_ledger",
      "budgets_set_monthly_limit",
      "budgets_adjust",
      "budgets_reconcile",
      "catalog_list_active_categories",
      "catalog_list_active_products",
      "catalog_get_active_product",
      "catalog_list_categories",
      "catalog_get_category",
      "catalog_list_products",
      "catalog_get_product",
      "catalog_create_category",
      "catalog_update_category",
      "catalog_activate_category",
      "catalog_deactivate_category",
      "catalog_create_product",
      "catalog_update_product",
      "catalog_activate_product",
      "catalog_deactivate_product",
      "catalog_delete_category",
      "catalog_delete_product",
      "children_list",
      "children_list_own",
      "children_get",
      "children_get_own",
      "children_create",
      "children_bulk_delete",
      "children_delete",
      "children_update",
      "children_deactivate",
      "children_reactivate",
      "contributions_list",
      "contributions_list_recording_options",
      "contributions_list_plans",
      "contributions_list_own",
      "contributions_get_own_summary",
      "contributions_list_own_plans",
      "contributions_get_own_plan",
      "contributions_get_own",
      "contributions_get",
      "contributions_create_plan",
      "contributions_pause_plan",
      "contributions_resume_plan",
      "contributions_stop_plan",
      "contributions_submit",
      "contributions_record",
      "contributions_validate",
      "contributions_reject",
      "contributions_refund",
      "contributions_bulk_delete",
      "contributions_delete",
      "dashboard_get_family",
      "dashboard_get_operator",
      "dashboard_get_sponsor",
      "documents_list",
      "documents_get",
      "documents_create",
      "documents_update",
      "documents_delete",
      "families_list",
      "families_get_own",
      "families_get",
"families_create",
      "families_bulk_delete",
      "families_delete",
      "families_update",
      "families_deactivate",
      "families_reactivate",
      "staff_list_delivery_options",
      "staff_list_operator_options",
      "staff_list",
      "staff_get",
      "staff_create",
      "staff_update",
      "staff_deactivate",
      "staff_reactivate",
      "staff_provision_operator_access",
      "staff_delete",
      "staff_bulk_delete",
      "orders_get_own_cart",
      "orders_add_cart_item",
      "orders_set_cart_item_quantity",
      "orders_remove_cart_item",
      "orders_clear_cart",
      "orders_submit",
      "orders_submit_assisted",
      "orders_list_own",
      "orders_get_own",
      "orders_cancel_own",
      "orders_list_supported",
      "orders_list",
      "orders_get",
      "orders_approve",
      "orders_assign_delivery",
      "orders_reject",
      "orders_record_purchase",
      "orders_replace_purchase",
      "orders_start_delivery",
      "orders_reassign_delivery",
      "orders_fail_delivery",
      "orders_confirm_delivery",
      "orders_deliver",
      "orders_cancel",
      "orders_delete",
      "order-evidence_list_orphans",
      "order-evidence_cleanup_orphans",
      "settings_get_settings",
      "settings_get_form_fill",
      "settings_update_settings",
      "sponsors_list",
      "sponsors_get_own",
      "sponsors_get",
      "sponsors_get_overview",
      "sponsors_create",
      "sponsors_create_own",
      "sponsors_bulk_delete",
      "sponsors_update",
      "sponsors_update_own",
      "sponsors_delete",
      "sponsors_deactivate",
      "sponsors_reactivate",
      "support-assignments_list",
      "support-assignments_list_own",
      "support-assignments_list_sponsor_family_catalog",
      "support-assignments_get_supported_family_summary",
      "support-assignments_get_supported_child_summary",
      "support-assignments_get_own",
      "support-assignments_select_family_for_sponsor",
      "support-assignments_get",
      "support-assignments_create",
      "support-assignments_update_notes",
      "support-assignments_end",
      "theme_appearance_get",
      "theme_appearance_reset",
      "theme_branding_get",
      "theme_preset_apply",
      "theme_presets_list",
    ].sort());
  });

  it("configures the SMS-style backend language contract", async () => {
    await server.init();
    const i18n = server.container.get(I18nService);

    expect(i18n.getDefaultLanguage()).toBe(KAFIL_DEFAULT_LANGUAGE);
    expect(i18n.getAvailableLanguages()).toEqual([
      ...KAFIL_SUPPORTED_LANGUAGES,
    ]);
    expect(Object.keys(translations).sort()).toEqual(
      [...KAFIL_SUPPORTED_LANGUAGES].sort(),
    );
    expect(translations.ar.auth.success.login).toBe(
      "تم تسجيل الدخول بنجاح",
    );
    expect(translations.fr.users.success.updated).toBe(
      "Utilisateur mis à jour avec succès",
    );
  });

  it("exposes Najm's authenticated language endpoints", async () => {
    const getResponse = await server.fetch(
      new Request("http://localhost/api/users/lang"),
    );
    const updateResponse = await server.fetch(
      new Request("http://localhost/api/users/lang/fr", {
        method: "POST",
      }),
    );

    expect(getResponse.status).toBe(401);
    expect(updateResponse.status).toBe(401);
  });
});
