const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Configuración de variables de entorno
const CLIENT_ID = process.env.TIENDANUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.TIENDANUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIENDANUBE_REDIRECT_URI || 'https://tudominio.vercel.app/api/callback';
let accessToken = process.env.TIENDANUBE_ACCESS_TOKEN || null;
let refreshToken = process.env.TIENDANUBE_REFRESH_TOKEN || null;
let tokenExpiration = null;

// Endpoint para iniciar autenticación
app.get('/auth', (req, res) => {
  const authUrl = `https://api.tiendanube.com/v1/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
  res.redirect(authUrl);
});

// Endpoint para manejar el callback de Tiendanube
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const response = await axios.post('https://api.tiendanube.com/v1/oauth/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    });
    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    tokenExpiration = Date.now() + (response.data.expires_in * 1000);
    // Guardar tokens en variables de entorno (o en una base de datos para producción)
    process.env.TIENDANUBE_ACCESS_TOKEN = accessToken;
    process.env.TIENDANUBE_REFRESH_TOKEN = refreshToken;
    res.json({ access_token: accessToken, refresh_token: refreshToken });
  } catch (error) {
    console.error('Error en autenticación:', error.message);
    res.status(500).send('Error en autenticación');
  }
});

// Endpoint para renovar y obtener el access_token
app.get('/get-token', async (req, res) => {
  try {
    // Verificar si el access_token es válido
    if (accessToken && tokenExpiration && Date.now() < tokenExpiration) {
      return res.json({ access_token: accessToken });
    }

    // Si no hay access_token o está expirado, renovar usando el refresh_token
    if (!refreshToken) {
      return res.status(400).json({ error: 'No se encontró refresh_token. Autentícate en /auth.' });
    }

    const response = await axios.post('https://api.tiendanube.com/v1/oauth/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token || refreshToken; // Actualizar refresh_token si se proporciona uno nuevo
    tokenExpiration = Date.now() + (response.data.expires_in * 1000);
    process.env.TIENDANUBE_ACCESS_TOKEN = accessToken;
    process.env.TIENDANUBE_REFRESH_TOKEN = refreshToken;

    res.json({ access_token: accessToken });
  } catch (error) {
    console.error('Error al renovar token:', error.message);
    res.status(500).json({ error: 'Error al renovar token' });
  }
});

module.exports = app;
