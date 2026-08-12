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
