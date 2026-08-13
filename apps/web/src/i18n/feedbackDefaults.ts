import type { NFeedbackDefaults } from "najm-kit";

/**
 * Stable application-owned catalog mapping for Najm Kit feedback states.
 * The provider resolves these keys reactively through Kafil's active locale.
 */
export const KAFIL_FEEDBACK_DEFAULTS = {
  labelKeys: {
    loadingLabel: "state.loading",
    emptyTitle: "state.empty",
    errorTitle: "state.error",
    errorMessage: "state.retry",
    retryLabel: "action.retry",
    forbiddenTitle: "state.forbiddenTitle",
    forbiddenDescription: "state.forbiddenDescription",
    notFoundTitle: "state.notFoundTitle",
    notFoundDescription: "state.notFoundDescription",
  },
} satisfies NFeedbackDefaults;
