import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { BRAND } from '@/lib/brand'

export default function CtaSection() {
  return (
    <section
      className="section relative overflow-hidden"
      style={{ background: 'linear-gradient(150deg, #8B1A2E 0%, #6B0F1E 60%, #4D0A15 100%)' }}
    >
      {/* Ligne dorée haut */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#D4A832' }} />

      {/* Motifs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full border border-white/5" />
        <div className="absolute top-8 -left-12 w-48 h-48 rounded-full border border-white/5" />
      </div>

      <div className="wrap text-center text-white relative z-10 px-4">
        {/* Icône serrure */}
        <div className="flex justify-center mb-5 sm:mb-6">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 border-white/20"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <svg viewBox="0 0 100 100" width="32" height="32" aria-hidden="true">
              <circle cx="50" cy="50" r="50" fill="#8B1A2E" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#D4A832" strokeWidth="5" />
              <circle cx="50" cy="37" r="11" fill="white" />
              <path d="M41,47 L59,47 L55,66 L45,66 Z" fill="white" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 sm:mb-4 text-white leading-tight">
          Vous avez un bien à proposer ?
        </h2>
        <p className="text-white/60 text-sm sm:text-base md:text-lg mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed">
          Publiez votre annonce gratuitement et touchez des milliers d&apos;acheteurs et locataires au Togo et dans la diaspora.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm sm:max-w-none mx-auto">
          <Link
            href="/inscription"
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl font-black text-sm sm:text-base transition-all shadow-md hover:shadow-[0_8px_32px_rgba(212,168,50,.3)] w-full sm:w-auto"
            style={{ background: '#D4A832', color: '#1a0a00' }}
          >
            <Plus size={18} /> Publier une annonce
          </Link>
          <Link
            href="/vente"
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl font-black text-sm sm:text-base border-2 border-white/20 text-white hover:bg-white/10 transition-all w-full sm:w-auto"
          >
            <Search size={18} /> Parcourir les annonces
          </Link>
        </div>

        <p className="text-white/40 text-xs sm:text-sm mt-6 sm:mt-8">
          Support disponible sur WhatsApp ·{' '}
          <a
            href={`https://wa.me/${BRAND.whatsapp.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-white font-semibold transition-colors"
          >
            {BRAND.whatsapp}
          </a>
        </p>
      </div>
    </section>
  )
}
