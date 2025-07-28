const express = require('express');
const axios = require('axios');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

// Configuración de variables (deberías almacenarlas en variables de entorno en Vercel)
const TIENDANUBE_CLIENT_ID = process.env.TIENDANUBE_CLIENT_ID;
const TIENDANUBE_CLIENT_SECRET = process.env.TIENDANUBE_CLIENT_SECRET;
const TIENDANUBE_REDIRECT_URI = process.env.TIENDANUBE_REDIRECT_URI || 'https://tudominio.vercel.app/api/callback';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://tudominio.vercel.app/api/google-callback';
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Configuración de Google OAuth
const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

// Endpoint para iniciar autenticación con Tiendanube
app.get('/auth', (req, res) => {
  const authUrl = `https://api.tiendanube.com/v1/oauth/authorize?client_id=${TIENDANUBE_CLIENT_ID}&redirect_uri=${TIENDANUBE_REDIRECT_URI}&response_type=code`;
  res.redirect(authUrl);
});

// Endpoint para manejar el callback de Tiendanube
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const response = await axios.post('https://api.tiendanube.com/v1/oauth/token', {
      client_id: TIENDANUBE_CLIENT_ID,
      client_secret: TIENDANUBE_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: TIENDANUBE_REDIRECT_URI,
    });
    const accessToken = response.data.access_token;
    // TODO: Guarda el accessToken en una base de datos o en variables de entorno
    process.env.TIENDANUBE_ACCESS_TOKEN = accessToken; // Temporal, no recomendado para producción
    res.send('Autenticación con Tiendanube exitosa');
  } catch (error) {
    console.error('Error en autenticación Tiendanube:', error);
    res.status(500).send('Error en autenticación');
  }
});

// Endpoint para iniciar autenticación con Google
app.get('/google-auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    scope: ['https://www.googleapis.com/auth/spreadsheets'],
    access_type: 'offline',
  });
  res.redirect(url);
});

// Endpoint para manejar el callback de Google
app.get('/google-callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    // TODO: Guarda los tokens en una base de datos
    process.env.GOOGLE_TOKENS = JSON.stringify(tokens); // Temporal, no recomendado para producción
    res.send('Autenticación con Google exitosa');
  } catch (error) {
    console.error('Error en autenticación Google:', error);
    res.status(500).send('Error en autenticación');
  }
});

// Endpoint para sincronizar datos
app.get('/sync', async (req, res) => {
  try {
    // Obtener productos de Tiendanube
    const storeId = process.env.TIENDANUBE_STORE_ID; // Configura tu store ID en variables de entorno
    const accessToken = process.env.TIENDANUBE_ACCESS_TOKEN;
    const response = await axios.get(`https://api.tiendanube.com/v1/${storeId}/products`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const products = response.data;

    // Preparar datos para Google Sheets
    const data = products.map(product => [product.name.es, product.price, product.stock]);

    // Escribir en Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource: { values: data },
    });

    res.send('Datos sincronizados con Google Sheets');
  } catch (error) {
    console.error('Error en sincronización:', error);
    res.status(500).send('Error al sincronizar');
  }
});

module.exports = app;
