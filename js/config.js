window.NEXO_CONFIG = {
 "categories": {
  "residuos": "Resíduos e lixo",
  "vegetacao": "Vegetação obstruindo o canal",
  "assoreamento": "Assoreamento aparente",
  "estrutura": "Estrutura danificada",
  "agua_acumulada": "Água acumulada",
  "outro": "Outro problema"
 },
 "categoryIcons": {
  "residuos": "trash",
  "vegetacao": "leaf",
  "assoreamento": "water",
  "estrutura": "warning",
  "agua_acumulada": "water",
  "outro": "info"
 },
 "statusHints": {
  "Recebido": "Seu relato foi registrado e aguarda a triagem da equipe.",
  "Em análise": "A equipe está analisando o relato e a localização do trecho.",
  "Encaminhado": "O relato foi encaminhado para verificação ou atendimento.",
  "Resolvido": "A coordenação registrou este relato como resolvido. Isso não é garantia contra alagamentos.",
  "Descartado": "Este relato foi encerrado sem providência no fluxo da demonstração."
 },
 "seed": {
  "id": "demo-0001",
  "protocol": "CED-20261015-0A1B2C3D4E5F",
  "credential_hash": "8be9f32b68a8f1502b818f0ec2e241d0187c4c7b47d9e5947a59050bbc5a583a",
  "category": "residuos",
  "description": "Exemplo fictício: acúmulo de materiais no trecho próximo à ponte, dificultando o escoamento da água.",
  "address": "Rua das Flores, próximo ao número 100, bairro Exemplo",
  "reference": "Ao lado da ponte",
  "observed_at": "2026-10-14T15:30:00Z",
  "received_at": "2026-10-15T16:05:00Z",
  "status": "Encaminhado",
  "timeline": [
   {
    "status": "Em análise",
    "at": "2026-10-16T17:20:00Z"
   },
   {
    "status": "Encaminhado",
    "at": "2026-10-19T14:40:00Z"
   }
  ],
  "photos_count": 0
 },
 "icons": {
  "arrow-right": "<path d=\"M4 12h15m-6-6 6 6-6 6\"/>",
  "arrow-up-right": "<path d=\"M6 18 18 6M6 6h12v12\"/>",
  "menu": "<path d=\"M4 6h16M4 12h16M4 18h16\"/>",
  "close": "<path d=\"m6 6 12 12M6 18 18 6\"/>",
  "leaf": "<path d=\"M20 4c-8-2-15 2-15 8a6 6 0 0 0 11 3c2-3 3-7 4-11Z\"/><path d=\"M3 21 15 9M8 16l-1-6m5 2 5 1\"/>",
  "pin": "<path d=\"M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"2.3\"/>",
  "location": "<path d=\"m21 3-6 18-4-8-8-4L21 3Z\"/><path d=\"m11 13 5-5\"/>",
  "check": "<path d=\"m5 12 4 4L19 6\"/>",
  "shield": "<path d=\"M12 3 4.5 6v6c0 5 7.5 9 7.5 9s7.5-4 7.5-9V6L12 3Z\"/><path d=\"m8.5 12 2.5 2.5 4.5-5\"/>",
  "camera": "<path d=\"M8 6 9.5 3.5h5L16 6h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4Z\"/><circle cx=\"12\" cy=\"12.5\" r=\"3.5\"/>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6m0-10h.01\"/>",
  "clipboard": "<rect x=\"7\" y=\"4\" width=\"13\" height=\"16\" rx=\"2\"/><path d=\"M7 8H4v13h12v-1M11 4V2h5v2\"/>",
  "calendar": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 3v4m10-4v4M3 11h18m-13 5 3 3 5-5\"/>",
  "trash": "<path d=\"M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7\"/>",
  "file": "<path d=\"M14 3H5v18h14V8l-5-5Z\"/><path d=\"M14 3v5h5M8 12h8m-8 4h6\"/>",
  "chevron": "<path d=\"m9 5 7 7-7 7\"/>",
  "warning": "<path d=\"m12 3 10 18H2L12 3Z\"/><path d=\"M12 9v5m0 3h.01\"/>",
  "home": "<path d=\"m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7\"/>",
  "plus": "<path d=\"M12 4v16M4 12h16\"/>",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"m16 16 4.5 4.5\"/>",
  "map": "<path d=\"m3 6.5 6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5V6.5Z\"/><path d=\"M9 4v13.5m6-11v13.5\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3.5 2\"/>",
  "eye": "<path d=\"M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "eye-off": "<path d=\"M3 3l18 18M10.6 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.5 7.2C4 8.9 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2\"/>",
  "lock": "<rect x=\"5\" y=\"10.5\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 10.5V8a4 4 0 0 1 8 0v2.5\"/>",
  "water": "<path d=\"M2 7c3-3 5 3 8 0s5 3 8 0 4 0 4 0M2 12c3-3 5 3 8 0s5 3 8 0 4 0 4 0M2 17c3-3 5 3 8 0s5 3 8 0 4 0 4 0\"/>",
  "logout": "<path d=\"M9 4H5v16h4M16 8l4 4-4 4M20 12H9\"/>",
  "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5\"/>",
  "dashboard": "<rect x=\"3\" y=\"3\" width=\"7.5\" height=\"9\" rx=\"1.5\"/><rect x=\"13.5\" y=\"3\" width=\"7.5\" height=\"5\" rx=\"1.5\"/><rect x=\"13.5\" y=\"11\" width=\"7.5\" height=\"10\" rx=\"1.5\"/><rect x=\"3\" y=\"15\" width=\"7.5\" height=\"6\" rx=\"1.5\"/>"
 },
 "statuses": [
  "Recebido",
  "Em análise",
  "Encaminhado",
  "Resolvido",
  "Descartado"
 ],
 "staff": {
  "registrationCodeHash": "b847228040f26ad8a3889dc9de85f840afbbdce68b6aa411e20d0d2f83c9dcd6",
  "sessionMinutes": 30
 }
};
