'use client'

import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Champ mot de passe avec bouton œil (afficher/masquer). Conserve le style
// fourni via `className` (s'adapte à chaque contexte : admin, espace client…).
// Remplace un `<input type="password" className="..." />` sans rien changer d'autre.
type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  iconClassName?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className = '', iconClassName = '', ...props }, ref) {
    const [show, setShow] = useState(false)
    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={`${className} pr-11`}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ${iconClassName}`}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  }
)
