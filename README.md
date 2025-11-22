# Videx Cleaner v2 (Render)

Backend em Node.js para limpar a marca d'água de vídeos da Shopee usando FFmpeg.

## Rotas

- `GET /` → health-check simples.
- `POST /clean` → recebe JSON `{ "url": "https://..." }` com o link direto do MP4 (com marca) e devolve MP4 com blur:
  - 15% topo
  - 15% rodapé
  - faixa vertical centro-esquerda (onde geralmente fica a marca da Shopee)

## Deploy no Render

1. Crie um repositório no GitHub com estes arquivos.
2. No painel do Render, clique em **New → Web Service**.
3. Selecione o repositório.
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Após o deploy, use a URL:

`https://SEU_NOME.onrender.com/clean`

## Integração com o Worker (Cloudflare)

No Worker, depois de obter `watermarkVideo`, faça:

```js
const cleanerRes = await fetch("https://SEU_NOME.onrender.com/clean", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: watermarkVideo }),
});

if (cleanerRes.ok) {
  const cleanedVideo = await cleanerRes.arrayBuffer();
  return new Response(cleanedVideo, {
    headers: {
      "Content-Type": "video/mp4",
      "Access-Control-Allow-Origin": "*",
      "Content-Disposition": 'attachment; filename="videx-sem-marca.mp4"',
    },
  });
}
```
