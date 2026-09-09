#!/bin/bash
# Backup diário do ALEQUIZÃO MULT360 (Whaticket): banco Postgres todo dia, mídias (backend/public) aos domingos.
# Retenção: 7 dumps diários, 4 pacotes de mídia. Log em /var/log/whaticket-backup.log
DEST=/root/backups/whaticket
mkdir -p "$DEST"
DATA=$(date +%F)
LOG=/var/log/whaticket-backup.log
{
  echo "[$(date '+%F %T')] início"
  if PGPASSWORD=SENHA_DO_BANCO pg_dump -h 127.0.0.1 -U whaticket whaticket | gzip > "$DEST/banco-$DATA.sql.gz"; then
    echo "  banco ok: $(du -h "$DEST/banco-$DATA.sql.gz" | cut -f1)"
  else
    echo "  ERRO no pg_dump"; rm -f "$DEST/banco-$DATA.sql.gz"
  fi
  if [ "$(date +%u)" = "7" ]; then
    tar czf "$DEST/midias-$DATA.tar.gz" -C /caminho/para/whaticket/backend public private 2>/dev/null && echo "  mídias ok: $(du -h "$DEST/midias-$DATA.tar.gz" | cut -f1)"
  fi
  cp /caminho/para/whaticket/backend/.env "$DEST/backend.env.bak" 2>/dev/null
  cp /caminho/para/whaticket/frontend/.env "$DEST/frontend.env.bak" 2>/dev/null
  find "$DEST" -name 'banco-*.sql.gz' -mtime +7 -delete
  find "$DEST" -name 'midias-*.tar.gz' -mtime +28 -delete
  echo "  fim: $(ls "$DEST" | wc -l) arquivos, $(du -sh "$DEST" | cut -f1)"
} >> "$LOG" 2>&1
