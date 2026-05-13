/** Suppress Node DEP0169 (legacy `url.parse`) from dependencies so dev overlay stays usable. */

export async function register() {
  if (process.env.NODE_ENV !== "development") return;
  const orig = process.emitWarning;
  process.emitWarning = function suppressUrlParseDep(
    warning: string | Error,
    ...args: unknown[]
  ): void {
    const text =
      typeof warning === "string"
        ? warning
        : typeof warning === "object" && warning && "message" in warning
          ? String((warning as Error).message)
          : String(warning);
    const strArgs = args.filter((a): a is string => typeof a === "string");
    const joined = [text, ...strArgs].join(" ");
    if (joined.includes("DEP0169") && joined.includes("url.parse")) {
      return;
    }
    Reflect.apply(orig, process, [warning, ...args] as Parameters<
      typeof process.emitWarning
    >);
  };
}
