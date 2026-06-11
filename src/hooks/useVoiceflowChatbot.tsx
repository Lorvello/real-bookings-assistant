import { useEffect } from 'react';

/**
 * Loads the Voiceflow support chat widget — but ONLY when a project ID is
 * configured via `VITE_VOICEFLOW_PROJECT_ID`. Without it the hook is a no-op.
 *
 * Why: a hardcoded/expired project ID makes the widget retry `getPublishing`
 * forever, flooding the console with `TypeError: Failed to fetch` on every
 * marketing page. Gating on an env var means no broken widget ships by default;
 * set the env var to a valid project ID to switch the support bot back on.
 */
export const useVoiceflowChatbot = () => {
  useEffect(() => {
    const projectID = import.meta.env.VITE_VOICEFLOW_PROJECT_ID as string | undefined;

    // No valid project configured → don't load anything (no console flood).
    if (!projectID) {
      return;
    }

    // Already loaded — don't inject twice.
    if (document.querySelector('script[src*="voiceflow.com"]')) {
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.onload = function () {
      if (window.voiceflow) {
        window.voiceflow.chat.load({
          verify: { projectID },
          url: 'https://general-runtime.voiceflow.com',
          versionID: 'production',
          voice: {
            url: 'https://runtime-api.voiceflow.com',
          },
        });
      }
    };
    script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }

    return () => {
      const existingScript = document.querySelector('script[src*="voiceflow.com"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);
};

// Add type declaration for window.voiceflow
declare global {
  interface Window {
    voiceflow: {
      chat: {
        load: (config: any) => void;
      };
    };
  }
}
