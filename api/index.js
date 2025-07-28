export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    res.status(200).json({ message: "Hola desde Vercel con Tiendanube 🚀" });
    return;
  }

  const client_id = process.env.CLIENT_ID;
  const client_secret = process.env.CLIENT_SECRET;
  const redirect_uri = process.env.REDIRECT_URI;

  const payload = {
    client_id,
    client_secret,
    code,
    grant_type: "authorization_code",
    redirect_uri
  };

  try {
    const response = await fetch("https://www.tiendanube.com/apps/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      // Podés hacer lo que quieras acá, por ejemplo mostrar token, guardarlo, etc
      res.status(200).json({ message: "Token obtenido con éxito", token: data.access_token });
    } else {
      res.status(response.status).json({ error: data });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
