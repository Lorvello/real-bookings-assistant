// TypeScript declarations for Stripe Connect embedded components
declare global {
  interface Window {
    Stripe: (publishableKey: string) => StripeInstance;
  }
}

interface StripeInstance {
  connectEmbeddedComponents: {
    create: (options: {
      clientSecret: string;
      fetchClientSecret?: () => Promise<string>;
    }) => ConnectEmbeddedComponentCreator;
  };
}

interface ConnectEmbeddedComponentCreator {
  create: (componentType: string) => ConnectEmbeddedComponent;
}

interface ConnectEmbeddedComponent {
  mount: (container: HTMLElement) => Promise<void>;
  unmount: () => void;
  on?: (event: string, handler: Function) => void;
}

export {};