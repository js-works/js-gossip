/**
 * The four severity levels shared across the library. Toasts extend this with an
 * extra `"loading"` state; dialogs use it as-is for their notices and default icons.
 */
export type Severity = "info" | "success" | "warn" | "error";
