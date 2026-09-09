#!/bin/bash
# Coleta o status do Whaticket a cada minuto -> /caminho/para/whaticket/status.json (lido pelo index.php)
OUT=/caminho/para/whaticket/status.json
export PGPASSWORD=SENHA_DO_BANCO
Q(){ psql -h 127.0.0.1 -U whaticket -d whaticket -Atc "$1" 2>/dev/null; }
pm2 jlist > /tmp/wk-pm2.json 2>/dev/null
python3 - "$OUT" <<'PY'
import json,subprocess,sys,os,socket,time,shutil
out=sys.argv[1]
def sh(c):
    try: return subprocess.run(c,shell=True,capture_output=True,text=True,timeout=20).stdout.strip()
    except Exception as e: return ''
def port(p):
    s=socket.socket(); s.settimeout(2)
    try: s.connect(('127.0.0.1',p)); return True
    except: return False
    finally: s.close()
def http(u):
    return sh(f"curl -s -o /dev/null -m 8 -w '%{{http_code}}' {u}")
def q(sql):
    return sh("PGPASSWORD=SENHA_DO_BANCO psql -h 127.0.0.1 -U whaticket -d whaticket -Atc \"%s\"" % sql.replace('"','\\"'))
pm2=[]
try:
    for p in json.load(open('/tmp/wk-pm2.json')):
        if p['name'].startswith('whaticket'):
            pm2.append({'nome':p['name'],'status':p['pm2_env'].get('status'),'restarts':p['pm2_env'].get('restart_time'),
                        'uptime':int(time.time()-p['pm2_env'].get('pm_uptime',time.time()*1000)/1000),
                        'mem_mb':round(p.get('monit',{}).get('memory',0)/1048576),'cpu':p.get('monit',{}).get('cpu',0)})
except Exception: pass
rows=[l.split('|') for l in q("select id,name,status,\"updatedAt\",number from \"Whatsapps\" order by id").splitlines() if l]
conexoes=[{'id':r[0],'nome':r[1],'status':r[2],'atualizado':r[3][:19],'numero':r[4] if len(r)>4 else ''} for r in rows]
def num(sql):
    v=q(sql); return int(v) if v.isdigit() else None
dados={
 'gerado_em':time.strftime('%Y-%m-%d %H:%M:%S'),
 'servicos':{
   'backend_7777':port(7777),'frontend_6666':port(6666),'postgres_5432':port(5432),'redis_6379':port(6379),
   'apache':sh("/etc/init.d/httpd status 2>/dev/null | grep -ci running")!='0',
   'cloudflared':sh("systemctl is-active cloudflared")},
 'pm2':pm2,
 'http':{
   'backend_local':http('http://127.0.0.1:7777/'),
   'frontend_local':http('http://127.0.0.1:6666/'),
   'zap':http('https://zap.alequizao.com/'),
   'zapapi':http('https://zapapi.alequizao.com/'),
 },
 'banco':{
   'ok': q('select 1')=='1',
   'tabelas': num("select count(*) from information_schema.tables where table_schema='public'"),
   'usuarios': num('select count(*) from "Users"'),
   'empresas': num('select count(*) from "Companies"'),
   'conexoes': num('select count(*) from "Whatsapps"'),
   'filas': num('select count(*) from "Queues"'),
   'contatos': num('select count(*) from "Contacts"'),
   'tickets': num('select count(*) from "Tickets"'),
   'tickets_abertos': num("select count(*) from \"Tickets\" where status='open'"),
   'tickets_pendentes': num("select count(*) from \"Tickets\" where status='pending'"),
   'mensagens': num('select count(*) from "Messages"'),
   'mensagens_24h': num("select count(*) from \"Messages\" where \"createdAt\" > now() - interval '24 hours'"),
   'campanhas': num('select count(*) from "Campaigns"'),
   'plano': q('select name||\' · usuários \'||users||\' · conexões \'||connections||\' · filas \'||queues from "Plans" where id=1'),
 },
 'conexoes':conexoes,
 'sistema':{
   'load':open('/proc/loadavg').read().split()[:3],
   'mem_livre_mb':int(sh("awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo") or 0),
   'disco_livre_gb':round(shutil.disk_usage('/').free/1e9,1),
   'uptime_dias':round(float(open('/proc/uptime').read().split()[0])/86400,1),
 },
 'log_erros': sh("tail -n 15 /root/.pm2/logs/whaticket-backend-error.log 2>/dev/null | grep -v DeprecationWarning | grep -v trace-deprecation | tail -n 8"),
}
tmp=out+'.tmp'
json.dump(dados,open(tmp,'w'),ensure_ascii=False,indent=1)
os.chmod(tmp,0o644); os.replace(tmp,out)
PY
