# Project Silver Phoenix

Persoonlijk edelmetaal-portefeuille-dashboard met:
- holdings en fractionele aandelen;
- Ultimate Master Ranking v3.0;
- live koersroute via Yahoo Finance;
- automatische EUR-omrekening;
- kern / behouden / afbouwen / uitstappen-indeling;
- handmatige koersfallback voor niet-ondersteunde microcaps.

## Lokaal starten

1. Installeer Node.js 20 of hoger.
2. Open een terminal in deze map.
3. Voer uit:

```bash
npm install
npm run dev
```

Open daarna `http://localhost:3000`.

## Uploaden naar GitHub

Pak de ZIP uit en upload alle bestanden naar de root van de repository.

## Online zetten met Vercel

1. Maak een gratis Vercel-account met GitHub-login.
2. Kies **Add New → Project**.
3. Selecteer `project-silver-phoenix`.
4. Klik **Deploy**.

## Belangrijk

Koersen van zeer kleine, geschorste of hernoemde noteringen kunnen ontbreken. De app toont dan een handmatig invoerveld. Yahoo-symbolen kunnen later in `data/portfolio.ts` worden gecorrigeerd.
