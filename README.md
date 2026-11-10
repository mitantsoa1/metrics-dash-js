# metrics-dash-js

> SDK Client officiel JavaScript / TypeScript pour la télémesure et les analytics haute-fréquence **MetricsDash**.

## 🚀 Fonctionnalités

- **⚡ Autonome & Zéro Dépendance** : Moins de 4 KB gzippé.
- **⚛️ Intégration NATIVE Next.js & React** : Provider `<MetricsDashProvider />` & Hook `useMetricsDash()`.
- **⏱️ Durée de Session & Rebond** : Calcul précis du temps engagé (pause après 30s d'inactivité ou masquage de l'onglet `visibilitychange`).
- **👆 Auto Click Tracking** : Délégation globale d'événements sur la racine du document (sélecteurs CSS, libellés nettoyés).
- **📄 Support SPA & Pageviews** : Interception automatique de l'History API (`pushState`, `replaceState`, `popstate`) & gestion des UTMs.
- **🔒 Confiance & Zéro PII** : Capture des formulaires sans jamais lire la valeur des champs (`input.value`). Support de `data-metrics-ignore`.
- **🚀 Transport Haute Fiabilité** : `navigator.sendBeacon` avec fallback `fetch` `keepalive` et file d'attente circulaire (2s batching).

---

## 📦 Installation

```bash
npm install metrics-dash-js
# ou
yarn add metrics-dash-js
# ou
pnpm add metrics-dash-js
```

---

## 💻 Utilisation dans Next.js (App Router)

Ajoutez le composant `<MetricsDashProvider />` dans votre `app/layout.tsx` :

```tsx
import { MetricsDashProvider } from 'metrics-dash-js/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <MetricsDashProvider
          publicSdkKey="pk_live_votre_cle_publique"
          host="https://api.metrics-dash.com" // URL de votre serveur MetricsDash
        >
          {children}
        </MetricsDashProvider>
      </body>
    </html>
  );
}
```

---

## ⚛️ Utilisation dans React (Vite / CRA)

Enveloppez votre application dans `main.tsx` ou `App.tsx` :

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MetricsDashProvider } from 'metrics-dash-js/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MetricsDashProvider
      publicSdkKey="pk_live_votre_cle_publique"
      host="https://api.metrics-dash.com"
    >
      <App />
    </MetricsDashProvider>
  </React.StrictMode>
);
```

### Utilisation du Hook dans vos composants :

```tsx
import { useMetricsDash } from 'metrics-dash-js/react';

export function CheckoutButton() {
  const { trackEvent } = useMetricsDash();

  const handleCheckout = () => {
    trackEvent('custom_checkout_click', { plan: 'Enterprise', price: 99 });
  };

  return (
    <button onClick={handleCheckout} className="btn">
      Payer la commande
    </button>
  );
}
```

---

## 🌐 Utilisation en JavaScript Vanilla (HTML / Browser)

```html
<script type="module">
  import { MetricsDash } from 'https://cdn.jsdelivr.net/npm/metrics-dash-js/+esm';

  MetricsDash.init({
    publicSdkKey: 'pk_live_votre_cle_publique',
    host: 'https://api.metrics-dash.com',
    inactivityThresholdSeconds: 30,
  });
</script>
```

---

## 🛡️ Masquage d'éléments & Confidentialité (PII)

Pour exclure un bouton, un lien ou un formulaire sensible du suivi automatique, ajoutez l'attribut `data-metrics-ignore="true"` :

```html
<form id="payment-form" data-metrics-ignore="true">
  <!-- Ce formulaire et tous ses boutons enfants seront ignorés -->
</form>
```

Les champs de type `password` et `credit-card` sont toujours ignorés automatiquement.

---

## 🧭 Guide d'installation pas à pas (site à tracker)

### 1. Prérequis

- Une instance créée dans MetricsDash pour ce site (le domaine du site est saisi à la création). Demandez à un OWNER ou ADMIN de vous donner la **clé publique** `pk_live_…`.
- L'URL publique du backend MetricsDash (`host`).
- Le site doit pouvoir joindre `host` en HTTPS. Si le navigateur affiche une erreur CORS, l'administrateur MetricsDash doit autoriser le domaine du site.

La clé publique peut apparaître dans le code de la page. Ne mettez jamais la clé privée `sk_live_…` dans le frontend.

### 2. Installer

```bash
npm install metrics-dash-js
```

### 3. Stocker la configuration

Next.js, fichier `.env.local` :

```env
NEXT_PUBLIC_METRICSDASH_KEY=pk_live_votre_cle_publique
NEXT_PUBLIC_METRICSDASH_HOST=https://api.votre-metricsdash.com
```

### 4. Brancher le SDK

```tsx
<MetricsDashProvider
  publicSdkKey={process.env.NEXT_PUBLIC_METRICSDASH_KEY!}
  host={process.env.NEXT_PUBLIC_METRICSDASH_HOST!}
>
  {children}
</MetricsDashProvider>
```

Placez le provider une seule fois, dans le layout racine.

### 5. Vérifier

1. Ouvrez le site et naviguez sur deux ou trois pages.
2. Dans l'onglet Réseau du navigateur, une requête vers `host` doit répondre `202` dans les 5 secondes.
3. Dans le tableau de bord MetricsDash, choisissez l'instance : les pages vues apparaissent sous 10 minutes.

### 6. Dépannage

| Symptôme | Cause probable | Action |
| --- | --- | --- |
| Aucune requête réseau | Provider absent ou variable vide | Vérifier le layout et `.env.local`, redémarrer `next dev` |
| Erreur CORS | Domaine non autorisé côté MetricsDash | Contacter l'administrateur |
| 401 | Clé erronée ou tournée | Récupérer la clé de l'instance |
| 429 | Trop de requêtes | Réduire les événements personnalisés |
| Données absentes du tableau de bord | Agrégation en attente | Attendre 10 minutes, vérifier la période et l'instance choisies |
