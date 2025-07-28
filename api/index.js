export default async function handler(req, res) {
  res.status(200).json({
    CLIENT_ID: process.env.CLIENT_ID || null,
    CLIENT_SECRET: process.env.CLIENT_SECRET ? "********" : null,
    REDIRECT_URI: process.env.REDIRECT_URI || null
  });
}
