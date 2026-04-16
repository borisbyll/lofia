import { AlertTriangle } from 'lucide-react'

interface Props {
  open:      boolean
  titre:     string
  message:   string
  confirmLabel?: string
  danger?:   boolean
  onConfirm: () => void
  onCancel:  () => void
}

export default function ConfirmModal({ open, titre, message, confirmLabel = 'Confirmer', danger = false, onConfirm, onCancel }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
          <AlertTriangle size={22} className={danger ? 'text-red-500' : 'text-yellow-600'}/>
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{titre}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn btn-ghost flex-1 justify-center border border-gray-200">Annuler</button>
          <button onClick={onConfirm} className={`btn flex-1 justify-center ${danger ? 'btn-danger' : 'btn-primary'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
