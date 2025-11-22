
import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import { exec } from "child_process";

const app = express();
app.use(express.json({ limit: "200mb" }));

// Health-check
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Videx Cleaner v2 online" });
});

/**
 * POST /clean
 * Body: { "url": "https://..." }
 * Baixa o MP4 da Shopee, aplica blur em:
 *  - 15% topo
 *  - 15% rodapé
 *  - faixa vertical centro-esquerda (onde costuma ficar a marca)
 * Retorna MP4 limpo.
 */
app.post("/clean", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: true, message: "URL ausente" });
    }

    // Baixar vídeo original
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) {
      return res.status(500).json({
        error: true,
        message: "Falha ao baixar vídeo de origem",
        status: response.status,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const inputPath = `/tmp/in_${Date.now()}.mp4`;
    const outputPath = `/tmp/out_${Date.now()}.mp4`;

    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

    // Filtro FFmpeg:
    // - split em 4 cópias
    // - blur 15% topo
    // - blur 15% rodapé
    // - blur faixa vertical centro-esquerda (25% largura, 40% altura, começando em 30% da altura)
    // - sobrepõe as 3 regiões borradas em cima do vídeo base
    const ffmpegFilter = (
      "[0:v]split=4[base][t][b][l];" +
      "[t]crop=iw:ih*0.15:0:0,gblur=sigma=14[topblur];" +
      "[b]crop=iw:ih*0.15:0:ih*0.85,gblur=sigma=14[bottomblur];" +
      "[l]crop=iw*0.25:ih*0.4:0:ih*0.3,gblur=sigma=20[leftblur];" +
      "[base][topblur]overlay=0:0[step1];" +
      "[step1][bottomblur]overlay=0:main_h-overlay_h[step2];" +
      "[step2][leftblur]overlay=0:(main_h-overlay_h)/2"
    );

    const cmd = `ffmpeg -y -i "${inputPath}" -vf "${ffmpegFilter}" -c:a copy "${outputPath}"`;

    await new Promise((resolve, reject) => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error("FFmpeg erro:", err, stderr);
          return reject(err);
        }
        resolve();
      });
    });

    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({
        error: true,
        message: "Falha ao gerar vídeo limpo",
      });
    }

    const cleanedBuffer = fs.readFileSync(outputPath);

    // Limpar temporários
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Disposition", 'attachment; filename="videx-shopee-clean.mp4"');
    return res.send(cleanedBuffer);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: true,
      message: "Erro interno no cleaner: " + e.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Videx Cleaner v2 rodando na porta ${PORT}`);
});
