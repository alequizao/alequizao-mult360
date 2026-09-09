import React, { useState, useContext, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";

import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid"; 
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import { versionSystem } from "../../../package.json";
import { i18n } from "../../translate/i18n";
import api, { openApi } from "../../services/api";
import MenuItem from "@material-ui/core/MenuItem";
import { nomeEmpresa } from "../../../package.json";
import { AuthContext } from "../../context/Auth/AuthContext";
//import logo from "../../assets/logo.png";


const Copyright = () => {
	return (
		<Typography variant="body2" color="primary" align="center">
			{ nomeEmpresa } v{ versionSystem } · {new Date().getFullYear()}<br />
			{"Desenvolvido por "}
			<Link color="primary" href="https://instagram.com/alequizao" target="_blank" rel="noopener">@alequizao</Link>
			{" · "}
			<Link color="primary" href="https://wa.me/5582988717072" target="_blank" rel="noopener">WhatsApp (82) 98871-7072</Link>
 		</Typography>
 	);
 };

const useStyles = makeStyles(theme => ({
	root: {
		width: "100vw",
		height: "100vh",
		background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
		//backgroundImage: "url(https://i.imgur.com/CGby9tN.png)",
		backgroundRepeat: "no-repeat",
		backgroundSize: "100% 100%",
		backgroundPosition: "center",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
	},
	paper: {
		backgroundColor: theme.palette.login, //DARK MODE PLW DESIGN//
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		padding: "55px 30px",
		borderRadius: "16px",
		boxShadow: "0 10px 30px rgba(17,24,39,.08)",
	},
	avatar: {
		margin: theme.spacing(1),  
		backgroundColor: theme.palette.secondary.main,
	},
	form: {
		width: "100%", // Fix IE 11 issue.
		marginTop: theme.spacing(1),
	},
	submit: {
		margin: theme.spacing(3, 0, 2),
	},
	powered: {
		color: "white"
	}
}));

const Login = () => {
	const classes = useStyles();

	const [user, setUser] = useState({ email: "", password: "" });

	const { handleLogin } = useContext(AuthContext);
	const [viewregister, setviewregister] = useState('disabled');
	// ALEQUIZAO: lista de usuários para escolher no login (só a senha é digitada)
	const [usuarios, setUsuarios] = useState([]);
	useEffect(() => {
		openApi.get("/auth/users-list").then(({ data }) => {
			setUsuarios(Array.isArray(data) ? data : []);
			const ultimo = localStorage.getItem("ultimoLogin");
			if (ultimo && data.some(u => u.email === ultimo)) setUser(prev => ({ ...prev, email: ultimo }));
		}).catch(() => setUsuarios([]));
	}, []);

	const handleChangeInput = e => {
		setUser({ ...user, [e.target.name]: e.target.value });
	};
	
	    useEffect(() => {
    	fetchviewregister();
  	}, []);
	
		const fetchviewregister = async () => {
  
 
    try {
    	const responsev = await api.get("/settings/viewregister");
      	const viewregisterX = responsev?.data?.value;
      	// console.log(viewregisterX);
      	setviewregister(viewregisterX);
    	} catch (error) {
    		console.error('Error retrieving viewregister', error);
    	}
  	};


	const handlSubmit = e => {
		e.preventDefault();
		handleLogin(user);
	};
	
	const logo = `${process.env.REACT_APP_BACKEND_URL}/public/logotipos/login.png`;
    const randomValue = Math.random(); // Generate a random number
  
    const logoWithRandom = `${logo}?r=${randomValue}`;

	return (
		<div className={classes.root}>
		<Container component="main" maxWidth="xs">
			<CssBaseline/>
			<div className={classes.paper}>
				<div>
					<img style={{ margin: "0 auto", width: "80%" }} src={logoWithRandom} alt={`${process.env.REACT_APP_NAME_SYSTEM}`} />
				</div>
				{/*<Typography component="h1" variant="h5">
					{i18n.t("login.title")}
				</Typography>*/}
				<form className={classes.form} noValidate onSubmit={handlSubmit}>
					{usuarios.length > 0 ? (
						<TextField
							select
							variant="outlined"
							margin="normal"
							required
							fullWidth
							id="email"
							label="Usuário"
							name="email"
							value={user.email}
							onChange={e => { handleChangeInput(e); localStorage.setItem("ultimoLogin", e.target.value); }}
							autoFocus
						>
							{usuarios.map(u => (
								<MenuItem key={u.id} value={u.email}>{u.name} <span style={{ color: "#6b7280", marginLeft: 8, fontSize: 12 }}>({u.email})</span></MenuItem>
							))}
						</TextField>
					) : (
						<TextField
							variant="outlined"
							margin="normal"
							required
							fullWidth
							id="email"
							label="E-mail ou usuário"
							name="email"
							value={user.email}
							onChange={handleChangeInput}
							autoComplete="email"
							autoFocus
						/>
					)}
					<TextField
						variant="outlined"
						margin="normal"
						required
						fullWidth
						name="password"
						label={i18n.t("login.form.password")}
						type="password"
						id="password"
						value={user.password}
						onChange={handleChangeInput}
						autoComplete="current-password"
					/>
					
					<Grid container justify="flex-end">
					  <Grid item xs={6} style={{ textAlign: "right" }}>
						<Link component={RouterLink} to="/forgetpsw" variant="body2">
						  Esqueceu sua senha?
						</Link>
					  </Grid>
					</Grid>
				
					
					<Button
						type="submit"
						fullWidth
						variant="contained"
						color="primary"
						className={classes.submit}
					>
						{i18n.t("login.buttons.submit")}
					</Button>
                    {viewregister === "enabled" && (
                    <>
					<Grid container>
						<Grid item>
							<Link
								href="#"
								variant="body2"
								component={RouterLink}
								to="/signup"
							>
								{i18n.t("login.buttons.register")}
							</Link>
						</Grid>
					</Grid>
                    </>
                    )}
				
					
				</form>
			
			</div>
			<Box mt={8}><Copyright /></Box>
		</Container>
		</div>
	);
};

export default Login;
