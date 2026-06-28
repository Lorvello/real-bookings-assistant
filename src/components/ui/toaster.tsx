import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

// a11y note (D-006): the app-owned toast a11y is fixed at the primitive level
// in ui/toast.tsx -- the viewport is a labelled region (clears axe's `list`
// rule that fired on the <ol> + role=status <li> mismatch), and ToastClose has
// an i18n'd aria-label (clears `button-name`). The one residual axe
// `aria-hidden-focus` flag is on Radix's internal head/tail FocusProxy sentinel
// spans (aria-hidden tabindex=0, 1x1px), which implement the WAI-ARIA APG toast
// keyboard-navigation pattern (F6/Tab focus routing via refs). That flag is a
// documented axe-vs-APG false positive; the proxies are spec-compliant and
// stripping their tabindex would break keyboard focus routing, so it is left
// WONTFIX with this justification rather than degrading real a11y.
export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
