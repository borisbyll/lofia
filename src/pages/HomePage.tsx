import { Link } from 'react-router-dom'
import { Home, Key, ArrowRight, MapPin, Tag, Shield } from 'lucide-react'
import { BRAND } from '@/lib/brand'

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-[#1a3c5e] text-white py-20 md:py-32">
        <div className="wrap text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-bold uppercase tracking-widest mb-6">
            🇹🇬 Plateforme immobilière au Togo
          </span>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            Trouvez votre bien idéal<br className="hidden md:block"/>
            <span className="text-[#e8a020]"> au Togo</span>
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            {BRAND.tagline} — Acheter, louer, vendre. Simple, rapide et sécurisé pour les résidents et la diaspora.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/vente" className="btn-secondary text-base px-8 py-3.5">
              <Home size={18}/> Acheter un bien
            </Link>
            <Link to="/location" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-base border-2 border-white/30 text-white hover:bg-white/10 transition-colors">
              <Key size={18}/> Louer un bien
            </Link>
          </div>
        </div>
      </section>

      {/* Catégories */}
      <section className="section">
        <div className="wrap">
          <div className="text-center mb-12">
            <span className="section-badge">Nos services</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Que recherchez-vous ?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Link to="/vente" className="card-hover p-8 group">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-5 group-hover:bg-amber-200 transition-colors">
                <Tag size={26} className="text-amber-700"/>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Acheter / Vendre</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Terrains, maisons, villas, appartements, immeubles. Annonces vérifiées par nos modérateurs.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700">
                Voir les annonces <ArrowRight size={15}/>
              </span>
            </Link>
            <Link to="/location" className="card-hover p-8 group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-5 group-hover:bg-emerald-200 transition-colors">
                <Key size={26} className="text-emerald-700"/>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Louer / Mettre en location</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Courte ou longue durée. Studios, appartements, boutiques, bureaux à Lomé et partout au Togo.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                Voir les annonces <ArrowRight size={15}/>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Pourquoi nous */}
      <section className="section bg-gray-50">
        <div className="wrap">
          <div className="text-center mb-12">
            <span className="section-badge">Pourquoi nous choisir</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Simple, sécurisé, fiable</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield,  color: 'bg-blue-100 text-blue-700',    title: 'Annonces vérifiées',   desc: 'Les biens à vendre sont validés par nos modérateurs avant publication.' },
              { icon: MapPin,  color: 'bg-emerald-100 text-emerald-700', title: 'Localisation précise', desc: 'Recherchez par ville, commune ou quartier pour trouver exactement ce que vous cherchez.' },
              { icon: Home,    color: 'bg-amber-100 text-amber-700',   title: 'Diaspora bienvenue',   desc: 'Publiez ou trouvez un bien depuis l\'étranger. Plateforme pensée pour la diaspora togolaise.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="card p-7 text-center">
                <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mx-auto mb-5`}>
                  <Icon size={24}/>
                </div>
                <h3 className="font-black text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="wrap">
          <div className="bg-[#1a3c5e] rounded-3xl p-10 md:p-16 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Vous avez un bien à proposer ?</h2>
            <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
              Publiez votre annonce gratuitement et touchez des milliers d'acheteurs et locataires potentiels.
            </p>
            <Link to="/inscription" className="btn-secondary text-base px-8 py-3.5">
              Publier mon bien <ArrowRight size={17}/>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
