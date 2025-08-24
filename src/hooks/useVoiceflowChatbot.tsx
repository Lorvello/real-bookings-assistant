import { useEffect } from 'react';

export const useVoiceflowChatbot = () => {
  useEffect(() => {
    // Check if script is already loaded
    if (document.querySelector('script[src*="voiceflow.com"]')) {
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.onload = function() {
      if (window.voiceflow) {
        window.voiceflow.chat.load({
          verify: { projectID: '688d56ed83aad58dab6c7901' },
          url: 'https://general-runtime.voiceflow.com',
          versionID: 'production',
          voice: {
            url: "https://runtime-api.voiceflow.com"
          }
        });
      }
    };
    script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";

    // Insert script into document
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }

    // Cleanup function
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