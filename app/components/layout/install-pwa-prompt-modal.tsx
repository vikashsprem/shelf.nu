import { useRef } from "react";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { AnimatePresence, motion } from "framer-motion";
import type { loader } from "~/routes/_layout+/_layout";
import { usePwaManager } from "~/utils/pwa-manager";
import { Button } from "../shared/button";

export function InstallPwaPromptModal() {
  const { hideInstallPwaPrompt } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  let optimisticHideInstallPwaPrompt = hideInstallPwaPrompt;
  if (fetcher.formData) {
    optimisticHideInstallPwaPrompt =
      fetcher.formData.get("pwaPromptVisibility") === "hidden";
  }
  const hidePwaPromptForm = useRef<HTMLFormElement | null>(null);

  const { promptInstall } = usePwaManager();
  return optimisticHideInstallPwaPrompt ? null : (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="dialog-backdrop !items-end !bg-[#364054]/70">
          <dialog
            className="dialog m-auto h-auto w-[90%] pb-8 sm:w-[400px]"
            open={true}
          >
            <div className="relative z-10  rounded-xl bg-white p-4 shadow-lg">
              <video
                height="200"
                playsInline
                autoPlay
                loop
                muted
                className="mb-6 rounded-lg"
              >
                <source src="/static/videos/celebration.mp4" type="video/mp4" />
              </video>
              <div className="mb-8 text-center">
                <h4 className="mb-1 text-[18px] font-semibold">
                  Install shelf for mobile
                </h4>
                <p className="text-gray-600">
                  Always available access to shelf, with all features you have
                  on desktop.
                </p>
              </div>
              {promptInstall && (
                <Button
                  width="full"
                  variant="primary"
                  className="mb-3"
                  onClick={async () => {
                    await promptInstall().then(() =>
                      fetcher.submit(hidePwaPromptForm.current, {
                        method: "POST",
                      })
                    );
                  }}
                >
                  Install
                </Button>
              )}
              <fetcher.Form
                ref={hidePwaPromptForm}
                method="post"
                action="/api/hide-pwa-install-prompt"
              >
                <input
                  type="hidden"
                  name="pwaPromptVisibility"
                  value="hidden"
                />
                <Button type="submit" width="full" variant="secondary">
                  Skip for 2 weeks
                </Button>
              </fetcher.Form>
            </div>
          </dialog>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
