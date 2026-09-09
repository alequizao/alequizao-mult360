import React, { useState, useEffect, useCallback, useContext } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper, Button, Table, TableBody, TableCell, TableHead, TableRow, IconButton, TextField,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch,
  MenuItem, Chip, Tooltip, Typography, Grid
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { SocketContext } from "../../context/Socket/SocketContext";

// ALEQUIZAO: Respostas Automáticas por palavra-chave (sem fila)
const useStyles = makeStyles((theme) => ({
  mainPaper: { flex: 1, padding: theme.spacing(1), overflowY: "scroll", ...theme.scrollbarStyles },
  ajuda: { background: theme.palette.type === "light" ? "#eef2ff" : "#333", borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 13 },
  teste: { display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" },
}));

const TIPOS = [
  { v: "contains", t: "Contém a palavra (recomendado)" },
  { v: "word", t: "Palavra inteira" },
  { v: "starts", t: "Começa com" },
  { v: "exact", t: "Mensagem exatamente igual" },
  { v: "regex", t: "Expressão regular (avançado)" },
];
const vazio = { name: "", keywords: "", reply: "", matchType: "contains", active: true, onlyWithoutUser: false, stopFlow: true, cooldownMinutes: 60 };

const AutoReplyModal = ({ open, onClose, item }) => {
  const [f, setF] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { setF(item ? { ...vazio, ...item } : vazio); }, [item, open]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const salvar = async () => {
    setSalvando(true);
    try {
      const dados = { ...f, cooldownMinutes: Number(f.cooldownMinutes) || 0 };
      if (item && item.id) await api.put(`/auto-replies/${item.id}`, dados); else await api.post("/auto-replies", dados);
      toast.success("Resposta automática salva");
      onClose();
    } catch (err) { toastError(err); }
    setSalvando(false);
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{item && item.id ? "Editar resposta automática" : "Nova resposta automática"}</DialogTitle>
      <DialogContent dividers>
        <TextField label="Nome (só para você identificar)" value={f.name} onChange={set("name")} fullWidth margin="dense" variant="outlined" autoFocus />
        <TextField label="Palavras-chave (separe por ; ou vírgula)" value={f.keywords} onChange={set("keywords")} fullWidth margin="dense" variant="outlined" multiline minRows={2}
          helperText="Ex.: areia; areia lavada; caminhão de areia — não diferencia maiúsculas nem acentos" />
        <TextField select label="Como comparar" value={f.matchType} onChange={set("matchType")} fullWidth margin="dense" variant="outlined">
          {TIPOS.map((t) => <MenuItem key={t.v} value={t.v}>{t.t}</MenuItem>)}
        </TextField>
        <TextField label="Resposta que o robô envia" value={f.reply} onChange={set("reply")} fullWidth margin="dense" variant="outlined" multiline minRows={3}
          helperText="Pode usar {{name}} para o nome do contato e {{firstName}} para o primeiro nome" />
        <TextField label="Não repetir para o mesmo contato por (minutos)" type="number" value={f.cooldownMinutes} onChange={set("cooldownMinutes")} fullWidth margin="dense" variant="outlined" helperText="0 = responde toda vez" />
        <FormControlLabel control={<Switch checked={!!f.active} onChange={set("active")} color="primary" />} label="Ativa" />
        <FormControlLabel control={<Switch checked={!!f.onlyWithoutUser} onChange={set("onlyWithoutUser")} color="primary" />} label="Só quando o atendimento ainda não tem atendente" />
        <FormControlLabel control={<Switch checked={!!f.stopFlow} onChange={set("stopFlow")} color="primary" />} label="Depois de responder, não acionar saudação/chatbot nessa mensagem" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" variant="outlined">Cancelar</Button>
        <Button onClick={salvar} color="primary" variant="contained" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
      </DialogActions>
    </Dialog>
  );
};

const AutoReplies = () => {
  const classes = useStyles();
  const socketManager = useContext(SocketContext);
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [item, setItem] = useState(null);
  const [apagar, setApagar] = useState(null);
  const [textoTeste, setTextoTeste] = useState("");
  const [resultadoTeste, setResultadoTeste] = useState(null);

  const carregar = useCallback(async () => {
    try { const { data } = await api.get("/auto-replies", { params: { searchParam: busca } }); setLista(data.autoReplies); } catch (err) { toastError(err); }
  }, [busca]);
  useEffect(() => { const t = setTimeout(carregar, 300); return () => clearTimeout(t); }, [carregar]);
  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);
    socket.on(`company-${companyId}-autoreply`, () => carregar());
    return () => { socket.disconnect(); };
  }, [socketManager, carregar]);

  const alternar = async (r) => { try { await api.put(`/auto-replies/${r.id}`, { active: !r.active }); } catch (err) { toastError(err); } };
  const excluir = async () => { try { await api.delete(`/auto-replies/${apagar.id}`); toast.success("Excluída"); } catch (err) { toastError(err); } setApagar(null); };
  const testar = async () => { try { const { data } = await api.post("/auto-replies/test", { text: textoTeste }); setResultadoTeste(data); } catch (err) { toastError(err); } };

  return (
    <MainContainer>
      <ConfirmationModal title={apagar ? `Excluir "${apagar.name}"?` : ""} open={!!apagar} onClose={() => setApagar(null)} onConfirm={excluir}>Essa ação não pode ser desfeita.</ConfirmationModal>
      <AutoReplyModal open={modal} onClose={() => { setModal(false); setItem(null); carregar(); }} item={item} />
      <MainHeader>
        <Title>Respostas Automáticas</Title>
        <MainHeaderButtonsWrapper>
          <TextField placeholder="Buscar..." size="small" variant="outlined" value={busca} onChange={(e) => setBusca(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon style={{ color: "gray" }} /></InputAdornment>) }} />
          <Button variant="contained" color="primary" onClick={() => { setItem(null); setModal(true); }}>+ Nova</Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <div className={classes.ajuda}>
          Funciona <b>sem fila</b>: quando chega uma mensagem de um contato contendo uma das palavras-chave, o robô responde na hora com o texto cadastrado.
          Exemplo: palavras <b>areia; areia lavada</b> → resposta <b>"Não vendemos areia."</b> As regras são testadas na ordem da lista; a primeira que casar responde.
        </div>
        <div className={classes.teste}>
          <TextField size="small" variant="outlined" style={{ flex: 1, minWidth: 220 }} placeholder="Testar: digite uma mensagem como o cliente escreveria" value={textoTeste} onChange={(e) => setTextoTeste(e.target.value)} onKeyDown={(e) => e.key === "Enter" && testar()} />
          <Button variant="outlined" color="primary" onClick={testar}>Testar</Button>
          {resultadoTeste && (resultadoTeste.casou
            ? <Chip color="primary" label={`Casou com "${resultadoTeste.name}" → ${resultadoTeste.reply.slice(0, 60)}`} />
            : <Chip label="Nenhuma regra casou" />)}
        </div>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Ativa</TableCell><TableCell>Nome</TableCell><TableCell>Palavras-chave</TableCell><TableCell>Resposta</TableCell><TableCell align="center">Disparos</TableCell><TableCell align="center">Ações</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {lista.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Switch size="small" checked={!!r.active} onChange={() => alternar(r)} color="primary" /></TableCell>
                <TableCell>{r.name}<br /><Typography variant="caption" color="textSecondary">{(TIPOS.find((t) => t.v === r.matchType) || {}).t}</Typography></TableCell>
                <TableCell>{r.keywords.split(/[;,\n]/).filter((k) => k.trim()).map((k, i) => <Chip key={i} size="small" label={k.trim()} style={{ margin: 2 }} />)}</TableCell>
                <TableCell style={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>{r.reply}</TableCell>
                <TableCell align="center">{r.hits}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Editar"><IconButton size="small" onClick={() => { setItem(r); setModal(true); }}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Excluir"><IconButton size="small" onClick={() => setApagar(r)}><DeleteOutlineIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {lista.length === 0 && <TableRow><TableCell colSpan={6} align="center">Nenhuma resposta automática ainda. Clique em "+ Nova".</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default AutoReplies;
