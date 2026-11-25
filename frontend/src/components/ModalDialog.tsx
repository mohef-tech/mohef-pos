import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export type ModalSize = 'md' | 'lg'

const MODAL_SIZE_CLASS: Record<ModalSize, string> = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

interface ModalDialogProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  size?: ModalSize
  children: ReactNode
}

export function ModalDialog({
  open,
  title,
  description,
  onClose,
  size = 'md',
  children,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => {
      // Reset returnValue so stale values never leak across openings.
      dialog.returnValue = ''
      onClose()
    }

    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      {...({ closedby: 'closerequest' } as Record<string, string>)}
      className={`pos-modal w-[calc(100vw-2rem)] max-h-[90dvh] ${MODAL_SIZE_CLASS[size]}`}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#2B1D14]/10 px-6 py-4">
        <div className="min-w-0">
          <h1 id={titleId} className="text-lg font-semibold text-[#2B1D14]">
            {title}
          </h1>
          {description ? (
            <p id={descId} className="mt-1 text-sm text-[#5C4B40]">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup dialog"
          className="motion-interactive inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[#5C4B40] hover:bg-[#EFE6DA] hover:text-[#2B1D14]"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  )
}
