// Lightweight client-side timing for the Razorpay checkout flow.
// Logs each step with the delta since the previous step and the total elapsed
// time since the button click. No behavioural side effects.

const now = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const ms = (v: number) => `${v.toFixed(1)}ms`;

export type PayTimer = {
  mark: (step: string, detail?: Record<string, unknown>) => void;
  end: (step: string, detail?: Record<string, unknown>) => void;
};

export function createPayTimer(label: string): PayTimer {
  const start = now();
  let last = start;
  let ended = false;

  const log = (step: string, detail?: Record<string, unknown>) => {
    const t = now();
    const step_ms = t - last;
    const total_ms = t - start;
    last = t;
    // eslint-disable-next-line no-console
    console.log(
      `[razorpay-perf] ${label} → ${step} | step ${ms(step_ms)} | total ${ms(total_ms)}`,
      detail ?? "",
    );
  };

  return {
    mark: log,
    end: (step, detail) => {
      if (ended) return;
      ended = true;
      log(step, detail);
    },
  };
}

/** Times the module-level script load once, even when several callers await it. */
export function timeScriptLoad(promise: Promise<void>, alreadyLoaded: boolean): Promise<void> {
  if (alreadyLoaded) {
    // eslint-disable-next-line no-console
    console.log("[razorpay-perf] checkout.js already loaded (cache hit, 0ms)");
    return promise;
  }
  const t0 = now();
  // eslint-disable-next-line no-console
  console.log("[razorpay-perf] checkout.js load: start");
  return promise.then(
    (v) => {
      // eslint-disable-next-line no-console
      console.log(`[razorpay-perf] checkout.js load: done | ${ms(now() - t0)}`);
      return v;
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.log(`[razorpay-perf] checkout.js load: failed | ${ms(now() - t0)}`);
      throw err;
    },
  );
}
