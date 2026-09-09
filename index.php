<?php
declare(strict_types=1);
// Página de status do Whaticket (alequizao.com/whaticket). Dados: status.json (cron 1/min) + checagens HTTP ao vivo.
header('Cache-Control: no-store');
$json = @file_get_contents(__DIR__ . '/status.json');
$d = $json ? json_decode($json, true) : null;
if (isset($_GET['json'])) { header('Content-Type: application/json'); echo $json ?: '{}'; exit; }
function ok(bool $b): string { return $b ? '<span class="pill ok">OK</span>' : '<span class="pill bad">FORA</span>'; }
function code(string $c): string { $b = in_array($c, ['200','301','302','304','401','403','404']); return '<span class="pill '.($b?'ok':'bad').'">HTTP '.htmlspecialchars($c).'</span>'; }
function live(string $u): string {
  $ch = curl_init($u); curl_setopt_array($ch, [CURLOPT_NOBODY=>true, CURLOPT_TIMEOUT=>6, CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>false]);
  curl_exec($ch); $c = (string)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch); return $c ?: '000';
}
$vivo = ['Frontend zap.alequizao.com' => live('https://zap.alequizao.com/'), 'Backend zapapi.alequizao.com' => live('https://zapapi.alequizao.com/')];
$idade = $d ? (time() - strtotime($d['gerado_em'])) : null;
$estado = ['CONNECTED'=>'ok','OPENING'=>'warn','qrcode'=>'warn','PAIRING'=>'warn','DISCONNECTED'=>'bad','TIMEOUT'=>'bad'];
?>
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Whaticket · Status</title><meta http-equiv="refresh" content="60">
<style>
:root{--bg:#f3f4f6;--card:#fff;--ink:#111827;--mut:#6b7280;--line:#e5e7eb;--azul:#2563EB}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 Inter,Poppins,system-ui,sans-serif;background:var(--bg);color:var(--ink)}
.top{background:var(--card);border-bottom:1px solid var(--line);padding:16px 24px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.top h1{font-size:20px;margin:0}.top .sub{color:var(--mut);font-size:13px}
.wrap{max-width:1100px;margin:0 auto;padding:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.card{background:var(--card);border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.06);padding:18px}
.card h2{font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut);margin:0 0 12px}
.row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--line);gap:10px}.row:last-child{border:0}
.pill{font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px}.ok{background:#dcfce7;color:#166534}.bad{background:#fee2e2;color:#991b1b}.warn{background:#fef3c7;color:#92400e}
.num{font-size:26px;font-weight:700}.k{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}.k div{background:var(--bg);border-radius:10px;padding:10px}.k small{color:var(--mut)}
pre{background:#111827;color:#e5e7eb;border-radius:10px;padding:12px;font-size:12px;overflow:auto;max-height:220px}
a.btn{background:var(--azul);color:#fff;text-decoration:none;padding:8px 14px;border-radius:10px;font-weight:600;font-size:13px}
.links{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
</style></head><body>
<div class="top"><h1>🟢 Whaticket · Status</h1><span class="sub">VPS 179.199.136.173 · atualizado <?= $d ? htmlspecialchars($d['gerado_em']) : '—' ?><?= $idade!==null ? ' ('.$idade.'s atrás)' : '' ?> · recarrega a cada 60s</span>
<div class="links"><a class="btn" href="https://zap.alequizao.com/">Abrir painel</a><a class="btn" href="https://zapapi.alequizao.com/">API</a><a class="btn" href="INSTALACAO.md">Passo a passo</a><a class="btn" href="?json=1">JSON</a></div></div>
<div class="wrap">
<?php if (!$d): ?><div class="card">Ainda sem <code>status.json</code> — o coletor roda a cada minuto.</div><?php else: ?>
<div class="grid">
<div class="card"><h2>Acesso pela internet (ao vivo)</h2>
<?php foreach ($vivo as $n=>$c): ?><div class="row"><span><?= $n ?></span><?= code($c) ?></div><?php endforeach; ?>
<div class="row"><span>Cloudflare Tunnel</span><span class="pill <?= $d['servicos']['cloudflared']==='active'?'ok':'warn' ?>"><?= htmlspecialchars($d['servicos']['cloudflared']) ?></span></div>
</div>
<div class="card"><h2>Serviços na VPS</h2>
<div class="row"><span>Backend Node (porta 7777)</span><?= ok($d['servicos']['backend_7777']) ?></div>
<div class="row"><span>Frontend Node (porta 6666)</span><?= ok($d['servicos']['frontend_6666']) ?></div>
<div class="row"><span>PostgreSQL (5432)</span><?= ok($d['servicos']['postgres_5432']) ?></div>
<div class="row"><span>Redis (6379)</span><?= ok($d['servicos']['redis_6379']) ?></div>
<div class="row"><span>Apache</span><?= ok((bool)$d['servicos']['apache']) ?></div>
<div class="row"><span>Banco responde</span><?= ok((bool)$d['banco']['ok']) ?></div>
</div>
<div class="card"><h2>PM2</h2>
<?php foreach ($d['pm2'] as $p): ?><div class="row"><span><?= htmlspecialchars($p['nome']) ?><br><small style="color:var(--mut)">uptime <?= gmdate('H\hi', $p['uptime']) ?> · <?= $p['mem_mb'] ?> MB · cpu <?= $p['cpu'] ?>% · <?= $p['restarts'] ?> restarts</small></span><span class="pill <?= $p['status']==='online'?'ok':'bad' ?>"><?= htmlspecialchars((string)$p['status']) ?></span></div><?php endforeach; if (!$d['pm2']) echo '<div class="row">nenhum processo whaticket no pm2</div>'; ?>
</div>
<div class="card"><h2>Conexões WhatsApp</h2>
<?php foreach ($d['conexoes'] as $c): ?><div class="row"><span><?= htmlspecialchars($c['nome']) ?> <small style="color:var(--mut)"><?= htmlspecialchars($c['numero'] ?? '') ?> · <?= htmlspecialchars($c['atualizado']) ?></small></span><span class="pill <?= $estado[$c['status']] ?? 'warn' ?>"><?= htmlspecialchars($c['status']) ?></span></div><?php endforeach; if (!$d['conexoes']) echo '<div class="row">Nenhuma conexão criada ainda — crie em Conexões no painel e leia o QR code.</div>'; ?>
</div>
</div>
<div class="card" style="margin-top:16px"><h2>Números do sistema · plano: <?= htmlspecialchars((string)$d['banco']['plano']) ?></h2>
<div class="k">
<?php foreach (['usuarios'=>'Usuários','conexoes'=>'Conexões','filas'=>'Filas','contatos'=>'Contatos','tickets'=>'Tickets','tickets_abertos'=>'Abertos','tickets_pendentes'=>'Pendentes','mensagens'=>'Mensagens','mensagens_24h'=>'Msgs 24h','campanhas'=>'Campanhas','tabelas'=>'Tabelas'] as $k=>$l): ?>
<div><div class="num"><?= $d['banco'][$k] ?? '—' ?></div><small><?= $l ?></small></div>
<?php endforeach; ?>
</div></div>
<div class="grid" style="margin-top:16px">
<div class="card"><h2>Servidor</h2>
<div class="row"><span>Load (1/5/15)</span><b><?= implode(' / ', $d['sistema']['load']) ?></b></div>
<div class="row"><span>Memória disponível</span><b><?= $d['sistema']['mem_livre_mb'] ?> MB</b></div>
<div class="row"><span>Disco livre</span><b><?= $d['sistema']['disco_livre_gb'] ?> GB</b></div>
<div class="row"><span>Uptime da VPS</span><b><?= $d['sistema']['uptime_dias'] ?> dias</b></div>
</div>
<div class="card"><h2>Últimos erros do backend</h2><pre><?= htmlspecialchars($d['log_erros'] ?: 'sem erros recentes') ?></pre></div>
</div>
<?php endif; ?>
<p style="text-align:center;color:var(--mut);font-size:13px;margin:24px 0">Desenvolvido por <a href="https://instagram.com/alequizao" target="_blank" rel="noopener" style="color:var(--azul);font-weight:600">@alequizao</a> · <a href="https://wa.me/5582988717072" target="_blank" rel="noopener" style="color:var(--azul);font-weight:600">WhatsApp (82) 98871-7072</a></p>
</div></body></html>
